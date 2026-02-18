import { app, BrowserWindow, protocol } from 'electron';
import path from 'path';
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
import { registerDuplicateHandlers } from './ipc/duplicate';
import { registerBackupHandlers } from './ipc/backup';
import { registerStatisticsHandlers } from './ipc/statistics';
import { registerActivityLogHandlers } from './ipc/activityLog';
import { registerThumbnailCleanupHandlers } from './ipc/thumbnailCleanup';
import { pruneOldLogs } from './services/activityLogService';
import { initStorageConfig } from './services/storageConfig';
import { registerStorageHandlers } from './ipc/storage';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Register custom protocol scheme BEFORE app.whenReady()
protocol.registerSchemesAsPrivileged([
    { scheme: 'media', privileges: { stream: true, supportFetchAPI: true } }
]);

// Note: electron-squirrel-startup removed (not needed for dir build)

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
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
};

app.whenReady().then(async () => {
    logger.info('MediaArchiver starting...');

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
    registerDuplicateHandlers();
    registerBackupHandlers();
    registerStatisticsHandlers();
    registerActivityLogHandlers();
    registerThumbnailCleanupHandlers();
    registerStorageHandlers();
    logger.info('IPC handlers registered');

    // 古いアクティビティログを削除（30日以上前）
    pruneOldLogs(30);

    createWindow();
    logger.info('Main window created');

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    logger.info('All windows closed');
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

