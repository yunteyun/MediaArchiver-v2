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
    resetDuplicates();
    bumpRefreshKey();

    void reloadRatings().catch((error) => {
        onReloadRatingsError?.(error);
    });
}
