/**
 * Header - 検索バーとソートメニューを含むヘッダー
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowDown, Grid, LayoutGrid, Film, Minimize2, Maximize2, Image, Music, Archive, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
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
import { findMatchingListDisplayPresetId, LIST_DISPLAY_PRESETS, type ListDisplayPresetId } from '../shared/listDisplayPresets';

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
    const modeMenuRef = useRef<HTMLDivElement>(null);
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

    const activeListDisplayPresetId = React.useMemo(
        () => findMatchingListDisplayPresetId({
            sortBy,
            sortOrder,
            groupBy,
            dateGroupingMode,
        }),
        [sortBy, sortOrder, groupBy, dateGroupingMode]
    );

    const applyListDisplayPreset = useCallback((presetId: ListDisplayPresetId) => {
        const preset = LIST_DISPLAY_PRESETS.find((entry) => entry.id === presetId);
        if (!preset) return;

        setSortBy(preset.settings.sortBy);
        setSortOrder(preset.settings.sortOrder);
        setGroupBy(preset.settings.groupBy);
        setDateGroupingMode(preset.settings.dateGroupingMode);
        setDefaultSortBy(preset.settings.sortBy);
        setDefaultSortOrder(preset.settings.sortOrder);
        setDefaultGroupBy(preset.settings.groupBy);
        setDefaultDateGroupingMode(preset.settings.dateGroupingMode);
        void persistListDisplayDefaults(preset.settings);
    }, [
        persistListDisplayDefaults,
        setDateGroupingMode,
        setDefaultDateGroupingMode,
        setDefaultGroupBy,
        setDefaultSortBy,
        setDefaultSortOrder,
        setGroupBy,
        setSortBy,
        setSortOrder,
    ]);

    const activeListDisplayPresetValue = activeListDisplayPresetId ?? '__custom__';

    return (
        <div className="px-4 py-2 bg-surface-900 border-b border-surface-700 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                {/* Search Bar */}
                <SearchBar />

                <div className="flex items-center gap-2 rounded border border-surface-700 bg-surface-900/50 px-2 py-1.5">
                    <span className="text-surface-400 text-sm whitespace-nowrap">一覧:</span>
                    <select
                        value={activeListDisplayPresetValue}
                        onChange={(e) => {
                            const value = e.target.value as ListDisplayPresetId | '__custom__';
                            if (value === '__custom__') return;
                            applyListDisplayPreset(value);
                        }}
                        className="min-w-[140px] rounded border border-surface-600 bg-surface-800 px-3 py-1 text-sm text-surface-200 focus:outline-none focus:border-primary-500"
                        title="一覧の見方をすばやく切り替え"
                    >
                        {LIST_DISPLAY_PRESETS.map((preset) => (
                            <option key={preset.id} value={preset.id}>
                                {preset.label}
                            </option>
                        ))}
                        <option value="__custom__">カスタム</option>
                    </select>
                </div>

                {/* File Type Filter */}
                <div className="flex items-center gap-2 rounded border border-surface-700 bg-surface-900/50 px-2 py-1.5">
                    <span className="text-surface-400 text-sm whitespace-nowrap">タイプ:</span>
                    <div className="flex items-center gap-1">
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
                                            : 'bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200'
                                    }`}
                                    title={`${option.label}を選択（Ctrl+クリックで即トグル）`}
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

                <button
                    type="button"
                    onClick={() => setIsDisplayControlsOpen((prev) => !prev)}
                    className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-surface-300 bg-surface-800 hover:bg-surface-700"
                    title={isDisplayControlsOpen ? '表示設定を閉じる' : '表示設定を開く'}
                >
                    <SlidersHorizontal size={12} />
                    {isDisplayControlsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    <span>{isDisplayControlsOpen ? '表示設定を閉じる' : '表示設定を開く'}</span>
                </button>
            </div>

            {isDisplayControlsOpen && (
                <div className="flex flex-wrap items-start gap-2">
                    <div className="flex flex-col gap-2 rounded border border-surface-700 bg-surface-900/50 px-2 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-800 px-1 pb-2">
                            <div>
                                <div className="text-xs font-medium text-surface-300">現在の一覧表示</div>
                                <div className="text-[11px] text-surface-500">
                                    ここでの変更は現在のプロファイルに保存されます。設定画面の「一般 / 表示」と同じ内容をすばやく調整できます。
                                </div>
                            </div>
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
                                className="rounded border border-surface-700 bg-surface-800 px-2.5 py-1 text-xs text-surface-200 transition-colors hover:bg-surface-700"
                            >
                                既定値に戻す
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    useUIStore.getState().clearSearchConditions(defaultSearchTarget);
                                }}
                                className="rounded border border-surface-700 bg-surface-800 px-2.5 py-1 text-xs text-surface-200 transition-colors hover:bg-surface-700"
                            >
                                検索対象を既定値へ
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                        {/* Layout Preset Controls */}
                        <div ref={modeMenuRef} className="relative flex gap-1 items-center">
                            <span className="text-surface-400 text-sm whitespace-nowrap mr-1">表示:</span>
                            <button
                                onClick={() => setIsModeMenuOpen(!isModeMenuOpen)}
                                className="flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors bg-surface-700 text-surface-300 hover:bg-surface-600 whitespace-nowrap"
                                title="表示モードを切り替え"
                            >
                                <SelectedDisplayModeIcon size={14} />
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
                                                className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-surface-700 transition-colors text-sm ${isActive ? 'bg-primary-500/20 text-primary-300' : 'text-surface-200'}`}
                                            >
                                                <Icon size={16} />
                                                <span>{option.definition.label}</span>
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
                                onChange={(e) => {
                                    const value = e.target.value as ThumbnailPresentation;
                                    setThumbnailPresentation(value);
                                    setDefaultThumbnailPresentation(value);
                                    void persistListDisplayDefaults({ thumbnailPresentation: value });
                                }}
                                className="px-3 py-1 bg-surface-800 text-surface-200 border border-surface-600 rounded text-sm focus:outline-none focus:border-primary-500"
                            >
                                {THUMBNAIL_PRESENTATION_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Sort Controls */}
                        <div className="flex gap-2 items-center">
                            <span className="text-surface-400 text-sm whitespace-nowrap">並び替え:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => {
                                    const value = e.target.value as typeof sortBy;
                                    setSortBy(value);
                                    setDefaultSortBy(value);
                                    void persistListDisplayDefaults({ sortBy: value });
                                }}
                                className="px-3 py-1 bg-surface-800 text-surface-200 border border-surface-600 rounded text-sm focus:outline-none focus:border-primary-500"
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
                                onChange={(e) => {
                                    const value = e.target.value as GroupBy;
                                    setGroupBy(value);
                                    setDefaultGroupBy(value);
                                    void persistListDisplayDefaults({ groupBy: value });
                                }}
                                className="px-3 py-1 bg-surface-800 text-surface-200 border border-surface-600 rounded text-sm focus:outline-none focus:border-primary-500"
                            >
                                <option value="none">なし</option>
                                <option value="date">日付別</option>
                                <option value="size">サイズ別</option>
                                <option value="type">タイプ別</option>
                            </select>
                        </div>

                        {groupBy === 'date' && (
                            <div className="flex gap-2 items-center">
                                <span className="text-surface-400 text-sm whitespace-nowrap">日付まとめ:</span>
                                <select
                                    value={dateGroupingMode}
                                    onChange={(e) => {
                                        const value = e.target.value as DateGroupingMode;
                                        setDateGroupingMode(value);
                                        setDefaultDateGroupingMode(value);
                                        void persistListDisplayDefaults({ dateGroupingMode: value });
                                    }}
                                    className="px-3 py-1 bg-surface-800 text-surface-200 border border-surface-600 rounded text-sm focus:outline-none focus:border-primary-500"
                                >
                                    <option value="auto">自動（月をまたぐ古い項目は月単位）</option>
                                    <option value="week">週ごとを維持（古い項目も週単位）</option>
                                </select>
                            </div>
                        )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

Header.displayName = 'Header';

// 後方互換性のため SortMenu もエクスポート
export const SortMenu = Header;
