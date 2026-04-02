/**
 * Duplicate Service - 重複ファイル検出サービス
 * 
 * 「サイズ衝突時のみ計算」戦略を採用:
 * 1. DBから同じサイズを持つファイルグループを抽出
 * 2. そのグループ内のファイルのみハッシュ計算
 * 3. ハッシュ値で真の重複を判定
 */

import fs from 'fs/promises';
import { dbManager } from './databaseManager';
import { calculateFileHash } from './hashService';
import { logger } from './logger';
import type { MediaFile } from './database';
import { getArchiveFileList } from './archiveHandler';
import {
    buildSimilarNameCandidateGroups,
    type DuplicateSearchMode,
    type SimilarNameMatchKind,
} from '../../src/shared/duplicateNameCandidates';

const log = logger.scope('DuplicateService');

// --- Types ---
export interface DuplicateGroup {
    hash: string;
    size: number;
    sizeMin: number;
    sizeMax: number;
    matchKind: 'content_hash' | 'archive_content' | SimilarNameMatchKind;
    matchLabel: string;
    files: MediaFile[];
    count: number;
}

export interface DuplicateStats {
    totalGroups: number;
    totalFiles: number;
    wastedSpace: number; // bytes
}

export interface DuplicateProgress {
    phase: 'analyzing' | 'hashing' | 'complete';
    current: number;
    total: number;
    currentFile?: string;
}

// --- State ---
let isCancelled = false;

/**
 * 検出をキャンセル
 */
export function cancelDuplicateSearch(): void {
    isCancelled = true;
    log.info('Duplicate search cancelled');
}

/**
 * 重複ファイルを検出
 * 
 * @param onProgress 進捗コールバック
 * @returns 重複グループ配列
 */
export async function findDuplicates(
    onProgress?: (progress: DuplicateProgress) => void,
    mode: DuplicateSearchMode = 'exact',
): Promise<DuplicateGroup[]> {
    if (mode === 'similar_name') {
        return findSimilarNameDuplicates(onProgress);
    }
    const exactGroups = await findExactDuplicates(onProgress);
    const archiveGroups = await findArchiveContentDuplicates(exactGroups, onProgress);
    return [...exactGroups, ...archiveGroups].sort((a, b) => b.size - a.size);
}

