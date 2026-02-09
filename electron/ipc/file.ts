import { ipcMain, Menu, shell, BrowserWindow, dialog } from 'electron';
import { deleteFile, findFileById, updateFileThumbnail, updateFilePreviewFrames } from '../services/database';
import { generateThumbnail, generatePreviewFrames } from '../services/thumbnail';
import { getPreviewFrameCount } from '../services/scanner';
import path from 'path';
import { spawn } from 'child_process';
import { getCachedExternalApps } from './app';

export function registerFileHandlers() {
    ipcMain.handle('file:showContextMenu', async (event, { fileId, filePath }) => {
        const ext = path.extname(filePath).toLowerCase().substring(1);
        const cachedApps = getCachedExternalApps();

        // 対応する外部アプリをフィルタリング
        const compatibleApps = cachedApps.filter(app =>
            app.extensions.length === 0 || app.extensions.includes(ext)
        );

        // メニューテンプレートを動的に構築
        const menuTemplate: Electron.MenuItemConstructorOptions[] = [
            {
                label: 'デフォルトアプリで開く',
                click: async () => {
                    await shell.openPath(filePath);
                }
            },
        ];

        // 登録済み外部アプリを追加
        if (compatibleApps.length > 0) {
            menuTemplate.push({ type: 'separator' });
            for (const app of compatibleApps) {
                menuTemplate.push({
                    label: `${app.name}で開く`,
                    click: async () => {
                        try {
                            const child = spawn(path.resolve(app.path), [path.resolve(filePath)], {
                                detached: true,
                                stdio: 'ignore'
                            });
                            child.unref();
                        } catch (e) {
                            console.error('Failed to open with app:', e);
                        }
                    }
                });
            }
        }

        // 既存のメニュー項目を追加
        menuTemplate.push(
            { type: 'separator' },
            {
                label: 'エクスプローラーで表示',
                click: async () => {
                    shell.showItemInFolder(filePath);
                }
            },
            { type: 'separator' },
            {
                label: 'サムネイル再作成',
                click: async () => {
                    try {
                        const file = findFileById(fileId);
                        if (!file) return;

                        // サムネイル生成
                        const thumbnailPath = await generateThumbnail(filePath);
                        if (thumbnailPath) {
                            updateFileThumbnail(fileId, thumbnailPath);
                        }

                        // 動画ファイルの場合はプレビューフレームも再生成
                        const fileExt = path.extname(filePath).toLowerCase();
                        const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.webm', '.flv', '.m4v', '.mpeg', '.mpg', '.3gp'];
                        if (videoExts.includes(fileExt)) {
                            const frameCount = getPreviewFrameCount();
                            if (frameCount > 0) {
                                const previewFrames = await generatePreviewFrames(filePath, frameCount);
                                if (previewFrames) {
                                    updateFilePreviewFrames(fileId, previewFrames);
                                }
                            }
                        }

                        // 完了を通知
                        event.sender.send('file:thumbnailRegenerated', fileId);
                    } catch (e) {
                        console.error('Failed to regenerate thumbnail:', e);
                    }
                }
            },
            { type: 'separator' },
            {
                label: 'ファイルを削除',
                click: async () => {
                    // 確認ダイアログ
                    const { response } = await dialog.showMessageBox({
                        type: 'warning',
                        title: 'ファイルの削除',
                        message: 'このファイルを削除しますか？',
                        detail: filePath,
                        buttons: [
                            'ゴミ箱に移動',      // index: 0
                            '完全に削除',        // index: 1
                            'キャンセル'         // index: 2
                        ],
                        defaultId: 0,         // デフォルト: ゴミ箱に移動
                        cancelId: 2,          // ESC キー: キャンセル
                        noLink: true
                    });

                    // キャンセルの場合
                    if (response === 2) {
                        return;
                    }

                    // 完全削除を選択した場合は二重確認
                    if (response === 1) {
                        const { response: confirmResponse } = await dialog.showMessageBox({
                            type: 'warning',
                            title: '完全削除の確認',
                            message: '本当に完全に削除しますか？',
                            detail: 'この操作は取り消せません。ファイルはゴミ箱に移動せず、完全に削除されます。',
                            buttons: ['完全に削除', 'キャンセル'],
                            defaultId: 1,  // デフォルト: キャンセル
                            cancelId: 1
                        });

                        if (confirmResponse === 1) {
                            return;
                        }
                    }

                    try {
                        const { deleteFileSafe } = await import('../services/fileOperationService');

                        // 削除実行
                        const moveToTrash = response === 0;
                        const result = await deleteFileSafe(filePath, moveToTrash);

                        if (!result.success) {
                            // エラーダイアログ
                            await dialog.showMessageBox({
                                type: 'error',
                                title: '削除エラー',
                                message: '削除に失敗しました',
                                detail: result.error || '不明なエラー'
                            });
                            return;
                        }

                        // DB からファイル情報を削除
                        deleteFile(fileId);

                        // Notify renderer
                        event.sender.send('file:deleted', fileId);
                    } catch (e) {
                        console.error('Failed to delete file:', e);
                        await dialog.showMessageBox({
                            type: 'error',
                            title: '削除エラー',
                            message: '削除に失敗しました',
                            detail: e instanceof Error ? e.message : String(e)
                        });
                    }
                }
            }
        );

        const menu = Menu.buildFromTemplate(menuTemplate);

        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            menu.popup({ window: win });
        }
    });
}
