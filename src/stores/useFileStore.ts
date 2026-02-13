import { create } from 'zustand';
import type { MediaFile } from '../types/file';
import { useSettingsStore } from './useSettingsStore';
import { useTagStore } from './useTagStore';

interface FileState {
    files: MediaFile[];
    selectedIds: Set<string>;
    focusedId: string | null;
    anchorId: string | null;  // 範囲選択の起点
    currentFolderId: string | null;
    // ファイルごとのタグIDをキャッシュ
    fileTagsCache: Map<string, string[]>;
    // フォルダメタデータ（Phase 12-4）
    folderFileCounts: Record<string, number>;
    folderThumbnails: Record<string, string>;
    // アクション
    setFiles: (files: MediaFile[]) => void;
    setCurrentFolderId: (id: string | null) => void;
    selectFile: (id: string) => void;                  // 単一選択（置き換え + anchor更新）
    toggleSelection: (id: string) => void;             // 選択トグル（Ctrl+クリック + anchor更新）
    selectRange: (fileIds: string[]) => void;          // 範囲選択（置き換え、anchor維持）
    setFocusedId: (id: string | null) => void;
    selectAll: () => void;
    clearSelection: () => void;
    getSortedFiles: () => MediaFile[];
    getFilteredFiles: () => MediaFile[];
    removeFile: (fileId: string) => void;
    refreshFile: (fileId: string) => Promise<void>;
    // タグキャッシュ管理
    loadFileTagsCache: () => Promise<void>;
    updateFileTagCache: (fileId: string, tagIds: string[]) => void;
    // フォルダメタデータ管理（Phase 12-4）
    setFolderMetadata: (metadata: { fileCounts: Record<string, number>; thumbnails: Record<string, string> }) => void;
    // Phase 17: アクセストラッキング
    incrementAccessCount: (fileId: string, lastAccessedAt: number) => void;
    // Phase 18-A: 外部アプリ起動トラッキング
    updateFileExternalOpenCount: (fileId: string, count: number, timestamp: number) => void;
}

export const useFileStore = create<FileState>((set, get) => ({
    files: [],
    selectedIds: new Set(),
    focusedId: null,
    anchorId: null,
    currentFolderId: null,
    fileTagsCache: new Map(),
    folderFileCounts: {},
    folderThumbnails: {},

    setFiles: (files) => {
        set({ files, focusedId: null });
        // ファイルが更新されたらタグキャッシュをリロード
        get().loadFileTagsCache();
    },
    setCurrentFolderId: (id) => set({ currentFolderId: id }),

    // Phase 16: 単一選択（置き換え + anchor更新）
    selectFile: (id) =>
        set({
            selectedIds: new Set([id]),
            focusedId: id,
            anchorId: id,
        }),

    // Phase 16: 選択トグル（Ctrl+クリック + anchor更新）
    toggleSelection: (id) =>
        set((state) => {
            const newSelected = new Set(state.selectedIds);
            if (newSelected.has(id)) {
                newSelected.delete(id);
            } else {
                newSelected.add(id);
            }
            return {
                selectedIds: newSelected,
                focusedId: id,
                anchorId: id,
            };
        }),

    // Phase 16: 範囲選択（置き換え、anchor維持）
    selectRange: (fileIds) =>
        set((state) => ({
            selectedIds: new Set(fileIds),
            focusedId: fileIds[fileIds.length - 1] || state.focusedId,
            // anchorId は維持
        })),

    setFocusedId: (id) => set({ focusedId: id }),

    selectAll: () =>
        set((state) => ({
            selectedIds: new Set(state.files.map((f) => f.id)),
        })),

    clearSelection: () => set({ selectedIds: new Set(), focusedId: null, anchorId: null }),

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
                case 'accessCount': // Phase 17: アクセス回数ソート
                    comparison = a.accessCount - b.accessCount;
                    break;
                case 'lastAccessed': // Phase 17: 直近アクセスソート
                    // null は最後に
                    if (a.lastAccessedAt === null && b.lastAccessedAt === null) comparison = 0;
                    else if (a.lastAccessedAt === null) comparison = 1;
                    else if (b.lastAccessedAt === null) comparison = -1;
                    else comparison = a.lastAccessedAt - b.lastAccessedAt;
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

    refreshFile: async (fileId: string) => {
        try {
            const updatedFile = await window.electronAPI.getFileById(fileId);
            if (updatedFile) {
                set((state) => ({
                    files: state.files.map(f => f.id === fileId ? updatedFile : f)
                }));
            }
        } catch (e) {
            console.error('Failed to refresh file:', e);
        }
    },

    loadFileTagsCache: async () => {
        try {
            // パフォーマンス最適化: 1回のIPC呼び出しで全タグを取得
            const allTagsRecord = await window.electronAPI.getAllFileTagIds();
            const newCache = new Map<string, string[]>(Object.entries(allTagsRecord));
            set({ fileTagsCache: newCache });
        } catch (e) {
            console.error('Failed to load file tags cache:', e);
            set({ fileTagsCache: new Map() });
        }
    },

    updateFileTagCache: (fileId: string, tagIds: string[]) =>
        set((state) => {
            const newCache = new Map(state.fileTagsCache);
            newCache.set(fileId, tagIds);
            return { fileTagsCache: newCache };
        }),

    setFolderMetadata: (metadata) =>
        set({
            folderFileCounts: metadata.fileCounts,
            folderThumbnails: metadata.thumbnails,
        }),

    // Phase 17: アクセス回数をインクリメント（即時UI反映）
    incrementAccessCount: (fileId: string, lastAccessedAt: number) =>
        set((state) => ({
            files: state.files.map(file =>
                file.id === fileId
                    ? {
                        ...file,
                        accessCount: (file.accessCount || 0) + 1,
                        lastAccessedAt
                    }
                    : file
            )
        })),

    // Phase 18-A: 外部アプリ起動カウント更新（即時UI反映）
    updateFileExternalOpenCount: (fileId: string, count: number, timestamp: number) =>
        set((state) => ({
            files: state.files.map(file =>
                file.id === fileId
                    ? {
                        ...file,
                        externalOpenCount: count,
                        lastExternalOpenedAt: timestamp
                    }
                    : file
            )
        })),
}));
