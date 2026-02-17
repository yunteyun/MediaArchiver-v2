/**
 * Thumbnail Cleanup Service - サムネイル診断・クリーンアップ
 * 
 * DBに存在しないサムネイルファイル（孤立サムネイル）を検出する。
 * Phase 12-1.5: 診断機能のみ実装（削除機能は Phase 12-6 で実装予定）
 */

import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { dbManager } from './databaseManager';
import { logger } from './logger';

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
 * Note: サムネイルは thumbnails/ 直下に保存される（プロファイル別サブディレクトリは使用しない）
 */
function getThumbnailDir(_profileId: string): string {
    // profileId は将来の拡張用に引数として残すが、現状は使用しない
    return path.join(app.getPath('userData'), 'thumbnails');
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
 * アーキテクチャレビュー対応:
 * - IPCペイロード軽量化: サンプル最大10件に制限
 * - パス比較の厳密化: path.normalize() で正規化
 */
export async function diagnoseThumbnails(profileId: string): Promise<DiagnosticResult> {
    log.info(`Starting thumbnail diagnostic for profile: ${profileId}`);

    const thumbnailDir = getThumbnailDir(profileId);
    const db = dbManager.getDb();

    // Bug 5修正: DB基準の孤立判定に変更
    // 1. DBから登録済みサムネイルパスを取得
    const registeredFiles = db.prepare(`
        SELECT thumbnail_path, preview_frames FROM files 
        WHERE thumbnail_path IS NOT NULL OR preview_frames IS NOT NULL
    `).all() as Array<{ thumbnail_path?: string; preview_frames?: string }>;

    log.debug(`Found ${registeredFiles.length} files with thumbnails or preview frames`);

    // 2. すべての登録済みサムネイルパスを収集
    const allRegisteredPaths: string[] = [];

    for (const row of registeredFiles) {
        if (row.thumbnail_path) {
            allRegisteredPaths.push(row.thumbnail_path);
        }
        if (row.preview_frames) {
            // preview_framesはカンマ区切り文字列（例: "path1,path2,path3"）
            const frames = row.preview_frames.split(',').filter(f => f.trim().length > 0);
            allRegisteredPaths.push(...frames.map(f => f.trim()));
        }
    }

    log.debug(`Found ${allRegisteredPaths.length} registered thumbnail paths in DB`);

    // 3. 孤立サムネイルを検出（DBに登録されているが実際にファイルが存在しないもの）
    const orphanedThumbnails: OrphanedThumbnail[] = [];
    let totalOrphanedSize = 0;

    for (const thumbnailPath of allRegisteredPaths) {
        // パスを正規化
        const normalizedPath = path.normalize(path.resolve(thumbnailPath));

        // ファイルが存在しない場合は孤立サムネイル
        if (!fs.existsSync(normalizedPath)) {
            orphanedThumbnails.push({
                path: thumbnailPath,
                size: 0 // ファイルが存在しないのでサイズは0
            });
            log.debug(`Orphaned thumbnail (file not found): ${normalizedPath}`);
        }
    }

    log.info(`Diagnostic complete: ${orphanedThumbnails.length} orphaned thumbnails found (DB entries without files)`);

    // 4. サンプルを最大10件に制限（IPCペイロード軽量化）
    const samples = orphanedThumbnails.slice(0, 10);

    return {
        totalThumbnails: allRegisteredPaths.length,
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
                // ファイルが存在するか確認
                if (!fs.existsSync(filePath)) {
                    log.debug(`File already deleted: ${filePath}`);
                    continue;
                }

                // ファイルサイズを取得してから削除
                const stats = fs.statSync(filePath);
                const fileSize = stats.size;

                fs.unlinkSync(filePath);
                result.deletedCount++;
                result.freedBytes += fileSize;
                log.debug(`Deleted: ${filePath} (${fileSize} bytes)`);
            } catch (error: any) {
                // エラーハンドリング
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
            log.info(`Cleanup completed successfully: ${result.deletedCount} files deleted, ${(result.freedBytes / 1024 / 1024).toFixed(2)} MB freed`);
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
