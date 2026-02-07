/**
 * Header - 検索バーとソートメニューを含むヘッダー
 */

import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useSettingsStore, type CardSize } from '../stores/useSettingsStore';
import { SearchBar } from './SearchBar';

export const Header = React.memo(() => {
    const sortBy = useSettingsStore((s) => s.sortBy);
    const sortOrder = useSettingsStore((s) => s.sortOrder);
    const setSortBy = useSettingsStore((s) => s.setSortBy);
    const setSortOrder = useSettingsStore((s) => s.setSortOrder);
    const cardSize = useSettingsStore((s) => s.cardSize);
    const setCardSize = useSettingsStore((s) => s.setCardSize);

    const sizeOptions: { value: CardSize; label: string }[] = [
        { value: 'small', label: 'S' },
        { value: 'medium', label: 'M' },
        { value: 'large', label: 'L' },
    ];

    return (
        <div className="flex gap-4 items-center px-4 py-2 bg-surface-900 border-b border-surface-700">
            {/* Search Bar */}
            <SearchBar />

            {/* Card Size Controls */}
            <div className="flex gap-1 items-center">
                <span className="text-surface-400 text-sm whitespace-nowrap mr-1">サイズ:</span>
                {sizeOptions.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => setCardSize(opt.value)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${cardSize === opt.value
                            ? 'bg-primary-600 text-white'
                            : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
                            }`}
                        title={`カードサイズ: ${opt.label}`}
                    >
                        {opt.label}
                    </button>
                ))}
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
