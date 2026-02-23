/**
 * Archive Handler - 隴厄ｽｸ陟趣ｽｫ郢晁ｼ斐＜郢ｧ・､郢晢ｽｫ陷・ｽｦ騾・・縺礼ｹ晢ｽｼ郢晁侭縺・
 * 
 * ZIP, RAR, 7Z, CBZ, CBR 邵ｺ・ｪ邵ｺ・ｩ邵ｺ・ｮ隴厄ｽｸ陟趣ｽｫ郢晁ｼ斐＜郢ｧ・､郢晢ｽｫ郢ｧ雋槭・騾・・・邵ｲ繝ｻ
 * 郢晢ｽ｡郢ｧ・ｿ郢昴・繝ｻ郢ｧ・ｿ陷ｿ髢・ｾ蜉ｱﾂ竏壹＠郢晢ｿｽ郢晞亂縺・ｹ晢ｽｫ騾墓ｻ薙・邵ｲ竏壹・郢晢ｽｬ郢晁侭ﾎ礼ｹ晢ｽｼ騾包ｽｻ陷剃ｹ玲ｭ楢怎・ｺ郢ｧ螳夲ｽ｡蠕娯鴬邵ｲ繝ｻ
 */

import { path7za } from '7zip-bin';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';
import { app } from 'electron';
import { execFile } from 'child_process';
import util from 'util';
import { v4 as uuidv4 } from 'uuid';
import { dbManager } from './databaseManager';
import { logger } from './logger';
import { createArchivePreviewFramesDir, createThumbnailOutputPath, getThumbnailRootDir } from './thumbnailPaths';
import { THUMBNAIL_WEBP_QUALITY } from './thumbnailQuality';

const log = logger.scope('ArchiveHandler');

const execFilePromise = util.promisify(execFile);

// Phase 25: 郢昴・縺・ｹ晢ｽｬ郢ｧ・ｯ郢晏現ﾎ憺坎・ｭ陞ｳ螟ｲ・ｼ莠･陌夐ｧ繝ｻ蜿呵墓圜・ｼ繝ｻ
function getTempDir(): string {
    return path.join(app.getPath('userData'), 'temp', 'archives');
}
function getThumbnailDir(): string {
    return getThumbnailRootDir();
}
function getCurrentProfileIdForThumbnails(): string | null {
    return dbManager.getCurrentProfileId();
}

// 郢ｧ・ｵ郢晄亢繝ｻ郢晏現笘・ｹｧ蛹ｺ蠍瑚趣ｽｫ隲｡・｡陟托ｽｵ陝・・
const ARCHIVE_EXTENSIONS = ['.zip', '.cbz', '.rar', '.cbr', '.7z'];

// 郢ｧ・ｵ郢晄亢繝ｻ郢晏現笘・ｹｧ迢怜愛陷剃ｹ怜ヱ陟托ｽｵ陝・・
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];

// 郢ｧ・ｵ郢晄亢繝ｻ郢晏現笘・ｹｧ遏ｩ豬ｹ陞｢・ｰ隲｡・｡陟托ｽｵ陝・・
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.m4a', '.ogg', '.aac', '.wma'];
const ARCHIVE_PREVIEW_CACHE_TARGET_FRAMES = 6;

