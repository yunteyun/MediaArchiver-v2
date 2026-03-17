import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { isArchive, getArchiveThumbnail } from './archiveHandler';
import { dbManager } from './databaseManager';
import { logger } from './logger';
import { createPreviewFramesDir, createThumbnailOutputPath } from './thumbnailPaths';
import { THUMBNAIL_WEBP_QUALITY } from './thumbnailQuality';
import { logPerf, startPerfTimer } from './perfDebug';
import { runAudioThumbnailJob, runMediaMetadataJob, runPreviewFrameJob, runVideoDurationJob, runVideoThumbnailJob } from './previewFrameWorkerService';
import type {
    AudioThumbnailJobRequest,
    ExtractedMediaMetadata,
    MediaMetadataJobRequest,
    PreviewFrameJobRequest,
    VideoDurationJobRequest,
    VideoThumbnailJobRequest
} from '../utility/previewFrameWorkerTypes';

const log = logger.scope('Thumbnail');

// Phase 25: basePath から動的取得（モジュールロード時に確定させない）
function getCurrentProfileIdForThumbnails(): string | null {
    return dbManager.getCurrentProfileId();
}

// Configure ffmpeg/ffprobe paths
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;

if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath.replace('app.asar', 'app.asar.unpacked'));
}
if (ffprobePath) {
    ffmpeg.setFfprobePath(ffprobePath.replace('app.asar', 'app.asar.unpacked'));
}

function parseFps(value?: string): number | undefined {
    if (!value || value === '0/0') return undefined;
    const [num, den] = value.split('/').map(Number);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return undefined;
    const fps = num / den;
    return Number.isFinite(fps) ? Number(fps.toFixed(3)) : undefined;
}

export async function getMediaMetadata(filePath: string): Promise<ExtractedMediaMetadata | null> {
    const perfStartedAt = startPerfTimer();
    const request: MediaMetadataJobRequest = {
        type: 'worker:read-media-metadata-job',
        requestId: uuidv4(),
        filePath,
    };

    try {
        const metadata = await runMediaMetadataJob(request);
        logPerf('thumbnail.getMediaMetadata', perfStartedAt, {
            file: path.basename(filePath),
            ok: !!metadata,
            mode: 'worker'
        });
        return metadata;
    } catch (error) {
        const fallbackError = error instanceof Error ? error.message : String(error);
        log.warn(`Media metadata worker failed for ${path.basename(filePath)}. Falling back to inline read. ${fallbackError}`);
        logPerf('thumbnail.getMediaMetadata', perfStartedAt, {
            file: path.basename(filePath),
            ok: false,
            mode: 'worker-fallback',
            error: fallbackError
        });
        return getMediaMetadataInline(filePath);
    }
}

async function getMediaMetadataInline(filePath: string): Promise<ExtractedMediaMetadata | null> {
    const perfStartedAt = startPerfTimer();
    return new Promise((resolve) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err || !metadata) {
                logPerf('thumbnail.getMediaMetadata', perfStartedAt, {
                    file: path.basename(filePath),
                    ok: false,
                    mode: 'inline'
                });
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

            const result = Object.keys(extracted).length > 0 ? extracted : null;
            logPerf('thumbnail.getMediaMetadata', perfStartedAt, {
                file: path.basename(filePath),
                ok: !!result,
                hasVideo: !!videoStream,
                hasAudio: !!audioStream,
                mode: 'inline'
            });
            resolve(result);
        });
    });
}

export async function generateThumbnail(filePath: string, resolution: number = 320): Promise<string | null> {
    const ext = path.extname(filePath).toLowerCase();

    try {
        // Archive files (zip, rar, 7z, cbz, cbr)
        if (isArchive(filePath)) {
            return getArchiveThumbnail(filePath);
        }
        // Video files
        if (['.mp4', '.webm', '.mov', '.avi', '.mkv'].includes(ext)) {
            return generateVideoThumbnail(filePath, resolution);
        }
        // Image files
        if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(ext)) {
            return generateImageThumbnail(filePath, resolution);
        }
        // Audio files - アルバムアート抽出を試みる
        if (['.mp3', '.wav', '.flac', '.m4a', '.ogg', '.aac', '.wma'].includes(ext)) {
            return generateAudioThumbnail(filePath);
        }
    } catch (e) {
        log.error(`Failed to generate thumbnail for ${filePath}:`, e);
    }
    return null;
}

