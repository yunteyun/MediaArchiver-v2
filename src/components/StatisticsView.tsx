/**
 * StatisticsView - ライブラリ統計表示コンポーネント
 * 
 * recharts を使用したグラフ表示
 */

import React, { useEffect, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { BarChart3, FolderOpen, Tag, File, HardDrive, RefreshCw, TrendingUp, AlertCircle, Image } from 'lucide-react';
import { ActivityLogView } from './ActivityLogView';
import { useLibraryStats } from '../hooks/useLibraryStats';
import { toMediaUrl } from '../utils/mediaPath';
import { resolveTagColorHex } from '../utils/fileExport';

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

const neutralTagColors = new Set(['gray', 'slate', 'zinc', 'neutral', 'stone']);

const tagChartPalette = [
    '#60a5fa',
    '#34d399',
    '#f59e0b',
    '#f472b6',
    '#a78bfa',
    '#22d3ee',
    '#fb7185',
    '#84cc16',
    '#38bdf8',
    '#f97316',
];

const chartTooltipContentStyle = {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '10px',
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.45)',
};

const chartTooltipLabelStyle = {
    color: '#f8fafc',
    fontWeight: 600,
};

const chartTooltipItemStyle = {
    color: '#cbd5e1',
};

const chartTooltipWrapperStyle = {
    outline: 'none',
    zIndex: 20,
};

const chartHoverCursor = {
    fill: 'rgba(59, 130, 246, 0.12)',
};

function getTagChartColor(tagColor: string | undefined, index: number): string {
    if (!tagColor || neutralTagColors.has(tagColor)) {
        return tagChartPalette[index % tagChartPalette.length];
    }

    const resolved = resolveTagColorHex(tagColor);
    return resolved === '#4b5563'
        ? tagChartPalette[index % tagChartPalette.length]
        : resolved;
}

interface MeasuredChartAreaProps {
    className: string;
    children: (size: { width: number; height: number }) => React.ReactNode;
}

const MeasuredChartArea: React.FC<MeasuredChartAreaProps> = ({ className, children }) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const updateSize = () => {
            const width = Math.round(element.clientWidth);
            const height = Math.round(element.clientHeight);
            setSize((prev) => (
                prev.width === width && prev.height === height
                    ? prev
                    : { width, height }
            ));
        };

        updateSize();

        const observer = new ResizeObserver(() => {
            updateSize();
        });
        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, []);

    return (
        <div ref={containerRef} className={className}>
            {size.width > 0 && size.height > 0 ? children(size) : null}
        </div>
    );
};