// 7za 繝舌う繝翫Μ繝代せ縺ｮ隗｣豎ｺ
function resolve7zaPath(): string {
    // 繝代ャ繧ｱ繝ｼ繧ｸ貂医∩繧｢繝励Μ・医Μ繝ｪ繝ｼ繧ｹ迚茨ｼ峨〒縺ｯ process.resourcesPath 繧剃ｽｿ逕ｨ
    // 縺薙ｌ縺ｫ繧医ｊ譁・ｭ怜・鄂ｮ謠帑ｾ晏ｭ倥ｒ謗帝勁縺励・lectron蜈ｬ蠑就PI繝吶・繧ｹ縺ｧ螳牙・縺ｫ隗｣豎ｺ縺吶ｋ
    if (app.isPackaged) {
        const packedPath = path.join(
            process.resourcesPath,
            'app.asar.unpacked',
            'node_modules',
            '7zip-bin',
            'win', 'x64', '7za.exe'
        );
        if (fs.existsSync(packedPath)) {
            log.info('7za binary found (packaged):', packedPath);
            return packedPath;
        }
        log.error('7za binary not found anywhere!');
        return packedPath; // 隕九▽縺九ｉ縺ｪ縺上※繧りｿ斐☆・医お繝ｩ繝ｼ縺ｯ蠕後〒逋ｺ逕滂ｼ・
    }

    // 開発環境では bundler 後に path7za が dist-electron 基準の壊れた相対パスになることがある
    const devCandidates = [
        path7za,
        path.join(process.cwd(), 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe'),
        path.join(app.getAppPath(), '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe'),
        path.join(__dirname, '..', '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe'),
    ].map(p => path.normalize(p));

    for (const candidate of devCandidates) {
        if (fs.existsSync(candidate)) {
            log.info('Found 7za in dev candidate:', candidate);
            return candidate;
        }
    }

    log.error('7za binary not found anywhere!', { path7za, devCandidates });
    return path7za;
}

const SEVEN_ZA_PATH = resolve7zaPath();

// 郢昴・縺・ｹ晢ｽｬ郢ｧ・ｯ郢晏現ﾎ懆崕譎・ｄ陋ｹ繝ｻ
function ensureDirectories(): void {
    const tempDir = getTempDir();
    const thumbnailDir = getThumbnailDir();
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    if (!fs.existsSync(thumbnailDir)) {
        fs.mkdirSync(thumbnailDir, { recursive: true });
    }
}

function moveFileSafe(src: string, dst: string): void {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    try {
        fs.renameSync(src, dst);
    } catch (e) {
        const err = e as NodeJS.ErrnoException;
        if (err.code === 'EXDEV') {
            fs.copyFileSync(src, dst);
            fs.unlinkSync(src);
            return;
        }
        throw e;
    }
}

async function saveArchiveThumbnailAsWebp(
    srcImagePath: string,
    profileId: string | null
): Promise<string | null> {
    const outPath = createThumbnailOutputPath('archive', '.webp', profileId);
    try {
        await sharp(srcImagePath)
            .resize(320, null, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: THUMBNAIL_WEBP_QUALITY.archive })
            .toFile(outPath);
        return outPath;
    } catch (e) {
        log.warn(`Archive thumbnail WebP conversion failed: ${srcImagePath}`, e);
        return null;
    }
}

async function saveArchivePreviewFrameAsWebp(
    srcImagePath: string,
    outputDir: string,
    frameIndex: number
): Promise<string | null> {
    const outPath = path.join(outputDir, `frame_${String(frameIndex).padStart(2, '0')}.webp`);
    try {
        await sharp(srcImagePath)
            .resize(384, null, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: THUMBNAIL_WEBP_QUALITY.previewFrame })
            .toFile(outPath);
        return outPath;
    } catch (e) {
        log.warn(`Archive preview frame WebP conversion failed: ${srcImagePath}`, e);
        return null;
    }
}

function buildArchivePreviewCacheKey(filePath: string): string {
    try {
        const stat = fs.statSync(filePath);
        const keySrc = `${filePath}|${stat.size}|${stat.mtimeMs}`;
        return crypto.createHash('sha1').update(keySrc).digest('hex');
    } catch {
        // Fallback key when stat fails; path-only keeps behavior deterministic enough.
        return crypto.createHash('sha1').update(filePath).digest('hex');
    }
}

function listCachedArchivePreviewFrames(cacheDir: string): string[] {
    if (!fs.existsSync(cacheDir)) return [];
    return fs.readdirSync(cacheDir)
        .filter(name => /\.(webp|png|jpe?g|gif|bmp)$/i.test(name))
        .sort()
        .map(name => path.join(cacheDir, name));
}

// ========================
// Type Definitions
// ========================

