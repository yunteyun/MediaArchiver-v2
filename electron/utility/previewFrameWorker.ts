import ffmpeg from 'fluent-ffmpeg';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import type {
    PreviewFrameJobFailure,
    PreviewFrameJobRequest,
    PreviewFrameJobSuccess,
    PreviewFrameWorkerReady,
} from './previewFrameWorkerTypes';

const require = createRequire(import.meta.url);
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;

if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath.replace('app.asar', 'app.asar.unpacked'));
}
if (ffprobePath) {
    ffmpeg.setFfprobePath(ffprobePath.replace('app.asar', 'app.asar.unpacked'));
}

function postReady(): void {
    const readyMessage: PreviewFrameWorkerReady = { type: 'worker:ready' };
    process.parentPort?.postMessage(readyMessage);
}

function postSuccess(requestId: string, framePaths: string[] | null): void {
    const successMessage: PreviewFrameJobSuccess = {
        type: 'worker:preview-job-success',
        requestId,
        framePaths,
    };
    process.parentPort?.postMessage(successMessage);
}

function postFailure(requestId: string, error: string): void {
    const failureMessage: PreviewFrameJobFailure = {
        type: 'worker:preview-job-failure',
        requestId,
        error,
    };
    process.parentPort?.postMessage(failureMessage);
}

function collectGeneratedFramePaths(frameDir: string, frameCount: number): string[] {
    const expectedFramePaths: string[] = [];

    for (let i = 1; i <= frameCount; i += 1) {
        const framePath = path.join(frameDir, `frame_${i.toString().padStart(2, '0')}.webp`);
        if (fs.existsSync(framePath)) {
            expectedFramePaths.push(framePath);
        }
    }

    if (expectedFramePaths.length > 0) {
        return expectedFramePaths;
    }

    return fs.readdirSync(frameDir)
        .filter((fileName) => fileName.endsWith('.webp'))
        .sort()
        .map((fileName) => path.join(frameDir, fileName));
}

function buildTimemarks(frameCount: number): string[] {
    if (frameCount <= 0) return [];
    if (frameCount === 1) return ['50.0%'];

    const timemarks: string[] = [];
    for (let i = 0; i < frameCount; i += 1) {
        const percentage = 5 + ((i * 90) / (frameCount - 1));
        timemarks.push(`${percentage.toFixed(1)}%`);
    }
    return timemarks;
}

async function getVideoDurationSeconds(videoPath: string): Promise<number> {
    return new Promise((resolve) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            const duration = metadata?.format?.duration;
            if (err || !duration) {
                resolve(0);
                return;
            }
            resolve(duration);
        });
    });
}

async function runPreviewJob(request: PreviewFrameJobRequest): Promise<string[] | null> {
    if (request.frameCount <= 0) {
        return null;
    }

    if (!fs.existsSync(request.frameDir)) {
        fs.mkdirSync(request.frameDir, { recursive: true });
    }

    const durationSec = await getVideoDurationSeconds(request.videoPath);
    if (durationSec < 1) {
        return null;
    }

    const timemarks = buildTimemarks(request.frameCount);

    return new Promise((resolve, reject) => {
        ffmpeg(request.videoPath)
            .outputOptions([
                '-threads', '1',
                '-vcodec', 'libwebp',
                '-quality', String(request.quality),
            ])
            .screenshots({
                count: request.frameCount,
                folder: request.frameDir,
                filename: 'frame_%02d.webp',
                size: `${request.frameWidth}x?`,
                timemarks,
            })
            .on('end', () => {
                try {
                    const framePaths = collectGeneratedFramePaths(request.frameDir, request.frameCount);
                    resolve(framePaths.length > 0 ? framePaths : null);
                } catch (error) {
                    reject(error);
                }
            })
            .on('error', (error) => {
                reject(error);
            });
    });
}

if (!process.parentPort) {
    throw new Error('Preview frame worker requires process.parentPort.');
}

process.parentPort.on('message', async (event) => {
    const message = event.data as PreviewFrameJobRequest;
    if (!message || message.type !== 'worker:run-preview-job') {
        return;
    }

    try {
        const framePaths = await runPreviewJob(message);
        postSuccess(message.requestId, framePaths);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[PreviewFrameWorker] ${errorMessage}`);
        postFailure(message.requestId, errorMessage);
    }
});

postReady();
