import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { isArchive, getArchiveThumbnail } from './archiveHandler';
import { logger } from './logger';
import { getBasePath } from './storageConfig';

const log = logger.scope('Thumbnail');

// Phase 25: basePath から動的取得（モジュールロード時に確定させない）
function getThumbnailDir(): string {
    const dir = path.join(getBasePath(), 'thumbnails');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
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

/**
 * 動画サムネイルを WebP で生成
 * ffmpeg の screenshots API は PNG 固定のため -vcodec libwebp 方式を使用
 * Phase 26: seekInput('%') を廃止 → ffprobe で秒数を取得して絶対値でシーク（Windowsでの Invalid argument 回避）
 */
async function generateVideoThumbnail(videoPath: string, resolution: number = 320): Promise<string | null> {
    const filename = `${uuidv4()}.webp`;
    const outputPath = path.join(getThumbnailDir(), filename);

    try {
        // ffprobe で動画の長さを取得
        const durationSec = await new Promise<number>((resolve) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err || !metadata?.format?.duration) {
                    resolve(0);
                } else {
                    resolve(metadata.format.duration);
                }
            });
        });

        // シーク位置を絶対秒数で指定（10%の位置、最低0秒、最大300秒）
        const seekSec = durationSec > 1 ? Math.min(durationSec * 0.1, 300) : 0;

        return await new Promise((resolve) => {
            ffmpeg(videoPath)
                .outputOptions([
                    '-vframes', '1',
                    '-vf', `scale=${resolution}:-1`,
                    '-vcodec', 'libwebp',
                    '-quality', '75',
                    '-threads', '1',  // コイル鳴き軽減
                ])
                .seekInput(seekSec)
                .output(outputPath)
                .on('end', () => resolve(outputPath))
                .on('error', (err) => {
                    log.error('Error generating video thumbnail:', err);
                    resolve(null);
                })
                .run();
        });
    } catch (e) {
        log.error('generateVideoThumbnail exception:', e);
        return null;
    }
}

/**
 * 音声ファイルからアルバムアートを抽出
 * アルバムアートがない場合はnullを返す
 */
function generateAudioThumbnail(audioPath: string): Promise<string | null> {
    const filename = `${uuidv4()}.webp`;
    const outputPath = path.join(getThumbnailDir(), filename);

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
 * Phase 24: 320px x10枚 → 256px x6枚 WebP に軽量化
 * @param videoPath 動画ファイルパス
 * @param frameCount 生成するフレーム数（デフォルト: 6）
 * @returns カンマ区切りのフレームパス文字列
 */
export async function generatePreviewFrames(videoPath: string, frameCount: number = 6): Promise<string | null> {
    const videoId = uuidv4();
    const frameDir = path.join(getThumbnailDir(), 'frames', videoId);

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
                .outputOptions([
                    '-threads', '1',  // コイル鳴き軽減
                    '-vcodec', 'libwebp',
                    '-quality', '70',
                ])
                .screenshots({
                    count: frameCount,
                    folder: frameDir,
                    filename: 'frame_%02d.webp',
                    size: '256x?',  // Phase 24: 320→256px
                    timemarks: timemarks
                })
                .on('end', () => {
                    // ディレクトリの内容を確認
                    const filesInDir = fs.readdirSync(frameDir);

                    // 生成されたフレームのパスを収集（想定形式: frame_01.webp）
                    const framePaths: string[] = [];
                    for (let i = 1; i <= frameCount; i++) {
                        const framePath = path.join(frameDir, `frame_${i.toString().padStart(2, '0')}.webp`);
                        if (fs.existsSync(framePath)) {
                            framePaths.push(framePath);
                        }
                    }

                    if (framePaths.length > 0) {
                        resolve(framePaths.join(','));
                    } else {
                        // フォールバック: ディレクトリ内の全WebPを使用
                        const allWebps = filesInDir
                            .filter(f => f.endsWith('.webp'))
                            .sort()
                            .map(f => path.join(frameDir, f));
                        resolve(allWebps.length > 0 ? allWebps.join(',') : null);
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

/**
 * 静止画サムネイルを WebP で生成（quality: 82）
 */
async function generateImageThumbnail(imagePath: string, resolution: number = 320): Promise<string | null> {
    const filename = `${uuidv4()}.webp`;
    const outputPath = path.join(getThumbnailDir(), filename);

    try {
        await sharp(imagePath)
            .resize(resolution, null, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 82 })
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

/**
 * 全ファイルのサムネイルを一括再生成（WebP化）
 * Phase 24: 安全な順序で実行（生成→DB更新→旧ファイル削除）
 * @param files 再生成対象ファイルリスト
 * @param updateDB DB更新コールバック
 * @param onProgress 進捗コールバック
 */
export async function regenerateAllThumbnails(
    files: { id: string; path: string; type: string; thumbnailPath: string | null }[],
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
