/**
 * TagManagerModal - タグとカテゴリの管理モーダル
 */

import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Check, Tag as TagIcon, FolderOpen } from 'lucide-react';
import { useTagStore, Tag, TagCategory } from '../../stores/useTagStore';
import { TagBadge } from './TagBadge';

// Color options for tags
const COLOR_OPTIONS = [
    'gray', 'red', 'orange', 'amber', 'yellow', 'lime', 'green',
    'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet',
    'purple', 'fuchsia', 'pink', 'rose'
];

interface TagManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TagManagerModal = React.memo(({ isOpen, onClose }: TagManagerModalProps) => {
    const [activeTab, setActiveTab] = useState<'tags' | 'categories'>('tags');
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [editingCategory, setEditingCategory] = useState<TagCategory | null>(null);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('gray');
    const [newTagCategoryId, setNewTagCategoryId] = useState<string | null>(null);
    const [newTagIcon, setNewTagIcon] = useState('');
    const [newTagDescription, setNewTagDescription] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState('gray');

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
        }
    }, [isOpen, loadTags, loadCategories]);

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

    if (!isOpen) return null;

    // === Tag CRUD ===
    const handleCreateTag = async () => {
        if (!newTagName.trim()) return;
        await createTag(newTagName.trim(), newTagColor, newTagCategoryId || undefined, newTagIcon, newTagDescription);
        setNewTagName('');
        setNewTagColor('gray');
        setNewTagCategoryId(null);
        setNewTagIcon('');
        setNewTagDescription('');
    };

    const handleUpdateTag = async () => {
        if (!editingTag || !newTagName.trim()) return;
        await updateTag(editingTag.id, {
            name: newTagName.trim(),
            color: newTagColor,
            categoryId: newTagCategoryId,
            icon: newTagIcon,
            description: newTagDescription
        });
        setEditingTag(null);
        setNewTagName('');
        setNewTagColor('gray');
        setNewTagCategoryId(null);
        setNewTagIcon('');
        setNewTagDescription('');
    };

    const handleDeleteTag = async (tag: Tag) => {
        if (confirm(`タグ "${tag.name}" を削除しますか？`)) {
            await deleteTag(tag.id);
        }
    };

    const startEditTag = (tag: Tag) => {
        setEditingTag(tag);
        setNewTagName(tag.name);
        setNewTagColor(tag.color);
        setNewTagCategoryId(tag.categoryId);
        setNewTagIcon(tag.icon || '');
        setNewTagDescription(tag.description || '');
    };

    // === Category CRUD ===
    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        await createCategory(newCategoryName.trim(), newCategoryColor);
        setNewCategoryName('');
        setNewCategoryColor('gray');
    };

    const handleUpdateCategory = async () => {
        if (!editingCategory || !newCategoryName.trim()) return;
        await updateCategory(editingCategory.id, {
            name: newCategoryName.trim(),
            color: newCategoryColor
        });
        setEditingCategory(null);
        setNewCategoryName('');
        setNewCategoryColor('gray');
    };

    const handleDeleteCategory = async (cat: TagCategory) => {
        if (confirm(`カテゴリ "${cat.name}" を削除しますか？\nタグはカテゴリなしになります。`)) {
            await deleteCategory(cat.id);
        }
    };

    const startEditCategory = (cat: TagCategory) => {
        setEditingCategory(cat);
        setNewCategoryName(cat.name);
        setNewCategoryColor(cat.color);
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70" onClick={onClose} style={{ zIndex: 'var(--z-modal)' }}>
            <div
                className="bg-surface-900 rounded-lg border border-surface-700 shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-surface-700">
                    <h2 className="text-lg font-bold text-white">タグ管理</h2>
                    <button onClick={onClose} className="p-1 hover:bg-surface-700 rounded">
                        <X size={20} className="text-surface-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-surface-700">
                    <button
                        onClick={() => setActiveTab('tags')}
                        className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTab === 'tags'
                            ? 'text-primary-400 border-b-2 border-primary-400'
                            : 'text-surface-400 hover:text-surface-200'
                            }`}
                    >
                        <TagIcon size={16} className="inline mr-2" />
                        タグ ({tags.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('categories')}
                        className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTab === 'categories'
                            ? 'text-primary-400 border-b-2 border-primary-400'
                            : 'text-surface-400 hover:text-surface-200'
                            }`}
                    >
                        <FolderOpen size={16} className="inline mr-2" />
                        カテゴリ ({categories.length})
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4">
                    {activeTab === 'tags' ? (
                        <div className="space-y-4">
                            {/* New Tag Form */}
                            <div className="p-3 bg-surface-800 rounded-lg space-y-3">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="新しいタグ名..."
                                        value={newTagName}
                                        onChange={(e) => setNewTagName(e.target.value)}
                                        className="flex-1 px-3 py-2 bg-surface-900 border border-surface-600 rounded text-sm focus:outline-none focus:border-primary-500"
                                    />
                                    <select
                                        value={newTagCategoryId || ''}
                                        onChange={(e) => setNewTagCategoryId(e.target.value || null)}
                                        className="px-3 py-2 bg-surface-900 border border-surface-600 rounded text-sm focus:outline-none focus:border-primary-500"
                                    >
                                        <option value="">カテゴリなし</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-surface-500">色:</span>
                                    <div className="flex flex-wrap gap-1">
                                        {COLOR_OPTIONS.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setNewTagColor(color)}
                                                className={`w-5 h-5 rounded transition-all ${newTagColor === color ? 'ring-2 ring-white ring-offset-1 ring-offset-surface-800' : ''
                                                    }`}
                                                style={{ backgroundColor: `var(--color-${color}-500, ${color})` }}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    placeholder="アイコン名 (例: Star, Heart)"
                                    value={newTagIcon}
                                    onChange={(e) => setNewTagIcon(e.target.value)}
                                    className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded text-sm focus:outline-none focus:border-primary-500"
                                />
                                <textarea
                                    placeholder="説明文 (オプション)"
                                    value={newTagDescription}
                                    onChange={(e) => setNewTagDescription(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded text-sm focus:outline-none focus:border-primary-500 resize-none"
                                />
                                <button
                                    onClick={editingTag ? handleUpdateTag : handleCreateTag}
                                    className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    {editingTag ? <Check size={16} /> : <Plus size={16} />}
                                    {editingTag ? '更新' : '追加'}
                                </button>
                                {editingTag && (
                                    <button
                                        onClick={() => {
                                            setEditingTag(null);
                                            setNewTagName('');
                                            setNewTagColor('gray');
                                            setNewTagCategoryId(null);
                                            setNewTagIcon('');
                                            setNewTagDescription('');
                                        }}
                                        className="w-full py-1 text-sm text-surface-400 hover:text-surface-200"
                                    >
                                        キャンセル
                                    </button>
                                )}
                            </div>

                            {/* Tag List */}
                            <div className="space-y-1">
                                {tags.length === 0 ? (
                                    <p className="text-center text-surface-500 py-8">タグがありません</p>
                                ) : (
                                    tags.map(tag => (
                                        <div key={tag.id} className="flex items-center justify-between p-2 hover:bg-surface-800 rounded group">
                                            <div className="flex items-center gap-2">
                                                <TagBadge name={tag.name} color={tag.color} />
                                                {tag.categoryId && (
                                                    <span className="text-xs text-surface-500">
                                                        ({categories.find(c => c.id === tag.categoryId)?.name})
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => startEditTag(tag)}
                                                    className="p-1 hover:bg-surface-700 rounded"
                                                >
                                                    <Edit2 size={14} className="text-surface-400" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTag(tag)}
                                                    className="p-1 hover:bg-red-500/20 rounded"
                                                >
                                                    <Trash2 size={14} className="text-red-400" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* New Category Form */}
                            <div className="p-3 bg-surface-800 rounded-lg space-y-3">
                                <input
                                    type="text"
                                    placeholder="新しいカテゴリ名..."
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded text-sm focus:outline-none focus:border-primary-500"
                                />
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-surface-500">色:</span>
                                    <div className="flex flex-wrap gap-1">
                                        {COLOR_OPTIONS.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setNewCategoryColor(color)}
                                                className={`w-5 h-5 rounded transition-all ${newCategoryColor === color ? 'ring-2 ring-white ring-offset-1 ring-offset-surface-800' : ''
                                                    }`}
                                                style={{ backgroundColor: `var(--color-${color}-500, ${color})` }}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <button
                                    onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                                    className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    {editingCategory ? <Check size={16} /> : <Plus size={16} />}
                                    {editingCategory ? '更新' : '追加'}
                                </button>
                                {editingCategory && (
                                    <button
                                        onClick={() => {
                                            setEditingCategory(null);
                                            setNewCategoryName('');
                                            setNewCategoryColor('gray');
                                        }}
                                        className="w-full py-1 text-sm text-surface-400 hover:text-surface-200"
                                    >
                                        キャンセル
                                    </button>
                                )}
                            </div>

                            {/* Category List */}
                            <div className="space-y-1">
                                {categories.length === 0 ? (
                                    <p className="text-center text-surface-500 py-8">カテゴリがありません</p>
                                ) : (
                                    categories.map(cat => (
                                        <div key={cat.id} className="flex items-center justify-between p-2 hover:bg-surface-800 rounded group">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded"
                                                    style={{ backgroundColor: `var(--color-${cat.color}-500, ${cat.color})` }}
                                                />
                                                <span className="text-sm text-surface-200">{cat.name}</span>
                                                <span className="text-xs text-surface-500">
                                                    ({tags.filter(t => t.categoryId === cat.id).length} タグ)
                                                </span>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => startEditCategory(cat)}
                                                    className="p-1 hover:bg-surface-700 rounded"
                                                >
                                                    <Edit2 size={14} className="text-surface-400" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCategory(cat)}
                                                    className="p-1 hover:bg-red-500/20 rounded"
                                                >
                                                    <Trash2 size={14} className="text-red-400" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

TagManagerModal.displayName = 'TagManagerModal';