interface StatisticsViewProps {
    embedded?: boolean;
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({ embedded = false }) => {
    const [regenerating, setRegenerating] = useState(false);
    const [regenProgress, setRegenProgress] = useState<{ current: number; total: number } | null>(null);
    const { stats, loading, error, loadStats } = useLibraryStats();

    // Delay rendering to allow container size to be calculated
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => setIsReady(true), 180);
        return () => clearTimeout(timer);
    }, []);

    const handleRegenerateAll = async () => {
        if (regenerating) return;
        setRegenerating(true);
        setRegenProgress({ current: 0, total: 0 });

        const cleanup = window.electronAPI.onThumbnailRegenerateProgress((progress) => {
            setRegenProgress(progress);
        });

        try {
            const result = await window.electronAPI.regenerateAllThumbnails();
            console.log('Regeneration complete:', result);
            // 完了後に統計を再読み込み
            await loadStats();
        } catch (e) {
            console.error('Regeneration failed:', e);
        } finally {
            cleanup();
            setRegenerating(false);
            setRegenProgress(null);
        }
    };

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
        <div className={`h-full overflow-y-auto ${embedded ? 'p-5' : 'p-6'} space-y-6`}>
            {/* Header */}
            {!embedded && (
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <BarChart3 size={24} className="text-primary-400" />
                        ライブラリ統計
                    </h1>
                    <button
                        onClick={() => void loadStats()}
                        className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 rounded text-sm flex items-center gap-1"
                    >
                        <RefreshCw size={14} />
                        更新
                    </button>
                </div>
            )}

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

            {/* Phase 24: サムネイル容量カード */}
            <div className="bg-surface-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Image size={16} className="text-primary-400" />
                        サムネイルキャッシュ
                    </h2>
                    <button
                        onClick={handleRegenerateAll}
                        disabled={regenerating}
                        className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs flex items-center gap-1.5 text-white transition-colors"
                    >
                        <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
                        {regenerating ? 'WebP変換中...' : 'WebP一括変換'}
                    </button>
                </div>
                <div className="flex items-center gap-6">
                    <div>
                        <div className="text-surface-400 text-xs mb-0.5">現在の容量</div>
                        <div className="text-xl font-bold text-white">{formatBytes(stats.thumbnailSize ?? 0)}</div>
                    </div>
                    {regenProgress && regenProgress.total > 0 && (
                        <div className="flex-1">
                            <div className="flex justify-between text-xs text-surface-400 mb-1">
                                <span>変換中...</span>
                                <span>{regenProgress.current} / {regenProgress.total}</span>
                            </div>
                            <div className="w-full bg-surface-700 rounded-full h-2">
                                <div
                                    className="bg-primary-500 h-2 rounded-full transition-all"
                                    style={{ width: `${(regenProgress.current / regenProgress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* File Type Stats - Pie Chart */}
            <div className="bg-surface-800 rounded-lg p-4">
                <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    ファイルタイプ別
                </h2>
                <div className="grid grid-cols-[auto_1fr] gap-6 items-center">
                    <div className="h-48 w-48">
                        {isReady && (
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
                                    contentStyle={chartTooltipContentStyle}
                                    labelStyle={chartTooltipLabelStyle}
                                    itemStyle={chartTooltipItemStyle}
                                    wrapperStyle={chartTooltipWrapperStyle}
                                />
                            </PieChart>
                        )}
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
                    <MeasuredChartArea className="h-64 min-w-0 min-h-0">
                        {(size) => isReady ? (
                            <BarChart
                                width={size.width}
                                height={size.height}
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
                                        contentStyle={chartTooltipContentStyle}
                                        labelStyle={chartTooltipLabelStyle}
                                        itemStyle={chartTooltipItemStyle}
                                        wrapperStyle={chartTooltipWrapperStyle}
                                        cursor={chartHoverCursor}
                                    />
                                    <Bar dataKey="count" name="ファイル数" radius={[0, 4, 4, 0]}>
                                        {stats.byTag.slice(0, 10).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={getTagChartColor(entry.tagColor, index)} />
                                        ))}
                                    </Bar>
                            </BarChart>
                        ) : null}
                    </MeasuredChartArea>
                </div>
            )}

            {/* Folder Stats - Bar Chart */}
            {stats.byFolder.length > 0 && (
                <div className="bg-surface-800 rounded-lg p-4">
                    <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <FolderOpen size={16} className="text-primary-400" />
                        フォルダ別統計（ファイル数）
                    </h2>
                    <MeasuredChartArea className="h-64 min-w-0 min-h-0">
                        {(size) => isReady ? (
                            <BarChart
                                width={size.width}
                                height={size.height}
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
                                        contentStyle={chartTooltipContentStyle}
                                        labelStyle={chartTooltipLabelStyle}
                                        itemStyle={chartTooltipItemStyle}
                                        wrapperStyle={chartTooltipWrapperStyle}
                                        cursor={chartHoverCursor}
                                        formatter={(value: any, name?: string, props?: any) => {
                                            if (name === 'count' && props) {
                                                return [`${value.toLocaleString()}件 (${formatBytes(props.payload.size)})`, 'ファイル数'];
                                            }
                                            return value;
                                        }}
                                    />
                                    <Bar dataKey="count" name="ファイル数" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        ) : null}
                    </MeasuredChartArea>
                </div>
            )}

            {/* Monthly Trend - Line Chart */}
            {stats.monthlyTrend && stats.monthlyTrend.length > 0 && (
                <div className="bg-surface-800 rounded-lg p-4">
                    <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <TrendingUp size={16} className="text-primary-400" />
                        月別登録推移（過去12ヶ月）
                    </h2>
                    <MeasuredChartArea className="h-64 min-w-0 min-h-0">
                        {(size) => isReady ? (
                            <LineChart width={size.width} height={size.height} data={stats.monthlyTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                                    <YAxis stroke="#94a3b8" fontSize={12} />
                                    <Tooltip
                                        contentStyle={chartTooltipContentStyle}
                                        labelStyle={chartTooltipLabelStyle}
                                        itemStyle={chartTooltipItemStyle}
                                        wrapperStyle={chartTooltipWrapperStyle}
                                    />
                                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
                            </LineChart>
                        ) : null}
                    </MeasuredChartArea>
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
                            {isReady && (
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
                                        contentStyle={chartTooltipContentStyle}
                                        labelStyle={chartTooltipLabelStyle}
                                        itemStyle={chartTooltipItemStyle}
                                        wrapperStyle={chartTooltipWrapperStyle}
                                    />
                                </PieChart>
                            )}
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
                    <MeasuredChartArea className="h-48 min-w-0 min-h-0">
                        {(size) => isReady ? (
                            <BarChart width={size.width} height={size.height} data={stats.ratingStats} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="rating" stroke="#94a3b8" fontSize={12} />
                                    <YAxis stroke="#94a3b8" fontSize={12} />
                                    <Tooltip
                                        contentStyle={chartTooltipContentStyle}
                                        labelStyle={chartTooltipLabelStyle}
                                        itemStyle={chartTooltipItemStyle}
                                        wrapperStyle={chartTooltipWrapperStyle}
                                        cursor={chartHoverCursor}
                                    />
                                    <Bar dataKey="count" name="ファイル数" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        ) : null}
                    </MeasuredChartArea>
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
                            {isReady && (
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
                                        contentStyle={chartTooltipContentStyle}
                                        labelStyle={chartTooltipLabelStyle}
                                        itemStyle={chartTooltipItemStyle}
                                        wrapperStyle={chartTooltipWrapperStyle}
                                    />
                                </PieChart>
                            )}
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
