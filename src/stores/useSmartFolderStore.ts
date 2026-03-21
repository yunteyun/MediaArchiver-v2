import { create } from 'zustand';
import { useRatingStore } from './useRatingStore';
import { useTagStore } from './useTagStore';
import { useUIStore } from './useUIStore';
import type { MediaFile } from '../types/file';
import type { RatingQuickFilter, SearchCondition, SearchTarget } from './useUIStore';
import { normalizeRatingQuickFilter } from '../shared/ratingQuickFilter';

const SMART_FOLDER_FILE_TYPES: MediaFile['type'][] = ['video', 'image', 'archive', 'audio'];

function normalizeFileTypes(input: unknown): MediaFile['type'][] {
    if (!Array.isArray(input)) return [...SMART_FOLDER_FILE_TYPES];
    const normalized = Array.from(new Set(
        input.filter((type): type is MediaFile['type'] => (
            type === 'video' || type === 'image' || type === 'archive' || type === 'audio'
        ))
    ));
    return normalized.length > 0 ? normalized : [...SMART_FOLDER_FILE_TYPES];
}

function normalizeTextConditions(input: unknown, fallbackText?: string, fallbackTarget?: SearchTarget): SearchCondition[] {
    const fromList = Array.isArray(input)
        ? input.map((item) => {
            const candidate = item && typeof item === 'object' ? (item as Partial<SearchCondition>) : {};
            const text = typeof candidate.text === 'string' ? candidate.text.trim() : '';
            if (!text) return null;
            return {
                text,
                target: candidate.target === 'folderName' ? 'folderName' : 'fileName',
            } as SearchCondition;
        }).filter((item): item is SearchCondition => item !== null)
        : [];

    if (fromList.length > 0) return fromList;

    const legacyText = typeof fallbackText === 'string' ? fallbackText.trim() : '';
    if (!legacyText) return [];
    return [{ text: legacyText, target: fallbackTarget === 'folderName' ? 'folderName' : 'fileName' }];
}

export interface SmartFolderConditionV1 {
    folderSelection: string | null;
    text: string;
    textMatchTarget: SearchTarget;
    textConditions: SearchCondition[];
    ratingQuickFilter: RatingQuickFilter;
    tags: {
        ids: string[];
        mode: 'AND' | 'OR';
    };
    ratings: Record<string, { min?: number; max?: number }>;
    types: MediaFile['type'][];
}

export interface SmartFolderV1 {
    id: string;
    name: string;
    condition: SmartFolderConditionV1;
    sortOrder: number;
    createdAt: number;
    updatedAt: number;
}

interface SmartFolderApplyOptions {
    applyFolderSelection?: (folderSelection: string | null) => Promise<void> | void;
}

interface SmartFolderState {
    smartFolders: SmartFolderV1[];
    activeSmartFolderId: string | null;
    isLoading: boolean;
    isMutating: boolean;
    loadSmartFolders: () => Promise<void>;
    createSmartFolder: (name: string, condition: SmartFolderConditionV1) => Promise<SmartFolderV1>;
    updateSmartFolder: (
        id: string,
        updates: {
            name?: string;
            condition?: SmartFolderConditionV1;
            sortOrder?: number;
        }
    ) => Promise<SmartFolderV1>;
    renameSmartFolder: (id: string, name: string) => Promise<SmartFolderV1>;
    deleteSmartFolder: (id: string) => Promise<boolean>;
    moveSmartFolder: (id: string, direction: 'up' | 'down') => Promise<void>;
    applySmartFolder: (id: string, options?: SmartFolderApplyOptions) => Promise<boolean>;
    setActiveSmartFolderId: (id: string | null) => void;
}

function normalizeCondition(input: SmartFolderConditionV1): SmartFolderConditionV1 {
    const normalizedRatings: Record<string, { min?: number; max?: number }> = {};

    Object.entries(input.ratings || {}).forEach(([axisId, range]) => {
        const min = typeof range?.min === 'number' && Number.isFinite(range.min) ? range.min : undefined;
        const max = typeof range?.max === 'number' && Number.isFinite(range.max) ? range.max : undefined;
        if (min === undefined && max === undefined) return;
        normalizedRatings[axisId] = { min, max };
    });

    const normalizedTextConditions = normalizeTextConditions(
        input.textConditions,
        input.text,
        input.textMatchTarget
    );
    const primaryTextCondition = normalizedTextConditions[0];

    return {
        folderSelection: typeof input.folderSelection === 'string' ? input.folderSelection : null,
        text: primaryTextCondition?.text ?? '',
        textMatchTarget: primaryTextCondition?.target ?? 'fileName',
        textConditions: normalizedTextConditions,
        tags: {
            ids: Array.isArray(input.tags?.ids) ? input.tags.ids.filter((id) => typeof id === 'string' && id.length > 0) : [],
            mode: input.tags?.mode === 'AND' ? 'AND' : 'OR',
        },
        ratingQuickFilter: normalizeRatingQuickFilter(input.ratingQuickFilter),
        ratings: normalizedRatings,
        types: normalizeFileTypes(input.types),
    };
}

