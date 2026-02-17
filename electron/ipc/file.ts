import { ipcMain, Menu, shell, BrowserWindow, dialog } from 'electron';
import { deleteFile, findFileById, updateFileThumbnail, updateFilePreviewFrames, incrementAccessCount, incrementExternalOpenCount, updateFileLocation, getFolders } from '../services/database';
import { generateThumbnail, generatePreviewFrames } from '../services/thumbnail';
import { getPreviewFrameCount, getThumbnailResolution } from '../services/scanner';
import path from 'path';
import { spawn } from 'child_process';
import { getCachedExternalApps } from './app';

export function registerFileHandlers() {
    ipcMain.handle('file:showContextMenu', async (event, { fileId, filePath, selectedFileIds }) => {
        // Bug 2修正: 複数選択対応
        const effectiveFileIds = selectedFileIds && selectedFileIds.length > 0 ? selectedFileIds : [fileId];
        const isMultiple = effectiveFileIds.length > 1;

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
                enabled: !isMultiple, // 複数選択時は無効
                click: async () => {
                    await shell.openPath(filePath);
                    const result = incrementExternalOpenCount(fileId);
                    event.sender.send('file:externalOpenCountUpdated', {
                        fileId,
                        externalOpenCount: result.externalOpenCount,
                        lastExternalOpenedAt: result.lastExternalOpenedAt,
                    });
                }
            },
        ];

        // 登録済み外部アプリを追加
        if (compatibleApps.length > 0) {
            menuTemplate.push({ type: 'separator' });
            for (const app of compatibleApps) {
                menuTemplate.push({
                    label: `${app.name}で開く`,
                    enabled: !isMultiple, // 複数選択時は無効
                    click: async () => {
                        try {
                            const child = spawn(path.resolve(app.path), [path.resolve(filePath)], {
                                detached: true,
                                stdio: 'ignore'
                            });
                            child.unref();

                            const result = incrementExternalOpenCount(fileId);
                            event.sender.send('file:externalOpenCountUpdated', {
                                fileId,
                                externalOpenCount: result.externalOpenCount,
                                lastExternalOpenedAt: result.lastExternalOpenedAt,
                            });
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
                enabled: !isMultiple, // 複数選択時は無効
                click: async () => {
                    shell.showItemInFolder(filePath);
                }
            },
            { type: 'separator' },
            {
                label: 'サムネイル再作成',
                enabled: !isMultiple, // 複数選択時は無効
                click: async () => {
                    try {
                        const file = findFileById(fileId);
                        if (!file) return;

                        // 開始通知
                        event.sender.send('scanner:progress', {
                            phase: 'scanning',
                            current: 0,
                            total: 1,
                            currentFile: path.basename(filePath),
                            message: 'サムネイル生成中...'
                        });

                        // サムネイル生成
                        const thumbnailPath = await generateThumbnail(filePath, getThumbnailResolution());
                        if (thumbnailPath) {
                            updateFileThumbnail(fileId, thumbnailPath);
                        }

                        // 動画ファイルの場合はプレビューフレームも再生成
                        const fileExt = path.extname(filePath).toLowerCase();
                        const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.webm', '.flv', '.m4v', '.mpeg', '.mpg', '.3gp'];
                        if (videoExts.includes(fileExt)) {
                            const frameCount = getPreviewFrameCount();

                            // 設定が0の場合はスキップ
                            if (frameCount === 0) {
                                console.log('[Thumbnail Regeneration] Preview frame count is 0, skipping generation');
                            } else {
                                // プレビューフレーム生成中の通知
                                event.sender.send('scanner:progress', {
                                    phase: 'scanning',
                                    current: 0,
                                    total: 1,
                                    currentFile: path.basename(filePath),
                                    message: 'プレビューフレーム生成中...'
                                });

                                console.log(`[Thumbnail Regeneration] Regenerating preview frames (target: ${frameCount} frames)`);
                                const previewFrames = await generatePreviewFrames(filePath, frameCount);
                                if (previewFrames) {
                                    updateFilePreviewFrames(fileId, previewFrames);
                                    console.log('[Thumbnail Regeneration] Preview frames regenerated successfully');
                                } else {
                                    console.log('[Thumbnail Regeneration] Preview frames generation failed');
                                }
                            }
                        }

                        // 完了通知
                        event.sender.send('scanner:progress', {
                            phase: 'complete',
                            current: 1,
                            total: 1,
                            message: 'サムネイル再生成完了'
                        });

                        // ファイル更新を通知
                        event.sender.send('file:thumbnailRegenerated', fileId);
                    } catch (e) {
                        console.error('Failed to regenerate thumbnail:', e);
                        // エラー通知
                        event.sender.send('scanner:progress', {
                            phase: 'error',
                            message: 'サムネイル再生成に失敗しました'
                        });
                    }
                }
            },
            { type: 'separator' },
            {
                label: 'フォルダに移動',
                submenu: getFolders().map(folder => ({
                    label: isMultiple ? `${folder.name} (${effectiveFileIds.length}件)` : folder.name,
                    click: async () => {
                        // Bug 2修正: 複数ファイルの移動
                        for (const id of effectiveFileIds) {
                            event.sender.send('file:requestMove', { fileId: id, targetFolderId: folder.id });
                        }
                    }
                }))
            },
            { type: 'separator' },
            {
                label: isMultiple ? `ファイルを削除 (${effectiveFileIds.length}件)` : 'ファイルを削除',
                click: async () => {
                    // Bug 2修正: 複数ファイルの削除
                    for (const id of effectiveFileIds) {
                        const file = findFileById(id);
                        if (file) {
                            event.sender.send('file:showDeleteDialog', { fileId: id, filePath: file.path });
                        }
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

    // Phase 17: アクセス回数をインクリメント
    ipcMain.handle('file:incrementAccessCount', async (_event, fileId: string) => {
        try {
            const result = incrementAccessCount(fileId);
            return {
                success: true,
                accessCount: result.accessCount,
                lastAccessedAt: result.lastAccessedAt
            };
        } catch (error) {
            console.error('Failed to increment access count:', error);
            return { success: false, error: String(error) };
        }
    });

    // 外部アプリ起動回数をインクリメント
    ipcMain.handle('file:incrementExternalOpenCount', async (_event, fileId: string) => {
        try {
            const result = incrementExternalOpenCount(fileId);
            return {
                success: true,
                externalOpenCount: result.externalOpenCount,
                lastExternalOpenedAt: result.lastExternalOpenedAt,
            };
        } catch (error) {
            console.error('Failed to increment external open count:', error);
            return { success: false, error: String(error) };
        }
    });

    // Phase 18-C: ファイル移動
    ipcMain.handle('file:moveToFolder', async (event, { fileId, targetFolderId }) => {
        try {
            console.log('[File Move] Starting file move:', { fileId, targetFolderId });

            // DBからファイル情報取得
            const file = findFileById(fileId);
            if (!file) {
                console.error('[File Move] File not found:', fileId);
                return { success: false, error: 'ファイルが見つかりません' };
            }
            console.log('[File Move] Source file:', file.path);

            // 移動先フォルダ情報取得
            const folders = getFolders();
            const targetFolder = folders.find(f => f.id === targetFolderId);
            if (!targetFolder) {
                console.error('[File Move] Target folder not found:', targetFolderId);
                return { success: false, error: '移動先フォルダが見つかりません' };
            }
            console.log('[File Move] Target folder:', targetFolder.path);

            // 新しいパスを生成
            const fileName = path.basename(file.path);
            const newPath = path.join(targetFolder.path, fileName);
            console.log('[File Move] New path:', newPath);

            // ファイル移動実行
            const { moveFileToFolder } = await import('../services/fileOperationService');
            const moveResult = await moveFileToFolder(file.path, newPath);
            console.log('[File Move] Move result:', moveResult);

            if (!moveResult.success) {
                console.error('[File Move] Move failed:', moveResult.error);
                return { success: false, error: moveResult.error };
            }

            // DB更新
            updateFileLocation(fileId, newPath, targetFolderId);
            console.log('[File Move] DB updated');

            // フロントエンドに通知
            event.sender.send('file:moved', { fileId, newPath, targetFolderId });

            return { success: true, newPath };
        } catch (error) {
            console.error('[File Move] Exception:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });
}
