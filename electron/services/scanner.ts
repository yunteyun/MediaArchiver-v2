import fs from 'fs';
import path from 'path';
import * as db from './database';

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

                    // DB check (Update logic simplified for Phase 2-1)
                    // TODO: implement detailed check like hash comparison in Phase 2-2

                    const existing = db.findFileByPath(fullPath);
                    // Skip if size and mtime match (Simple check)
                    if (existing && existing.size === stats.size && existing.mtime_ms === Math.floor(stats.mtimeMs)) {
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

                    // Insert or Update
                    // Note: Thumbnail/Hash generation is postponed to Phase 2-2
                    db.insertFile({
                        name: entry.name,
                        path: fullPath,
                        size: stats.size,
                        type: type,
                        created_at: stats.birthtimeMs,
                        mtime_ms: Math.floor(stats.mtimeMs),
                        root_folder_id: rootFolderId,
                        // default values for now
                        tags: [],
                        duration: existing?.duration,
                        thumbnail_path: existing?.thumbnail_path,
                        preview_frames: existing?.preview_frames,
                        content_hash: existing?.content_hash,
                        metadata: existing?.metadata
                    });

                    if (onProgress) {
                        onProgress({
                            phase: 'scanning',
                            current: state.current,
                            total: state.total,
                            currentFile: entry.name
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

        // Orphaned files cleanup (Files in DB but not on disk for this root folder)
        // Note: Ideally we should track which files were "touched" during this scan session to identify orphans accurately within a subfolder scan.
        // For Phase 2-1, we skip complex orphan logic or implement a simple one:
        // Getting all files for rootFolderId and checking existence.

        const registeredFiles = db.getFiles(rootFolderId);
        let removedCount = 0;
        for (const file of registeredFiles) {
            if (!fs.existsSync(file.path)) {
                db.deleteFile(file.id);
                removedCount++;
            }
        }

        if (onProgress) {
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
