import ffmpeg from 'fluent-ffmpeg';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import type {
    ExtractedMediaMetadata,
    FfmpegWorkerJobFailure,
    FfmpegWorkerRequest,
    FfmpegWorkerReady,
    MediaMetadataJobRequest,
    MediaMetadataJobSuccess,
    PreviewFrameJobRequest,
    PreviewFrameJobSuccess,
    VideoDurationJobRequest,
    VideoDurationJobSuccess,
    VideoThumbnailJobRequest,
    VideoThumbnailJobSuccess,
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
    const readyMessage: FfmpegWorkerReady = { type: 'worker:ready' };
    process.parentPort?.postMessage(readyMessage);
}

function postPreviewSuccess(requestId: string, framePaths: string[] | null): void {
    const successMessage: PreviewFrameJobSuccess = {
        type: 'worker:preview-job-success',
        requestId,
        framePaths,
    };
    process.parentPort?.postMessage(successMessage);
}

function postVideoThumbnailSuccess(requestId: string, thumbnailPath: string | null): void {
    const successMessage: VideoThumbnailJobSuccess = {
        type: 'worker:video-thumbnail-job-success',
        requestId,
        thumbnailPath,
    };
    process.parentPort?.postMessage(successMessage);
}

function postVideoDurationSuccess(requestId: string, durationSeconds: number): void {
    const successMessage: VideoDurationJobSuccess = {
        type: 'worker:video-duration-job-success',
        requestId,
        durationSeconds,
    };
    process.parentPort?.postMessage(successMessage);
}

function postMediaMetadataSuccess(requestId: string, metadata: ExtractedMediaMetadata | null): void {
    const successMessage: MediaMetadataJobSuccess = {
        type: 'worker:media-metadata-job-success',
        requestId,
        metadata,
    };
    process.parentPort?.postMessage(successMessage);
}

function postFailure(requestId: string, error: string): void {
    const failureMessage: FfmpegWorkerJobFailure = {
        type: 'worker:job-failure',
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

function parseFps(value?: string): number | undefined {
    if (!value || value === '0/0') return undefined;
    const [num, den] = value.split('/').map(Number);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return undefined;
    const fps = num / den;
    return Number.isFinite(fps) ? Number(fps.toFixed(3)) : undefined;
}

async function getDurationSeconds(filePath: string): Promise<number> {
    return new Promise((resolve) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
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

    const durationSec = await getDurationSeconds(request.videoPath);
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

async function runVideoThumbnailJob(request: VideoThumbnailJobRequest): Promise<string | null> {
    const outputDir = path.dirname(request.outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const durationSec = await getDurationSeconds(request.videoPath);
    const seekSec = durationSec > 1 ? Math.min(durationSec * 0.1, 300) : 0;

    return new Promise((resolve, reject) => {
        ffmpeg(request.videoPath)
            .outputOptions([
                '-vframes', '1',
                '-vf', `scale=${request.resolution}:-1`,
                '-vcodec', 'libwebp',
                '-quality', String(request.quality),
                '-threads', '1',
            ])
            .seekInput(seekSec)
            .output(request.outputPath)
            .on('end', () => resolve(request.outputPath))
            .on('error', (error) => reject(error))
            .run();
    });
}

async function runVideoDurationJob(request: VideoDurationJobRequest): Promise<number> {
    return getDurationSeconds(request.filePath);
}

async function runMediaMetadataJob(request: MediaMetadataJobRequest): Promise<ExtractedMediaMetadata | null> {
    return new Promise((resolve) => {
        ffmpeg.ffprobe(request.filePath, (err, metadata) => {
            if (err || !metadata) {
                resolve(null);
                return;
            }

            const videoStream = metadata.streams?.find((stream) => stream.codec_type === 'video');
            const audioStream = metadata.streams?.find((stream) => stream.codec_type === 'audio');
            const format = metadata.format;

            const extracted: ExtractedMediaMetadata = {};

            if (typeof videoStream?.width === 'number') extracted.width = videoStream.width;
            if (typeof videoStream?.height === 'number') extracted.height = videoStream.height;

            if (typeof format?.format_name === 'string' && format.format_name) {
                extracted.format = format.format_name;
                extracted.container = format.format_name;
            }

            if (typeof videoStream?.codec_name === 'string' && videoStream.codec_name) {
                extracted.videoCodec = videoStream.codec_name;
                extracted.codec = videoStream.codec_name;
            }

            if (typeof audioStream?.codec_name === 'string' && audioStream.codec_name) {
                extracted.audioCodec = audioStream.codec_name;
            }

            const fps = parseFps(
                typeof videoStream?.avg_frame_rate === 'string' && videoStream.avg_frame_rate !== '0/0'
                    ? videoStream.avg_frame_rate
                    : typeof videoStream?.r_frame_rate === 'string'
                        ? videoStream.r_frame_rate
                        : undefined
            );
            if (fps !== undefined) extracted.fps = fps;

            const bitrate = Number(format?.bit_rate);
            if (Number.isFinite(bitrate) && bitrate > 0) {
                extracted.bitrate = bitrate;
            }

            resolve(Object.keys(extracted).length > 0 ? extracted : null);
        });
    });
}

if (!process.parentPort) {
    throw new Error('Ffmpeg worker requires process.parentPort.');
}

process.parentPort.on('message', async (event) => {
    const message = event.data as FfmpegWorkerRequest;
    if (!message) {
        return;
    }

    try {
        switch (message.type) {
        case 'worker:run-preview-job': {
            const framePaths = await runPreviewJob(message);
            postPreviewSuccess(message.requestId, framePaths);
            break;
        }
        case 'worker:run-video-thumbnail-job': {
            const thumbnailPath = await runVideoThumbnailJob(message);
            postVideoThumbnailSuccess(message.requestId, thumbnailPath);
            break;
        }
        case 'worker:read-video-duration-job': {
            const durationSeconds = await runVideoDurationJob(message);
            postVideoDurationSuccess(message.requestId, durationSeconds);
            break;
        }
        case 'worker:read-media-metadata-job': {
            const metadata = await runMediaMetadataJob(message);
            postMediaMetadataSuccess(message.requestId, metadata);
            break;
        }
        default:
            break;
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[FfmpegWorker] ${errorMessage}`);
        postFailure(message.requestId, errorMessage);
    }
});

postReady();