export interface ArchiveMetadata {
    fileCount: number;
    firstImageEntry: string | null;
    imageEntries: string[];
    audioEntries: string[];
    hasAudio: boolean;
}

export interface ArchiveError {
    code: 'NO_IMAGES' | 'EXTRACTION_FAILED' | 'PASSWORD_PROTECTED' | 'CORRUPTED' | 'UNKNOWN';
    message: string;
}

// ========================
// Public API
// ========================

/**
 * 郢晁ｼ斐＜郢ｧ・､郢晢ｽｫ邵ｺ譴ｧ蠍瑚趣ｽｫ郢晁ｼ斐＜郢ｧ・､郢晢ｽｫ邵ｺ荵昶・邵ｺ繝ｻﾂｰ郢ｧ雋樊・陞ｳ繝ｻ
 */
export function isArchive(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ARCHIVE_EXTENSIONS.includes(ext);
}

/**
 * 隴厄ｽｸ陟趣ｽｫ郢晁ｼ斐＜郢ｧ・､郢晢ｽｫ邵ｺ・ｮ郢晢ｽ｡郢ｧ・ｿ郢昴・繝ｻ郢ｧ・ｿ繝ｻ閧ｲ蛻､陷剃ｸ莞懃ｹｧ・ｹ郢晁肩・ｼ蟲ｨ・定愾髢・ｾ繝ｻ
 */
export async function getArchiveMetadata(filePath: string): Promise<ArchiveMetadata | null> {
    try {
        // 7za -slt 邵ｺ・ｧ髫ｧ・ｳ驍擾ｽｰ隲繝ｻ・ｽ・ｱ郢ｧ雋槫徐陟輔・
        const { stdout } = await execFilePromise(SEVEN_ZA_PATH, [
            'l', '-ba', '-slt', '-sccUTF-8', filePath
        ]);

        const entries: string[] = [];
        const lines = stdout.split(/\r?\n/);

        let currentPath = '';
        let isDirectory = false;

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith('Path = ')) {
                currentPath = trimmed.substring(7);
                isDirectory = false;
            } else if (trimmed.startsWith('Attributes = ')) {
                if (trimmed.includes('D')) isDirectory = true;
            } else if (trimmed === '' && currentPath) {
                if (!isDirectory) {
                    entries.push(currentPath);
                }
                currentPath = '';
            }
        }

        // 隴崢陟募ｾ後・郢ｧ・ｨ郢晢ｽｳ郢晏現ﾎ懃ｹｧ雋槭・騾・・
        if (currentPath && !isDirectory) {
            entries.push(currentPath);
        }

        // 騾包ｽｻ陷剃ｸ翫Ψ郢ｧ・｡郢ｧ・､郢晢ｽｫ邵ｺ・ｮ邵ｺ・ｿ郢晁ｼ斐≦郢晢ｽｫ郢ｧ・ｿ郢晢ｽｪ郢晢ｽｳ郢ｧ・ｰ
        const imageEntries = entries.filter(name => {
            const ext = path.extname(name).toLowerCase();
            return IMAGE_EXTENSIONS.includes(ext);
        });

        // 鬮ｻ・ｳ陞｢・ｰ郢晁ｼ斐＜郢ｧ・､郢晢ｽｫ郢ｧ蛛ｵ繝ｵ郢ｧ・｣郢晢ｽｫ郢ｧ・ｿ郢晢ｽｪ郢晢ｽｳ郢ｧ・ｰ
        const audioEntries = entries.filter(name => {
            const ext = path.extname(name).toLowerCase();
            return AUDIO_EXTENSIONS.includes(ext);
        });

        // 髢ｾ・ｪ霎滂ｽｶ鬯・・縺溽ｹ晢ｽｼ郢晁肩・ｼ繝ｻ.jpg, 2.jpg, 10.jpg繝ｻ繝ｻ
        const sortedImages = imageEntries.sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
        );

        const sortedAudio = audioEntries.sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
        );

        return {
            fileCount: sortedImages.length + sortedAudio.length,
            firstImageEntry: sortedImages.length > 0 ? sortedImages[0] : null,
            imageEntries: sortedImages,
            audioEntries: sortedAudio,
            hasAudio: sortedAudio.length > 0
        };
    } catch (error) {
        log.error(`Failed to read archive: ${filePath}`, error);
        return null;
    }
}

