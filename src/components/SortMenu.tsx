/**
 * Header - 検索バーとソートメニューを含むヘッダー
 */

import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown, Wand2, Grid, LayoutGrid, Film, Minimize2, Maximize2 } from 'lucide-react';
import { useSettingsStore, type GroupBy } from '../stores/useSettingsStore';
import { useFileStore } from '../stores/useFileStore';
import { useToastStore } from '../stores/useToastStore';
import { SearchBar } from './SearchBar';
import { getDisplayModeDefinition, getDisplayModeMenuOptions } from './fileCard/displayModes';
import type { DisplayModeIconKey } from './fileCard/displayModeTypes';

const ICON_BY_KEY: Record<DisplayModeIconKey, React.ComponentType<{ size?: number; className?: string }>> = {
    grid: Grid,
    maximize: Maximize2,
    layoutGrid: LayoutGrid,
    film: Film,
    minimize: Minimize2,
};

const DISPLAY_MODE_MENU_OPTIONS = getDisplayModeMenuOptions();

export const Header = React.memo(() => {
    const sortBy = useSettingsStore((s) => s.sortBy);
    const sortOrder = useSettingsStore((s) => s.sortOrder);
    const setSortBy = useSettingsStore((s) => s.setSortBy);
    const setSortOrder = useSettingsStore((s) => s.setSortOrder);

    const groupBy = useSettingsStore((s) => s.groupBy);
    const setGroupBy = useSettingsStore((s) => s.setGroupBy);
    // Phase 14: 表示モード状態
    const displayMode = useSettingsStore((s) => s.displayMode);
    const setDisplayMode = useSettingsStore((s) => s.setDisplayMode);
    const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
    const modeMenuRef = useRef<HTMLDivElement>(null);
    const selectedDisplayModeOption = getDisplayModeDefinition(displayMode);
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
    const toastInfo = useToastStore((s) => s.info);
    const toastSuccess = useToastStore((s) => s.success);
    const toastError = useToastStore((s) => s.error);
    const [isApplying, setIsApplying] = useState(false);

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
        <div className="flex gap-4 items-center px-4 py-2 bg-surface-900 border-b border-surface-700">
            {/* Search Bar */}
            <SearchBar />



            {/* Display Mode Controls (Phase 14-6) */}
            <div ref={modeMenuRef} className="relative flex gap-1 items-center">
                <span className="text-surface-400 text-sm whitespace-nowrap mr-1">表示:</span>
                <button
                    onClick={() => setIsModeMenuOpen(!isModeMenuOpen)}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors bg-surface-700 text-surface-300 hover:bg-surface-600"
                    title="表示モードを切り替え"
                >
                    <SelectedDisplayModeIcon size={14} />
                    <span>{selectedDisplayModeOption.label}</span>
                </button>

                {isModeMenuOpen && (
                    <div className="absolute top-full mt-1 right-0 bg-surface-800 rounded shadow-lg border border-surface-700 py-1 z-50 min-w-[160px]">
                        {DISPLAY_MODE_MENU_OPTIONS.map((option) => {
                            const Icon = ICON_BY_KEY[option.iconKey];
                            const isActive = displayMode === option.mode;
                            return (
                                <button
                                    key={option.mode}
                                    onClick={() => { setDisplayMode(option.mode); setIsModeMenuOpen(false); }}
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

            {/* Auto Tag Apply Button (Phase 12-8 フェーズ2) */}
            <button
                onClick={handleApplyAutoTags}
                disabled={isApplying}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:text-surface-500 text-white text-sm transition-colors"
                title={selectedIds.size > 0 ? `選択中の${selectedIds.size}件に自動タグを適用` : '全ファイルに自動タグを適用'}
            >
                <Wand2 size={16} className={isApplying ? 'animate-spin' : ''} />
                {isApplying ? '適用中...' : '自動タグ適用'}
            </button>
        </div>
    );
});

Header.displayName = 'Header';

// 後方互換性のため SortMenu もエクスポート
export const SortMenu = Header;
