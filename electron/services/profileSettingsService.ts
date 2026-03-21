import { dbManager } from './databaseManager';
import { logger } from './logger';
import {
    DEFAULT_RATING_DISPLAY_THRESHOLDS,
    normalizeRatingDisplayThresholds,
    type RatingDisplayThresholds,
} from '../../src/shared/ratingDisplayThresholds';
import {
    normalizeRatingQuickFilter,
    type RatingQuickFilter,
} from '../../src/shared/ratingQuickFilter';

const log = logger.scope('ProfileSettings');

const PROFILE_SETTINGS_KEY = 'profile_scoped_settings_v1';

export type FileTypeCategory = 'video' | 'image' | 'archive' | 'audio';

export interface FileTypeCategoryFilters {
    video: boolean;
    image: boolean;
    archive: boolean;
    audio: boolean;
}

export interface SavedFilterState {
    searchQuery: string;
    searchTarget: 'fileName' | 'folderName';
    ratingQuickFilter: RatingQuickFilter;
    selectedFileTypes: FileTypeCategory[];
}

export interface ProfileScopedSettingsV1 {
    fileTypeFilters: FileTypeCategoryFilters;
    previewFrameCount: number;
    scanThrottleMs: number;
    thumbnailResolution: number;
    ratingDisplayThresholds: RatingDisplayThresholds;
    listDisplayDefaults: {
        sortBy: 'name' | 'date' | 'size' | 'type' | 'accessCount' | 'lastAccessed' | 'overallRating';
        sortOrder: 'asc' | 'desc';
        groupBy: 'none' | 'date' | 'size' | 'type';
        dateGroupingMode: 'auto' | 'week';
        defaultSearchTarget: 'fileName' | 'folderName';
        activeDisplayPresetId: string;
        displayMode: 'standard' | 'standardLarge' | 'manga' | 'video' | 'whiteBrowser' | 'mangaDetailed' | 'compact';
        thumbnailPresentation: 'modeDefault' | 'contain' | 'cover' | 'square';
    };
    fileCardSettings: {
        showFileName: boolean;
        showDuration: boolean;
        showTags: boolean;
        showFileSize: boolean;
        tagPopoverTrigger: 'click' | 'hover';
        tagDisplayStyle: 'filled' | 'border';
        fileCardTagOrderMode: 'balanced' | 'strict';
    };
    defaultExternalApps: Record<string, string>;
    searchDestinations: Array<{
        id: string;
        name: string;
        type: 'filename' | 'image';
        url: string;
        icon: 'search' | 'globe' | 'image' | 'camera' | 'book' | 'sparkles' | 'link';
        enabled: boolean;
        createdAt: number;
    }>;
    savedFilterState?: SavedFilterState;
}

export interface ProfileScopedSettingsResponse {
    settings: ProfileScopedSettingsV1;
    exists: boolean;
}

const DEFAULT_FILE_TYPE_FILTERS: FileTypeCategoryFilters = {
    video: true,
    image: true,
    archive: true,
    audio: true,
};

const DEFAULT_SAVED_FILTER_STATE: SavedFilterState = {
    searchQuery: '',
    searchTarget: 'fileName',
    ratingQuickFilter: 'none',
    selectedFileTypes: ['video', 'image', 'archive', 'audio'],
};

export const DEFAULT_PROFILE_SCOPED_SETTINGS_V1: ProfileScopedSettingsV1 = {
    fileTypeFilters: DEFAULT_FILE_TYPE_FILTERS,
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
    searchDestinations: [
        { id: 'filename-google', name: 'Google', type: 'filename', url: 'https://www.google.com/search?q={query}', icon: 'search', enabled: true, createdAt: 1 },
        { id: 'filename-duckduckgo', name: 'DuckDuckGo', type: 'filename', url: 'https://duckduckgo.com/?q={query}', icon: 'globe', enabled: true, createdAt: 2 },
        { id: 'filename-bing', name: 'Bing', type: 'filename', url: 'https://www.bing.com/search?q={query}', icon: 'globe', enabled: true, createdAt: 3 },
        { id: 'image-google-lens', name: 'Google Lens', type: 'image', url: 'https://lens.google.com/', icon: 'camera', enabled: true, createdAt: 4 },
        { id: 'image-bing-visual-search', name: 'Bing Visual Search', type: 'image', url: 'https://www.bing.com/visualsearch', icon: 'image', enabled: true, createdAt: 5 },
        { id: 'image-yandex-images', name: 'Yandex Images', type: 'image', url: 'https://yandex.com/images/', icon: 'image', enabled: true, createdAt: 6 },
    ],
    savedFilterState: { ...DEFAULT_SAVED_FILTER_STATE },
};

