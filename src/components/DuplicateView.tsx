/**
 * DuplicateView - 重複ファイルビュー
 */

import React, { useEffect, useCallback } from 'react';
import { Copy, Trash2, Clock, FolderOpen, CheckSquare, Square, X, Loader } from 'lucide-react';
import { useDuplicateStore } from '../stores/useDuplicateStore';
import { useUIStore } from '../stores/useUIStore';
import { toMediaUrl } from '../utils/mediaPath';

// ファイルサイズを人間が読める形式に変換
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// 日付を人間が読める形式に変換
function formatDate(timestamp: number): string {
    if (!timestamp) return '不明';
    return new Date(timestamp).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

export const DuplicateView: React.FC = () => {
    const {
        groups,
        stats,
        isSearching,
        progress,
        selectedFileIds,
        isDeleting,
        startSearch,
        cancelSearch,
        setProgress,
        selectFile,
        deselectFile,
        selectByStrategy,
        deleteSelectedFiles,
        reset
    } = useDuplicateStore();

    const closeDuplicateView = useUIStore((s) => s.closeDuplicateView);

    // 進捗イベントをリッスン
    useEffect(() => {
        const unsubscribe = window.electronAPI.onDuplicateProgress((progress) => {
            setProgress(progress);
        });
        return unsubscribe;
    }, [setProgress]);

    // ファイルの選択/解除
    const toggleFileSelection = useCallback((fileId: string) => {
        if (selectedFileIds.has(fileId)) {
            deselectFile(fileId);
        } else {
            selectFile(fileId);
        }
    }, [selectedFileIds, selectFile, deselectFile]);

    // 削除確認
    const handleDelete = useCallback(async () => {
        if (selectedFileIds.size === 0) return;

        const confirmed = window.confirm(
            `${selectedFileIds.size}個のファイルを削除しますか？\nこの操作は取り消せません。`
        );

        if (confirmed) {
            await deleteSelectedFiles();
        }
    }, [selectedFileIds, deleteSelectedFiles]);

    // 検索中の表示
    if (isSearching && progress) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface-900">
                <Loader className="w-12 h-12 text-primary-400 animate-spin mb-4" />
                <h2 className="text-xl font-medium text-surface-100 mb-2">
                    重複ファイルを検索中...
                </h2>
                <p className="text-surface-400 mb-4">
                    {progress.phase === 'analyzing' && '同じサイズのファイルを分析中...'}
                    {progress.phase === 'hashing' && (
                        <>
                            ハッシュ計算中: {progress.current}/{progress.total}
                            {progress.currentFile && (
                                <span className="block text-sm truncate max-w-md mt-1">
                                    {progress.currentFile}
                                </span>
                            )}
                        </>
                    )}
                </p>
                {progress.phase === 'hashing' && (
                    <div className="w-64 h-2 bg-surface-700 rounded-full overflow-hidden mb-4">
                        <div
                            className="h-full bg-primary-500 transition-all duration-200"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                    </div>
                )}
                <button
                    onClick={cancelSearch}
                    className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-surface-200 rounded-lg transition-colors"
                >
                    キャンセル
                </button>
            </div>
        );
    }

    // 結果がない場合
    if (!isSearching && groups.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface-900">
                <Copy className="w-16 h-16 text-surface-600 mb-4" />
                <h2 className="text-xl font-medium text-surface-100 mb-2">
                    重複ファイル検出
                </h2>
                <p className="text-surface-400 mb-6 text-center max-w-md">
                    同じ内容を持つファイルを検出します。<br />
                    サイズが同じファイルのみハッシュ値を計算するため、高速に動作します。
                </p>
                <button
                    onClick={startSearch}
                    className="px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <Copy className="w-5 h-5" />
                    重複チェック開始
                </button>
            </div>
        );
    }

    // 重複グループ一覧
    return (
        <div className="flex-1 flex flex-col bg-surface-900 overflow-hidden">
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-4 border-b border-surface-700">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-medium text-surface-100 flex items-center gap-2">
                        <Copy className="w-5 h-5 text-primary-400" />
                        重複ファイル
                    </h2>
                    {stats && (
                        <span className="text-sm text-surface-400">
                            {stats.totalGroups}グループ, {stats.totalFiles}ファイル,
                            {formatFileSize(stats.wastedSpace)}の無駄
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={startSearch}
                        disabled={isSearching}
                        className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-200 rounded text-sm transition-colors disabled:opacity-50"
                    >
                        再検索
                    </button>
                    {selectedFileIds.size > 0 && (
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-sm transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                            {isDeleting ? (
                                <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                            {selectedFileIds.size}件を削除
                        </button>
                    )}
                    <button
                        onClick={() => {
                            reset();
                            closeDuplicateView();
                        }}
                        className="p-1.5 text-surface-400 hover:text-surface-200 transition-colors"
                        title="閉じる"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* グループ一覧 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {groups.map((group) => (
                    <div key={group.hash} className="bg-surface-800 rounded-lg overflow-hidden">
                        {/* グループヘッダー */}
                        <div className="flex items-center justify-between px-4 py-3 bg-surface-750 border-b border-surface-700">
                            <span className="text-surface-200 font-medium">
                                {group.count}ファイル, {formatFileSize(group.size)}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => selectByStrategy(group.hash, 'newest')}
                                    className="px-2 py-1 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 rounded transition-colors"
                                    title="最も新しいファイルを残す"
                                >
                                    新しい方を残す
                                </button>
                                <button
                                    onClick={() => selectByStrategy(group.hash, 'oldest')}
                                    className="px-2 py-1 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 rounded transition-colors"
                                    title="最も古いファイルを残す"
                                >
                                    古い方を残す
                                </button>
                                <button
                                    onClick={() => selectByStrategy(group.hash, 'shortest_path')}
                                    className="px-2 py-1 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 rounded transition-colors"
                                    title="パスが短い方を残す"
                                >
                                    パスが短い方
                                </button>
                            </div>
                        </div>

                        {/* ファイル一覧 */}
                        <div className="divide-y divide-surface-700">
                            {group.files.map((file) => {
                                const isSelected = selectedFileIds.has(file.id);
                                return (
                                    <div
                                        key={file.id}
                                        onClick={() => toggleFileSelection(file.id)}
                                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isSelected
                                            ? 'bg-red-900/20 hover:bg-red-900/30'
                                            : 'hover:bg-surface-750'
                                            }`}
                                    >
                                        {/* チェックボックス */}
                                        <div className={`flex-shrink-0 ${isSelected ? 'text-red-400' : 'text-surface-500'}`}>
                                            {isSelected ? (
                                                <CheckSquare className="w-5 h-5" />
                                            ) : (
                                                <Square className="w-5 h-5" />
                                            )}
                                        </div>

                                        {/* サムネイル */}
                                        {file.thumbnail_path ? (
                                            <img
                                                src={toMediaUrl(file.thumbnail_path)}
                                                alt=""
                                                className="w-12 h-12 object-cover rounded flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-surface-700 rounded flex-shrink-0" />
                                        )}

                                        {/* ファイル情報 */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium truncate ${isSelected ? 'text-red-300' : 'text-surface-200'}`}>
                                                {file.name}
                                            </p>
                                            <p className="text-sm text-surface-500 truncate flex items-center gap-2">
                                                <FolderOpen className="w-3 h-3 flex-shrink-0" />
                                                {file.path}
                                            </p>
                                        </div>

                                        {/* 日付 */}
                                        <div className="text-sm text-surface-400 flex items-center gap-1 flex-shrink-0">
                                            <Clock className="w-3 h-3" />
                                            {formatDate(file.mtime_ms || file.created_at)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
