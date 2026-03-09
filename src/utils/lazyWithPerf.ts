import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { logChunkPerf } from './perfDebug';

interface ModuleWithDefault<T extends ComponentType<unknown>> {
    default: T;
}

export function lazyWithPerf<T extends ComponentType<unknown>>(
    label: string,
    loader: () => Promise<ModuleWithDefault<T>>
): LazyExoticComponent<T> {
    return lazy(async () => {
        const startedAt = performance.now();

        try {
            const module = await loader();
            logChunkPerf(label, startedAt, { status: 'loaded' });
            return module;
        } catch (error) {
            logChunkPerf(label, startedAt, {
                status: 'failed',
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    });
}