export async function generateVideoThumbnailAtTime(
    videoPath: string,
    timeSeconds: number,
    resolution: number = 320
): Promise<string | null> {
    const outputPath = createThumbnailOutputPath('manual', '.webp', getCurrentProfileIdForThumbnails());
    const perfStartedAt = startPerfTimer();

    try {
        const normalizedTime = Number.isFinite(timeSeconds) ? Math.max(0, timeSeconds) : 0;
        return await new Promise((resolve) => {
            ffmpeg(videoPath)
                .seekInput(normalizedTime)
                .outputOptions([
                    '-vframes', '1',
                    '-vf', `scale=${resolution}:-1`,
                    '-vcodec', 'libwebp',
                    '-quality', String(THUMBNAIL_WEBP_QUALITY.video),
                    '-threads', '1',
                ])
                .output(outputPath)
                .on('end', () => {
                    logPerf('thumbnail.generateVideoThumbnailAtTime', perfStartedAt, {
                        file: path.basename(videoPath),
                        ok: true,
                        mode: 'inline',
                        timeSeconds: Number(normalizedTime.toFixed(1)),
                    });
                    resolve(outputPath);
                })
                .on('error', (error) => {
                    log.error('Error generating representative thumbnail:', error);
                    logPerf('thumbnail.generateVideoThumbnailAtTime', perfStartedAt, {
                        file: path.basename(videoPath),
                        ok: false,
                        mode: 'inline',
                        timeSeconds: Number(normalizedTime.toFixed(1)),
                    });
                    resolve(null);
                })
                .run();
        });
    } catch (error) {
        log.error('generateVideoThumbnailAtTime exception:', error);
        logPerf('thumbnail.generateVideoThumbnailAtTime', perfStartedAt, {
            file: path.basename(videoPath),
            ok: false,
            mode: 'inline',
            timeSeconds: Number((Number.isFinite(timeSeconds) ? timeSeconds : 0).toFixed(1)),
        });
        return null;
    }
}

/**
 * 動画サムネイルを WebP で生成
 * ffmpeg の screenshots API は PNG 固定のため -vcodec libwebp 方式を使用
 * Phase 26: seekInput('%') を廃止 → ffprobe で秒数を取得して絶対値でシーク（Windowsでの Invalid argument 回避）
 */
async function generateVideoThumbnail(videoPath: string, resolution: number = 320): Promise<string | null> {
    const outputPath = createThumbnailOutputPath('video', '.webp', getCurrentProfileIdForThumbnails());
    const perfStartedAt = startPerfTimer();
    const request: VideoThumbnailJobRequest = {
        type: 'worker:run-video-thumbnail-job',
        requestId: uuidv4(),
        videoPath,
        outputPath,
        resolution,
        quality: THUMBNAIL_WEBP_QUALITY.video,
    };

    try {
        const thumbnailPath = await runVideoThumbnailJob(request);
        logPerf('thumbnail.generateVideoThumbnail', perfStartedAt, {
            file: path.basename(videoPath),
            resolution,
            ok: thumbnailPath !== null,
            mode: 'worker'
        });
        return thumbnailPath;
    } catch (e) {
        const fallbackError = e instanceof Error ? e.message : String(e);
        log.warn(`Video thumbnail worker failed for ${path.basename(videoPath)}. Falling back to inline generation. ${fallbackError}`);
        logPerf('thumbnail.generateVideoThumbnail', perfStartedAt, {
            file: path.basename(videoPath),
            resolution,
            ok: false,
            mode: 'worker-fallback',
            error: fallbackError
        });
        return generateVideoThumbnailInline(videoPath, resolution, outputPath);
    }
}

