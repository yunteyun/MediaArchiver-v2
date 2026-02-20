/**
 * AdvancedSearchPanel - 詳細検索パネル
 * Phase 26-D2
 *
 * タグ(AND/OR)・評価軸範囲・テキスト・ファイルタイプによる複合検索。
 * 右サイドから開くドロワー形式。検索結果をSearchResultsViewで表示。
 */

import React, { useState, useCallback } from 'react';
import { X, Search, Star } from 'lucide-react';
import { StarRatingInput } from '../StarRatingInput';
import { useRatingStore } from '../../stores/useRatingStore';
import { useTagStore } from '../../stores/useTagStore';
import { toMediaUrl } from '../../utils/mediaPath';

// ローカル型定義（electron.d.tsのグローバル宣言が届かない場合の対策）
interface LocalSearchCondition {
    text?: string;
    tags?: { ids: string[]; mode: 'AND' | 'OR' };
    ratings?: { axisId: string; min?: number; max?: number }[];
    types?: string[];
}

interface LocalSearchResult {
    id: string;
    name: string;
    path: string;
    type: string;
    size: number;
    duration: number | null;
    width: number | null;
    height: number | null;
    createdAt: number;
    thumbnailPath: string | null;
}

interface AdvancedSearchPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const FILE_TYPES = [
    { value: 'image', label: '画像' },
    { value: 'video', label: '動画' },
    { value: 'audio', label: '音声' },
    { value: 'archive', label: '書庫' },
];