/**
 * 隴厄ｽｸ陟趣ｽｫ郢晁ｼ斐＜郢ｧ・､郢晢ｽｫ邵ｺ荵晢ｽ臥ｹｧ・ｵ郢晢ｿｽ郢晞亂縺・ｹ晢ｽｫ騾包ｽｨ邵ｺ・ｮ隴崢陋ｻ譏ｴ繝ｻ騾包ｽｻ陷剃ｸ奇ｽ定ｬ夲ｽｽ陷・ｽｺ
 */
export async function getArchiveThumbnail(filePath: string): Promise<string | null> {
    const TIMEOUT_MS = 30000; // 30驕伜・縺｡郢ｧ・､郢晢ｿｽ郢ｧ・｢郢ｧ・ｦ郢昴・

    try {
        ensureDirectories();

        // 郢晁ｼ斐＜郢ｧ・､郢晢ｽｫ陝・ｼ懈Β驕抵ｽｺ髫ｱ繝ｻ
        if (!fs.existsSync(filePath)) {
            log.warn('File not found:', filePath);
            return null;
        }

        const metadata = await Promise.race([
            getArchiveMetadata(filePath),
            new Promise<null>((_, reject) =>
                setTimeout(() => reject(new Error('Metadata timeout')), TIMEOUT_MS)
            )
        ]);

        if (!metadata || !metadata.firstImageEntry) {
            if (metadata?.hasAudio) {
                log.info('Audio-only archive (no images):', filePath);
            } else {
                log.warn('No images or audio in archive:', filePath);
            }
            return null;
        }

        const entryName = metadata.firstImageEntry;
        const ext = path.extname(entryName) || '.jpg';
        const profileId = getCurrentProfileIdForThumbnails();
        const extractId = uuidv4();
        const subDir = path.join(getTempDir(), extractId);
        fs.mkdirSync(subDir, { recursive: true });

        // 7za 邵ｺ・ｧ隰夲ｽｽ陷・ｽｺ繝ｻ蛹ｻ繝ｵ郢晢ｽｩ郢昴・繝ｨ陞ｻ證ｮ蟷輔・鬧・th timeout
        try {
            await Promise.race([
                execFilePromise(SEVEN_ZA_PATH, [
                    'e', filePath, `-o${subDir}`, entryName, '-y', '-sccUTF-8'
                ]),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Extraction timeout')), TIMEOUT_MS)
                )
            ]);
        } catch (execError: any) {
            // 郢ｧ・ｨ郢晢ｽｩ郢晢ｽｼ驕橸ｽｮ陋ｻ・･陋ｻ・､陞ｳ繝ｻ
            const errorMsg = execError?.stderr || execError?.message || String(execError);

            if (errorMsg.includes('password') || errorMsg.includes('Wrong password')) {
                log.warn('Password protected:', filePath);
                return null;
            }
            if (errorMsg.includes('Cannot open') || errorMsg.includes('Unexpected end')) {
                log.warn('Corrupted archive:', filePath);
                return null;
            }
            if (errorMsg.includes('timeout')) {
                log.warn('Extraction timeout:', filePath);
                return null;
            }

            throw execError;
        }

        // 隰夲ｽｽ陷・ｽｺ邵ｺ霈費ｽ檎ｸｺ貅倥Ψ郢ｧ・｡郢ｧ・､郢晢ｽｫ郢ｧ蛛ｵ縺礼ｹ晢ｿｽ郢晞亂縺・ｹ晢ｽｫ郢昴・縺・ｹ晢ｽｬ郢ｧ・ｯ郢晏現ﾎ懃ｸｺ・ｫ驕假ｽｻ陷阪・
        const extractedBasename = path.basename(entryName);
        const extractedPath = path.join(subDir, extractedBasename);

        if (fs.existsSync(extractedPath)) {
            try {
                const webpPath = await saveArchiveThumbnailAsWebp(extractedPath, profileId);
                if (webpPath) {
                    try {
                        fs.rmSync(subDir, { recursive: true, force: true });
                    } catch {
                        // ignore cleanup errors
                    }
                    return webpPath;
                }

                const fallbackOutPath = createThumbnailOutputPath('archive', ext, profileId);
                moveFileSafe(extractedPath, fallbackOutPath);
                try {
                    fs.rmSync(subDir, { recursive: true, force: true });
                } catch {
                    // ignore cleanup errors
                }
                return fallbackOutPath;
            } catch (moveErr) {
                // If exact filename move fails (e.g. race or archive extraction variance),
                // continue to fallback scan in subDir instead of aborting thumbnail generation.
                log.warn(`Primary thumbnail move failed, fallback scan: ${entryName}`, moveErr);
            }
        }

        // 郢晁ｼ斐°郢晢ｽｼ郢晢ｽｫ郢晁・繝｣郢ｧ・ｯ: TEMP_DIR郢ｧ蜻茨ｽ､諛・ｽｴ・｢
        const tempFiles = fs.readdirSync(subDir);
        const imageFile = tempFiles.find(f => {
            const fExt = path.extname(f).toLowerCase();
            return IMAGE_EXTENSIONS.includes(fExt);
        });

        if (imageFile) {
            const foundPath = path.join(subDir, imageFile);
            const fallbackExt = path.extname(imageFile) || ext;
            const webpPath = await saveArchiveThumbnailAsWebp(foundPath, profileId);
            if (webpPath) {
                log.info('Found image via fallback:', imageFile);
                try {
                    fs.rmSync(subDir, { recursive: true, force: true });
                } catch {
                    // ignore cleanup errors
                }
                return webpPath;
            }

            const fallbackOutPath = createThumbnailOutputPath('archive', fallbackExt, profileId);
            moveFileSafe(foundPath, fallbackOutPath);
            log.info('Found image via fallback:', imageFile);
            try {
                fs.rmSync(subDir, { recursive: true, force: true });
            } catch {
                // ignore cleanup errors
            }
            return fallbackOutPath;
        }

        try {
            fs.rmSync(subDir, { recursive: true, force: true });
        } catch {
            // ignore cleanup errors
        }
        log.warn('Extracted file not found:', extractedPath);
        return null;
    } catch (error: any) {
        // 髫ｧ・ｳ驍擾ｽｰ郢晢ｽｭ郢ｧ・ｰ
        const errorDetail = {
            filePath,
            message: error?.message || String(error),
            code: error?.code,
            stderr: error?.stderr
        };
        log.error('Failed to extract thumbnail:', errorDetail);
        return null;
    }
}

