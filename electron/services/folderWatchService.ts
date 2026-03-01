import fs from 'fs';
import path from 'path';
import { logger } from './logger';
import { getWatchNewFilesFolders, type MediaFolder } from './database';
import { scanDirectory } from './scanner';

const log = logger.scope('FolderWatch');

type FolderWatcherState = {
    watcher: fs.FSWatcher;
    debounceTimer: NodeJS.Timeout | null;
    scanRunning: boolean;
    scanQueued: boolean;
};

const watcherStates = new Map<string, FolderWatcherState>();
const DEBOUNCE_MS = 1500;

function isLikelyTempPath(name: string): boolean {
    const lower = name.toLowerCase();
    return lower.endsWith('.tmp') || lower.endsWith('.part') || lower.endsWith('.crdownload');
}

function scheduleFolderScan(folder: MediaFolder, reason: string) {
    const state = watcherStates.get(folder.id);
    if (!state) return;

    if (state.debounceTimer) {
        clearTimeout(state.debounceTimer);
    }

    state.debounceTimer = setTimeout(() => {
        state.debounceTimer = null;
        void runFolderScan(folder, reason);
    }, DEBOUNCE_MS);
}

async function runFolderScan(folder: MediaFolder, reason: string) {
    const state = watcherStates.get(folder.id);
    if (!state) return;

    if (state.scanRunning) {
        state.scanQueued = true;
        return;
    }

    state.scanRunning = true;
    try {
        log.info(`Detected file change, rescanning: ${folder.path} (reason=${reason})`);
        await scanDirectory(folder.path, folder.id);
    } catch (error) {
        log.warn(`Live rescan failed: ${folder.path}`, error);
    } finally {
        state.scanRunning = false;
        if (state.scanQueued) {
            state.scanQueued = false;
            scheduleFolderScan(folder, 'queued');
        }
    }
}

function closeWatcher(folderId: string) {
    const state = watcherStates.get(folderId);
    if (!state) return;
    if (state.debounceTimer) {
        clearTimeout(state.debounceTimer);
    }
    try {
        state.watcher.close();
    } catch {
        // ignore close errors
    }
    watcherStates.delete(folderId);
}

function createWatcher(folder: MediaFolder) {
    if (watcherStates.has(folder.id)) return;
    if (!folder.path || !fs.existsSync(folder.path)) {
        log.warn(`Skip watch (path missing): ${folder.path}`);
        return;
    }

    try {
        const watcher = fs.watch(folder.path, { recursive: true }, (_eventType, filename) => {
            const fileName = typeof filename === 'string' ? filename : '';
            if (fileName && isLikelyTempPath(fileName)) return;
            scheduleFolderScan(folder, fileName ? path.normalize(fileName) : 'unknown');
        });

        watcherStates.set(folder.id, {
            watcher,
            debounceTimer: null,
            scanRunning: false,
            scanQueued: false
        });
        log.info(`Watching folder for new files: ${folder.path}`);
    } catch (error) {
        log.warn(`Failed to watch folder: ${folder.path}`, error);
    }
}

export function syncFolderWatchers(): void {
    const enabledFolders = getWatchNewFilesFolders();
    const enabledIds = new Set(enabledFolders.map(f => f.id));

    for (const existingId of watcherStates.keys()) {
        if (!enabledIds.has(existingId)) {
            closeWatcher(existingId);
        }
    }

    enabledFolders.forEach(folder => createWatcher(folder));
}

export function stopAllFolderWatchers(): void {
    for (const folderId of [...watcherStates.keys()]) {
        closeWatcher(folderId);
    }
}
