/**
 * Header - 検索バーとソートメニューを含むヘッダー
 */

import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useUIStore } from '../stores/useUIStore';
import { SearchBar } from './SearchBar';

export const Header = React.memo(() => {
    const sortBy = useUIStore((s) => s.sortBy);
    const sortOrder = useUIStore((s) => s.sortOrder);
    const setSortBy = useUIStore((s) => s.setSortBy);
    const setSortOrder = useUIStore((s) => s.setSortOrder);

    return (
        <div className="flex gap-4 items-center px-4 py-2 bg-surface-900 border-b border-surface-700">
            {/* Search Bar */}
            <SearchBar />

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
                </select>
                <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-1.5 hover:bg-surface-700 rounded transition-colors text-surface-400 hover:text-white"
                    title={sortOrder === 'asc' ? '昇順' : '降順'}
                >
                    {sortOrder === 'asc' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                </button>
            </div>
        </div>
    );
});

Header.displayName = 'Header';

// 後方互換性のため SortMenu もエクスポート
export const SortMenu = Header;

