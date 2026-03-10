export interface FolderScanFileTypeOverrides {
    video?: boolean;
    image?: boolean;
    archive?: boolean;
    audio?: boolean;
}

export interface FolderScanSettings {
    fileTypeOverrides?: FolderScanFileTypeOverrides;
    excludedSubdirectories?: string[];
}

function normalizeExcludedSubdirectoryValue(value: string): string {
    return value
        .trim()
        .replace(/\\/g, '/')
        .replace(/\/+/g, '/')
        .replace(/^\.\//, '')
        .replace(/^\/+/, '')
        .replace(/\/+$/, '');
}

export function normalizeExcludedSubdirectories(input: unknown): string[] {
    if (!Array.isArray(input)) return [];

    const normalized = new Map<string, string>();
    input.forEach((value) => {
        if (typeof value !== 'string') return;
        const next = normalizeExcludedSubdirectoryValue(value);
        if (!next) return;
        const key = next.toLowerCase();
        if (!normalized.has(key)) {
            normalized.set(key, next);
        }
    });

    return [...normalized.values()];
}

export function parseExcludedSubdirectoriesText(input: string): string[] {
    return normalizeExcludedSubdirectories(
        input
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
    );
}

export function excludedSubdirectoriesToText(entries: string[] | undefined): string {
    return normalizeExcludedSubdirectories(entries).join('\n');
}

export function normalizeFolderScanSettings(input: unknown): FolderScanSettings {
    const raw = input && typeof input === 'object' && !Array.isArray(input)
        ? input as Record<string, unknown>
        : {};

    const fileTypeOverridesRaw = raw.fileTypeOverrides;
    const fileTypeOverrides =
        fileTypeOverridesRaw && typeof fileTypeOverridesRaw === 'object' && !Array.isArray(fileTypeOverridesRaw)
            ? {
                video: typeof (fileTypeOverridesRaw as Record<string, unknown>).video === 'boolean'
                    ? (fileTypeOverridesRaw as Record<string, unknown>).video as boolean
                    : undefined,
                image: typeof (fileTypeOverridesRaw as Record<string, unknown>).image === 'boolean'
                    ? (fileTypeOverridesRaw as Record<string, unknown>).image as boolean
                    : undefined,
                archive: typeof (fileTypeOverridesRaw as Record<string, unknown>).archive === 'boolean'
                    ? (fileTypeOverridesRaw as Record<string, unknown>).archive as boolean
                    : undefined,
                audio: typeof (fileTypeOverridesRaw as Record<string, unknown>).audio === 'boolean'
                    ? (fileTypeOverridesRaw as Record<string, unknown>).audio as boolean
                    : undefined,
            }
            : undefined;

    const normalizedExcludedSubdirectories = normalizeExcludedSubdirectories(raw.excludedSubdirectories);

    return {
        fileTypeOverrides,
        excludedSubdirectories: normalizedExcludedSubdirectories,
    };
}

export function parseFolderScanSettingsJson(raw: string | null | undefined): FolderScanSettings {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        return normalizeFolderScanSettings(parsed);
    } catch {
        return {};
    }
}

export function pathMatchesExcludedSubdirectory(
    targetPath: string,
    rootPath: string,
    excludedSubdirectories: string[] | undefined
): boolean {
    const normalizedExcluded = normalizeExcludedSubdirectories(excludedSubdirectories);
    if (normalizedExcluded.length === 0) return false;

    const normalizedTargetPath = targetPath.replace(/\\/g, '/').replace(/\/+$/, '');
    const normalizedRootPath = rootPath.replace(/\\/g, '/').replace(/\/+$/, '');
    const targetLower = normalizedTargetPath.toLowerCase();
    const rootLower = normalizedRootPath.toLowerCase();
    const rootLowerWithSlash = `${rootLower}/`;

    if (targetLower !== rootLower && !targetLower.startsWith(rootLowerWithSlash)) {
        return false;
    }

    const relativeSegments = normalizedTargetPath
        .slice(normalizedRootPath.length)
        .replace(/^\/+/, '')
        .split('/')
        .filter(Boolean)
        .map((segment) => segment.toLowerCase());

    if (relativeSegments.length === 0) {
        return false;
    }

    return normalizedExcluded.some((entry) => {
        const excludedSegments = entry.split('/').filter(Boolean).map((segment) => segment.toLowerCase());
        if (excludedSegments.length === 0 || relativeSegments.length < excludedSegments.length) {
            return false;
        }
        return excludedSegments.every((segment, index) => relativeSegments[index] === segment);
    });
}
