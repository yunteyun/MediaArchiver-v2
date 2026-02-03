/**
 * Archive Handler - 書庫ファイル処理サービス
 * 
 * ZIP, RAR, 7Z, CBZ, CBR などの書庫ファイルを処理し、
 * メタデータ取得、サムネイル生成、プレビュー画像抽出を行う。
 */

import { path7za } from '7zip-bin';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { execFile } from 'child_process';
import util from 'util';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

const log = logger.scope('ArchiveHandler');

const execFilePromise = util.promisify(execFile);

// ディレクトリ設定
const TEMP_DIR = path.join(app.getPath('userData'), 'temp', 'archives');
const THUMBNAIL_DIR = path.join(app.getPath('userData'), 'thumbnails');

// サポートする書庫拡張子
const ARCHIVE_EXTENSIONS = ['.zip', '.cbz', '.rar', '.cbr', '.7z'];

// サポートする画像拡張子
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];

// サポートする音声拡張子
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.m4a', '.ogg', '.aac', '.wma'];

// 7za バイナリパスの解決
function resolve7zaPath(): string {
    let resolvedPath = path7za;

    // Production 環境での asar 対応
    if (resolvedPath && resolvedPath.includes('app.asar')) {
        resolvedPath = resolvedPath.replace('app.asar', 'app.asar.unpacked');
    }

    // パスが存在するか確認
    if (fs.existsSync(resolvedPath)) {
        log.info('7za binary found at:', resolvedPath);
        return resolvedPath;
    }

    // 開発環境でのフォールバック
    log.warn('7za binary not found at:', resolvedPath);
    const devPath = path.join(process.cwd(), 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');

    if (fs.existsSync(devPath)) {
        log.info('Found 7za in node_modules:', devPath);
        return devPath;
    }

    log.error('7za binary not found anywhere!');
    return resolvedPath; // 見つからなくても返す（エラーは後で発生）
}

const SEVEN_ZA_PATH = resolve7zaPath();

// ディレクトリ初期化
function ensureDirectories(): void {
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
    if (!fs.existsSync(THUMBNAIL_DIR)) {
        fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
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
 * ファイルが書庫ファイルかどうかを判定
 */
export function isArchive(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ARCHIVE_EXTENSIONS.includes(ext);
}

/**
 * 書庫ファイルのメタデータ（画像リスト）を取得
 */
export async function getArchiveMetadata(filePath: string): Promise<ArchiveMetadata | null> {
    try {
        // 7za -slt で詳細情報を取得
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

        // 最後のエントリを処理
        if (currentPath && !isDirectory) {
            entries.push(currentPath);
        }

        // 画像ファイルのみフィルタリング
        const imageEntries = entries.filter(name => {
            const ext = path.extname(name).toLowerCase();
            return IMAGE_EXTENSIONS.includes(ext);
        });

        // 音声ファイルをフィルタリング
        const audioEntries = entries.filter(name => {
            const ext = path.extname(name).toLowerCase();
            return AUDIO_EXTENSIONS.includes(ext);
        });

        // 自然順ソート（1.jpg, 2.jpg, 10.jpg）
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
 * 書庫ファイルからサムネイル用の最初の画像を抽出
 */
export async function getArchiveThumbnail(filePath: string): Promise<string | null> {
    const TIMEOUT_MS = 30000; // 30秒タイムアウト

    try {
        // ファイル存在確認
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
        const outPath = path.join(THUMBNAIL_DIR, outName);

        // 7za で抽出（フラット展開）with timeout
        try {
            await Promise.race([
                execFilePromise(SEVEN_ZA_PATH, [
                    'e', filePath, `-o${TEMP_DIR}`, entryName, '-y', '-sccUTF-8'
                ]),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Extraction timeout')), TIMEOUT_MS)
                )
            ]);
        } catch (execError: any) {
            // エラー種別判定
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

        // 抽出されたファイルをサムネイルディレクトリに移動
        const extractedBasename = path.basename(entryName);
        const extractedPath = path.join(TEMP_DIR, extractedBasename);

        if (fs.existsSync(extractedPath)) {
            fs.renameSync(extractedPath, outPath);
            return outPath;
        }

        // フォールバック: TEMP_DIRを検索
        const tempFiles = fs.readdirSync(TEMP_DIR);
        const imageFile = tempFiles.find(f => {
            const fExt = path.extname(f).toLowerCase();
            return IMAGE_EXTENSIONS.includes(fExt);
        });

        if (imageFile) {
            const foundPath = path.join(TEMP_DIR, imageFile);
            fs.renameSync(foundPath, outPath);
            log.info('Found image via fallback:', imageFile);
            return outPath;
        }

        log.warn('Extracted file not found:', extractedPath);
        return null;
    } catch (error: any) {
        // 詳細ログ
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
 * 書庫ファイルから複数のプレビュー画像を抽出
 * @param filePath - 書庫ファイルパス
 * @param limit - 取得する画像の最大数（デフォルト: 9）
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

        // 最初の画像（サムネイル）をスキップ（十分な画像がある場合）
        const pool = images.length > 1 ? images.slice(1) : images;

        if (pool.length <= limit) {
            selectedImages.push(...pool);
        } else {
            // 均等に分散して選択
            const step = (pool.length - 1) / (limit - 1);
            for (let i = 0; i < limit; i++) {
                const index = Math.round(i * step);
                selectedImages.push(pool[index]);
            }
        }

        const previewPaths: string[] = [];

        for (const entryName of selectedImages) {
            const ext = path.extname(entryName) || '.jpg';
            const outName = `preview_${uuidv4()}${ext}`;
            const outPath = path.join(TEMP_DIR, outName);

            try {
                await execFilePromise(SEVEN_ZA_PATH, [
                    'e', filePath, `-o${TEMP_DIR}`, entryName, '-y', '-sccUTF-8'
                ]);

                const extractedBasename = path.basename(entryName);
                const extractedPath = path.join(TEMP_DIR, extractedBasename);

                if (fs.existsSync(extractedPath)) {
                    fs.renameSync(extractedPath, outPath);
                    previewPaths.push(outPath);
                }
            } catch (e) {
                log.warn(`Failed to extract preview frame: ${entryName}`, e);
            }
        }

        return previewPaths;
    } catch (error) {
        log.error(`Failed to get archive previews: ${filePath}`, error);
        return [];
    }
}

/**
 * 一時ディレクトリをクリーンアップ
 */
export function cleanTempArchives(): void {
    try {
        if (fs.existsSync(TEMP_DIR)) {
            fs.rmSync(TEMP_DIR, { recursive: true, force: true });
            fs.mkdirSync(TEMP_DIR, { recursive: true });
            log.info('Temp archives cleaned');
        }
    } catch (e) {
        log.error('Failed to clean temp archives', e);
    }
}

/**
 * 書庫ファイル内の音声ファイルリストを取得
 */
export async function getArchiveAudioFiles(archivePath: string): Promise<string[]> {
    const metadata = await getArchiveMetadata(archivePath);
    return metadata?.audioEntries || [];
}

/**
 * 書庫ファイルから特定の音声ファイルを抽出し、一時ファイルパスを返す
 */
export async function extractArchiveAudioFile(
    archivePath: string,
    entryName: string
): Promise<string | null> {
    const extractId = uuidv4();
    const extractDir = path.join(TEMP_DIR, 'audio', extractId);

    try {
        if (!fs.existsSync(extractDir)) {
            fs.mkdirSync(extractDir, { recursive: true });
        }

        // 7zaで特定ファイルを抽出
        await execFilePromise(SEVEN_ZA_PATH, [
            'e', archivePath,
            `-o${extractDir}`,
            entryName,
            '-y',
            '-sccUTF-8'
        ]);

        // 抽出したファイルを探す
        const extractedName = path.basename(entryName);
        const extractedPath = path.join(extractDir, extractedName);

        if (fs.existsSync(extractedPath)) {
            return extractedPath;
        }

        // ディレクトリ内を検索
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

