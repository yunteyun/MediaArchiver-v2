/**
 * TagManagerModal - タグとカテゴリの管理モーダル
 * Phase 26-A: 左右ペイン構造に刷新
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Edit2, Trash2, Check, Tag as TagIcon, FolderOpen, Wand2, ChevronRight, GripVertical, Info } from 'lucide-react';
import { useTagStore, Tag, TagCategory } from '../../stores/useTagStore';
import { TagBadge } from './TagBadge';
import { AutoTagRulesTab } from '../AutoTagRulesTab';

// Color options for tags
const COLOR_OPTIONS = [
    'gray', 'red', 'orange', 'amber', 'yellow', 'lime', 'green',
    'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet',
    'purple', 'fuchsia', 'pink', 'rose'
];

// タグで使いやすい lucide-react アイコン名の候補（入力補助用）
const COMMON_TAG_ICON_NAMES = [
    'Tag',
    'Star',
    'Heart',
    'Music',
    'Image',
    'Film',
    'Gamepad2',
    'BookOpen',
    'Folder',
    'Sparkles',
    'Zap',
    'Flame',
    'Palette',
    'Camera',
    'Headphones',
    'Mic',
    'Bookmark',
    'Shield',
];

/** カテゴリ色→背景CSSクラス */
const colorBgClass = (color: string) =>
    color === 'amber' ? 'bg-amber-600'
        : color === 'yellow' ? 'bg-amber-500'
            : color === 'lime' ? 'bg-lime-600'
                : `bg-${color}-600`;

// 未分類カテゴリの仮想ID
const UNCATEGORIZED_ID = '__uncategorized__';

