import React from 'react';
import { AlertCircle, AlertTriangle, Copy, FolderOpen, Info, RefreshCw } from 'lucide-react';
import type { PerfDebugFlags } from '../../utils/perfDebug';
import { SettingsSection } from './SettingsSection';

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
    perfDebugAvailable: boolean;
    perfDebugFlags: PerfDebugFlags;
    onPerfDebugFlagsChange: (patch: Partial<PerfDebugFlags>) => void;
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
    perfDebugAvailable,
    perfDebugFlags,
    onPerfDebugFlagsChange,
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

        {perfDebugAvailable && (
            <SettingsSection
                title="開発用 perf 計測"
                description="ffmpeg Worker / Utility Process 化の再挑戦前に、UI 応答性と lazy chunk 読込時間を DevTools console と main log へ出します。開発ビルド専用です。"
                scope="operation"
            >
                <label className="flex items-start justify-between gap-3 rounded border border-surface-700 bg-surface-900/50 px-3 py-3 cursor-pointer hover:border-surface-600">
                    <div>
                        <div className="text-sm text-surface-200">perf 計測を有効化</div>
                        <div className="text-xs text-surface-500 mt-0.5">
                            FileGrid 集計、UI 応答性、chunk load 時間を出力します。
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={perfDebugFlags.enabled}
                        onChange={(event) => onPerfDebugFlagsChange({ enabled: event.target.checked })}
                        className="mt-0.5 h-4 w-4 accent-primary-500"
                    />
                </label>

                <div className="grid gap-2 md:grid-cols-3">
                    <label className={`flex items-start gap-3 rounded border border-surface-700 bg-surface-900/50 px-3 py-3 ${perfDebugFlags.enabled ? 'cursor-pointer hover:border-surface-600' : 'opacity-60'}`}>
                        <input
                            type="checkbox"
                            checked={perfDebugFlags.groupDetails}
                            disabled={!perfDebugFlags.enabled}
                            onChange={(event) => onPerfDebugFlagsChange({ groupDetails: event.target.checked })}
                            className="mt-0.5 h-4 w-4 accent-primary-500"
                        />
                        <div>
                            <div className="text-sm text-surface-200">グループ詳細</div>
                            <div className="text-xs text-surface-500 mt-0.5">
                                grouping と仮想行入力の詳細ログを追加します。
                            </div>
                        </div>
                    </label>

                    <label className={`flex items-start gap-3 rounded border border-surface-700 bg-surface-900/50 px-3 py-3 ${perfDebugFlags.enabled ? 'cursor-pointer hover:border-surface-600' : 'opacity-60'}`}>
                        <input
                            type="checkbox"
                            checked={perfDebugFlags.responsiveness}
                            disabled={!perfDebugFlags.enabled}
                            onChange={(event) => onPerfDebugFlagsChange({ responsiveness: event.target.checked })}
                            className="mt-0.5 h-4 w-4 accent-primary-500"
                        />
                        <div>
                            <div className="text-sm text-surface-200">UI 応答性</div>
                            <div className="text-xs text-surface-500 mt-0.5">
                                設定モーダル、右パネル、中央ビューアの応答時間を計測します。
                            </div>
                        </div>
                    </label>

                    <label className={`flex items-start gap-3 rounded border border-surface-700 bg-surface-900/50 px-3 py-3 ${perfDebugFlags.enabled ? 'cursor-pointer hover:border-surface-600' : 'opacity-60'}`}>
                        <input
                            type="checkbox"
                            checked={perfDebugFlags.chunkLoad}
                            disabled={!perfDebugFlags.enabled}
                            onChange={(event) => onPerfDebugFlagsChange({ chunkLoad: event.target.checked })}
                            className="mt-0.5 h-4 w-4 accent-primary-500"
                        />
                        <div>
                            <div className="text-sm text-surface-200">chunk 読込</div>
                            <div className="text-xs text-surface-500 mt-0.5">
                                lazy import ごとの読込時間を console に出します。
                            </div>
                        </div>
                    </label>
                </div>
            </SettingsSection>
        )}
    </div>
));

LogsSettingsTab.displayName = 'LogsSettingsTab';
