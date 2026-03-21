import path from 'node:path';

export const ADAPTIVE_INITIAL_SCAN_SKIP_THRESHOLD = 200;

export type ScanInitialCountMode = 'full' | 'skipped-explicit' | 'skipped-adaptive';

export function resolveScanInitialCountMode(input: {
    explicitSkipInitialCount?: boolean;
    knownFileCount?: number | null;
    threshold?: number;
}): ScanInitialCountMode {
    if (input.explicitSkipInitialCount === true) {
        return 'skipped-explicit';
    }

    if (input.explicitSkipInitialCount === false) {
        return 'full';
    }

    const knownFileCount = typeof input.knownFileCount === 'number' && Number.isFinite(input.knownFileCount)
        ? input.knownFileCount
        : 0;
    const threshold = input.threshold ?? ADAPTIVE_INITIAL_SCAN_SKIP_THRESHOLD;

    return knownFileCount >= threshold ? 'skipped-adaptive' : 'full';
}

export interface WatchScanPlan {
    scope: 'root' | 'local';
    scanPath: string;
    skipMissingCleanup: boolean;
}

export function resolveWatchScanPlan(input: {
    rootPath: string;
    changedPath?: string | null;
    changedPathExists: boolean;
    changedPathIsDirectory: boolean;
}): WatchScanPlan {
    const normalizedRootPath = path.resolve(input.rootPath);
    const fallbackPlan: WatchScanPlan = {
        scope: 'root',
        scanPath: normalizedRootPath,
        skipMissingCleanup: false,
    };

    if (!input.changedPath || !input.changedPathExists) {
        return fallbackPlan;
    }

    const normalizedChangedPath = path.resolve(input.changedPath);
    const relativePath = path.relative(normalizedRootPath, normalizedChangedPath);
    if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        return fallbackPlan;
    }

    const scanPath = input.changedPathIsDirectory
        ? normalizedChangedPath
        : path.dirname(normalizedChangedPath);
    if (scanPath === normalizedRootPath) {
        return fallbackPlan;
    }

    return {
        scope: 'local',
        scanPath,
        skipMissingCleanup: true,
    };
}
