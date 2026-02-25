import { dbManager } from './databaseManager';
import { logger } from './logger';

const log = logger.scope('ProfileSettings');

const PROFILE_SETTINGS_KEY = 'profile_scoped_settings_v1';

export type FileTypeCategory = 'video' | 'image' | 'archive' | 'audio';

export interface FileTypeCategoryFilters {
    video: boolean;
    image: boolean;
    archive: boolean;
    audio: boolean;
}

export interface ProfileScopedSettingsV1 {
    fileTypeFilters: FileTypeCategoryFilters;
    previewFrameCount: number;
    scanThrottleMs: number;
    thumbnailResolution: number;
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

export const DEFAULT_PROFILE_SCOPED_SETTINGS_V1: ProfileScopedSettingsV1 = {
    fileTypeFilters: DEFAULT_FILE_TYPE_FILTERS,
    previewFrameCount: 10,
    scanThrottleMs: 0,
    thumbnailResolution: 320,
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

function normalizeProfileScopedSettingsV1(input: unknown): ProfileScopedSettingsV1 {
    const candidate = (input && typeof input === 'object') ? (input as Partial<ProfileScopedSettingsV1>) : {};
    return {
        fileTypeFilters: normalizeFileTypeFilters(candidate.fileTypeFilters),
        previewFrameCount: clampPreviewFrameCount(candidate.previewFrameCount),
        scanThrottleMs: clampScanThrottleMs(candidate.scanThrottleMs),
        thumbnailResolution: clampThumbnailResolution(candidate.thumbnailResolution),
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
    });

    writeSettings(next);
    return { settings: next, exists: true };
}

export function replaceProfileScopedSettings(settings: ProfileScopedSettingsV1): ProfileScopedSettingsResponse {
    const normalized = normalizeProfileScopedSettingsV1(settings);
    writeSettings(normalized);
    return { settings: normalized, exists: true };
}
