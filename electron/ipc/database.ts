import { ipcMain } from 'electron';
import { getFiles } from '../services/database';

export function registerDatabaseHandlers() {
    ipcMain.handle('db:getFiles', async (_event, folderId?: string) => {
        const files = getFiles(folderId);

        const mappedFiles = files.map((f: any) => ({
            id: f.id,
            name: f.name,
            path: f.path,
            size: f.size,
            type: f.type,
            createdAt: f.created_at,
            duration: f.duration,
            thumbnailPath: f.thumbnail_path,
            previewFrames: f.preview_frames,
            rootFolderId: f.root_folder_id,
            tags: f.tags,
            contentHash: f.content_hash,
            metadata: f.metadata,
            mtimeMs: f.mtime_ms,
        }));

        return mappedFiles;
    });
}
