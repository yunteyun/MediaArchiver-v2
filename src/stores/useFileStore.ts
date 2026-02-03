import { create } from 'zustand';
import type { MediaFile } from '../types/file';
import { useSettingsStore } from './useSettingsStore';
import { useTagStore } from './useTagStore';

interface FileState {
    files: MediaFile[];
    selectedIds: Set<string>;
    focusedId: string | null;
    currentFolderId: string | null;
    // ファイルごとのタグIDをキャッシュ
    fileTagsCache: Map<string, string[]>;
    // アクション
    setFiles: (files: MediaFile[]) => void;
    setCurrentFolderId: (id: string | null) => void;
    selectFile: (id: string, multi?: boolean) => void;
    setFocusedId: (id: string | null) => void;
    selectAll: () => void;
    clearSelection: () => void;
    getSortedFiles: () => MediaFile[];
    getFilteredFiles: () => MediaFile[];
    removeFile: (fileId: string) => void;
    // タグキャッシュ管理
    loadFileTagsCache: () => Promise<void>;
    updateFileTagCache: (fileId: string, tagIds: string[]) => void;
}

export const useFileStore = create<FileState>((set, get) => ({
    files: [],
    selectedIds: new Set(),
    focusedId: null,
    currentFolderId: null,
    fileTagsCache: new Map(),

    setFiles: (files) => {
        set({ files, focusedId: null });
        // ファイルが更新されたらタグキャッシュをリロード
        get().loadFileTagsCache();
    },
    setCurrentFolderId: (id) => set({ currentFolderId: id }),

    selectFile: (id, multi = false) =>
        set((state) => {
            const newSelected = multi ? new Set<string>(state.selectedIds) : new Set<string>();
            if (newSelected.has(id)) {
                newSelected.delete(id);
            } else {
                newSelected.add(id);
            }
            return { selectedIds: newSelected, focusedId: id };
        }),

    setFocusedId: (id) => set({ focusedId: id }),

    selectAll: () =>
        set((state) => ({
            selectedIds: new Set(state.files.map((f) => f.id)),
        })),

    clearSelection: () => set({ selectedIds: new Set(), focusedId: null }),

    getSortedFiles: () => {
        const { sortBy, sortOrder } = useSettingsStore.getState();
        const files = get().files;

        return [...files].sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'date':
                    comparison = a.createdAt - b.createdAt;
                    break;
                case 'size':
                    comparison = a.size - b.size;
                    break;
                case 'type':
                    comparison = a.type.localeCompare(b.type);
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });
    },

    getFilteredFiles: () => {
        const { selectedTagIds, filterMode } = useTagStore.getState();
        const sortedFiles = get().getSortedFiles();
        const fileTagsCache = get().fileTagsCache;

        // フィルター未選択なら全件返す
        if (selectedTagIds.length === 0) {
            return sortedFiles;
        }

        return sortedFiles.filter((file) => {
            const fileTags = fileTagsCache.get(file.id) || [];
            if (filterMode === 'OR') {
                // いずれかのタグを持っていればOK
                return selectedTagIds.some((tagId) => fileTags.includes(tagId));
            } else {
                // 全てのタグを持っている必要がある
                return selectedTagIds.every((tagId) => fileTags.includes(tagId));
            }
        });
    },

    removeFile: (fileId: string) =>
        set((state) => {
            const newCache = new Map(state.fileTagsCache);
            newCache.delete(fileId);
            return {
                files: state.files.filter(f => f.id !== fileId),
                selectedIds: new Set(
                    Array.from(state.selectedIds).filter(id => id !== fileId)
                ),
                fileTagsCache: newCache,
            };
        }),

    loadFileTagsCache: async () => {
        const files = get().files;
        const newCache = new Map<string, string[]>();

        // 並列でタグを取得
        const results = await Promise.all(
            files.map(async (file) => {
                try {
                    const tagIds = await window.electronAPI.getFileTagIds(file.id);
                    return { fileId: file.id, tagIds };
                } catch {
                    return { fileId: file.id, tagIds: [] };
                }
            })
        );

        results.forEach(({ fileId, tagIds }) => {
            newCache.set(fileId, tagIds);
        });

        set({ fileTagsCache: newCache });
    },

    updateFileTagCache: (fileId: string, tagIds: string[]) =>
        set((state) => {
            const newCache = new Map(state.fileTagsCache);
            newCache.set(fileId, tagIds);
            return { fileTagsCache: newCache };
        }),
}));

