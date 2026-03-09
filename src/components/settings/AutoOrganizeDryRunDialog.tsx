import React from 'react';
import { AlertTriangle, CheckCircle2, Play, X } from 'lucide-react';
import type { AutoOrganizeApplyResult, AutoOrganizeDryRunResult } from '../../types/autoOrganize';

interface AutoOrganizeDryRunDialogProps {
    isOpen: boolean;
    result: AutoOrganizeDryRunResult | null;
    applyResult: AutoOrganizeApplyResult | null;
    isRunning: boolean;
    onClose: () => void;
    onApply: () => void;
}

function getStatusClass(status: string): string {
    switch (status) {
        case 'ready':
            return 'border-emerald-700/40 bg-emerald-900/10 text-emerald-200';
        case 'conflict':
            return 'border-red-700/40 bg-red-900/10 text-red-200';
        default:
            return 'border-amber-700/40 bg-amber-900/10 text-amber-200';
    }
}

function getStatusLabel(status: string): string {
    switch (status) {
        case 'ready':
            return '適用可能';
        case 'conflict':
            return '競合';
        case 'skipped_same_path':
            return '移動不要';
        case 'skipped_missing_target':
            return '移動先不明';
        case 'skipped_invalid_name':
            return '無効な名前';
        case 'applied':
            return '適用完了';
        case 'moved':
            return '移動完了';
        case 'failed':
            return '失敗';
        default:
            return 'スキップ';
    }
}

function getActionKindLabel(actionKind: string): string {
    switch (actionKind) {
        case 'move':
            return '移動';
        case 'rename':
            return 'リネーム';
        case 'move_and_rename':
            return '移動 + リネーム';
        default:
            return '整理';
    }
}

