/**
 * Backup Service - バックアップ・リストア機能
 * 
 * アーキテクチャレビュー対応:
 * 1. VACUUM INTO によるホットバックアップ
 * 2. ディスク容量事前チェック（DBサイズの1.5倍）
 * 3. ファイル名規則: backup_{profileId}_{timestamp}.db
 * 4. 安全なリストアフロー: checkpoint/close → copy → relaunch scheduling → app.quit()
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { app, BrowserWindow } from 'electron';
import checkDiskSpace from 'check-disk-space';
import { dbManager } from './databaseManager';
import { logger } from './logger';
import { getBasePath } from './storageConfig';
import { stopAllFolderWatchers, syncFolderWatchers } from './folderWatchService';
import { disposePreviewFrameWorker } from './previewFrameWorkerService';

const log = logger.scope('BackupService');
const BACKUP_SETTINGS_FILENAME = 'backup-settings.json';

// --- Types ---

export interface BackupInfo {
    id: string;
    filename: string;
    path: string;
    createdAt: number;
    size: number;
    profileId: string;
}

export interface BackupSettings {
    enabled: boolean;
    interval: 'daily' | 'weekly';
    maxBackups: number;
    backupPath: string;
}

export const DEFAULT_BACKUP_SETTINGS: BackupSettings = {
    enabled: false,
    interval: 'weekly',
    maxBackups: 5,
    backupPath: '',
};

// --- Helper Functions ---

function getBackupSettingsPath(): string {
    return path.join(app.getPath('userData'), BACKUP_SETTINGS_FILENAME);
}

function normalizeBackupSettings(input: Partial<BackupSettings> | null | undefined): BackupSettings {
    const parsedMaxBackups = Number(input?.maxBackups);
    return {
        enabled: input?.enabled === true,
        interval: input?.interval === 'daily' ? 'daily' : DEFAULT_BACKUP_SETTINGS.interval,
        maxBackups: Number.isFinite(parsedMaxBackups)
            ? Math.max(1, Math.min(50, Math.round(parsedMaxBackups)))
            : DEFAULT_BACKUP_SETTINGS.maxBackups,
        backupPath: typeof input?.backupPath === 'string' ? input.backupPath.trim() : DEFAULT_BACKUP_SETTINGS.backupPath,
    };
}

function resolveBackupDir(settings: BackupSettings): string {
    const backupDir = settings.backupPath
        ? path.resolve(settings.backupPath)
        : path.join(getBasePath(), 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    return backupDir;
}

/**
 * バックアップディレクトリ取得
 */
function getBackupDir(settings: BackupSettings = DEFAULT_BACKUP_SETTINGS): string {
    return resolveBackupDir(settings);
}

function removeDbSidecarFiles(dbPath: string): void {
    for (const suffix of ['-wal', '-shm', '-journal']) {
        const sidecarPath = `${dbPath}${suffix}`;
        if (!fs.existsSync(sidecarPath)) continue;
        try {
            fs.unlinkSync(sidecarPath);
            log.info(`Removed stale DB sidecar: ${sidecarPath}`);
        } catch (error) {
            log.warn(`Failed to remove DB sidecar: ${sidecarPath}`, error);
        }
    }
}

function scheduleRestoreRelaunch(): void {
    if (!app.isPackaged) {
        app.relaunch();
        return;
    }

    const exePath = app.getPath('exe');
    const exeDir = path.dirname(exePath);
    const scriptPath = path.join(app.getPath('temp'), `mediaarchiver-restore-relaunch-${Date.now()}.cmd`);
    const scriptLines = [
        '@echo off',
        'ping 127.0.0.1 -n 3 >nul',
        `cd /d "${exeDir.replace(/"/g, '""')}"`,
        `start "" "${exePath.replace(/"/g, '""')}"`,
        'del "%~f0"',
    ];

    try {
        fs.writeFileSync(scriptPath, `${scriptLines.join('\r\n')}\r\n`, 'utf-8');
        const child = spawn('cmd.exe', ['/d', '/c', scriptPath], {
            cwd: exeDir,
            detached: true,
            stdio: 'ignore',
            windowsHide: true,
        });
        child.unref();
        log.info(`Scheduled delayed restore relaunch via script: ${scriptPath}`);
    } catch (error) {
        log.error('Failed to schedule delayed restore relaunch:', error);
        app.relaunch();
    }
}

