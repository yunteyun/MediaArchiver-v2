import { ipcMain } from 'electron';
import { getFiles, findFileById, updateFileNotes } from '../services/database';

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
            notes: f.notes || '',
            isAnimated: f.isAnimated ?? (f.is_animated === 1),
        }));

        return mappedFiles;
    });

    ipcMain.handle('file:updateNotes', async (_event, { fileId, notes }: { fileId: string; notes: string }) => {
        try {
            updateFileNotes(fileId, notes);
            return { success: true };
        } catch (e) {
            console.error('Failed to update notes:', e);
            return { success: false };
        }
    });

    ipcMain.handle('db:getFileById', async (_event, fileId: string) => {
        const file = findFileById(fileId);
        if (!file) return null;
        return {
            id: file.id,
            name: file.name,
            path: file.path,
            size: file.size,
            type: file.type,
            createdAt: file.created_at,
            duration: file.duration,
            thumbnailPath: file.thumbnail_path,
            previewFrames: file.preview_frames,
            rootFolderId: file.root_folder_id,
            tags: file.tags,
            contentHash: file.content_hash,
            metadata: file.metadata,
            mtimeMs: file.mtime_ms,
            notes: file.notes || '',
            isAnimated: file.isAnimated ?? (file.is_animated === 1),
        };
    });
}
