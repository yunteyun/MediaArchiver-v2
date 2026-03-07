/**
 * Header - 検索バーとソートメニューを含むヘッダー
 */

import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown, Wand2, Grid, LayoutGrid, Film, Minimize2, Maximize2, Image, Music, Archive, ChevronDown, ChevronUp } from 'lucide-react';
import { useUIStore } from '../stores/useUIStore';
import { useSettingsStore, type GroupBy, type ThumbnailPresentation } from '../stores/useSettingsStore';
import { useFileStore } from '../stores/useFileStore';
import { useToastStore } from '../stores/useToastStore';
import { SearchBar } from './SearchBar';
import {
    getDisplayModeDefinitionByLayoutPreset,
    getDisplayModeMenuOptions,
    getLayoutPresetFromDisplayMode,
} from './fileCard/displayModes';
import type { DisplayModeIconKey } from './fileCard/displayModeTypes';

const ICON_BY_KEY: Record<DisplayModeIconKey, React.ComponentType<{ size?: number; className?: string }>> = {
    grid: Grid,
    maximize: Maximize2,
    layoutGrid: LayoutGrid,
    film: Film,
    minimize: Minimize2,
};

const DISPLAY_MODE_MENU_OPTIONS = getDisplayModeMenuOptions();
const THUMBNAIL_PRESENTATION_OPTIONS: Array<{ value: ThumbnailPresentation; label: string }> = [
    { value: 'modeDefault', label: 'モード既定' },
    { value: 'cover', label: 'Cover（切り取り）' },
    { value: 'contain', label: 'Contain（全体表示）' },
    { value: 'square', label: 'Square（固定）' },
];

const FILE_TYPE_FILTER_OPTIONS: Array<{
    value: 'video' | 'image' | 'archive' | 'audio';
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
    { value: 'video', label: '動画', icon: Film },
    { value: 'image', label: '画像', icon: Image },
    { value: 'archive', label: '書庫', icon: Archive },
    { value: 'audio', label: '音声', icon: Music },
];

const HEADER_DETAIL_TOGGLE_STORAGE_KEY = 'header.detailControls.open.v1';

function readInitialDetailControlsOpen(): boolean {
    try {
        const raw = window.localStorage.getItem(HEADER_DETAIL_TOGGLE_STORAGE_KEY);
        if (raw === '0') return false;
        if (raw === '1') return true;
    } catch {
        // ignore localStorage errors
    }
    return true;
}

