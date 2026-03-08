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
});
