/**
 * Tag Store - タグ管理の状態管理
 */

import { create } from 'zustand';

// Types (matches electron side)
export interface Tag {
    id: string;
    name: string;
    color: string;
    categoryId: string | null;
    categoryColor?: string;  // カテゴリの色（動的ボーダー用）
    sortOrder: number;
    createdAt: number;
}

export interface TagCategory {
    id: string;
    name: string;
    color: string;
    sortOrder: number;
    createdAt: number;
}

interface TagState {
    // State
    tags: Tag[];
    categories: TagCategory[];
    selectedTagIds: string[];      // For filtering
    filterMode: 'AND' | 'OR';
    isLoading: boolean;
    collapsedCategoryIds: string[];  // For category collapse/expand

    // Actions
    setTags: (tags: Tag[]) => void;
    setCategories: (categories: TagCategory[]) => void;
    toggleTagFilter: (tagId: string) => void;
    clearTagFilter: () => void;
    setFilterMode: (mode: 'AND' | 'OR') => void;
    setLoading: (loading: boolean) => void;
    toggleCategoryCollapse: (categoryId: string) => void;

    // Async actions
    loadTags: () => Promise<void>;
    loadCategories: () => Promise<void>;
    createTag: (name: string, color?: string, categoryId?: string) => Promise<Tag>;
    updateTag: (id: string, updates: { name?: string; color?: string; categoryId?: string | null }) => Promise<void>;
    deleteTag: (id: string) => Promise<void>;
    createCategory: (name: string, color?: string) => Promise<TagCategory>;
    updateCategory: (id: string, updates: { name?: string; color?: string }) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;

    // Helpers
    getTagById: (id: string) => Tag | undefined;
    getTagsByCategory: (categoryId: string | null) => Tag[];
    getCategoryById: (id: string) => TagCategory | undefined;
}

export const useTagStore = create<TagState>((set, get) => ({
    // Initial state
    tags: [],
    categories: [],
    selectedTagIds: [],
    filterMode: 'OR',
    isLoading: false,
    collapsedCategoryIds: [],

    // Basic setters
    setTags: (tags) => set({ tags }),
    setCategories: (categories) => set({ categories }),
    toggleTagFilter: (tagId) => set((state) => ({
        selectedTagIds: state.selectedTagIds.includes(tagId)
            ? state.selectedTagIds.filter(id => id !== tagId)
            : [...state.selectedTagIds, tagId]
    })),
    clearTagFilter: () => set({ selectedTagIds: [] }),
    setFilterMode: (mode) => set({ filterMode: mode }),
    setLoading: (loading) => set({ isLoading: loading }),
    toggleCategoryCollapse: (categoryId) => set((state) => ({
        collapsedCategoryIds: state.collapsedCategoryIds.includes(categoryId)
            ? state.collapsedCategoryIds.filter(id => id !== categoryId)
            : [...state.collapsedCategoryIds, categoryId]
    })),

    // Async actions
    loadTags: async () => {
        try {
            const tags = await window.electronAPI.getAllTags();
            set({ tags });
        } catch (error) {
            console.error('Failed to load tags:', error);
        }
    },

    loadCategories: async () => {
        try {
            const categories = await window.electronAPI.getTagCategories();
            set({ categories });
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    },

    createTag: async (name, color, categoryId) => {
        const newTag = await window.electronAPI.createTag(name, color, categoryId);
        set((state) => ({ tags: [...state.tags, newTag] }));
        return newTag;
    },

    updateTag: async (id, updates) => {
        await window.electronAPI.updateTag(id, updates);
        set((state) => ({
            tags: state.tags.map(tag =>
                tag.id === id ? { ...tag, ...updates } : tag
            )
        }));
    },

    deleteTag: async (id) => {
        await window.electronAPI.deleteTag(id);
        set((state) => ({
            tags: state.tags.filter(tag => tag.id !== id),
            selectedTagIds: state.selectedTagIds.filter(tid => tid !== id)
        }));
    },

    createCategory: async (name, color) => {
        const newCategory = await window.electronAPI.createTagCategory(name, color);
        set((state) => ({ categories: [...state.categories, newCategory] }));
        return newCategory;
    },

    updateCategory: async (id, updates) => {
        await window.electronAPI.updateTagCategory(id, updates);
        set((state) => ({
            categories: state.categories.map(cat =>
                cat.id === id ? { ...cat, ...updates } : cat
            )
        }));
    },

    deleteCategory: async (id) => {
        await window.electronAPI.deleteTagCategory(id);
        set((state) => ({
            categories: state.categories.filter(cat => cat.id !== id)
        }));
    },

    // Helpers
    getTagById: (id) => get().tags.find(tag => tag.id === id),
    getTagsByCategory: (categoryId) => get().tags.filter(tag => tag.categoryId === categoryId),
    getCategoryById: (id) => get().categories.find(cat => cat.id === id),
}));
