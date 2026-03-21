import { utilityProcess, type UtilityProcess } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger';
import { resolvePreviewWorkerLane, type PreviewWorkerLane } from '../../src/shared/previewWorkerQueue';
import type {
    AudioThumbnailJobRequest,
    MediaMetadataJobRequest,
    PreviewFrameJobRequest,
    PreviewFrameWorkerMessage,
    VideoDurationJobRequest,
    VideoThumbnailJobRequest,
    WorkerJobFailure,
    ExtractedMediaMetadata,
} from '../utility/previewFrameWorkerTypes';

const log = logger.scope('PreviewFrameWorkerService');
const PREVIEW_FRAME_JOB_TIMEOUT_MS = 90_000;

type WorkerRequest =
    | PreviewFrameJobRequest
    | VideoThumbnailJobRequest
    | VideoDurationJobRequest
    | AudioThumbnailJobRequest
    | MediaMetadataJobRequest;

type WorkerResult = string[] | string | number | ExtractedMediaMetadata | null;

interface QueuedPreviewFrameJob {
    request: WorkerRequest;
    resolve: (result: WorkerResult) => void;
    reject: (error: Error) => void;
}

interface WorkerLaneState {
    lane: PreviewWorkerLane;
    serviceName: string;
    worker: UtilityProcess | null;
    workerReady: boolean;
    workerStartupPromise: Promise<void> | null;
    resolveWorkerStartup: (() => void) | null;
    rejectWorkerStartup: ((error: Error) => void) | null;
    activeJob: QueuedPreviewFrameJob | null;
    activeJobTimeout: NodeJS.Timeout | null;
    isDisposing: boolean;
    queuedJobs: QueuedPreviewFrameJob[];
}

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

function createWorkerLaneState(lane: PreviewWorkerLane, serviceName: string): WorkerLaneState {
    return {
        lane,
        serviceName,
        worker: null,
        workerReady: false,
        workerStartupPromise: null,
        resolveWorkerStartup: null,
        rejectWorkerStartup: null,
        activeJob: null,
        activeJobTimeout: null,
        isDisposing: false,
        queuedJobs: [],
    };
}

const workerLanes: Record<PreviewWorkerLane, WorkerLaneState> = {
    heavy: createWorkerLaneState('heavy', 'ffmpeg-preview-frame-worker-heavy'),
    read: createWorkerLaneState('read', 'ffmpeg-preview-frame-worker-read'),
};

function toError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
}

function clearActiveJobTimeout(state: WorkerLaneState): void {
    if (state.activeJobTimeout) {
        clearTimeout(state.activeJobTimeout);
        state.activeJobTimeout = null;
    }
}

function flushWorkerStream(state: WorkerLaneState, level: 'info' | 'warn', chunk: unknown): void {
    const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk ?? '');
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

    lines.forEach((line) => {
        if (level === 'warn') {
            log.warn(`[${state.lane}] ${line}`);
        } else {
            log.info(`[${state.lane}] ${line}`);
        }
    });
}

function resetStartupState(state: WorkerLaneState): void {
    state.workerStartupPromise = null;
    state.resolveWorkerStartup = null;
    state.rejectWorkerStartup = null;
}

function rejectAllJobs(state: WorkerLaneState, error: Error): void {
    clearActiveJobTimeout(state);

    if (state.activeJob) {
        state.activeJob.reject(error);
        state.activeJob = null;
    }

    while (state.queuedJobs.length > 0) {
        const queuedJob = state.queuedJobs.shift();
        queuedJob?.reject(error);
    }
}

function dispatchNextJob(state: WorkerLaneState): void {
    if (!state.worker || !state.workerReady || state.activeJob || state.queuedJobs.length === 0) {
        return;
    }

    state.activeJob = state.queuedJobs.shift() ?? null;
    if (!state.activeJob) {
        return;
    }

    state.activeJobTimeout = setTimeout(() => {
        const requestId = state.activeJob?.request.requestId ?? 'unknown';
        const timeoutError = new Error(
            `Preview frame worker timed out after ${PREVIEW_FRAME_JOB_TIMEOUT_MS}ms (lane=${state.lane}, requestId=${requestId}).`
        );
        log.warn(timeoutError.message);

        state.worker?.kill();
        state.worker = null;
        state.workerReady = false;
        rejectAllJobs(state, timeoutError);
    }, PREVIEW_FRAME_JOB_TIMEOUT_MS);

    state.worker.postMessage(state.activeJob.request);
}

function handleWorkerMessage(state: WorkerLaneState, message: PreviewFrameWorkerMessage): void {
    if (!message) return;

    if (message.type === 'worker:ready') {
        state.workerReady = true;
        state.resolveWorkerStartup?.();
        resetStartupState(state);
        dispatchNextJob(state);
        return;
    }

    if (!state.activeJob || message.requestId !== state.activeJob.request.requestId) {
        const unexpectedMessage = message as WorkerJobFailure;
        log.warn(`[${state.lane}] Received unexpected worker message for request: ${unexpectedMessage.requestId ?? 'unknown'}`);
        return;
    }

    clearActiveJobTimeout(state);

    const completedJob = state.activeJob;
    state.activeJob = null;

    switch (message.type) {
        case 'worker:preview-job-success':
            completedJob.resolve(message.framePaths);
            break;
        case 'worker:video-thumbnail-job-success':
            completedJob.resolve(message.thumbnailPath);
            break;
        case 'worker:video-duration-job-success':
            completedJob.resolve(message.durationSeconds);
            break;
        case 'worker:audio-thumbnail-job-success':
            completedJob.resolve(message.thumbnailPath);
            break;
        case 'worker:media-metadata-job-success':
            completedJob.resolve(message.metadata);
            break;
        case 'worker:job-failure':
            completedJob.reject(new Error(message.error));
            break;
        default:
            completedJob.reject(new Error(`Unsupported worker message: ${(message as { type?: string }).type ?? 'unknown'}`));
            break;
    }

    dispatchNextJob(state);
}

