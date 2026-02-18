/**
 * Duplicate Store - 重複ファイル状態管理
 */

import { create } from 'zustand';

// Types
export interface DuplicateGroup {
    hash: string;
    size: number;
    files: any[];
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

interface DuplicateState {
    // State
    groups: DuplicateGroup[];
    stats: DuplicateStats | null;
    isSearching: boolean;
    progress: DuplicateProgress | null;
    selectedFileIds: Set<string>;
    isDeleting: boolean;
    hasSearched: boolean; // 検索完了フラグ（未検索 vs 結果0件の区別）

    // Actions
    startSearch: () => Promise<void>;
    cancelSearch: () => void;
    setProgress: (progress: DuplicateProgress) => void;
    selectFile: (fileId: string) => void;
    deselectFile: (fileId: string) => void;
    selectFilesInGroup: (groupHash: string, fileIds: string[]) => void;
    clearSelection: () => void;
    deleteSelectedFiles: () => Promise<void>;
    reset: () => void;

    // Smart selection
    selectByStrategy: (groupHash: string, strategy: 'newest' | 'oldest' | 'shortest_path') => void;
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

    // Start duplicate search
    startSearch: async () => {
        // Bug 4修正: 開始時に完全初期化
        set({
            isSearching: true,
            groups: [],
            stats: null,
            progress: null,
            selectedFileIds: new Set()
        });

        try {
            const result = await window.electronAPI.findDuplicates();
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
                const duplicateCount = group.count - 1;
                totalFiles += duplicateCount;
                wastedSpace += group.size * duplicateCount;
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
            hasSearched: false
        });
    },

    // Smart selection strategies
    selectByStrategy: (groupHash, strategy) => {
        const { groups } = get();
        const group = groups.find(g => g.hash === groupHash);
        if (!group || group.files.length < 2) return;

        let keepFile: any;

        // 比較用のヘルパー関数
        const getTimePriority = (file: any): number => {
            // mtime_msを優先、なければcreated_at
            return file.mtime_ms || file.created_at || 0;
        };

        switch (strategy) {
            case 'newest':
                // Keep the newest file
                keepFile = group.files.reduce((best, file) => {
                    const fileMtime = file.mtime_ms || 0;
                    const bestMtime = best.mtime_ms || 0;

                    // mtime_msが異なる場合
                    if (fileMtime !== bestMtime) {
                        return fileMtime > bestMtime ? file : best;
                    }

                    // mtime_msが同じ場合、created_atで比較
                    const fileCreated = file.created_at || 0;
                    const bestCreated = best.created_at || 0;
                    if (fileCreated !== bestCreated) {
                        return fileCreated > bestCreated ? file : best;
                    }

                    // 両方同じ場合、パスが短い方を優先
                    return file.path.length < best.path.length ? file : best;
                });
                break;

            case 'oldest':
                // Keep the oldest file
                keepFile = group.files.reduce((best, file) => {
                    const fileMtime = file.mtime_ms || Infinity;
                    const bestMtime = best.mtime_ms || Infinity;

                    // mtime_msが異なる場合
                    if (fileMtime !== bestMtime) {
                        return fileMtime < bestMtime ? file : best;
                    }

                    // mtime_msが同じ場合、created_atで比較
                    const fileCreated = file.created_at || Infinity;
                    const bestCreated = best.created_at || Infinity;
                    if (fileCreated !== bestCreated) {
                        return fileCreated < bestCreated ? file : best;
                    }

                    // 両方同じ場合、パスが短い方を優先
                    return file.path.length < best.path.length ? file : best;
                });
                break;

            case 'shortest_path':
                // Keep the file with shortest path
                keepFile = group.files.reduce((best, file) => {
                    if (file.path.length !== best.path.length) {
                        return file.path.length < best.path.length ? file : best;
                    }
                    // 同じ長さの場合、より新しい方を優先
                    const fileTime = getTimePriority(file);
                    const bestTime = getTimePriority(best);
                    return fileTime > bestTime ? file : best;
                });
                break;
        }

        // Select all files except the one to keep
        const filesToDelete = group.files.filter(f => f.id !== keepFile.id).map(f => f.id);
        get().selectFilesInGroup(groupHash, filesToDelete);
    }
}));
