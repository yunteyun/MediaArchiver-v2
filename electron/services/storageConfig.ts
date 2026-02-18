/**
 * storageConfig.ts - Phase 25: 保存場所カスタマイズ
 *
 * 設計:
 * - 二段階ロード: userData/storage-config.json → basePath/storage-config.json
 * - getBasePath() は initStorageConfig() 後に呼ぶこと
 * - 移行は原子的（tmpフォルダ経由 → rename）
 */

import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';

const log = logger.scope('StorageConfig');

// ─── 型定義 ───────────────────────────────────────────────────────────────────

export type StorageMode = 'appdata' | 'install' | 'custom';

export interface StorageConfig {
    mode: StorageMode;
    customPath?: string;  // mode === 'custom' の場合のみ使用
}

export interface MigrationResult {
    success: boolean;
    oldBase: string;
    newBase: string;
    error?: string;
}

// ─── 内部状態 ─────────────────────────────────────────────────────────────────

let _basePath: string | null = null;
let _config: StorageConfig = { mode: 'appdata' };
const CONFIG_FILENAME = 'storage-config.json';

// ─── パス解決 ─────────────────────────────────────────────────────────────────

/**
 * モードに応じた basePath を計算する（副作用なし）
 */
function resolveBasePath(config: StorageConfig): string {
    switch (config.mode) {
        case 'appdata':
            return app.getPath('userData');
        case 'install': {
            // 開発時は exe パスが electron 本体になるため userData にフォールバック
            const exeDir = path.dirname(app.getPath('exe'));
            const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;
            return isDev ? app.getPath('userData') : path.join(exeDir, 'data');
        }
        case 'custom':
            return config.customPath ?? app.getPath('userData');
    }
}

// ─── 初期化（二段階ロード） ───────────────────────────────────────────────────

/**
 * 起動時に必ず呼ぶ。app.whenReady() 後、DB 初期化より前に実行すること。
 */
export async function initStorageConfig(): Promise<void> {
    const userDataPath = app.getPath('userData');
    const bootstrapConfigPath = path.join(userDataPath, CONFIG_FILENAME);

    // Stage 1: userData の設定を読む（ブートストラップ）
    let bootstrapConfig: StorageConfig = { mode: 'appdata' };
    if (fs.existsSync(bootstrapConfigPath)) {
        try {
            bootstrapConfig = JSON.parse(fs.readFileSync(bootstrapConfigPath, 'utf-8'));
        } catch (e) {
            log.warn('Failed to parse bootstrap storage-config.json, using appdata mode', e);
        }
    }

    // Stage 2: basePath が appdata 以外なら、そちらの設定を再読み込み
    const candidateBase = resolveBasePath(bootstrapConfig);
    const candidateConfigPath = path.join(candidateBase, CONFIG_FILENAME);

    if (candidateBase !== userDataPath && fs.existsSync(candidateConfigPath)) {
        try {
            const finalConfig: StorageConfig = JSON.parse(
                fs.readFileSync(candidateConfigPath, 'utf-8')
            );
            _config = finalConfig;
            _basePath = resolveBasePath(finalConfig);
            log.info(`Storage initialized (stage2): mode=${_config.mode}, basePath=${_basePath}`);
            return;
        } catch (e) {
            log.warn('Failed to parse basePath storage-config.json, falling back to bootstrap', e);
        }
    }

    // フォールバック: ブートストラップ設定を使用
    _config = bootstrapConfig;
    _basePath = candidateBase;
    log.info(`Storage initialized: mode=${_config.mode}, basePath=${_basePath}`);
}

/**
 * 現在の basePath を返す。initStorageConfig() 後に呼ぶこと。
 */
export function getBasePath(): string {
    if (_basePath === null) {
        // フォールバック: 未初期化の場合は userData を返す（安全策）
        log.warn('getBasePath() called before initStorageConfig(), using userData as fallback');
        return app.getPath('userData');
    }
    return _basePath;
}

/**
 * 現在の設定を返す
 */
export function getStorageConfig(): StorageConfig & { resolvedPath: string } {
    return {
        ..._config,
        resolvedPath: getBasePath(),
    };
}

