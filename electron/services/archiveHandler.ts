/**
 * Archive Handler - 譖ｸ蠎ｫ繝輔ぃ繧､繝ｫ蜃ｦ逅・し繝ｼ繝薙せ
 * 
 * ZIP, RAR, 7Z, CBZ, CBR 縺ｪ縺ｩ縺ｮ譖ｸ蠎ｫ繝輔ぃ繧､繝ｫ繧貞・逅・＠縲・
 * 繝｡繧ｿ繝・・繧ｿ蜿門ｾ励√し繝�繝阪う繝ｫ逕滓・縲√・繝ｬ繝薙Η繝ｼ逕ｻ蜒乗歓蜃ｺ繧定｡後≧縲・
 */

import { path7za } from '7zip-bin';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { execFile } from 'child_process';
import util from 'util';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';
import { getBasePath } from './storageConfig';
import { safeMoveFileSync } from './fileOperationService';

const log = logger.scope('ArchiveHandler');

const execFilePromise = util.promisify(execFile);

// Phase 25: 繝・ぅ繝ｬ繧ｯ繝医Μ險ｭ螳夲ｼ亥虚逧・叙蠕暦ｼ・
function getTempDir(): string {
    return path.join(app.getPath('userData'), 'temp', 'archives');
}
function getThumbnailDir(): string {
    return path.join(getBasePath(), 'thumbnails');
}

// 繧ｵ繝昴・繝医☆繧区嶌蠎ｫ諡｡蠑ｵ蟄・
const ARCHIVE_EXTENSIONS = ['.zip', '.cbz', '.rar', '.cbr', '.7z'];

// 繧ｵ繝昴・繝医☆繧狗判蜒乗僑蠑ｵ蟄・
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];

// 繧ｵ繝昴・繝医☆繧矩浹螢ｰ諡｡蠑ｵ蟄・
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.m4a', '.ogg', '.aac', '.wma'];

// 7za バイナリパスの解決
function resolve7zaPath(): string {
    // パッケージ済みアプリ（リリース版）では process.resourcesPath を使用
    // これにより文字列置換依存を排除し、Electron公式APIベースで安全に解決する
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
        return packedPath; // 見つからなくても返す（エラーは後で発生）
    }

    // 開発環境: 7zip-bin が返すパスをそのまま使用
    if (fs.existsSync(path7za)) {
        log.info('Found 7za locally:', path7za);
        return path7za;
    }

    // Vite環境等で path7za が dist-electron 内を指す場合があるため、明示的に node_modules を探す
    const fallbackPath1 = path.join(process.cwd(), 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');
    if (fs.existsSync(fallbackPath1)) {
        log.info('Found 7za in node_modules (fallback 1):', fallbackPath1);
        return fallbackPath1;
    }

    const fallbackPath2 = path7za.replace('dist-electron', 'node_modules\\7zip-bin');
    if (fs.existsSync(fallbackPath2)) {
        log.info('Found 7za in node_modules (fallback 2):', fallbackPath2);
        return fallbackPath2;
    }

    log.error('7za binary not found anywhere!');
    return path7za;
}

const SEVEN_ZA_PATH = resolve7zaPath();

// 繝・ぅ繝ｬ繧ｯ繝医Μ蛻晄悄蛹・
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

ensureDirectories();

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
 * 繝輔ぃ繧､繝ｫ縺梧嶌蠎ｫ繝輔ぃ繧､繝ｫ縺九←縺・°繧貞愛螳・
 */
export function isArchive(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ARCHIVE_EXTENSIONS.includes(ext);
}

/**
 * 譖ｸ蠎ｫ繝輔ぃ繧､繝ｫ縺ｮ繝｡繧ｿ繝・・繧ｿ・育判蜒上Μ繧ｹ繝茨ｼ峨ｒ蜿門ｾ・
 */