async function generateVideoThumbnailInline(
    videoPath: string,
    resolution: number = 320,
    outputPath?: string
): Promise<string | null> {
    const resolvedOutputPath = outputPath ?? createThumbnailOutputPath('video', '.webp', getCurrentProfileIdForThumbnails());
    const perfStartedAt = startPerfTimer();

    try {
        const durationSec = await new Promise<number>((resolve) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err || !metadata?.format?.duration) {
                    resolve(0);
                } else {
                    resolve(metadata.format.duration);
                }
            });
        });

        const seekSec = durationSec > 1 ? Math.min(durationSec * 0.1, 300) : 0;

        return await new Promise((resolve) => {
            ffmpeg(videoPath)
                .outputOptions([
                    '-vframes', '1',
                    '-vf', `scale=${resolution}:-1`,
                    '-vcodec', 'libwebp',
                    '-quality', String(THUMBNAIL_WEBP_QUALITY.video),
                    '-threads', '1',
                ])
                .seekInput(seekSec)
                .output(resolvedOutputPath)
                .on('end', () => {
                    logPerf('thumbnail.generateVideoThumbnail', perfStartedAt, {
                        file: path.basename(videoPath),
                        resolution,
                        ok: true,
                        mode: 'inline'
                    });
                    resolve(resolvedOutputPath);
                })
                .on('error', (err) => {
                    log.error('Error generating video thumbnail:', err);
                    logPerf('thumbnail.generateVideoThumbnail', perfStartedAt, {
                        file: path.basename(videoPath),
                        resolution,
                        ok: false,
                        mode: 'inline'
                    });
                    resolve(null);
                })
                .run();
        });
    } catch (e) {
        log.error('generateVideoThumbnail exception:', e);
        logPerf('thumbnail.generateVideoThumbnail', perfStartedAt, {
            file: path.basename(videoPath),
            resolution,
            ok: false,
            mode: 'inline'
        });
        return null;
    }
}

/**
 * 音声ファイルからアルバムアートを抽出
 * アルバムアートがない場合はnullを返す
 */
function generateAudioThumbnail(audioPath: string): Promise<string | null> {
    const outputPath = createThumbnailOutputPath('audio', '.webp', getCurrentProfileIdForThumbnails());
    const perfStartedAt = startPerfTimer();
    const request: AudioThumbnailJobRequest = {
        type: 'worker:run-audio-thumbnail-job',
        requestId: uuidv4(),
        audioPath,
        outputPath,
    };

    return runAudioThumbnailJob(request)
        .then((thumbnailPath) => {
            logPerf('thumbnail.generateAudioThumbnail', perfStartedAt, {
                file: path.basename(audioPath),
                ok: thumbnailPath !== null,
                mode: 'worker'
            });
            return thumbnailPath;
        })
        .catch((error) => {
            const fallbackError = error instanceof Error ? error.message : String(error);
            log.warn(`Audio thumbnail worker failed for ${path.basename(audioPath)}. Falling back to inline extraction. ${fallbackError}`);
            logPerf('thumbnail.generateAudioThumbnail', perfStartedAt, {
                file: path.basename(audioPath),
                ok: false,
                mode: 'worker-fallback',
                error: fallbackError
            });
            return generateAudioThumbnailInline(audioPath, outputPath);
        });
}

function generateAudioThumbnailInline(audioPath: string, outputPath?: string): Promise<string | null> {
    const resolvedOutputPath = outputPath ?? createThumbnailOutputPath('audio', '.webp', getCurrentProfileIdForThumbnails());
    const perfStartedAt = startPerfTimer();

    return new Promise((resolve) => {
        ffmpeg(audioPath)
            .outputOptions(['-an', '-vcodec', 'copy'])
            .output(resolvedOutputPath)
            .on('end', () => {
                logPerf('thumbnail.generateAudioThumbnail', perfStartedAt, {
                    file: path.basename(audioPath),
                    ok: true,
                    mode: 'inline'
                });
                resolve(resolvedOutputPath);
            })
            .on('error', () => {
                logPerf('thumbnail.generateAudioThumbnail', perfStartedAt, {
                    file: path.basename(audioPath),
                    ok: false,
                    mode: 'inline'
                });
                resolve(null);
            })
            .run();
    });
}

/**
 * 動画からプレビューフレームを生成（スクラブ用）
 * Phase 24: 320px x10枚 → 256px x6枚 WebP に軽量化
 * @param videoPath 動画ファイルパス
 * @param frameCount 生成するフレーム数（デフォルト: 6）
 * @returns カンマ区切りのフレームパス文字列
 */