// ─── 権限チェック ─────────────────────────────────────────────────────────────

/**
 * 指定パスへの書き込み権限を確認する
 */
export function checkWritePermission(targetPath: string): { ok: boolean; error?: string } {
    try {
        // ディレクトリが存在しない場合は作成を試みる
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
        }
        // テストファイルで書き込み確認
        const testFile = path.join(targetPath, '.write_test');
        fs.writeFileSync(testFile, '');
        fs.unlinkSync(testFile);
        return { ok: true };
    } catch (e: any) {
        return { ok: false, error: e.message };
    }
}

// ─── 設定保存 ─────────────────────────────────────────────────────────────────

/**
 * 設定を保存する（userData と basePath の両方に書く）
 */
function saveConfig(config: StorageConfig, basePath: string): void {
    const userDataPath = app.getPath('userData');
    const configData = JSON.stringify(config, null, 2);

    // userData には常に書く（ブートストラップ用）
    fs.writeFileSync(path.join(userDataPath, CONFIG_FILENAME), configData, 'utf-8');

    // basePath が異なる場合はそちらにも書く
    if (basePath !== userDataPath) {
        fs.mkdirSync(basePath, { recursive: true });
        fs.writeFileSync(path.join(basePath, CONFIG_FILENAME), configData, 'utf-8');
    }
}

// ─── 移行処理 ─────────────────────────────────────────────────────────────────

/**
 * 原子的ストレージ移行
 * tmpフォルダにコピー → 成功後 rename → 設定保存
 */
