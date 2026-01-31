import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { addFolder, deleteFolder, getFolders } from '../services/database';
import { scanDirectory } from '../services/scanner';

export function registerScannerHandlers() {
    // === Folder Operations ===
    ipcMain.handle('folder:add', async (_event, folderPath: string) => {
        return addFolder(folderPath);
    });

    ipcMain.handle('folder:list', async (_event) => {
        return getFolders();
    });

    ipcMain.handle('folder:delete', async (_event, folderId: string) => {
        return deleteFolder(folderId);
    });

    // === Scanner Operations ===
    ipcMain.handle('scanner:start', async (event: IpcMainInvokeEvent, folderPath: string) => {
        // Assuming we look up root folder by path or we just use folderPath as identification if we haven't stored ID yet?
        // Actually `addFolder` returns the ID. The UI should probably call `folder:add` first or we do it here.
        // Let's assume the UI passes the path, and we ensure it is added as a folder first, or find the ID.

        let folder = getFolders().find(f => f.path === folderPath);
        if (!folder) {
            folder = addFolder(folderPath);
        }
        const rootFolderId = folder.id;

        // Run scan (async but awaited here? No, scan might take long. 
        // Ideally we shouldn't await if we want to return immediately, but for Phase 2-1 we can await or not?
        // If we await, the UI might blocked if not careful (though `invoke` is async).
        // Better to not await the full scan if it's long, but for simplistic implementation we await.
        // Or better: Send progress events.

        /* 
           Note: If we await `scanDirectory`, the Promise won't resolve until scan completes.
           The UI will wait for response. 
           We should probably just start it and return, triggering events.
        */

        scanDirectory(folderPath, rootFolderId, (progress) => {
            event.sender.send('scanner:progress', progress);
        }).catch(err => {
            console.error("Scan error:", err);
            event.sender.send('scanner:progress', { phase: 'error', message: String(err) });
        });

        return; // Return immediately
    });
}
