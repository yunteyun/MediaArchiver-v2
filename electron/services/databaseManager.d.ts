/**
 * DatabaseManager - プロファイルごとのDB切り替えを管理
 *
 * - metaDb: プロファイル一覧を管理する共通DB (profiles.db)
 * - db: 現在アクティブなプロファイルのDB (profile_xxx.db)
 */
import Database from 'better-sqlite3';
export interface Profile {
    id: string;
    name: string;
    dbFilename: string;
    createdAt: number;
    updatedAt: number;
}
declare class DatabaseManager {
    private db;
    private currentProfileId;
    private metaDb;
    private userDataPath;
    constructor();
    /**
     * メタDB初期化（プロファイル一覧管理用）
     */
    private initMetaDb;
    /**
     * デフォルトプロファイル作成
     */
    private createDefaultProfile;
    /**
     * メディアDB初期化（プロファイルごと）
     */
    private initMediaDb;
    /**
     * 全プロファイル取得
     */
    getProfiles(): Profile[];
    /**
     * 単一プロファイル取得
     */
    getProfile(id: string): Profile | undefined;
    /**
     * プロファイル作成
     */
    createProfile(name: string): Profile;
    /**
     * プロファイル更新
     */
    updateProfile(id: string, updates: {
        name?: string;
    }): void;
    /**
     * プロファイル削除
     */
    deleteProfile(id: string): boolean;
    /**
     * アクティブプロファイルID取得
     */
    getActiveProfileId(): string;
    /**
     * プロファイル切替
     */
    switchProfile(profileId: string): void;
    /**
     * 起動時の初期化（アクティブプロファイルに接続）
     */
    initialize(): void;
    /**
     * 現在のDBインスタンス取得
     */
    getDb(): Database.Database;
    /**
     * メタDBインスタンス取得
     */
    getMetaDb(): Database.Database;
    /**
     * 現在のプロファイルID取得
     */
    getCurrentProfileId(): string | null;
    /**
     * クリーンアップ
     */
    close(): void;
}
export declare const dbManager: DatabaseManager;
export {};
