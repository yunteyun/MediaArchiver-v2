import { describe, expect, it, vi } from 'vitest';
import {
    createInitialProfileScopedSettings,
    loadAndApplyProfileScopedSettings,
    resetStateForProfileSwitch,
} from '../profileLifecycle';
import { DEFAULT_RATING_DISPLAY_THRESHOLDS } from '../../shared/ratingDisplayThresholds';

describe('createInitialProfileScopedSettings', () => {
    it('uses current settings when migration is accepted', () => {
        expect(createInitialProfileScopedSettings({
            previewFrameCount: 14,
            scanThrottleMs: 100,
            thumbnailResolution: 440,
            ratingDisplayThresholds: { mid: 2.5, high: 4.2 },
            sortBy: 'name',
            sortOrder: 'asc',
            groupBy: 'type',
            dateGroupingMode: 'week',
            defaultSearchTarget: 'folderName',
            activeDisplayPresetId: 'compact',
            displayMode: 'compact',
            thumbnailPresentation: 'contain',
            showFileName: false,
            showDuration: false,
            showTags: true,
            showFileSize: false,
            tagPopoverTrigger: 'hover',
            tagDisplayStyle: 'border',
            fileCardTagOrderMode: 'strict',
            defaultExternalApps: { mp4: 'player' },
            renameQuickTexts: ['test'],
            searchDestinations: [
                { id: 'filename-google', name: 'Google', type: 'filename', url: 'https://www.google.com/search?q={query}', icon: 'search', enabled: true, createdAt: 1 },
            ],
            savedFilterState: {
                searchQuery: 'hero',
                searchTarget: 'folderName',
                ratingQuickFilter: 'midOrAbove',
                selectedFileTypes: ['image'],
            },
        }, true)).toEqual({
            fileTypeFilters: {
                video: true,
                image: true,
                archive: true,
                audio: true,
            },
            previewFrameCount: 14,
            scanThrottleMs: 100,
            thumbnailResolution: 440,
            ratingDisplayThresholds: { mid: 2.5, high: 4.2 },
            listDisplayDefaults: {
                sortBy: 'name',
                sortOrder: 'asc',
                groupBy: 'type',
                dateGroupingMode: 'week',
                defaultSearchTarget: 'folderName',
                activeDisplayPresetId: 'compact',
                displayMode: 'compact',
                thumbnailPresentation: 'contain',
            },
            fileCardSettings: {
                showFileName: false,
                showDuration: false,
                showTags: true,
                showFileSize: false,
                tagPopoverTrigger: 'hover',
                tagDisplayStyle: 'border',
                fileCardTagOrderMode: 'strict',
            },
            defaultExternalApps: { mp4: 'player' },
            renameQuickTexts: ['test'],
            searchDestinations: [
                { id: 'filename-google', name: 'Google', type: 'filename', url: 'https://www.google.com/search?q={query}', icon: 'search', enabled: true, createdAt: 1 },
            ],
            savedFilterState: {
                searchQuery: 'hero',
                searchTarget: 'folderName',
                ratingQuickFilter: 'midOrAbove',
                selectedFileTypes: ['image'],
            },
        });
    });

    it('falls back to defaults when migration is skipped', () => {
        expect(createInitialProfileScopedSettings({
            previewFrameCount: 18,
            scanThrottleMs: 200,
            thumbnailResolution: 480,
            ratingDisplayThresholds: { mid: 1.5, high: 3.5 },
            sortBy: 'name',
            sortOrder: 'asc',
            groupBy: 'type',
            dateGroupingMode: 'week',
            defaultSearchTarget: 'folderName',
            activeDisplayPresetId: 'compact',
            displayMode: 'compact',
            thumbnailPresentation: 'contain',
            showFileName: false,
            showDuration: false,
            showTags: false,
            showFileSize: false,
            tagPopoverTrigger: 'hover',
            tagDisplayStyle: 'border',
            fileCardTagOrderMode: 'strict',
            defaultExternalApps: { mp4: 'player' },
            renameQuickTexts: ['test'],
            searchDestinations: [
                { id: 'filename-google', name: 'Google', type: 'filename', url: 'https://www.google.com/search?q={query}', icon: 'search', enabled: true, createdAt: 1 },
            ],
            savedFilterState: {
                searchQuery: 'hero',
                searchTarget: 'folderName',
                ratingQuickFilter: 'midOrAbove',
                selectedFileTypes: ['image'],
            },
        }, false)).toEqual({
            fileTypeFilters: {
                video: true,
                image: true,
                archive: true,
                audio: true,
            },
            previewFrameCount: 10,
            scanThrottleMs: 0,
            thumbnailResolution: 320,
            ratingDisplayThresholds: { ...DEFAULT_RATING_DISPLAY_THRESHOLDS },
            listDisplayDefaults: {
                sortBy: 'date',
                sortOrder: 'desc',
                groupBy: 'none',
                dateGroupingMode: 'auto',
                defaultSearchTarget: 'fileName',
                activeDisplayPresetId: 'standard',
                displayMode: 'standard',
                thumbnailPresentation: 'modeDefault',
            },
            fileCardSettings: {
                showFileName: true,
                showDuration: true,
                showTags: true,
                showFileSize: true,
                tagPopoverTrigger: 'click',
                tagDisplayStyle: 'filled',
                fileCardTagOrderMode: 'balanced',
            },
            defaultExternalApps: {},
            renameQuickTexts: [],
            searchDestinations: [
                { id: 'filename-google', name: 'Google', type: 'filename', url: 'https://www.google.com/search?q={query}', icon: 'search', enabled: true, createdAt: 1 },
                { id: 'filename-duckduckgo', name: 'DuckDuckGo', type: 'filename', url: 'https://duckduckgo.com/?q={query}', icon: 'globe', enabled: true, createdAt: 2 },
                { id: 'filename-bing', name: 'Bing', type: 'filename', url: 'https://www.bing.com/search?q={query}', icon: 'globe', enabled: true, createdAt: 3 },
                { id: 'image-google-lens', name: 'Google Lens', type: 'image', url: 'https://lens.google.com/', icon: 'camera', enabled: true, createdAt: 4 },
                { id: 'image-bing-visual-search', name: 'Bing Visual Search', type: 'image', url: 'https://www.bing.com/visualsearch', icon: 'image', enabled: true, createdAt: 5 },
                { id: 'image-yandex-images', name: 'Yandex Images', type: 'image', url: 'https://yandex.com/images/', icon: 'image', enabled: true, createdAt: 6 },
            ],
            savedFilterState: {
                searchQuery: '',
                searchTarget: 'fileName',
                ratingQuickFilter: 'none',
                selectedFileTypes: ['video', 'image', 'archive', 'audio'],
            },
        });
    });
});