function ensureProfileSettingsTable(): void {
    const db = dbManager.getDb();
    db.exec(`
        CREATE TABLE IF NOT EXISTS profile_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        )
    `);
}

function clampPreviewFrameCount(count: unknown): number {
    const n = Number(count);
    if (!Number.isFinite(n)) return DEFAULT_PROFILE_SCOPED_SETTINGS_V1.previewFrameCount;
    return Math.max(0, Math.min(30, Math.round(n)));
}

function clampScanThrottleMs(ms: unknown): number {
    const n = Number(ms);
    const allowed = new Set([0, 50, 100, 200]);
    if (!Number.isFinite(n)) return DEFAULT_PROFILE_SCOPED_SETTINGS_V1.scanThrottleMs;
    const rounded = Math.round(n);
    return allowed.has(rounded) ? rounded : DEFAULT_PROFILE_SCOPED_SETTINGS_V1.scanThrottleMs;
}

function clampThumbnailResolution(resolution: unknown): number {
    const n = Number(resolution);
    const allowed = new Set([160, 200, 240, 280, 320, 360, 400, 440, 480]);
    if (!Number.isFinite(n)) return DEFAULT_PROFILE_SCOPED_SETTINGS_V1.thumbnailResolution;
    const rounded = Math.round(n);
    return allowed.has(rounded) ? rounded : DEFAULT_PROFILE_SCOPED_SETTINGS_V1.thumbnailResolution;
}

function normalizeFileTypeFilters(input: unknown): FileTypeCategoryFilters {
    const candidate = (input && typeof input === 'object') ? (input as Partial<FileTypeCategoryFilters>) : {};
    return {
        video: candidate.video ?? DEFAULT_FILE_TYPE_FILTERS.video,
        image: candidate.image ?? DEFAULT_FILE_TYPE_FILTERS.image,
        archive: candidate.archive ?? DEFAULT_FILE_TYPE_FILTERS.archive,
        audio: candidate.audio ?? DEFAULT_FILE_TYPE_FILTERS.audio,
    };
}

function normalizeSavedFilterState(input: unknown): SavedFilterState {
    const candidate = (input && typeof input === 'object') ? (input as Partial<SavedFilterState>) : {};
    const selectedFileTypes = Array.isArray(candidate.selectedFileTypes)
        ? Array.from(new Set(candidate.selectedFileTypes.filter((type): type is FileTypeCategory => (
            type === 'video' || type === 'image' || type === 'archive' || type === 'audio'
        ))))
        : [];

    return {
        searchQuery: typeof candidate.searchQuery === 'string' ? candidate.searchQuery : DEFAULT_SAVED_FILTER_STATE.searchQuery,
        searchTarget: candidate.searchTarget === 'folderName' ? 'folderName' : DEFAULT_SAVED_FILTER_STATE.searchTarget,
        ratingQuickFilter: normalizeRatingQuickFilter(candidate.ratingQuickFilter),
        selectedFileTypes: selectedFileTypes.length > 0
            ? selectedFileTypes
            : [...DEFAULT_SAVED_FILTER_STATE.selectedFileTypes],
    };
}

