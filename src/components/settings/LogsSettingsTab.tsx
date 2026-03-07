import React from 'react';
import { AlertCircle, AlertTriangle, Copy, FolderOpen, Info, RefreshCw } from 'lucide-react';

type LogFilter = 'all' | 'error' | 'warn' | 'info';

interface LogActionMessage {
    type: 'success' | 'error' | 'info';
    text: string;
}

interface LogsSettingsTabProps {
    logFilter: LogFilter;
    onLogFilterChange: (value: LogFilter) => void;
    isLoadingLogs: boolean;
    onReloadLogs: () => void;
    onCopyVisibleLogs: () => void;
    onOpenLogFolder: () => void;
    filteredLogs: string[];
    logs: string[];
    logLoadError: string;
    logActionMessage: LogActionMessage | null;
}

function getLogLevelIcon(line: string) {
    if (line.includes('[error]')) return <AlertCircle size={12} className="mt-0.5 shrink-0" />;
    if (line.includes('[warn]')) return <AlertTriangle size={12} className="mt-0.5 shrink-0" />;
    return <Info size={12} className="mt-0.5 shrink-0" />;
}

export const LogsSettingsTab = React.memo(({
    logFilter,
    onLogFilterChange,
    isLoadingLogs,
    onReloadLogs,
    onCopyVisibleLogs,
    onOpenLogFolder,
    filteredLogs,
    logs,
    logLoadError,
    logActionMessage,
}: LogsSettingsTabProps) => (
    <div className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
                <label className="text-sm text-surface-400">フィルター:</label>
                <select
                    value={logFilter}
                    onChange={(e) => onLogFilterChange(e.target.value as LogFilter)}
                    className="bg-surface-800 text-surface-200 text-sm px-2 py-1 rounded border border-surface-600 focus:outline-none focus:border-primary-500"
                >
                    <option value="all">すべて</option>
                    <option value="error">エラーのみ</option>
                    <option value="warn">警告のみ</option>
                    <option value="info">情報のみ</option>
                </select>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onReloadLogs}
                    disabled={isLoadingLogs}
                    className="flex items-center gap-1 px-3 py-1 bg-surface-700 hover:bg-surface-600 text-surface-200 text-sm rounded transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={14} className={isLoadingLogs ? 'animate-spin' : ''} />
                    更新
                </button>
                <button
                    onClick={onCopyVisibleLogs}
                    className="flex items-center gap-1 px-3 py-1 bg-surface-700 hover:bg-surface-600 text-surface-200 text-sm rounded transition-colors"
                >
                    <Copy size={14} />
                    表示中をコピー
                </button>
                <button
                    onClick={onOpenLogFolder}
                    className="flex items-center gap-1 px-3 py-1 bg-surface-700 hover:bg-surface-600 text-surface-200 text-sm rounded transition-colors"
                >
                    <FolderOpen size={14} />
                    フォルダを開く
                </button>
            </div>
        </div>

        <div className="space-y-2">
            <p className="text-xs text-surface-400">
                問題報告時は「表示中をコピー」または「フォルダを開く」からログを共有してください。表示件数: {filteredLogs.length}件（取得済み {logs.length}件）
            </p>
            {logLoadError && (
                <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
                    {logLoadError}
                </div>
            )}
            {logActionMessage && (
                <div className={`text-xs rounded px-3 py-2 border ${logActionMessage.type === 'error'
                    ? 'text-red-300 bg-red-500/10 border-red-500/30'
                    : logActionMessage.type === 'success'
                        ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                        : 'text-surface-300 bg-surface-800 border-surface-700'
                    }`}>
                    {logActionMessage.text}
                </div>
            )}
        </div>

        <div className="bg-surface-950 rounded border border-surface-700 h-80 overflow-y-auto font-mono text-xs">
            {filteredLogs.length === 0 ? (
                <div className="flex items-center justify-center h-full text-surface-500">
                    {isLoadingLogs ? '読み込み中...' : logs.length > 0 ? 'このフィルターに該当するログはありません' : 'ログがありません'}
                </div>
            ) : (
                <div className="p-2 space-y-0.5">
                    {filteredLogs.map((line, idx) => (
                        <div
                            key={idx}
                            className={`flex items-start gap-2 py-0.5 px-1 rounded hover:bg-surface-800 ${line.includes('[error]') ? 'text-red-300' :
                                line.includes('[warn]') ? 'text-yellow-300' :
                                    'text-surface-300'
                                }`}
                        >
                            {getLogLevelIcon(line)}
                            <span className="break-all">{line}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <p className="text-xs text-surface-500">
            最新300行を表示。ログファイルは日付ごとに自動ローテーションされます。共有時は個人情報やパス情報が含まれていないか確認してください。
        </p>
    </div>
));

LogsSettingsTab.displayName = 'LogsSettingsTab';
