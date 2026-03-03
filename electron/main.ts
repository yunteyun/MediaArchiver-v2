import { app, BrowserWindow, protocol, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dbManager } from './services/databaseManager';
import { logger } from './services/logger';
import { registerMediaProtocol } from './protocol';
import { registerDatabaseHandlers } from './ipc/database';
import { registerScannerHandlers } from './ipc/scanner';
import { registerAppHandlers } from './ipc/app';
import { registerDialogHandlers } from './ipc/dialog';
import { registerFolderHandlers } from './ipc/folder';
import { registerFileHandlers } from './ipc/file';
import { registerArchiveHandlers } from './ipc/archive';
import { registerTagHandlers } from './ipc/tag';
import { registerProfileHandlers } from './ipc/profile';
import { registerProfileSettingsHandlers } from './ipc/profileSettings';
import { registerDuplicateHandlers } from './ipc/duplicate';
import { registerBackupHandlers } from './ipc/backup';
import { registerStatisticsHandlers } from './ipc/statistics';
import { registerActivityLogHandlers } from './ipc/activityLog';
import { registerThumbnailCleanupHandlers } from './ipc/thumbnailCleanup';
import { pruneOldLogs } from './services/activityLogService';
import { initStorageConfig } from './services/storageConfig';
import { registerStorageHandlers } from './ipc/storage';
import { registerRatingHandlers } from './ipc/rating';
import { registerSearchHandlers } from './ipc/search';
import { syncFolderWatchers, stopAllFolderWatchers } from './services/folderWatchService';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Register custom protocol scheme BEFORE app.whenReady()
protocol.registerSchemesAsPrivileged([
    { scheme: 'media', privileges: { stream: true, supportFetchAPI: true } }
]);

// Note: electron-squirrel-startup removed (not needed for dir build)

let mainWindow: BrowserWindow | null = null;

function getDevWindowIconPath(): string | undefined {
    if (!process.env.VITE_DEV_SERVER_URL) return undefined;

    const candidate = path.resolve(__dirname, '../build/icons/dev-icon.png');
    return fs.existsSync(candidate) ? candidate : undefined;
}

function formatMarkerTimestamp(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function getBuildMarker(): string {
    const runtime = app.isPackaged ? 'release' : 'dev';
    const version = app.getVersion();
    const exePath = app.getPath('exe');

    let exeMtime = 'unknown';
    try {
        exeMtime = formatMarkerTimestamp(fs.statSync(exePath).mtime);
    } catch {
        // Keep fallback marker when stat fails.
    }

    return [
        `v${version}`,
        `runtime=${runtime}`,
        `exeMtime=${exeMtime}`,
        `electron=${process.versions.electron}`,
        `chrome=${process.versions.chrome}`,
        `node=${process.versions.node}`,
    ].join(' | ');
}

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        icon: getDevWindowIconPath(),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true, // ✅ SECURE: media:// プロトコルでローカルファイルに安全にアクセス
        },
        backgroundColor: '#0f172a',
        show: false,
    });

    // Load the app
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });

    // Open DevTools in development
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.webContents.openDevTools();
    }

    // テキスト入力系では OS 標準に近い編集メニューを使えるようにする
    mainWindow.webContents.on('context-menu', (_event, params) => {
        if (!params.isEditable) return;

        const menu = Menu.buildFromTemplate([
            { role: 'undo', label: '元に戻す' },
            { role: 'redo', label: 'やり直す' },
            { type: 'separator' },
            { role: 'cut', label: '切り取り' },
            { role: 'copy', label: 'コピー' },
            { role: 'paste', label: '貼り付け' },
            { role: 'selectAll', label: 'すべて選択' },
        ]);

        menu.popup({ window: mainWindow ?? undefined });
    });
};

app.whenReady().then(async () => {
    logger.info('MediaArchiver starting...');
    logger.info(`Build marker: ${getBuildMarker()}`);

    // Phase 25: ストレージ設定を最初に初期化（二段階ロード）
    await initStorageConfig();
    logger.info('Storage config initialized');

    // Register custom protocol handler
    registerMediaProtocol();
    logger.info('Custom protocol (media://) registered');

    // Initialize Database Manager (loads active profile)
    dbManager.initialize();
    logger.info('Database initialized');

    // Register IPC Handlers
    registerDatabaseHandlers();
    registerScannerHandlers();
    registerAppHandlers();
    registerDialogHandlers();
    registerFolderHandlers();
    registerFileHandlers();
    registerArchiveHandlers();
    registerTagHandlers();
    registerProfileHandlers();
    registerProfileSettingsHandlers();
    registerDuplicateHandlers();
    registerBackupHandlers();
    registerStatisticsHandlers();
    registerActivityLogHandlers();
    registerThumbnailCleanupHandlers();
    registerStorageHandlers();
    registerRatingHandlers();
    registerSearchHandlers();
    logger.info('IPC handlers registered');

    // 古いアクティビティログを削除（30日以上前）
    pruneOldLogs(30);

    createWindow();
    logger.info('Main window created');
    syncFolderWatchers();
    logger.info('Folder watchers synced');

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    logger.info('All windows closed');
    stopAllFolderWatchers();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