export async function migrateStorage(
    newMode: StorageMode,
    customPath?: string
): Promise<MigrationResult> {
    const oldBase = getBasePath();
    const newConfig: StorageConfig = { mode: newMode, customPath };
    const newBase = resolveBasePath(newConfig);

    if (oldBase === newBase) {
        return { success: true, oldBase, newBase };
    }

    // 書き込み権限チェック
    const permCheck = checkWritePermission(newBase);
    if (!permCheck.ok) {
        return {
            success: false,
            oldBase,
            newBase,
            error: `書き込み権限がありません: ${permCheck.error}`,
        };
    }

    const tmpDir = path.join(newBase, '.migration_tmp');

    try {
        // tmp クリーンアップ（前回の失敗残骸）
        if (fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
        fs.mkdirSync(tmpDir, { recursive: true });

        // サムネイルをコピー
        const oldThumbnails = path.join(oldBase, 'thumbnails');
        const tmpThumbnails = path.join(tmpDir, 'thumbnails');
        if (fs.existsSync(oldThumbnails)) {
            log.info(`Copying thumbnails: ${oldThumbnails} → ${tmpThumbnails}`);
            copyDirRecursive(oldThumbnails, tmpThumbnails);
        }

        // DB ファイルをコピー（*.db）
        const dbFiles = fs.readdirSync(oldBase).filter(f => f.endsWith('.db'));
        for (const dbFile of dbFiles) {
            const src = path.join(oldBase, dbFile);
            const dst = path.join(tmpDir, dbFile);
            log.info(`Copying DB: ${src} → ${dst}`);
            fs.copyFileSync(src, dst);
        }

        // 全コピー成功 → rename で正式フォルダへ
        const newThumbnails = path.join(newBase, 'thumbnails');
        if (fs.existsSync(path.join(tmpDir, 'thumbnails'))) {
            if (fs.existsSync(newThumbnails)) {
                fs.rmSync(newThumbnails, { recursive: true, force: true });
            }
            fs.renameSync(path.join(tmpDir, 'thumbnails'), newThumbnails);
        }
        for (const dbFile of dbFiles) {
            const dst = path.join(newBase, dbFile);
            if (fs.existsSync(dst)) fs.unlinkSync(dst);
            fs.renameSync(path.join(tmpDir, dbFile), dst);
        }

        // tmp クリーンアップ
        if (fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }

        // 設定を保存・内部状態を更新
        saveConfig(newConfig, newBase);
        _config = newConfig;
        _basePath = newBase;

        // DB内の thumbnail_path を新パスに一括更新
        updateThumbnailPathsInDbs(newBase, oldBase);

        log.info(`Migration complete: ${oldBase} → ${newBase}`);
        return { success: true, oldBase, newBase };

    } catch (e: any) {
        log.error('Migration failed, rolling back', e);
        // ロールバック: tmp を削除
        try {
            if (fs.existsSync(tmpDir)) {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        } catch (cleanupErr) {
            log.error('Rollback cleanup failed', cleanupErr);
        }
        return { success: false, oldBase, newBase, error: e.message };
    }
}

/**
 * 旧データを削除する（ユーザー主導）
 * profiles.db は metaDb として常に userData にあり現在も開いているため削除対象から除外する
 */
export function deleteOldStorageData(oldBase: string): { success: boolean; error?: string } {
    const currentBase = getBasePath();
    if (oldBase === currentBase) {
        return { success: false, error: '現在の保存先は削除できません' };
    }
    try {
        // サムネイルフォルダ削除
        const oldThumbnails = path.join(oldBase, 'thumbnails');
        if (fs.existsSync(oldThumbnails)) {
            fs.rmSync(oldThumbnails, { recursive: true, force: true });
        }
        // DB ファイル削除（profiles.db は metaDb として常に開いているため除外）
        const dbFiles = fs.readdirSync(oldBase).filter(f =>
            f.endsWith('.db') && f !== 'profiles.db'
        );
        for (const dbFile of dbFiles) {
            fs.unlinkSync(path.join(oldBase, dbFile));
        }
        log.info(`Old storage data deleted: ${oldBase}`);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ─── ユーティリティ ───────────────────────────────────────────────────────────

function copyDirRecursive(src: string, dst: string): void {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const dstPath = path.join(dst, entry.name);
        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, dstPath);
        } else {
            fs.copyFileSync(srcPath, dstPath);
        }
    }
}

/**
 * 移行後に各プロファイルDBの thumbnail_path を新パスに一括更新
 * oldBase のパスを newBase に置換する
 */
function updateThumbnailPathsInDbs(newBase: string, oldBase: string): void {
    try {
        const Database = require('better-sqlite3');
        const dbFiles = fs.readdirSync(newBase).filter(
            (f: string) => f.endsWith('.db') && f !== 'profiles.db'
        );
        // パス区切り文字を正規化（バックスラッシュをフォワードスラッシュに統一）
        const normalizeBase = (p: string) => p.replace(/\\/g, '/');
        const oldNorm = normalizeBase(oldBase);
        const newNorm = normalizeBase(newBase);

        for (const dbFile of dbFiles) {
            const dbPath = path.join(newBase, dbFile);
            try {
                const db = new Database(dbPath);
                // thumbnail_path の山パスを新パスに置換
                db.prepare(`
                    UPDATE files
                    SET thumbnail_path = REPLACE(thumbnail_path, ?, ?)
                    WHERE thumbnail_path LIKE ?
                `).run(oldNorm, newNorm, `${oldNorm}%`);
                // バックスラッシュ形式も対応
                db.prepare(`
                    UPDATE files
                    SET thumbnail_path = REPLACE(thumbnail_path, ?, ?)
                    WHERE thumbnail_path LIKE ?
                `).run(oldBase, newBase, `${oldBase}%`);
                // preview_frames も同様に更新
                db.prepare(`
                    UPDATE files
                    SET preview_frames = REPLACE(preview_frames, ?, ?)
                    WHERE preview_frames LIKE ?
                `).run(oldNorm, newNorm, `${oldNorm}%`);
                db.prepare(`
                    UPDATE files
                    SET preview_frames = REPLACE(preview_frames, ?, ?)
                    WHERE preview_frames LIKE ?
                `).run(oldBase, newBase, `${oldBase}%`);
                db.close();
                log.info(`thumbnail_path updated in ${dbFile}`);
            } catch (e) {
                log.warn(`Failed to update thumbnail_path in ${dbFile}:`, e);
            }
        }
    } catch (e) {
        log.warn('updateThumbnailPathsInDbs failed:', e);
    }
}
