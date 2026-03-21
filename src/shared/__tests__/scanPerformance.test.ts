import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    ADAPTIVE_INITIAL_SCAN_SKIP_THRESHOLD,
    resolveScanInitialCountMode,
    resolveWatchScanPlan,
} from '../scanPerformance';

describe('resolveScanInitialCountMode', () => {
    it('honors explicit skip requests', () => {
        expect(resolveScanInitialCountMode({ explicitSkipInitialCount: true, knownFileCount: 0 })).toBe('skipped-explicit');
    });

    it('keeps full counting for small known folders', () => {
        expect(resolveScanInitialCountMode({
            knownFileCount: ADAPTIVE_INITIAL_SCAN_SKIP_THRESHOLD - 1,
        })).toBe('full');
    });

    it('skips initial counting adaptively for large known folders', () => {
        expect(resolveScanInitialCountMode({
            knownFileCount: ADAPTIVE_INITIAL_SCAN_SKIP_THRESHOLD,
        })).toBe('skipped-adaptive');
    });
});

describe('resolveWatchScanPlan', () => {
    const rootPath = path.resolve('C:/library');

    it('falls back to full root rescans when the target is missing', () => {
        expect(resolveWatchScanPlan({
            rootPath,
            changedPath: path.join(rootPath, 'missing/file.mp4'),
            changedPathExists: false,
            changedPathIsDirectory: false,
        })).toEqual({
            scope: 'root',
            scanPath: rootPath,
            skipMissingCleanup: false,
        });
    });

    it('localizes existing nested file changes to the parent directory', () => {
        const changedPath = path.join(rootPath, 'nested', 'movie.mp4');
        expect(resolveWatchScanPlan({
            rootPath,
            changedPath,
            changedPathExists: true,
            changedPathIsDirectory: false,
        })).toEqual({
            scope: 'local',
            scanPath: path.join(rootPath, 'nested'),
            skipMissingCleanup: true,
        });
    });

    it('keeps root rescans for files directly under the root folder', () => {
        const changedPath = path.join(rootPath, 'movie.mp4');
        expect(resolveWatchScanPlan({
            rootPath,
            changedPath,
            changedPathExists: true,
            changedPathIsDirectory: false,
        })).toEqual({
            scope: 'root',
            scanPath: rootPath,
            skipMissingCleanup: false,
        });
    });
});
