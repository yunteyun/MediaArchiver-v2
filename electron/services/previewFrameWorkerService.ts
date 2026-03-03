import { utilityProcess, type UtilityProcess } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger';
import type {
    ExtractedMediaMetadata,
    FfmpegWorkerJobSource,
    FfmpegWorkerMessage,
    FfmpegWorkerRequest,
    FfmpegWorkerSuccessMessage,
    MediaMetadataJobRequest,
    PreviewFrameJobRequest,
    VideoDurationJobRequest,
    VideoThumbnailJobRequest,
} from '../utility/previewFrameWorkerTypes';

const log = logger.scope('FfmpegWorkerService');
const workerScriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'previewFrameWorker.js');
const FFMPEG_WORKER_JOB_CANCELLED_MESSAGE = 'Ffmpeg worker job cancelled.';

interface QueuedWorkerJob<TResult> {
    request: FfmpegWorkerRequest;
    resolve: (result: TResult) => void;
    reject: (error: Error) => void;
    mapSuccess: (message: FfmpegWorkerSuccessMessage) => TResult;
}

let ffmpegWorker: UtilityProcess | null = null;
let workerReady = false;
let workerStartupPromise: Promise<void> | null = null;
let resolveWorkerStartup: (() => void) | null = null;
let rejectWorkerStartup: ((error: Error) => void) | null = null;
let activeJob: QueuedWorkerJob<unknown> | null = null;
let isDisposing = false;
let cancellationError: Error | null = null;
const queuedJobs: QueuedWorkerJob<unknown>[] = [];

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

function rejectQueuedJobsBySource(source: FfmpegWorkerJobSource, error: Error): void {
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
    if (!ffmpegWorker || !workerReady || activeJob || queuedJobs.length === 0) {
        return;
    }

    activeJob = queuedJobs.shift() ?? null;
    if (!activeJob) {
        return;
    }

    ffmpegWorker.postMessage(activeJob.request);
}

function handleWorkerMessage(message: FfmpegWorkerMessage): void {
    if (!message) return;

    if (message.type === 'worker:ready') {
        workerReady = true;
        resolveWorkerStartup?.();
        resetStartupState();
        dispatchNextJob();
        return;
    }

    if (!activeJob || message.requestId !== activeJob.request.requestId) {
        log.warn(`Received unexpected worker message for request: ${'requestId' in message ? message.requestId : 'unknown'}`);
        return;
    }

    const completedJob = activeJob;
    activeJob = null;

    if (message.type === 'worker:job-failure') {
        completedJob.reject(new Error(message.error));
    } else {
        completedJob.resolve(completedJob.mapSuccess(message));
    }

    dispatchNextJob();
}

function handleWorkerExit(code: number): void {
    const exitError = new Error(`Ffmpeg worker exited with code ${code}.`);
    const wasDisposing = isDisposing;
    const workerCancellationError = cancellationError;
    const cancelledJob = activeJob;

    ffmpegWorker = null;
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
        log.info(`Cancelled ffmpeg worker job: ${cancelledJob.request.requestId}`);
        cancelledJob.reject(workerCancellationError);

        if (queuedJobs.length > 0) {
            void ensureWorkerReady()
                .then(() => {
                    dispatchNextJob();
                })
                .catch((error) => {
                    const restartError = toError(error);
                    log.warn(`Failed to restart ffmpeg worker after cancellation: ${restartError.message}`);
                    rejectAllJobs(restartError);
                });
        }
        return;
    }

    log.warn(exitError.message);
    rejectAllJobs(exitError);
}

function ensureWorkerReady(): Promise<void> {
    if (ffmpegWorker && workerReady) {
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
                serviceName: 'ffmpeg-utility-worker',
                stdio: 'pipe',
            });

            ffmpegWorker = worker;
            workerReady = false;
            isDisposing = false;

            worker.on('spawn', () => {
                log.info(`Ffmpeg worker spawned (pid=${worker.pid ?? 'unknown'}).`);
            });
            worker.on('message', (message) => {
                handleWorkerMessage(message as FfmpegWorkerMessage);
            });
            worker.on('exit', (code) => {
                handleWorkerExit(code);
            });
            worker.on('error', (type, location, report) => {
                log.error(`Ffmpeg worker fatal error: ${type} ${location}`, report);
            });

            worker.stdout?.on('data', (chunk) => {
                flushWorkerStream('info', chunk);
            });
            worker.stderr?.on('data', (chunk) => {
                flushWorkerStream('warn', chunk);
            });
        } catch (error) {
            const startupError = toError(error);
            ffmpegWorker = null;
            workerReady = false;
            resetStartupState();
            reject(startupError);
        }
    });

    return workerStartupPromise;
}

