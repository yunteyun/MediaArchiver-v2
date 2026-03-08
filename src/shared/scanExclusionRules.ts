export interface ScanExclusionRules {
    excludedExtensions: string[];
    excludedFolderNames: string[];
    skipHiddenFolders: boolean;
}

export const DEFAULT_SCAN_EXCLUSION_RULES: ScanExclusionRules = {
    excludedExtensions: [],
    excludedFolderNames: [],
    skipHiddenFolders: true,
};

function normalizeStringList(input: unknown): string[] {
    if (!Array.isArray(input)) return [];

    const unique = new Set<string>();
    for (const value of input) {
        if (typeof value !== 'string') continue;
        const normalized = value.trim().toLowerCase();
        if (!normalized) continue;
        unique.add(normalized);
    }

    return [...unique];
}

export function normalizeExcludedExtensions(input: unknown): string[] {
    return normalizeStringList(input)
        .map((extension) => extension.replace(/^\.+/, ''))
        .filter(Boolean)
        .map((extension) => `.${extension}`);
}

export function normalizeExcludedFolderNames(input: unknown): string[] {
    return normalizeStringList(input);
}

export function normalizeScanExclusionRules(input: unknown): ScanExclusionRules {
    const rules = input && typeof input === 'object'
        ? input as Partial<ScanExclusionRules>
        : undefined;

    return {
        excludedExtensions: normalizeExcludedExtensions(rules?.excludedExtensions),
        excludedFolderNames: normalizeExcludedFolderNames(rules?.excludedFolderNames),
        skipHiddenFolders: typeof rules?.skipHiddenFolders === 'boolean'
            ? rules.skipHiddenFolders
            : DEFAULT_SCAN_EXCLUSION_RULES.skipHiddenFolders,
    };
}

export function shouldSkipDirectoryEntry(
    entryName: string,
    rules: ScanExclusionRules = DEFAULT_SCAN_EXCLUSION_RULES
): boolean {
    const normalizedName = entryName.trim().toLowerCase();
    if (!normalizedName) return false;
    if (rules.skipHiddenFolders && normalizedName.startsWith('.')) return true;
    return rules.excludedFolderNames.includes(normalizedName);
}

export function shouldSkipFileByExtension(
    extension: string,
    rules: ScanExclusionRules = DEFAULT_SCAN_EXCLUSION_RULES
): boolean {
    const normalizedExtension = normalizeExcludedExtensions([extension])[0];
    if (!normalizedExtension) return false;
    return rules.excludedExtensions.includes(normalizedExtension);
}

export function pathHasExcludedDirectory(
    filePath: string,
    rootPath: string,
    rules: ScanExclusionRules = DEFAULT_SCAN_EXCLUSION_RULES
): boolean {
    const normalizedFilePath = filePath.replace(/\\/g, '/');
    const normalizedRootPath = rootPath.replace(/\\/g, '/').replace(/\/+$/, '');
    const filePathForCompare = normalizedFilePath.toLowerCase();
    const rootPathForCompare = normalizedRootPath.toLowerCase();
    const rootPathWithSlash = rootPathForCompare ? `${rootPathForCompare}/` : '';

    let relativePath = normalizedFilePath;
    if (rootPathForCompare && (filePathForCompare === rootPathForCompare || filePathForCompare.startsWith(rootPathWithSlash))) {
        relativePath = normalizedFilePath.slice(normalizedRootPath.length);
    }

    const segments = relativePath
        .replace(/^\/+/, '')
        .split('/')
        .filter(Boolean);

    if (segments.length <= 1) return false;

    return segments
        .slice(0, -1)
        .some((segment) => shouldSkipDirectoryEntry(segment, rules));
}
