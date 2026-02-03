/**
 * Logger Service - アプリケーション全体のログ管理
 * 
 * electron-log を使用して、ログをファイルとコンソールに出力します。
 * ログファイルは userData/logs/ に保存されます。
 */

import log from 'electron-log/main';
import { app } from 'electron';
import path from 'path';

// ログファイルの設定
const logsPath = path.join(app.getPath('userData'), 'logs');

// ログファイル名のフォーマット（日付別）
log.transports.file.resolvePathFn = () => {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(logsPath, `app-${date}.log`);
};

// ログレベルの設定
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

// ログフォーマットの設定
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
log.transports.console.format = '[{h}:{i}:{s}] [{level}] {text}';

// 古いログファイルの自動削除（30日以上前）
log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB

// ログを初期化
log.initialize();

// エクスポート用のロガーインスタンス
export const logger = {
    /**
     * デバッグ情報（開発時のみ表示）
     */
    debug: (message: string, ...args: any[]) => {
        log.debug(message, ...args);
    },

    /**
     * 一般的な情報
     */
    info: (message: string, ...args: any[]) => {
        log.info(message, ...args);
    },

    /**
     * 警告（問題の可能性があるが、処理は継続）
     */
    warn: (message: string, ...args: any[]) => {
        log.warn(message, ...args);
    },

    /**
     * エラー（問題が発生したが、アプリは動作継続）
     */
    error: (message: string, ...args: any[]) => {
        log.error(message, ...args);
    },

    /**
     * スコープ付きロガーを作成（モジュール名をプレフィックスに）
     */
    scope: (moduleName: string) => {
        return {
            debug: (message: string, ...args: any[]) => log.debug(`[${moduleName}] ${message}`, ...args),
            info: (message: string, ...args: any[]) => log.info(`[${moduleName}] ${message}`, ...args),
            warn: (message: string, ...args: any[]) => log.warn(`[${moduleName}] ${message}`, ...args),
            error: (message: string, ...args: any[]) => log.error(`[${moduleName}] ${message}`, ...args),
        };
    },

    /**
     * ログファイルのパスを取得
     */
    getLogPath: () => logsPath,

    /**
     * 最新のログファイルの内容を取得（UIで表示するため）
     */
    getRecentLogs: async (lines: number = 100): Promise<string[]> => {
        const fs = await import('fs');
        const date = new Date().toISOString().split('T')[0];
        const logFile = path.join(logsPath, `app-${date}.log`);

        if (!fs.existsSync(logFile)) {
            return [];
        }

        const content = fs.readFileSync(logFile, 'utf-8');
        const allLines = content.split('\n').filter(line => line.trim());
        return allLines.slice(-lines);
    }
};

export default logger;
