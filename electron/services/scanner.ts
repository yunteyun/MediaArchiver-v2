import fs from 'fs';
import path from 'path';
import pLimit from 'p-limit';
import * as db from './database';
import { dbManager } from './databaseManager';
import { logger } from './logger';
import { generateThumbnail, getVideoDuration, generatePreviewFrames, checkIsAnimated } from './thumbnail';
import { validatePathLength, isSkippableError, getErrorCode } from './pathValidator';
import * as archiveHandler from './archiveHandler';

const log = logger.scope('Scanner');

// サムネイル生成の同時実行数制限（CPU負荷軽減）
const thumbnailLimit = pLimit(3);

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

// スキャン速度抑制（ファイル間待機時間 ms）
let scanThrottleMsSetting = 0;
export function setScanThrottleMs(ms: number) {
    scanThrottleMsSetting = ms;
}
export function getScanThrottleMs() {
    return scanThrottleMsSetting;
}

// サムネイル生成解像度（幅px、デフォルト: 320）
let thumbnailResolutionSetting = 320;
export function setThumbnailResolution(resolution: number) {
    thumbnailResolutionSetting = resolution;
}
export function getThumbnailResolution() {
    return thumbnailResolutionSetting;
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
    // パス長チェック
    if (!validatePathLength(dirPath)) {
        log.warn(`Skipping path (too long): ${dirPath.substring(0, 100)}...`);
        return 0;
    }
    if (!fs.existsSync(dirPath)) return 0;

    let count = 0;
    try {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            try {
                const fullPath = path.join(dirPath, entry.name);

                // パス長チェック
                if (!validatePathLength(fullPath)) {
                    log.warn(`Skipping path (too long): ${entry.name}`);
                    continue;
                }

                if (entry.isDirectory()) {
                    count += await countFiles(fullPath);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (VIDEO_EXTENSIONS.includes(ext) || IMAGE_EXTENSIONS.includes(ext) || ARCHIVE_EXTENSIONS.includes(ext) || AUDIO_EXTENSIONS.includes(ext)) {
                        count++;
                    }
                }
            } catch (entryErr) {
                // エントリごとのエラーはスキップ
                if (isSkippableError(entryErr)) {
                    log.debug(`Skipping entry (${getErrorCode(entryErr)}): ${entry.name}`);
                } else {
                    log.warn(`Error processing entry ${entry.name}:`, entryErr);
                }
            }
        }
    } catch (e) {
        // ディレクトリ読み取りエラー
        if (isSkippableError(e)) {
            log.debug(`Cannot read directory (${getErrorCode(e)}): ${dirPath}`);
        } else {
            log.warn(`Error reading directory ${dirPath}:`, e);
        }
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
    // パス長チェック
    if (!validatePathLength(dirPath)) {
        log.warn(`Skipping directory (path too long): ${dirPath.substring(0, 100)}...`);
        return;
    }
    if (!fs.existsSync(dirPath)) return;
    if (scanCancelled) return;

    let entries;
    try {
        entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    } catch (readErr) {
        if (isSkippableError(readErr)) {
            log.debug(`Cannot read directory (${getErrorCode(readErr)}): ${dirPath}`);
        } else {
            log.warn(`Error reading directory ${dirPath}:`, readErr);
        }
        return;
    }

    for (const entry of entries) {
        // キャンセルチェック
        if (scanCancelled) return;

        try {
            const fullPath = path.join(dirPath, entry.name);

            // パス長チェック
            if (!validatePathLength(fullPath)) {
                log.warn(`Skipping file (path too long): ${entry.name}`);
                state.stats.skipCount++;
                continue;
            }

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

                    let fileStats;
                    try {
                        fileStats = await fs.promises.stat(fullPath);
                    } catch (statErr) {
                        if (isSkippableError(statErr)) {
                            log.debug(`Skipping file (${getErrorCode(statErr)}): ${entry.name}`);
                        } else {
                            log.warn(`Cannot stat file ${entry.name}:`, statErr);
                        }
                        state.stats.skipCount++;
                        continue;
                    }

                    const existing = db.findFileByPath(fullPath);
                    // Skip if size and mtime match AND thumbnail exists (if applicable)
                    // For videos, also require preview_frames to exist

                    // All media types need thumbnails (video, image, archive, audio)
                    const isMedia = type === 'video' || type === 'image' || type === 'archive' || type === 'audio';
                    const hasThumbnail = !!existing?.thumbnail_path;

                    // Check if preview frames actually exist on disk (not just in DB)
                    let hasPreviewFrames = false;
                    if (existing?.preview_frames) {
                        const framePaths = existing.preview_frames.split(',').filter(Boolean);
                        // Check if at least one frame file exists
                        hasPreviewFrames = framePaths.length > 0 && framePaths.some(framePath => {
                            try {
                                return fs.existsSync(framePath);
                            } catch {
                                return false;
                            }
                        });
                    }

                    // Videos require both thumbnail and preview frames (only if setting > 0)
                    // Phase 15-2: 画像はメタデータ(width/height)も必要
                    const hasMetadata = !!existing?.metadata;
                    const isComplete = type === 'video'
                        ? (hasThumbnail && (hasPreviewFrames || previewFrameCountSetting === 0))
                        : type === 'image'
                            ? (hasThumbnail && hasMetadata)
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
                            // p-limitで同時実行数を制限（CPU負荷軽減）
                            const generated = await thumbnailLimit(() => generateThumbnail(fullPath, thumbnailResolutionSetting));
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

                    // Check if preview frames actually exist on disk
                    let needsPreviewFrames = false;
                    if (type === 'video' && previewFrameCountSetting > 0) {
                        if (!previewFrames) {
                            // No DB record at all
                            needsPreviewFrames = true;
                        } else {
                            // DB record exists, check if files actually exist
                            const framePaths = previewFrames.split(',').filter(Boolean);
                            const anyFileExists = framePaths.some(framePath => {
                                try {
                                    return fs.existsSync(framePath);
                                } catch {
                                    return false;
                                }
                            });
                            needsPreviewFrames = !anyFileExists;
                        }
                    }

                    if (needsPreviewFrames) {
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
                            // p-limitで同時実行数を制限（CPU負荷軽減）
                            previewFrames = await thumbnailLimit(() => generatePreviewFrames(fullPath, previewFrameCountSetting)) || undefined;

                            // スキャン速度抑制（コイル鳴き対策）
                            if (scanThrottleMsSetting > 0) {
                                await new Promise(resolve => setTimeout(resolve, scanThrottleMsSetting));
                            }

                            if (scanCancelled) return;
                        } catch (e) {
                            log.error('Preview frames generation failed:', e);
                        }
                    }

                    // Generate archive metadata if missing (archive only)
                    let metadata = existing?.metadata;
                    if (type === 'archive' && !metadata) {
                        try {
                            if (onProgress) {
                                onProgress({
                                    phase: 'scanning',
                                    current: state.current,
                                    total: state.total,
                                    currentFile: entry.name,
                                    message: `書庫メタデータ取得中...`
                                });
                            }
                            const meta = await archiveHandler.getArchiveMetadata(fullPath);
                            metadata = JSON.stringify(meta);
                        } catch (e) {
                            log.error('Archive metadata extraction failed:', e);
                        }
                    }

                    // Phase 15-2: 画像メタデータ抽出（width/height）
                    if (type === 'image' && !metadata) {
                        try {
                            const sharp = (await import('sharp')).default;
                            const imgMeta = await sharp(fullPath).metadata();
                            if (imgMeta.width && imgMeta.height) {
                                metadata = JSON.stringify({
                                    width: imgMeta.width,
                                    height: imgMeta.height,
                                    format: imgMeta.format
                                });
                            }
                        } catch (e) {
                            log.error('Image metadata extraction failed:', e);
                        }
                    }

                    // Check if image is animated (GIF/WebP)
                    let isAnimated: boolean | undefined = undefined;
                    if (type === 'image') {
                        // 既存ファイルで is_animated が未設定(0)の場合も再チェック
                        if (!existing || existing.is_animated === undefined || existing.is_animated === 0) {
                            try {
                                isAnimated = await checkIsAnimated(fullPath);
                            } catch (e) {
                                log.error('Animation check failed:', e);
                            }
                        } else {
                            isAnimated = existing.is_animated === 1;
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
                        metadata: metadata,
                        is_animated: isAnimated ? 1 : 0  // SQLiteはbooleanをINTEGERとして保存
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
            if (isSkippableError(err)) {
                log.debug(`Skipping entry (${getErrorCode(err)}): ${entry.name}`);
                state.stats.skipCount++;
            } else {
                log.error(`Failed to scan entry ${entry.name}:`, err);
            }
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
