import { beforeEach, describe, expect, it } from 'vitest';
import { useUIStore } from '../useUIStore';

function resetUiStore() {
    useUIStore.setState({
        sidebarWidth: 250,
        sidebarCollapsed: false,
        viewMode: 'grid',
        lightboxFile: null,
        lightboxOpenMode: 'default',
        lightboxStartTime: null,
        searchQuery: '',
        searchTarget: 'fileName',
        searchExtraConditions: [],
        ratingQuickFilter: 'none',
        currentSortBy: 'date',
        currentSortOrder: 'desc',
        currentGroupBy: 'none',
        currentDisplayMode: 'standard',
        currentActiveDisplayPresetId: 'standard',
        currentThumbnailPresentation: 'modeDefault',
        selectedFileTypes: ['video', 'image', 'archive', 'audio'],
        settingsModalOpen: false,
        settingsModalRequestedTab: null,
        scanProgress: null,
        scanProgressAutoDismissPending: false,
        toasts: [],
        duplicateViewOpen: false,
        mainView: 'grid',
        hoveredPreviewId: null,
        deleteDialogOpen: false,
        deleteDialogFilePath: null,
        deleteDialogFileId: null,
        moveDialogOpen: false,
        moveFileIds: [],
        moveCurrentFolderId: null,
        isRightPanelOpen: true,
        previewContext: null,
        isScanProgressVisible: false,
    });
}