async function findExactDuplicates(
    onProgress?: (progress: DuplicateProgress) => void
): Promise<DuplicateGroup[]> {
    isCancelled = false;
    const db = dbManager.getDb();

    // デバッグ: 現在のプロファイルとファイル数を確認
    const profileId = dbManager.getCurrentProfileId();
    const totalFileCount = (db.prepare('SELECT COUNT(*) as count FROM files').get() as { count: number }).count;
    log.info(`[DEBUG] findDuplicates called. profileId=${profileId}, totalFiles=${totalFileCount}`);

    // Phase 1: サイズ重複グループを抽出（高速）
    log.info('Phase 1: Finding size duplicates...');
    onProgress?.({ phase: 'analyzing', current: 0, total: 0 });

    // 完全一致グループ
    const exactSizeGroups = db.prepare(`
        SELECT size, COUNT(*) as count
        FROM files
        WHERE size > 0
        GROUP BY size
        HAVING count > 1
        ORDER BY size DESC
    `).all() as { size: number; count: number }[];

    // 近似サイズグループ: 完全一致グループに含まれないサイズ同士で ±1% 以内のペアを抽出
    const exactSizeSet = new Set(exactSizeGroups.map((g) => g.size));
    const allSizes = (db.prepare(`
        SELECT DISTINCT size FROM files WHERE size > 0 ORDER BY size DESC
    `).all() as { size: number }[]).map((r) => r.size);

    const nearSizePairs: { sizeA: number; sizeB: number }[] = [];
    for (let i = 0; i < allSizes.length; i++) {
        for (let j = i + 1; j < allSizes.length; j++) {
            const sizeA = allSizes[i];
            const sizeB = allSizes[j];
            if ((sizeA - sizeB) / sizeA > 0.01) break; // ソート済みなので以降はすべて1%超
            if (!exactSizeSet.has(sizeA) || !exactSizeSet.has(sizeB)) {
                nearSizePairs.push({ sizeA, sizeB });
            }
        }
    }

    // 近似サイズペアをグループにまとめる（同一サイズが複数ペアに出現する場合をマージ）
    const nearSizeGroupMap = new Map<number, Set<number>>();
    for (const { sizeA, sizeB } of nearSizePairs) {
        if (!nearSizeGroupMap.has(sizeA)) nearSizeGroupMap.set(sizeA, new Set([sizeA]));
        if (!nearSizeGroupMap.has(sizeB)) nearSizeGroupMap.set(sizeB, new Set([sizeB]));
        const groupA = nearSizeGroupMap.get(sizeA)!;
        const groupB = nearSizeGroupMap.get(sizeB)!;
        // 2つのグループをマージ
        const merged = new Set([...groupA, ...groupB]);
        for (const s of merged) nearSizeGroupMap.set(s, merged);
    }
    const nearSizeGroups = [...new Set(nearSizeGroupMap.values())].map((sizeSet) => [...sizeSet]);

    if (exactSizeGroups.length === 0 && nearSizeGroups.length === 0) {
        log.info(`[DEBUG] No size duplicates found. profileId=${profileId}, totalFiles=${totalFileCount}`);
        onProgress?.({ phase: 'complete', current: 0, total: 0 });
        return [];
    }

    // 対象ファイル数を計算
    const nearSizeFileCount = nearSizeGroups.reduce((sum, sizes) => {
        const count = (db.prepare(`SELECT COUNT(*) as count FROM files WHERE size IN (${sizes.map(() => '?').join(',')})`)
            .get(...sizes) as { count: number }).count;
        return sum + count;
    }, 0);
    const totalFilesToHash = exactSizeGroups.reduce((sum, g) => sum + g.count, 0) + nearSizeFileCount;
    log.info(`[DEBUG] Found ${exactSizeGroups.length} exact size groups, ${nearSizeGroups.length} near-size groups, ${totalFilesToHash} files to hash`);

    // Phase 2: 各グループ内のファイルのハッシュを計算
    log.info('Phase 2: Calculating hashes...');
    const duplicateGroups: DuplicateGroup[] = [];
    let processedFiles = 0;
    const updateHashStmt = db.prepare('UPDATE files SET content_hash = ?, mtime_ms = ? WHERE id = ?');
    const selectFilesStmt = db.prepare(`
        SELECT id, name, path, size, type, created_at, duration,
               thumbnail_path, preview_frames, root_folder_id,
               content_hash, metadata, mtime_ms, notes
        FROM files
        WHERE size = ?
    `);

    const computeHashForFile = async (file: MediaFile): Promise<string | null> => {
        let hash = file.content_hash;
        let currentMtimeMs: number;
        try {
            const stat = await fs.stat(file.path);
            currentMtimeMs = Math.floor(stat.mtimeMs);
        } catch {
            log.warn(`Cannot stat file: ${file.path}`);
            return null;
        }

        const cacheValid = hash && file.mtime_ms != null && file.mtime_ms === currentMtimeMs;
        if (!cacheValid) {
            try {
                hash = await calculateFileHash(file.path);
                if (hash) {
                    updateHashStmt.run(hash, currentMtimeMs, file.id);
                } else {
                    log.warn(`Hash calculation returned null for: ${file.path}`);
                }
            } catch (hashErr) {
                log.error(`Hash calculation error for ${file.path}: ${hashErr instanceof Error ? hashErr.message : String(hashErr)}`);
            }
        }
        return hash ?? null;
    };

    // 完全一致サイズグループの処理
    for (const sizeGroup of exactSizeGroups) {
        if (isCancelled) {
            log.info('Duplicate search cancelled by user');
            break;
        }

        const files = selectFilesStmt.all(sizeGroup.size) as MediaFile[];
        const hashMap = new Map<string, MediaFile[]>();

        for (const file of files) {
            if (isCancelled) break;

            processedFiles++;
            onProgress?.({ phase: 'hashing', current: processedFiles, total: totalFilesToHash, currentFile: file.name });

            const hash = await computeHashForFile(file);
            if (hash) {
                const mediaFile: MediaFile = { ...file, tags: [], content_hash: hash };
                if (!hashMap.has(hash)) hashMap.set(hash, []);
                hashMap.get(hash)!.push(mediaFile);
            }
        }

        for (const [hash, groupFiles] of hashMap) {
            if (groupFiles.length >= 2) {
                duplicateGroups.push({
                    hash,
                    size: sizeGroup.size,
                    sizeMin: sizeGroup.size,
                    sizeMax: sizeGroup.size,
                    matchKind: 'content_hash',
                    matchLabel: '完全一致',
                    files: groupFiles,
                    count: groupFiles.length
                });
            }
        }
    }

    // 近似サイズグループの処理（完全一致で既に検出されたハッシュは除外）
    const exactHashes = new Set(duplicateGroups.map((g) => g.hash));

    for (const sizes of nearSizeGroups) {
        if (isCancelled) break;

        const files = sizes.flatMap((size) => selectFilesStmt.all(size) as MediaFile[]);
        const hashMap = new Map<string, MediaFile[]>();

        for (const file of files) {
            if (isCancelled) break;

            processedFiles++;
            onProgress?.({ phase: 'hashing', current: processedFiles, total: totalFilesToHash, currentFile: file.name });

            const hash = await computeHashForFile(file);
            if (hash && !exactHashes.has(hash)) {
                const mediaFile: MediaFile = { ...file, tags: [], content_hash: hash };
                if (!hashMap.has(hash)) hashMap.set(hash, []);
                hashMap.get(hash)!.push(mediaFile);
            }
        }

        for (const [hash, groupFiles] of hashMap) {
            if (groupFiles.length >= 2) {
                const fileSizes = groupFiles.map((f) => f.size);
                duplicateGroups.push({
                    hash,
                    size: Math.max(...fileSizes),
                    sizeMin: Math.min(...fileSizes),
                    sizeMax: Math.max(...fileSizes),
                    matchKind: 'content_hash',
                    matchLabel: '完全一致',
                    files: groupFiles,
                    count: groupFiles.length
                });
            }
        }
    }

    // サイズでソート（大きい順）
    duplicateGroups.sort((a, b) => b.size - a.size);

    log.info(`[DEBUG] Found ${duplicateGroups.length} duplicate groups (processed ${processedFiles} files)`);
    onProgress?.({ phase: 'complete', current: processedFiles, total: totalFilesToHash });

    return duplicateGroups;
}

