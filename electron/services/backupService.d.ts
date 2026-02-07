/**
 * Backup Service - バックアップ・リストア機能
 *
 * アーキテクチャレビュー対応:
 * 1. VACUUM INTO によるホットバックアップ
 * 2. ディスク容量事前チェック（DBサイズの1.5倍）
 * 3. ファイル名規則: backup_{profileId}_{timestamp}.db
 * 4. 安全なリストアフロー: db.close() → copy → app.relaunch()
 */
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
/**
 * 手動バックアップ（VACUUM INTO使用）
 */
export declare function createBackup(profileId: string): Promise<BackupInfo>;
/**
 * バックアップ履歴取得（ファイル名からタイムスタンプをパース）
 */
export declare function getBackupHistory(profileId: string): BackupInfo[];
/**
 * リストア（安全なフロー）
 * 1. db.close() で明示的に接続を切断
 * 2. fs.copyFile() でファイルを上書き
 * 3. app.relaunch() + app.exit() でアプリ再起動
 */
export declare function restoreBackup(backupPath: string): Promise<void>;
/**
 * 古いバックアップの削除（世代数制限）
 */
export declare function pruneOldBackups(profileId: string, maxCount: number): void;
/**
 * 自動バックアップのスケジュールチェック
 */
export declare function shouldAutoBackup(profileId: string, settings: BackupSettings): boolean;