function reloadWindowsAfterRestoreInDev(): void {
    setTimeout(() => {
        const windows = BrowserWindow.getAllWindows().filter((window) => !window.isDestroyed());

        if (windows.length === 0) {
            log.warn('No browser windows found for in-place restore reload.');
            return;
        }

        windows.forEach((window) => {
            try {
                window.webContents.reloadIgnoringCache();
            } catch (error) {
                log.warn('Failed to reload browser window after restore.', error);
            }
        });
    }, 100);
}

export function loadBackupSettings(): BackupSettings {
    const settingsPath = getBackupSettingsPath();
    if (!fs.existsSync(settingsPath)) {
        return { ...DEFAULT_BACKUP_SETTINGS };
    }

    try {
        const parsed = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) as Partial<BackupSettings>;
        return normalizeBackupSettings(parsed);
    } catch (error) {
        log.warn('Failed to read backup settings. Falling back to defaults.', error);
        return { ...DEFAULT_BACKUP_SETTINGS };
    }
}

export function saveBackupSettings(settings: BackupSettings): BackupSettings {
    const normalized = normalizeBackupSettings(settings);
    const settingsPath = getBackupSettingsPath();
    fs.writeFileSync(settingsPath, JSON.stringify(normalized, null, 2), 'utf-8');
    return normalized;
}

/**
 * ディスク容量チェック（Pre-flight Check）
 * DBサイズの1.5倍の空きが必要
 */
async function checkDiskSpaceAvailable(targetPath: string, requiredBytes: number): Promise<boolean> {
    try {
        const diskSpace = await checkDiskSpace(path.dirname(targetPath));
        const available = diskSpace.free;
        log.debug(`Disk space check: required=${requiredBytes}, available=${available}`);
        return available >= requiredBytes;
    } catch (error) {
        log.error('Failed to check disk space:', error);
        return false;
    }
}

// --- Public API ---

/**
 * 手動バックアップ（VACUUM INTO使用）
 */
