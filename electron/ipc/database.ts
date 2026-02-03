import { ipcMain } from 'electron';
import { getFiles, updateFileNotes } from '../services/database';

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
}

