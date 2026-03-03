import { utilityProcess, type UtilityProcess } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger';
import type {
    PreviewFrameJobFailure,
    PreviewFrameJobRequest,
    PreviewFrameJobSource,
    PreviewFrameJobSuccess,
    PreviewFrameWorkerMessage,
} from '../utility/previewFrameWorkerTypes';

const log = logger.scope('PreviewFrameWorkerService');
const workerScriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'previewFrameWorker.js');
const PREVIEW_FRAME_JOB_CANCELLED_MESSAGE = 'Preview frame worker job cancelled.';

interface QueuedPreviewFrameJob {
    request: PreviewFrameJobRequest;
    resolve: (framePaths: string[] | null) => void;
    reject: (error: Error) => void;
}

let previewFrameWorker: UtilityProcess | null = null;
let workerReady = false;
let workerStartupPromise: Promise<void> | null = null;
let resolveWorkerStartup: (() => void) | null = null;
let rejectWorkerStartup: ((error: Error) => void) | null = null;
let activeJob: QueuedPreviewFrameJob | null = null;
let isDisposing = false;
let cancellationError: Error | null = null;
const queuedJobs: QueuedPreviewFrameJob[] = [];

function toError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
}

function flushWorkerStream(level: 'info' | 'warn', chunk: unknown): void {
    const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk ?? '');
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

    lines.forEach((line) => {
        if (level === 'warn') {
            log.warn(`[worker] ${line}`);
        } else {
            log.info(`[worker] ${line}`);
        }
    });
}

function resetStartupState(): void {
    workerStartupPromise = null;
    resolveWorkerStartup = null;
    rejectWorkerStartup = null;
}

function rejectAllJobs(error: Error): void {
    if (activeJob) {
        activeJob.reject(error);
        activeJob = null;
    }

    while (queuedJobs.length > 0) {
        const queuedJob = queuedJobs.shift();
        queuedJob?.reject(error);
    }
}

function rejectQueuedJobsBySource(source: PreviewFrameJobSource, error: Error): void {
    for (let i = queuedJobs.length - 1; i >= 0; i -= 1) {
        const queuedJob = queuedJobs[i];
        if (queuedJob.request.jobSource !== source) {
            continue;
        }

        queuedJobs.splice(i, 1);
        queuedJob.reject(error);
    }
}

function dispatchNextJob(): void {
    if (!previewFrameWorker || !workerReady || activeJob || queuedJobs.length === 0) {
        return;
    }

    activeJob = queuedJobs.shift() ?? null;
    if (!activeJob) {
        return;
    }

    previewFrameWorker.postMessage(activeJob.request);
}

function handleWorkerMessage(message: PreviewFrameWorkerMessage): void {
    if (!message) return;

    if (message.type === 'worker:ready') {
        workerReady = true;
        resolveWorkerStartup?.();
        resetStartupState();
        dispatchNextJob();
        return;
    }

    if (!activeJob || message.requestId !== activeJob.request.requestId) {
        log.warn(`Received unexpected worker message for request: ${(message as PreviewFrameJobSuccess | PreviewFrameJobFailure).requestId ?? 'unknown'}`);
        return;
    }

    const completedJob = activeJob;
    activeJob = null;

    if (message.type === 'worker:preview-job-success') {
        completedJob.resolve(message.framePaths);
    } else if (message.type === 'worker:preview-job-failure') {
        completedJob.reject(new Error(message.error));
    }

    dispatchNextJob();
}