export async function createBackup(
    profileId: string,
    settings: BackupSettings = loadBackupSettings()
): Promise<BackupInfo> {
    const db = dbManager.getDb();
    const timestamp = Date.now();
    const filename = `backup_${profileId}_${timestamp}.db`;
    const backupPath = path.join(getBackupDir(settings), filename);

    log.info(`Creating backup: ${backupPath}`);

    // 1. ディスク容量チェック
    const dbPath = dbManager.getCurrentDbPath();
    const dbSize = fs.statSync(dbPath).size;
    const requiredSpace = Math.ceil(dbSize * 1.5);

    const hasSpace = await checkDiskSpaceAvailable(backupPath, requiredSpace);
    if (!hasSpace) {
        const errorMsg = `Insufficient disk space. Required: ${(requiredSpace / 1024 / 1024).toFixed(2)} MB`;
        log.error(errorMsg);
        throw new Error(errorMsg);
    }

    // 2. VACUUM INTO でバックアップ
    try {
        db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`);
        log.info('Backup created successfully');
    } catch (error) {
        log.error('Backup failed:', error);
        // 失敗したバックアップファイルを削除
        if (fs.existsSync(backupPath)) {
            fs.unlinkSync(backupPath);
        }
        throw error;
    }

    const backupSize = fs.statSync(backupPath).size;

    return {
        id: timestamp.toString(),
        filename,
        path: backupPath,
        createdAt: timestamp,
        size: backupSize,
        profileId
    };
}

/**
 * バックアップ履歴取得（ファイル名からタイムスタンプをパース）
 */
export function getBackupHistory(
    profileId: string,
    settings: BackupSettings = loadBackupSettings()
): BackupInfo[] {
    const backupDir = getBackupDir(settings);

    if (!fs.existsSync(backupDir)) {
        return [];
    }

    const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith(`backup_${profileId}_`) && f.endsWith('.db'))
        .map(filename => {
            const fullPath = path.join(backupDir, filename);
            const stats = fs.statSync(fullPath);

            // ファイル名からタイムスタンプをパース
            const match = filename.match(/backup_(.+?)_(\d+)\.db/);
            const timestamp = match ? parseInt(match[2], 10) : 0;

            return {
                id: timestamp.toString(),
                filename,
                path: fullPath,
                createdAt: timestamp,
                size: stats.size,
                profileId
            };
        })
        .sort((a, b) => b.createdAt - a.createdAt);

    return files;
}

/**
 * リストア（安全なフロー）
 * 1. DB を checkpoint / close して sidecar を掃除できる状態にする
 * 2. fs.copyFile() でファイルを上書き
 * 3. 再起動を予約して app.quit() で正常終了
 */
export async function restoreBackup(backupPath: string): Promise<void> {
    log.info(`Restoring backup: ${backupPath}`);

    if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file not found');
    }

    const currentDbPath = dbManager.getCurrentDbPath();

    // 1. DB接続を明示的に切断
    try {
        dbManager.walCheckpoint();
    } catch (error) {
        log.warn('WAL checkpoint before restore failed. Continuing with restore.', error);
    }
    dbManager.closeAll();

    // 2. ファイルコピー
    try {
        removeDbSidecarFiles(currentDbPath);
        await fs.promises.copyFile(backupPath, currentDbPath);
        log.info('Backup restored successfully. App will relaunch.');
    } catch (error) {
        log.error('Restore failed:', error);
        try {
            dbManager.initialize();
        } catch (reopenError) {
            log.error('Failed to reinitialize database after restore failure:', reopenError);
        }
        throw error;
    }

    // 3. 復元後の再初期化
    stopAllFolderWatchers();
    disposePreviewFrameWorker();

    if (!app.isPackaged) {
        try {
            dbManager.initialize();
            syncFolderWatchers();
            log.info('Backup restored successfully in dev. Reloading current windows in-place.');
            reloadWindowsAfterRestoreInDev();
            return;
        } catch (error) {
            log.error('Failed to reinitialize app state after dev restore. Falling back to relaunch.', error);
        }
    }

    scheduleRestoreRelaunch();
    app.quit();
}

/**
 * 古いバックアップの削除（世代数制限）
 */
export function pruneOldBackups(
    profileId: string,
    maxCount: number,
    settings: BackupSettings = loadBackupSettings()
): void {
    const backups = getBackupHistory(profileId, settings);

    if (backups.length > maxCount) {
        const toDelete = backups.slice(maxCount);
        toDelete.forEach(backup => {
            log.info(`Deleting old backup: ${backup.filename}`);
            try {
                fs.unlinkSync(backup.path);
            } catch (error) {
                log.error(`Failed to delete backup: ${backup.filename}`, error);
            }
        });
    }
}

/**
 * 自動バックアップのスケジュールチェック
 */
export function shouldAutoBackup(profileId: string, settings: BackupSettings): boolean {
    if (!settings.enabled) {
        return false;
    }

    const backups = getBackupHistory(profileId, settings);
    if (backups.length === 0) {
        return true; // 初回バックアップ
    }

    const lastBackup = backups[0];
    const now = Date.now();
    const elapsed = now - lastBackup.createdAt;

    const intervalMs = settings.interval === 'daily'
        ? 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;

    return elapsed >= intervalMs;
}
