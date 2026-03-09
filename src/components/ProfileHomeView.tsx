import React, { Suspense, useEffect, useMemo, useState } from 'react';
import {
    BarChart3,
    Clock3,
    Copy,
    FolderOpen,
    HardDrive,
    RefreshCw,
    Settings,
    Tag,
    User,
} from 'lucide-react';
import { useProfileStore } from '../stores/useProfileStore';
import { useUIStore } from '../stores/useUIStore';
import { useLibraryStats } from '../hooks/useLibraryStats';
import { lazyWithPerf } from '../utils/lazyWithPerf';
import { toMediaUrl } from '../utils/mediaPath';

const StatisticsView = lazyWithPerf('statistics-view', () => import('./StatisticsView').then((module) => ({ default: module.StatisticsView })));

const TYPE_LABELS: Record<string, string> = {
    image: '画像',
    video: '動画',
    archive: '書庫',
    audio: '音声',
};

const TYPE_COLORS: Record<string, string> = {
    image: '#3b82f6',
    video: '#22c55e',
    archive: '#f97316',
    audio: '#a855f7',
};

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatDate(timestamp: number): string {
    if (!timestamp) return '不明';
    return new Date(timestamp).toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

interface SummaryCardProps {
    label: string;
    value: string;
    hint?: string;
    icon: React.ReactNode;
}

const SummaryCard = React.memo(({ label, value, hint, icon }: SummaryCardProps) => (
    <div className="rounded-xl border border-surface-700 bg-surface-800/80 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm text-surface-400">
            {icon}
            <span>{label}</span>
        </div>
        <div className="text-2xl font-semibold text-white">{value}</div>
        {hint && <div className="mt-1 text-xs text-surface-500">{hint}</div>}
    </div>
));

SummaryCard.displayName = 'SummaryCard';

export const ProfileHomeView: React.FC = () => {
    const profiles = useProfileStore((s) => s.profiles);
    const activeProfileId = useProfileStore((s) => s.activeProfileId);
    const openDuplicateView = useUIStore((s) => s.openDuplicateView);
    const openSettingsModal = useUIStore((s) => s.openSettingsModal);
    const setMainView = useUIStore((s) => s.setMainView);
    const { stats, loading, error, loadStats } = useLibraryStats();
    const [activeTab, setActiveTab] = useState<'overview' | 'statistics'>('overview');
    const [statisticsMounted, setStatisticsMounted] = useState(false);
    const [statisticsRefreshKey, setStatisticsRefreshKey] = useState(0);

    useEffect(() => {
        if (activeTab === 'statistics') {
            setStatisticsMounted(true);
        }
    }, [activeTab]);

    const activeProfile = useMemo(() => (
        profiles.find((profile) => profile.id === activeProfileId) ?? null
    ), [activeProfileId, profiles]);

    const taggedRatio = useMemo(() => {
        if (!stats || stats.totalFiles === 0) return 0;
        return (stats.untaggedStats.tagged / stats.totalFiles) * 100;
    }, [stats]);

    const handleRefresh = () => {
        if (activeTab === 'statistics') {
            setStatisticsRefreshKey((prev) => prev + 1);
            return;
        }
        void loadStats();
    };

    return (
        <div className="h-full min-h-0 bg-surface-900">
            <div className="flex h-full min-h-0 flex-col">
                <div className="flex flex-shrink-0 items-start justify-between border-b border-surface-700 px-6 py-5">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-surface-400">
                            <User size={18} className="text-primary-400" />
                            <span className="text-sm">プロファイルトップ</span>
                        </div>
                        <h1 className="text-2xl font-semibold text-white">
                            {activeProfile?.name ?? 'プロファイル'}
                        </h1>
                        <p className="mt-1 text-sm text-surface-500">
                            作成 {activeProfile ? formatDate(activeProfile.createdAt) : '不明'} / 更新 {activeProfile ? formatDate(activeProfile.updatedAt) : '不明'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setMainView('grid');
                                openDuplicateView();
                            }}
                            className="inline-flex items-center gap-2 rounded-lg bg-surface-800 px-3 py-2 text-sm text-surface-200 transition-colors hover:bg-surface-700"
                        >
                            <Copy size={16} />
                            重複チェック
                        </button>
                        <button
                            type="button"
                            onClick={() => openSettingsModal()}
                            className="inline-flex items-center gap-2 rounded-lg bg-surface-800 px-3 py-2 text-sm text-surface-200 transition-colors hover:bg-surface-700"
                        >
                            <Settings size={16} />
                            設定
                        </button>
                    </div>
                </div>

                <div className="flex flex-shrink-0 items-center gap-2 border-b border-surface-800 px-6 py-3">
                    <button
                        type="button"
                        onClick={() => setActiveTab('overview')}
                        className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                            activeTab === 'overview'
                                ? 'bg-primary-600 text-white'
                                : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
                        }`}
                    >
                        概要
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('statistics')}
                        className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                            activeTab === 'statistics'
                                ? 'bg-primary-600 text-white'
                                : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
                        }`}
                    >
                        詳細統計
                    </button>
                    <button
                        type="button"
                        onClick={handleRefresh}
                        className="ml-auto inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-200"
                    >
                        <RefreshCw size={14} />
                        更新
                    </button>
                </div>

                {activeTab === 'overview' ? (
                    <div className="min-h-0 flex-1 overflow-y-auto p-6">
                        {loading && !stats ? (
                            <div className="flex h-full items-center justify-center text-surface-400">
                                <div className="inline-flex items-center gap-2">
                                    <RefreshCw size={18} className="animate-spin text-primary-400" />
                                    プロファイル情報を読み込み中...
                                </div>
                            </div>
                        ) : error && !stats ? (
                            <div className="flex h-full flex-col items-center justify-center gap-4 text-surface-400">
                                <p>プロファイル情報を取得できませんでした</p>
                                <p className="text-sm text-red-400">{error}</p>
                                <button
                                    type="button"
                                    onClick={() => void loadStats()}
                                    className="rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-500"
                                >
                                    再試行
                                </button>
                            </div>
                        ) : stats ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
                                    <SummaryCard
                                        label="総ファイル数"
                                        value={stats.totalFiles.toLocaleString()}
                                        hint={`${stats.byType.length} タイプ`}
                                        icon={<BarChart3 size={16} className="text-primary-400" />}
                                    />
                                    <SummaryCard
                                        label="総サイズ"
                                        value={formatBytes(stats.totalSize)}
                                        hint="現在のプロファイル合計"
                                        icon={<HardDrive size={16} className="text-primary-400" />}
                                    />
                                    <SummaryCard
                                        label="登録フォルダ"
                                        value={stats.byFolder.length.toLocaleString()}
                                        hint="仮想フォルダ除く"
                                        icon={<FolderOpen size={16} className="text-primary-400" />}
                                    />
                                    <SummaryCard
                                        label="使用タグ数"
                                        value={stats.byTag.length.toLocaleString()}
                                        hint={`タグ付き率 ${taggedRatio.toFixed(1)}%`}
                                        icon={<Tag size={16} className="text-primary-400" />}
                                    />
                                    <SummaryCard
                                        label="サムネイル容量"
                                        value={formatBytes(stats.thumbnailSize ?? 0)}
                                        hint="キャッシュ使用量"
                                        icon={<Clock3 size={16} className="text-primary-400" />}
                                    />
                                </div>

                                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                                    <section className="rounded-xl border border-surface-700 bg-surface-800/70 p-4">
                                        <div className="mb-4 flex items-center justify-between">
                                            <h2 className="text-base font-semibold text-white">最近追加</h2>
                                            <span className="text-xs text-surface-500">最新 {stats.recentFiles.length} 件</span>
                                        </div>
                                        <div className="space-y-2">
                                            {stats.recentFiles.slice(0, 6).map((file) => (
                                                <div key={file.id} className="flex items-center gap-3 rounded-lg bg-surface-900/50 px-3 py-2">
                                                    {file.thumbnailPath ? (
                                                        <img
                                                            src={toMediaUrl(file.thumbnailPath)}
                                                            alt=""
                                                            className="h-12 w-12 flex-shrink-0 rounded object-cover"
                                                        />
                                                    ) : (
                                                        <div className="h-12 w-12 flex-shrink-0 rounded bg-surface-700" />
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="truncate text-sm font-medium text-surface-100">{file.name}</div>
                                                        <div className="truncate text-xs text-surface-500">{file.path}</div>
                                                    </div>
                                                    <div className="flex-shrink-0 text-xs text-surface-400">{formatDate(file.createdAt)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="rounded-xl border border-surface-700 bg-surface-800/70 p-4">
                                        <h2 className="mb-4 text-base font-semibold text-white">タイプ構成</h2>
                                        <div className="space-y-3">
                                            {stats.byType.map((entry) => {
                                                const ratio = stats.totalFiles > 0 ? (entry.count / stats.totalFiles) * 100 : 0;
                                                return (
                                                    <div key={entry.type}>
                                                        <div className="mb-1 flex items-center justify-between text-sm">
                                                            <span className="text-surface-200">{TYPE_LABELS[entry.type] ?? entry.type}</span>
                                                            <span className="text-surface-400">{entry.count.toLocaleString()} 件</span>
                                                        </div>
                                                        <div className="h-2 rounded-full bg-surface-900/70">
                                                            <div
                                                                className="h-2 rounded-full"
                                                                style={{
                                                                    width: `${Math.max(ratio, entry.count > 0 ? 4 : 0)}%`,
                                                                    backgroundColor: TYPE_COLORS[entry.type] ?? '#6366f1',
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="mt-1 text-xs text-surface-500">{formatBytes(entry.size)} / {ratio.toFixed(1)}%</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                </div>

                                <section className="rounded-xl border border-surface-700 bg-surface-800/70 p-4">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h2 className="text-base font-semibold text-white">主要フォルダ</h2>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('statistics')}
                                            className="text-sm text-primary-300 transition-colors hover:text-primary-200"
                                        >
                                            詳細統計を見る
                                        </button>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        {stats.byFolder.slice(0, 6).map((folder) => (
                                            <div key={folder.folderId} className="rounded-lg bg-surface-900/50 px-3 py-3">
                                                <div className="mb-1 truncate text-sm font-medium text-surface-100">
                                                    {folder.folderPath.split(/[\\/]/).filter(Boolean).pop() ?? folder.folderPath}
                                                </div>
                                                <div className="truncate text-xs text-surface-500">{folder.folderPath}</div>
                                                <div className="mt-3 flex items-center justify-between text-xs text-surface-400">
                                                    <span>{folder.count.toLocaleString()} 件</span>
                                                    <span>{formatBytes(folder.size)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="min-h-0 flex-1 overflow-hidden">
                        {statisticsMounted && (
                            <Suspense fallback={<div className="flex h-full items-center justify-center text-surface-400">詳細統計を読み込み中...</div>}>
                                <StatisticsView key={`profile-statistics-${statisticsRefreshKey}`} embedded />
                            </Suspense>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
