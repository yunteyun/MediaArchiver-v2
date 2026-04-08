/**
 * Header - 検索バーとソートメニューを含むヘッダー
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowDown, Grid, LayoutGrid, Film, Minimize2, Maximize2, Image, Music, Archive, ChevronDown, ChevronUp, SlidersHorizontal, RotateCcw, Filter } from 'lucide-react';
import { useUIStore, type FileSortBy, type FileSortOrder } from '../stores/useUIStore';
import { useSettingsStore, type DateGroupingMode, type DisplayMode, type GroupBy, type ThumbnailPresentation } from '../stores/useSettingsStore';
import { useFileStore } from '../stores/useFileStore';
import { SearchBar } from './SearchBar';
import {
    getDisplayPresetById,
    getDisplayPresetMenuOptions,
} from './fileCard/displayModes';
import type { DisplayModeIconKey } from './fileCard/displayModeTypes';
import { useDisplayPresetStore } from '../stores/useDisplayPresetStore';

const ICON_BY_KEY: Record<DisplayModeIconKey, React.ComponentType<{ size?: number; className?: string }>> = {
    grid: Grid,
    maximize: Maximize2,
    layoutGrid: LayoutGrid,
    film: Film,
    minimize: Minimize2,
};

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

const HEADER_DISPLAY_CONTROLS_OPEN_STORAGE_KEY = 'header.displayControls.open.v1';

// 統一スタイル定数
const CTRL_GROUP = 'flex items-center gap-1.5 rounded border border-surface-700 bg-surface-900/50 px-2 py-[5px]';
const CTRL_LABEL = 'text-surface-500 text-xs whitespace-nowrap';
const CTRL_SELECT = 'rounded bg-surface-800 px-1.5 py-0 text-xs text-surface-200 focus:outline-none border-none';
const CTRL_BUTTON = 'inline-flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors';
const CTRL_BUTTON_DEFAULT = `${CTRL_BUTTON} border border-surface-700 bg-surface-900/50 text-surface-400 hover:bg-surface-800 hover:text-surface-200`;
const CTRL_BUTTON_MUTED = `${CTRL_BUTTON} text-surface-400 hover:bg-surface-700 hover:text-surface-200`;

type ListDisplayDefaultsPatch = {
    sortBy?: FileSortBy;
    sortOrder?: FileSortOrder;
    groupBy?: GroupBy;
    dateGroupingMode?: DateGroupingMode;
    activeDisplayPresetId?: string;
    displayMode?: DisplayMode;
    thumbnailPresentation?: ThumbnailPresentation;
};

function readInitialToggleOpen(storageKey: string, defaultValue: boolean): boolean {
    try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw === '0') return false;
        if (raw === '1') return true;
    } catch {
        // ignore localStorage errors
    }
    return defaultValue;
}

export const Header = React.memo(() => {
    const searchQuery = useUIStore((s) => s.searchQuery);
    const searchTarget = useUIStore((s) => s.searchTarget);
    const clearSearchConditions = useUIStore((s) => s.clearSearchConditions);
    const ratingQuickFilter = useUIStore((s) => s.ratingQuickFilter);
    const setRatingQuickFilter = useUIStore((s) => s.setRatingQuickFilter);
    const sortBy = useUIStore((s) => s.currentSortBy);
    const sortOrder = useUIStore((s) => s.currentSortOrder);
    const setSortBy = useUIStore((s) => s.setCurrentSortBy);
    const setSortOrder = useUIStore((s) => s.setCurrentSortOrder);

    const groupBy = useUIStore((s) => s.currentGroupBy);
    const setGroupBy = useUIStore((s) => s.setCurrentGroupBy);
    const dateGroupingMode = useUIStore((s) => s.currentDateGroupingMode);
    const setDateGroupingMode = useUIStore((s) => s.setCurrentDateGroupingMode);
    const displayMode = useUIStore((s) => s.currentDisplayMode);
    const activeDisplayPresetId = useUIStore((s) => s.currentActiveDisplayPresetId);
    const setActiveDisplayPreset = useUIStore((s) => s.setCurrentDisplayPreset);
    const thumbnailPresentation = useUIStore((s) => s.currentThumbnailPresentation);
    const setThumbnailPresentation = useUIStore((s) => s.setCurrentThumbnailPresentation);
    const resetListDisplayToDefaults = useUIStore((s) => s.applyListDisplayDefaults);
    const defaultSortBy = useSettingsStore((s) => s.sortBy);
    const setDefaultSortBy = useSettingsStore((s) => s.setSortBy);
    const defaultSortOrder = useSettingsStore((s) => s.sortOrder);
    const setDefaultSortOrder = useSettingsStore((s) => s.setSortOrder);
    const defaultSearchTarget = useSettingsStore((s) => s.defaultSearchTarget);
    const defaultGroupBy = useSettingsStore((s) => s.groupBy);
    const setDefaultGroupBy = useSettingsStore((s) => s.setGroupBy);
    const defaultDateGroupingMode = useSettingsStore((s) => s.dateGroupingMode);
    const setDefaultDateGroupingMode = useSettingsStore((s) => s.setDateGroupingMode);
    const defaultDisplayMode = useSettingsStore((s) => s.displayMode);
    const defaultActiveDisplayPresetId = useSettingsStore((s) => s.activeDisplayPresetId);
    const setDefaultActiveDisplayPreset = useSettingsStore((s) => s.setActiveDisplayPreset);
    const defaultThumbnailPresentation = useSettingsStore((s) => s.thumbnailPresentation);
    const setDefaultThumbnailPresentation = useSettingsStore((s) => s.setThumbnailPresentation);
    const externalDisplayPresets = useDisplayPresetStore((s) => s.presets);
    const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
    const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
    const modeMenuRef = useRef<HTMLDivElement>(null);
    const filterPopoverRef = useRef<HTMLDivElement>(null);
    const displayPresetMenuOptions = React.useMemo(
        () => getDisplayPresetMenuOptions(externalDisplayPresets),
        [externalDisplayPresets]
    );
    const selectedDisplayPreset = React.useMemo(
        () => getDisplayPresetById(activeDisplayPresetId, externalDisplayPresets, displayMode),
        [activeDisplayPresetId, externalDisplayPresets, displayMode]
    );
    const SelectedDisplayModeIcon = ICON_BY_KEY[selectedDisplayPreset.definition.iconKey];

    // ドロップダウンのクリックアウトサイドハンドラー
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modeMenuRef.current && !modeMenuRef.current.contains(event.target as Node)) {
                setIsModeMenuOpen(false);
            }
            if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
                setIsFilterPopoverOpen(false);
            }
        };
        if (isModeMenuOpen || isFilterPopoverOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isModeMenuOpen, isFilterPopoverOpen]);

    const files = useFileStore((s) => s.files);
    const selectedIds = useFileStore((s) => s.selectedIds);
    const selectedFileTypes = useUIStore((s) => s.selectedFileTypes);
    const setSelectedFileTypes = useUIStore((s) => s.setSelectedFileTypes);
    const toggleFileTypeFilter = useUIStore((s) => s.toggleFileTypeFilter);
    const clearFileTypeFilter = useUIStore((s) => s.clearFileTypeFilter);
    const hasActiveTypeFilter = selectedFileTypes.length < FILE_TYPE_FILTER_OPTIONS.length;
    const [isDisplayControlsOpen, setIsDisplayControlsOpen] = useState<boolean>(() =>
        readInitialToggleOpen(HEADER_DISPLAY_CONTROLS_OPEN_STORAGE_KEY, true)
    );

    useEffect(() => {
        try {
            window.localStorage.setItem(HEADER_DISPLAY_CONTROLS_OPEN_STORAGE_KEY, isDisplayControlsOpen ? '1' : '0');
        } catch {
            // ignore localStorage errors
        }
    }, [isDisplayControlsOpen]);

    const persistListDisplayDefaults = useCallback(async (patch: ListDisplayDefaultsPatch) => {
        try {
            await window.electronAPI.setProfileScopedSettings({
                listDisplayDefaults: patch,
            });
        } catch (error) {
            console.error('Failed to persist list display defaults from header:', error);
            useUIStore.getState().showToast('表示設定の保存に失敗しました', 'error');
        }
    }, []);

    const hasActiveSavedFilters = searchQuery.trim().length > 0
        || searchTarget !== defaultSearchTarget
        || ratingQuickFilter !== 'none'
        || hasActiveTypeFilter;

    return (
        <div className="px-4 py-2 bg-surface-900 border-b border-surface-700 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                {/* Search Bar */}
                <SearchBar />

                {/* 絞り込みポップオーバー（タイプフィルター） */}
                <div ref={filterPopoverRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setIsFilterPopoverOpen((prev) => !prev)}
                        className={`inline-flex items-center gap-1 rounded border px-2 py-[5px] text-xs transition-colors ${
                            hasActiveTypeFilter
                                ? 'border-primary-500/50 bg-primary-600/15 text-primary-300'
                                : 'border-surface-700 bg-surface-900/50 text-surface-400 hover:bg-surface-800 hover:text-surface-200'
                        }`}
                        title="タイプで絞り込み"
                    >
                        <Filter size={12} />
                        <span>絞り込み</span>
                        {hasActiveTypeFilter && (
                            <span className="ml-0.5 rounded-full bg-primary-500 px-1.5 py-0.5 text-[10px] leading-none text-white">
                                {selectedFileTypes.length}
                            </span>
                        )}
                        {isFilterPopoverOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>

                    {isFilterPopoverOpen && (
                        <div className="absolute top-full left-0 mt-1 z-50 min-w-[200px] rounded border border-surface-700 bg-surface-800 p-3 shadow-lg">
                            <div className="mb-2 text-xs font-medium text-surface-400">タイプ</div>
                            <div className="flex flex-wrap gap-1">
                                {FILE_TYPE_FILTER_OPTIONS.map((option) => {
                                    const Icon = option.icon;
                                    const active = selectedFileTypes.includes(option.value);
                                    const selectedCount = selectedFileTypes.length;
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={(event) => {
                                                if (event.ctrlKey || event.metaKey) {
                                                    toggleFileTypeFilter(option.value);
                                                    return;
                                                }

                                                if (selectedCount >= FILE_TYPE_FILTER_OPTIONS.length) {
                                                    setSelectedFileTypes([option.value]);
                                                    return;
                                                }

                                                if (selectedCount === 1) {
                                                    if (active) return;
                                                    setSelectedFileTypes([...selectedFileTypes, option.value]);
                                                    return;
                                                }

                                                toggleFileTypeFilter(option.value);
                                            }}
                                            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors whitespace-nowrap ${
                                                active
                                                    ? 'bg-primary-600 text-white'
                                                    : 'bg-surface-700 text-surface-400 hover:bg-surface-600 hover:text-surface-200'
                                            }`}
                                            title={`${option.label}を選択（Ctrl+クリックで即トグル）`}
                                        >
                                            <Icon size={12} />
                                            <span>{option.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            {hasActiveTypeFilter && (
                                <button
                                    type="button"
                                    onClick={clearFileTypeFilter}
                                    className="mt-2 w-full rounded px-2 py-1 text-xs text-surface-400 hover:bg-surface-700 hover:text-surface-200"
                                    title="タイプ絞り込みを解除"
                                >
                                    全表示に戻す
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Sort Controls（常時表示） */}
                <div className={CTRL_GROUP}>
                    <span className={CTRL_LABEL}>並び替え:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => {
                            const value = e.target.value as typeof sortBy;
                            setSortBy(value);
                            setDefaultSortBy(value);
                            void persistListDisplayDefaults({ sortBy: value });
                        }}
                        className={CTRL_SELECT}
                    >
                        <option value="name">名前</option>
                        <option value="date">日付</option>
                        <option value="size">サイズ</option>
                        <option value="type">種類</option>
                        <option value="overallRating">総合評価</option>
                        <option value="accessCount">アクセス回数</option>
                        <option value="lastAccessed">直近アクセス</option>
                    </select>
                    <button
                        onClick={() => {
                            const nextSortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
                            setSortOrder(nextSortOrder);
                            setDefaultSortOrder(nextSortOrder);
                            void persistListDisplayDefaults({ sortOrder: nextSortOrder });
                        }}
                        className="p-0.5 hover:bg-surface-700 rounded transition-colors text-surface-400 hover:text-surface-200"
                        title={sortOrder === 'asc' ? '昇順' : '降順'}
                    >
                        {sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    </button>
                </div>

                {/* Group Controls（常時表示） */}
                <div className={CTRL_GROUP}>
                    <span className={CTRL_LABEL}>グループ:</span>
                    <select
                        value={groupBy}
                        onChange={(e) => {
                            const value = e.target.value as GroupBy;
                            setGroupBy(value);
                            setDefaultGroupBy(value);
                            void persistListDisplayDefaults({ groupBy: value });
                        }}
                        className={CTRL_SELECT}
                    >
                        <option value="none">なし</option>
                        <option value="date">日付別</option>
                        <option value="size">サイズ別</option>
                        <option value="type">タイプ別</option>
                    </select>
                    {groupBy === 'date' && (
                        <select
                            value={dateGroupingMode}
                            onChange={(e) => {
                                const value = e.target.value as DateGroupingMode;
                                setDateGroupingMode(value);
                                setDefaultDateGroupingMode(value);
                                void persistListDisplayDefaults({ dateGroupingMode: value });
                            }}
                            className={CTRL_SELECT}
                        >
                            <option value="auto">自動</option>
                            <option value="week">週ごと</option>
                        </select>
                    )}
                </div>

                {hasActiveSavedFilters && (
                    <button
                        type="button"
                        onClick={() => {
                            clearSearchConditions(defaultSearchTarget);
                            clearFileTypeFilter();
                            setRatingQuickFilter('none');
                        }}
                        className={CTRL_BUTTON_DEFAULT}
                        title="検索と絞り込みを初期状態へ戻す"
                    >
                        <RotateCcw size={12} />
                        <span>絞り込み解除</span>
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => setIsDisplayControlsOpen((prev) => !prev)}
                    className={`ml-auto ${CTRL_BUTTON_MUTED}`}
                    title={isDisplayControlsOpen ? '表示設定を閉じる' : '表示設定を開く'}
                >
                    <SlidersHorizontal size={12} />
                    {isDisplayControlsOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    <span>表示設定を{isDisplayControlsOpen ? '閉じる' : '開く'}</span>
                </button>
            </div>

            {isDisplayControlsOpen && (
                <div className="flex flex-wrap items-center gap-2">
                    {/* Layout Preset Controls */}
                    <div ref={modeMenuRef} className={`relative ${CTRL_GROUP}`}>
                        <span className={CTRL_LABEL}>表示:</span>
                        <button
                            onClick={() => setIsModeMenuOpen(!isModeMenuOpen)}
                            className={`${CTRL_BUTTON} bg-surface-700 text-surface-300 hover:bg-surface-600 whitespace-nowrap`}
                            title="表示モードを切り替え"
                        >
                            <SelectedDisplayModeIcon size={12} />
                            <span>{selectedDisplayPreset.definition.label}</span>
                        </button>

                        {isModeMenuOpen && (
                            <div className="absolute top-full mt-1 right-0 bg-surface-800 rounded shadow-lg border border-surface-700 py-1 z-50 min-w-[160px]">
                                {displayPresetMenuOptions.map((option) => {
                                    const Icon = ICON_BY_KEY[option.definition.iconKey];
                                    const isActive = selectedDisplayPreset.id === option.id;
                                    return (
                                        <button
                                            key={option.id}
                                            onClick={() => {
                                                setActiveDisplayPreset({
                                                    id: option.id,
                                                    baseDisplayMode: option.baseDisplayMode,
                                                    thumbnailPresentation: option.thumbnailPresentation,
                                                });
                                                setDefaultActiveDisplayPreset({
                                                    id: option.id,
                                                    baseDisplayMode: option.baseDisplayMode,
                                                    thumbnailPresentation: option.thumbnailPresentation,
                                                });
                                                void persistListDisplayDefaults({
                                                    activeDisplayPresetId: option.id,
                                                    displayMode: option.baseDisplayMode,
                                                    thumbnailPresentation: option.thumbnailPresentation,
                                                });
                                                setIsModeMenuOpen(false);
                                            }}
                                            className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-700 transition-colors text-xs ${isActive ? 'bg-primary-500/20 text-primary-300' : 'text-surface-200'}`}
                                        >
                                            <Icon size={14} />
                                            <span>{option.definition.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Thumbnail Presentation Controls */}
                    <div className={CTRL_GROUP}>
                        <span className={CTRL_LABEL}>サムネ:</span>
                        <select
                            value={thumbnailPresentation}
                            onChange={(e) => {
                                const value = e.target.value as ThumbnailPresentation;
                                setThumbnailPresentation(value);
                                setDefaultThumbnailPresentation(value);
                                void persistListDisplayDefaults({ thumbnailPresentation: value });
                            }}
                            className={CTRL_SELECT}
                        >
                            {THUMBNAIL_PRESENTATION_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* リセットボタン */}
                    <button
                        type="button"
                        onClick={() => resetListDisplayToDefaults({
                            sortBy: defaultSortBy,
                            sortOrder: defaultSortOrder,
                            groupBy: defaultGroupBy,
                            dateGroupingMode: defaultDateGroupingMode,
                            displayMode: defaultDisplayMode,
                            activeDisplayPresetId: defaultActiveDisplayPresetId,
                            thumbnailPresentation: defaultThumbnailPresentation,
                        })}
                        className={CTRL_BUTTON_DEFAULT}
                        title="表示設定を既定値に戻す"
                    >
                        <RotateCcw size={12} />
                        <span>既定値に戻す</span>
                    </button>
                </div>
            )}
        </div>
    );
});

Header.displayName = 'Header';

// 後方互換性のため SortMenu もエクスポート
export const SortMenu = Header;
