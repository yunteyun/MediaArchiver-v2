import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { addFolder, deleteFolder, getAutoScanFolders, getFolders } from '../services/database';
import {
    scanDirectory,
    cancelScan,
    cancelScanToken,
    createScanCancellationToken,
    getCurrentScanRuntimeSettings,
    isScanCancelled,
    setPreviewFrameCount,
    setScanThrottleMs,
    setThumbnailResolution,
    setScanFileTypeCategories,
    setScanExclusionRules,
    type ScanCancellationToken,
    type ScanBatchCommittedPayload,
} from '../services/scanner';
import { syncFolderWatchers } from '../services/folderWatchService';
import { runAutoOrganizeForScan } from '../services/autoOrganizeService';

const activeInteractiveScanTokens = new Set<ScanCancellationToken>();

function trackInteractiveScanToken(token: ScanCancellationToken): () => void {
    activeInteractiveScanTokens.add(token);
    return () => {
        activeInteractiveScanTokens.delete(token);
    };
}

function sendScanBatchCommitted(event: IpcMainInvokeEvent, payload: ScanBatchCommittedPayload) {
    event.sender.send('scanner:batchCommitted', payload);
}

export function registerScannerHandlers() {
    // === Folder Operations ===
    ipcMain.handle('folder:add', async (_event, folderPath: string) => {
        const folder = addFolder(folderPath);
        syncFolderWatchers();
        return folder;
    });

    ipcMain.handle('folder:list', async (_event) => {
        return getFolders();
    });

    ipcMain.handle('folder:delete', async (_event, folderId: string) => {
        const result = deleteFolder(folderId);
        syncFolderWatchers();
        return result;
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
        const cancellationToken = createScanCancellationToken();
        const runtimeSettings = getCurrentScanRuntimeSettings();
        const releaseToken = trackInteractiveScanToken(cancellationToken);

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

        scanDirectory(
            folderPath,
            rootFolderId,
            (progress) => {
                event.sender.send('scanner:progress', {
                    ...progress,
                    folderName: folder?.name || folderPath.split(/[\\/]/).pop(),
                });
            },
            (payload) => {
                sendScanBatchCommitted(event, payload);
            },
            {
                runtimeSettings,
                cancellationToken,
            }
        ).then(async () => {
            if (isScanCancelled(cancellationToken)) {
                return;
            }
            const result = await runAutoOrganizeForScan({
                triggerSource: 'manual_scan',
                rootFolderId,
                scanPath: folderPath,
            });
            if (result?.success && result.appliedCount > 0) {
                event.sender.send('ui:showToast', {
                    message: `自動整理を自動実行しました（処理 ${result.appliedCount} 件）`,
                    type: 'success',
                    duration: 4000,
                });
            } else if (result && !result.success) {
                event.sender.send('ui:showToast', {
                    message: `自動整理の自動実行に失敗しました: ${result.error ?? 'unknown error'}`,
                    type: 'error',
                    duration: 5000,
                });
            }
        }).catch(err => {
            console.error("Scan error:", err);
            event.sender.send('scanner:progress', { phase: 'error', message: String(err) });
        }).finally(() => {
            releaseToken();
        });

        return; // Return immediately
    });

    // === Cancel Scan ===
    ipcMain.handle('scanner:cancel', async () => {
        activeInteractiveScanTokens.forEach((token) => cancelScanToken(token));
        cancelScan();
        return;
    });

    // === Set Preview Frame Count ===
    ipcMain.handle('scanner:setPreviewFrameCount', async (_event, count: number) => {
        setPreviewFrameCount(count);
        return;
    });

    // === Set Scan Throttle Delay ===
    ipcMain.handle('scanner:setScanThrottleMs', async (_event, ms: number) => {
        setScanThrottleMs(ms);
        return;
    });

    // === Set Thumbnail Resolution ===
    ipcMain.handle('scanner:setThumbnailResolution', async (_event, resolution: number) => {
        setThumbnailResolution(resolution);
        return;
    });

    // === Set Scan File Type Categories (profile-scoped) ===
    ipcMain.handle('scanner:setFileTypeCategories', async (_event, filters: { video?: boolean; image?: boolean; archive?: boolean; audio?: boolean }) => {
        setScanFileTypeCategories(filters || {});
        return;
    });

    ipcMain.handle('scanner:setExclusionRules', async (_event, rules) => {
        setScanExclusionRules(rules);
        return;
    });

    // === Auto Scan (all folders) ===
    ipcMain.handle('scanner:autoScan', async (event) => {
        const folders = getAutoScanFolders();
        if (folders.length === 0) return;
        const cancellationToken = createScanCancellationToken();
        const runtimeSettings = getCurrentScanRuntimeSettings();
        const releaseToken = trackInteractiveScanToken(cancellationToken);

        try {
            for (const folder of folders) {
                if (isScanCancelled(cancellationToken)) {
                    break;
                }

                // 起動時自動スキャンはフォルダごとに順次実行
                await scanDirectory(
                    folder.path,
                    folder.id,
                    (progress) => {
                        event.sender.send('scanner:progress', {
                            ...progress,
                            folderName: folder.name || folder.path.split(/[\\/]/).pop()
                        });
                    },
                    (payload) => {
                        sendScanBatchCommitted(event, payload);
                    },
                    {
                        runtimeSettings,
                        cancellationToken,
                    }
                ).then(async () => {
                    if (isScanCancelled(cancellationToken)) {
                        return;
                    }

                    const result = await runAutoOrganizeForScan({
                        triggerSource: 'startup_scan',
                        rootFolderId: folder.id,
                        scanPath: folder.path,
                    });
                    if (result?.success && result.appliedCount > 0) {
                        event.sender.send('ui:showToast', {
                            message: `${folder.name} の自動整理を実行しました（処理 ${result.appliedCount} 件）`,
                            type: 'success',
                            duration: 3500,
                        });
                    } else if (result && !result.success) {
                        event.sender.send('ui:showToast', {
                            message: `${folder.name} の自動整理に失敗しました: ${result.error ?? 'unknown error'}`,
                            type: 'error',
                            duration: 5000,
                        });
                    }
                }).catch(err => {
                    console.error(`Auto scan error for ${folder.path}:`, err);
                });
            }
        } finally {
            releaseToken();
        }

        return;
    });
}