function normalizeProfileScopedSettingsV1(input: unknown): ProfileScopedSettingsV1 {
    const candidate = (input && typeof input === 'object') ? (input as Partial<ProfileScopedSettingsV1>) : {};
    const listDisplayDefaults: Partial<ProfileScopedSettingsV1['listDisplayDefaults']> = candidate.listDisplayDefaults && typeof candidate.listDisplayDefaults === 'object'
        ? candidate.listDisplayDefaults as Partial<ProfileScopedSettingsV1['listDisplayDefaults']>
        : {};
    const fileCardSettings: Partial<ProfileScopedSettingsV1['fileCardSettings']> = candidate.fileCardSettings && typeof candidate.fileCardSettings === 'object'
        ? candidate.fileCardSettings as Partial<ProfileScopedSettingsV1['fileCardSettings']>
        : {};
    const rawDefaultExternalApps = candidate.defaultExternalApps && typeof candidate.defaultExternalApps === 'object'
        ? candidate.defaultExternalApps
        : {};
    const rawSearchDestinations = Array.isArray(candidate.searchDestinations)
        ? candidate.searchDestinations
        : DEFAULT_PROFILE_SCOPED_SETTINGS_V1.searchDestinations;

    return {
        fileTypeFilters: normalizeFileTypeFilters(candidate.fileTypeFilters),
        previewFrameCount: clampPreviewFrameCount(candidate.previewFrameCount),
        scanThrottleMs: clampScanThrottleMs(candidate.scanThrottleMs),
        thumbnailResolution: clampThumbnailResolution(candidate.thumbnailResolution),
        ratingDisplayThresholds: normalizeRatingDisplayThresholds(candidate.ratingDisplayThresholds),
        listDisplayDefaults: {
            sortBy: ['name', 'date', 'size', 'type', 'accessCount', 'lastAccessed', 'overallRating'].includes(String(listDisplayDefaults.sortBy))
                ? listDisplayDefaults.sortBy as ProfileScopedSettingsV1['listDisplayDefaults']['sortBy']
                : DEFAULT_PROFILE_SCOPED_SETTINGS_V1.listDisplayDefaults.sortBy,
            sortOrder: listDisplayDefaults.sortOrder === 'asc' ? 'asc' : DEFAULT_PROFILE_SCOPED_SETTINGS_V1.listDisplayDefaults.sortOrder,
            groupBy: ['none', 'date', 'size', 'type'].includes(String(listDisplayDefaults.groupBy))
                ? listDisplayDefaults.groupBy as ProfileScopedSettingsV1['listDisplayDefaults']['groupBy']
                : DEFAULT_PROFILE_SCOPED_SETTINGS_V1.listDisplayDefaults.groupBy,
            dateGroupingMode: listDisplayDefaults.dateGroupingMode === 'week' ? 'week' : DEFAULT_PROFILE_SCOPED_SETTINGS_V1.listDisplayDefaults.dateGroupingMode,
            defaultSearchTarget: listDisplayDefaults.defaultSearchTarget === 'folderName' ? 'folderName' : DEFAULT_PROFILE_SCOPED_SETTINGS_V1.listDisplayDefaults.defaultSearchTarget,
            activeDisplayPresetId: typeof listDisplayDefaults.activeDisplayPresetId === 'string' && listDisplayDefaults.activeDisplayPresetId.trim().length > 0
                ? listDisplayDefaults.activeDisplayPresetId.trim()
                : DEFAULT_PROFILE_SCOPED_SETTINGS_V1.listDisplayDefaults.activeDisplayPresetId,
            displayMode: ['standard', 'standardLarge', 'manga', 'video', 'whiteBrowser', 'mangaDetailed', 'compact'].includes(String(listDisplayDefaults.displayMode))
                ? listDisplayDefaults.displayMode as ProfileScopedSettingsV1['listDisplayDefaults']['displayMode']
                : DEFAULT_PROFILE_SCOPED_SETTINGS_V1.listDisplayDefaults.displayMode,
            thumbnailPresentation: ['modeDefault', 'contain', 'cover', 'square'].includes(String(listDisplayDefaults.thumbnailPresentation))
                ? listDisplayDefaults.thumbnailPresentation as ProfileScopedSettingsV1['listDisplayDefaults']['thumbnailPresentation']
                : DEFAULT_PROFILE_SCOPED_SETTINGS_V1.listDisplayDefaults.thumbnailPresentation,
        },
        fileCardSettings: {
            showFileName: typeof fileCardSettings.showFileName === 'boolean'
                ? fileCardSettings.showFileName
                : DEFAULT_PROFILE_SCOPED_SETTINGS_V1.fileCardSettings.showFileName,
            showDuration: typeof fileCardSettings.showDuration === 'boolean'
                ? fileCardSettings.showDuration
                : DEFAULT_PROFILE_SCOPED_SETTINGS_V1.fileCardSettings.showDuration,
            showTags: typeof fileCardSettings.showTags === 'boolean'
                ? fileCardSettings.showTags
                : DEFAULT_PROFILE_SCOPED_SETTINGS_V1.fileCardSettings.showTags,
            showFileSize: typeof fileCardSettings.showFileSize === 'boolean'
                ? fileCardSettings.showFileSize
                : DEFAULT_PROFILE_SCOPED_SETTINGS_V1.fileCardSettings.showFileSize,
            tagPopoverTrigger: fileCardSettings.tagPopoverTrigger === 'hover' ? 'hover' : DEFAULT_PROFILE_SCOPED_SETTINGS_V1.fileCardSettings.tagPopoverTrigger,
            tagDisplayStyle: fileCardSettings.tagDisplayStyle === 'border' ? 'border' : DEFAULT_PROFILE_SCOPED_SETTINGS_V1.fileCardSettings.tagDisplayStyle,
            fileCardTagOrderMode: fileCardSettings.fileCardTagOrderMode === 'strict' ? 'strict' : DEFAULT_PROFILE_SCOPED_SETTINGS_V1.fileCardSettings.fileCardTagOrderMode,
        },
        defaultExternalApps: Object.fromEntries(
            Object.entries(rawDefaultExternalApps)
                .filter(([extension, appId]) => typeof extension === 'string' && typeof appId === 'string' && extension.trim().length > 0 && appId.trim().length > 0)
                .map(([extension, appId]) => [extension.replace(/^\./, '').toLowerCase(), appId.trim()])
        ),
        searchDestinations: rawSearchDestinations
            .map((destination) => {
                if (!destination || typeof destination !== 'object') return null;
                const candidateDestination = destination as Partial<ProfileScopedSettingsV1['searchDestinations'][number]>;
                if ((candidateDestination.type !== 'filename' && candidateDestination.type !== 'image')) return null;
                const name = typeof candidateDestination.name === 'string' ? candidateDestination.name.trim() : '';
                const url = typeof candidateDestination.url === 'string' ? candidateDestination.url.trim() : '';
                if (!name || !url) return null;
                if (candidateDestination.type === 'filename' && !url.includes('{query}')) return null;
                return {
                    id: typeof candidateDestination.id === 'string' && candidateDestination.id.trim().length > 0
                        ? candidateDestination.id.trim()
                        : `${candidateDestination.type}-${name.toLowerCase()}`,
                    name,
                    type: candidateDestination.type,
                    url,
                    icon: ['search', 'globe', 'image', 'camera', 'book', 'sparkles', 'link'].includes(String(candidateDestination.icon))
                        ? candidateDestination.icon as ProfileScopedSettingsV1['searchDestinations'][number]['icon']
                        : (candidateDestination.type === 'filename' ? 'search' : 'image'),
                    enabled: candidateDestination.enabled !== false,
                    createdAt: typeof candidateDestination.createdAt === 'number' && Number.isFinite(candidateDestination.createdAt)
                        ? candidateDestination.createdAt
                        : Date.now(),
                };
            })
            .filter((destination): destination is ProfileScopedSettingsV1['searchDestinations'][number] => destination !== null),
        savedFilterState: normalizeSavedFilterState(candidate.savedFilterState),
    };
}