export async function generatePreviewFrames(videoPath: string, frameCount: number = 6): Promise<string | null> {
    const perfStartedAt = startPerfTimer();
    const requestId = uuidv4();
    const videoId = uuidv4();
    const frameDir = createPreviewFramesDir(videoId, getCurrentProfileIdForThumbnails());

    const request: PreviewFrameJobRequest = {
        type: 'worker:run-preview-job',
        requestId,
        videoPath,
        frameDir,
        frameCount,
        frameWidth: 256,
        quality: THUMBNAIL_WEBP_QUALITY.previewFrame,
    };

    try {
        const framePaths = await runPreviewFrameJob(request);
        logPerf('thumbnail.generatePreviewFrames', perfStartedAt, {
            file: path.basename(videoPath),
            frameCount,
            generated: framePaths?.length ?? 0,
            ok: framePaths !== null,
            mode: 'worker'
        });
        return framePaths?.join(',') ?? null;
    } catch (error) {
        const fallbackError = error instanceof Error ? error.message : String(error);
        log.warn(`Preview frame worker failed for ${path.basename(videoPath)}. Falling back to inline generation. ${fallbackError}`);
        logPerf('thumbnail.generatePreviewFrames', perfStartedAt, {
            file: path.basename(videoPath),
            frameCount,
            ok: false,
            mode: 'worker-fallback',
            error: fallbackError
        });
        return generatePreviewFramesInline(videoPath, frameCount, frameDir);
    }
}

async function generatePreviewFramesInline(
    videoPath: string,
    frameCount: number = 6,
    frameDir?: string
): Promise<string | null> {
    const resolvedFrameDir = frameDir ?? createPreviewFramesDir(uuidv4(), getCurrentProfileIdForThumbnails());
    const perfStartedAt = startPerfTimer();

    try {
        // フレームディレクトリ作成
        if (!fs.existsSync(resolvedFrameDir)) {
            fs.mkdirSync(resolvedFrameDir, { recursive: true });
        }

        // 動画の長さを取得
        const durationSec = await new Promise<number>((resolve) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err || !metadata.format.duration) {
                    resolve(0);
                } else {
                    resolve(metadata.format.duration);
                }
            });
        });

        if (durationSec < 1) {
            logPerf('thumbnail.generatePreviewFrames', perfStartedAt, {
                file: path.basename(videoPath),
                frameCount,
                ok: false,
                reason: 'short-duration',
                mode: 'inline'
            });
            return null;
        }

        // タイムマークを生成（5%〜95%の範囲で均等に）
        const timemarks: string[] = [];
        for (let i = 0; i < frameCount; i++) {
            const percentage = 5 + (i * 90 / (frameCount - 1));
            timemarks.push(`${percentage.toFixed(1)}%`);
        }

        return new Promise((resolve) => {
            ffmpeg(videoPath)
                .outputOptions([
                    '-threads', '1',  // コイル鳴き軽減
                    '-vcodec', 'libwebp',
                    '-quality', String(THUMBNAIL_WEBP_QUALITY.previewFrame),
                ])
                .screenshots({
                    count: frameCount,
                    folder: resolvedFrameDir,
                    filename: 'frame_%02d.webp',
                    size: '256x?',  // Phase 24: 320→256px
                    timemarks: timemarks
                })
                .on('end', () => {
                    // ディレクトリの内容を確認
                    const filesInDir = fs.readdirSync(resolvedFrameDir);

                    // 生成されたフレームのパスを収集（想定形式: frame_01.webp）
                    const framePaths: string[] = [];
                    for (let i = 1; i <= frameCount; i++) {
                        const framePath = path.join(resolvedFrameDir, `frame_${i.toString().padStart(2, '0')}.webp`);
                        if (fs.existsSync(framePath)) {
                            framePaths.push(framePath);
                        }
                    }

                    if (framePaths.length > 0) {
                        logPerf('thumbnail.generatePreviewFrames', perfStartedAt, {
                            file: path.basename(videoPath),
                            frameCount,
                            generated: framePaths.length,
                            ok: true,
                            mode: 'inline'
                        });
                        resolve(framePaths.join(','));
                    } else {
                        // フォールバック: ディレクトリ内の全WebPを使用
                        const allWebps = filesInDir
                            .filter(f => f.endsWith('.webp'))
                            .sort()
                            .map(f => path.join(resolvedFrameDir, f));
                        logPerf('thumbnail.generatePreviewFrames', perfStartedAt, {
                            file: path.basename(videoPath),
                            frameCount,
                            generated: allWebps.length,
                            ok: allWebps.length > 0,
                            mode: 'inline'
                        });
                        resolve(allWebps.length > 0 ? allWebps.join(',') : null);
                    }
                })
                .on('error', (err) => {
                    log.error('Preview frames generation error:', err);
                    logPerf('thumbnail.generatePreviewFrames', perfStartedAt, {
                        file: path.basename(videoPath),
                        frameCount,
                        ok: false,
                        mode: 'inline'
                    });
                    resolve(null);
                });
        });
    } catch (e) {
        log.error('PreviewFrames exception:', e);
        logPerf('thumbnail.generatePreviewFrames', perfStartedAt, {
            file: path.basename(videoPath),
            frameCount,
            ok: false,
            mode: 'inline'
        });
        return null;
    }
}

