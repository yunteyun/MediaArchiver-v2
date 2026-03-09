export interface PerfDebugFlags {
    enabled: boolean;
    groupDetails: boolean;
    responsiveness: boolean;
    chunkLoad: boolean;
}

declare global {
    var __MA_DEBUG_PERF: boolean | undefined;
    var __MA_DEBUG_GROUP_PERF: boolean | undefined;
    var __MA_DEBUG_UI_PERF: boolean | undefined;
    var __MA_DEBUG_CHUNK_PERF: boolean | undefined;
    var __MA_UI_PERF_TRACES: Map<string, { startedAt: number; details?: Record<string, unknown> }> | undefined;
}

const PERF_DEBUG_STORAGE_KEY = 'mediaarchiver.dev.perfDebugFlags';

const DEFAULT_PERF_DEBUG_FLAGS: PerfDebugFlags = {
    enabled: false,
    groupDetails: true,
    responsiveness: true,
    chunkLoad: true,
};

function canUseBrowserApis() {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function getTraceStore() {
    if (!globalThis.__MA_UI_PERF_TRACES) {
        globalThis.__MA_UI_PERF_TRACES = new Map();
    }
    return globalThis.__MA_UI_PERF_TRACES;
}

function normalizePerfDebugFlags(input?: Partial<PerfDebugFlags>): PerfDebugFlags {
    const enabled = input?.enabled === true;

    return {
        enabled,
        groupDetails: input?.groupDetails ?? DEFAULT_PERF_DEBUG_FLAGS.groupDetails,
        responsiveness: input?.responsiveness ?? DEFAULT_PERF_DEBUG_FLAGS.responsiveness,
        chunkLoad: input?.chunkLoad ?? DEFAULT_PERF_DEBUG_FLAGS.chunkLoad,
    };
}

function applyPerfDebugFlags(flags: PerfDebugFlags) {
    globalThis.__MA_DEBUG_PERF = flags.enabled;
    globalThis.__MA_DEBUG_GROUP_PERF = flags.enabled && flags.groupDetails;
    globalThis.__MA_DEBUG_UI_PERF = flags.enabled && flags.responsiveness;
    globalThis.__MA_DEBUG_CHUNK_PERF = flags.enabled && flags.chunkLoad;

    if (!flags.enabled) {
        getTraceStore().clear();
    }
}

function readPerfDebugFlagsFromStorage(): PerfDebugFlags {
    if (!canUseBrowserApis()) {
        return { ...DEFAULT_PERF_DEBUG_FLAGS };
    }

    try {
        const raw = localStorage.getItem(PERF_DEBUG_STORAGE_KEY);
        if (!raw) {
            return { ...DEFAULT_PERF_DEBUG_FLAGS };
        }

        return normalizePerfDebugFlags(JSON.parse(raw) as Partial<PerfDebugFlags>);
    } catch {
        return { ...DEFAULT_PERF_DEBUG_FLAGS };
    }
}

function writePerfDebugFlagsToStorage(flags: PerfDebugFlags) {
    if (!canUseBrowserApis()) return;

    try {
        localStorage.setItem(PERF_DEBUG_STORAGE_KEY, JSON.stringify(flags));
    } catch {
        // Ignore storage failures in dev-only diagnostics.
    }
}

let currentPerfDebugFlags = readPerfDebugFlagsFromStorage();
applyPerfDebugFlags(currentPerfDebugFlags);

export function getPerfDebugFlags(): PerfDebugFlags {
    return { ...currentPerfDebugFlags };
}

export function setPerfDebugFlags(patch: Partial<PerfDebugFlags>): PerfDebugFlags {
    currentPerfDebugFlags = normalizePerfDebugFlags({
        ...currentPerfDebugFlags,
        ...patch,
    });
    applyPerfDebugFlags(currentPerfDebugFlags);
    writePerfDebugFlagsToStorage(currentPerfDebugFlags);
    return getPerfDebugFlags();
}

export function initializePerfDebugFlags(): PerfDebugFlags {
    currentPerfDebugFlags = readPerfDebugFlagsFromStorage();
    applyPerfDebugFlags(currentPerfDebugFlags);
    return getPerfDebugFlags();
}

export async function syncPerfDebugToMain(enabled: boolean): Promise<void> {
    if (!import.meta.env.DEV || typeof window === 'undefined' || !window.electronAPI?.setPerfDebugEnabled) {
        return;
    }

    try {
        await window.electronAPI.setPerfDebugEnabled(enabled);
    } catch (error) {
        console.error('Failed to sync perf debug flag to main process:', error);
    }
}

export function isPerfDebugEnabled(): boolean {
    return import.meta.env.DEV && globalThis.__MA_DEBUG_PERF === true;
}

export function isUiPerfTraceEnabled(): boolean {
    return isPerfDebugEnabled() && globalThis.__MA_DEBUG_UI_PERF === true;
}

export function isChunkPerfEnabled(): boolean {
    return isPerfDebugEnabled() && globalThis.__MA_DEBUG_CHUNK_PERF === true;
}

export function beginUiPerfTrace(name: string, details?: Record<string, unknown>) {
    if (!isUiPerfTraceEnabled()) return;

    getTraceStore().set(name, {
        startedAt: performance.now(),
        details,
    });
}

export function completeUiPerfTrace(name: string, details?: Record<string, unknown>) {
    if (!isUiPerfTraceEnabled()) return;

    const trace = getTraceStore().get(name);
    if (!trace) return;

    getTraceStore().delete(name);
    requestAnimationFrame(() => {
        console.debug('[perf][ui]', {
            name,
            elapsedMs: Number((performance.now() - trace.startedAt).toFixed(2)),
            ...trace.details,
            ...details,
        });
    });
}

export function logChunkPerf(label: string, startedAt: number, details?: Record<string, unknown>) {
    if (!isChunkPerfEnabled()) return;

    console.debug('[perf][chunk]', {
        label,
        elapsedMs: Number((performance.now() - startedAt).toFixed(2)),
        ...details,
    });
}
