import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    DEFAULT_SCAN_EXCLUSION_RULES,
    DEFAULT_STORAGE_MAINTENANCE_SETTINGS,
    useSettingsStore,
} from '../useSettingsStore';

const originalCrypto = globalThis.crypto;
const originalLocalStorage = globalThis.localStorage;

function resetSettingsStore() {
    useSettingsStore.setState({
        thumbnailAction: 'scrub',
        flipbookSpeed: 'normal',
        animatedImagePreviewMode: 'hover',
        rightPanelVideoMuted: true,
        rightPanelVideoPreviewMode: 'loop',
        rightPanelVideoJumpInterval: 2000,
        sortBy: 'date',
        sortOrder: 'desc',
        defaultSearchTarget: 'fileName',
        videoVolume: 0.5,
        audioVolume: 0.5,
        lightboxOverlayOpacity: 90,
        performanceMode: false,
        previewFrameCount: 10,
        scanThrottleMs: 0,
        profileFileTypeFilters: { video: true, image: true, archive: true, audio: true },
        profileSettingsMigrationV1Done: false,
        scanExclusionRules: { ...DEFAULT_SCAN_EXCLUSION_RULES },
        storageMaintenanceSettings: { ...DEFAULT_STORAGE_MAINTENANCE_SETTINGS },
        thumbnailResolution: 320,
        showFileName: true,
        showDuration: true,
        showTags: true,
        showFileSize: true,
        activeDisplayPresetId: 'standard',
        displayMode: 'standard',
        layoutPreset: 'standard',
        thumbnailPresentation: 'modeDefault',
        externalApps: [],
        defaultExternalApps: {},
        searchDestinations: [],
        groupBy: 'none',
        tagPopoverTrigger: 'click',
        tagDisplayStyle: 'filled',
        fileCardTagOrderMode: 'balanced',
        playMode: {
            jumpType: 'random',
            jumpInterval: 2000,
        },
    });
}

