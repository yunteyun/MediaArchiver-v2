const PERF_DEBUG_STORAGE_KEY = 'ma_debug_perf';

type PerfDebugMetadata = Record<string, unknown>;

function roundElapsedMs(value: number): number {
    return Number(value.toFixed(2));
}

export function isPerfDebugEnabled(): boolean {
    try {
        const runtimeFlag = (globalThis as { __MA_DEBUG_PERF?: boolean }).__MA_DEBUG_PERF === true;
        if (runtimeFlag) {
            return true;
        }

        const storedValue = globalThis.localStorage?.getItem(PERF_DEBUG_STORAGE_KEY);
        return storedValue === '1' || storedValue === 'true';
    } catch {
        return false;
    }
}

export function logPerfEvent(label: string, metadata: PerfDebugMetadata = {}): void {
    if (!isPerfDebugEnabled()) {
        return;
    }

    console.debug(`[perf] ${label}`, metadata);
}

export function startPerfMeasure(label: string, metadata: PerfDebugMetadata = {}): (resultMetadata?: PerfDebugMetadata) => number {
    if (!isPerfDebugEnabled()) {
        return () => 0;
    }

    const startTime = performance.now();

    return (resultMetadata: PerfDebugMetadata = {}) => {
        const elapsedMs = performance.now() - startTime;
        console.debug(`[perf] ${label}`, {
            ...metadata,
            ...resultMetadata,
            elapsedMs: roundElapsedMs(elapsedMs),
        });
        return elapsedMs;
    };
}