/**
 * 隴厄ｽｸ陟趣ｽｫ郢晁ｼ斐＜郢ｧ・､郢晢ｽｫ邵ｺ荵晢ｽ蛾嚶繝ｻ辟夂ｸｺ・ｮ郢晏干ﾎ樒ｹ晁侭ﾎ礼ｹ晢ｽｼ騾包ｽｻ陷剃ｸ奇ｽ定ｬ夲ｽｽ陷・ｽｺ
 * @param filePath - 隴厄ｽｸ陟趣ｽｫ郢晁ｼ斐＜郢ｧ・､郢晢ｽｫ郢昜ｻ｣縺・
 * @param limit - 陷ｿ髢・ｾ蜉ｱ笘・ｹｧ迢怜愛陷剃ｸ翫・隴崢陞滂ｽｧ隰ｨ・ｰ繝ｻ蛹ｻ繝ｧ郢晁ｼ斐°郢晢ｽｫ郢昴・ 9繝ｻ繝ｻ
 */
export async function getArchivePreviewFrames(
    filePath: string,
    limit: number = 9
): Promise<string[]> {
    try {
        ensureDirectories();
        const profileId = getCurrentProfileIdForThumbnails();
        const cacheKey = buildArchivePreviewCacheKey(filePath);
        const cacheDir = createArchivePreviewFramesDir(cacheKey, profileId);
        const existingCached = listCachedArchivePreviewFrames(cacheDir);
        const targetFrameCount = Math.max(limit, ARCHIVE_PREVIEW_CACHE_TARGET_FRAMES);

        if (existingCached.length >= limit && existingCached.length >= targetFrameCount) {
            return existingCached.slice(0, limit);
        }

        const metadata = await getArchiveMetadata(filePath);
        if (!metadata || !metadata.imageEntries || metadata.imageEntries.length === 0) {
            return [];
        }

        const images = metadata.imageEntries;
        const selectedImages: string[] = [];

        // 隴崢陋ｻ譏ｴ繝ｻ騾包ｽｻ陷呈得・ｼ蛹ｻ縺礼ｹ晢ｿｽ郢晞亂縺・ｹ晢ｽｫ繝ｻ蟲ｨ・堤ｹｧ・ｹ郢ｧ・ｭ郢昴・繝ｻ繝ｻ莠･鬥呵崕繝ｻ竊鷹包ｽｻ陷剃ｸ岩ｲ邵ｺ繧・ｽ玖撻・ｴ陷ｷ闌ｨ・ｼ繝ｻ
        const pool = images.length > 1 ? images.slice(1) : images;

        if (pool.length <= targetFrameCount) {
            selectedImages.push(...pool);
        } else {
            // 陜ｮ繝ｻ・ｭ蟲ｨ竊楢崕繝ｻ豺ｵ邵ｺ蜉ｱ窶ｻ鬩包ｽｸ隰壹・
            const step = (pool.length - 1) / (targetFrameCount - 1);
            for (let i = 0; i < targetFrameCount; i++) {
                const index = Math.round(i * step);
                selectedImages.push(pool[index]);
            }
        }

        // Regenerate cache deterministically for this archive version.
        try {
            fs.rmSync(cacheDir, { recursive: true, force: true });
            fs.mkdirSync(cacheDir, { recursive: true });
        } catch {
            // ignore cache cleanup errors and continue
        }

        const previewPaths: string[] = [];

        for (let i = 0; i < selectedImages.length; i++) {
            const entryName = selectedImages[i];
            const ext = path.extname(entryName) || '.jpg';
            const extractId = uuidv4();
            const subDir = path.join(getTempDir(), extractId);
            const frameNo = i + 1;
            const fallbackOutPath = path.join(cacheDir, `frame_${String(frameNo).padStart(2, '0')}${ext}`);

            try {
                // Phase 26: UUID 繧ｵ繝悶ヵ繧ｩ繝ｫ繝縺ｫ隗｣蜃阪＠縺ｦ蜷悟錐繝輔ぃ繧､繝ｫ遶ｶ蜷医ｒ髦ｲ縺・
                fs.mkdirSync(subDir, { recursive: true });

                await execFilePromise(SEVEN_ZA_PATH, [
                    'e', filePath, `-o${subDir}`, entryName, '-y', '-sccUTF-8'
                ]);

                const extractedBasename = path.basename(entryName);
                const extractedPath = path.join(subDir, extractedBasename);

                if (fs.existsSync(extractedPath)) {
                    const webpPath = await saveArchivePreviewFrameAsWebp(extractedPath, cacheDir, frameNo);
                    if (webpPath) {
                        previewPaths.push(webpPath);
                    } else {
                        moveFileSafe(extractedPath, fallbackOutPath);
                        previewPaths.push(fallbackOutPath);
                    }
                }
            } catch (e) {
                log.warn(`Failed to extract preview frame: ${entryName}`, e);
            } finally {
                // UUID 繧ｵ繝悶ヵ繧ｩ繝ｫ繝繧貞炎髯､・域ｮ矩ｪｸ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・・・
                try {
                    if (fs.existsSync(subDir)) {
                        fs.rmSync(subDir, { recursive: true, force: true });
                    }
                } catch {
                    // 繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・螟ｱ謨励・辟｡隕・
                }
            }
        }

        return previewPaths.slice(0, limit);
    } catch (error) {
        log.error(`Failed to get archive previews: ${filePath}`, error);
        return [];
    }
}

