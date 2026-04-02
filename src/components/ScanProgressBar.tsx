import React, { useEffect, useRef, useState } from 'react';
import { Loader2, CheckCircle, AlertCircle, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { useUIStore } from '../stores/useUIStore';

interface ScanProgressBarProps {
    onCancel?: () => void;
}

export const ScanProgressBar: React.FC<ScanProgressBarProps> = ({ onCancel }) => {
    const scanProgress = useUIStore((s) => s.scanProgress);
    const isVisible = useUIStore((s) => s.isScanProgressVisible);
    const setVisible = useUIStore((s) => s.setScanProgressVisible);
    const autoDismissPending = useUIStore((s) => s.scanProgressAutoDismissPending);
    const scanProgressLog = useUIStore((s) => s.scanProgressLog);

    // ローカル状態でアニメーション用の遅延を管理
    const [shouldAnimate, setShouldAnimate] = useState(false);
    const [logExpanded, setLogExpanded] = useState(false);
    const logEndRef = useRef<HTMLDivElement>(null);

    // マウント時に少し遅延してからアニメーションを開始
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => setShouldAnimate(true), 10);
            return () => clearTimeout(timer);
        } else {
            setShouldAnimate(false);
        }
    }, [isVisible]);

    useEffect(() => {
        if (!scanProgress || !isVisible || !autoDismissPending) return;
        if (scanProgress.phase !== 'complete' && scanProgress.phase !== 'error') return;

        const timer = setTimeout(() => {
            setVisible(false);
        }, 4000);

        return () => clearTimeout(timer);
    }, [autoDismissPending, isVisible, scanProgress, setVisible]);

    // ログ末尾へ自動スクロール
    useEffect(() => {
        if (logExpanded && logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [scanProgressLog, logExpanded]);

    // アンマウント条件: scanProgress が null の場合のみ
    // 表示/非表示は transform/opacity で制御
    if (!scanProgress) return null;

    const { phase, current, total, currentFile, message, folderName, stats } = scanProgress;
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    const isComplete = phase === 'complete';
    const isError = phase === 'error';
    const isCounting = phase === 'counting';
    const isIndeterminate = isCounting || (phase === 'scanning' && total <= 0);

    const handleMinimize = () => {
        setVisible(false);
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        }
    };

    const phaseLabel = isCounting ? '集計中...'
        : isComplete ? 'スキャン完了'
            : isError ? 'エラー'
                : 'スキャン中';

    return (
        <div
            className={`
                fixed bottom-4 w-96 bg-surface-800 border border-surface-600 rounded-lg shadow-xl overflow-hidden
                transition-all duration-300 ease-out
                ${shouldAnimate && isVisible ? 'left-72 opacity-100' : 'left-4 opacity-0 pointer-events-none'}
            `}
            style={{ zIndex: 1000 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-surface-700 bg-surface-900/50">
                <div className="flex items-center gap-2">
                    {(isCounting || phase === 'scanning') && <Loader2 size={16} className="animate-spin text-blue-400" />}
                    {isComplete && <CheckCircle size={16} className="text-green-400 animate-bounce-once" />}
                    {isError && <AlertCircle size={16} className="text-red-400" />}
                    <span className="text-sm font-medium text-white">
                        {folderName ? `${folderName} / ` : ''}{phaseLabel}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {!isComplete && !isError && onCancel && (
                        <button
                            onClick={handleCancel}
                            className="px-2 py-1 text-xs text-surface-400 hover:text-white hover:bg-surface-700 rounded transition-colors duration-200"
                        >
                            キャンセル
                        </button>
                    )}
                    <button
                        onClick={handleMinimize}
                        className="p-1 text-surface-400 hover:text-white hover:bg-surface-700 rounded transition-colors duration-200"
                        title="最小化"
                    >
                        <Minus size={14} />
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="px-4 py-3">
                <div className="h-2 bg-surface-700 rounded-full overflow-hidden mb-2 relative">
                    {isIndeterminate ? (
                        <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '100%' }} />
                    ) : (
                        <div
                            className={`h-full transition-all duration-300 ease-out relative overflow-hidden ${isError ? 'bg-red-500' :
                                isComplete ? 'bg-green-500' : 'bg-blue-500'
                                }`}
                            style={{ width: `${percentage}%` }}
                        >
                            {!isComplete && !isError && (
                                <div className="absolute inset-0 bg-white/30 animate-shimmer" />
                            )}
                        </div>
                    )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-surface-400">
                    <span className="font-mono">
                        {isCounting ? (
                            'ファイル数を集計中...'
                        ) : isIndeterminate ? (
                            `${current.toLocaleString()}件処理済み`
                        ) : (
                            `${current.toLocaleString()} / ${total.toLocaleString()} (${percentage}%)`
                        )}
                    </span>
                    {stats && (
                        <span className="font-mono text-surface-500">
                            新規 {stats.newCount} / 更新 {stats.updateCount} / スキップ {stats.skipCount}
                            {typeof stats.removedCount === 'number' && stats.removedCount > 0 ? ` / 削除 ${stats.removedCount}` : ''}
                        </span>
                    )}
                </div>
            </div>

            {/* Current File / Message - 固定高さで表示 */}
            <div className="px-4 py-2 border-t border-surface-700 bg-surface-900/50 h-14 flex flex-col justify-center">
                {message && (
                    <p className="text-xs text-primary-400 mb-0.5 truncate">{message}</p>
                )}
                {currentFile && (
                    <p className="text-xs text-surface-400 truncate font-mono" title={currentFile}>
                        {currentFile}
                    </p>
                )}
            </div>

            {/* Log Area */}
            {scanProgressLog.length > 0 && (
                <div className="border-t border-surface-700">
                    <button
                        onClick={() => setLogExpanded(!logExpanded)}
                        className="w-full flex items-center justify-between px-4 py-1.5 text-xs text-surface-400 hover:text-surface-300 hover:bg-surface-700/50 transition-colors duration-150"
                    >
                        <span>ログ ({scanProgressLog.length}件)</span>
                        {logExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                    </button>
                    {logExpanded && (
                        <div className="max-h-32 overflow-y-auto px-4 pb-2 scrollbar-thin scrollbar-track-surface-800 scrollbar-thumb-surface-600">
                            {scanProgressLog.map((entry, i) => (
                                <p key={i} className="text-xs text-surface-500 font-mono truncate leading-5" title={entry}>
                                    {entry}
                                </p>
                            ))}
                            <div ref={logEndRef} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
