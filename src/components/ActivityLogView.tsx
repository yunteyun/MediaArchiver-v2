/**
 * ActivityLogView - アクティビティログ表示コンポーネント
 * 
 * ファイル追加・削除、タグ付け、スキャン履歴をタイムライン形式で表示
 */

import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Tag, X, FolderSearch, Clock } from 'lucide-react';

interface ActivityLog {
    id: number;
    action: 'file_add' | 'file_delete' | 'tag_add' | 'tag_remove' | 'scan_start' | 'scan_end';
    target_id: string | null;
    target_name: string | null;
    details: string | null;
    created_at: number;
}

type ActionFilter = 'all' | 'file' | 'tag' | 'scan';

const actionIcons: Record<string, React.ReactNode> = {
    file_add: <Plus size={16} className="text-green-400" />,
    file_delete: <Trash2 size={16} className="text-red-400" />,
    tag_add: <Tag size={16} className="text-blue-400" />,
    tag_remove: <X size={16} className="text-orange-400" />,
    scan_start: <FolderSearch size={16} className="text-purple-400" />,
    scan_end: <FolderSearch size={16} className="text-purple-400" />,
};

const actionLabels: Record<string, string> = {
    file_add: 'ファイル追加',
    file_delete: 'ファイル削除',
    tag_add: 'タグ付け',
    tag_remove: 'タグ削除',
    scan_start: 'スキャン開始',
    scan_end: 'スキャン完了',
};

const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'たった今';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;

    return date.toLocaleString('ja-JP', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return '今日';
    if (date.toDateString() === yesterday.toDateString()) return '昨日';

    return date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
};

export const ActivityLogView: React.FC = () => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<ActionFilter>('all');
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const LIMIT = 50;

    const loadLogs = async (reset: boolean = false) => {
        setLoading(true);
        try {
            const currentPage = reset ? 0 : page;

            // すべてのログを取得（フィルタはクライアント側で実施）
            const newLogs = await window.electronAPI.getActivityLogs(LIMIT, currentPage * LIMIT);

            if (reset) {
                setLogs(newLogs);
                setPage(0);
            } else {
                setLogs(prev => [...prev, ...newLogs]);
            }

            setHasMore(newLogs.length === LIMIT);
        } catch (e) {
            console.error('Failed to load activity logs:', e);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadLogs(true);
    }, [filter]);

    const handleLoadMore = () => {
        setPage(p => p + 1);
        loadLogs(false);
    };

    // フィルタリング
    const filteredLogs = logs.filter(log => {
        if (filter === 'all') return true;
        if (filter === 'file') return log.action === 'file_add' || log.action === 'file_delete';
        if (filter === 'tag') return log.action === 'tag_add' || log.action === 'tag_remove';
        if (filter === 'scan') return log.action === 'scan_start' || log.action === 'scan_end';
        return true;
    });

    // 日付でグルーピング
    const groupedLogs: Record<string, ActivityLog[]> = {};
    filteredLogs.forEach(log => {
        const dateKey = formatDate(log.created_at);
        if (!groupedLogs[dateKey]) {
            groupedLogs[dateKey] = [];
        }
        groupedLogs[dateKey].push(log);
    });

    const renderLogDetails = (log: ActivityLog) => {
        if (!log.details) return null;

        try {
            const details = JSON.parse(log.details);

            if (log.action === 'file_delete') {
                return (
                    <div className="text-surface-400 text-xs mt-1">
                        {details.path && <div className="truncate">{details.path}</div>}
                        {details.size && <div>サイズ: {(details.size / 1024 / 1024).toFixed(2)} MB</div>}
                    </div>
                );
            }

            if (log.action === 'tag_add' || log.action === 'tag_remove') {
                return (
                    <div className="text-surface-400 text-xs mt-1">
                        {details.fileName && <div className="truncate">{details.fileName}</div>}
                    </div>
                );
            }

            if (log.action === 'scan_end') {
                return (
                    <div className="text-surface-400 text-xs mt-1">
                        追加: {details.added || 0}, 更新: {details.updated || 0}, 削除: {details.removed || 0}
                    </div>
                );
            }
        } catch (e) {
            // JSON parse error
        }

        return null;
    };

    return (
        <div className="bg-surface-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Clock size={16} className="text-primary-400" />
                    アクティビティログ
                </h2>

                {/* フィルタボタン */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1 text-xs rounded ${filter === 'all'
                            ? 'bg-primary-600 text-white'
                            : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
                            }`}
                    >
                        すべて
                    </button>
                    <button
                        onClick={() => setFilter('file')}
                        className={`px-3 py-1 text-xs rounded ${filter === 'file'
                            ? 'bg-primary-600 text-white'
                            : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
                            }`}
                    >
                        ファイル
                    </button>
                    <button
                        onClick={() => setFilter('tag')}
                        className={`px-3 py-1 text-xs rounded ${filter === 'tag'
                            ? 'bg-primary-600 text-white'
                            : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
                            }`}
                    >
                        タグ
                    </button>
                    <button
                        onClick={() => setFilter('scan')}
                        className={`px-3 py-1 text-xs rounded ${filter === 'scan'
                            ? 'bg-primary-600 text-white'
                            : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
                            }`}
                    >
                        スキャン
                    </button>
                </div>
            </div>

            {loading && logs.length === 0 ? (
                <div className="text-center text-surface-400 py-8">読み込み中...</div>
            ) : logs.length === 0 ? (
                <div className="text-center text-surface-400 py-8">アクティビティログがありません</div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedLogs).map(([date, dateLogs]) => (
                        <div key={date}>
                            <div className="text-xs font-semibold text-surface-400 mb-2">{date}</div>
                            <div className="space-y-2">
                                {dateLogs.map(log => (
                                    <div key={log.id} className="flex gap-3 py-2 border-l-2 border-surface-700 pl-3 hover:border-primary-500 transition-colors">
                                        <div className="flex-shrink-0 mt-0.5">
                                            {actionIcons[log.action]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-surface-200">
                                                    {actionLabels[log.action]}
                                                </span>
                                                {log.target_name && (
                                                    <span className="text-sm text-white font-medium truncate">
                                                        {log.target_name}
                                                    </span>
                                                )}
                                                <span className="text-xs text-surface-500 ml-auto flex-shrink-0">
                                                    {formatTime(log.created_at)}
                                                </span>
                                            </div>
                                            {renderLogDetails(log)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {hasMore && (
                        <button
                            onClick={handleLoadMore}
                            disabled={loading}
                            className="w-full py-2 text-sm text-primary-400 hover:text-primary-300 disabled:text-surface-600"
                        >
                            {loading ? '読み込み中...' : 'さらに読み込む'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
