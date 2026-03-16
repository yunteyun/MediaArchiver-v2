import { create } from 'zustand';
import type { MediaFile } from '../types/file';

interface FileState {
    files: MediaFile[];
    fileMap: Map<string, MediaFile>;  // O(1)ルックアップ用（Phase 23: 右パネル）
    selectedIds: Set<string>;
    focusedId: string | null;  // 右パネル専用。単一。selectedIds（複数選択）とは独立。
    anchorId: string | null;  // 範囲選択の起点
    currentFolderId: string | null;
    // ファイルごとのタグIDをキャッシュ
    fileTagsCache: Map<string, string[]>;
    // フォルダメタデータ（Phase 12-4）
    folderFileCounts: Record<string, number>;
    folderThumbnails: Record<string, string>;
    // アクション
    setFiles: (files: MediaFile[], options?: { reloadTagCache?: boolean }) => void;
    setCurrentFolderId: (id: string | null) => void;
    selectFile: (id: string) => void;                  // 単一選択（置き換え + anchor更新）
    toggleSelection: (id: string) => void;             // 選択トグル（Ctrl+クリック + anchor更新）
    selectRange: (fileIds: string[]) => void;          // 範囲選択（置き換え、anchor維持）
    setFocusedId: (id: string | null) => void;
    selectAll: () => void;
    clearSelection: () => void;
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
    updatePlaybackPosition: (fileId: string, seconds: number | null, updatedAt: number | null) => void;
}

const FILE_TAG_CACHE_RELOAD_DEBOUNCE_MS = 250;
let pendingTagCacheReloadTimer: ReturnType<typeof setTimeout> | null = null;

export const useFileStore = create<FileState>((set, get) => ({
    files: [],
    fileMap: new Map(),
    selectedIds: new Set(),
    focusedId: null,
    anchorId: null,
    currentFolderId: null,
    fileTagsCache: new Map(),
    folderFileCounts: {},
    folderThumbnails: {},

    setFiles: (files, options) => {
        const fileMap = new Map(files.map(f => [f.id, f]));
        set({ files, fileMap, focusedId: null });
        if (options?.reloadTagCache === false) {
            return;
        }

        if (pendingTagCacheReloadTimer) {
            clearTimeout(pendingTagCacheReloadTimer);
        }

        // 短時間に複数回 setFiles されるケースでは全件タグ再取得をまとめる。
        pendingTagCacheReloadTimer = setTimeout(() => {
            pendingTagCacheReloadTimer = null;
            get().loadFileTagsCache();
        }, FILE_TAG_CACHE_RELOAD_DEBOUNCE_MS);
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

    removeFile: (fileId: string) =>
        set((state) => {
            const newCache = new Map(state.fileTagsCache);
            newCache.delete(fileId);
            const newFileMap = new Map(state.fileMap);
            newFileMap.delete(fileId);
            return {
                files: state.files.filter(f => f.id !== fileId),
                fileMap: newFileMap,
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
                set((state) => {
                    const newFileMap = new Map(state.fileMap);
                    newFileMap.set(fileId, updatedFile);
                    return {
                        files: state.files.map(f => f.id === fileId ? updatedFile : f),
                        fileMap: newFileMap,
                    };
                });
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
        set((state) => {
            const updatedFiles = state.files.map(file =>
                file.id === fileId
                    ? { ...file, accessCount: (file.accessCount || 0) + 1, lastAccessedAt }
                    : file
            );
            const newFileMap = new Map(state.fileMap);
            const updated = newFileMap.get(fileId);
            if (updated) newFileMap.set(fileId, { ...updated, accessCount: (updated.accessCount || 0) + 1, lastAccessedAt });
            return { files: updatedFiles, fileMap: newFileMap };
        }),

    // Phase 18-A: 外部アプリ起動カウント更新（即時UI反映）
    updateFileExternalOpenCount: (fileId: string, count: number, timestamp: number) =>
        set((state) => {
            const updatedFiles = state.files.map(file =>
                file.id === fileId
                    ? { ...file, externalOpenCount: count, lastExternalOpenedAt: timestamp }
                    : file
            );
            const newFileMap = new Map(state.fileMap);
            const updated = newFileMap.get(fileId);
            if (updated) newFileMap.set(fileId, { ...updated, externalOpenCount: count, lastExternalOpenedAt: timestamp });
            return { files: updatedFiles, fileMap: newFileMap };
        }),

    updatePlaybackPosition: (fileId: string, seconds: number | null, updatedAt: number | null) =>
        set((state) => {
            const updatedFiles = state.files.map(file =>
                file.id === fileId
                    ? {
                        ...file,
                        playbackPositionSeconds: seconds,
                        playbackPositionUpdatedAt: updatedAt,
                    }
                    : file
            );
            const newFileMap = new Map(state.fileMap);
            const updated = newFileMap.get(fileId);
            if (updated) {
                newFileMap.set(fileId, {
                    ...updated,
                    playbackPositionSeconds: seconds,
                    playbackPositionUpdatedAt: updatedAt,
                });
            }
            return { files: updatedFiles, fileMap: newFileMap };
        }),
}));
