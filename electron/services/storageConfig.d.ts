/**
 * storageConfig.ts - Phase 25: 保存場所カスタマイズ
 *
 * 設計:
 * - 二段階ロード: userData/storage-config.json → basePath/storage-config.json
 * - getBasePath() は initStorageConfig() 後に呼ぶこと
 * - 移行は原子的（tmpフォルダ経由 → rename）
 */
export type StorageMode = 'appdata' | 'install' | 'custom';
export interface StorageConfig {
    mode: StorageMode;
    customPath?: string;
}
export interface MigrationResult {
    success: boolean;
    oldBase: string;
    newBase: string;
    error?: string;
}
/**
 * 起動時に必ず呼ぶ。app.whenReady() 後、DB 初期化より前に実行すること。
 */
export declare function initStorageConfig(): Promise<void>;
/**
 * 現在の basePath を返す。initStorageConfig() 後に呼ぶこと。
 */
export declare function getBasePath(): string;
/**
 * 現在の設定を返す
 */
export declare function getStorageConfig(): StorageConfig & {
    resolvedPath: string;
};
/**
 * 指定パスへの書き込み権限を確認する
 */
export declare function checkWritePermission(targetPath: string): {
    ok: boolean;
    error?: string;
};
/**
 * 原子的ストレージ移行
 * tmpフォルダにコピー → 成功後 rename → 設定保存
 */
export declare function migrateStorage(newMode: StorageMode, customPath?: string): Promise<MigrationResult>;
/**
 * 旧データを削除する（ユーザー主導）
 * profiles.db は metaDb として常に userData にあり現在も開いているため削除対象から除外する
 */
export declare function deleteOldStorageData(oldBase: string): {
    success: boolean;
    error?: string;
};
