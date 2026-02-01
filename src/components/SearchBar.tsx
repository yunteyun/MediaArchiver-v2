/**
 * SearchBar - ファイル名検索用の入力フィールド
 */

import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useUIStore } from '../stores/useUIStore';

export const SearchBar = React.memo(() => {
    const searchQuery = useUIStore((s) => s.searchQuery);
    const setSearchQuery = useUIStore((s) => s.setSearchQuery);

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
        setSearchQuery('');
    };

    return (
        <div className="relative flex-1 max-w-md">
            <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"
            />
            <input
                type="text"
                placeholder="ファイル名で検索..."
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
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
    );
});

SearchBar.displayName = 'SearchBar';
