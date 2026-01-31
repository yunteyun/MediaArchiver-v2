import fs from 'fs';
import path from 'path';
import * as db from './database';
import { generateThumbnail, getVideoDuration } from './thumbnail';

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.wmv'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
const ARCHIVE_EXTENSIONS = ['.zip', '.cbz', '.rar', '.cbr', '.7z'];

export type ScanProgressCallback = (progress: {
    phase: 'counting' | 'scanning' | 'complete' | 'error';
    current: number;
    total: number;
    currentFile?: string;
    message?: string;
}) => void;

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
                if (VIDEO_EXTENSIONS.includes(ext) || IMAGE_EXTENSIONS.includes(ext) || ARCHIVE_EXTENSIONS.includes(ext)) {
                    count++;
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
    state: { current: number; total: number }
) {
    if (!fs.existsSync(dirPath)) return;

    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        try {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                await scanDirectoryInternal(fullPath, rootFolderId, onProgress, state);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                let type: 'video' | 'image' | 'archive' | null = null;

                if (VIDEO_EXTENSIONS.includes(ext)) type = 'video';
                else if (IMAGE_EXTENSIONS.includes(ext)) type = 'image';
                else if (ARCHIVE_EXTENSIONS.includes(ext)) type = 'archive';

                if (type) {
                    state.current++;
                    const stats = await fs.promises.stat(fullPath);

                    const existing = db.findFileByPath(fullPath);
                    // Skip if size and mtime match AND thumbnail exists (if applicable)
                    // If thumbnail is missing, we should fall through to generation logic
                    // However, we need to be careful not to re-scan fully if only thumbnail is missing?
                    // Actually, falling through is fine, the insertFile will act as update.

                    const isMedia = type === 'video' || type === 'image';
                    const hasThumbnail = !!existing?.thumbnail_path;

                    if (existing &&
                        existing.size === stats.size &&
                        existing.mtime_ms === Math.floor(stats.mtimeMs) &&
                        (!isMedia || hasThumbnail)
                    ) {
                        if (onProgress) {
                            onProgress({
                                phase: 'scanning',
                                current: state.current,
                                total: state.total,
                                currentFile: entry.name
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
                            if (generated) thumbnailPath = generated;
                        } catch (e) {
                            console.error('Thumbnail generation failed:', e);
                        }
                    }

                    // Generate duration if missing (video only)
                    let duration = existing?.duration;
                    if (type === 'video' && !duration) {
                        try {
                            duration = await getVideoDuration(fullPath);
                        } catch (e) {
                            console.error('Duration extraction failed:', e);
                        }
                    }

                    // Insert or Update
                    db.insertFile({
                        name: entry.name,
                        path: fullPath,
                        size: stats.size,
                        type: type,
                        created_at: stats.birthtimeMs,
                        mtime_ms: Math.floor(stats.mtimeMs),
                        root_folder_id: rootFolderId,
                        tags: existing?.tags || [],
                        duration: duration,
                        thumbnail_path: thumbnailPath,
                        preview_frames: existing?.preview_frames,
                        content_hash: existing?.content_hash,
                        metadata: existing?.metadata
                    });

                    if (onProgress) {
                        onProgress({
                            phase: 'scanning',
                            current: state.current,
                            total: state.total,
                            currentFile: entry.name,
                            message: '登録完了'
                        });
                    }
                }
            }
        } catch (err) {
            console.error(`Failed to scan entry ${entry.name}:`, err);
        }
    }
}

export async function scanDirectory(dirPath: string, rootFolderId: string, onProgress?: ScanProgressCallback) {
    try {
        if (onProgress) {
            onProgress({ phase: 'counting', current: 0, total: 0, message: 'ファイル数をカウント中...' });
        }

        const total = await countFiles(dirPath);

        if (onProgress) {
            onProgress({ phase: 'scanning', current: 0, total, message: 'スキャン開始...' });
        }

        const state = { current: 0, total };
        await scanDirectoryInternal(dirPath, rootFolderId, onProgress, state);

        // Orphan check (simplified)
        const registeredFiles = db.getFiles(rootFolderId);
        let removedCount = 0;
        for (const file of registeredFiles) {
            if (!fs.existsSync(file.path)) {
                db.deleteFile(file.id);
                removedCount++;
            }
        }

        if (onProgress) {
            console.log(`Scan completed. Total: ${total}, Removed: ${removedCount}`);
            onProgress({
                phase: 'complete',
                current: total,
                total,
                message: `完了: ${total}件登録, ${removedCount}件削除`
            });
        }

    } catch (e) {
        if (onProgress) {
            onProgress({ phase: 'error', current: 0, total: 0, message: String(e) });
        }
        throw e;
    }
}
