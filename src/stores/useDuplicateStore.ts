/**
 * Duplicate Store - 重複ファイル状態管理
 */

import { create } from 'zustand';
import type { DuplicateSearchMode, SimilarNameMatchKind } from '../shared/duplicateNameCandidates';

export const DUPLICATE_BULK_ACTION_GROUP_LIMIT = 100;

// Types
export interface DuplicateFileEntry {
    id: string;
    name: string;
    path: string;
    size: number;
    type: string;
    created_at: number;
    duration?: string;
    thumbnail_path?: string;
    preview_frames?: string;
    root_folder_id?: string;
    tags: string[];
    content_hash?: string;
    metadata?: string;
    mtime_ms?: number;
    notes?: string;
}

export interface DuplicateGroup {
    hash: string;
    size: number;
    sizeMin: number;
    sizeMax: number;
    matchKind: 'content_hash' | SimilarNameMatchKind;
    matchLabel: string;
    files: DuplicateFileEntry[];
    count: number;
}

export interface DuplicateStats {
    totalGroups: number;
    totalFiles: number;
    wastedSpace: number;
}

export interface DuplicateProgress {
    phase: 'analyzing' | 'hashing' | 'complete';
    current: number;
    total: number;
    currentFile?: string;
}

export type DuplicateSelectionStrategy = 'newest' | 'oldest' | 'shortest_path';

function getTimePriority(file: DuplicateFileEntry): number {
    return file.mtime_ms || file.created_at || 0;
}

function resolveKeepFile(group: DuplicateGroup, strategy: DuplicateSelectionStrategy): DuplicateFileEntry | null {
    if (group.files.length < 2) {
        return null;
    }

    switch (strategy) {
        case 'newest':
            return group.files.reduce((best, file) => {
                const fileMtime = file.mtime_ms || 0;
                const bestMtime = best.mtime_ms || 0;

                if (fileMtime !== bestMtime) {
                    return fileMtime > bestMtime ? file : best;
                }

                const fileCreated = file.created_at || 0;
                const bestCreated = best.created_at || 0;
                if (fileCreated !== bestCreated) {
                    return fileCreated > bestCreated ? file : best;
                }

                return file.path.length < best.path.length ? file : best;
            });

        case 'oldest':
            return group.files.reduce((best, file) => {
                const fileMtime = file.mtime_ms || Infinity;
                const bestMtime = best.mtime_ms || Infinity;

                if (fileMtime !== bestMtime) {
                    return fileMtime < bestMtime ? file : best;
                }

                const fileCreated = file.created_at || Infinity;
                const bestCreated = best.created_at || Infinity;
                if (fileCreated !== bestCreated) {
                    return fileCreated < bestCreated ? file : best;
                }

                return file.path.length < best.path.length ? file : best;
            });

        case 'shortest_path':
            return group.files.reduce((best, file) => {
                if (file.path.length !== best.path.length) {
                    return file.path.length < best.path.length ? file : best;
                }

                const fileTime = getTimePriority(file);
                const bestTime = getTimePriority(best);
                return fileTime > bestTime ? file : best;
            });
    }
}

function getFilesToDeleteByStrategy(group: DuplicateGroup, strategy: DuplicateSelectionStrategy): string[] {
    const keepFile = resolveKeepFile(group, strategy);
    if (!keepFile) {
        return [];
    }

    return group.files.filter((file) => file.id !== keepFile.id).map((file) => file.id);
}

interface DuplicateState {
    // State
    groups: DuplicateGroup[];
    stats: DuplicateStats | null;
    isSearching: boolean;
    progress: DuplicateProgress | null;
    selectedFileIds: Set<string>;
    isDeleting: boolean;
    hasSearched: boolean; // 検索完了フラグ（未検索 vs 結果0件の区別）
    searchMode: DuplicateSearchMode;

    // Actions
    startSearch: (mode?: DuplicateSearchMode) => Promise<void>;
    cancelSearch: () => void;
    setProgress: (progress: DuplicateProgress) => void;
    selectFile: (fileId: string) => void;
    deselectFile: (fileId: string) => void;
    selectFilesInGroup: (groupHash: string, fileIds: string[]) => void;
    selectAllFilesInGroup: (groupHash: string) => void;
    keepOnlyFileInGroup: (groupHash: string, keepFileId: string) => void;
    clearSelection: () => void;
    deleteSelectedFiles: () => Promise<void>;
    reset: () => void;

    // Smart selection
    selectByStrategy: (groupHash: string, strategy: DuplicateSelectionStrategy) => void;
    selectAcrossGroupsByStrategy: (strategy: DuplicateSelectionStrategy, limit?: number) => void;
}

