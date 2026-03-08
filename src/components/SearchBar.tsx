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
        <div className="flex flex-1 max-w-xl items-center gap-2">
            <div className="flex items-center gap-1 rounded border border-surface-700 bg-surface-900/50 p-1">
                <button
                    type="button"
                    onClick={() => setSearchTarget('fileName')}
                    className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                        searchTarget === 'fileName'
                            ? 'bg-primary-600 text-white'
                            : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200'
                    }`}
                    title="ファイル名で検索"
                >
                    <Search size={12} />
                    <span>ファイル名</span>
                </button>
                <button
                    type="button"
                    onClick={() => setSearchTarget('folderName')}
                    className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                        searchTarget === 'folderName'
                            ? 'bg-primary-600 text-white'
                            : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200'
                    }`}
                    title="フォルダ名で検索"
                >
                    <FolderOpen size={12} />
                    <span>フォルダ名</span>
                </button>
            </div>

            <div className="relative flex-1">
                <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"
                />
                <input
                    type="text"
                    placeholder={searchTarget === 'folderName'
                        ? 'フォルダ名で検索... (Ctrl+F)'
                        : 'ファイル名で検索... (Ctrl+F)'}
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    data-search-input
                    className="w-full pl-9 pr-8 py-1.5 bg-surface-800 text-surface-200 border border-surface-600 rounded text-sm focus:outline-none focus:border-primary-500 placeholder-surface-500"
                />
                {localValue && (
                    <button
                        onClick={handleClear}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-surface-700 rounded"
                    >
                        <X size={14} className="text-surface-400 hover:text-surface-200" />
                    </button>
                )}
            </div>
        </div>
    );
});

SearchBar.displayName = 'SearchBar';
