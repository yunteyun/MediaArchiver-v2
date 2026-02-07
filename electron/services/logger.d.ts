/**
 * Logger Service - アプリケーション全体のログ管理
 *
 * electron-log を使用して、ログをファイルとコンソールに出力します。
 * ログファイルは userData/logs/ に保存されます。
 */
export declare const logger: {
    /**
     * デバッグ情報（開発時のみ表示）
     */
    debug: (message: string, ...args: any[]) => void;
    /**
     * 一般的な情報
     */
    info: (message: string, ...args: any[]) => void;
    /**
     * 警告（問題の可能性があるが、処理は継続）
     */
    warn: (message: string, ...args: any[]) => void;
    /**
     * エラー（問題が発生したが、アプリは動作継続）
     */
    error: (message: string, ...args: any[]) => void;
    /**
     * スコープ付きロガーを作成（モジュール名をプレフィックスに）
     */
    scope: (moduleName: string) => {
        debug: (message: string, ...args: any[]) => void;
        info: (message: string, ...args: any[]) => void;
        warn: (message: string, ...args: any[]) => void;
        error: (message: string, ...args: any[]) => void;
    };
    /**
     * ログファイルのパスを取得
     */
    getLogPath: () => string;
    /**
     * 最新のログファイルの内容を取得（UIで表示するため）
     */
    getRecentLogs: (lines?: number) => Promise<string[]>;
};
export default logger;
