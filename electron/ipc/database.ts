import { ipcMain } from 'electron';
import { getFiles, findFileById, updateFileNotes, getFilesByFolderPathDirect, getFilesByFolderPathRecursive, getFolderTreePaths } from '../services/database';

function mapFileForRenderer(f: any) {
    return {
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
        accessCount: f.accessCount ?? 0,
        lastAccessedAt: f.lastAccessedAt ?? null,
        externalOpenCount: f.externalOpenCount ?? 0,
        lastExternalOpenedAt: f.lastExternalOpenedAt ?? null,
    };
}

export function registerDatabaseHandlers() {
    ipcMain.handle('db:getFiles', async (_event, folderId?: string) => {
        const files = getFiles(folderId);
        return files.map((f: any) => mapFileForRenderer(f));
    });

    ipcMain.handle('db:getFilesByFolderPathDirect', async (_event, folderPath: string) => {
        return getFilesByFolderPathDirect(folderPath).map((f: any) => mapFileForRenderer(f));
    });

    ipcMain.handle('db:getFilesByFolderPathRecursive', async (_event, folderPath: string) => {
        return getFilesByFolderPathRecursive(folderPath).map((f: any) => mapFileForRenderer(f));
    });

    ipcMain.handle('folder:getTreePaths', async () => {
        return getFolderTreePaths();
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
            ...mapFileForRenderer(file),
        };
    });
}
