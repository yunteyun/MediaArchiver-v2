import { describe, expect, it, vi } from 'vitest';
import {
    PROFILE_SETTINGS_MIGRATION_CONFIRM_MESSAGE,
    createInitialProfileScopedSettings,
    loadAndApplyProfileScopedSettings,
    resetStateForProfileSwitch,
} from '../profileLifecycle';

describe('createInitialProfileScopedSettings', () => {
    it('uses current settings when migration is accepted', () => {
        expect(createInitialProfileScopedSettings({
            profileSettingsMigrationV1Done: false,
            previewFrameCount: 14,
            scanThrottleMs: 100,
            thumbnailResolution: 440,
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
        });
    });

    it('falls back to defaults when migration is skipped', () => {
        expect(createInitialProfileScopedSettings({
            profileSettingsMigrationV1Done: false,
            previewFrameCount: 18,
            scanThrottleMs: 200,
            thumbnailResolution: 480,
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
            },
        });
        const replaceSettings = vi.fn().mockResolvedValue({
            exists: true,
            settings: {
                fileTypeFilters: { video: true, image: true, archive: true, audio: true },
                previewFrameCount: 14,
                scanThrottleMs: 100,
                thumbnailResolution: 440,
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
        });
        expect(markMigrationDone).toHaveBeenCalledWith(true);
        expect(applySettings).toHaveBeenCalledWith({
            fileTypeFilters: { video: true, image: true, archive: true, audio: true },
            previewFrameCount: 14,
            scanThrottleMs: 100,
            thumbnailResolution: 440,
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
            }),
            fetchSettings: async () => ({
                exists: true,
                settings: {
                    fileTypeFilters: { video: true, image: false, archive: true, audio: true },
                    previewFrameCount: 8,
                    scanThrottleMs: 50,
                    thumbnailResolution: 280,
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
        const closeLightbox = vi.fn();
        const clearTagFilter = vi.fn();
        const clearRatingFilters = vi.fn();
        const resetDuplicates = vi.fn();
        const bumpRefreshKey = vi.fn();
        const reloadRatings = vi.fn().mockResolvedValue(undefined);

        resetStateForProfileSwitch({
            setFiles,
            setCurrentFolderId,
            closeLightbox,
            clearTagFilter,
            clearRatingFilters,
            resetDuplicates,
            bumpRefreshKey,
            reloadRatings,
        });

        expect(setFiles).toHaveBeenCalledWith([]);
        expect(setCurrentFolderId).toHaveBeenCalledWith(null);
        expect(closeLightbox).toHaveBeenCalledTimes(1);
        expect(clearTagFilter).toHaveBeenCalledTimes(1);
        expect(clearRatingFilters).toHaveBeenCalledTimes(1);
        expect(resetDuplicates).toHaveBeenCalledTimes(1);
        expect(bumpRefreshKey).toHaveBeenCalledTimes(1);

        await Promise.resolve();
        expect(reloadRatings).toHaveBeenCalledTimes(1);
    });
});
