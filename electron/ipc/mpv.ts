import { BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { mpvService, isMpvAvailable } from '../services/mpvService';
import { logger } from '../services/logger';

let videoWindow: BrowserWindow | null = null;
let openGeneration = 0;

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
        // このリクエスト専用の世代番号。後続リクエストが来たら isSuperseded() が true になる
        const myGen = ++openGeneration;
        const isSuperseded = () => openGeneration !== myGen;

        if (!isMpvAvailable()) {
            return { success: false, error: 'mpv が見つかりません。resources/mpv/mpv.exe を配置してください。' };
        }

        // 既存ウィンドウをクリーンアップ
        if (videoWindow && !videoWindow.isDestroyed()) {
            mpvService.quit();
            videoWindow.close();
            videoWindow = null;
        }

        // ウィンドウはローカル変数で管理し、確定後のみ module-level に昇格する
        const win = createVideoWindow();

        // ready-to-show と closed の両方を待ち、先に来た方で解決する
        // closed が先なら後続リクエストに閉じられたとみなす
        const outcome = await new Promise<'ready' | 'closed'>((resolve) => {
            win.once('ready-to-show', () => resolve('ready'));
            win.once('closed', () => resolve('closed'));
        });

        if (outcome === 'closed' || isSuperseded()) {
            if (!win.isDestroyed()) win.close();
            return { success: false, error: 'superseded' };
        }

        // 確定後のみ module-level に昇格
        videoWindow = win;

        // コールバックを win クロージャに固定して後続ウィンドウへの誤爆を防ぐ
        mpvService.setCallbacks({
            onTimePos: (sec) => {
                if (!win.isDestroyed()) win.webContents.send('mpv:timeUpdate', { currentTime: sec });
            },
            onDuration: (sec) => {
                if (!win.isDestroyed()) win.webContents.send('mpv:durationUpdate', { duration: sec });
            },
            onPause: (paused) => {
                if (!win.isDestroyed()) win.webContents.send('mpv:pauseChange', { paused });
            },
            onEnded: () => {
                if (!win.isDestroyed()) win.webContents.send('mpv:ended');
            },
            onError: (msg) => {
                logger.error('[mpv] error:', msg);
            },
        });

        const hwnd = win.getNativeWindowHandle().readUInt32LE(0);

        try {
            await mpvService.spawn(params.filePath, hwnd, params.startTime, params.volume);
        } catch (error) {
            logger.error('[mpv] Failed to spawn:', error);
            if (!win.isDestroyed()) win.close();
            if (videoWindow === win) { mpvService.quit(); videoWindow = null; }
            return { success: false, error: String(error) };
        }

        if (isSuperseded()) {
            win.close();
            return { success: false, error: 'superseded' };
        }

        win.show();
        win.webContents.send('mpv:fileContext', {
            fileId: params.fileId,
            fileName: params.fileName,
        });

        win.on('closed', () => {
            if (videoWindow === win) {
                mpvService.quit();
                videoWindow = null;
            }
        });

        return { success: true };
    });

    ipcMain.handle('mpv:close', () => {
        // openGeneration を進めて進行中の mpv:open をキャンセルする
        openGeneration++;
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
