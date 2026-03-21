import { beforeEach, describe, expect, it } from 'vitest';
import { useRatingStore } from '../useRatingStore';
import { useSmartFolderStore, clearAppliedSmartFolderState } from '../useSmartFolderStore';
import { useTagStore } from '../useTagStore';
import { useUIStore } from '../useUIStore';

function resetUiStore() {
    useUIStore.setState({
        searchQuery: '',
        searchTarget: 'fileName',
        searchExtraConditions: [],
        ratingQuickFilter: 'none',
        selectedFileTypes: ['video', 'image', 'archive', 'audio'],
    });
}

function resetTagStore() {
    useTagStore.setState({
        selectedTagIds: [],
        filterMode: 'OR',
    });
}

function resetRatingStore() {
    useRatingStore.setState({
        ratingFilter: {},
    });
}

function resetSmartFolderStore() {
    useSmartFolderStore.setState({
        smartFolders: [],
        activeSmartFolderId: null,
        isLoading: false,
        isMutating: false,
    });
}

describe('useSmartFolderStore', () => {
    beforeEach(() => {
        resetUiStore();
        resetTagStore();
        resetRatingStore();
        resetSmartFolderStore();
    });

    it('clears applied smart folder filters back to defaults', () => {
        useUIStore.setState({
            searchQuery: 'hero',
            searchTarget: 'folderName',
            searchExtraConditions: [{ text: 'team', target: 'fileName' }],
            ratingQuickFilter: 'midOrAbove',
            selectedFileTypes: ['video'],
        });
        useTagStore.setState({
            selectedTagIds: ['tag-1'],
            filterMode: 'AND',
        });
        useRatingStore.setState({
            ratingFilter: {
                overall: { min: 4 },
            },
        });
        useSmartFolderStore.setState({
            activeSmartFolderId: 'smart-1',
        });

        clearAppliedSmartFolderState('fileName');

        expect(useUIStore.getState().searchQuery).toBe('');
        expect(useUIStore.getState().searchTarget).toBe('fileName');
        expect(useUIStore.getState().searchExtraConditions).toEqual([]);
        expect(useUIStore.getState().ratingQuickFilter).toBe('none');
        expect(useUIStore.getState().selectedFileTypes).toEqual(['video', 'image', 'archive', 'audio']);
        expect(useTagStore.getState().selectedTagIds).toEqual([]);
        expect(useTagStore.getState().filterMode).toBe('OR');
        expect(useRatingStore.getState().ratingFilter).toEqual({});
        expect(useSmartFolderStore.getState().activeSmartFolderId).toBeNull();
    });

    it('reloads smart folders after moving one up or down', async () => {
        const hostWindow = globalThis as typeof globalThis & {
            window?: { electronAPI?: unknown };
            electronAPI?: unknown;
        };
        const originalWindow = hostWindow.window;
        const originalElectronApi = hostWindow.window?.electronAPI ?? hostWindow.electronAPI;
        const nextFolders = [
            {
                id: 'smart-2',
                name: 'B',
                sortOrder: 0,
                createdAt: 1,
                updatedAt: 2,
                condition: {
                    folderSelection: null,
                    text: '',
                    textMatchTarget: 'fileName',
                    textConditions: [],
                    ratingQuickFilter: 'none',
                    tags: { ids: [], mode: 'OR' },
                    ratings: {},
                    types: ['video', 'image', 'archive', 'audio'],
                },
            },
            {
                id: 'smart-1',
                name: 'A',
                sortOrder: 1,
                createdAt: 1,
                updatedAt: 2,
                condition: {
                    folderSelection: null,
                    text: '',
                    textMatchTarget: 'fileName',
                    textConditions: [],
                    ratingQuickFilter: 'none',
                    tags: { ids: [], mode: 'OR' },
                    ratings: {},
                    types: ['video', 'image', 'archive', 'audio'],
                },
            },
        ];

        useSmartFolderStore.setState({
            smartFolders: [
                nextFolders[1],
                nextFolders[0],
            ],
        });

        hostWindow.window = {
            electronAPI: {
                ...(originalElectronApi as object | undefined),
                moveSmartFolder: async () => nextFolders[0],
                getSmartFolders: async () => nextFolders,
            },
        };
        hostWindow.electronAPI = hostWindow.window.electronAPI;

        await useSmartFolderStore.getState().moveSmartFolder('smart-2', 'up');

        expect(useSmartFolderStore.getState().smartFolders.map((item) => item.id)).toEqual(['smart-2', 'smart-1']);

        if (originalWindow) {
            hostWindow.window = originalWindow;
        } else {
            delete hostWindow.window;
        }
        if (originalElectronApi) {
            hostWindow.electronAPI = originalElectronApi;
        } else {
            delete hostWindow.electronAPI;
        }
    });
});
