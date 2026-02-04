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
    samples: OrphanedThumbnail[]; // 最大10件のサンプル
}

// --- Helper Functions ---

/**
 * サムネイルディレクトリのパスを取得
 */
function getThumbnailDir(profileId: string): string {
    return path.join(app.getPath('userData'), 'thumbnails', profileId);
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

    // 1. サムネイルディレクトリ内のすべてのファイルを取得
    const allThumbnails = getAllFiles(thumbnailDir);
    log.debug(`Found ${allThumbnails.length} thumbnail files`);

    // 2. DBから登録済みサムネイルパスを取得
    const registeredPaths = db.prepare(`
        SELECT thumbnail_path FROM files WHERE thumbnail_path IS NOT NULL
        UNION
        SELECT preview_frames FROM files WHERE preview_frames IS NOT NULL
    `).all() as Array<{ thumbnail_path?: string; preview_frames?: string }>;

    // パスを正規化してSetに格納（高速検索のため）
    const registeredPathSet = new Set<string>();

    for (const row of registeredPaths) {
        if (row.thumbnail_path) {
            registeredPathSet.add(path.normalize(path.resolve(row.thumbnail_path)));
        }
        if (row.preview_frames) {
            try {
                const frames: string[] = JSON.parse(row.preview_frames);
                frames.forEach(framePath => {
                    registeredPathSet.add(path.normalize(path.resolve(framePath)));
                });
            } catch (e) {
                // JSON parse error - skip
            }
        }
    }

    log.debug(`Found ${registeredPathSet.size} registered thumbnail paths in DB`);

    // 3. 孤立サムネイルを検出
    const orphanedThumbnails: OrphanedThumbnail[] = [];
    let totalOrphanedSize = 0;

    for (const thumbnailPath of allThumbnails) {
        // パスを正規化して比較
        const normalizedPath = path.normalize(path.resolve(thumbnailPath));

        if (!registeredPathSet.has(normalizedPath)) {
            const stats = fs.statSync(thumbnailPath);
            orphanedThumbnails.push({
                path: thumbnailPath,
                size: stats.size
            });
            totalOrphanedSize += stats.size;
        }
    }

    log.info(`Diagnostic complete: ${orphanedThumbnails.length} orphaned thumbnails found (${(totalOrphanedSize / 1024 / 1024).toFixed(2)} MB)`);

    // 4. サンプルを最大10件に制限（IPCペイロード軽量化）
    const samples = orphanedThumbnails.slice(0, 10);

    return {
        totalThumbnails: allThumbnails.length,
        orphanedCount: orphanedThumbnails.length,
        totalOrphanedSize,
        samples
    };
}
