import { describe, expect, it } from 'vitest';
import { buildSettingsExportPayload, parseSettingsImportPayload } from '../settingsTransfer';

describe('settingsTransfer', () => {
    it('builds and parses settings payloads', () => {
        const payload = buildSettingsExportPayload(
            {
                thumbnailAction: 'scrub',
                flipbookSpeed: 'normal',
                animatedImagePreviewMode: 'hover',
                rightPanelVideoMuted: true,
                rightPanelVideoPreviewMode: 'loop',
                rightPanelVideoJumpInterval: 2000,
                sortBy: 'date',
                sortOrder: 'desc',
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
                cardLayout: 'grid',
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
            },
            {
                fileTypeFilters: { video: true, image: true, archive: true, audio: true },
                previewFrameCount: 10,
                scanThrottleMs: 0,
                thumbnailResolution: 320,
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