function readStoredSettingsJson(): string | null {
    ensureProfileSettingsTable();
    const db = dbManager.getDb();
    const row = db.prepare('SELECT value FROM profile_settings WHERE key = ?').get(PROFILE_SETTINGS_KEY) as { value: string } | undefined;
    return row?.value ?? null;
}

function writeSettings(settings: ProfileScopedSettingsV1): void {
    ensureProfileSettingsTable();
    const db = dbManager.getDb();
    const now = Date.now();
    db.prepare(`
        INSERT INTO profile_settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(PROFILE_SETTINGS_KEY, JSON.stringify(settings), now);
}

export function getProfileScopedSettings(): ProfileScopedSettingsResponse {
    const raw = readStoredSettingsJson();
    if (!raw) {
        return {
            settings: { ...DEFAULT_PROFILE_SCOPED_SETTINGS_V1, fileTypeFilters: { ...DEFAULT_FILE_TYPE_FILTERS } },
            exists: false,
        };
    }

    try {
        return {
            settings: normalizeProfileScopedSettingsV1(JSON.parse(raw)),
            exists: true,
        };
    } catch (error) {
        log.warn('Failed to parse profile scoped settings. Falling back to defaults.', error);
        return {
            settings: { ...DEFAULT_PROFILE_SCOPED_SETTINGS_V1, fileTypeFilters: { ...DEFAULT_FILE_TYPE_FILTERS } },
            exists: false,
        };
    }
}

export function setProfileScopedSettings(partial: Partial<ProfileScopedSettingsV1>): ProfileScopedSettingsResponse {
    const current = getProfileScopedSettings().settings;
    const next = normalizeProfileScopedSettingsV1({
        ...current,
        ...partial,
        fileTypeFilters: partial.fileTypeFilters
            ? { ...current.fileTypeFilters, ...partial.fileTypeFilters }
            : current.fileTypeFilters,
        ratingDisplayThresholds: partial.ratingDisplayThresholds
            ? { ...current.ratingDisplayThresholds, ...partial.ratingDisplayThresholds }
            : current.ratingDisplayThresholds,
        listDisplayDefaults: partial.listDisplayDefaults
            ? { ...current.listDisplayDefaults, ...partial.listDisplayDefaults }
            : current.listDisplayDefaults,
        fileCardSettings: partial.fileCardSettings
            ? { ...current.fileCardSettings, ...partial.fileCardSettings }
            : current.fileCardSettings,
    });

    writeSettings(next);
    return { settings: next, exists: true };
}

export function replaceProfileScopedSettings(settings: ProfileScopedSettingsV1): ProfileScopedSettingsResponse {
    const normalized = normalizeProfileScopedSettingsV1(settings);
    writeSettings(normalized);
    return { settings: normalized, exists: true };
}