describe('loadAndApplyProfileScopedSettings', () => {
    it('initializes missing profile settings with defaults and applies them', async () => {
        const defaultSettings = {
            fileTypeFilters: { video: true, image: true, archive: true, audio: true },
            previewFrameCount: 9,
            scanThrottleMs: 0,
            thumbnailResolution: 320,
            ratingDisplayThresholds: { ...DEFAULT_RATING_DISPLAY_THRESHOLDS },
            listDisplayDefaults: {
                sortBy: 'date' as const,
                sortOrder: 'desc' as const,
                groupBy: 'none' as const,
                dateGroupingMode: 'auto' as const,
                defaultSearchTarget: 'fileName' as const,
                activeDisplayPresetId: 'standard',
                displayMode: 'standard' as const,
                thumbnailPresentation: 'modeDefault' as const,
            },
            fileCardSettings: {
                showFileName: true,
                showDuration: true,
                showTags: true,
                showFileSize: true,
                tagPopoverTrigger: 'click' as const,
                tagDisplayStyle: 'filled' as const,
                fileCardTagOrderMode: 'balanced' as const,
            },
            defaultExternalApps: {},
            renameQuickTexts: [] as string[],
            searchDestinations: [],
            savedFilterState: {
                searchQuery: '',
                searchTarget: 'fileName' as const,
                ratingQuickFilter: 'none' as const,
                selectedFileTypes: ['video' as const, 'image' as const, 'archive' as const, 'audio' as const],
            },
        };
        const fetchSettings = vi.fn().mockResolvedValue({
            exists: false,
            settings: defaultSettings,
        });
        const replaceSettings = vi.fn().mockResolvedValue({
            exists: true,
            settings: defaultSettings,
        });
        const applySettings = vi.fn();
        const syncSettings = vi.fn().mockResolvedValue(undefined);

        let currentSequence = 0;
        await loadAndApplyProfileScopedSettings({
            activeProfileId: 'profile-1',
            profilesLength: 1,
            nextSequence: () => ++currentSequence,
            isCurrentSequence: (sequence) => sequence === currentSequence,
            getSettingsSnapshot: () => ({
                previewFrameCount: 14,
                scanThrottleMs: 100,
                thumbnailResolution: 440,
                ratingDisplayThresholds: { mid: 2.5, high: 4.2 },
                sortBy: 'name',
                sortOrder: 'asc',
                groupBy: 'type',
                dateGroupingMode: 'week',
                defaultSearchTarget: 'folderName',
                activeDisplayPresetId: 'compact',
                displayMode: 'compact',
                thumbnailPresentation: 'contain',
                showFileName: false,
                showDuration: false,
                showTags: true,
                showFileSize: false,
                tagPopoverTrigger: 'hover',
                tagDisplayStyle: 'border',
                fileCardTagOrderMode: 'strict',
                defaultExternalApps: { mp4: 'player' },
                renameQuickTexts: ['test'],
                searchDestinations: [
                    { id: 'filename-google', name: 'Google', type: 'filename', url: 'https://www.google.com/search?q={query}', icon: 'search' as const, enabled: true, createdAt: 1 },
                ],
                savedFilterState: {
                    searchQuery: 'hero',
                    searchTarget: 'folderName',
                    ratingQuickFilter: 'midOrAbove' as const,
                    selectedFileTypes: ['image' as const],
                },
            }),
            fetchSettings,
            replaceSettings,
            applySettings,
            syncSettings,
        });

        expect(replaceSettings).toHaveBeenCalledTimes(1);
        expect(applySettings).toHaveBeenCalledTimes(1);
        expect(syncSettings).toHaveBeenCalledTimes(1);
    });

    it('skips apply when a newer load sequence wins', async () => {
        const applySettings = vi.fn();
        const syncSettings = vi.fn().mockResolvedValue(undefined);
        let currentSequence = 0;

        await loadAndApplyProfileScopedSettings({
            activeProfileId: 'profile-1',
            profilesLength: 1,
            nextSequence: () => ++currentSequence,
            isCurrentSequence: () => false,
            getSettingsSnapshot: () => ({
                previewFrameCount: 10,
                scanThrottleMs: 0,
                thumbnailResolution: 320,
                ratingDisplayThresholds: { ...DEFAULT_RATING_DISPLAY_THRESHOLDS },
                sortBy: 'date',
                sortOrder: 'desc',
                groupBy: 'none',
                dateGroupingMode: 'auto',
                defaultSearchTarget: 'fileName',
                activeDisplayPresetId: 'standard',
                displayMode: 'standard',
                thumbnailPresentation: 'modeDefault',
                showFileName: true,
                showDuration: true,
                showTags: true,
                showFileSize: true,
                tagPopoverTrigger: 'click',
                tagDisplayStyle: 'filled',
                fileCardTagOrderMode: 'balanced',
                defaultExternalApps: {},
                renameQuickTexts: [],
                searchDestinations: [],
                savedFilterState: {
                    searchQuery: '',
                    searchTarget: 'fileName',
                    ratingQuickFilter: 'none',
                    selectedFileTypes: ['video', 'image', 'archive', 'audio'],
                },
            }),
            fetchSettings: async () => ({
                exists: true,
                settings: {
                    fileTypeFilters: { video: true, image: false, archive: true, audio: true },
                    previewFrameCount: 8,
                    scanThrottleMs: 50,
                    thumbnailResolution: 280,
                    ratingDisplayThresholds: { mid: 2.8, high: 4.4 },
                    listDisplayDefaults: {
                        sortBy: 'name' as const,
                        sortOrder: 'asc' as const,
                        groupBy: 'type' as const,
                        dateGroupingMode: 'week' as const,
                        defaultSearchTarget: 'folderName' as const,
                        activeDisplayPresetId: 'compact',
                        displayMode: 'compact' as const,
                        thumbnailPresentation: 'contain' as const,
                    },
                    fileCardSettings: {
                        showFileName: false,
                        showDuration: false,
                        showTags: true,
                        showFileSize: false,
                        tagPopoverTrigger: 'hover' as const,
                        tagDisplayStyle: 'border' as const,
                        fileCardTagOrderMode: 'strict' as const,
                    },
                    defaultExternalApps: { mp4: 'player' },
                    renameQuickTexts: ['test'],
                    searchDestinations: [
                        { id: 'filename-google', name: 'Google', type: 'filename' as const, url: 'https://www.google.com/search?q={query}', icon: 'search' as const, enabled: true, createdAt: 1 },
                    ],
                    savedFilterState: {
                        searchQuery: 'hero',
                        searchTarget: 'folderName' as const,
                        ratingQuickFilter: 'midOrAbove' as const,
                        selectedFileTypes: ['image' as const],
                    },
                },
            }),
            replaceSettings: vi.fn(),
            applySettings,
            syncSettings,
        });

        expect(applySettings).not.toHaveBeenCalled();
        expect(syncSettings).not.toHaveBeenCalled();
    });
});

