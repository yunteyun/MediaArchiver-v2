import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { isArchive, getArchiveThumbnail } from './archiveHandler';
import { logger } from './logger';

const log = logger.scope('Thumbnail');

// Setup paths
const THUMBNAIL_DIR = path.join(app.getPath('userData'), 'thumbnails');

if (!fs.existsSync(THUMBNAIL_DIR)) {
    fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
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

export async function generateThumbnail(filePath: string, resolution: number = 320): Promise<string | null> {
    const ext = path.extname(filePath).toLowerCase();
    const filename = `${uuidv4()}.png`;
    const outputPath = path.join(THUMBNAIL_DIR, filename);

    try {
        // Archive files (zip, rar, 7z, cbz, cbr)
        if (isArchive(filePath)) {
            return getArchiveThumbnail(filePath);
        }
        // Video files
        if (['.mp4', '.webm', '.mov', '.avi', '.mkv'].includes(ext)) {
            return generateVideoThumbnail(filePath, filename, outputPath, resolution);
        }
        // Image files
        if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(ext)) {
            return generateImageThumbnail(filePath, outputPath, resolution);
        }
        // Audio files - アルバムアート抽出を試みる
        if (['.mp3', '.wav', '.flac', '.m4a', '.ogg', '.aac', '.wma'].includes(ext)) {
            return generateAudioThumbnail(filePath, outputPath);
        }
    } catch (e) {
        log.error(`Failed to generate thumbnail for ${filePath}:`, e);
    }
    return null;
}

function generateVideoThumbnail(videoPath: string, filename: string, outputPath: string, resolution: number = 320): Promise<string | null> {
    return new Promise((resolve) => {
        ffmpeg(videoPath)
            .screenshots({
                count: 1,
                folder: THUMBNAIL_DIR,
                filename: filename,
                size: `${resolution}x?`, // maintain aspect ratio
                timemarks: ['10%'] // take screenshot at 10% duration
            })
            .on('end', () => {
                resolve(outputPath);
            })
            .on('error', (err) => {
                log.error('Error generating video thumbnail:', err);
                resolve(null);
            });
    });
}

/**
 * 音声ファイルからアルバムアートを抽出
 * アルバムアートがない場合はnullを返す
 */
function generateAudioThumbnail(audioPath: string, outputPath: string): Promise<string | null> {
    return new Promise((resolve) => {
        // FFmpegでアルバムアート（埋め込み画像）を抽出
        ffmpeg(audioPath)
            .outputOptions(['-an', '-vcodec', 'copy'])
            .output(outputPath)
            .on('end', () => {
                resolve(outputPath);
            })
            .on('error', () => {
                // アルバムアートがない場合はエラーになる - 正常動作
                resolve(null);
            })
            .run();
    });
}

/**
 * 動画からプレビューフレームを生成（スクラブ用）
 * @param videoPath 動画ファイルパス
 * @param frameCount 生成するフレーム数（デフォルト: 10）
 * @returns カンマ区切りのフレームパス文字列
 */
export async function generatePreviewFrames(videoPath: string, frameCount: number = 10): Promise<string | null> {
    const videoId = uuidv4();
    const frameDir = path.join(THUMBNAIL_DIR, 'frames', videoId);

    try {
        // フレームディレクトリ作成
        if (!fs.existsSync(frameDir)) {
            fs.mkdirSync(frameDir, { recursive: true });
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
                .outputOptions(['-threads', '1'])  // スレッド数を1に制限してコイル鳴きを軽減
                .screenshots({
                    count: frameCount,
                    folder: frameDir,
                    filename: 'frame_%02d.png',
                    size: '320x?',
                    timemarks: timemarks
                })
                .on('end', () => {
                    // ディレクトリの内容を確認
                    const filesInDir = fs.readdirSync(frameDir);

                    // 生成されたフレームのパスを収集（想定形式: frame_01.png）
                    const framePaths: string[] = [];
                    for (let i = 1; i <= frameCount; i++) {
                        const framePath = path.join(frameDir, `frame_${i.toString().padStart(2, '0')}.png`);
                        if (fs.existsSync(framePath)) {
                            framePaths.push(framePath);
                        }
                    }

                    if (framePaths.length > 0) {
                        resolve(framePaths.join(','));
                    } else {
                        // フォールバック: ディレクトリ内の全PNGを使用
                        const allPngs = filesInDir
                            .filter(f => f.endsWith('.png'))
                            .sort()
                            .map(f => path.join(frameDir, f));
                        resolve(allPngs.length > 0 ? allPngs.join(',') : null);
                    }
                })
                .on('error', (err) => {
                    log.error('Preview frames generation error:', err);
                    resolve(null);
                });
        });
    } catch (e) {
        log.error('PreviewFrames exception:', e);
        return null;
    }
}

async function generateImageThumbnail(imagePath: string, outputPath: string, resolution: number = 320): Promise<string | null> {
    try {
        await sharp(imagePath)
            .resize(resolution, null, { fit: 'inside', withoutEnlargement: true })
            .toFile(outputPath);
        return outputPath;
    } catch (err) {
        log.error('Error generating image thumbnail:', err);
        return null;
    }
}

export async function getVideoDuration(videoPath: string): Promise<string> {
    return new Promise((resolve) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
                resolve("");
                return;
            }
            const durationSec = metadata.format.duration || 0;
            const minutes = Math.floor(durationSec / 60);
            const seconds = Math.floor(durationSec % 60);
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

export async function checkIsAnimated(filePath: string): Promise<boolean> {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.gif') {
        return isAnimatedGif(filePath);
    }
    if (ext === '.webp') {
        return isAnimatedWebp(filePath);
    }
    return false;
}
