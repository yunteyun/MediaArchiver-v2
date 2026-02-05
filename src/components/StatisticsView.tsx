/**
 * StatisticsView - ライブラリ統計表示コンポーネント
 * 
 * recharts を使用したグラフ表示
 */

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line, CartesianGrid } from 'recharts';
import { BarChart3, FolderOpen, Tag, File, HardDrive, RefreshCw, TrendingUp, AlertCircle } from 'lucide-react';
import { ActivityLogView } from './ActivityLogView';
import { toMediaUrl } from '../utils/mediaPath';

interface LibraryStats {
    totalFiles: number;
    totalSize: number;
    byType: { type: string; count: number; size: number }[];
    byTag: { tagId: string; tagName: string; tagColor: string; count: number }[];
    byFolder: { folderId: string; folderPath: string; count: number; size: number }[];
    recentFiles: any[];
    monthlyTrend: { month: string; count: number }[];
    untaggedStats: { tagged: number; untagged: number };
    ratingStats: { rating: string; count: number }[];
    largeFiles: { id: string; name: string; path: string; type: string; size: number; thumbnailPath: string | null }[];
    extensionStats: { type: string; extension: string; count: number }[];
    resolutionStats: { resolution: string; count: number }[];
}

const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const typeLabels: Record<string, string> = {
    image: '画像',
    video: '動画',
    archive: '書庫',
    audio: '音声',
};

const typeColors: Record<string, string> = {
    image: '#3b82f6',   // 青
    video: '#22c55e',   // 緑
    archive: '#f97316', // オレンジ
    audio: '#a855f7',   // 紫
};