function handleWorkerExit(state: WorkerLaneState, code: number): void {
    clearActiveJobTimeout(state);

    const exitError = new Error(`Preview frame worker exited with code ${code} (lane=${state.lane}).`);
    const wasDisposing = state.isDisposing;

    state.worker = null;
    state.workerReady = false;

    if (state.workerStartupPromise) {
        state.rejectWorkerStartup?.(exitError);
        resetStartupState(state);
    }

    if (wasDisposing) {
        state.isDisposing = false;
        return;
    }

    log.warn(exitError.message);
    rejectAllJobs(state, exitError);
}

function ensureWorkerReady(state: WorkerLaneState): Promise<void> {
    if (state.worker && state.workerReady) {
        return Promise.resolve();
    }

    if (state.workerStartupPromise) {
        return state.workerStartupPromise;
    }

    state.workerStartupPromise = new Promise((resolve, reject) => {
        state.resolveWorkerStartup = resolve;
        state.rejectWorkerStartup = reject;

        try {
            const worker = utilityProcess.fork(workerScriptPath, [], {
                serviceName: state.serviceName,
                stdio: 'pipe',
            });

            state.worker = worker;
            state.workerReady = false;
            state.isDisposing = false;

            worker.on('spawn', () => {
                log.info(`Preview frame worker spawned (lane=${state.lane}, pid=${worker.pid ?? 'unknown'}).`);
            });
            worker.on('message', (message) => {
                handleWorkerMessage(state, message as PreviewFrameWorkerMessage);
            });
            worker.on('exit', (code) => {
                handleWorkerExit(state, code);
            });
            worker.on('error', (type, location, report) => {
                log.error(`Preview frame worker fatal error (lane=${state.lane}): ${type} ${location}`, report);
            });

            worker.stdout?.on('data', (chunk) => {
                flushWorkerStream(state, 'info', chunk);
            });
            worker.stderr?.on('data', (chunk) => {
                flushWorkerStream(state, 'warn', chunk);
            });
        } catch (error) {
            const startupError = toError(error);
            state.worker = null;
            state.workerReady = false;
            resetStartupState(state);
            reject(startupError);
        }
    });

    return state.workerStartupPromise;
}

function enqueueJob<T extends WorkerResult>(
    request: WorkerRequest,
    normalizeResult: (result: WorkerResult) => T
): Promise<T> {
    const lane = resolvePreviewWorkerLane(request.type);
    const state = workerLanes[lane];

    return new Promise((resolve, reject) => {
        state.queuedJobs.push({
            request,
            resolve: (result) => resolve(normalizeResult(result)),
            reject,
        });

        void ensureWorkerReady(state)
            .then(() => {
                dispatchNextJob(state);
            })
            .catch((error) => {
                const startupError = toError(error);
                log.warn(`Failed to start preview frame worker (lane=${state.lane}): ${startupError.message}`);
                rejectAllJobs(state, startupError);
            });
    });
}

export async function runPreviewFrameJob(request: PreviewFrameJobRequest): Promise<string[] | null> {
    return enqueueJob(request, (result) => (result as string[] | null) ?? null);
}

export async function runVideoThumbnailJob(request: VideoThumbnailJobRequest): Promise<string | null> {
    return enqueueJob(request, (result) => (result as string | null) ?? null);
}

export async function runVideoDurationJob(request: VideoDurationJobRequest): Promise<number> {
    return enqueueJob(request, (result) => (result as number | null) ?? 0);
}

export async function runAudioThumbnailJob(request: AudioThumbnailJobRequest): Promise<string | null> {
    return enqueueJob(request, (result) => (result as string | null) ?? null);
}

export async function runMediaMetadataJob(request: MediaMetadataJobRequest): Promise<ExtractedMediaMetadata | null> {
    return enqueueJob(request, (result) => (result as ExtractedMediaMetadata | null) ?? null);
}

export function disposePreviewFrameWorker(): void {
    const disposeError = new Error('Preview frame worker disposed.');

    for (const state of Object.values(workerLanes)) {
        const hadWorker = Boolean(state.worker);
        state.isDisposing = true;

        clearActiveJobTimeout(state);

        if (state.worker) {
            state.worker.kill();
            state.worker = null;
        }

        state.workerReady = false;

        if (state.workerStartupPromise) {
            state.rejectWorkerStartup?.(disposeError);
            resetStartupState(state);
        }

        rejectAllJobs(state, disposeError);

        if (!hadWorker) {
            state.isDisposing = false;
        }
    }
}