/**
 * 書庫内ファイルリストを比較して重複書庫を検出する
 * exact モードで検出できなかった書庫ファイル同士を対象とする
 */
async function findArchiveContentDuplicates(
    alreadyFoundGroups: DuplicateGroup[],
    onProgress?: (progress: DuplicateProgress) => void,
): Promise<DuplicateGroup[]> {
    const db = dbManager.getDb();

    // exact モードで既に検出済みのファイルIDを収集
    const alreadyFoundIds = new Set(alreadyFoundGroups.flatMap((g) => g.files.map((f) => f.id)));

    // 書庫ファイルをすべて取得
    const archiveFiles = db.prepare(`
        SELECT id, name, path, size, type, created_at, duration,
               thumbnail_path, preview_frames, root_folder_id,
               content_hash, metadata, mtime_ms, notes
        FROM files
        WHERE type = 'archive' AND size > 0
    `).all() as MediaFile[];

    const candidates = archiveFiles.filter((f) => !alreadyFoundIds.has(f.id));
    if (candidates.length < 2) return [];

    log.info(`Archive content comparison: ${candidates.length} archive files to compare`);
    onProgress?.({ phase: 'analyzing', current: 0, total: candidates.length, currentFile: '書庫内容を比較中' });

    // 各書庫のファイルリストを取得してシグネチャを生成
    const signatureMap = new Map<string, MediaFile[]>();
    let processed = 0;

    for (const file of candidates) {
        if (isCancelled) break;

        processed++;
        onProgress?.({ phase: 'analyzing', current: processed, total: candidates.length, currentFile: file.name });

        const entries = await getArchiveFileList(file.path);
        if (!entries || entries.length === 0) continue;

        // シグネチャ: ファイル名+サイズの組み合わせをソートして結合
        const signature = entries.map((e) => `${e.name}:${e.size}`).join('|');
        if (!signatureMap.has(signature)) signatureMap.set(signature, []);
        signatureMap.get(signature)!.push(file);
    }

    const duplicateGroups: DuplicateGroup[] = [];
    for (const [signature, groupFiles] of signatureMap) {
        if (groupFiles.length < 2) continue;
        const sizes = groupFiles.map((f) => f.size);
        duplicateGroups.push({
            hash: `archive:${signature.slice(0, 64)}`,
            size: Math.max(...sizes),
            sizeMin: Math.min(...sizes),
            sizeMax: Math.max(...sizes),
            matchKind: 'archive_content',
            matchLabel: '書庫内容一致',
            files: groupFiles.map((f) => ({ ...f, tags: [] })),
            count: groupFiles.length,
        });
    }

    log.info(`Archive content comparison found ${duplicateGroups.length} duplicate groups`);
    return duplicateGroups;
}

