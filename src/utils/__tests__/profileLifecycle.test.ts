import { describe, expect, it, vi } from 'vitest';
import {
    PROFILE_SETTINGS_MIGRATION_CONFIRM_MESSAGE,
    createInitialProfileScopedSettings,
    loadAndApplyProfileScopedSettings,
    resetStateForProfileSwitch,
} from '../profileLifecycle';
import { DEFAULT_RATING_DISPLAY_THRESHOLDS } from '../../shared/ratingDisplayThresholds';

describe('createInitialProfileScopedSettings', () => {
    it('uses current settings when migration is accepted', () => {
        expect(createInitialProfileScopedSettings({
            profileSettingsMigrationV1Done: false,
            previewFrameCount: 14,
            scanThrottleMs: 100,
            thumbnailResolution: 440,
            ratingDisplayThresholds: { mid: 2.5, high: 4.2 },
            sortBy: 'name',
            sortOrder: 'asc',
            groupBy: 'type',
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
            searchDestinations: [
                { id: 'filename-google', name: 'Google', type: 'filename', url: 'https://www.google.com/search?q={query}', icon: 'search', enabled: true, createdAt: 1 },
            ],
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
            searchDestinations: [
                { id: 'filename-google', name: 'Google', type: 'filename', url: 'https://www.google.com/search?q={query}', icon: 'search', enabled: true, createdAt: 1 },
            ],
        });
    });

    it('falls back to defaults when migration is skipped', () => {
        expect(createInitialProfileScopedSettings({
            profileSettingsMigrationV1Done: false,
            previewFrameCount: 18,
            scanThrottleMs: 200,
            thumbnailResolution: 480,
            ratingDisplayThresholds: { mid: 1.5, high: 3.5 },
            sortBy: 'name',
            sortOrder: 'asc',
            groupBy: 'type',
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
            searchDestinations: [
                { id: 'filename-google', name: 'Google', type: 'filename', url: 'https://www.google.com/search?q={query}', icon: 'search', enabled: true, createdAt: 1 },
            ],
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
            searchDestinations: [
                { id: 'filename-google', name: 'Google', type: 'filename', url: 'https://www.google.com/search?q={query}', icon: 'search', enabled: true, createdAt: 1 },
                { id: 'filename-duckduckgo', name: 'DuckDuckGo', type: 'filename', url: 'https://duckduckgo.com/?q={query}', icon: 'globe', enabled: true, createdAt: 2 },
                { id: 'filename-bing', name: 'Bing', type: 'filename', url: 'https://www.bing.com/search?q={query}', icon: 'globe', enabled: true, createdAt: 3 },
                { id: 'image-google-lens', name: 'Google Lens', type: 'image', url: 'https://lens.google.com/', icon: 'camera', enabled: true, createdAt: 4 },
                { id: 'image-bing-visual-search', name: 'Bing Visual Search', type: 'image', url: 'https://www.bing.com/visualsearch', icon: 'image', enabled: true, createdAt: 5 },
                { id: 'image-yandex-images', name: 'Yandex Images', type: 'image', url: 'https://yandex.com/images/', icon: 'image', enabled: true, createdAt: 6 },
            ],
        });
    });
});

describe('loadAndApplyProfileScopedSettings', () => {
    it('migrates missing profile settings and applies them', async () => {
        const fetchSettings = vi.fn().mockResolvedValue({
            exists: false,
            settings: {
                fileTypeFilters: { video: true, image: true, archive: true, audio: true },
                previewFrameCount: 9,
                scanThrottleMs: 0,
                thumbnailResolution: 320,
                ratingDisplayThresholds: { ...DEFAULT_RATING_DISPLAY_THRESHOLDS },
                listDisplayDefaults: {
                    sortBy: 'date',
                    sortOrder: 'desc',
                    groupBy: 'none',
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
                searchDestinations: [],
            },
        });
        const replaceSettings = vi.fn().mockResolvedValue({
            exists: true,
            settings: {
                fileTypeFilters: { video: true, image: true, archive: true, audio: true },
                previewFrameCount: 14,
                scanThrottleMs: 100,
                thumbnailResolution: 440,
                ratingDisplayThresholds: { mid: 2.5, high: 4.2 },
                listDisplayDefaults: {
                    sortBy: 'name',
                    sortOrder: 'asc',
                    groupBy: 'type',
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
                searchDestinations: [
                    { id: 'filename-google', name: 'Google', type: 'filename', url: 'https://www.google.com/search?q={query}', icon: 'search', enabled: true, createdAt: 1 },
                ],
            },
        });
        const applySettings = vi.fn();
        const syncSettings = vi.fn().mockResolvedValue(undefined);
        const confirmMigration = vi.fn().mockReturnValue(true);
        const markMigrationDone = vi.fn();

        let currentSequence = 0;
        await loadAndApplyProfileScopedSettings({
            activeProfileId: 'profile-1',
            profilesLength: 1,
            nextSequence: () => ++currentSequence,
            isCurrentSequence: (sequence) => sequence === currentSequence,
            getSettingsSnapshot: () => ({
                profileSettingsMigrationV1Done: false,
                previewFrameCount: 14,
                scanThrottleMs: 100,
                thumbnailResolution: 440,
                ratingDisplayThresholds: { mid: 2.5, high: 4.2 },
                sortBy: 'name',
                sortOrder: 'asc',
                groupBy: 'type',
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
                searchDestinations: [
                    { id: 'filename-google', name: 'Google', type: 'filename', url: 'https://www.google.com/search?q={query}', icon: 'search', enabled: true, createdAt: 1 },
                ],
            }),
            fetchSettings,
            replaceSettings,
            markMigrationDone,
            confirmMigration,
            applySettings,
            syncSettings,
        });

        expect(confirmMigration).toHaveBeenCalledWith(PROFILE_SETTINGS_MIGRATION_CONFIRM_MESSAGE);
        expect(replaceSettings).toHaveBeenCalledWith({
            fileTypeFilters: { video: true, image: true, archive: true, audio: true },
            previewFrameCount: 14,
            scanThrottleMs: 100,
            thumbnailResolution: 440,
            ratingDisplayThresholds: { mid: 2.5, high: 4.2 },
            listDisplayDefaults: {
                sortBy: 'name',
                sortOrder: 'asc',
                groupBy: 'type',
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
            searchDestinations: [
                { id: 'filename-google', name: 'Google', type: 'filename', url: 'https://www.google.com/search?q={query}', icon: 'search', enabled: true, createdAt: 1 },
            ],
        });
        expect(markMigrationDone).toHaveBeenCalledWith(true);
        expect(applySettings).toHaveBeenCalledWith({
            fileTypeFilters: { video: true, image: true, archive: true, audio: true },
            previewFrameCount: 14,
            scanThrottleMs: 100,
            thumbnailResolution: 440,
            ratingDisplayThresholds: { mid: 2.5, high: 4.2 },
            listDisplayDefaults: {
                sortBy: 'name',
                sortOrder: 'asc',
                groupBy: 'type',
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
            searchDestinations: [
                { id: 'filename-google', name: 'Google', type: 'filename', url: 'https://www.google.com/search?q={query}', icon: 'search', enabled: true, createdAt: 1 },
            ],
        });
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
                profileSettingsMigrationV1Done: true,
                previewFrameCount: 10,
                scanThrottleMs: 0,
                thumbnailResolution: 320,
                ratingDisplayThresholds: { ...DEFAULT_RATING_DISPLAY_THRESHOLDS },
                sortBy: 'date',
                sortOrder: 'desc',
                groupBy: 'none',
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
                searchDestinations: [],
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
                        sortBy: 'name',
                        sortOrder: 'asc',
                        groupBy: 'type',
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
                    searchDestinations: [
                        { id: 'filename-google', name: 'Google', type: 'filename', url: 'https://www.google.com/search?q={query}', icon: 'search', enabled: true, createdAt: 1 },
                    ],
                },
            }),
            replaceSettings: vi.fn(),
            markMigrationDone: vi.fn(),
            confirmMigration: vi.fn(),
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
