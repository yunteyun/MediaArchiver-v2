/**
 * Duplicate Service - 重複ファイル検出サービス
 * 
 * 「サイズ衝突時のみ計算」戦略を採用:
 * 1. DBから同じサイズを持つファイルグループを抽出
 * 2. そのグループ内のファイルのみハッシュ計算
 * 3. ハッシュ値で真の重複を判定
 */

import { dbManager } from './databaseManager';
import { calculateFileHash } from './hashService';
import { logger } from './logger';
import type { MediaFile } from './database';

const log = logger.scope('DuplicateService');

// --- Types ---
export interface DuplicateGroup {
    hash: string;
    size: number;
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
    onProgress?: (progress: DuplicateProgress) => void
): Promise<DuplicateGroup[]> {
    isCancelled = false;
    const db = dbManager.getDb();

    // Phase 1: サイズ重複グループを抽出（高速）
    log.info('Phase 1: Finding size duplicates...');
    onProgress?.({ phase: 'analyzing', current: 0, total: 0 });

    const sizeGroups = db.prepare(`
        SELECT size, COUNT(*) as count
        FROM files
        WHERE size > 0
        GROUP BY size
        HAVING count > 1
        ORDER BY size DESC
    `).all() as { size: number; count: number }[];

    if (sizeGroups.length === 0) {
        log.info('No size duplicates found');
        onProgress?.({ phase: 'complete', current: 0, total: 0 });
        return [];
    }

    // 対象ファイル数を計算
    const totalFilesToHash = sizeGroups.reduce((sum, g) => sum + g.count, 0);
    log.info(`Found ${sizeGroups.length} size groups, ${totalFilesToHash} files to hash`);

    // Phase 2: 各グループ内のファイルのハッシュを計算
    log.info('Phase 2: Calculating hashes...');
    const duplicateGroups: DuplicateGroup[] = [];
    let processedFiles = 0;

    for (const sizeGroup of sizeGroups) {
        if (isCancelled) {
            log.info('Duplicate search cancelled by user');
            break;
        }

        // このサイズのファイルを取得
        const files = db.prepare(`
            SELECT id, name, path, size, type, created_at, duration, 
                   thumbnail_path, preview_frames, root_folder_id,
                   content_hash, metadata, mtime_ms, notes
            FROM files
            WHERE size = ?
        `).all(sizeGroup.size) as any[];

        // ハッシュ計算 & グループ化
        const hashMap = new Map<string, MediaFile[]>();

        for (const file of files) {
            if (isCancelled) break;

            processedFiles++;
            onProgress?.({
                phase: 'hashing',
                current: processedFiles,
                total: totalFilesToHash,
                currentFile: file.name
            });

            // 既にハッシュがある場合は再利用
            let hash = file.content_hash;
            if (!hash) {
                hash = await calculateFileHash(file.path);
                if (hash) {
                    // DBに保存（次回高速化）
                    db.prepare('UPDATE files SET content_hash = ? WHERE id = ?')
                        .run(hash, file.id);
                }
            }

            if (hash) {
                const mediaFile: MediaFile = {
                    id: file.id,
                    name: file.name,
                    path: file.path,
                    size: file.size,
                    type: file.type,
                    created_at: file.created_at,
                    duration: file.duration,
                    thumbnail_path: file.thumbnail_path,
                    preview_frames: file.preview_frames,
                    root_folder_id: file.root_folder_id,
                    tags: [], // タグは別途取得が必要
                    content_hash: hash,
                    metadata: file.metadata,
                    mtime_ms: file.mtime_ms,
                    notes: file.notes
                };

                if (!hashMap.has(hash)) {
                    hashMap.set(hash, []);
                }
                hashMap.get(hash)!.push(mediaFile);
            }
        }

        // 真の重複（同じハッシュが2つ以上）をグループに追加
        for (const [hash, groupFiles] of hashMap) {
            if (groupFiles.length >= 2) {
                duplicateGroups.push({
                    hash,
                    size: sizeGroup.size,
                    files: groupFiles,
                    count: groupFiles.length
                });
            }
        }
    }

    // サイズでソート（大きい順）
    duplicateGroups.sort((a, b) => b.size - a.size);

    log.info(`Found ${duplicateGroups.length} duplicate groups`);
    onProgress?.({ phase: 'complete', current: processedFiles, total: totalFilesToHash });

    return duplicateGroups;
}

/**
 * 重複統計を取得
 */
export function getDuplicateStats(groups: DuplicateGroup[]): DuplicateStats {
    let totalFiles = 0;
    let wastedSpace = 0;

    for (const group of groups) {
        // 重複ファイル数（元ファイルを除く）
        const duplicateCount = group.count - 1;
        totalFiles += duplicateCount;
        wastedSpace += group.size * duplicateCount;
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
