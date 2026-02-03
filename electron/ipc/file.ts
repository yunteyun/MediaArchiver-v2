import { ipcMain, Menu, shell, BrowserWindow, dialog } from 'electron';
import { deleteFile, findFileById, updateFileThumbnail, updateFilePreviewFrames } from '../services/database';
import { generateThumbnail, generatePreviewFrames } from '../services/thumbnail';
import { getPreviewFrameCount } from '../services/scanner';
import fs from 'fs';
import path from 'path';

export function registerFileHandlers() {
    ipcMain.handle('file:showContextMenu', async (event, { fileId, filePath }) => {
        const menu = Menu.buildFromTemplate([
            {
                label: '外部アプリで開く',
                click: async () => {
                    await shell.openPath(filePath);
                }
            },
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
                        const ext = path.extname(filePath).toLowerCase();
                        const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.webm', '.flv', '.m4v', '.mpeg', '.mpg', '.3gp'];
                        if (videoExts.includes(ext)) {
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
                    const result = await dialog.showMessageBox({
                        type: 'warning',
                        buttons: ['削除', 'キャンセル'],
                        defaultId: 1,
                        title: 'ファイル削除の確認',
                        message: 'このファイルをディスクから削除しますか？',
                        detail: '削除したファイルは復元できません。',
                    });

                    if (result.response === 0) {
                        try {
                            // Delete from filesystem
                            await fs.promises.unlink(filePath);
                            // Delete from database
                            deleteFile(fileId);
                            // Notify renderer
                            event.sender.send('file:deleted', fileId);
                        } catch (e) {
                            console.error('Failed to delete file:', e);
                        }
                    }
                }
            }
        ]);

        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            menu.popup({ window: win });
        }
    });
}