describe('useUIStore', () => {
    beforeEach(() => {
        resetUiStore();
    });

    it('normalizes search conditions into primary query and extra conditions', () => {
        useUIStore.getState().setSearchConditions([
            { text: '  hero  ', target: 'fileName' },
            { text: '   ', target: 'folderName' },
            { text: ' blue team ', target: 'folderName' },
            // @ts-expect-error invalid target for normalization test
            { text: 'fallback', target: 'unknown' },
        ]);

        const state = useUIStore.getState();
        expect(state.searchQuery).toBe('  hero  ');
        expect(state.searchTarget).toBe('fileName');
        expect(state.searchExtraConditions).toEqual([
            { text: ' blue team ', target: 'folderName' },
            { text: 'fallback', target: 'fileName' },
        ]);
    });

    it('clears search conditions while preserving or overriding the target', () => {
        useUIStore.setState({
            searchQuery: 'hero',
            searchTarget: 'folderName',
            searchExtraConditions: [{ text: 'team', target: 'fileName' }],
        });

        useUIStore.getState().clearSearchConditions();
        expect(useUIStore.getState().searchTarget).toBe('folderName');
        expect(useUIStore.getState().searchQuery).toBe('');
        expect(useUIStore.getState().searchExtraConditions).toEqual([]);

        useUIStore.setState({
            searchQuery: 'hero',
            searchTarget: 'folderName',
            searchExtraConditions: [{ text: 'team', target: 'fileName' }],
        });

        useUIStore.getState().clearSearchConditions('fileName');
        expect(useUIStore.getState().searchTarget).toBe('fileName');
        expect(useUIStore.getState().searchQuery).toBe('');
        expect(useUIStore.getState().searchExtraConditions).toEqual([]);
    });

    it('shows scan progress when counting starts and keeps it visible through scanning', () => {
        useUIStore.getState().setScanProgress({
            phase: 'counting',
            current: 0,
            total: 0,
        });
        expect(useUIStore.getState().isScanProgressVisible).toBe(true);
        expect(useUIStore.getState().scanProgressAutoDismissPending).toBe(false);

        useUIStore.getState().setScanProgress({
            phase: 'scanning',
            current: 1,
            total: 10,
        });
        expect(useUIStore.getState().isScanProgressVisible).toBe(true);
        expect(useUIStore.getState().scanProgressAutoDismissPending).toBe(false);
    });

    it('marks complete scan progress for auto dismiss without hiding immediately', () => {
        useUIStore.setState({ isScanProgressVisible: true });

        useUIStore.getState().setScanProgress({
            phase: 'complete',
            current: 10,
            total: 10,
            message: 'done',
        });

        const state = useUIStore.getState();
        expect(state.isScanProgressVisible).toBe(true);
        expect(state.scanProgressAutoDismissPending).toBe(true);
        expect(state.scanProgress?.phase).toBe('complete');
    });

    it('normalizes selected file types and removes duplicates', () => {
        // @ts-expect-error invalid member for normalization test
        useUIStore.getState().setSelectedFileTypes(['image', 'audio', 'image', 'invalid']);

        expect(useUIStore.getState().selectedFileTypes).toEqual(['image', 'audio']);
    });

    it('applies display defaults for the current list state', () => {
        useUIStore.getState().applyListDisplayDefaults({
            sortBy: 'name',
            sortOrder: 'asc',
            groupBy: 'date',
            displayMode: 'whiteBrowser',
            activeDisplayPresetId: 'whiteBrowser',
            thumbnailPresentation: 'square',
        });

        const state = useUIStore.getState();
        expect(state.currentSortBy).toBe('name');
        expect(state.currentSortOrder).toBe('asc');
        expect(state.currentGroupBy).toBe('date');
        expect(state.currentDisplayMode).toBe('whiteBrowser');
        expect(state.currentActiveDisplayPresetId).toBe('whiteBrowser');
        expect(state.currentThumbnailPresentation).toBe('square');
    });

    it('applies profile scoped UI defaults without keeping previous search conditions', () => {
        useUIStore.setState({
            searchQuery: 'hero',
            searchTarget: 'fileName',
            searchExtraConditions: [{ text: 'team', target: 'folderName' }],
            currentSortBy: 'date',
            currentSortOrder: 'desc',
            currentGroupBy: 'none',
        });

        useUIStore.getState().applyProfileScopedUiDefaults({
            defaultSearchTarget: 'folderName',
            listDisplayDefaults: {
                sortBy: 'name',
                sortOrder: 'asc',
                groupBy: 'type',
                displayMode: 'compact',
                activeDisplayPresetId: 'compact',
                thumbnailPresentation: 'contain',
            },
        });

        const state = useUIStore.getState();
        expect(state.searchQuery).toBe('');
        expect(state.searchTarget).toBe('folderName');
        expect(state.searchExtraConditions).toEqual([]);
        expect(state.currentSortBy).toBe('name');
        expect(state.currentSortOrder).toBe('asc');
        expect(state.currentGroupBy).toBe('type');
        expect(state.currentDisplayMode).toBe('compact');
        expect(state.currentActiveDisplayPresetId).toBe('compact');
        expect(state.currentThumbnailPresentation).toBe('contain');
    });

    it('resets transient state for profile switches', () => {
        useUIStore.setState({
            lightboxFile: { id: 'f1' } as never,
            lightboxOpenMode: 'archive-image',
            lightboxStartTime: 10,
            searchQuery: 'hero',
            searchTarget: 'folderName',
            searchExtraConditions: [{ text: 'team', target: 'fileName' }],
            ratingQuickFilter: 'midOrAbove',
            currentSortBy: 'name',
            currentSortOrder: 'asc',
            currentGroupBy: 'type',
            currentDisplayMode: 'compact',
            currentActiveDisplayPresetId: 'compact',
            currentThumbnailPresentation: 'contain',
            selectedFileTypes: ['image'],
            settingsModalOpen: true,
            settingsModalRequestedTab: 'apps',
            duplicateViewOpen: true,
            mainView: 'profile',
            hoveredPreviewId: 'hovered',
            deleteDialogOpen: true,
            deleteDialogFilePath: 'C:\\temp\\x.png',
            deleteDialogFileId: 'delete-target',
            moveDialogOpen: true,
            moveFileIds: ['f1'],
            moveCurrentFolderId: 'folder-1',
            previewContext: 'right-panel',
        });

        useUIStore.getState().resetTransientStateForProfileSwitch();

        const state = useUIStore.getState();
        expect(state.lightboxFile).toBeNull();
        expect(state.lightboxOpenMode).toBe('default');
        expect(state.lightboxStartTime).toBeNull();
        expect(state.searchQuery).toBe('');
        expect(state.searchTarget).toBe('fileName');
        expect(state.searchExtraConditions).toEqual([]);
        expect(state.ratingQuickFilter).toBe('none');
        expect(state.currentSortBy).toBe('date');
        expect(state.currentSortOrder).toBe('desc');
        expect(state.currentGroupBy).toBe('none');
        expect(state.currentDisplayMode).toBe('standard');
        expect(state.currentActiveDisplayPresetId).toBe('standard');
        expect(state.currentThumbnailPresentation).toBe('modeDefault');
        expect(state.selectedFileTypes).toEqual(['video', 'image', 'archive', 'audio']);
        expect(state.settingsModalOpen).toBe(false);
        expect(state.settingsModalRequestedTab).toBeNull();
        expect(state.duplicateViewOpen).toBe(false);
        expect(state.mainView).toBe('grid');
        expect(state.hoveredPreviewId).toBeNull();
        expect(state.deleteDialogOpen).toBe(false);
        expect(state.deleteDialogFilePath).toBeNull();
        expect(state.deleteDialogFileId).toBeNull();
        expect(state.moveDialogOpen).toBe(false);
        expect(state.moveFileIds).toEqual([]);
        expect(state.moveCurrentFolderId).toBeNull();
        expect(state.previewContext).toBeNull();
    });

    it('stores rating quick filter separately from axis filters', () => {
        useUIStore.getState().setRatingQuickFilter('unrated');
        expect(useUIStore.getState().ratingQuickFilter).toBe('unrated');

        useUIStore.getState().setRatingQuickFilter('midOrAbove');
        expect(useUIStore.getState().ratingQuickFilter).toBe('midOrAbove');
    });
});
