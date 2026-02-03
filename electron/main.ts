import { app, BrowserWindow } from 'electron';
import path from 'path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dbManager } from './services/databaseManager';
import { logger } from './services/logger';
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

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false, // Allow loading local resources (file://) in dev mode
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

app.whenReady().then(() => {
    logger.info('MediaArchiver starting...');

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
    logger.info('IPC handlers registered');

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

