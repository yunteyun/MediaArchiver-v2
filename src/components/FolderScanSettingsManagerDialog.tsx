import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Settings2, X } from 'lucide-react';
import type { MediaFolder } from '../types/file';
import { FolderAutoScanSettingsDialog } from './FolderAutoScanSettingsDialog';
import { useUIStore } from '../stores/useUIStore';
import { useSettingsStore } from '../stores/useSettingsStore';

interface FolderScanSettingsManagerDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

type FileTypeKey = 'video' | 'image' | 'archive' | 'audio';

function getLastScanStatusMeta(folder: MediaFolder): {
    status: string;
    label: string;
    badgeClass: string;
    at: number | null;
    message: string | null;
} {
    const rawStatus = (folder.last_scan_status ?? folder.lastScanStatus ?? null) as string | null;
    const at = (folder.last_scan_at ?? folder.lastScanAt ?? null) as number | null;
    const message = (folder.last_scan_message ?? folder.lastScanMessage ?? null) as string | null;

    switch (rawStatus) {
        case 'running':
            return { status: 'running', label: '実行中', badgeClass: 'border-blue-700/50 text-blue-200 bg-blue-900/20', at, message };
        case 'success':
            return { status: 'success', label: '成功', badgeClass: 'border-emerald-700/50 text-emerald-200 bg-emerald-900/20', at, message };
        case 'error':
            return { status: 'error', label: '失敗', badgeClass: 'border-red-700/50 text-red-200 bg-red-900/20', at, message };
        case 'cancelled':
            return { status: 'cancelled', label: 'キャンセル', badgeClass: 'border-amber-700/50 text-amber-200 bg-amber-900/20', at, message };
        default:
            return { status: 'none', label: '未実行', badgeClass: 'border-surface-700 text-surface-300 bg-surface-900/20', at, message };
    }
}

function formatDateTime(ts: number | null): string {
    if (!ts) return '-';
    try {
        return new Date(ts).toLocaleString('ja-JP');
    } catch {
        return '-';
    }
}

function parseFolderOverrides(folder: MediaFolder): Partial<Record<FileTypeKey, boolean>> {
    const raw = folder.scan_settings_json ?? folder.scanSettingsJson;
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        const rawOverrides = parsed?.fileTypeOverrides;
        if (!rawOverrides || typeof rawOverrides !== 'object' || Array.isArray(rawOverrides)) return {};
        const result: Partial<Record<FileTypeKey, boolean>> = {};
        for (const key of ['video', 'image', 'archive', 'audio'] as const) {
            const value = (rawOverrides as Record<string, unknown>)[key];
            if (typeof value === 'boolean') result[key] = value;
        }
        return result;
    } catch {
        return {};
    }
}

function formatCategorySummary(folder: MediaFolder, defaults: Record<FileTypeKey, boolean>): string {
    const overrides = parseFolderOverrides(folder);
    const entries = ([
        ['video', '動画'],
        ['image', '画像'],
        ['archive', '書庫'],
        ['audio', '音声'],
    ] as const).map(([key, label]) => {
        const effective = overrides[key] ?? defaults[key];
        return `${label}:${effective ? 'ON' : 'OFF'}`;
    });
    const hasOverrides = Object.keys(overrides).length > 0;
    return hasOverrides ? `${entries.join(' / ')}（フォルダ別）` : `${entries.join(' / ')}（既定）`;
}