/**
 * 静止画サムネイルを WebP で生成
 */
async function generateImageThumbnail(imagePath: string, resolution: number = 320): Promise<string | null> {
    const outputPath = createThumbnailOutputPath('image', '.webp', getCurrentProfileIdForThumbnails());

    try {
        await sharp(imagePath)
            .resize(resolution, null, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: THUMBNAIL_WEBP_QUALITY.image })
            .toFile(outputPath);
        return outputPath;
    } catch (err) {
        log.error('Error generating image thumbnail:', err);
        return null;
    }
}

export async function getVideoDuration(videoPath: string): Promise<string> {
    const perfStartedAt = startPerfTimer();
    const request: VideoDurationJobRequest = {
        type: 'worker:read-video-duration-job',
        requestId: uuidv4(),
        filePath: videoPath,
    };

    try {
        const durationSec = await runVideoDurationJob(request);
        logPerf('thumbnail.getVideoDuration', perfStartedAt, {
            file: path.basename(videoPath),
            ok: durationSec > 0,
            durationSec: Number(durationSec.toFixed(1)),
            mode: 'worker'
        });
        const minutes = Math.floor(durationSec / 60);
        const seconds = Math.floor(durationSec % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } catch (error) {
        const fallbackError = error instanceof Error ? error.message : String(error);
        log.warn(`Video duration worker failed for ${path.basename(videoPath)}. Falling back to inline read. ${fallbackError}`);
        logPerf('thumbnail.getVideoDuration', perfStartedAt, {
            file: path.basename(videoPath),
            ok: false,
            mode: 'worker-fallback',
            error: fallbackError
        });
        return getVideoDurationInline(videoPath);
    }
}

async function getVideoDurationInline(videoPath: string): Promise<string> {
    const perfStartedAt = startPerfTimer();
    return new Promise((resolve) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
                logPerf('thumbnail.getVideoDuration', perfStartedAt, {
                    file: path.basename(videoPath),
                    ok: false,
                    mode: 'inline'
                });
                resolve("");
                return;
            }
            const durationSec = metadata.format.duration || 0;
            const minutes = Math.floor(durationSec / 60);
            const seconds = Math.floor(durationSec % 60);
            logPerf('thumbnail.getVideoDuration', perfStartedAt, {
                file: path.basename(videoPath),
                ok: true,
                durationSec: Number(durationSec.toFixed(1)),
                mode: 'inline'
            });
            resolve(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        });
    });
}