async function findSimilarNameDuplicates(
    onProgress?: (progress: DuplicateProgress) => void
): Promise<DuplicateGroup[]> {
    isCancelled = false;
    const db = dbManager.getDb();

    log.info('Similar-name candidate search started');
    const files = db.prepare(`
        SELECT id, name, path, size, type, created_at, duration,
               thumbnail_path, preview_frames, root_folder_id,
               content_hash, metadata, mtime_ms, notes
        FROM files
        WHERE name IS NOT NULL AND name != ''
    `).all() as MediaFile[];

    onProgress?.({
        phase: 'analyzing',
        current: 0,
        total: files.length,
        currentFile: 'ファイル名候補を集計中',
    });

    if (isCancelled) {
        log.info('Similar-name candidate search cancelled by user');
        onProgress?.({ phase: 'complete', current: 0, total: files.length });
        return [];
    }

    const duplicateGroups = buildSimilarNameCandidateGroups(files).map((group) => ({
        hash: group.id,
        size: group.size,
        sizeMin: group.sizeMin,
        sizeMax: group.sizeMax,
        matchKind: group.matchKind,
        matchLabel: group.matchLabel,
        files: group.files,
        count: group.count,
    }));

    onProgress?.({
        phase: 'complete',
        current: files.length,
        total: files.length,
        currentFile: `${duplicateGroups.length} グループ`,
    });

    log.info(`[DEBUG] Found ${duplicateGroups.length} similar-name candidate groups`);
    return duplicateGroups;
}

/**
 * 重複統計を取得
 */
export function getDuplicateStats(groups: DuplicateGroup[]): DuplicateStats {
    let totalFiles = 0;
    let wastedSpace = 0;

    for (const group of groups) {
        if (group.matchKind === 'content_hash') {
            const duplicateCount = group.count - 1;
            totalFiles += duplicateCount;
            wastedSpace += group.size * duplicateCount;
            continue;
        }

        totalFiles += group.count;
    }

    return {
        totalGroups: groups.length,
        totalFiles,
        wastedSpace
    };
}

/**
 * ファイルサイズを人間が読める形式に変換
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
