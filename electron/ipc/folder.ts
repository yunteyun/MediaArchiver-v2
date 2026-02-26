import { ipcMain, Menu, shell, BrowserWindow, dialog } from 'electron';
import {
    clearFolderScanSettings,
    deleteFolder,
    getFolderById,
    getFolderFileCounts,
    getFolderThumbnails,
    setFolderAutoScanEnabled,
    setFolderScanFileTypeOverride,
    setFolderWatchNewFilesEnabled
} from '../services/database';
import { getScanFileTypeCategories, scanDirectory } from '../services/scanner';
import { syncFolderWatchers } from '../services/folderWatchService';

export function registerFolderHandlers() {
    ipcMain.handle('folder:setAutoScan', async (_event, { folderId, enabled }: { folderId: string; enabled: boolean }) => {
        setFolderAutoScanEnabled(folderId, enabled);
        return { success: true };
    });

    ipcMain.handle('folder:setWatchNewFiles', async (_event, { folderId, enabled }: { folderId: string; enabled: boolean }) => {
        setFolderWatchNewFilesEnabled(folderId, enabled);
        syncFolderWatchers();
        return { success: true };
    });

    ipcMain.handle(
        'folder:setScanFileTypeOverrides',
        async (
            _event,
            {
                folderId,
                overrides
            }: {
                folderId: string;
                overrides: Partial<Record<'video' | 'image' | 'archive' | 'audio', boolean | null>>;
            }
        ) => {
            for (const key of ['video', 'image', 'archive', 'audio'] as const) {
                if (Object.prototype.hasOwnProperty.call(overrides, key)) {
                    const value = overrides[key];
                    setFolderScanFileTypeOverride(folderId, key, value ?? null);
                }
            }
            return { success: true };
        }
    );

    ipcMain.handle('folder:clearScanFileTypeOverrides', async (_event, { folderId }: { folderId: string }) => {
        clearFolderScanSettings(folderId);
        return { success: true };
    });

    ipcMain.handle('folder:showContextMenu', async (event, { folderId, path }) => {
        const folderFileCounts = getFolderFileCounts();
        const registeredFileCount = folderFileCounts[folderId] || 0;
        const folder = getFolderById(folderId);
        const folderOverrides = folder ? (() => {
            try {
                const parsed = folder.scan_settings_json ? JSON.parse(folder.scan_settings_json) : null;
                const overrides = parsed?.fileTypeOverrides;
                return (overrides && typeof overrides === 'object') ? overrides as Record<string, unknown> : {};
            } catch {
                return {};
            }
        })() : {};
        const profileDefaults = getScanFileTypeCategories();
        const categories = [
            { key: 'video', label: '動画', defaultValue: profileDefaults.video },
            { key: 'image', label: '画像', defaultValue: profileDefaults.image },
            { key: 'archive', label: '書庫', defaultValue: profileDefaults.archive },
            { key: 'audio', label: '音声', defaultValue: profileDefaults.audio },
        ] as const;
        const hasOverrides = categories.some(({ key }) => typeof folderOverrides[key] === 'boolean');
        const autoScanEnabled = folder?.auto_scan === 1;
        const watchNewFilesEnabled = folder?.watch_new_files === 1;

        const menu = Menu.buildFromTemplate([
            {
                label: '再スキャン',
                click: async () => {
                    // Start scan
                    // Note: scanDirectory might take time, we might want to notify start/end or progress
                    // But here we just trigger it. The existing scanner logic sends progress via webContents if set up?
                    // actually scanDirectory takes onProgress callback.
                    // We can reuse the existing IPC mechanism for progress if we hook it up, 
                    // or just fire a completion event.

                    // Ideally we should send 'scanner:progress' events.
                    // The scanDirectory function takes an onProgress callback.

                    // We can just rely on the existing mechanism if we want, or simple fire-and-forget 
                    // with a completion event.
                    // Let's implement a simple wrapper that sends events to the sender.

                    try {
                        const webContents = event.sender;
                        await scanDirectory(path, folderId, (progress) => {
                            webContents.send('scanner:progress', progress);
                        });
                        webContents.send('folder:rescanComplete', folderId);
                    } catch (e) {
                        console.error('Rescan failed:', e);
                    }
                }
            },
            {
                label: '自動スキャン設定（このフォルダ）',
                submenu: [
                    {
                        label: '起動時スキャン',
                        type: 'checkbox',
                        checked: autoScanEnabled,
                        click: async () => {
                            setFolderAutoScanEnabled(folderId, !autoScanEnabled);
                        }
                    },
                    {
                        label: '起動中新規ファイルスキャン',
                        type: 'checkbox',
                        checked: watchNewFilesEnabled,
                        click: async () => {
                            setFolderWatchNewFilesEnabled(folderId, !watchNewFilesEnabled);
                            syncFolderWatchers();
                        }
                    }
                ]
            },
            {
                label: 'スキャン対象（このフォルダ）',
                submenu: [
                    ...categories.map(({ key, label, defaultValue }) => {
                        const effectiveValue =
                            typeof folderOverrides[key] === 'boolean'
                                ? Boolean(folderOverrides[key])
                                : defaultValue;
                        return {
                            label,
                            type: 'checkbox' as const,
                            checked: effectiveValue,
                            click: async () => {
                                await setFolderScanFileTypeOverride(folderId, key, !effectiveValue);
                            }
                        };
                    }),
                    { type: 'separator' as const },
                    {
                        label: 'プロファイル既定に戻す',
                        enabled: hasOverrides,
                        click: async () => {
                            clearFolderScanSettings(folderId);
                        }
                    }
                ]
            },
            { type: 'separator' },
            {
                label: 'エクスプローラーで開く',
                click: async () => {
                    await shell.openPath(path);
                }
            },
            { type: 'separator' },
            {
                label: '削除',
                click: async () => {
                    const win = BrowserWindow.fromWebContents(event.sender);
                    const result = await dialog.showMessageBox(win ?? undefined, {
                        type: 'warning',
                        title: '登録フォルダの登録解除',
                        message: 'この登録フォルダを登録解除しますか？',
                        detail:
                            `${path}\n\n` +
                            `登録済みファイル: ${registeredFileCount}件\n` +
                            '元ファイル本体は削除しません。\n' +
                            'このアプリのDB登録情報と関連サムネイル/プレビューは削除されます。',
                        buttons: ['キャンセル', '登録解除する'],
                        defaultId: 0,
                        cancelId: 0,
                        noLink: true,
                        checkboxLabel: '内容を理解しました（元ファイル本体は削除されず、登録情報とサムネイル/プレビューが削除されます）',
                        checkboxChecked: false,
                    });
                    if (result.response !== 1) {
                        return;
                    }
                    if (!result.checkboxChecked) {
                        await dialog.showMessageBox(win ?? undefined, {
                            type: 'info',
                            title: '確認チェックが必要です',
                            message: '登録解除を実行するには確認チェックを入れてください。',
                            buttons: ['OK'],
                            defaultId: 0,
                            cancelId: 0,
                            noLink: true,
                        });
                        return;
                    }
                    await deleteFolder(folderId);
                    syncFolderWatchers();
                    event.sender.send('folder:deleted', folderId);
                }
            }
        ]);

        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            menu.popup({ window: win });
        }
    });

    /**
     * フォルダメタデータ一括取得（Phase 12-4）
     * フォルダごとのファイル数とサムネイルパスを返す
     */
    ipcMain.handle('folder:getMetadata', async () => {
        const fileCounts = getFolderFileCounts();
        const thumbnails = getFolderThumbnails();
        return { fileCounts, thumbnails };
    });
}
