import fs from 'fs';
import path from 'path';
import * as db from './database';
import { dbManager } from './databaseManager';
import { logger } from './logger';
import { generateThumbnail, getVideoDuration, generatePreviewFrames } from './thumbnail';

const log = logger.scope('Scanner');

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.wmv'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
const ARCHIVE_EXTENSIONS = ['.zip', '.cbz', '.rar', '.cbr', '.7z'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.m4a', '.ogg', '.aac', '.wma'];

export type ScanProgressCallback = (progress: {
    phase: 'counting' | 'scanning' | 'complete' | 'error';
    current: number;
    total: number;
    currentFile?: string;
    message?: string;
    stats?: {
        newCount: number;
        updateCount: number;
        skipCount: number;
    };
}) => void;

// スキャンキャンセル用フラグ
let scanCancelled = false;
export function cancelScan() {
    scanCancelled = true;
}
export function isScanCancelled() {
    return scanCancelled;
}

// プレビューフレーム数の設定（デフォルト: 10）
let previewFrameCountSetting = 10;
export function setPreviewFrameCount(count: number) {
    previewFrameCountSetting = count;
}
export function getPreviewFrameCount() {
    return previewFrameCountSetting;
}

// Throttle設定（ms）
const PROGRESS_THROTTLE_MS = 50;

// バッチトランザクションサイズ
const TRANSACTION_BATCH_SIZE = 100;

// 保留中のDB書き込み操作
interface PendingWrite {
    fileData: Parameters<typeof db.insertFile>[0];
}

// バッチコミット関数
function commitBatch(pendingWrites: PendingWrite[]) {
    if (pendingWrites.length === 0) return;

    const database = dbManager.getDb();
    const transaction = database.transaction(() => {
        pendingWrites.forEach(pw => {
            db.insertFile(pw.fileData);
        });
    });

    transaction();
}

// ファイル数をカウント (再帰)
async function countFiles(dirPath: string): Promise<number> {
    if (!fs.existsSync(dirPath)) return 0;

    let count = 0;
    try {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                count += await countFiles(fullPath);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (VIDEO_EXTENSIONS.includes(ext) || IMAGE_EXTENSIONS.includes(ext) || ARCHIVE_EXTENSIONS.includes(ext) || AUDIO_EXTENSIONS.includes(ext)) {
                    count++;;
                }
            }
        }
    } catch (e) {
        // ignore access errors
    }
    return count;
}

