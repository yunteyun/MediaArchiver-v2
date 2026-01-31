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

    // === Events (Main -> Renderer) ===
    onScanProgress: (callback: (progress: any) => void) => {
        const subscription = (_event: any, progress: any) => callback(progress);
        ipcRenderer.on('scanner:progress', subscription);
        // Return a cleanup function if needed, but for now specific implementation
        return () => {
            ipcRenderer.removeListener('scanner:progress', subscription);
        };
    },
});