function handleWorkerExit(code: number): void {
    const exitError = new Error(`Preview frame worker exited with code ${code}.`);
    const wasDisposing = isDisposing;
    const workerCancellationError = cancellationError;
    const cancelledJob = activeJob;

    previewFrameWorker = null;
    workerReady = false;
    cancellationError = null;

    if (workerStartupPromise) {
        rejectWorkerStartup?.(exitError);
        resetStartupState();
    }

    if (wasDisposing) {
        isDisposing = false;
        return;
    }

    if (workerCancellationError && cancelledJob) {
        activeJob = null;
        log.info(`Cancelled preview frame job: ${cancelledJob.request.requestId}`);
        cancelledJob.reject(workerCancellationError);

        if (queuedJobs.length > 0) {
            void ensureWorkerReady()
                .then(() => {
                    dispatchNextJob();
                })
                .catch((error) => {
                    const restartError = toError(error);
                    log.warn(`Failed to restart preview frame worker after cancellation: ${restartError.message}`);
                    rejectAllJobs(restartError);
                });
        }
        return;
    }

    log.warn(exitError.message);
    rejectAllJobs(exitError);
}

function ensureWorkerReady(): Promise<void> {
    if (previewFrameWorker && workerReady) {
        return Promise.resolve();
    }

    if (workerStartupPromise) {
        return workerStartupPromise;
    }

    workerStartupPromise = new Promise((resolve, reject) => {
        resolveWorkerStartup = resolve;
        rejectWorkerStartup = reject;

        try {
            const worker = utilityProcess.fork(workerScriptPath, [], {
                serviceName: 'ffmpeg-preview-frame-worker',
                stdio: 'pipe',
            });

            previewFrameWorker = worker;
            workerReady = false;
            isDisposing = false;

            worker.on('spawn', () => {
                log.info(`Preview frame worker spawned (pid=${worker.pid ?? 'unknown'}).`);
            });
            worker.on('message', (message) => {
                handleWorkerMessage(message as PreviewFrameWorkerMessage);
            });
            worker.on('exit', (code) => {
                handleWorkerExit(code);
            });
            worker.on('error', (type, location, report) => {
                log.error(`Preview frame worker fatal error: ${type} ${location}`, report);
            });

            worker.stdout?.on('data', (chunk) => {
                flushWorkerStream('info', chunk);
            });
            worker.stderr?.on('data', (chunk) => {
                flushWorkerStream('warn', chunk);
            });
        } catch (error) {
            const startupError = toError(error);
            previewFrameWorker = null;
            workerReady = false;
            resetStartupState();
            reject(startupError);
        }
    });

    return workerStartupPromise;
}

export async function runPreviewFrameJob(request: PreviewFrameJobRequest): Promise<string[] | null> {
    return new Promise((resolve, reject) => {
        queuedJobs.push({
            request,
            resolve,
            reject,
        });

        void ensureWorkerReady()
            .then(() => {
                dispatchNextJob();
            })
            .catch((error) => {
                const startupError = toError(error);
                log.warn(`Failed to start preview frame worker: ${startupError.message}`);
                rejectAllJobs(startupError);
            });
    });
}

export function isPreviewFrameJobCancelledError(error: unknown): boolean {
    return toError(error).message === PREVIEW_FRAME_JOB_CANCELLED_MESSAGE;
}

export function cancelPreviewFrameJobsBySource(source: PreviewFrameJobSource): void {
    const cancelError = new Error(PREVIEW_FRAME_JOB_CANCELLED_MESSAGE);
    rejectQueuedJobsBySource(source, cancelError);

    if (!activeJob || activeJob.request.jobSource !== source) {
        return;
    }

    cancellationError = cancelError;
    previewFrameWorker?.kill();
}

export function disposePreviewFrameWorker(): void {
    const disposeError = new Error('Preview frame worker disposed.');
    const hadWorker = Boolean(previewFrameWorker);
    isDisposing = true;
    cancellationError = null;

    if (previewFrameWorker) {
        previewFrameWorker.kill();
        previewFrameWorker = null;
    }

    workerReady = false;

    if (workerStartupPromise) {
        rejectWorkerStartup?.(disposeError);
        resetStartupState();
    }

    rejectAllJobs(disposeError);

    if (!hadWorker) {
        isDisposing = false;
    }
}