// Binary check for animated GIF
async function isAnimatedGif(filePath: string): Promise<boolean> {
    try {
        const handle = await fs.promises.open(filePath, 'r');
        const buf = Buffer.alloc(1024 * 50); // Read first 50KB
        const { bytesRead } = await handle.read(buf, 0, buf.length, 0);
        await handle.close();

        if (bytesRead < 6) return false;

        const header = buf.toString('utf8', 0, 6);
        if (header !== 'GIF89a') return false; // GIF87a is static

        // Check for Netscape Loop Extension specific signature (very common for animated GIFs)
        if (buf.includes(Buffer.from('NETSCAPE2.0'), 0, 'utf8')) return true;

        // Count Graphic Control Extensions (0x21 0xF9)
        let gceCount = 0;
        let offset = 0;
        const limit = bytesRead;

        while (true) {
            offset = buf.indexOf(Buffer.from([0x21, 0xF9]), offset);
            if (offset === -1 || offset >= limit) break;
            gceCount++;
            offset += 2;
            if (gceCount > 1) {
                return true;
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}

// Binary check for animated WebP
async function isAnimatedWebp(filePath: string): Promise<boolean> {
    try {
        const handle = await fs.promises.open(filePath, 'r');
        const buf = Buffer.alloc(64); // Header needed is small
        await handle.read(buf, 0, 64, 0);
        await handle.close();

        // RIFF header
        if (buf.toString('utf8', 0, 4) !== 'RIFF') return false;
        if (buf.toString('utf8', 8, 12) !== 'WEBP') return false;

        // Iterate chunks to find VP8X
        let offset = 12;
        while (offset < buf.length - 8) {
            const tag = buf.toString('utf8', offset, offset + 4);
            const size = buf.readUInt32LE(offset + 4);

            if (tag === 'VP8X') {
                const flags = buf.readUInt8(offset + 8);
                // Bit 1 (value 2) is Animation 
                return (flags & 0x02) !== 0;
            }
            // VP8X must be first if present. If we see VP8/VP8L first, it's static.
            if (tag === 'VP8 ' || tag === 'VP8L') return false;

            // Skip chunk
            offset += 8 + size + (size % 2); // padding
        }
        return false;
    } catch (e) {
        return false;
    }
}

// Binary check for APNG (PNG + acTL chunk)
async function isAnimatedPng(filePath: string): Promise<boolean> {
    try {
        const handle = await fs.promises.open(filePath, 'r');
        const buf = Buffer.alloc(1024 * 256); // First 256KB is enough for PNG chunks header scan
        const { bytesRead } = await handle.read(buf, 0, buf.length, 0);
        await handle.close();

        if (bytesRead < 16) return false;

        // PNG signature
        const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        if (!buf.subarray(0, 8).equals(pngSignature)) return false;

        let offset = 8;
        while (offset + 8 <= bytesRead) {
            const chunkLength = buf.readUInt32BE(offset);
            const typeStart = offset + 4;
            const dataStart = offset + 8;
            const dataEnd = dataStart + chunkLength;
            const crcEnd = dataEnd + 4;

            if (crcEnd > bytesRead) {
                return false;
            }

            const chunkType = buf.toString('ascii', typeStart, typeStart + 4);

            if (chunkType === 'acTL') {
                return true;
            }

            // APNG control chunks must appear before first IDAT. Once image data starts without acTL, treat as static PNG.
            if (chunkType === 'IDAT' || chunkType === 'IEND') {
                return false;
            }

            offset = crcEnd;
        }

        return false;
    } catch {
        return false;
    }
}

export async function checkIsAnimated(filePath: string): Promise<boolean> {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.gif') {
        return isAnimatedGif(filePath);
    }
    if (ext === '.webp') {
        return isAnimatedWebp(filePath);
    }
    if (ext === '.png') {
        return isAnimatedPng(filePath);
    }
    return false;
}

/**
 * 全ファイルのサムネイルを一括再生成（WebP化）
 * Phase 24: 安全な順序で実行（生成→DB更新→旧ファイル削除）
 * @param files 再生成対象ファイルリスト
 * @param updateDB DB更新コールバック
 * @param onProgress 進捗コールバック
 */
export async function regenerateAllThumbnails(
    files: { id: string; path: string; type: string; thumbnailPath: string | null; thumbnailLocked?: boolean }[],
    updateDB: (fileId: string, newThumbnailPath: string) => Promise<void>,
    onProgress: (current: number, total: number) => void
): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;
    const BATCH_SIZE = 20;

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (file) => {
            try {
                if (file.thumbnailLocked) {
                    return;
                }

                const oldPath = file.thumbnailPath;

                // 1. 新WebP生成
                const newPath = await generateThumbnail(file.path);
                if (!newPath) {
                    failed++;
                    return;
                }

                // 2. DB更新（成功確認後）
                await updateDB(file.id, newPath);

                // 3. 旧ファイル削除（PNG等）
                if (oldPath && oldPath !== newPath && fs.existsSync(oldPath)) {
                    try {
                        fs.unlinkSync(oldPath);
                    } catch (e) {
                        log.warn(`Failed to delete old thumbnail: ${oldPath}`);
                    }
                }

                success++;
            } catch (e) {
                log.error(`Failed to regenerate thumbnail for ${file.path}:`, e);
                failed++;
            }
        }));

        // バッチ完了後に進捗通知
        onProgress(Math.min(i + BATCH_SIZE, files.length), files.length);
    }

    return { success, failed };
}
