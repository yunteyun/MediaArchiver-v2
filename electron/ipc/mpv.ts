import { BrowserWindow, ipcMain, app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { mpvService, isMpvAvailable } from '../services/mpvService';
import { logger } from '../services/logger';

let videoWindow: BrowserWindow | null = null;

function resolvePreloadPath(): string {
    const candidates = [
        path.join(__dirname, 'preload.js'),
        path.join(process.resourcesPath, 'dist-electron', 'preload.js'),
    ];
    return candidates.find(fs.existsSync) ?? candidates[0]!;
}

function resolveIndexPath(): string | null {
    const candidates = [
        path.join(__dirname, '../dist/index.html'),
        path.join(process.resourcesPath, 'dist/index.html'),
    ];
    return candidates.find(fs.existsSync) ?? null;
}

function createVideoWindow(): BrowserWindow {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        hasShadow: false,
        show: false,
        webPreferences: {
            preload: resolvePreloadPath(),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true,
        },
    });

    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    if (devServerUrl) {
        void win.loadURL(`${devServerUrl}#mpv-window`);
    } else {
        const indexPath = resolveIndexPath();
        if (indexPath) {
            void win.loadFile(indexPath, { hash: 'mpv-window' });
        }
    }

    return win;
}

export function registerMpvHandlers(): void {
    ipcMain.handle('mpv:open', async (_event, params: {
        fileId: string;
        filePath: string;
        fileName: string;
        startTime: number | null;
        volume: number;
    }) => {
        try {
            if (!isMpvAvailable()) {
                return { success: false, error: 'mpv が見つかりません。resources/mpv/mpv.exe を配置してください。' };
            }

            // 既存ウィンドウを閉じる
            if (videoWindow && !videoWindow.isDestroyed()) {
                mpvService.quit();
                videoWindow.close();
                videoWindow = null;
            }

            videoWindow = createVideoWindow();

            // ウィンドウ準備待ち
            await new Promise<void>((resolve) => {
                videoWindow!.once('ready-to-show', resolve);
            });

            // mpv へのコールバックを設定
            mpvService.setCallbacks({
                onTimePos: (sec) => {
                    if (videoWindow && !videoWindow.isDestroyed()) {
                        videoWindow.webContents.send('mpv:timeUpdate', { currentTime: sec });
                    }
                },
                onDuration: (sec) => {
                    if (videoWindow && !videoWindow.isDestroyed()) {
                        videoWindow.webContents.send('mpv:durationUpdate', { duration: sec });
                    }
                },
                onPause: (paused) => {
                    if (videoWindow && !videoWindow.isDestroyed()) {
                        videoWindow.webContents.send('mpv:pauseChange', { paused });
                    }
                },
                onEnded: () => {
                    if (videoWindow && !videoWindow.isDestroyed()) {
                        videoWindow.webContents.send('mpv:ended');
                    }
                },
                onError: (msg) => {
                    logger.error('[mpv] error:', msg);
                },
            });

            // HWND を取得して mpv を起動
            const hwnd = videoWindow.getNativeWindowHandle().readUInt32LE(0);
            await mpvService.spawn(params.filePath, hwnd, params.startTime, params.volume);

            videoWindow.show();

            // ファイルコンテキストをレンダラーへ送信
            videoWindow.webContents.send('mpv:fileContext', {
                fileId: params.fileId,
                fileName: params.fileName,
            });

            videoWindow.on('closed', () => {
                mpvService.quit();
                videoWindow = null;
            });

            return { success: true };
        } catch (error) {
            logger.error('[mpv] Failed to open:', error);
            if (videoWindow && !videoWindow.isDestroyed()) {
                videoWindow.close();
                videoWindow = null;
            }
            mpvService.quit();
            return { success: false, error: String(error) };
        }
    });

    ipcMain.handle('mpv:close', () => {
        mpvService.quit();
        if (videoWindow && !videoWindow.isDestroyed()) {
            videoWindow.close();
            videoWindow = null;
        }
    });

    ipcMain.handle('mpv:pause', () => {
        mpvService.command(['cycle', 'pause']);
    });

    ipcMain.handle('mpv:seek', (_event, { positionSec }: { positionSec: number }) => {
        mpvService.command(['set_property', 'time-pos', positionSec]);
    });

    ipcMain.handle('mpv:setVolume', (_event, { volume }: { volume: number }) => {
        mpvService.command(['set_property', 'volume', Math.round(volume * 100)]);
    });

    ipcMain.handle('mpv:isAvailable', () => isMpvAvailable());
}
