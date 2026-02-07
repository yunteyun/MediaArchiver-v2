/**
 * Duplicate IPC Handlers - 重複検出のIPC通信
 *
 * 進捗イベントは50-100msに1回に間引き（IPCスロットリング）
 */
export declare function registerDuplicateHandlers(): void;
