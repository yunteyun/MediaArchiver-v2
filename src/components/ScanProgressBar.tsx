import React from 'react';
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useUIStore } from '../stores/useUIStore';

interface ScanProgressBarProps {
    onCancel?: () => void;
}

export const ScanProgressBar: React.FC<ScanProgressBarProps> = ({ onCancel }) => {
    const scanProgress = useUIStore((s) => s.scanProgress);
    const setScanProgress = useUIStore((s) => s.setScanProgress);

    if (!scanProgress) return null;

    const { phase, current, total, currentFile, message, stats } = scanProgress;
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    const isComplete = phase === 'complete';
    const isError = phase === 'error';
    const isCounting = phase === 'counting';

    const handleClose = () => {
        setScanProgress(null);
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        }
    };

    return (
        <div className="fixed bottom-4 right-4 w-96 bg-surface-800 border border-surface-600 rounded-lg shadow-xl z-50 overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-surface-700">
                <div className="flex items-center gap-2">
                    {isCounting && <Loader2 size={16} className="animate-spin text-blue-400" />}
                    {phase === 'scanning' && <Loader2 size={16} className="animate-spin text-blue-400" />}
                    {isComplete && <CheckCircle size={16} className="text-green-400 animate-bounce-once" />}
                    {isError && <AlertCircle size={16} className="text-red-400" />}
                    <span className="text-sm font-medium text-white">
                        {isCounting ? 'ファイルカウント中...' :
                            isComplete ? 'スキャン完了' :
                                isError ? 'エラー' : 'スキャン中'}
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
                    {(isComplete || isError) && (
                        <button
                            onClick={handleClose}
                            className="p-1 text-surface-400 hover:text-white hover:bg-surface-700 rounded transition-colors duration-200"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="px-4 py-3">
                <div className="h-2 bg-surface-700 rounded-full overflow-hidden mb-2">
                    <div
                        className={`h-full transition-all duration-300 ease-out ${isError ? 'bg-red-500' :
                            isComplete ? 'bg-green-500' : 'bg-blue-500'
                            } ${!isComplete && !isError ? 'animate-pulse-subtle' : ''}`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-surface-400">
                    <span>
                        {isCounting ? (
                            'カウント中...'
                        ) : (
                            `${current.toLocaleString()} / ${total.toLocaleString()} (${percentage}%)`
                        )}
                    </span>
                    {stats && (
                        <span>
                            新規: {stats.newCount} / 更新: {stats.updateCount} / スキップ: {stats.skipCount}
                        </span>
                    )}
                </div>
            </div>

            {/* Current File / Message */}
            {(currentFile || message) && (
                <div className="px-4 py-2 border-t border-surface-700 bg-surface-900/50">
                    <p className="text-xs text-surface-400 truncate" title={currentFile || message}>
                        {message || currentFile}
                    </p>
                </div>
            )}
        </div>
    );
};