describe('resetStateForProfileSwitch', () => {
    it('clears app state and reloads ratings', async () => {
        const setFiles = vi.fn();
        const setCurrentFolderId = vi.fn();
        const clearTagFilter = vi.fn();
        const clearRatingFilters = vi.fn();
        const resetTransientUiState = vi.fn();
        const resetDuplicates = vi.fn();
        const bumpRefreshKey = vi.fn();
        const reloadRatings = vi.fn().mockResolvedValue(undefined);

        resetStateForProfileSwitch({
            setFiles,
            setCurrentFolderId,
            clearTagFilter,
            clearRatingFilters,
            resetTransientUiState,
            resetDuplicates,
            bumpRefreshKey,
            reloadRatings,
        });

        expect(setFiles).toHaveBeenCalledWith([]);
        expect(setCurrentFolderId).toHaveBeenCalledWith(null);
        expect(resetTransientUiState).toHaveBeenCalledTimes(1);
        expect(clearTagFilter).toHaveBeenCalledTimes(1);
        expect(clearRatingFilters).toHaveBeenCalledTimes(1);
        expect(resetDuplicates).toHaveBeenCalledTimes(1);
        expect(bumpRefreshKey).toHaveBeenCalledTimes(1);

        await Promise.resolve();
        expect(reloadRatings).toHaveBeenCalledTimes(1);
    });
});
