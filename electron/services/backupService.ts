/**
 * Backup Service - バックアップ・リストア機能
 * 
 * アーキテクチャレビュー対応:
 * 1. VACUUM INTO によるホットバックアップ
 * 2. ディスク容量事前チェック（DBサイズの1.5倍）
 * 3. ファイル名規則: backup_{profileId}_{timestamp}.db
 * 4. 安全なリストアフロー: db.close() → copy → app.relaunch()
 */

import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import checkDiskSpace from 'check-disk-space';
import { dbManager } from './databaseManager';
import { logger } from './logger';

const log = logger.scope('BackupService');

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

// --- Helper Functions ---

/**
 * バックアップディレクトリ取得
 */
function getBackupDir(): string {
    const backupDir = path.join(app.getPath('userData'), 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    return backupDir;
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
export async function createBackup(profileId: string): Promise<BackupInfo> {
    const db = dbManager.getDb();
    const timestamp = Date.now();
    const filename = `backup_${profileId}_${timestamp}.db`;
    const backupPath = path.join(getBackupDir(), filename);

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
export function getBackupHistory(profileId: string): BackupInfo[] {
    const backupDir = getBackupDir();

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
 * 1. db.close() で明示的に接続を切断
 * 2. fs.copyFile() でファイルを上書き
 * 3. app.relaunch() + app.exit() でアプリ再起動
 */
export async function restoreBackup(backupPath: string): Promise<void> {
    log.info(`Restoring backup: ${backupPath}`);

    if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file not found');
    }

    // 1. DB接続を明示的に切断
    dbManager.closeDb();

    // 2. ファイルコピー
    const currentDbPath = dbManager.getCurrentDbPath();
    try {
        await fs.promises.copyFile(backupPath, currentDbPath);
        log.info('Backup restored successfully. App will relaunch.');
    } catch (error) {
        log.error('Restore failed:', error);
        throw error;
    }

    // 3. アプリ再起動（整合性保証）
    app.relaunch();
    app.exit(0);
}

/**
 * 古いバックアップの削除（世代数制限）
 */
export function pruneOldBackups(profileId: string, maxCount: number): void {
    const backups = getBackupHistory(profileId);

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

    const backups = getBackupHistory(profileId);
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
