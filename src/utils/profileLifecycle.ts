import { DEFAULT_PROFILE_FILE_TYPE_FILTERS, type ProfileScopedSettingsV1 } from '../stores/useSettingsStore';
import type { MediaFile } from '../types/file';
import { DEFAULT_RATING_DISPLAY_THRESHOLDS } from '../shared/ratingDisplayThresholds';

export const PROFILE_SETTINGS_MIGRATION_CONFIRM_MESSAGE =
    'プロファイル別スキャン設定の初回移行を行います。\n\n' +
    'OK: 現在のプレビューフレーム数を引き継ぐ\n' +
    'キャンセル: 既定値で開始する';

export interface ProfileSettingsStoreSnapshot {
    profileSettingsMigrationV1Done: boolean;
    previewFrameCount: number;
    scanThrottleMs: number;
    thumbnailResolution: number;
    ratingDisplayThresholds: ProfileScopedSettingsV1['ratingDisplayThresholds'];
    sortBy: ProfileScopedSettingsV1['listDisplayDefaults']['sortBy'];
    sortOrder: ProfileScopedSettingsV1['listDisplayDefaults']['sortOrder'];
    groupBy: ProfileScopedSettingsV1['listDisplayDefaults']['groupBy'];
    dateGroupingMode: ProfileScopedSettingsV1['listDisplayDefaults']['dateGroupingMode'];
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
    defaultExternalApps: Record<string, string>;
    searchDestinations: ProfileScopedSettingsV1['searchDestinations'];
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
    clearTagFilter: () => void;
    clearRatingFilters: () => void;
    resetTransientUiState: () => void;
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
        ratingDisplayThresholds: shouldMigrate
            ? { ...snapshot.ratingDisplayThresholds }
            : { ...DEFAULT_RATING_DISPLAY_THRESHOLDS },
        listDisplayDefaults: shouldMigrate ? {
            sortBy: snapshot.sortBy,
            sortOrder: snapshot.sortOrder,
            groupBy: snapshot.groupBy,
            dateGroupingMode: snapshot.dateGroupingMode,
            defaultSearchTarget: snapshot.defaultSearchTarget,
            activeDisplayPresetId: snapshot.activeDisplayPresetId,
            displayMode: snapshot.displayMode,
            thumbnailPresentation: snapshot.thumbnailPresentation,
        } : {
            sortBy: 'date',
            sortOrder: 'desc',
            groupBy: 'none',
            dateGroupingMode: 'auto',
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
        defaultExternalApps: shouldMigrate ? { ...snapshot.defaultExternalApps } : {},
        searchDestinations: shouldMigrate
            ? snapshot.searchDestinations.map((destination) => ({ ...destination }))
            : [
                { id: 'filename-google', name: 'Google', type: 'filename', url: 'https://www.google.com/search?q={query}', icon: 'search', enabled: true, createdAt: 1 },
                { id: 'filename-duckduckgo', name: 'DuckDuckGo', type: 'filename', url: 'https://duckduckgo.com/?q={query}', icon: 'globe', enabled: true, createdAt: 2 },
                { id: 'filename-bing', name: 'Bing', type: 'filename', url: 'https://www.bing.com/search?q={query}', icon: 'globe', enabled: true, createdAt: 3 },
                { id: 'image-google-lens', name: 'Google Lens', type: 'image', url: 'https://lens.google.com/', icon: 'camera', enabled: true, createdAt: 4 },
                { id: 'image-bing-visual-search', name: 'Bing Visual Search', type: 'image', url: 'https://www.bing.com/visualsearch', icon: 'image', enabled: true, createdAt: 5 },
                { id: 'image-yandex-images', name: 'Yandex Images', type: 'image', url: 'https://yandex.com/images/', icon: 'image', enabled: true, createdAt: 6 },
            ],
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
        clearTagFilter,
        clearRatingFilters,
        resetTransientUiState,
        resetDuplicates,
        bumpRefreshKey,
        reloadRatings,
        onReloadRatingsError,
    } = params;

    setFiles([]);
    setCurrentFolderId(null);
    resetTransientUiState();
    clearTagFilter();
    clearRatingFilters();
    resetDuplicates();
    bumpRefreshKey();

    void reloadRatings().catch((error) => {
        onReloadRatingsError?.(error);
    });
}
