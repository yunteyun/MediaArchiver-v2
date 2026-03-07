/**
 * Header - 検索バーとソートメニューを含むヘッダー
 */

import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown, Wand2, Grid, LayoutGrid, Film, Minimize2, Maximize2, Image, Music, Archive, ChevronDown, ChevronUp, SlidersHorizontal, Tag } from 'lucide-react';
import { useUIStore } from '../stores/useUIStore';
import { useSettingsStore, type GroupBy, type ThumbnailPresentation } from '../stores/useSettingsStore';
import { useFileStore } from '../stores/useFileStore';
import { useTagStore } from '../stores/useTagStore';
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

const HEADER_DISPLAY_CONTROLS_OPEN_STORAGE_KEY = 'header.displayControls.open.v1';

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
    const loadTags = useTagStore((s) => s.loadTags);
    const [isDisplayControlsOpen, setIsDisplayControlsOpen] = useState<boolean>(() =>
        readInitialToggleOpen(HEADER_DISPLAY_CONTROLS_OPEN_STORAGE_KEY, true)
    );
    const [isApplyingAutoTags, setIsApplyingAutoTags] = useState(false);
    const [isApplyingFilenameTags, setIsApplyingFilenameTags] = useState(false);

    useEffect(() => {
        try {
            window.localStorage.setItem(HEADER_DISPLAY_CONTROLS_OPEN_STORAGE_KEY, isDisplayControlsOpen ? '1' : '0');
        } catch {
            // ignore localStorage errors
        }
    }, [isDisplayControlsOpen]);

    // 自動タグ適用ハンドラー (Phase 12-8 フェーズ2)
    const handleApplyAutoTags = async () => {
        const targetIds = selectedIds.size > 0 ? Array.from(selectedIds) : files.map(f => f.id);

        if (targetIds.length === 0) {
            toastInfo('適用するファイルがありません');
            return;
        }

        setIsApplyingAutoTags(true);
        try {
            const result = await window.electronAPI.applyAutoTagsToFiles(targetIds);

            if (result.tagsAssigned > 0) {
                toastSuccess(`${result.filesUpdated}件のファイルに${result.tagsAssigned}個のタグを適用しました`);
                await useFileStore.getState().loadFileTagsCache();
            } else {
                toastInfo('適用されたタグはありませんでした');
            }
        } catch (error) {
            console.error('Auto tag apply error:', error);
            toastError('自動タグ適用中にエラーが発生しました');
        } finally {
            setIsApplyingAutoTags(false);
        }
    };

    const handleApplyFilenameBracketTags = async () => {
        const targetIds = selectedIds.size > 0 ? Array.from(selectedIds) : files.map((file) => file.id);

        if (targetIds.length === 0) {
            toastInfo('適用するファイルがありません');
            return;
        }

        setIsApplyingFilenameTags(true);
        try {
            const preview = await window.electronAPI.previewFilenameBracketTags(targetIds);
            if (preview.candidateTagNames.length === 0) {
                toastInfo('[] / () 内にタグ候補が見つかりませんでした');
                return;
            }

            const sampleNames = preview.candidateTagNames.slice(0, 8).join(', ');
            const remainingCount = Math.max(preview.candidateTagNames.length - 8, 0);
            const targetLabel = selectedIds.size > 0
                ? `選択中の${targetIds.length}件`
                : `現在表示中の${targetIds.length}件`;
            const confirmed = window.confirm([
                `${targetLabel}からファイル名の [] / () 内の語句をタグとして適用します。`,
                '',
                `候補タグ: ${preview.candidateTagNames.length}件`,
                `新規作成予定: ${preview.newTagNames.length}件`,
                `候補が見つかったファイル: ${preview.filesWithCandidates}件`,
                '',
                `候補例: ${sampleNames}${remainingCount > 0 ? ` ほか${remainingCount}件` : ''}`,
                '',
                'このまま実行しますか？',
            ].join('\n'));

            if (!confirmed) {
                return;
            }

            const result = await window.electronAPI.applyFilenameBracketTagsToFiles(targetIds);
            if (result.tagsAssigned === 0 && result.tagsCreated === 0) {
                toastInfo('追加されたタグはありませんでした');
                return;
            }

            await Promise.all([
                useFileStore.getState().loadFileTagsCache(),
                loadTags(),
            ]);
            toastSuccess(
                `${result.filesUpdated}件のファイルに${result.tagsAssigned}個のタグを適用しました` +
                (result.tagsCreated > 0 ? `（新規タグ ${result.tagsCreated}件作成）` : '')
            );
        } catch (error) {
            console.error('Filename bracket tag apply error:', error);
            toastError('ファイル名記号タグの適用中にエラーが発生しました');
        } finally {
            setIsApplyingFilenameTags(false);
        }
    };



    return (
        <div className="px-4 py-2 bg-surface-900 border-b border-surface-700 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                {/* Search Bar */}
                <SearchBar />

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

                {/* Auto Tag Apply Button (Phase 12-8 フェーズ2) */}
                <button
                    onClick={handleApplyAutoTags}
                    disabled={isApplyingAutoTags || isApplyingFilenameTags}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:text-surface-500 text-white text-sm transition-colors whitespace-nowrap"
                    title={selectedIds.size > 0 ? `選択中の${selectedIds.size}件に自動タグを適用` : '全ファイルに自動タグを適用'}
                >
                    <Wand2 size={16} className={isApplyingAutoTags ? 'animate-spin' : ''} />
                    {isApplyingAutoTags ? '適用中...' : '自動タグ適用'}
                </button>

                <button
                    onClick={handleApplyFilenameBracketTags}
                    disabled={isApplyingAutoTags || isApplyingFilenameTags}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-800 hover:bg-surface-700 disabled:bg-surface-700 disabled:text-surface-500 text-surface-100 border border-surface-700 text-sm transition-colors whitespace-nowrap"
                    title={selectedIds.size > 0 ? `選択中の${selectedIds.size}件から [] / () 内の語句をタグ化` : '表示中のファイルから [] / () 内の語句をタグ化'}
                >
                    <Tag size={16} className={isApplyingFilenameTags ? 'animate-pulse' : ''} />
                    {isApplyingFilenameTags ? '確認中...' : 'ファイル名記号タグ'}
                </button>

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
                    <div className="flex flex-wrap items-center gap-3 rounded border border-surface-700 bg-surface-900/50 px-2 py-2">
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
                    </div>
                </div>
            )}
        </div>
    );
});

Header.displayName = 'Header';

// 後方互換性のため SortMenu もエクスポート
export const SortMenu = Header;
