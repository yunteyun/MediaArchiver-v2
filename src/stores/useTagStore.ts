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
    icon: string;
    description: string;
}

export interface TagCategory {
    id: string;
    name: string;
    color: string;
    sortOrder: number;
    createdAt: number;
}

// Auto Tag Rule types (Phase 12-8 フェーズ2)
export type MatchTarget = 'filename' | 'foldername' | 'both';
export type MatchMode = 'partial' | 'exact';

export interface AutoTagRule {
    id: string;
    tagId: string;
    keywords: string[];
    target: MatchTarget;
    matchMode: MatchMode;
    enabled: boolean;
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
    searchQuery: string;  // For tag search
    autoTagRules: AutoTagRule[];  // Phase 12-8 フェーズ2

    // Actions
    setTags: (tags: Tag[]) => void;
    setCategories: (categories: TagCategory[]) => void;
    toggleTagFilter: (tagId: string) => void;
    clearTagFilter: () => void;
    setFilterMode: (mode: 'AND' | 'OR') => void;
    setLoading: (loading: boolean) => void;
    toggleCategoryCollapse: (categoryId: string) => void;
    setCollapsedCategories: (categoryIds: string[]) => void;
    setSearchQuery: (query: string) => void;

    // Async actions
    loadTags: () => Promise<void>;
    loadCategories: () => Promise<void>;
    createTag: (name: string, color?: string, categoryId?: string, icon?: string, description?: string) => Promise<Tag>;
    updateTag: (id: string, updates: { name?: string; color?: string; categoryId?: string | null; icon?: string; description?: string }) => Promise<void>;
    deleteTag: (id: string) => Promise<void>;
    createCategory: (name: string, color?: string) => Promise<TagCategory>;
    updateCategory: (id: string, updates: { name?: string; color?: string; sortOrder?: number }) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;

    // Helpers
    getTagById: (id: string) => Tag | undefined;
    getTagsByCategory: (categoryId: string | null) => Tag[];
    getCategoryById: (id: string) => TagCategory | undefined;

    // Auto Tag Rules (Phase 12-8 フェーズ2)
    loadAutoTagRules: () => Promise<void>;
    createAutoTagRule: (tagId: string, keywords: string[], target: MatchTarget, matchMode: MatchMode) => Promise<AutoTagRule>;
    updateAutoTagRule: (id: string, updates: Partial<AutoTagRule>) => Promise<void>;
    deleteAutoTagRule: (id: string) => Promise<void>;
}

export const useTagStore = create<TagState>((set, get) => ({
    // Initial state
    tags: [],
    categories: [],
    selectedTagIds: [],
    filterMode: 'OR',
    isLoading: false,
    collapsedCategoryIds: [],
    searchQuery: '',
    autoTagRules: [],

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
    toggleCategoryCollapse: (categoryId) => set((state) => {
        const isCurrentlyCollapsed = state.collapsedCategoryIds.includes(categoryId);

        if (isCurrentlyCollapsed) {
            // 展開する場合：他のカテゴリを閉じて、このカテゴリだけ開く
            const allCategoryIds = state.categories.map(c => c.id);
            return {
                collapsedCategoryIds: allCategoryIds.filter(id => id !== categoryId)
            };
        } else {
            // 閉じる場合：このカテゴリを閉じる
            return {
                collapsedCategoryIds: [...state.collapsedCategoryIds, categoryId]
            };
        }
    }),
    setCollapsedCategories: (categoryIds) => set({ collapsedCategoryIds: categoryIds }),
    setSearchQuery: (query) => set({ searchQuery: query }),

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

    createTag: async (name, color, categoryId, icon, description) => {
        const newTag = await window.electronAPI.createTag(name, color, categoryId, icon, description);
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

    // Auto Tag Rules (Phase 12-8 フェーズ2)
    loadAutoTagRules: async () => {
        const rules = await window.electronAPI.getAllAutoTagRules();
        set({ autoTagRules: rules });
    },

    createAutoTagRule: async (tagId, keywords, target, matchMode) => {
        const newRule = await window.electronAPI.createAutoTagRule(tagId, keywords, target, matchMode);
        set((state) => ({ autoTagRules: [...state.autoTagRules, newRule] }));
        return newRule;
    },

    updateAutoTagRule: async (id, updates) => {
        await window.electronAPI.updateAutoTagRule(id, updates);
        set((state) => ({
            autoTagRules: state.autoTagRules.map(rule =>
                rule.id === id ? { ...rule, ...updates } : rule
            )
        }));
    },

    deleteAutoTagRule: async (id) => {
        await window.electronAPI.deleteAutoTagRule(id);
        set((state) => ({
            autoTagRules: state.autoTagRules.filter(rule => rule.id !== id)
        }));
    },
}));
