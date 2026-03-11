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
});
