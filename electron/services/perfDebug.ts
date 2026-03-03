import { performance } from 'node:perf_hooks';
import { logger } from './logger';

const log = logger.scope('Perf');

let perfDebugEnabled = false;

function stringifyValue(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);

    try {
        return JSON.stringify(value);
    } catch {
        return '[unserializable]';
    }
}

function formatDetails(details?: Record<string, unknown>): string {
    if (!details) return '';

    const entries = Object.entries(details)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${stringifyValue(value)}`);

    return entries.length > 0 ? ` ${entries.join(' ')}` : '';
}

export function isPerfDebugEnabled(): boolean {
    return perfDebugEnabled && !!process.env.VITE_DEV_SERVER_URL;
}

export function setPerfDebugEnabled(enabled: boolean): boolean {
    perfDebugEnabled = !!enabled && !!process.env.VITE_DEV_SERVER_URL;
    log.info(`[perf] main-debug ${perfDebugEnabled ? 'enabled' : 'disabled'}`);
    return perfDebugEnabled;
}

export function startPerfTimer(): number {
    return isPerfDebugEnabled() ? performance.now() : 0;
}

export function logPerf(label: string, startedAt: number, details?: Record<string, unknown>): void {
    if (!isPerfDebugEnabled()) return;

    const elapsedMs = Number((performance.now() - startedAt).toFixed(1));
    log.info(`[perf] ${label} ${elapsedMs}ms${formatDetails(details)}`);
}
