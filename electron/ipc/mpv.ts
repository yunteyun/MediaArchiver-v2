import { BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { mpvService, isMpvAvailable } from '../services/mpvService';
import { logger } from '../services/logger';

let videoWindow: BrowserWindow | null = null;
let openGeneration = 0;
let embeddedRect: { x: number; y: number; width: number; height: number } | null = null;
let isEmbeddedMode = false;

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

function createSeparateVideoWindow(): BrowserWindow {
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
        if (indexPath) void win.loadFile(indexPath, { hash: 'mpv-window' });
    }

    return win;
}

function createEmbeddedWindow(
    parent: BrowserWindow,
    rect: { x: number; y: number; width: number; height: number },
): BrowserWindow {
    const contentBounds = parent.getContentBounds();
    const win = new BrowserWindow({
        x: contentBounds.x + rect.x,
        y: contentBounds.y + rect.y,
        width: rect.width,
        height: rect.height,
        parent,
        frame: false,
        transparent: true,       // Chromium 層を透過させて mpv の描画を見せる
        backgroundColor: '#00000000',
        hasShadow: false,
        show: false,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    // 透明な空ページ: Chromium レイヤーが mpv の描画を隠さないようにする
    void win.loadURL('data:text/html,<html style="background:transparent"><body style="margin:0;background:transparent;overflow:hidden"></body></html>');
    return win;
}

export function registerMpvHandlers(getMainWindow: () => BrowserWindow | null): void {
    ipcMain.handle('mpv:open', async (_event, params: {
        fileId: string;
        filePath: string;
        fileName: string;
        startTime: number | null;
        volume: number;
        embedded: boolean;
        videoRect: { x: number; y: number; width: number; height: number } | null;
    }) => {
        const myGen = ++openGeneration;
        const isSuperseded = () => openGeneration !== myGen;

        if (!isMpvAvailable()) {
            return { success: false, error: 'mpv が見つかりません。resources/mpv/mpv.exe を配置してください。' };
        }

        if (videoWindow && !videoWindow.isDestroyed()) {
            mpvService.quit();
            videoWindow.close();
            videoWindow = null;
        }

        const mainWindow = getMainWindow();
        const useEmbedded = params.embedded && params.videoRect != null && mainWindow != null && !mainWindow.isDestroyed();

        isEmbeddedMode = useEmbedded;
        embeddedRect = params.videoRect;

        const win = useEmbedded
            ? createEmbeddedWindow(mainWindow!, params.videoRect!)
            : createSeparateVideoWindow();

        const outcome = await new Promise<'ready' | 'closed'>((resolve) => {
            win.once('ready-to-show', () => resolve('ready'));
            win.once('closed', () => resolve('closed'));
        });

        if (outcome === 'closed' || isSuperseded()) {
            if (!win.isDestroyed()) win.close();
            return { success: false, error: 'superseded' };
        }

        videoWindow = win;

        // イベント送信先: 埋め込みモードはメインウィンドウ、別ウィンドウモードはビデオウィンドウ
        const sendTarget = () => useEmbedded ? getMainWindow() : win;

        mpvService.setCallbacks({
            onTimePos: (sec) => {
                const target = sendTarget();
                if (target && !target.isDestroyed()) target.webContents.send('mpv:timeUpdate', { currentTime: sec });
            },
            onDuration: (sec) => {
                const target = sendTarget();
                if (target && !target.isDestroyed()) target.webContents.send('mpv:durationUpdate', { duration: sec });
            },
            onPause: (paused) => {
                const target = sendTarget();
                if (target && !target.isDestroyed()) target.webContents.send('mpv:pauseChange', { paused });
            },
            onEnded: () => {
                const target = sendTarget();
                if (target && !target.isDestroyed()) target.webContents.send('mpv:ended');
            },
            onError: (msg) => logger.error('[mpv] error:', msg),
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

        if (!useEmbedded) {
            // 別ウィンドウモード: ファイルコンテキストをビデオウィンドウのレンダラーへ
            win.webContents.send('mpv:fileContext', {
                fileId: params.fileId,
                fileName: params.fileName,
            });
        }

        // 埋め込みモード: メインウィンドウの移動・リサイズに追従
        if (useEmbedded && mainWindow) {
            const reposition = () => {
                if (!videoWindow || videoWindow.isDestroyed() || !embeddedRect) return;
                const cb = mainWindow.getContentBounds();
                videoWindow.setBounds({
                    x: cb.x + embeddedRect.x,
                    y: cb.y + embeddedRect.y,
                    width: embeddedRect.width,
                    height: embeddedRect.height,
                });
            };
            mainWindow.on('move', reposition);
            mainWindow.on('resize', reposition);

            win.on('closed', () => {
                mainWindow.off('move', reposition);
                mainWindow.off('resize', reposition);
            });
        }

        win.on('closed', () => {
            if (videoWindow === win) {
                mpvService.quit();
                videoWindow = null;
            }
        });

        return { success: true, embedded: useEmbedded };
    });

    ipcMain.handle('mpv:close', () => {
        openGeneration++;
        mpvService.quit();
        if (videoWindow && !videoWindow.isDestroyed()) {
            videoWindow.close();
            videoWindow = null;
        }
    });

    ipcMain.handle('mpv:resize', (_event, rect: { x: number; y: number; width: number; height: number }) => {
        embeddedRect = rect;
        if (!videoWindow || videoWindow.isDestroyed() || !isEmbeddedMode) return;
        const mainWindow = getMainWindow();
        if (!mainWindow || mainWindow.isDestroyed()) return;
        const cb = mainWindow.getContentBounds();
        videoWindow.setBounds({
            x: cb.x + rect.x,
            y: cb.y + rect.y,
            width: rect.width,
            height: rect.height,
        });
    });

    ipcMain.handle('mpv:pause', () => { mpvService.command(['cycle', 'pause']); });
    ipcMain.handle('mpv:seek', (_event, { positionSec }: { positionSec: number }) => {
        mpvService.command(['set_property', 'time-pos', positionSec]);
    });
    ipcMain.handle('mpv:setVolume', (_event, { volume }: { volume: number }) => {
        mpvService.command(['set_property', 'volume', Math.round(volume * 100)]);
    });
    ipcMain.handle('mpv:isAvailable', () => isMpvAvailable());
}
