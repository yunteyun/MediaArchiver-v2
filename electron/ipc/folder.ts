import { ipcMain, Menu, shell, BrowserWindow, dialog } from 'electron';
import {
    clearFolderScanFileTypeOverrides,
    deleteFolder,
    getFolderById,
    getFolderFileCounts,
    getFolderTreePaths,
    getFolderTreeRecursiveCountsByPath,
    getFolderThumbnails,
    setFolderAutoScanEnabled,
    setFolderBadgeColor,
    setFolderExcludedSubdirectories,
    setFolderScanFileTypeOverride,
    setFolderShallowScan,
    setFolderWatchNewFilesEnabled
} from '../services/database';
import { getScanFileTypeCategories } from '../services/scanner';
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

    ipcMain.handle('folder:setBadgeColor', async (event, { folderId, color }: { folderId: string; color: string | null }) => {
        setFolderBadgeColor(folderId, color);
        event.sender.send('folder:updated', folderId);
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
        clearFolderScanFileTypeOverrides(folderId);
        return { success: true };
    });

    ipcMain.handle(
        'folder:setExcludedSubdirectories',
        async (
            _event,
            {
                folderId,
                excludedSubdirectories
            }: {
                folderId: string;
                excludedSubdirectories: string[];
            }
        ) => {
            setFolderExcludedSubdirectories(folderId, excludedSubdirectories);
            return { success: true };
        }
    );

    ipcMain.handle(
        'folder:setShallowScan',
        async (
            _event,
            { folderId, enabled }: { folderId: string; enabled: boolean }
        ) => {
            setFolderShallowScan(folderId, enabled);
            return { success: true };
        }
    );

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
                click: () => {
                    // scanner:start IPC を経由してスキャンを実行する
                    // これにより件数カウント・キャンセルトークン管理が正しく行われる
                    event.sender.send('folder:triggerRescan', path);
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
                            clearFolderScanFileTypeOverrides(folderId);
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

    ipcMain.handle('folder:showVirtualFolderContextMenu', async (event, { path: folderPath }: { path: string }) => {
        const menu = Menu.buildFromTemplate([
            {
                label: 'エクスプローラーで開く',
                click: async () => {
                    await shell.openPath(folderPath);
                }
            },
            { type: 'separator' },
            {
                label: 'このフォルダを登録する',
                click: () => {
                    event.sender.send('folder:requestRegister', folderPath);
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

    ipcMain.handle('folder:getTreeStats', async (_event, options?: { includeDiskPaths?: boolean }) => {
        return {
            paths: getFolderTreePaths(options),
            recursiveCountsByPath: getFolderTreeRecursiveCountsByPath(),
        };
    });
}