interface TagManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TagManagerModal = React.memo(({ isOpen, onClose }: TagManagerModalProps) => {
    const [activeTab, setActiveTab] = useState<'tags' | 'autoRules'>('tags');
    const [showPriorityHelp, setShowPriorityHelp] = useState(false);

    // カテゴリ選択（左ペイン）
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    // タグ編集
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('gray');
    const [newTagIcon, setNewTagIcon] = useState('');
    const [newTagDescription, setNewTagDescription] = useState('');

    // カテゴリ編集
    const [editingCategory, setEditingCategory] = useState<TagCategory | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState('gray');
    const [showCategoryForm, setShowCategoryForm] = useState(false);

    // D&D state
    const [dragCategoryId, setDragCategoryId] = useState<string | null>(null);
    const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);
    const [dragTagId, setDragTagId] = useState<string | null>(null);
    const [dragOverTagId, setDragOverTagId] = useState<string | null>(null);

    const tags = useTagStore((s) => s.tags);
    const categories = useTagStore((s) => s.categories);
    const loadTags = useTagStore((s) => s.loadTags);
    const loadCategories = useTagStore((s) => s.loadCategories);
    const createTag = useTagStore((s) => s.createTag);
    const updateTag = useTagStore((s) => s.updateTag);
    const deleteTag = useTagStore((s) => s.deleteTag);
    const createCategory = useTagStore((s) => s.createCategory);
    const updateCategory = useTagStore((s) => s.updateCategory);
    const deleteCategory = useTagStore((s) => s.deleteCategory);

    useEffect(() => {
        if (isOpen) {
            loadTags();
            loadCategories();
            setShowPriorityHelp(false);
            setDragTagId(null);
            setDragOverTagId(null);
        }
    }, [isOpen, loadTags, loadCategories]);

    // 初期選択: 最初のカテゴリまたは未分類
    useEffect(() => {
        if (isOpen && selectedCategoryId === null) {
            setSelectedCategoryId(categories.length > 0 ? categories[0]!.id : UNCATEGORIZED_ID);
        }
    }, [isOpen, categories, selectedCategoryId]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
        }
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // 選択中カテゴリに属するタグ
    const filteredTags = useMemo(() => {
        if (selectedCategoryId === UNCATEGORIZED_ID) {
            return tags
                .filter(t => !t.categoryId)
                .slice()
                .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
        }
        if (selectedCategoryId === null) {
            return tags
                .slice()
                .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
        }
        return tags
            .filter(t => t.categoryId === selectedCategoryId)
            .slice()
            .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
    }, [tags, selectedCategoryId]);

    // 未分類タグ数
    const uncategorizedCount = useMemo(() => tags.filter(t => !t.categoryId).length, [tags]);

    if (!isOpen) return null;
    if (typeof document === 'undefined') return null;

    // === Tag CRUD ===
    const handleCreateTag = async () => {
        if (!newTagName.trim()) return;
        const categoryId = selectedCategoryId === UNCATEGORIZED_ID ? undefined : (selectedCategoryId || undefined);
        await createTag(newTagName.trim(), newTagColor, categoryId, newTagIcon, newTagDescription);
        resetTagForm();
    };

    const handleUpdateTag = async () => {
        if (!editingTag || !newTagName.trim()) return;
        const categoryId = selectedCategoryId === UNCATEGORIZED_ID ? null : selectedCategoryId;
        await updateTag(editingTag.id, {
            name: newTagName.trim(),
            color: newTagColor,
            categoryId,
            icon: newTagIcon,
            description: newTagDescription
        });
        resetTagForm();
    };

    const handleDeleteTag = async (tag: Tag) => {
        if (confirm(`タグ "${tag.name}" を削除しますか？`)) {
            await deleteTag(tag.id);
        }
    };

    const handleTagDragStart = (tagId: string) => {
        setDragTagId(tagId);
    };

    const handleTagDragOver = (e: React.DragEvent, tagId: string) => {
        e.preventDefault();
        if (dragTagId === tagId) return;
        setDragOverTagId(tagId);
    };

    const handleTagDrop = async (e: React.DragEvent, targetTagId: string) => {
        e.preventDefault();
        if (!dragTagId || dragTagId === targetTagId) {
            setDragTagId(null);
            setDragOverTagId(null);
            return;
        }

        const sorted = [...filteredTags];
        const fromIdx = sorted.findIndex(t => t.id === dragTagId);
        const toIdx = sorted.findIndex(t => t.id === targetTagId);
        if (fromIdx === -1 || toIdx === -1) {
            setDragTagId(null);
            setDragOverTagId(null);
            return;
        }

        const reordered = [...sorted];
        const [moved] = reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, moved);

        const sortOrderSlots = sorted.map(t => t.sortOrder).sort((a, b) => a - b);

        await Promise.all(
            reordered.map((tag, idx) => {
                const nextSortOrder = sortOrderSlots[idx];
                if (nextSortOrder === undefined || nextSortOrder === tag.sortOrder) {
                    return Promise.resolve();
                }
                return updateTag(tag.id, { sortOrder: nextSortOrder });
            })
        );

        setDragTagId(null);
        setDragOverTagId(null);
    };

    const startEditTag = (tag: Tag) => {
        setEditingTag(tag);
        setNewTagName(tag.name);
        setNewTagColor(tag.color);
        setNewTagIcon(tag.icon || '');
        setNewTagDescription(tag.description || '');
    };

    const resetTagForm = () => {
        setEditingTag(null);
        setNewTagName('');
        setNewTagColor('gray');
        setNewTagIcon('');
        setNewTagDescription('');
    };

    // === Category CRUD ===
    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        const newCat = await createCategory(newCategoryName.trim(), newCategoryColor);
        resetCategoryForm();
        setSelectedCategoryId(newCat.id);
    };

    const handleUpdateCategory = async () => {
        if (!editingCategory || !newCategoryName.trim()) return;
        await updateCategory(editingCategory.id, {
            name: newCategoryName.trim(),
            color: newCategoryColor
        });
        resetCategoryForm();
    };

    const handleDeleteCategory = async (cat: TagCategory) => {
        if (confirm(`カテゴリ "${cat.name}" を削除しますか？\nタグはカテゴリなしになります。`)) {
            await deleteCategory(cat.id);
            if (selectedCategoryId === cat.id) {
                setSelectedCategoryId(UNCATEGORIZED_ID);
            }
        }
    };

    const startEditCategory = (cat: TagCategory) => {
        setEditingCategory(cat);
        setNewCategoryName(cat.name);
        setNewCategoryColor(cat.color);
        setShowCategoryForm(true);
    };

    const resetCategoryForm = () => {
        setEditingCategory(null);
        setNewCategoryName('');
        setNewCategoryColor('gray');
        setShowCategoryForm(false);
    };

    // === カテゴリ D&D ===
    const handleDragStart = (catId: string) => {
        setDragCategoryId(catId);
    };

    const handleDragOver = (e: React.DragEvent, catId: string) => {
        e.preventDefault();
        setDragOverCategoryId(catId);
    };

    const handleDrop = async (e: React.DragEvent, targetCatId: string) => {
        e.preventDefault();
        if (!dragCategoryId || dragCategoryId === targetCatId) {
            setDragCategoryId(null);
            setDragOverCategoryId(null);
            return;
        }
        // ソート順に並んだリストで再インデックス付け
        const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
        const fromIdx = sorted.findIndex(c => c.id === dragCategoryId);
        const toIdx = sorted.findIndex(c => c.id === targetCatId);
        if (fromIdx === -1 || toIdx === -1) return;
        const reordered = [...sorted];
        const [moved] = reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, moved);
        // 一括更新
        await Promise.all(
            reordered.map((cat, idx) =>
                updateCategory(cat.id, { sortOrder: idx * 10 })
            )
        );
        setDragCategoryId(null);
        setDragOverCategoryId(null);
    };

    // 選択中カテゴリ名
    const selectedCategoryName = selectedCategoryId === UNCATEGORIZED_ID
        ? '未分類'
        : categories.find(c => c.id === selectedCategoryId)?.name || '';

    return createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black/70" onClick={onClose} style={{ zIndex: 'var(--z-modal)' }}>
            <div
                className="bg-surface-900 rounded-lg border border-surface-700 shadow-2xl w-full max-w-5xl max-h-[82vh] flex flex-col"
                style={{ minWidth: '820px' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-surface-700">
                    <h2 className="text-lg font-bold text-white">タグ管理</h2>
                    <button onClick={onClose} className="p-1 hover:bg-surface-700 rounded">
                        <X size={20} className="text-surface-400" />
                    </button>
                </div>

                {/* Tabs: タグ管理 / 自動割り当て */}
                <div className="flex border-b border-surface-700">
                    <button
                        onClick={() => setActiveTab('tags')}
                        className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTab === 'tags'
                            ? 'text-primary-400 border-b-2 border-primary-400'
                            : 'text-surface-400 hover:text-surface-200'
                            }`}
                    >
                        <TagIcon size={16} className="inline mr-2" />
                        タグ・カテゴリ管理
                    </button>
                    <button
                        onClick={() => setActiveTab('autoRules')}
                        className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTab === 'autoRules'
                            ? 'text-primary-400 border-b-2 border-primary-400'
                            : 'text-surface-400 hover:text-surface-200'
                            }`}
                    >
                        <Wand2 size={16} className="inline mr-2" />
                        自動割り当て
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                    {activeTab === 'tags' ? (
                        <div className="flex h-full" style={{ minHeight: '400px' }}>
                            {/* === 左ペイン: カテゴリ一覧 === */}
                            <div className="w-64 flex-shrink-0 border-r border-surface-700 flex flex-col bg-surface-900/40">
                                <div className="p-3 border-b border-surface-700">
                                    <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider flex items-center gap-1">
                                        <FolderOpen size={12} />
                                        カテゴリ
                                    </h3>
                                    <p className="mt-1 text-[10px] leading-snug text-surface-500">
                                        ドラッグでカテゴリ順を変更。右ペインのタグ表示・編集対象を切り替えます。
                                    </p>
                                </div>

                                {/* カテゴリリスト */}
                                <div className="flex-1 overflow-auto">
                                    {categories
                                        .slice()
                                        .sort((a, b) => a.sortOrder - b.sortOrder)
                                        .map(cat => {
                                            const tagCount = tags.filter(t => t.categoryId === cat.id).length;
                                            const isSelected = selectedCategoryId === cat.id;
                                            const isDragging = dragCategoryId === cat.id;
                                            const isDragOver = dragOverCategoryId === cat.id && dragCategoryId !== cat.id;
                                            return (
                                                <div
                                                    key={cat.id}
                                                    draggable
                                                    onDragStart={() => handleDragStart(cat.id)}
                                                    onDragOver={(e) => handleDragOver(e, cat.id)}
                                                    onDrop={(e) => handleDrop(e, cat.id)}
                                                    onDragEnd={() => { setDragCategoryId(null); setDragOverCategoryId(null); }}
                                                    className={`flex items-center gap-1.5 px-2 py-2 cursor-pointer group transition-colors select-none
                                                    ${isSelected ? 'bg-primary-500/15 text-primary-300 border-r-2 border-primary-400' : 'hover:bg-surface-800 text-surface-300'}
                                                    ${isDragging ? 'opacity-40' : ''}
                                                    ${isDragOver ? 'border-t-2 border-primary-400' : ''}
                                                `}
                                                    onClick={() => { setSelectedCategoryId(cat.id); resetTagForm(); }}
                                                >
                                                    <GripVertical size={13} className="text-surface-600 group-hover:text-surface-400 flex-shrink-0 cursor-grab" />
                                                    <div className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${colorBgClass(cat.color)}`} />
                                                    <span className="text-sm truncate flex-1">{cat.name}</span>
                                                    <span className="text-[10px] text-surface-500">{tagCount}</span>
                                                    {isSelected && (
                                                        <div className="flex gap-0.5 ml-1">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); startEditCategory(cat); }}
                                                                className="p-0.5 hover:bg-surface-600 rounded"
                                                                title="編集"
                                                            >
                                                                <Edit2 size={11} className="text-surface-400" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }}
                                                                className="p-0.5 hover:bg-red-500/20 rounded"
                                                                title="削除"
                                                            >
                                                                <Trash2 size={11} className="text-red-400" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                    {/* 未分類 */}
                                    <div
                                        className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${selectedCategoryId === UNCATEGORIZED_ID
                                            ? 'bg-primary-500/15 text-primary-300 border-r-2 border-primary-400'
                                            : 'hover:bg-surface-800 text-surface-400'
                                            }`}
                                        onClick={() => { setSelectedCategoryId(UNCATEGORIZED_ID); resetTagForm(); }}
                                    >
                                        <div className="w-2.5 h-2.5 rounded-sm bg-surface-600 flex-shrink-0" />
                                        <span className="text-sm truncate flex-1 italic">未分類</span>
                                        <span className="text-[10px] text-surface-500">{uncategorizedCount}</span>
                                    </div>
                                </div>

                                {/* カテゴリ追加/編集フォーム */}
                                <div className="border-t border-surface-700">
                                    {showCategoryForm ? (
                                        <div className="p-2 space-y-2">
                                            <input
                                                type="text"
                                                placeholder="カテゴリ名..."
                                                value={newCategoryName}
                                                onChange={(e) => setNewCategoryName(e.target.value)}
                                                className="w-full px-2 py-1.5 bg-surface-800 border border-surface-600 rounded text-xs focus:outline-none focus:border-primary-500"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        editingCategory ? handleUpdateCategory() : handleCreateCategory();
                                                    }
                                                }}
                                                autoFocus
                                            />
                                            <div className="flex flex-wrap gap-0.5">
                                                {COLOR_OPTIONS.map(color => (
                                                    <button
                                                        key={color}
                                                        onClick={() => setNewCategoryColor(color)}
                                                        className={`w-4 h-4 rounded transition-all ${colorBgClass(color)} ${newCategoryColor === color ? 'ring-2 ring-white ring-offset-1 ring-offset-surface-900' : ''
                                                            }`}
                                                        title={color}
                                                    />
                                                ))}
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                                                    className="flex-1 py-1 bg-primary-600 hover:bg-primary-500 text-white rounded text-xs font-medium flex items-center justify-center gap-1"
                                                >
                                                    {editingCategory ? <Check size={12} /> : <Plus size={12} />}
                                                    {editingCategory ? '更新' : '追加'}
                                                </button>
                                                <button
                                                    onClick={resetCategoryForm}
                                                    className="px-2 py-1 text-xs text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded"
                                                >
                                                    取消
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowCategoryForm(true)}
                                            className="w-full px-3 py-2 text-xs text-surface-400 hover:text-surface-200 hover:bg-surface-800 flex items-center gap-1 transition-colors"
                                        >
                                            <Plus size={12} />
                                            カテゴリを追加
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* === 右ペイン: タグ一覧 === */}
                            <div className="flex-1 flex flex-col min-w-0">
                                {/* 右ペインヘッダー */}
                                <div className="px-4 py-3 border-b border-surface-700 bg-surface-900/50 relative">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-sm font-medium text-surface-200 flex items-center gap-1.5 min-w-0">
                                            <ChevronRight size={14} className="text-surface-500 flex-shrink-0" />
                                            <span className="truncate">{selectedCategoryName}</span>
                                            <span className="text-xs text-surface-500 ml-1 flex-shrink-0">({filteredTags.length} タグ)</span>
                                        </h3>
                                        <div className="flex items-center gap-1.5 text-[10px] text-surface-400 flex-shrink-0">
                                            <span
                                                className="px-1.5 py-0.5 rounded border border-surface-700 bg-surface-800/70"
                                                title="タグの表示優先順（内部名: sortOrder）"
                                            >
                                                タグ順: 表示優先順
                                            </span>
                                            <span
                                                className="px-1.5 py-0.5 rounded border border-surface-700 bg-surface-800/70"
                                                title="カテゴリの並び順（ドラッグで変更）"
                                            >
                                                カテゴリ順: ドラッグ順
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setShowPriorityHelp(v => !v)}
                                                className="p-1 rounded border border-surface-700 bg-surface-800/70 hover:bg-surface-700 text-surface-400 hover:text-surface-200 transition-colors"
                                                title="表示優先順位の基準"
                                                aria-label="表示優先順位の基準を表示"
                                            >
                                                <Info size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="mt-1 text-[10px] leading-snug text-surface-500 truncate">
                                        タグの編集・作成を行います。詳細な表示ルールは右上の情報ボタンから確認できます。
                                    </p>
                                    {showPriorityHelp && (
                                        <div className="absolute top-[calc(100%-4px)] right-4 z-10 w-[360px] rounded-md border border-surface-700 bg-surface-900 shadow-2xl p-3">
                                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                                <div className="text-[11px] font-semibold text-surface-200">表示優先順位の基準</div>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPriorityHelp(false)}
                                                    className="text-[10px] text-surface-500 hover:text-surface-300"
                                                >
                                                    閉じる
                                                </button>
                                            </div>
                                            <div className="text-[10px] leading-snug text-surface-400 space-y-1">
                                                <div>1. タグの基本順: 「表示優先順」（内部名: `sortOrder`、小さい値ほど優先）</div>
                                                <div>2. ファイルカードの省略タグ表示: 上記順をベースにカテゴリが偏らないよう分散表示</div>
                                                <div>3. カテゴリ順: 左ペインのドラッグ順（カテゴリ管理上の並び順）</div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* タグ作成フォーム */}
                                <div className="px-4 py-3 border-b border-surface-700 bg-surface-800/40">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="text-xs font-semibold text-surface-300">
                                                {editingTag ? 'タグ編集' : '新規タグ作成'}
                                            </div>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                                editingTag
                                                    ? 'border-amber-500/40 text-amber-300 bg-amber-500/10'
                                                    : 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'
                                            }`}>
                                                {editingTag ? '編集モード' : '追加モード'}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder={editingTag ? 'タグ名を編集...' : '新しいタグ名...'}
                                                value={newTagName}
                                                onChange={(e) => setNewTagName(e.target.value)}
                                                className="flex-1 px-3 py-1.5 bg-surface-900 border border-surface-600 rounded text-sm focus:outline-none focus:border-primary-500"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        editingTag ? handleUpdateTag() : handleCreateTag();
                                                    }
                                                }}
                                            />
                                            <button
                                                onClick={editingTag ? handleUpdateTag : handleCreateTag}
                                                className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-1"
                                            >
                                                {editingTag ? <Check size={14} /> : <Plus size={14} />}
                                                {editingTag ? '更新' : '追加'}
                                            </button>
                                            {editingTag && (
                                                <button
                                                    onClick={resetTagForm}
                                                    className="px-2 py-1.5 text-sm text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded"
                                                >
                                                    取消
                                                </button>
                                            )}
                                        </div>
                                        {/* 色選択（コンパクト表示） */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-surface-500">色:</span>
                                            <div className="flex flex-wrap gap-0.5">
                                                {COLOR_OPTIONS.map(color => (
                                                    <button
                                                        key={color}
                                                        onClick={() => setNewTagColor(color)}
                                                        className={`w-4 h-4 rounded transition-all ${colorBgClass(color)} ${newTagColor === color ? 'ring-2 ring-white ring-offset-1 ring-offset-surface-800' : ''
                                                            }`}
                                                        title={color}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        {/* アイコン/説明 は折りたたみで表示可能にする */}
                                        <details className="text-xs rounded border border-surface-700/80 bg-surface-900/40 px-2 py-1.5">
                                            <summary className="text-surface-500 cursor-pointer hover:text-surface-300 select-none">
                                                詳細設定（アイコン・説明）
                                            </summary>
                                            <div className="mt-2 space-y-1.5">
                                                <div className="space-y-1">
                                                    <input
                                                        type="text"
                                                        list="tag-icon-name-suggestions"
                                                        placeholder="アイコン名 (例: Star, Heart)"
                                                        value={newTagIcon}
                                                        onChange={(e) => setNewTagIcon(e.target.value)}
                                                        className="w-full px-2 py-1 bg-surface-900 border border-surface-600 rounded text-xs focus:outline-none focus:border-primary-500"
                                                    />
                                                    <datalist id="tag-icon-name-suggestions">
                                                        {COMMON_TAG_ICON_NAMES.map((iconName) => (
                                                            <option key={iconName} value={iconName} />
                                                        ))}
                                                    </datalist>
                                                    <div className="flex flex-wrap items-center gap-1">
                                                        <span className="text-[10px] text-surface-500">候補:</span>
                                                        {COMMON_TAG_ICON_NAMES.slice(0, 10).map((iconName) => (
                                                            <button
                                                                key={iconName}
                                                                type="button"
                                                                onClick={() => setNewTagIcon(iconName)}
                                                                className={`px-1.5 py-0.5 rounded border text-[10px] transition-colors ${
                                                                    newTagIcon === iconName
                                                                        ? 'border-primary-500/60 bg-primary-500/15 text-primary-300'
                                                                        : 'border-surface-700 bg-surface-800/70 text-surface-400 hover:text-surface-200 hover:bg-surface-700'
                                                                }`}
                                                            >
                                                                {iconName}
                                                            </button>
                                                        ))}
                                                        {newTagIcon && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setNewTagIcon('')}
                                                                className="px-1.5 py-0.5 rounded border border-surface-700 bg-surface-800/70 text-[10px] text-surface-400 hover:text-surface-200 hover:bg-surface-700"
                                                            >
                                                                解除
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] leading-snug text-surface-500">
                                                        `lucide-react` のアイコン名を指定します。未対応名は表示されないだけで保存はできます。
                                                    </p>
                                                </div>
                                                <textarea
                                                    placeholder="説明文 (オプション)"
                                                    value={newTagDescription}
                                                    onChange={(e) => setNewTagDescription(e.target.value)}
                                                    rows={2}
                                                    className="w-full px-2 py-1 bg-surface-900 border border-surface-600 rounded text-xs focus:outline-none focus:border-primary-500 resize-none"
                                                />
                                            </div>
                                        </details>
                                    </div>
                                </div>

                                {/* タグリスト */}
                                <div className="flex-1 overflow-auto p-3">
                                    <div className="flex items-center justify-between mb-2 px-1">
                                        <div className="text-[11px] font-semibold text-surface-400 uppercase tracking-wide">
                                            Tag List
                                        </div>
                                        <div className="text-[10px] text-surface-500" title="ドラッグで表示優先順を変更">
                                            表示順: 表示優先順（ドラッグで変更）
                                        </div>
                                    </div>
                                    {filteredTags.length === 0 ? (
                                        <div className="rounded-md border border-dashed border-surface-700 bg-surface-900/40">
                                            <p className="text-center text-surface-500 py-10 text-sm">
                                                {selectedCategoryId === UNCATEGORIZED_ID
                                                    ? '未分類のタグはありません'
                                                    : 'このカテゴリにタグはありません'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            {filteredTags.map(tag => {
                                                const isDragging = dragTagId === tag.id;
                                                const isDragOver = dragOverTagId === tag.id && dragTagId !== tag.id;

                                                return (
                                                    <div
                                                        key={tag.id}
                                                        draggable
                                                        onDragStart={() => handleTagDragStart(tag.id)}
                                                        onDragOver={(e) => handleTagDragOver(e, tag.id)}
                                                        onDrop={(e) => handleTagDrop(e, tag.id)}
                                                        onDragEnd={() => { setDragTagId(null); setDragOverTagId(null); }}
                                                        className={`flex items-center justify-between px-2.5 py-2 rounded-md border group transition-colors ${
                                                            isDragging
                                                                ? 'opacity-40 border-surface-700 bg-surface-800/50'
                                                                : isDragOver
                                                                    ? 'border-primary-400 bg-primary-500/10'
                                                                    : 'border-transparent hover:border-surface-700 hover:bg-surface-800'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <GripVertical
                                                                size={13}
                                                                className="text-surface-600 group-hover:text-surface-400 flex-shrink-0 cursor-grab"
                                                                title="ドラッグで表示優先順を変更"
                                                            />
                                                            <TagBadge name={tag.name} color={tag.color} />
                                                            {tag.description && (
                                                                <span className="text-[10px] text-surface-500 truncate">
                                                                    {tag.description}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                                                            <button
                                                                onClick={() => startEditTag(tag)}
                                                                className="p-1 hover:bg-surface-700 rounded"
                                                                title="編集"
                                                            >
                                                                <Edit2 size={13} className="text-surface-400" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteTag(tag)}
                                                                className="p-1 hover:bg-red-500/20 rounded"
                                                                title="削除"
                                                            >
                                                                <Trash2 size={13} className="text-red-400" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'autoRules' ? (
                        <div className="overflow-auto p-4">
                            <AutoTagRulesTab />
                        </div>
                    ) : null}
                </div>
            </div>
        </div>,
        document.body
    );
});

TagManagerModal.displayName = 'TagManagerModal';