/**
 * 闕ｳﾂ隴弱ｅ繝ｧ郢ｧ・｣郢晢ｽｬ郢ｧ・ｯ郢晏現ﾎ懃ｹｧ蛛ｵ縺醍ｹ晢ｽｪ郢晢ｽｼ郢晢ｽｳ郢ｧ・｢郢昴・繝ｻ
 */
export function cleanTempArchives(): void {
    try {
        if (fs.existsSync(getTempDir())) {
            fs.rmSync(getTempDir(), { recursive: true, force: true });
            fs.mkdirSync(getTempDir(), { recursive: true });
            log.info('Temp archives cleaned');
        }
    } catch (e) {
        log.error('Failed to clean temp archives', e);
    }
}

/**
 * 隴厄ｽｸ陟趣ｽｫ郢晁ｼ斐＜郢ｧ・､郢晢ｽｫ陷繝ｻ繝ｻ鬮ｻ・ｳ陞｢・ｰ郢晁ｼ斐＜郢ｧ・､郢晢ｽｫ郢晢ｽｪ郢ｧ・ｹ郢晏現・定愾髢・ｾ繝ｻ
 */
export async function getArchiveAudioFiles(archivePath: string): Promise<string[]> {
    const metadata = await getArchiveMetadata(archivePath);
    return metadata?.audioEntries || [];
}

