/**
 * Thumbnail Cleanup Service - サムネイル診断・クリーンアップ
 *
 * 「サムネイルDirにあるが、DBに登録がないファイル」を孤立サムネイルとして検出する。
 * Phase 25対応: getBasePath() を使用して保存場所を動的取得
 */

import fs from 'fs';
import path from 'path';
import { dbManager } from './databaseManager';
import { logger } from './logger';
import { getBasePath } from './storageConfig';
import { parsePreviewFrames } from './database';

const log = logger.scope('ThumbnailCleanup');

// --- Types ---

export interface OrphanedThumbnail {
    path: string;
    size: number;
}

export interface DiagnosticResult {
    totalThumbnails: number;
    orphanedCount: number;
    totalOrphanedSize: number;
    orphanedFiles: string[]; // 全孤立ファイルのパス
    samples: OrphanedThumbnail[]; // 最大10件のサンプル
}

export interface CleanupResult {
    success: boolean;
    deletedCount: number;
    freedBytes: number;
    errors: string[];
}


// --- Helper Functions ---

/**
 * サムネイルディレクトリのパスを取得
 * Phase 25対応: getBasePath() から動的取得（保存場所カスタマイズに対応）
 */
function getThumbnailDir(): string {
    return path.join(getBasePath(), 'thumbnails');
}

/**
 * ディレクトリ内のすべてのファイルを再帰的に取得
 */
function getAllFiles(dir: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
        return files;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            files.push(...getAllFiles(fullPath));
        } else {
            files.push(fullPath);
        }
    }

    return files;
}

// --- Public API ---

/**
 * 孤立サムネイルの診断
 *
 * 定義: サムネイルDir上に存在するが、現在のDBに thumbnail_path / preview_frames
 *       として登録されていないファイル = 孤立サムネイル
 *
 * bg: フォルダを登録から除外してもfilesテーブルのレコードは残るが、
 *     DB上に残ったままでも実際のサムネイルファイルが参照されなければ「孤立」。
 *     ただし最も直接的な孤立は「Dirにあるがどのファイルのthumbnail_pathにも含まれない」。
 */
export async function diagnoseThumbnails(profileId: string): Promise<DiagnosticResult> {
    log.info(`Starting thumbnail diagnostic for profile: ${profileId}`);

    const thumbnailDir = getThumbnailDir();
    const db = dbManager.getDb();

    // 1. サムネイルDir上の全ファイルを取得
    const diskFiles = getAllFiles(thumbnailDir);
    log.debug(`Found ${diskFiles.length} files on disk in thumbnail dir: ${thumbnailDir}`);

    if (diskFiles.length === 0) {
        return {
            totalThumbnails: 0,
            orphanedCount: 0,
            totalOrphanedSize: 0,
            orphanedFiles: [],
            samples: []
        };
    }

    // 2. DBから登録済みサムネイルパスを収集（正規化して Set に）
    const registeredRows = db.prepare(`
        SELECT thumbnail_path, preview_frames FROM files
        WHERE thumbnail_path IS NOT NULL OR preview_frames IS NOT NULL
    `).all() as Array<{ thumbnail_path?: string; preview_frames?: string }>;

    log.debug(`Found ${registeredRows.length} files with thumbnails or preview frames in DB`);

    const registeredSet = new Set<string>();
    for (const row of registeredRows) {
        if (row.thumbnail_path) {
            registeredSet.add(path.normalize(path.resolve(row.thumbnail_path)));
        }
        if (row.preview_frames) {
            const frames = parsePreviewFrames(row.preview_frames);
            for (const f of frames) {
                registeredSet.add(path.normalize(path.resolve(f.trim())));
            }
        }
    }

    log.debug(`Registered ${registeredSet.size} unique thumbnail paths in DB`);

    // 3. diskにあってDBに未登録 = 孤立サムネイル
    const orphanedThumbnails: OrphanedThumbnail[] = [];
    let totalOrphanedSize = 0;

    for (const diskPath of diskFiles) {
        const normalizedPath = path.normalize(path.resolve(diskPath));

        if (!registeredSet.has(normalizedPath)) {
            let size = 0;
            try {
                size = fs.statSync(diskPath).size;
            } catch {
                // stat失敗は無視
            }
            totalOrphanedSize += size;
            orphanedThumbnails.push({ path: diskPath, size });
            log.debug(`Orphaned thumbnail (not in DB): ${diskPath}`);
        }
    }

    log.info(`Diagnostic complete: ${orphanedThumbnails.length} orphaned thumbnails found out of ${diskFiles.length} total`);

    const samples = orphanedThumbnails.slice(0, 10);

    return {
        totalThumbnails: diskFiles.length,
        orphanedCount: orphanedThumbnails.length,
        totalOrphanedSize,
        orphanedFiles: orphanedThumbnails.map(t => t.path),
        samples
    };
}

/**
 * 孤立サムネイルをクリーンアップ（削除）
 * Phase 12-6: ストレージクリーンアップ機能
 */
export async function cleanupOrphanedThumbnails(profileId: string): Promise<CleanupResult> {
    const result: CleanupResult = {
        success: true,
        deletedCount: 0,
        freedBytes: 0,
        errors: []
    };

    try {
        log.info(`Starting cleanup for profile: ${profileId}`);
        const diagnostic = await diagnoseThumbnails(profileId);

        if (diagnostic.orphanedCount === 0) {
            log.info('No orphaned thumbnails to clean up');
            return result;
        }

        log.info(`Cleaning up ${diagnostic.orphanedCount} orphaned thumbnails...`);

        for (const filePath of diagnostic.orphanedFiles) {
            try {
                if (!fs.existsSync(filePath)) {
                    log.debug(`File already deleted: ${filePath}`);
                    continue;
                }

                const stats = fs.statSync(filePath);
                const fileSize = stats.size;

                fs.unlinkSync(filePath);
                result.deletedCount++;
                result.freedBytes += fileSize;
                log.debug(`Deleted: ${filePath} (${fileSize} bytes)`);
            } catch (error: any) {
                if (error.code === 'ENOENT') {
                    log.debug(`File not found (already deleted): ${filePath}`);
                    continue;
                } else if (error.code === 'EBUSY' || error.code === 'EPERM') {
                    const errorMsg = `ロック中: ${filePath}`;
                    log.warn(errorMsg);
                    result.errors.push(errorMsg);
                } else {
                    const errorMsg = `${filePath}: ${error.message || String(error)}`;
                    log.error(`Failed to delete thumbnail: ${errorMsg}`);
                    result.errors.push(errorMsg);
                }
            }
        }

        if (result.errors.length > 0) {
            result.success = false;
            log.warn(`Cleanup completed with ${result.errors.length} errors`);
        } else {
            log.info(`Cleanup completed: ${result.deletedCount} files deleted, ${(result.freedBytes / 1024 / 1024).toFixed(2)} MB freed`);
        }

        return result;
    } catch (error: any) {
        log.error('Cleanup failed:', error);
        return {
            success: false,
            deletedCount: 0,
            freedBytes: 0,
            errors: [error.message || String(error)]
        };
    }
}
