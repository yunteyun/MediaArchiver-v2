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

                            // ✅ 設定が0の場合はスキップ
                            if (frameCount === 0) {
                                console.log('[Thumbnail Regeneration] Preview frame count is 0, skipping generation');
                            } else {
                                // ✅ 既存のプレビューフレーム数を確認
                                const existingFrames = file.preview_frames?.split(',').filter(Boolean) || [];

                                // ✅ 既に設定値と同じ数のフレームがある場合はスキップ
                                if (existingFrames.length === frameCount) {
                                    console.log(`[Thumbnail Regeneration] Preview frames already exist (${frameCount} frames), skipping regeneration`);
                                } else {
                                    console.log(`[Thumbnail Regeneration] Regenerating preview frames (existing: ${existingFrames.length}, target: ${frameCount})`);
                                    const previewFrames = await generatePreviewFrames(filePath, frameCount);
                                    if (previewFrames) {
                                        updateFilePreviewFrames(fileId, previewFrames);
                                    }
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
                    // Rendererにダイアログ表示を通知（Phase 12-17B）
                    event.sender.send('file:showDeleteDialog', { fileId, filePath });
                }
            }
        );

        const menu = Menu.buildFromTemplate(menuTemplate);

        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            menu.popup({ window: win });
        }
    });

    // === File Delete Confirmation Handler (Phase 12-17B) ===
    ipcMain.handle('file:confirmDelete', async (event, { fileId, filePath, permanentDelete }) => {
        // 完全削除の場合は二重確認
        if (permanentDelete) {
            const { response } = await dialog.showMessageBox({
                type: 'warning',
                title: '完全削除の確認',
                message: '本当に完全に削除しますか？',
                detail: 'この操作は取り消せません。ファイルはゴミ箱に移動せず、完全に削除されます。',
                buttons: ['完全に削除', 'キャンセル'],
                defaultId: 1,  // デフォルト: キャンセル
                cancelId: 1
            });

            if (response === 1) {
                return { success: false, cancelled: true };
            }
        }

        try {
            const { deleteFileSafe } = await import('../services/fileOperationService');

            // 削除実行
            const moveToTrash = !permanentDelete;
            const result = await deleteFileSafe(filePath, moveToTrash);

            if (!result.success) {
                return { success: false, error: result.error };
            }

            // DB削除
            deleteFile(fileId);
            event.sender.send('file:deleted', fileId);

            return { success: true };
        } catch (e) {
            console.error('Failed to delete file:', e);
            return {
                success: false,
                error: e instanceof Error ? e.message : String(e)
            };
        }
    });
}