export const AutoOrganizeDryRunDialog: React.FC<AutoOrganizeDryRunDialogProps> = ({
    isOpen,
    result,
    applyResult,
    isRunning,
    onClose,
    onApply,
}) => {
    if (!isOpen || !result) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="flex h-[min(78vh,760px)] w-[min(1080px,calc(100vw-2rem))] flex-col rounded-xl border border-surface-700 bg-surface-900 shadow-xl">
                <div className="flex items-center justify-between border-b border-surface-700 px-4 py-3">
                    <div>
                        <h2 className="text-base font-semibold text-white">自動整理 Dry Run</h2>
                        <p className="mt-1 text-xs text-surface-500">
                            実行前に一致件数と競合を確認します。適用はこの結果を見た後にのみ行えます。
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded p-1 text-surface-300 transition-colors hover:bg-surface-800 hover:text-white"
                        aria-label="閉じる"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="grid gap-4 overflow-y-auto px-4 py-4">
                    {!result.success ? (
                        <div className="rounded border border-red-700/40 bg-red-900/10 p-3 text-sm text-red-200">
                            Dry Run に失敗しました: {result.error ?? 'unknown error'}
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-3 md:grid-cols-4">
                                <div className="rounded border border-surface-700 bg-surface-900/40 p-3">
                                    <div className="text-xs text-surface-400">対象ルール</div>
                                    <div className="mt-1 text-lg font-semibold text-white">{result.totalRuleCount}</div>
                                </div>
                                <div className="rounded border border-surface-700 bg-surface-900/40 p-3">
                                    <div className="text-xs text-surface-400">一致件数</div>
                                    <div className="mt-1 text-lg font-semibold text-white">{result.totalMatchedCount}</div>
                                </div>
                                <div className="rounded border border-emerald-700/40 bg-emerald-900/10 p-3">
                                    <div className="text-xs text-emerald-300">適用可能</div>
                                    <div className="mt-1 text-lg font-semibold text-emerald-100">{result.totalReadyCount}</div>
                                </div>
                                <div className="rounded border border-red-700/40 bg-red-900/10 p-3">
                                    <div className="text-xs text-red-300">競合 / スキップ</div>
                                    <div className="mt-1 text-lg font-semibold text-red-100">{result.totalConflictCount + result.totalSkippedCount}</div>
                                </div>
                            </div>

                            {result.totalConflictCount > 0 && (
                                <div className="rounded border border-red-700/40 bg-red-900/10 p-3 text-sm text-red-200">
                                    <div className="flex items-center gap-2 font-medium">
                                        <AlertTriangle size={16} />
                                        同名ファイル競合があります
                                    </div>
                                    <p className="mt-1 text-xs text-red-200/90">
                                        競合ファイルは適用対象に含まれません。必要なら移動先を変更するか、既存ファイルを整理してから再実行してください。
                                    </p>
                                </div>
                            )}

                            <div className="rounded border border-surface-700 bg-surface-900/40 p-3">
                                <div className="text-sm font-medium text-surface-200">ルール別サマリー</div>
                                <div className="mt-3 space-y-2">
                                    {result.summaries.map((summary) => (
                                        <div key={summary.ruleId} className="grid gap-2 rounded border border-surface-800 bg-surface-950/30 p-3 md:grid-cols-[1fr_repeat(4,90px)]">
                                            <div>
                                                <div className="text-sm font-medium text-surface-100">{summary.ruleName}</div>
                                                <div className="mt-1 text-xs text-surface-500">一致 {summary.matchedCount} 件</div>
                                            </div>
                                            <div className="text-xs text-surface-300">一致<br /><span className="text-base text-white">{summary.matchedCount}</span></div>
                                            <div className="text-xs text-emerald-300">適用可能<br /><span className="text-base text-emerald-100">{summary.readyCount}</span></div>
                                            <div className="text-xs text-red-300">競合<br /><span className="text-base text-red-100">{summary.conflictCount}</span></div>
                                            <div className="text-xs text-amber-300">スキップ<br /><span className="text-base text-amber-100">{summary.skippedCount}</span></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded border border-surface-700 bg-surface-900/40 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-medium text-surface-200">対象ファイル（先頭 {result.entries.length} 件）</div>
                                    {result.truncated && (
                                        <div className="text-xs text-surface-500">件数が多いため表示は一部のみです</div>
                                    )}
                                </div>
                                <div className="mt-3 max-h-[360px] overflow-y-auto space-y-2 pr-1">
                                    {result.entries.map((entry) => (
                                        <div key={`${entry.ruleId}:${entry.fileId}:${entry.targetPath}`} className="rounded border border-surface-800 bg-surface-950/30 p-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-sm font-medium text-surface-100">{entry.fileName}</span>
                                                <span className={`inline-flex rounded border px-2 py-0.5 text-[11px] ${getStatusClass(entry.status)}`}>
                                                    {getStatusLabel(entry.status)}
                                                </span>
                                                <span className="rounded border border-surface-700 bg-surface-900/60 px-2 py-0.5 text-[11px] text-surface-300">
                                                    {getActionKindLabel(entry.actionKind)}
                                                </span>
                                                <span className="text-[11px] text-surface-500">{entry.ruleName}</span>
                                            </div>
                                            <div className="mt-2 text-xs text-surface-400 break-all">
                                                <div>現在: {entry.sourcePath}</div>
                                                <div className="mt-1">適用後: {entry.targetPath}</div>
                                                {entry.reason && <div className="mt-1 text-amber-300">{entry.reason}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {applyResult?.success && (
                                <div className="rounded border border-emerald-700/40 bg-emerald-900/10 p-3 text-sm text-emerald-200">
                                    <div className="flex items-center gap-2 font-medium">
                                        <CheckCircle2 size={16} />
                                        適用完了
                                    </div>
                                    <p className="mt-1 text-xs text-emerald-100/90">
                                        適用 {applyResult.appliedCount} 件 / 失敗 {applyResult.failedCount} 件 / スキップ {applyResult.skippedCount} 件
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-surface-700 px-4 py-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded bg-surface-700 px-4 py-2 text-sm text-surface-200 transition-colors hover:bg-surface-600"
                    >
                        閉じる
                    </button>
                    <button
                        type="button"
                        onClick={onApply}
                        disabled={!result.success || result.totalReadyCount === 0 || isRunning}
                        className="inline-flex items-center gap-2 rounded bg-primary-600 px-4 py-2 text-sm text-white transition-colors hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Play size={15} />
                        {isRunning ? '適用中...' : 'この結果で適用'}
                    </button>
                </div>
            </div>
        </div>
    );
};