export const FolderScanSettingsManagerDialog = React.memo(({ isOpen, onClose }: FolderScanSettingsManagerDialogProps) => {
    const [folders, setFolders] = useState<MediaFolder[]>([]);
    const [loading, setLoading] = useState(false);
    const [detailTarget, setDetailTarget] = useState<MediaFolder | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [filterAutoScanOnly, setFilterAutoScanOnly] = useState(false);
    const [filterWatchOnly, setFilterWatchOnly] = useState(false);
    const [filterCategoryOverridesOnly, setFilterCategoryOverridesOnly] = useState(false);
    const [filterLastScanFailedOnly, setFilterLastScanFailedOnly] = useState(false);
    const [pathQuery, setPathQuery] = useState('');
    const [bulkApplying, setBulkApplying] = useState<null | 'auto-on' | 'auto-off' | 'watch-on' | 'watch-off' | 'clear-category-overrides'>(null);
    const profileFileTypeFilters = useSettingsStore((s) => s.profileFileTypeFilters);

    const loadFolders = useCallback(async () => {
        setLoading(true);
        try {
            const list = await window.electronAPI.getFolders();
            setFolders(list);
        } catch (e) {
            console.error('Failed to load folders for scan settings manager:', e);
            useUIStore.getState().showToast('フォルダ一覧の読み込みに失敗しました', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        void loadFolders();
    }, [isOpen, loadFolders]);

    const filteredFolders = useMemo(() => {
        const q = pathQuery.trim().toLowerCase();
        return folders.filter((folder) => {
            const autoScan = (folder.auto_scan ?? folder.autoScan ?? 0) === 1;
            const watch = (folder.watch_new_files ?? folder.watchNewFiles ?? 0) === 1;
            const hasCategoryOverrides = Object.keys(parseFolderOverrides(folder)).length > 0;
            const lastScanStatus = (folder.last_scan_status ?? folder.lastScanStatus ?? null) as string | null;

            if (filterAutoScanOnly && !autoScan) return false;
            if (filterWatchOnly && !watch) return false;
            if (filterCategoryOverridesOnly && !hasCategoryOverrides) return false;
            if (filterLastScanFailedOnly && lastScanStatus !== 'error') return false;
            if (q && !folder.path.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [folders, filterAutoScanOnly, filterWatchOnly, filterCategoryOverridesOnly, filterLastScanFailedOnly, pathQuery]);

    const sortedFolders = useMemo(() => {
        return [...filteredFolders].sort((a, b) => a.path.localeCompare(b.path, 'ja'));
    }, [filteredFolders]);

    const applyBulkOperation = useCallback(async (
        mode: 'auto-on' | 'auto-off' | 'watch-on' | 'watch-off' | 'clear-category-overrides'
    ) => {
        if (sortedFolders.length === 0) {
            useUIStore.getState().showToast('対象フォルダがありません', 'info');
            return;
        }

        setBulkApplying(mode);
        try {
            if (mode === 'auto-on' || mode === 'auto-off') {
                const enabled = mode === 'auto-on';
                await Promise.all(sortedFolders.map(folder => window.electronAPI.setFolderAutoScan(folder.id, enabled)));
                setFolders(prev => prev.map(f => {
                    if (!sortedFolders.some(t => t.id === f.id)) return f;
                    return { ...f, auto_scan: enabled ? 1 : 0 };
                }));
                useUIStore.getState().showToast(`表示中 ${sortedFolders.length} フォルダの起動時スキャンを${enabled ? 'ON' : 'OFF'}にしました`, 'success');
            } else if (mode === 'watch-on' || mode === 'watch-off') {
                const enabled = mode === 'watch-on';
                await Promise.all(sortedFolders.map(folder => window.electronAPI.setFolderWatchNewFiles(folder.id, enabled)));
                setFolders(prev => prev.map(f => {
                    if (!sortedFolders.some(t => t.id === f.id)) return f;
                    return { ...f, watch_new_files: enabled ? 1 : 0 };
                }));
                useUIStore.getState().showToast(`表示中 ${sortedFolders.length} フォルダの監視設定を${enabled ? 'ON' : 'OFF'}にしました`, 'success');
            } else {
                await Promise.all(sortedFolders.map(folder => window.electronAPI.clearFolderScanFileTypeOverrides(folder.id)));
                setFolders(prev => prev.map(f => {
                    if (!sortedFolders.some(t => t.id === f.id)) return f;
                    return { ...f, scan_settings_json: null, scanSettingsJson: null };
                }));
                useUIStore.getState().showToast(`表示中 ${sortedFolders.length} フォルダの個別カテゴリ設定を解除しました`, 'success');
            }
        } catch (e) {
            console.error('Bulk operation failed:', e);
            useUIStore.getState().showToast('一括操作に失敗しました', 'error');
        } finally {
            setBulkApplying(null);
        }
    }, [sortedFolders]);

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="flex h-[min(80vh,720px)] w-[min(1100px,calc(100vw-2rem))] flex-col rounded-xl border border-surface-700 bg-surface-900 shadow-xl">
                    <div className="flex items-center justify-between border-b border-surface-700 px-4 py-3">
                        <div>
                            <h2 className="text-base font-semibold text-white">フォルダ別スキャン設定（一覧）</h2>
                            <p className="text-xs text-surface-500">起動時スキャン / 起動中新規ファイルスキャン / 対象カテゴリの現在値を一覧表示</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => { void loadFolders(); }}
                                className="inline-flex items-center gap-1 rounded border border-surface-700 px-2 py-1 text-xs text-surface-300 transition-colors hover:bg-surface-800"
                                title="再読み込み"
                            >
                                <RefreshCw size={13} />
                                再読込
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded p-1 text-surface-300 transition-colors hover:bg-surface-800 hover:text-white"
                                aria-label="閉じる"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="border-b border-surface-800 px-4 py-2 text-xs text-surface-400">
                        プロファイル既定（カテゴリ）: 動画 {profileFileTypeFilters.video ? 'ON' : 'OFF'} / 画像 {profileFileTypeFilters.image ? 'ON' : 'OFF'} / 書庫 {profileFileTypeFilters.archive ? 'ON' : 'OFF'} / 音声 {profileFileTypeFilters.audio ? 'ON' : 'OFF'}
                    </div>

                    <div className="border-b border-surface-800 px-4 py-3 space-y-3">
                        <div className="rounded border border-surface-700 bg-surface-900/30 p-2">
                            <div className="mb-2 text-xs font-medium text-surface-300">検索フィルタ</div>
                            <div className="flex flex-wrap gap-2">
                                <label className="inline-flex items-center gap-2 rounded border border-surface-700 bg-surface-900/30 px-2 py-1 text-xs text-surface-300">
                                    <input
                                        type="checkbox"
                                        checked={filterAutoScanOnly}
                                        onChange={(e) => setFilterAutoScanOnly(e.target.checked)}
                                        className="h-4 w-4 accent-primary-500"
                                    />
                                    起動時ONのみ
                                </label>
                                <label className="inline-flex items-center gap-2 rounded border border-surface-700 bg-surface-900/30 px-2 py-1 text-xs text-surface-300">
                                    <input
                                        type="checkbox"
                                        checked={filterWatchOnly}
                                        onChange={(e) => setFilterWatchOnly(e.target.checked)}
                                        className="h-4 w-4 accent-primary-500"
                                    />
                                    監視ONのみ
                                </label>
                                <label className="inline-flex items-center gap-2 rounded border border-surface-700 bg-surface-900/30 px-2 py-1 text-xs text-surface-300">
                                    <input
                                        type="checkbox"
                                        checked={filterCategoryOverridesOnly}
                                        onChange={(e) => setFilterCategoryOverridesOnly(e.target.checked)}
                                        className="h-4 w-4 accent-primary-500"
                                    />
                                    個別カテゴリ設定あり
                                </label>
                                <label className="inline-flex items-center gap-2 rounded border border-surface-700 bg-surface-900/30 px-2 py-1 text-xs text-surface-300">
                                    <input
                                        type="checkbox"
                                        checked={filterLastScanFailedOnly}
                                        onChange={(e) => setFilterLastScanFailedOnly(e.target.checked)}
                                        className="h-4 w-4 accent-primary-500"
                                    />
                                    最終スキャン失敗のみ
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFilterAutoScanOnly(false);
                                        setFilterWatchOnly(false);
                                        setFilterCategoryOverridesOnly(false);
                                        setFilterLastScanFailedOnly(false);
                                        setPathQuery('');
                                    }}
                                    className="rounded border border-surface-700 px-2 py-1 text-xs text-surface-300 transition-colors hover:bg-surface-800"
                                >
                                    フィルタクリア
                                </button>
                            </div>
                            <input
                                type="text"
                                value={pathQuery}
                                onChange={(e) => setPathQuery(e.target.value)}
                                placeholder="検索フィルタ: フォルダパスで絞り込み"
                                className="mt-2 w-full rounded border border-surface-700 bg-surface-900/40 px-3 py-2 text-sm text-surface-200 placeholder:text-surface-500 focus:outline-none focus:border-primary-500"
                            />
                            <div className="mt-2 text-xs text-surface-500">
                                表示 {sortedFolders.length} 件 / 全 {folders.length} 件
                            </div>
                        </div>

                        <div className="rounded border border-surface-700 bg-surface-900/30 p-2">
                            <div className="mb-2 text-xs font-medium text-surface-300">一括操作（表示中フォルダ対象）</div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    disabled={sortedFolders.length === 0 || bulkApplying !== null}
                                    onClick={() => { void applyBulkOperation('auto-on'); }}
                                    className="rounded border border-surface-700 px-2 py-1 text-xs text-surface-200 transition-colors hover:bg-surface-800 disabled:opacity-60"
                                >
                                    起動時スキャン ON
                                </button>
                                <button
                                    type="button"
                                    disabled={sortedFolders.length === 0 || bulkApplying !== null}
                                    onClick={() => { void applyBulkOperation('auto-off'); }}
                                    className="rounded border border-surface-700 px-2 py-1 text-xs text-surface-200 transition-colors hover:bg-surface-800 disabled:opacity-60"
                                >
                                    起動時スキャン OFF
                                </button>
                                <button
                                    type="button"
                                    disabled={sortedFolders.length === 0 || bulkApplying !== null}
                                    onClick={() => { void applyBulkOperation('watch-on'); }}
                                    className="rounded border border-surface-700 px-2 py-1 text-xs text-surface-200 transition-colors hover:bg-surface-800 disabled:opacity-60"
                                >
                                    監視 ON
                                </button>
                                <button
                                    type="button"
                                    disabled={sortedFolders.length === 0 || bulkApplying !== null}
                                    onClick={() => { void applyBulkOperation('watch-off'); }}
                                    className="rounded border border-surface-700 px-2 py-1 text-xs text-surface-200 transition-colors hover:bg-surface-800 disabled:opacity-60"
                                >
                                    監視 OFF
                                </button>
                                <button
                                    type="button"
                                    disabled={sortedFolders.length === 0 || bulkApplying !== null}
                                    onClick={() => { void applyBulkOperation('clear-category-overrides'); }}
                                    className="rounded border border-amber-700/40 px-2 py-1 text-xs text-amber-200 transition-colors hover:bg-amber-900/20 disabled:opacity-60"
                                >
                                    個別カテゴリ設定を解除
                                </button>
                            </div>
                            {bulkApplying && (
                                <div className="mt-2 text-xs text-surface-500">一括操作を実行中...</div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto p-4">
                        {loading ? (
                            <div className="text-sm text-surface-400">読み込み中...</div>
                        ) : sortedFolders.length === 0 ? (
                            <div className="text-sm text-surface-500">登録フォルダがありません。</div>
                        ) : (
                            <div className="space-y-2">
                                {sortedFolders.map((folder) => {
                                    const autoScan = (folder.auto_scan ?? folder.autoScan ?? 0) === 1;
                                    const watch = (folder.watch_new_files ?? folder.watchNewFiles ?? 0) === 1;
                                    const lastScan = getLastScanStatusMeta(folder);
                                    return (
                                        <div key={folder.id} className="rounded-lg border border-surface-700 bg-surface-900/40 p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-medium text-surface-200" title={folder.path}>{folder.path}</div>
                                                    <div className="mt-1 text-xs text-surface-500">
                                                        {formatCategorySummary(folder, profileFileTypeFilters)}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setDetailTarget(folder);
                                                        setDetailOpen(true);
                                                    }}
                                                    className="inline-flex shrink-0 items-center gap-1 rounded border border-surface-700 px-2 py-1 text-xs text-surface-300 transition-colors hover:bg-surface-800"
                                                >
                                                    <Settings2 size={13} />
                                                    編集
                                                </button>
                                            </div>

                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                                <span className={`inline-flex items-center rounded border px-2 py-0.5 ${lastScan.badgeClass}`}>
                                                    最終スキャン: {lastScan.label}
                                                </span>
                                                <span className="text-surface-500">
                                                    {formatDateTime(lastScan.at)}
                                                </span>
                                                {lastScan.message && (
                                                    <span className="truncate text-surface-500" title={lastScan.message}>
                                                        {lastScan.message}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-surface-700 bg-surface-900/40 px-2 py-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={autoScan}
                                                        onChange={async (e) => {
                                                            try {
                                                                await window.electronAPI.setFolderAutoScan(folder.id, e.target.checked);
                                                                setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, auto_scan: e.target.checked ? 1 : 0 } : f));
                                                            } catch (err) {
                                                                console.error('Failed to update auto scan:', err);
                                                                useUIStore.getState().showToast('起動時スキャン設定の更新に失敗しました', 'error');
                                                            }
                                                        }}
                                                        className="h-4 w-4 accent-primary-500"
                                                    />
                                                    <span className="text-xs text-surface-300">起動時スキャン</span>
                                                </label>

                                                <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-surface-700 bg-surface-900/40 px-2 py-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={watch}
                                                        onChange={async (e) => {
                                                            try {
                                                                await window.electronAPI.setFolderWatchNewFiles(folder.id, e.target.checked);
                                                                setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, watch_new_files: e.target.checked ? 1 : 0 } : f));
                                                            } catch (err) {
                                                                console.error('Failed to update watch setting:', err);
                                                                useUIStore.getState().showToast('起動中新規ファイルスキャン設定の更新に失敗しました', 'error');
                                                            }
                                                        }}
                                                        className="h-4 w-4 accent-primary-500"
                                                    />
                                                    <span className="text-xs text-surface-300">起動中新規ファイルスキャン</span>
                                                </label>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <FolderAutoScanSettingsDialog
                isOpen={detailOpen}
                folder={detailTarget}
                onClose={() => setDetailOpen(false)}
                onSaved={() => {
                    void loadFolders();
                }}
            />
        </>
    );
});

FolderScanSettingsManagerDialog.displayName = 'FolderScanSettingsManagerDialog';
