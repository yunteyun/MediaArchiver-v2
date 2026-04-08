/**
 * SearchBar - 一覧検索用の入力フィールド
 */

import React, { useState, useEffect } from 'react';
import { FolderOpen, Search, X } from 'lucide-react';
import { useUIStore } from '../stores/useUIStore';
import { useSettingsStore } from '../stores/useSettingsStore';

export const SearchBar = React.memo(() => {
    const searchQuery = useUIStore((s) => s.searchQuery);
    const searchTarget = useUIStore((s) => s.searchTarget);
    const setSearchQuery = useUIStore((s) => s.setSearchQuery);
    const setSearchTarget = useUIStore((s) => s.setSearchTarget);
    const clearSearchConditions = useUIStore((s) => s.clearSearchConditions);
    const defaultSearchTarget = useSettingsStore((s) => s.defaultSearchTarget);

    // ローカル入力値（デバウンス用）
    const [localValue, setLocalValue] = useState(searchQuery);

    // デバウンス: 300ms 後に反映
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchQuery(localValue);
        }, 300);
        return () => clearTimeout(timer);
    }, [localValue, setSearchQuery]);

    // 外部からの変更を反映
    useEffect(() => {
        setLocalValue(searchQuery);
    }, [searchQuery]);

    const handleClear = () => {
        setLocalValue('');
        clearSearchConditions(defaultSearchTarget);
    };

    return (
        <div className="flex flex-1 max-w-xl items-center">
            <div className="relative flex-1 flex items-center rounded border border-surface-700 bg-surface-900/50 focus-within:border-primary-500">
                <button
                    type="button"
                    onClick={() => setSearchTarget(searchTarget === 'fileName' ? 'folderName' : 'fileName')}
                    className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-[5px] text-xs transition-colors border-r border-surface-700 rounded-l ${
                        searchTarget === 'folderName'
                            ? 'bg-primary-600/15 text-primary-300'
                            : 'text-surface-400 hover:text-surface-200 hover:bg-surface-700'
                    }`}
                    title={searchTarget === 'fileName' ? 'フォルダ名検索に切替' : 'ファイル名検索に切替'}
                >
                    {searchTarget === 'folderName' ? <FolderOpen size={12} /> : <Search size={12} />}
                    <span>{searchTarget === 'folderName' ? 'フォルダ' : 'ファイル'}</span>
                </button>
                <input
                    type="text"
                    placeholder={searchTarget === 'folderName'
                        ? 'フォルダ名で検索... (Ctrl+F)'
                        : 'ファイル名で検索... (Ctrl+F)'}
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    data-search-input
                    className="flex-1 min-w-0 bg-transparent pl-2 pr-8 py-[5px] text-surface-200 text-xs focus:outline-none placeholder-surface-500"
                />
                {localValue && (
                    <button
                        onClick={handleClear}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-surface-700 rounded"
                    >
                        <X size={12} className="text-surface-400 hover:text-surface-200" />
                    </button>
                )}
            </div>
        </div>
    );
});

SearchBar.displayName = 'SearchBar';
