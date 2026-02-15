import React, { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// Local type definitions (duplicated from electron.d.ts for type safety)
interface DiagnosticResult {
    totalThumbnails: number;
    orphanedCount: number;
    totalOrphanedSize: number;
    orphanedFiles: string[];
    samples: { path: string; size: number }[];
}
export const StorageCleanupSection: React.FC = () => {
    const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
    const [isCleanupConfirmOpen, setCleanupConfirmOpen] = useState(false);
    const [isCleaningUp, setIsCleaningUp] = useState(false);
    const [isDiagnosing, setIsDiagnosing] = useState(false);

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    };

    const handleDiagnose = async () => {
        setIsDiagnosing(true);
        try {
            const result = await window.electronAPI.diagnoseThumbnails();
            setDiagnosticResult(result);

            if (result.orphanedCount === 0) {
                toast.success('孤立サムネイルは見つかりませんでした');
            } else {
                const sizeMB = (result.totalOrphanedSize / 1024 / 1024).toFixed(2);
                toast.info(`${result.orphanedCount}件の孤立サムネイルを検出しました (${sizeMB} MB)`);
            }
        } catch (error: any) {
            toast.error('診断中にエラーが発生しました');
            console.error(error);
        } finally {
            setIsDiagnosing(false);
        }
    };

    const handleCleanup = async () => {
        setIsCleaningUp(true);
        setCleanupConfirmOpen(false);

        try {
            const result = await window.electronAPI.cleanupOrphanedThumbnails();

            if (result.success) {
                const sizeMB = (result.freedBytes / 1024 / 1024).toFixed(2);
                toast.success(
                    `${result.deletedCount}件のサムネイルを削除しました (${sizeMB} MB を解放)`
                );

                // 再診断して結果を更新
                const newDiagnostic = await window.electronAPI.diagnoseThumbnails();
                setDiagnosticResult(newDiagnostic);
            } else {
                toast.error(
                    `削除中に${result.errors.length}件のエラーが発生しました。` +
                    `詳細はログを確認してください。`
                );
                console.error('Cleanup errors:', result.errors);
            }
        } catch (error: any) {
            toast.error('クリーンアップ中にエラーが発生しました');
            console.error(error);
        } finally {
            setIsCleaningUp(false);
        }
    };

    return (
        <>
            <div>
                <h3 className="text-sm font-semibold text-white mb-3">ストレージ診断</h3>
                <p className="text-sm text-surface-400 mb-3">
                    データベースに存在しない孤立サムネイルを検出します。
                </p>

                {/* 診断結果表示 */}
                {diagnosticResult && (
                    <div className="bg-surface-900 rounded p-3 mb-3 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-surface-400">総サムネイル数:</span>
                            <span className="font-mono text-surface-200">{diagnosticResult.totalThumbnails}件</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-surface-400">孤立サムネイル:</span>
                            <span className="font-mono text-surface-200">{diagnosticResult.orphanedCount}件</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-surface-400">無駄な容量:</span>
                            <span className="font-mono text-surface-200">
                                {formatFileSize(diagnosticResult.totalOrphanedSize)}
                            </span>
                        </div>
                    </div>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={handleDiagnose}
                        disabled={isDiagnosing || isCleaningUp}
                        className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDiagnosing ? '診断中...' : '診断を実行'}
                    </button>

                    {diagnosticResult && diagnosticResult.orphanedCount > 0 && (
                        <button
                            onClick={() => setCleanupConfirmOpen(true)}
                            disabled={isCleaningUp || isDiagnosing}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Trash2 size={16} />
                            {isCleaningUp ? 'クリーンアップ中...' : 'クリーンアップ実行'}
                        </button>
                    )}
                </div>
            </div>

            {/* Cleanup Confirmation Dialog */}
            {isCleanupConfirmOpen && diagnosticResult && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center" style={{ zIndex: 'calc(var(--z-modal) + 1)' }}>
                    <div className="bg-surface-800 rounded-lg p-6 max-w-md mx-4">
                        <h3 className="text-lg font-semibold mb-4 text-white">
                            ストレージクリーンアップの確認
                        </h3>

                        <div className="space-y-3 mb-6">
                            <p className="text-surface-300">
                                以下のサムネイルを削除します:
                            </p>

                            <div className="bg-surface-900 rounded p-3 space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-surface-400">削除件数:</span>
                                    <span className="font-mono text-surface-200">{diagnosticResult.orphanedCount}件</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-surface-400">解放容量:</span>
                                    <span className="font-mono text-surface-200">
                                        {formatFileSize(diagnosticResult.totalOrphanedSize)}
                                    </span>
                                </div>
                            </div>

                            <p className="text-yellow-400 text-sm flex items-start gap-2">
                                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                                <span>
                                    この操作は取り消せません。
                                    削除されたサムネイルは再生成が必要です。
                                </span>
                            </p>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setCleanupConfirmOpen(false)}
                                className="px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded text-surface-200 transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleCleanup}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded text-white transition-colors"
                            >
                                削除する
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
