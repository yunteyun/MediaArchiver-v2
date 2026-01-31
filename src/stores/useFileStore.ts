import { create } from 'zustand';
import type { MediaFile } from '../types/file';

interface FileState {
    files: MediaFile[];
    selectedIds: Set<string>;
    currentFolderId: string | null;
    // アクション
    setFiles: (files: MediaFile[]) => void;
    selectFile: (id: string, multi?: boolean) => void;
    clearSelection: () => void;
}

export const useFileStore = create<FileState>((set) => ({
    files: [],
    selectedIds: new Set(),
    currentFolderId: null,

    setFiles: (files) => set({ files }),

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
}));
