import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script - Renderer と Main プロセス間の安全なブリッジ
 * 
 * contextBridge を使用して、Renderer プロセスから Main プロセスの
 * 機能に安全にアクセスできるAPIを公開します。
 */

contextBridge.exposeInMainWorld('electronAPI', {
    // === Database ===
    getFiles: (folderId?: string) => ipcRenderer.invoke('db:getFiles', folderId),

    // === Folder ===
    addFolder: (folderPath: string) => ipcRenderer.invoke('folder:add', folderPath),
    getFolders: () => ipcRenderer.invoke('folder:list'),
    deleteFolder: (folderId: string) => ipcRenderer.invoke('folder:delete', folderId),

    // === Scanner ===
    scanFolder: (folderPath: string) => ipcRenderer.invoke('scanner:start', folderPath),

    // === App ===
    openExternal: (path: string) => ipcRenderer.invoke('app:openExternal', path),
    showInExplorer: (path: string) => ipcRenderer.invoke('app:showInExplorer', path),

    // === Dialog ===
    selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),

    // === Events (Main -> Renderer) ===
    onScanProgress: (callback: (progress: any) => void) => {
        const subscription = (_event: any, progress: any) => callback(progress);
        ipcRenderer.on('scanner:progress', subscription);
        // Return a cleanup function if needed, but for now specific implementation
        return () => {
            ipcRenderer.removeListener('scanner:progress', subscription);
        };
    },

    // === Context Menu ===
    showFolderContextMenu: (folderId: string, path: string) =>
        ipcRenderer.invoke('folder:showContextMenu', { folderId, path }),

    onFolderDeleted: (callback: (folderId: string) => void) => {
        const handler = (_event: any, folderId: string) => callback(folderId);
        ipcRenderer.on('folder:deleted', handler);
        return () => ipcRenderer.removeListener('folder:deleted', handler);
    },

    onFolderRescanComplete: (callback: (folderId: string) => void) => {
        const handler = (_event: any, folderId: string) => callback(folderId);
        ipcRenderer.on('folder:rescanComplete', handler);
        return () => ipcRenderer.removeListener('folder:rescanComplete', handler);
    },

    // === File Context Menu ===
    showFileContextMenu: (fileId: string, path: string) =>
        ipcRenderer.invoke('file:showContextMenu', { fileId, filePath: path }),

    onFileDeleted: (callback: (fileId: string) => void) => {
        const handler = (_event: any, fileId: string) => callback(fileId);
        ipcRenderer.on('file:deleted', handler);
        return () => ipcRenderer.removeListener('file:deleted', handler);
    },
});