export function clearAppliedSmartFolderState(defaultSearchTarget: SearchTarget) {
    const uiStore = useUIStore.getState();
    uiStore.clearSearchConditions(defaultSearchTarget);
    uiStore.setRatingQuickFilter('none');
    uiStore.setSelectedFileTypes([...SMART_FOLDER_FILE_TYPES]);
    useTagStore.setState({
        selectedTagIds: [],
        filterMode: 'OR',
    });
    useRatingStore.getState().clearRatingFilters();
    useSmartFolderStore.getState().setActiveSmartFolderId(null);
}

export const useSmartFolderStore = create<SmartFolderState>((set, get) => ({
    smartFolders: [],
    activeSmartFolderId: null,
    isLoading: false,
    isMutating: false,

    loadSmartFolders: async () => {
        set({ isLoading: true });
        try {
            const smartFolders = await window.electronAPI.getSmartFolders();
            set({ smartFolders });
        } catch (error) {
            console.error('Failed to load smart folders:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    createSmartFolder: async (name, condition) => {
        set({ isMutating: true });
        try {
            const created = await window.electronAPI.createSmartFolder({
                name,
                condition: normalizeCondition(condition),
            });
            set((state) => ({
                smartFolders: [...state.smartFolders, created].sort((a, b) => a.sortOrder - b.sortOrder),
                activeSmartFolderId: created.id,
            }));
            return created;
        } finally {
            set({ isMutating: false });
        }
    },

    updateSmartFolder: async (id, updates) => {
        set({ isMutating: true });
        try {
            const payload: {
                name?: string;
                condition?: SmartFolderConditionV1;
                sortOrder?: number;
            } = {};
            if (typeof updates.name === 'string') {
                payload.name = updates.name.trim();
            }
            if (updates.condition) {
                payload.condition = normalizeCondition(updates.condition);
            }
            if (typeof updates.sortOrder === 'number' && Number.isFinite(updates.sortOrder)) {
                payload.sortOrder = Math.max(0, Math.floor(updates.sortOrder));
            }

            const updated = await window.electronAPI.updateSmartFolder({
                id,
                updates: payload,
            });
            set((state) => ({
                smartFolders: state.smartFolders
                    .map((item) => (item.id === id ? updated : item))
                    .sort((a, b) => a.sortOrder - b.sortOrder),
            }));
            return updated;
        } finally {
            set({ isMutating: false });
        }
    },

    renameSmartFolder: async (id, name) => {
        return get().updateSmartFolder(id, { name });
    },

    deleteSmartFolder: async (id) => {
        set({ isMutating: true });
        try {
            const result = await window.electronAPI.deleteSmartFolder(id);
            if (!result.success) return false;
            set((state) => ({
                smartFolders: state.smartFolders.filter((item) => item.id !== id),
                activeSmartFolderId: state.activeSmartFolderId === id ? null : state.activeSmartFolderId,
            }));
            return true;
        } finally {
            set({ isMutating: false });
        }
    },

    moveSmartFolder: async (id, direction) => {
        set({ isMutating: true });
        try {
            await window.electronAPI.moveSmartFolder(id, direction);
            const smartFolders = await window.electronAPI.getSmartFolders();
            set({ smartFolders });
        } finally {
            set({ isMutating: false });
        }
    },

    applySmartFolder: async (id, options) => {
        const target = get().smartFolders.find((item) => item.id === id);
        if (!target) return false;

        const normalized = normalizeCondition(target.condition);

        const uiStore = useUIStore.getState();
        uiStore.setSearchConditions(normalized.textConditions);
        uiStore.setRatingQuickFilter(normalized.ratingQuickFilter ?? 'none');
        uiStore.setSelectedFileTypes(normalized.types);
        useTagStore.setState({
            selectedTagIds: [...normalized.tags.ids],
            filterMode: normalized.tags.mode,
        });
        useRatingStore.setState({
            ratingFilter: { ...normalized.ratings },
        });

        if (options?.applyFolderSelection) {
            await options.applyFolderSelection(normalized.folderSelection);
        }

        set({ activeSmartFolderId: id });
        return true;
    },

    setActiveSmartFolderId: (id) => {
        set({ activeSmartFolderId: id });
    },
}));
