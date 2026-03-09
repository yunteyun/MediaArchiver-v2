import { DEFAULT_PROFILE_FILE_TYPE_FILTERS, type ProfileScopedSettingsV1 } from '../stores/useSettingsStore';
import type { MediaFile } from '../types/file';

export const PROFILE_SETTINGS_MIGRATION_CONFIRM_MESSAGE =
    'プロファイル別スキャン設定の初回移行を行います。\n\n' +
    'OK: 現在のプレビューフレーム数を引き継ぐ\n' +
    'キャンセル: 既定値で開始する';

export interface ProfileSettingsStoreSnapshot {
    profileSettingsMigrationV1Done: boolean;
    previewFrameCount: number;
    scanThrottleMs: number;
    thumbnailResolution: number;
    sortBy: ProfileScopedSettingsV1['listDisplayDefaults']['sortBy'];
    sortOrder: ProfileScopedSettingsV1['listDisplayDefaults']['sortOrder'];
    groupBy: ProfileScopedSettingsV1['listDisplayDefaults']['groupBy'];
    defaultSearchTarget: ProfileScopedSettingsV1['listDisplayDefaults']['defaultSearchTarget'];
    activeDisplayPresetId: string;
    displayMode: ProfileScopedSettingsV1['listDisplayDefaults']['displayMode'];
    thumbnailPresentation: ProfileScopedSettingsV1['listDisplayDefaults']['thumbnailPresentation'];
    showFileName: boolean;
    showDuration: boolean;
    showTags: boolean;
    showFileSize: boolean;
    tagPopoverTrigger: ProfileScopedSettingsV1['fileCardSettings']['tagPopoverTrigger'];
    tagDisplayStyle: ProfileScopedSettingsV1['fileCardSettings']['tagDisplayStyle'];
    fileCardTagOrderMode: ProfileScopedSettingsV1['fileCardSettings']['fileCardTagOrderMode'];
}

export interface ProfileScopedSettingsResponse {
    settings: ProfileScopedSettingsV1;
    exists: boolean;
}

export interface LoadAndApplyProfileScopedSettingsParams {
    activeProfileId: string | null | undefined;
    profilesLength: number;
    nextSequence: () => number;
    isCurrentSequence: (sequence: number) => boolean;
    getSettingsSnapshot: () => ProfileSettingsStoreSnapshot;
    fetchSettings: () => Promise<ProfileScopedSettingsResponse>;
    replaceSettings: (settings: ProfileScopedSettingsV1) => Promise<ProfileScopedSettingsResponse>;
    markMigrationDone: (done: boolean) => void;
    confirmMigration: (message: string) => boolean;
    applySettings: (settings: ProfileScopedSettingsV1) => void;
    syncSettings: (settings: ProfileScopedSettingsV1) => Promise<void>;
    onError?: (error: unknown) => void;
}

export interface ProfileSwitchResetParams {
    setFiles: (files: MediaFile[]) => void;
    setCurrentFolderId: (folderId: string | null) => void;
    closeLightbox: () => void;
    clearTagFilter: () => void;
    clearRatingFilters: () => void;
    clearRatingQuickFilter: () => void;
    resetDuplicates: () => void;
    bumpRefreshKey: () => void;
    reloadRatings: () => Promise<void>;
    onReloadRatingsError?: (error: unknown) => void;
}

export function createInitialProfileScopedSettings(
    snapshot: ProfileSettingsStoreSnapshot,
    shouldMigrate: boolean
): ProfileScopedSettingsV1 {
    return {
        fileTypeFilters: { ...DEFAULT_PROFILE_FILE_TYPE_FILTERS },
        previewFrameCount: shouldMigrate ? snapshot.previewFrameCount : 10,
        scanThrottleMs: shouldMigrate ? snapshot.scanThrottleMs : 0,
        thumbnailResolution: shouldMigrate ? snapshot.thumbnailResolution : 320,
        listDisplayDefaults: shouldMigrate ? {
            sortBy: snapshot.sortBy,
            sortOrder: snapshot.sortOrder,
            groupBy: snapshot.groupBy,
            defaultSearchTarget: snapshot.defaultSearchTarget,
            activeDisplayPresetId: snapshot.activeDisplayPresetId,
            displayMode: snapshot.displayMode,
            thumbnailPresentation: snapshot.thumbnailPresentation,
        } : {
            sortBy: 'date',
            sortOrder: 'desc',
            groupBy: 'none',
            defaultSearchTarget: 'fileName',
            activeDisplayPresetId: 'standard',
            displayMode: 'standard',
            thumbnailPresentation: 'modeDefault',
        },
        fileCardSettings: shouldMigrate ? {
            showFileName: snapshot.showFileName,
            showDuration: snapshot.showDuration,
            showTags: snapshot.showTags,
            showFileSize: snapshot.showFileSize,
            tagPopoverTrigger: snapshot.tagPopoverTrigger,
            tagDisplayStyle: snapshot.tagDisplayStyle,
            fileCardTagOrderMode: snapshot.fileCardTagOrderMode,
        } : {
            showFileName: true,
            showDuration: true,
            showTags: true,
            showFileSize: true,
            tagPopoverTrigger: 'click',
            tagDisplayStyle: 'filled',
            fileCardTagOrderMode: 'balanced',
        },
    };
}

export async function loadAndApplyProfileScopedSettings(
    params: LoadAndApplyProfileScopedSettingsParams
): Promise<void> {
    const {
        activeProfileId,
        profilesLength,
        nextSequence,
        isCurrentSequence,
        getSettingsSnapshot,
        fetchSettings,
        replaceSettings,
        markMigrationDone,
        confirmMigration,
        applySettings,
        syncSettings,
        onError,
    } = params;

    if (!activeProfileId || profilesLength === 0) return;

    const sequence = nextSequence();
    const snapshot = getSettingsSnapshot();

    try {
        let response = await fetchSettings();

        if (!response.exists) {
            let initialSettings = response.settings;

            if (!snapshot.profileSettingsMigrationV1Done) {
                const shouldMigrate = confirmMigration(PROFILE_SETTINGS_MIGRATION_CONFIRM_MESSAGE);
                initialSettings = createInitialProfileScopedSettings(snapshot, shouldMigrate);
                markMigrationDone(true);
            }

            response = await replaceSettings(initialSettings);
        }

        if (!isCurrentSequence(sequence)) return;

        applySettings(response.settings);
        await syncSettings(response.settings);
    } catch (error) {
        onError?.(error);
    }
}

export function resetStateForProfileSwitch(params: ProfileSwitchResetParams): void {
    const {
        setFiles,
        setCurrentFolderId,
        closeLightbox,
        clearTagFilter,
        clearRatingFilters,
        clearRatingQuickFilter,
        resetDuplicates,
        bumpRefreshKey,
        reloadRatings,
        onReloadRatingsError,
    } = params;

    setFiles([]);
    setCurrentFolderId(null);
    closeLightbox();
    clearTagFilter();
    clearRatingFilters();
    clearRatingQuickFilter();
    resetDuplicates();
    bumpRefreshKey();

    void reloadRatings().catch((error) => {
        onReloadRatingsError?.(error);
    });
}