export const AdvancedSearchPanel: React.FC<AdvancedSearchPanelProps> = ({ isOpen, onClose }) => {
    const axes = useRatingStore((s) => s.axes);
    const tags = useTagStore((s) => s.tags);

    // 検索条件 state
    const [textQuery, setTextQuery] = useState('');
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [tagMode, setTagMode] = useState<'AND' | 'OR'>('OR');
    const [ratingFilters, setRatingFilters] = useState<Record<string, { min?: number; max?: number }>>({});
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

    // 検索結果 state
    const [results, setResults] = useState<LocalSearchResult[] | null>(null);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = useCallback(async () => {
        setSearching(true);
        setError(null);
        try {
            const condition: LocalSearchCondition = {};
            if (textQuery.trim()) condition.text = textQuery.trim();
            if (selectedTagIds.length > 0) condition.tags = { ids: selectedTagIds, mode: tagMode };
            const ratings = Object.entries(ratingFilters)
                .filter(([, r]) => r.min !== undefined || r.max !== undefined)
                .map(([axisId, r]) => ({ axisId, ...r }));
            if (ratings.length > 0) condition.ratings = ratings;
            if (selectedTypes.length > 0) condition.types = selectedTypes;

            const res = await window.electronAPI.searchFiles(condition);
            setResults(res);
        } catch (e: any) {
            setError(e.message || '検索に失敗しました');
        }
        setSearching(false);
    }, [textQuery, selectedTagIds, tagMode, ratingFilters, selectedTypes]);

    const handleReset = () => {
        setTextQuery('');
        setSelectedTagIds([]);
        setTagMode('OR');
        setRatingFilters({});
        setSelectedTypes([]);
        setResults(null);
        setError(null);
    };

    const toggleTag = (tagId: string) => {
        setSelectedTagIds((prev) =>
            prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
        );
    };

    const toggleType = (type: string) => {
        setSelectedTypes((prev) =>
            prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
        );
    };

    const setRatingMin = (axisId: string, value: number | null) => {
        setRatingFilters((prev) => ({
            ...prev,
            [axisId]: { ...prev[axisId], min: value ?? undefined },
        }));
    };

    const setRatingMax = (axisId: string, value: number | null) => {
        setRatingFilters((prev) => ({
            ...prev,
            [axisId]: { ...prev[axisId], max: value ?? undefined },
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[var(--z-modal)] flex justify-end">
            {/* オーバーレイ */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* ドロワーパネル */}
            <div className="relative w-[480px] h-full bg-surface-900 shadow-2xl flex flex-col overflow-hidden">
                {/* ヘッダー */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
                    <div className="flex items-center gap-2">
                        <Search size={18} className="text-primary-400" />
                        <h2 className="text-base font-semibold text-surface-100">詳細検索</h2>
                    </div>
                    <button onClick={onClose} className="text-surface-500 hover:text-surface-200 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* 検索条件フォーム */}
                <div className="flex-1 overflow-y-auto">
                    <div className="px-5 py-4 space-y-5">
                        {/* テキスト検索 */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">ファイル名</label>
                            <input
                                type="text"
                                value={textQuery}
                                onChange={(e) => setTextQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="ファイル名で検索..."
                                className="w-full bg-surface-800 border border-surface-600 rounded px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:border-primary-500 transition-colors"
                            />
                        </div>

                        {/* ファイルタイプ */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">ファイルタイプ</label>
                            <div className="flex flex-wrap gap-2">
                                {FILE_TYPES.map((ft) => (
                                    <button
                                        key={ft.value}
                                        onClick={() => toggleType(ft.value)}
                                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${selectedTypes.includes(ft.value)
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
                                            }`}
                                    >
                                        {ft.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* タグフィルター */}
                        {tags.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">タグ</label>
                                    <div className="flex gap-1">
                                        {(['OR', 'AND'] as const).map((mode) => (
                                            <button
                                                key={mode}
                                                onClick={() => setTagMode(mode)}
                                                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${tagMode === mode
                                                    ? 'bg-primary-600 text-white'
                                                    : 'bg-surface-700 text-surface-400 hover:bg-surface-600'
                                                    }`}
                                            >
                                                {mode}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                                    {tags.map((tag) => (
                                        <button
                                            key={tag.id}
                                            onClick={() => toggleTag(tag.id)}
                                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium transition-all"
                                            style={{
                                                backgroundColor: selectedTagIds.includes(tag.id)
                                                    ? (tag.color ?? '#6366f1')
                                                    : `${tag.color ?? '#6366f1'}22`,
                                                color: selectedTagIds.includes(tag.id) ? '#fff' : (tag.color ?? '#6366f1'),
                                                border: `1px solid ${tag.color ?? '#6366f1'}66`,
                                            }}
                                        >
                                            {tag.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 評価軸範囲 */}
                        {axes.length > 0 && (
                            <div className="space-y-3">
                                <label className="text-xs font-medium text-surface-400 uppercase tracking-wider flex items-center gap-1">
                                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                                    評価フィルター
                                </label>
                                {axes.map((axis) => (
                                    <div key={axis.id} className="bg-surface-800 rounded p-3 space-y-2">
                                        <div className="text-xs text-surface-300 font-medium">{axis.name}</div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <div className="text-xs text-surface-500">最低評価</div>
                                                <StarRatingInput
                                                    value={ratingFilters[axis.id]?.min}
                                                    minValue={axis.minValue}
                                                    maxValue={axis.maxValue}
                                                    step={axis.step}
                                                    onChange={(v) => setRatingMin(axis.id, v)}
                                                    size={14}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-xs text-surface-500">最高評価</div>
                                                <StarRatingInput
                                                    value={ratingFilters[axis.id]?.max}
                                                    minValue={axis.minValue}
                                                    maxValue={axis.maxValue}
                                                    step={axis.step}
                                                    onChange={(v) => setRatingMax(axis.id, v)}
                                                    size={14}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* フッター: 検索ボタン */}
                <div className="px-5 py-4 border-t border-surface-700 flex items-center gap-2">
                    <button
                        onClick={handleSearch}
                        disabled={searching}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                        <Search size={14} />
                        {searching ? '検索中...' : '検索'}
                    </button>
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-surface-300 rounded text-sm transition-colors"
                    >
                        リセット
                    </button>
                </div>

                {/* 検索結果 */}
                {(results !== null || error) && (
                    <div className="border-t border-surface-700 flex-1 overflow-y-auto">
                        {error && (
                            <div className="px-5 py-3 text-red-400 text-sm">{error}</div>
                        )}
                        {results !== null && (
                            <div>
                                <div className="px-5 py-2 text-xs text-surface-400 border-b border-surface-800">
                                    {results.length}件ヒット（最大500件）
                                </div>
                                <div className="divide-y divide-surface-800">
                                    {results.map((file) => (
                                        <div key={file.id} className="px-5 py-3 hover:bg-surface-800/50 transition-colors flex items-center gap-3">
                                            {file.thumbnailPath && (
                                                <img
                                                    src={toMediaUrl(file.thumbnailPath)}
                                                    alt={file.name}
                                                    className="w-10 h-10 object-cover rounded shrink-0"
                                                />
                                            )}
                                            <div className="min-w-0">
                                                <div className="text-sm text-surface-200 truncate">{file.name}</div>
                                                <div className="text-xs text-surface-500 truncate">{file.path}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {results.length === 0 && (
                                        <div className="px-5 py-8 text-center text-surface-500 text-sm">
                                            該当ファイルが見つかりませんでした
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