// Internal scan function
async function scanDirectoryInternal(
    dirPath: string,
    rootFolderId: string,
    onProgress: ScanProgressCallback | undefined,
    state: {
        current: number;
        total: number;
        lastProgressTime: number;
        stats: { newCount: number; updateCount: number; skipCount: number };
        pendingWrites: PendingWrite[];
    }
) {
    if (!fs.existsSync(dirPath)) return;
    if (scanCancelled) return;

    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        // キャンセルチェック
        if (scanCancelled) return;

        try {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                await scanDirectoryInternal(fullPath, rootFolderId, onProgress, state);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                let type: 'video' | 'image' | 'archive' | 'audio' | null = null;

                if (VIDEO_EXTENSIONS.includes(ext)) type = 'video';
                else if (IMAGE_EXTENSIONS.includes(ext)) type = 'image';
                else if (ARCHIVE_EXTENSIONS.includes(ext)) type = 'archive';
                else if (AUDIO_EXTENSIONS.includes(ext)) type = 'audio';

                if (type) {
                    state.current++;
                    const fileStats = await fs.promises.stat(fullPath);

                    const existing = db.findFileByPath(fullPath);
                    // Skip if size and mtime match AND thumbnail exists (if applicable)
                    // For videos, also require preview_frames to exist

                    // All media types need thumbnails (video, image, archive, audio)
                    const isMedia = type === 'video' || type === 'image' || type === 'archive' || type === 'audio';
                    const hasThumbnail = !!existing?.thumbnail_path;
                    const hasPreviewFrames = !!existing?.preview_frames;

                    // Videos require both thumbnail and preview frames
                    const isComplete = type === 'video'
                        ? (hasThumbnail && hasPreviewFrames)
                        : (!isMedia || hasThumbnail);

                    if (existing &&
                        existing.size === fileStats.size &&
                        existing.mtime_ms === Math.floor(fileStats.mtimeMs) &&
                        isComplete
                    ) {
                        state.stats.skipCount++;
                        // Throttled progress update
                        const now = Date.now();
                        if (onProgress && (now - state.lastProgressTime > PROGRESS_THROTTLE_MS || state.current === state.total)) {
                            state.lastProgressTime = now;
                            onProgress({
                                phase: 'scanning',
                                current: state.current,
                                total: state.total,
                                currentFile: entry.name,
                                stats: state.stats
                            });
                        }
                        continue;
                    }

                    // Generate thumbnail if missing
                    let thumbnailPath = existing?.thumbnail_path;
                    if (!thumbnailPath) {
                        try {
                            if (onProgress) {
                                onProgress({
                                    phase: 'scanning',
                                    current: state.current,
                                    total: state.total,
                                    currentFile: entry.name,
                                    message: `サムネイル生成中...`
                                });
                            }
                            const generated = await generateThumbnail(fullPath);
                            if (scanCancelled) return;
                            if (generated) thumbnailPath = generated;
                        } catch (e) {
                            log.error('Thumbnail generation failed:', e);
                        }
                    }

                    // Generate duration if missing (video and audio)
                    let duration = existing?.duration;
                    if ((type === 'video' || type === 'audio') && !duration) {
                        try {
                            duration = await getVideoDuration(fullPath);
                        } catch (e) {
                            log.error('Duration extraction failed:', e);
                        }
                    }

                    // Generate preview frames if missing (video only, for scrub mode)
                    let previewFrames = existing?.preview_frames;
                    if (type === 'video' && !previewFrames && previewFrameCountSetting > 0) {
                        try {
                            if (onProgress) {
                                onProgress({
                                    phase: 'scanning',
                                    current: state.current,
                                    total: state.total,
                                    currentFile: entry.name,
                                    message: `プレビューフレーム生成中...`
                                });
                            }
                            previewFrames = await generatePreviewFrames(fullPath, previewFrameCountSetting) || undefined;
                            if (scanCancelled) return;
                        } catch (e) {
                            log.error('Preview frames generation failed:', e);
                        }
                    }

                    // Insert or Update - バッチに追加
                    const isNew = !existing;
                    const fileData = {
                        name: entry.name,
                        path: fullPath,
                        size: fileStats.size,
                        type: type,
                        created_at: fileStats.birthtimeMs,
                        mtime_ms: Math.floor(fileStats.mtimeMs),
                        root_folder_id: rootFolderId,
                        tags: existing?.tags || [],
                        duration: duration,
                        thumbnail_path: thumbnailPath,
                        preview_frames: previewFrames,
                        content_hash: existing?.content_hash,
                        metadata: existing?.metadata
                    };

                    state.pendingWrites.push({ fileData });

                    // バッチサイズに達したらコミット
                    if (state.pendingWrites.length >= TRANSACTION_BATCH_SIZE) {
                        commitBatch(state.pendingWrites);
                        state.pendingWrites = [];
                    }

                    // Update stats
                    if (isNew) {
                        state.stats.newCount++;
                    } else {
                        state.stats.updateCount++;
                    }

                    // Throttled progress update
                    const nowAfter = Date.now();
                    if (onProgress && (nowAfter - state.lastProgressTime > PROGRESS_THROTTLE_MS || state.current === state.total)) {
                        state.lastProgressTime = nowAfter;
                        onProgress({
                            phase: 'scanning',
                            current: state.current,
                            total: state.total,
                            currentFile: entry.name,
                            message: isNew ? '新規登録' : '更新',
                            stats: state.stats
                        });
                    }
                }
            }
        } catch (err) {
            log.error(`Failed to scan entry ${entry.name}:`, err);
        }
    }
}

export async function scanDirectory(dirPath: string, rootFolderId: string, onProgress?: ScanProgressCallback) {
    // キャンセルフラグをリセット
    scanCancelled = false;

    try {
        if (onProgress) {
            onProgress({ phase: 'counting', current: 0, total: 0, message: 'ファイル数をカウント中...' });
        }

        const total = await countFiles(dirPath);

        if (onProgress) {
            onProgress({ phase: 'scanning', current: 0, total, message: 'スキャン開始...' });
        }

        const state = {
            current: 0,
            total,
            lastProgressTime: 0,
            stats: { newCount: 0, updateCount: 0, skipCount: 0 },
            pendingWrites: [] as PendingWrite[]
        };
        await scanDirectoryInternal(dirPath, rootFolderId, onProgress, state);

        // 残りのバッチをコミット
        if (state.pendingWrites.length > 0) {
            commitBatch(state.pendingWrites);
            state.pendingWrites = [];
        }

        // Orphan check (simplified)
        const registeredFiles = db.getFiles(rootFolderId);
        let removedCount = 0;
        for (const file of registeredFiles) {
            if (!fs.existsSync(file.path)) {
                db.deleteFile(file.id);
                removedCount++;
            }
        }

        // キャンセルされた場合
        if (scanCancelled) {
            if (onProgress) {
                onProgress({
                    phase: 'complete',
                    current: state.current,
                    total,
                    message: `キャンセル: ${state.stats.newCount}件新規, ${state.stats.updateCount}件更新, ${state.stats.skipCount}件スキップ`,
                    stats: state.stats
                });
            }
            return;
        }

        if (onProgress) {
            console.log(`Scan completed. Total: ${total}, New: ${state.stats.newCount}, Update: ${state.stats.updateCount}, Skip: ${state.stats.skipCount}, Removed: ${removedCount}`);
            onProgress({
                phase: 'complete',
                current: total,
                total,
                message: `完了: ${state.stats.newCount}件新規, ${state.stats.updateCount}件更新, ${state.stats.skipCount}件スキップ, ${removedCount}件削除`,
                stats: state.stats
            });
        }

    } catch (e) {
        if (onProgress) {
            onProgress({ phase: 'error', current: 0, total: 0, message: String(e) });
        }
        throw e;
    }
}