export const useDuplicateStore = create<DuplicateState>((set, get) => ({
    // Initial state
    groups: [],
    stats: null,
    isSearching: false,
    progress: null,
    selectedFileIds: new Set(),
    isDeleting: false,
    hasSearched: false,
    searchMode: 'exact',

    // Start duplicate search
    startSearch: async (mode) => {
        const nextMode = mode ?? get().searchMode;
        // Bug 4修正: 開始時に完全初期化
        set({
            isSearching: true,
            groups: [],
            stats: null,
            progress: null,
            selectedFileIds: new Set(),
            searchMode: nextMode,
        });

        try {
            const result = await window.electronAPI.findDuplicates(nextMode);
            set({
                groups: result.groups,
                stats: result.stats,
                progress: { phase: 'complete', current: 0, total: 0 },
                hasSearched: true
            });
        } catch (err) {
            console.error('Duplicate search failed:', err);
        } finally {
            // Bug 4修正: 確実にリセット
            set({ isSearching: false });
        }
    },

    // Cancel search
    cancelSearch: () => {
        window.electronAPI.cancelDuplicateSearch();
        set({ isSearching: false, progress: null });
    },

    // Update progress
    setProgress: (progress) => {
        set({ progress });
    },

    // Select/deselect files
    selectFile: (fileId) => {
        set((state) => {
            const newSet = new Set(state.selectedFileIds);
            newSet.add(fileId);
            return { selectedFileIds: newSet };
        });
    },

    deselectFile: (fileId) => {
        set((state) => {
            const newSet = new Set(state.selectedFileIds);
            newSet.delete(fileId);
            return { selectedFileIds: newSet };
        });
    },

    selectFilesInGroup: (groupHash, fileIds) => {
        set((state) => {
            const newSet = new Set(state.selectedFileIds);
            // Remove all files from this group first
            const group = state.groups.find(g => g.hash === groupHash);
            if (group) {
                group.files.forEach(f => newSet.delete(f.id));
            }
            // Add selected files
            fileIds.forEach(id => newSet.add(id));
            return { selectedFileIds: newSet };
        });
    },

    selectAllFilesInGroup: (groupHash) => {
        set((state) => {
            const newSet = new Set(state.selectedFileIds);
            const group = state.groups.find(g => g.hash === groupHash);
            if (!group) {
                return { selectedFileIds: newSet };
            }
            group.files.forEach((file) => newSet.add(file.id));
            return { selectedFileIds: newSet };
        });
    },

    keepOnlyFileInGroup: (groupHash, keepFileId) => {
        const { groups, selectFilesInGroup } = get();
        const group = groups.find(g => g.hash === groupHash);
        if (!group) return;

        const filesToDelete = group.files
            .filter((file) => file.id !== keepFileId)
            .map((file) => file.id);
        selectFilesInGroup(groupHash, filesToDelete);
    },

    clearSelection: () => {
        set({ selectedFileIds: new Set() });
    },

    // Delete selected files
    deleteSelectedFiles: async () => {
        const { selectedFileIds, groups } = get();
        if (selectedFileIds.size === 0) return;

        set({ isDeleting: true });

        try {
            const results = await window.electronAPI.deleteDuplicateFiles(Array.from(selectedFileIds));

            // Remove deleted files from groups
            const deletedIds = new Set(results.filter(r => r.success).map(r => r.id));

            const updatedGroups = groups
                .map(group => ({
                    ...group,
                    files: group.files.filter(f => !deletedIds.has(f.id)),
                    count: group.files.filter(f => !deletedIds.has(f.id)).length
                }))
                .filter(group => group.count >= 2); // Remove groups with less than 2 files

            // Recalculate stats
            let totalFiles = 0;
            let wastedSpace = 0;
            for (const group of updatedGroups) {
                if (group.matchKind === 'content_hash') {
                    const duplicateCount = group.count - 1;
                    totalFiles += duplicateCount;
                    wastedSpace += group.size * duplicateCount;
                    continue;
                }

                totalFiles += group.count;
            }

            set({
                groups: updatedGroups,
                stats: {
                    totalGroups: updatedGroups.length,
                    totalFiles,
                    wastedSpace
                },
                selectedFileIds: new Set(),
                isDeleting: false
            });
        } catch (err) {
            console.error('Delete failed:', err);
            set({ isDeleting: false });
        }
    },

    // Reset state
    reset: () => {
        set({
            groups: [],
            stats: null,
            isSearching: false,
            progress: null,
            selectedFileIds: new Set(),
            isDeleting: false,
            hasSearched: false,
            searchMode: 'exact',
        });
    },

    // Smart selection strategies
    selectByStrategy: (groupHash, strategy) => {
        const { groups } = get();
        const group = groups.find(g => g.hash === groupHash);
        if (!group || group.files.length < 2) return;

        const filesToDelete = getFilesToDeleteByStrategy(group, strategy);
        get().selectFilesInGroup(groupHash, filesToDelete);
    },

    selectAcrossGroupsByStrategy: (strategy, limit = DUPLICATE_BULK_ACTION_GROUP_LIMIT) => {
        set((state) => ({
            selectedFileIds: new Set(
                state.groups
                    .slice(0, limit)
                    .flatMap((group) => getFilesToDeleteByStrategy(group, strategy))
            )
        }));
    }
}));