/**
 * 隴厄ｽｸ陟趣ｽｫ郢晁ｼ斐＜郢ｧ・､郢晢ｽｫ邵ｺ荵晢ｽ芽ｿ夲ｽｹ陞ｳ螢ｹ繝ｻ鬮ｻ・ｳ陞｢・ｰ郢晁ｼ斐＜郢ｧ・､郢晢ｽｫ郢ｧ蜻域ｭ楢怎・ｺ邵ｺ蜉ｱﾂ竏ｽ・ｸﾂ隴弱ｅ繝ｵ郢ｧ・｡郢ｧ・､郢晢ｽｫ郢昜ｻ｣縺帷ｹｧ螳夲ｽｿ譁絶・
 */
export async function extractArchiveAudioFile(
    archivePath: string,
    entryName: string
): Promise<string | null> {
    const extractId = uuidv4();
    const extractDir = path.join(getTempDir(), 'audio', extractId);

    try {
        ensureDirectories();

        if (!fs.existsSync(extractDir)) {
            fs.mkdirSync(extractDir, { recursive: true });
        }

        // 7za邵ｺ・ｧ霑夲ｽｹ陞ｳ螢ｹ繝ｵ郢ｧ・｡郢ｧ・､郢晢ｽｫ郢ｧ蜻域ｭ楢怎・ｺ
        await execFilePromise(SEVEN_ZA_PATH, [
            'e', archivePath,
            `-o${extractDir}`,
            entryName,
            '-y',
            '-sccUTF-8'
        ]);

        // 隰夲ｽｽ陷・ｽｺ邵ｺ蜉ｱ笳・ｹ晁ｼ斐＜郢ｧ・､郢晢ｽｫ郢ｧ蜻育粟邵ｺ繝ｻ
        const extractedName = path.basename(entryName);
        const extractedPath = path.join(extractDir, extractedName);

        if (fs.existsSync(extractedPath)) {
            return extractedPath;
        }

        // 郢昴・縺・ｹ晢ｽｬ郢ｧ・ｯ郢晏現ﾎ懆怙繝ｻ・定ｮ諛・ｽｴ・｢
        const files = fs.readdirSync(extractDir);
        if (files.length > 0) {
            return path.join(extractDir, files[0]);
        }

        return null;
    } catch (error) {
        log.error(`Failed to extract audio from archive: ${archivePath}`, error);
        return null;
    }
}