function enqueueWorkerJob<TResult>(
    request: FfmpegWorkerRequest,
    mapSuccess: (message: FfmpegWorkerSuccessMessage) => TResult
): Promise<TResult> {
    return new Promise((resolve, reject) => {
        queuedJobs.push({
            request,
            resolve,
            reject,
            mapSuccess,
        });

        void ensureWorkerReady()
            .then(() => {
                dispatchNextJob();
            })
            .catch((error) => {
                const startupError = toError(error);
                log.warn(`Failed to start ffmpeg worker: ${startupError.message}`);
                rejectAllJobs(startupError);
            });
    });
}

function expectPreviewFrameSuccess(message: FfmpegWorkerSuccessMessage): string[] | null {
    if (message.type !== 'worker:preview-job-success') {
        throw new Error(`Unexpected ffmpeg worker success message: ${message.type}`);
    }
    return message.framePaths;
}

function expectVideoThumbnailSuccess(message: FfmpegWorkerSuccessMessage): string | null {
    if (message.type !== 'worker:video-thumbnail-job-success') {
        throw new Error(`Unexpected ffmpeg worker success message: ${message.type}`);
    }
    return message.thumbnailPath;
}

function expectVideoDurationSuccess(message: FfmpegWorkerSuccessMessage): number {
    if (message.type !== 'worker:video-duration-job-success') {
        throw new Error(`Unexpected ffmpeg worker success message: ${message.type}`);
    }
    return message.durationSeconds;
}

function expectMediaMetadataSuccess(message: FfmpegWorkerSuccessMessage) {
    if (message.type !== 'worker:media-metadata-job-success') {
        throw new Error(`Unexpected ffmpeg worker success message: ${message.type}`);
    }
    return message.metadata;
}

export async function runPreviewFrameJob(request: PreviewFrameJobRequest): Promise<string[] | null> {
    return enqueueWorkerJob(request, expectPreviewFrameSuccess);
}

export async function runVideoThumbnailJob(request: VideoThumbnailJobRequest): Promise<string | null> {
    return enqueueWorkerJob(request, expectVideoThumbnailSuccess);
}

export async function runVideoDurationJob(request: VideoDurationJobRequest): Promise<number> {
    return enqueueWorkerJob(request, expectVideoDurationSuccess);
}

export async function runMediaMetadataJob(request: MediaMetadataJobRequest): Promise<ExtractedMediaMetadata | null> {
    return enqueueWorkerJob(request, expectMediaMetadataSuccess);
}

export function isFfmpegWorkerJobCancelledError(error: unknown): boolean {
    return toError(error).message === FFMPEG_WORKER_JOB_CANCELLED_MESSAGE;
}

export function isPreviewFrameJobCancelledError(error: unknown): boolean {
    return isFfmpegWorkerJobCancelledError(error);
}

export function cancelFfmpegJobsBySource(source: FfmpegWorkerJobSource): void {
    const cancelError = new Error(FFMPEG_WORKER_JOB_CANCELLED_MESSAGE);
    rejectQueuedJobsBySource(source, cancelError);

    if (!activeJob || activeJob.request.jobSource !== source) {
        return;
    }

    cancellationError = cancelError;
    ffmpegWorker?.kill();
}

export function cancelPreviewFrameJobsBySource(source: FfmpegWorkerJobSource): void {
    cancelFfmpegJobsBySource(source);
}

export function disposeFfmpegWorker(): void {
    const disposeError = new Error('Ffmpeg worker disposed.');
    const hadWorker = Boolean(ffmpegWorker);
    isDisposing = true;
    cancellationError = null;

    if (ffmpegWorker) {
        ffmpegWorker.kill();
        ffmpegWorker = null;
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

export function disposePreviewFrameWorker(): void {
    disposeFfmpegWorker();
}