describe('useSettingsStore', () => {
    beforeEach(() => {
        resetSettingsStore();
        const localStorageStub = {
            getItem: vi.fn().mockReturnValue(null),
            setItem: vi.fn(),
            removeItem: vi.fn(),
        };
        vi.stubGlobal('localStorage', localStorageStub);
        vi.stubGlobal('crypto', {
            randomUUID: vi.fn()
                .mockReturnValueOnce('uuid-1')
                .mockReturnValueOnce('uuid-2')
                .mockReturnValueOnce('uuid-3')
                .mockReturnValueOnce('uuid-4'),
        });
        vi.spyOn(Date, 'now').mockReturnValue(1000);
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
        if (originalCrypto) {
            vi.stubGlobal('crypto', originalCrypto);
        } else {
            // @ts-expect-error cleanup for test env
            delete globalThis.crypto;
        }
        if (originalLocalStorage) {
            vi.stubGlobal('localStorage', originalLocalStorage);
        } else {
            // @ts-expect-error cleanup for test env
            delete globalThis.localStorage;
        }
    });

    it('normalizes profile scoped settings to supported values', () => {
        useSettingsStore.getState().applyProfileScopedSettings({
            fileTypeFilters: { video: false, image: true, archive: false, audio: true },
            previewFrameCount: 99,
            scanThrottleMs: 999,
            thumbnailResolution: 999,
            listDisplayDefaults: {
                sortBy: 'overallRating',
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
            defaultExternalApps: {
                mp4: 'player',
            },
            searchDestinations: [
                {
                    id: 'filename-google',
                    type: 'filename',
                    name: 'Google',
                    url: 'https://www.google.com/search?q={query}',
                    icon: 'search',
                    enabled: true,
                    createdAt: 1,
                },
            ],
        });

        const state = useSettingsStore.getState();
        expect(state.profileFileTypeFilters).toEqual({
            video: false,
            image: true,
            archive: false,
            audio: true,
        });
        expect(state.previewFrameCount).toBe(30);
        expect(state.scanThrottleMs).toBe(0);
        expect(state.thumbnailResolution).toBe(320);
        expect(state.sortBy).toBe('overallRating');
        expect(state.sortOrder).toBe('asc');
        expect(state.groupBy).toBe('type');
        expect(state.defaultSearchTarget).toBe('folderName');
        expect(state.activeDisplayPresetId).toBe('compact');
        expect(state.displayMode).toBe('compact');
        expect(state.thumbnailPresentation).toBe('contain');
        expect(state.showFileName).toBe(false);
        expect(state.showDuration).toBe(false);
        expect(state.showFileSize).toBe(false);
        expect(state.tagPopoverTrigger).toBe('hover');
        expect(state.tagDisplayStyle).toBe('border');
        expect(state.fileCardTagOrderMode).toBe('strict');
        expect(state.defaultExternalApps).toEqual({ mp4: 'player' });
        expect(state.searchDestinations).toHaveLength(1);
    });

    it('keeps display mode and layout axes in sync', () => {
        useSettingsStore.getState().setDisplayMode('whiteBrowser');
        expect(useSettingsStore.getState().activeDisplayPresetId).toBe('whiteBrowser');
        expect(useSettingsStore.getState().layoutPreset).toBe('detailed');
        expect(useSettingsStore.getState().thumbnailPresentation).toBe('square');

        useSettingsStore.getState().setLayoutPreset('mangaDetailed');
        expect(useSettingsStore.getState().activeDisplayPresetId).toBe('mangaDetailed');
        expect(useSettingsStore.getState().displayMode).toBe('mangaDetailed');
    });

    it('normalizes scan exclusion rules', () => {
        useSettingsStore.getState().setScanExclusionRules({
            excludedExtensions: [' TMP ', '.part', 'jpg', '.PART'],
            excludedFolderNames: [' Cache ', 'temp', 'CACHE'],
            skipHiddenFolders: false,
        });

        expect(useSettingsStore.getState().scanExclusionRules).toEqual({
            excludedExtensions: ['.tmp', '.part', '.jpg'],
            excludedFolderNames: ['cache', 'temp'],
            skipHiddenFolders: false,
        });
    });

    it('normalizes storage maintenance settings', () => {
        useSettingsStore.getState().setStorageMaintenanceSettings({
            autoCleanupOrphanedThumbnailsOnStartup: true,
            autoCleanupThresholdMb: -10,
        });

        expect(useSettingsStore.getState().storageMaintenanceSettings).toEqual({
            autoCleanupOrphanedThumbnailsOnStartup: true,
            autoCleanupThresholdMb: 500,
        });
    });

    it('toggles right panel video muted state', () => {
        useSettingsStore.getState().setRightPanelVideoMuted(false);
        expect(useSettingsStore.getState().rightPanelVideoMuted).toBe(false);

        useSettingsStore.getState().setRightPanelVideoMuted(true);
        expect(useSettingsStore.getState().rightPanelVideoMuted).toBe(true);
    });

    it('normalizes search destinations and trims values', () => {
        useSettingsStore.getState().replaceSearchDestinations([
            {
                type: 'filename',
                name: '  Google  ',
                url: '  https://www.google.com/search?q={query}  ',
                icon: 'search',
                enabled: true,
            },
            {
                type: 'image',
                name: ' Lens ',
                url: ' https://lens.google.com/ ',
                icon: undefined,
                enabled: false,
            },
        ]);

        const destinations = useSettingsStore.getState().searchDestinations;
        expect(destinations).toHaveLength(2);
        expect(destinations[0]).toMatchObject({
            id: 'uuid-1',
            name: 'Google',
            url: 'https://www.google.com/search?q={query}',
            icon: 'search',
            enabled: true,
        });
        expect(destinations[1]).toMatchObject({
            id: 'uuid-2',
            name: 'Lens',
            url: 'https://lens.google.com/',
            icon: 'image',
            enabled: false,
        });
    });

    it('removes default app mappings when deleting an external app', () => {
        useSettingsStore.setState({
            externalApps: [
                { id: 'app-1', name: 'Viewer', path: 'C:\\Viewer.exe', extensions: ['png'], createdAt: 1 },
                { id: 'app-2', name: 'Player', path: 'C:\\Player.exe', extensions: ['mp4'], createdAt: 2 },
            ],
            defaultExternalApps: {
                png: 'app-1',
                jpg: 'app-1',
                mp4: 'app-2',
            },
        });

        useSettingsStore.getState().deleteExternalApp('app-1');

        expect(useSettingsStore.getState().externalApps.map((app) => app.id)).toEqual(['app-2']);
        expect(useSettingsStore.getState().defaultExternalApps).toEqual({ mp4: 'app-2' });
    });
});
