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

    // === Scanner ===
    scanFolder: (folderPath: string) => ipcRenderer.invoke('scanner:start', folderPath),

    // === App ===
    openExternal: (path: string) => ipcRenderer.invoke('app:openExternal', path),

    // === Events (Main -> Renderer) ===
    onScanProgress: (callback: (progress: any) => void) => {
        ipcRenderer.on('scanner:progress', (_event, progress) => callback(progress));
    },
});
