import { utilityProcess, type UtilityProcess } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger';
import type {
    AudioThumbnailJobRequest,
    AudioThumbnailJobSuccess,
    MediaMetadataJobRequest,
    MediaMetadataJobSuccess,
    PreviewFrameJobRequest,
    PreviewFrameJobSuccess,
    PreviewFrameWorkerMessage,
    VideoDurationJobRequest,
    VideoDurationJobSuccess,
    VideoThumbnailJobRequest,
    VideoThumbnailJobSuccess,
    WorkerJobFailure,
    ExtractedMediaMetadata,
} from '../utility/previewFrameWorkerTypes';

const log = logger.scope('PreviewFrameWorkerService');
const PREVIEW_FRAME_JOB_TIMEOUT_MS = 90_000;

function resolveWorkerScriptPath(): string {
    const candidates = [
        path.join(path.dirname(fileURLToPath(import.meta.url)), 'previewFrameWorker.js'),
        path.join(process.resourcesPath, 'dist-electron', 'previewFrameWorker.js'),
        path.join(process.resourcesPath, 'app.asar.unpacked', 'dist-electron', 'previewFrameWorker.js'),
    ];
    const resolved = candidates.find((candidate) => fs.existsSync(candidate));

    if (!resolved) {
        log.error('Preview frame worker entry not found in packaged build', { candidates });
        return candidates[0]!;
    }

    return resolved;
}

const workerScriptPath = resolveWorkerScriptPath();

interface QueuedPreviewFrameJob {
    request: PreviewFrameJobRequest | VideoThumbnailJobRequest | VideoDurationJobRequest | AudioThumbnailJobRequest | MediaMetadataJobRequest;
    resolve: (result: string[] | string | number | ExtractedMediaMetadata | null) => void;
    reject: (error: Error) => void;
}

let previewFrameWorker: UtilityProcess | null = null;
let workerReady = false;
let workerStartupPromise: Promise<void> | null = null;
let resolveWorkerStartup: (() => void) | null = null;
let rejectWorkerStartup: ((error: Error) => void) | null = null;
let activeJob: QueuedPreviewFrameJob | null = null;
let activeJobTimeout: NodeJS.Timeout | null = null;
let isDisposing = false;
// Step 1 is intentionally FIFO/serial so performance regressions stay easy to isolate.
const queuedJobs: QueuedPreviewFrameJob[] = [];

function toError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
}

function clearActiveJobTimeout(): void {
    if (activeJobTimeout) {
        clearTimeout(activeJobTimeout);
        activeJobTimeout = null;
    }
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
    clearActiveJobTimeout();

    if (activeJob) {
        activeJob.reject(error);
        activeJob = null;
    }

    while (queuedJobs.length > 0) {
        const queuedJob = queuedJobs.shift();
        queuedJob?.reject(error);
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

    activeJobTimeout = setTimeout(() => {
        const requestId = activeJob?.request.requestId ?? 'unknown';
        const timeoutError = new Error(`Preview frame worker timed out after ${PREVIEW_FRAME_JOB_TIMEOUT_MS}ms (requestId=${requestId}).`);
        log.warn(timeoutError.message);

        if (previewFrameWorker) {
            previewFrameWorker.kill();
            previewFrameWorker = null;
        }

        workerReady = false;
        rejectAllJobs(timeoutError);
    }, PREVIEW_FRAME_JOB_TIMEOUT_MS);

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
        log.warn(`Received unexpected worker message for request: ${(message as PreviewFrameJobSuccess | VideoThumbnailJobSuccess | VideoDurationJobSuccess | AudioThumbnailJobSuccess | MediaMetadataJobSuccess | WorkerJobFailure).requestId ?? 'unknown'}`);
        return;
    }

    clearActiveJobTimeout();

    const completedJob = activeJob;
    activeJob = null;

    if (message.type === 'worker:preview-job-success') {
        completedJob.resolve(message.framePaths);
    } else if (message.type === 'worker:video-thumbnail-job-success') {
        completedJob.resolve(message.thumbnailPath);
    } else if (message.type === 'worker:video-duration-job-success') {
        completedJob.resolve(message.durationSeconds);
    } else if (message.type === 'worker:audio-thumbnail-job-success') {
        completedJob.resolve(message.thumbnailPath);
    } else if (message.type === 'worker:media-metadata-job-success') {
        completedJob.resolve(message.metadata);
    } else if (message.type === 'worker:job-failure') {
        completedJob.reject(new Error(message.error));
    }

    dispatchNextJob();
}

function handleWorkerExit(code: number): void {
    clearActiveJobTimeout();

    const exitError = new Error(`Preview frame worker exited with code ${code}.`);
    const wasDisposing = isDisposing;

    previewFrameWorker = null;
    workerReady = false;

    if (workerStartupPromise) {
        rejectWorkerStartup?.(exitError);
        resetStartupState();
    }

    if (wasDisposing) {
        isDisposing = false;
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
            resolve: (result) => resolve((result as string[] | null) ?? null),
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

export async function runVideoThumbnailJob(request: VideoThumbnailJobRequest): Promise<string | null> {
    return new Promise((resolve, reject) => {
        queuedJobs.push({
            request,
            resolve: (result) => resolve((result as string | null) ?? null),
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

export async function runVideoDurationJob(request: VideoDurationJobRequest): Promise<number> {
    return new Promise((resolve, reject) => {
        queuedJobs.push({
            request,
            resolve: (result) => resolve((result as number | null) ?? 0),
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

export async function runAudioThumbnailJob(request: AudioThumbnailJobRequest): Promise<string | null> {
    return new Promise((resolve, reject) => {
        queuedJobs.push({
            request,
            resolve: (result) => resolve((result as string | null) ?? null),
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

export async function runMediaMetadataJob(request: MediaMetadataJobRequest): Promise<ExtractedMediaMetadata | null> {
    return new Promise((resolve, reject) => {
        queuedJobs.push({
            request,
            resolve: (result) => resolve((result as ExtractedMediaMetadata | null) ?? null),
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

export function disposePreviewFrameWorker(): void {
    const disposeError = new Error('Preview frame worker disposed.');
    const hadWorker = Boolean(previewFrameWorker);
    isDisposing = true;

    clearActiveJobTimeout();

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