export const StatisticsView: React.FC = () => {
    const [stats, setStats] = useState<LibraryStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await window.electronAPI.getLibraryStats();
            console.log('Statistics loaded:', data);
            setStats(data);
        } catch (e: any) {
            console.error('Failed to load stats:', e);
            setError(e.message || 'Unknown error');
        }
        setLoading(false);
    };

    // Delay rendering to allow container size to be calculated
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        loadStats();
        // Delay chart rendering to avoid size calculation issues
        const timer = setTimeout(() => setIsReady(true), 100);
        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin mr-2">
                    <RefreshCw size={24} className="text-primary-400" />
                </div>
                <span className="text-surface-400">統計を読み込み中...</span>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-surface-500 gap-4">
                <p>統計データを取得できませんでした</p>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                    onClick={loadStats}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded"
                >
                    再試行
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 overflow-y-auto h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    <BarChart3 size={24} className="text-primary-400" />
                    ライブラリ統計
                </h1>
                <button
                    onClick={loadStats}
                    className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 rounded text-sm flex items-center gap-1"
                >
                    <RefreshCw size={14} />
                    更新
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-surface-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-surface-400 text-sm mb-1">
                        <File size={16} />
                        総ファイル数
                    </div>
                    <div className="text-2xl font-bold text-white">{stats.totalFiles.toLocaleString()}</div>
                </div>
                <div className="bg-surface-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-surface-400 text-sm mb-1">
                        <HardDrive size={16} />
                        総サイズ
                    </div>
                    <div className="text-2xl font-bold text-white">{formatBytes(stats.totalSize)}</div>
                </div>
                <div className="bg-surface-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-surface-400 text-sm mb-1">
                        <FolderOpen size={16} />
                        フォルダ数
                    </div>
                    <div className="text-2xl font-bold text-white">{stats.byFolder.length}</div>
                </div>
                <div className="bg-surface-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-surface-400 text-sm mb-1">
                        <Tag size={16} />
                        使用タグ数
                    </div>
                    <div className="text-2xl font-bold text-white">{stats.byTag.length}</div>
                </div>
            </div>

            {/* File Type Stats - Pie Chart */}
            <div className="bg-surface-800 rounded-lg p-4">
                <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    ファイルタイプ別
                </h2>
                <div className="grid grid-cols-[auto_1fr] gap-6 items-center">
                    <div className="h-48 w-48">
                        <PieChart width={192} height={192}>
                            <Pie
                                data={stats.byType.map(t => ({
                                    name: typeLabels[t.type] || t.type,
                                    value: t.count,
                                    color: typeColors[t.type] || '#6366f1'
                                }))}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={70}
                                dataKey="value"
                                stroke="#1e293b"
                                strokeWidth={2}
                            >
                                {stats.byType.map((t, idx) => (
                                    <Cell key={`cell-${idx}`} fill={typeColors[t.type] || '#6366f1'} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                labelStyle={{ color: '#f1f5f9' }}
                            />
                        </PieChart>
                    </div>
                    <div className="flex-1 space-y-3">
                        {stats.byType.map(t => (
                            <div key={t.type} className="flex items-center gap-3">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: typeColors[t.type] || '#6366f1' }}
                                />
                                <div className="w-12 text-surface-300 text-sm">
                                    {typeLabels[t.type] || t.type}
                                </div>
                                <div className="text-white font-medium">
                                    {t.count.toLocaleString()}
                                </div>
                                <div className="text-surface-400 text-sm">
                                    ({formatBytes(t.size)})
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tag Stats - Bar Chart with recharts */}
            {stats.byTag.length > 0 && (
                <div className="bg-surface-800 rounded-lg p-4">
                    <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <Tag size={16} className="text-primary-400" />
                        タグ別統計（上位20件）
                    </h2>
                    <div className="h-64">
                        {isReady && (
                            <ResponsiveContainer width="100%" height="100%" minWidth={200}>
                                <BarChart
                                    data={stats.byTag.slice(0, 10)}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                                >
                                    <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                                    <YAxis
                                        type="category"
                                        dataKey="tagName"
                                        stroke="#94a3b8"
                                        fontSize={12}
                                        width={70}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                        labelStyle={{ color: '#f1f5f9' }}
                                    />
                                    <Bar dataKey="count" name="ファイル数" radius={[0, 4, 4, 0]}>
                                        {stats.byTag.slice(0, 10).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.tagColor || '#6366f1'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            )}

            {/* Folder Stats - Bar Chart */}
            {stats.byFolder.length > 0 && (
                <div className="bg-surface-800 rounded-lg p-4">
                    <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <FolderOpen size={16} className="text-primary-400" />
                        フォルダ別統計（ファイル数）
                    </h2>
                    <div className="h-64">
                        {isReady && (
                            <ResponsiveContainer width="100%" height="100%" minWidth={200}>
                                <BarChart
                                    data={stats.byFolder.map(f => ({
                                        name: f.folderPath.split('\\').pop() || f.folderPath,
                                        fullPath: f.folderPath,
                                        count: f.count,
                                        size: f.size
                                    }))}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                                >
                                    <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        stroke="#94a3b8"
                                        fontSize={12}
                                        width={110}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                        labelStyle={{ color: '#f1f5f9' }}
                                        formatter={(value: any, name?: string, props?: any) => {
                                            if (name === 'count' && props) {
                                                return [`${value.toLocaleString()}件 (${formatBytes(props.payload.size)})`, 'ファイル数'];
                                            }
                                            return value;
                                        }}
                                    />
                                    <Bar dataKey="count" name="ファイル数" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            )}

            {/* Monthly Trend - Line Chart */}
            {stats.monthlyTrend && stats.monthlyTrend.length > 0 && (
                <div className="bg-surface-800 rounded-lg p-4">
                    <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <TrendingUp size={16} className="text-primary-400" />
                        月別登録推移（過去12ヶ月）
                    </h2>
                    <div className="h-64 min-w-0 min-h-0">
                        {isReady && (
                            <ResponsiveContainer width="100%" height="100%" minWidth={200}>
                                <LineChart data={stats.monthlyTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                                    <YAxis stroke="#94a3b8" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                        labelStyle={{ color: '#f1f5f9' }}
                                    />
                                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            )}

            {/* Untagged Files - Pie Chart */}
            {stats.untaggedStats && (
                <div className="bg-surface-800 rounded-lg p-4">
                    <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <AlertCircle size={16} className="text-primary-400" />
                        整理状況（タグ付け）
                    </h2>
                    <div className="grid grid-cols-[auto_1fr] gap-6 items-center">
                        <div className="h-48 w-48">
                            <PieChart width={192} height={192}>
                                <Pie
                                    data={[
                                        { name: 'タグあり', value: stats.untaggedStats.tagged, color: '#22c55e' },
                                        { name: 'タグなし', value: stats.untaggedStats.untagged, color: '#ef4444' }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={70}
                                    dataKey="value"
                                    stroke="#1e293b"
                                    strokeWidth={2}
                                >
                                    <Cell fill="#22c55e" />
                                    <Cell fill="#ef4444" />
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                    labelStyle={{ color: '#f1f5f9' }}
                                />
                            </PieChart>
                        </div>
                        <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                <div className="w-20 text-surface-300 text-sm">タグあり</div>
                                <div className="text-white font-medium">{stats.untaggedStats.tagged.toLocaleString()}</div>
                                <div className="text-surface-400 text-sm">
                                    ({((stats.untaggedStats.tagged / stats.totalFiles) * 100).toFixed(1)}%)
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <div className="w-20 text-surface-300 text-sm">タグなし</div>
                                <div className="text-white font-medium">{stats.untaggedStats.untagged.toLocaleString()}</div>
                                <div className="text-surface-400 text-sm">
                                    ({((stats.untaggedStats.untagged / stats.totalFiles) * 100).toFixed(1)}%)
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Rating Distribution - Bar Chart */}
            {stats.ratingStats && stats.ratingStats.length > 0 && (
                <div className="bg-surface-800 rounded-lg p-4">
                    <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <Tag size={16} className="text-amber-400" />
                        評価分布（★1-5）
                    </h2>
                    <div className="h-48 min-w-0 min-h-0">
                        {isReady && (
                            <ResponsiveContainer width="100%" height="100%" minWidth={200}>
                                <BarChart data={stats.ratingStats} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="rating" stroke="#94a3b8" fontSize={12} />
                                    <YAxis stroke="#94a3b8" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                        labelStyle={{ color: '#f1f5f9' }}
                                    />
                                    <Bar dataKey="count" name="ファイル数" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            )}

            {/* Large Files Top 10 */}
            {stats.largeFiles && stats.largeFiles.length > 0 && (
                <div className="bg-surface-800 rounded-lg p-4">
                    <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <HardDrive size={16} className="text-red-400" />
                        巨大ファイル Top 10
                    </h2>
                    <div className="space-y-2">
                        {stats.largeFiles.map((file, idx) => (
                            <div key={file.id} className="flex items-center gap-3 py-2 border-b border-surface-700 last:border-0">
                                <div className="text-surface-400 text-sm w-6">{idx + 1}</div>
                                {file.thumbnailPath && (
                                    <img
                                        src={toMediaUrl(file.thumbnailPath)}
                                        alt={file.name}
                                        className="w-12 h-12 object-cover rounded"
                                    />
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="text-surface-200 text-sm truncate">{file.name}</div>
                                    <div className="text-surface-500 text-xs truncate">{file.path}</div>
                                </div>
                                <div className="text-white font-medium">{formatBytes(file.size)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Extension Ranking */}
            {stats.extensionStats && stats.extensionStats.length > 0 && (
                <div className="bg-surface-800 rounded-lg p-4">
                    <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <File size={16} className="text-purple-400" />
                        拡張子ランキング（Top 20）
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {stats.extensionStats.map((ext, idx) => (
                            <div key={`${ext.type}-${ext.extension}`} className="bg-surface-700 rounded p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-surface-400 text-xs">#{idx + 1}</span>
                                    <span className="text-surface-300 text-sm font-mono">.{ext.extension}</span>
                                </div>
                                <div className="text-white font-medium">{ext.count.toLocaleString()}</div>
                                <div className="text-surface-500 text-xs">{typeLabels[ext.type] || ext.type}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Resolution Distribution - Pie Chart */}
            {stats.resolutionStats && stats.resolutionStats.length > 0 && (
                <div className="bg-surface-800 rounded-lg p-4">
                    <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <BarChart3 size={16} className="text-cyan-400" />
                        解像度分布（動画・画像）
                    </h2>
                    <div className="grid grid-cols-[auto_1fr] gap-6 items-center">
                        <div className="h-48 w-48">
                            <PieChart width={192} height={192}>
                                <Pie
                                    data={stats.resolutionStats}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={70}
                                    dataKey="count"
                                    nameKey="resolution"
                                    stroke="#1e293b"
                                    strokeWidth={2}
                                >
                                    <Cell fill="#06b6d4" />
                                    <Cell fill="#3b82f6" />
                                    <Cell fill="#8b5cf6" />
                                    <Cell fill="#ec4899" />
                                    <Cell fill="#64748b" />
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                    labelStyle={{ color: '#f1f5f9' }}
                                />
                            </PieChart>
                        </div>
                        <div className="flex-1 space-y-2">
                            {stats.resolutionStats.map((res, idx) => (
                                <div key={res.resolution} className="flex items-center gap-3">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{
                                            backgroundColor: ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'][idx % 5]
                                        }}
                                    />
                                    <div className="flex-1 text-surface-300 text-sm">{res.resolution}</div>
                                    <div className="text-white font-medium">{res.count.toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Activity Log */}
            <ActivityLogView />
        </div>
    );
};