export async function getArchiveMetadata(filePath: string): Promise<ArchiveMetadata | null> {
    try {
        // 7za -slt 縺ｧ隧ｳ邏ｰ諠・�ｱ繧貞叙蠕・
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

        // 譛蠕後・繧ｨ繝ｳ繝医Μ繧貞・逅・
        if (currentPath && !isDirectory) {
            entries.push(currentPath);
        }

        // 逕ｻ蜒上ヵ繧｡繧､繝ｫ縺ｮ縺ｿ繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ
        const imageEntries = entries.filter(name => {
            const ext = path.extname(name).toLowerCase();
            return IMAGE_EXTENSIONS.includes(ext);
        });

        // 髻ｳ螢ｰ繝輔ぃ繧､繝ｫ繧偵ヵ繧｣繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ
        const audioEntries = entries.filter(name => {
            const ext = path.extname(name).toLowerCase();
            return AUDIO_EXTENSIONS.includes(ext);
        });

        // 閾ｪ辟ｶ鬆・た繝ｼ繝茨ｼ・.jpg, 2.jpg, 10.jpg・・
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
 * 譖ｸ蠎ｫ繝輔ぃ繧､繝ｫ縺九ｉ繧ｵ繝�繝阪う繝ｫ逕ｨ縺ｮ譛蛻昴・逕ｻ蜒上ｒ謚ｽ蜃ｺ
 */
export async function getArchiveThumbnail(filePath: string): Promise<string | null> {
    const TIMEOUT_MS = 30000; // 30遘偵ち繧､繝�繧｢繧ｦ繝・

    try {
        // 繝輔ぃ繧､繝ｫ蟄伜惠遒ｺ隱・
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
        const outName = `${uuidv4()}${ext}`;
        const outPath = path.join(getThumbnailDir(), outName);

        // UUID サブフォルダを作成して解凍（ファイル名競合によるENOENTエラーを防ぐ）
        const extractId = uuidv4();
        const subDir = path.join(getTempDir(), extractId);
        fs.mkdirSync(subDir, { recursive: true });

        // 7za 縺ｧ謚ｽ蜃ｺ・医ヵ繝ｩ繝・ヨ螻暮幕・駅ith timeout
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
            // 繧ｨ繝ｩ繝ｼ遞ｮ蛻･蛻､螳・
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

        // 謚ｽ蜃ｺ縺輔ｌ縺溘ヵ繧｡繧､繝ｫ繧偵し繝繝阪う繝ｫ繝・ぅ繝ｬ繧ｯ繝医Μ縺ｫ遘ｻ蜍・
        const extractedBasename = path.basename(entryName);
        const extractedPath = path.join(subDir, extractedBasename);

        if (fs.existsSync(extractedPath)) {
            safeMoveFileSync(extractedPath, outPath);
            try { fs.rmSync(subDir, { recursive: true, force: true }); }
            catch (e) { log.warn(`Failed to cleanup temp archive dir: ${subDir}`, e); }
            return outPath;
        }

        // 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ: subDir 繧呈､懃ｴ｢
        const tempFiles = fs.readdirSync(subDir);
        const imageFile = tempFiles.find(f => {
            const fExt = path.extname(f).toLowerCase();
            return IMAGE_EXTENSIONS.includes(fExt);
        });

        if (imageFile) {
            const foundPath = path.join(subDir, imageFile);
            safeMoveFileSync(foundPath, outPath);
            log.info('Found image via fallback:', imageFile);
            try { fs.rmSync(subDir, { recursive: true, force: true }); }
            catch (e) { log.warn(`Failed to cleanup temp archive dir: ${subDir}`, e); }
            return outPath;
        }

        log.warn('Extracted file not found:', extractedPath);
        try { fs.rmSync(subDir, { recursive: true, force: true }); }
        catch (e) { log.warn(`Failed to cleanup temp archive dir: ${subDir}`, e); }
        return null;
    } catch (error: any) {
        // 隧ｳ邏ｰ繝ｭ繧ｰ
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
 * 譖ｸ蠎ｫ繝輔ぃ繧､繝ｫ縺九ｉ隍・焚縺ｮ繝励Ξ繝薙Η繝ｼ逕ｻ蜒上ｒ謚ｽ蜃ｺ
 * @param filePath - 譖ｸ蠎ｫ繝輔ぃ繧､繝ｫ繝代せ
 * @param limit - 蜿門ｾ励☆繧狗判蜒上・譛螟ｧ謨ｰ・医ョ繝輔か繝ｫ繝・ 9・・
 */
export async function getArchivePreviewFrames(
    filePath: string,
    limit: number = 9
): Promise<string[]> {
    try {
        const metadata = await getArchiveMetadata(filePath);
        if (!metadata || !metadata.imageEntries || metadata.imageEntries.length === 0) {
            return [];
        }

        const images = metadata.imageEntries;
        const selectedImages: string[] = [];

        // 譛蛻昴・逕ｻ蜒擾ｼ医し繝�繝阪う繝ｫ・峨ｒ繧ｹ繧ｭ繝・・・亥香蛻・↑逕ｻ蜒上′縺ゅｋ蝣ｴ蜷茨ｼ・
        const pool = images.length > 1 ? images.slice(1) : images;

        if (pool.length <= limit) {
            selectedImages.push(...pool);
        } else {
            // 蝮・ｭ峨↓蛻・淵縺励※驕ｸ謚・
            const step = (pool.length - 1) / (limit - 1);
            for (let i = 0; i < limit; i++) {
                const index = Math.round(i * step);
                selectedImages.push(pool[index]);
            }
        }

        const previewPaths: string[] = [];

        for (const entryName of selectedImages) {
            const ext = path.extname(entryName) || '.jpg';
            const extractId = uuidv4();
            const subDir = path.join(getTempDir(), extractId);
            const outName = `preview_${extractId}${ext}`;
            const outPath = path.join(getTempDir(), outName);

            try {
                // Phase 26: UUID サブフォルダに解凍して同名ファイル競合を防ぐ
                fs.mkdirSync(subDir, { recursive: true });

                await execFilePromise(SEVEN_ZA_PATH, [
                    'e', filePath, `-o${subDir}`, entryName, '-y', '-sccUTF-8'
                ]);

                const extractedBasename = path.basename(entryName);
                const extractedPath = path.join(subDir, extractedBasename);

                if (fs.existsSync(extractedPath)) {
                    safeMoveFileSync(extractedPath, outPath);
                    previewPaths.push(outPath);
                }
            } catch (e) {
                log.warn(`Failed to extract preview frame: ${entryName}`, e);
            } finally {
                // UUID サブフォルダを削除（残骸クリーンアップ）
                try {
                    if (fs.existsSync(subDir)) {
                        fs.rmSync(subDir, { recursive: true, force: true });
                    }
                } catch (cleanupErr) {
                    log.warn(`Failed to cleanup preview subDir: ${subDir}`, cleanupErr);
                }
            }
        }

        return previewPaths;
    } catch (error) {
        log.error(`Failed to get archive previews: ${filePath}`, error);
        return [];
    }
}

/**
 * 荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ繧偵け繝ｪ繝ｼ繝ｳ繧｢繝・・
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
 * 譖ｸ蠎ｫ繝輔ぃ繧､繝ｫ蜀・・髻ｳ螢ｰ繝輔ぃ繧､繝ｫ繝ｪ繧ｹ繝医ｒ蜿門ｾ・
 */
export async function getArchiveAudioFiles(archivePath: string): Promise<string[]> {
    const metadata = await getArchiveMetadata(archivePath);
    return metadata?.audioEntries || [];
}

/**
 * 譖ｸ蠎ｫ繝輔ぃ繧､繝ｫ縺九ｉ迚ｹ螳壹・髻ｳ螢ｰ繝輔ぃ繧､繝ｫ繧呈歓蜃ｺ縺励∽ｸ譎ゅヵ繧｡繧､繝ｫ繝代せ繧定ｿ斐☆
 */
export async function extractArchiveAudioFile(
    archivePath: string,
    entryName: string
): Promise<string | null> {
    const extractId = uuidv4();
    const extractDir = path.join(getTempDir(), 'audio', extractId);

    try {
        if (!fs.existsSync(extractDir)) {
            fs.mkdirSync(extractDir, { recursive: true });
        }

        // 7za縺ｧ迚ｹ螳壹ヵ繧｡繧､繝ｫ繧呈歓蜃ｺ
        await execFilePromise(SEVEN_ZA_PATH, [
            'e', archivePath,
            `-o${extractDir}`,
            entryName,
            '-y',
            '-sccUTF-8'
        ]);

        // 謚ｽ蜃ｺ縺励◆繝輔ぃ繧､繝ｫ繧呈爾縺・
        const extractedName = path.basename(entryName);
        const extractedPath = path.join(extractDir, extractedName);

        if (fs.existsSync(extractedPath)) {
            return extractedPath;
        }

        // 繝・ぅ繝ｬ繧ｯ繝医Μ蜀・ｒ讀懃ｴ｢
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

