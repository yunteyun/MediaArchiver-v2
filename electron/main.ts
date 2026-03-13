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
import { registerSmartFolderHandlers } from './ipc/smartFolder';
import { registerDisplayPresetHandlers } from './ipc/displayPreset';
import { registerAutoOrganizeHandlers } from './ipc/autoOrganize';
import { syncFolderWatchers, stopAllFolderWatchers } from './services/folderWatchService';
import { disposePreviewFrameWorker } from './services/previewFrameWorkerService';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Register custom protocol scheme BEFORE app.whenReady()
protocol.registerSchemesAsPrivileged([
    { scheme: 'media', privileges: { stream: true, supportFetchAPI: true } }
]);

// Note: electron-squirrel-startup removed (not needed for dir build)

let mainWindow: BrowserWindow | null = null;
const DEV_SERVER_WAIT_TIMEOUT_MS = 15_000;
const DEV_SERVER_PROBE_TIMEOUT_MS = 1_500;
const DEV_SERVER_RETRY_DELAY_MS = 750;
const DEV_SERVER_MAX_LOAD_ATTEMPTS = 5;

function syncBundledUpdaterScript(): void {
    if (!app.isPackaged) {
        return;
    }

    const bundledUpdaterPath = path.join(process.resourcesPath, 'support', 'update.bat');
    const targetUpdaterPath = path.join(path.dirname(app.getPath('exe')), 'update.bat');

    if (!fs.existsSync(bundledUpdaterPath)) {
        logger.warn(`[UpdaterSync] Bundled updater was not found: ${bundledUpdaterPath}`);
        return;
    }

    try {
        const bundledContent = fs.readFileSync(bundledUpdaterPath);
        const currentContent = fs.existsSync(targetUpdaterPath)
            ? fs.readFileSync(targetUpdaterPath)
            : null;

        if (currentContent && Buffer.compare(bundledContent, currentContent) === 0) {
            return;
        }

        fs.copyFileSync(bundledUpdaterPath, targetUpdaterPath);
        logger.info(`[UpdaterSync] Refreshed update.bat at ${targetUpdaterPath}`);
    } catch (error) {
        logger.warn('[UpdaterSync] Failed to refresh update.bat', error);
    }
}

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

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function isDevServerReachable(devServerUrl: string): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEV_SERVER_PROBE_TIMEOUT_MS);

    try {
        const probeUrl = new URL(devServerUrl);
        probeUrl.pathname = '/';
        probeUrl.search = '';
        probeUrl.hash = '';

        const response = await fetch(probeUrl, {
            method: 'GET',
            cache: 'no-store',
            signal: controller.signal,
        });

        return response.ok || response.status < 500;
    } catch {
        return false;
    } finally {
        clearTimeout(timeout);
    }
}

async function waitForDevServer(devServerUrl: string, timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        if (await isDevServerReachable(devServerUrl)) {
            return true;
        }
        await delay(DEV_SERVER_RETRY_DELAY_MS);
    }

    return isDevServerReachable(devServerUrl);
}

async function loadRenderer(window: BrowserWindow): Promise<void> {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;

    if (devServerUrl) {
        for (let attempt = 1; attempt <= DEV_SERVER_MAX_LOAD_ATTEMPTS; attempt += 1) {
            const waitTimeout = attempt === 1 ? DEV_SERVER_WAIT_TIMEOUT_MS : DEV_SERVER_PROBE_TIMEOUT_MS;
            const isReachable = await waitForDevServer(devServerUrl, waitTimeout);

            if (!isReachable) {
                logger.warn(`[RendererLoad] Dev server is not reachable yet (attempt ${attempt}/${DEV_SERVER_MAX_LOAD_ATTEMPTS}): ${devServerUrl}`);
            }

            try {
                await window.loadURL(devServerUrl);
                return;
            } catch (error) {
                logger.warn(`[RendererLoad] Failed to load dev renderer (attempt ${attempt}/${DEV_SERVER_MAX_LOAD_ATTEMPTS})`, error);
                if (attempt < DEV_SERVER_MAX_LOAD_ATTEMPTS) {
                    await delay(DEV_SERVER_RETRY_DELAY_MS);
                }
            }
        }

        const escapedUrl = devServerUrl
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        const fallbackHtml = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <title>Renderer 起動待機</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #0f172a;
      color: #e2e8f0;
      font-family: "Segoe UI", sans-serif;
    }
    main {
      width: min(560px, calc(100vw - 48px));
      padding: 32px;
      border-radius: 16px;
      background: rgba(15, 23, 42, 0.92);
      border: 1px solid rgba(148, 163, 184, 0.24);
      box-shadow: 0 18px 48px rgba(15, 23, 42, 0.35);
    }
    h1 {
      margin: 0 0 12px;
      font-size: 24px;
    }
    p {
      margin: 0 0 12px;
      line-height: 1.7;
    }
    code {
      font-family: Consolas, monospace;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <main>
    <h1>Renderer の起動を待機できませんでした</h1>
    <p>開発サーバーへの接続に複数回失敗しました。Vite が起動中か確認してから再度起動してください。</p>
    <p><code>${escapedUrl}</code></p>
  </main>
</body>
</html>`;
        await window.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(fallbackHtml)}`);
        return;
    }

    const packagedIndexCandidates = [
        path.join(__dirname, '../dist/index.html'),
        path.join(process.resourcesPath, 'dist/index.html'),
        path.join(process.resourcesPath, 'app.asar.unpacked/dist/index.html'),
    ];
    const packagedIndexPath = packagedIndexCandidates.find((candidate) => fs.existsSync(candidate));

    if (!packagedIndexPath) {
        logger.error('Renderer entry not found in packaged build', { candidates: packagedIndexCandidates });
        app.quit();
        return;
    }

    await window.loadFile(packagedIndexPath);
}

const createWindow = async () => {
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

    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        if (!isMainFrame) return;
        logger.error('Renderer failed to load:', {
            errorCode,
            errorDescription,
            validatedURL
        });
    });

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });

    // Load the app
    await loadRenderer(mainWindow);

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
    syncBundledUpdaterScript();

    // Phase 25: ストレージ設定を最初に初期化（二段階ロード）
    await initStorageConfig();
    logger.refreshLogPath();
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
    registerSmartFolderHandlers();
    registerAutoOrganizeHandlers();
    registerDisplayPresetHandlers();
    logger.info('IPC handlers registered');

    // 古いアクティビティログを削除（30日以上前）
    pruneOldLogs(30);

    await createWindow();
    logger.info('Main window created');
    syncFolderWatchers();
    logger.info('Folder watchers synced');

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            void createWindow();
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

app.on('before-quit', () => {
    disposePreviewFrameWorker();
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

