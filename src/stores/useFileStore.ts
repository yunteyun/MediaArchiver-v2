import { create } from 'zustand';
import type { MediaFile } from '../types/file';
import { useUIStore } from './useUIStore';

interface FileState {
    files: MediaFile[];
    selectedIds: Set<string>;
    currentFolderId: string | null;
    // アクション
    setFiles: (files: MediaFile[]) => void;
    setCurrentFolderId: (id: string | null) => void;
    selectFile: (id: string, multi?: boolean) => void;
    clearSelection: () => void;
    getSortedFiles: () => MediaFile[];
}

export const useFileStore = create<FileState>((set, get) => ({
    files: [],
    selectedIds: new Set(),
    currentFolderId: null,

    setFiles: (files) => set({ files }),
    setCurrentFolderId: (id) => set({ currentFolderId: id }),

    selectFile: (id, multi = false) =>
        set((state) => {
            const newSelected = multi ? new Set<string>(state.selectedIds) : new Set<string>();
            if (newSelected.has(id)) {
                newSelected.delete(id);
            } else {
                newSelected.add(id);
            }
            return { selectedIds: newSelected };
        }),

    clearSelection: () => set({ selectedIds: new Set() }),

    getSortedFiles: () => {
        const { sortBy, sortOrder } = useUIStore.getState();
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
}));
