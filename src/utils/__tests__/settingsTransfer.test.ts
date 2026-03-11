import { describe, expect, it } from 'vitest';
import { buildSettingsExportPayload, parseSettingsImportPayload } from '../settingsTransfer';

describe('settingsTransfer', () => {
    it('builds and parses settings payloads', () => {
        const payload = buildSettingsExportPayload(
            {
                thumbnailAction: 'scrub',
                archiveThumbnailAction: 'off',
                videoFlipbookSpeed: 'normal',
                archiveFlipbookSpeed: 'slow',
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
                scanExclusionRules: {
                    excludedExtensions: ['.tmp'],
                    excludedFolderNames: ['cache'],
                    skipHiddenFolders: true,
                },
                storageMaintenanceSettings: {
                    autoCleanupOrphanedThumbnailsOnStartup: true,
                    autoCleanupThresholdMb: 500,
                },
                showFileName: true,
                showDuration: true,
                showTags: true,
                showFileSize: true,
                activeDisplayPresetId: 'standard',
                displayMode: 'standard',
                layoutPreset: 'standard',
                thumbnailPresentation: 'modeDefault',
                externalApps: [],
                groupBy: 'none',
                tagPopoverTrigger: 'click',
                tagDisplayStyle: 'filled',
                fileCardTagOrderMode: 'balanced',
                playMode: {
                    jumpType: 'random',
                    jumpInterval: 2000,
                },
            },
            {
                fileTypeFilters: { video: true, image: true, archive: true, audio: true },
                previewFrameCount: 10,
                scanThrottleMs: 0,
                thumbnailResolution: 320,
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
            }
        );

        expect(parseSettingsImportPayload(JSON.stringify(payload))).toEqual(payload);
    });

    it('rejects unsupported payloads', () => {
        expect(() => parseSettingsImportPayload(JSON.stringify({ version: 2 }))).toThrow(
            '対応していない設定ファイルです'
        );
    });
});