export const Header = React.memo(() => {
    const sortBy = useSettingsStore((s) => s.sortBy);
    const sortOrder = useSettingsStore((s) => s.sortOrder);
    const setSortBy = useSettingsStore((s) => s.setSortBy);
    const setSortOrder = useSettingsStore((s) => s.setSortOrder);

    const groupBy = useSettingsStore((s) => s.groupBy);
    const setGroupBy = useSettingsStore((s) => s.setGroupBy);
    const layoutPreset = useSettingsStore((s) => s.layoutPreset);
    const setLayoutPreset = useSettingsStore((s) => s.setLayoutPreset);
    const thumbnailPresentation = useSettingsStore((s) => s.thumbnailPresentation);
    const setThumbnailPresentation = useSettingsStore((s) => s.setThumbnailPresentation);
    const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
    const modeMenuRef = useRef<HTMLDivElement>(null);
    const selectedDisplayModeOption = getDisplayModeDefinitionByLayoutPreset(layoutPreset);
    const SelectedDisplayModeIcon = ICON_BY_KEY[selectedDisplayModeOption.iconKey];

    // ドロップダウンのクリックアウトサイドハンドラー
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modeMenuRef.current && !modeMenuRef.current.contains(event.target as Node)) {
                setIsModeMenuOpen(false);
            }
        };
        if (isModeMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isModeMenuOpen]);

    const files = useFileStore((s) => s.files);
    const selectedIds = useFileStore((s) => s.selectedIds);
    const selectedFileTypes = useUIStore((s) => s.selectedFileTypes);
    const setSelectedFileTypes = useUIStore((s) => s.setSelectedFileTypes);
    const toggleFileTypeFilter = useUIStore((s) => s.toggleFileTypeFilter);
    const clearFileTypeFilter = useUIStore((s) => s.clearFileTypeFilter);
    const hasActiveTypeFilter = selectedFileTypes.length < FILE_TYPE_FILTER_OPTIONS.length;
    const toastInfo = useToastStore((s) => s.info);
    const toastSuccess = useToastStore((s) => s.success);
    const toastError = useToastStore((s) => s.error);
    const [isDetailControlsOpen, setIsDetailControlsOpen] = useState<boolean>(() => readInitialDetailControlsOpen());
    const [isApplying, setIsApplying] = useState(false);

    useEffect(() => {
        try {
            window.localStorage.setItem(HEADER_DETAIL_TOGGLE_STORAGE_KEY, isDetailControlsOpen ? '1' : '0');
        } catch {
            // ignore localStorage errors
        }
    }, [isDetailControlsOpen]);

    // 自動タグ適用ハンドラー (Phase 12-8 フェーズ2)
    const handleApplyAutoTags = async () => {
        const targetIds = selectedIds.size > 0 ? Array.from(selectedIds) : files.map(f => f.id);

        if (targetIds.length === 0) {
            toastInfo('適用するファイルがありません');
            return;
        }

        setIsApplying(true);
        try {
            const result = await window.electronAPI.applyAutoTagsToFiles(targetIds);

            if (result.tagsAssigned > 0) {
                toastSuccess(`${result.filesUpdated}件のファイルに${result.tagsAssigned}個のタグを適用しました`);
                // ファイルリストを再読み込み
                const updatedFiles = await window.electronAPI.getFiles();
                useFileStore.getState().setFiles(updatedFiles);
            } else {
                toastInfo('適用されたタグはありませんでした');
            }
        } catch (error) {
            console.error('Auto tag apply error:', error);
            toastError('自動タグ適用中にエラーが発生しました');
        } finally {
            setIsApplying(false);
        }
    };



    return (
        <div className="px-4 py-2 bg-surface-900 border-b border-surface-700 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
                {/* Search Bar */}
                <SearchBar />

                {/* Layout Preset Controls */}
                <div ref={modeMenuRef} className="relative flex gap-1 items-center">
                    <span className="text-surface-400 text-sm whitespace-nowrap mr-1">表示:</span>
                    <button
                        onClick={() => setIsModeMenuOpen(!isModeMenuOpen)}
                        className="flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors bg-surface-700 text-surface-300 hover:bg-surface-600 whitespace-nowrap"
                        title="表示モードを切り替え"
                    >
                        <SelectedDisplayModeIcon size={14} />
                        <span>{selectedDisplayModeOption.label}</span>
                    </button>

                    {isModeMenuOpen && (
                        <div className="absolute top-full mt-1 right-0 bg-surface-800 rounded shadow-lg border border-surface-700 py-1 z-50 min-w-[160px]">
                            {DISPLAY_MODE_MENU_OPTIONS.map((option) => {
                                const Icon = ICON_BY_KEY[option.iconKey];
                                const optionLayoutPreset = getLayoutPresetFromDisplayMode(option.mode);
                                const isActive = layoutPreset === optionLayoutPreset;
                                return (
                                    <button
                                        key={option.mode}
                                        onClick={() => {
                                            setLayoutPreset(optionLayoutPreset);
                                            setIsModeMenuOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-surface-700 transition-colors text-sm ${isActive ? 'bg-primary-500/20 text-primary-300' : 'text-surface-200'}`}
                                    >
                                        <Icon size={16} />
                                        <span>{option.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Thumbnail Presentation Controls */}
                <div className="flex gap-2 items-center">
                    <span className="text-surface-400 text-sm whitespace-nowrap">サムネ:</span>
                    <select
                        value={thumbnailPresentation}
                        onChange={(e) => setThumbnailPresentation(e.target.value as ThumbnailPresentation)}
                        className="px-3 py-1 bg-surface-800 text-surface-200 border border-surface-600 rounded text-sm focus:outline-none focus:border-primary-500"
                    >
                        {THUMBNAIL_PRESENTATION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    type="button"
                    onClick={() => setIsDetailControlsOpen((prev) => !prev)}
                    className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-surface-300 bg-surface-800 hover:bg-surface-700"
                    title={isDetailControlsOpen ? '詳細操作を閉じる' : '詳細操作を開く'}
                >
                    {isDetailControlsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    <span>{isDetailControlsOpen ? '詳細を閉じる' : '詳細を開く'}</span>
                </button>
            </div>

            {isDetailControlsOpen && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Sort Controls */}
                        <div className="flex gap-2 items-center">
                            <span className="text-surface-400 text-sm whitespace-nowrap">並び替え:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                                className="px-3 py-1 bg-surface-800 text-surface-200 border border-surface-600 rounded text-sm focus:outline-none focus:border-primary-500"
                            >
                                <option value="name">名前</option>
                                <option value="date">日付</option>
                                <option value="size">サイズ</option>
                                <option value="type">種類</option>
                                <option value="accessCount">アクセス回数</option>
                                <option value="lastAccessed">直近アクセス</option>
                            </select>
                            <button
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                className="p-1.5 hover:bg-surface-700 rounded transition-colors text-surface-400 hover:text-white"
                                title={sortOrder === 'asc' ? '昇順' : '降順'}
                            >
                                {sortOrder === 'asc' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                            </button>
                        </div>

                        {/* Group By Controls (Phase 12-10) */}
                        <div className="flex gap-2 items-center">
                            <span className="text-surface-400 text-sm whitespace-nowrap">グループ:</span>
                            <select
                                value={groupBy}
                                onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                                className="px-3 py-1 bg-surface-800 text-surface-200 border border-surface-600 rounded text-sm focus:outline-none focus:border-primary-500"
                            >
                                <option value="none">なし</option>
                                <option value="date">年月別</option>
                                <option value="size">サイズ別</option>
                                <option value="type">タイプ別</option>
                            </select>
                        </div>

                        {/* File Type Filter */}
                        <div className="flex gap-2 items-center">
                            <span className="text-surface-400 text-sm whitespace-nowrap">タイプ:</span>
                            <div className="flex items-center gap-1">
                                {FILE_TYPE_FILTER_OPTIONS.map((option) => {
                                    const Icon = option.icon;
                                    const active = selectedFileTypes.includes(option.value);
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={(event) => {
                                                if (event.ctrlKey || event.metaKey) {
                                                    toggleFileTypeFilter(option.value);
                                                    return;
                                                }
                                                setSelectedFileTypes([option.value]);
                                            }}
                                            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors whitespace-nowrap ${
                                                active
                                                    ? 'bg-primary-600 text-white'
                                                    : 'bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200'
                                            }`}
                                            title={`${option.label}のみ表示（Ctrl+クリックで複数選択）`}
                                        >
                                            <Icon size={12} />
                                            <span>{option.label}</span>
                                        </button>
                                    );
                                })}
                                {hasActiveTypeFilter && (
                                    <button
                                        type="button"
                                        onClick={clearFileTypeFilter}
                                        className="rounded px-2 py-1 text-xs text-surface-400 hover:bg-surface-700 hover:text-surface-200 whitespace-nowrap"
                                        title="タイプ絞り込みを解除"
                                    >
                                        全表示
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Auto Tag Apply Button (Phase 12-8 フェーズ2) */}
                    <button
                        onClick={handleApplyAutoTags}
                        disabled={isApplying}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:text-surface-500 text-white text-sm transition-colors whitespace-nowrap"
                        title={selectedIds.size > 0 ? `選択中の${selectedIds.size}件に自動タグを適用` : '全ファイルに自動タグを適用'}
                    >
                        <Wand2 size={16} className={isApplying ? 'animate-spin' : ''} />
                        {isApplying ? '適用中...' : '自動タグ適用'}
                    </button>
                </div>
            )}
        </div>
    );
});

Header.displayName = 'Header';

// 後方互換性のため SortMenu もエクスポート
export const SortMenu = Header;
