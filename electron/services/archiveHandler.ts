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

const execFilePromise = util.promisify(execFile);

// ディレクトリ設定
const TEMP_DIR = path.join(app.getPath('userData'), 'temp', 'archives');
const THUMBNAIL_DIR = path.join(app.getPath('userData'), 'thumbnails');

// サポートする書庫拡張子
const ARCHIVE_EXTENSIONS = ['.zip', '.cbz', '.rar', '.cbr', '.7z'];

// サポートする画像拡張子
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];

// 7za バイナリパスの解決
function resolve7zaPath(): string {
    let resolvedPath = path7za;

    // Production 環境での asar 対応
    if (resolvedPath && resolvedPath.includes('app.asar')) {
        resolvedPath = resolvedPath.replace('app.asar', 'app.asar.unpacked');
    }

    // パスが存在するか確認
    if (fs.existsSync(resolvedPath)) {
        console.log('[ArchiveHandler] 7za binary found at:', resolvedPath);
        return resolvedPath;
    }

    // 開発環境でのフォールバック
    console.warn('[ArchiveHandler] 7za binary not found at:', resolvedPath);
    const devPath = path.join(process.cwd(), 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');

    if (fs.existsSync(devPath)) {
        console.log('[ArchiveHandler] Found 7za in node_modules:', devPath);
        return devPath;
    }

    console.error('[ArchiveHandler] 7za binary not found anywhere!');
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

        // 自然順ソート（1.jpg, 2.jpg, 10.jpg）
        const sortedImages = imageEntries.sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
        );

        return {
            fileCount: sortedImages.length,
            firstImageEntry: sortedImages.length > 0 ? sortedImages[0] : null,
            imageEntries: sortedImages
        };
    } catch (error) {
        console.error(`[ArchiveHandler] Failed to read archive: ${filePath}`, error);
        return null;
    }
}

/**
 * 書庫ファイルからサムネイル用の最初の画像を抽出
 */
export async function getArchiveThumbnail(filePath: string): Promise<string | null> {
    try {
        const metadata = await getArchiveMetadata(filePath);
        if (!metadata || !metadata.firstImageEntry) {
            return null;
        }

        const entryName = metadata.firstImageEntry;
        const ext = path.extname(entryName) || '.jpg';
        const outName = `${uuidv4()}${ext}`;
        const outPath = path.join(THUMBNAIL_DIR, outName);

        // 7za で抽出（フラット展開）
        await execFilePromise(SEVEN_ZA_PATH, [
            'e', filePath, `-o${TEMP_DIR}`, entryName, '-y', '-sccUTF-8'
        ]);

        // 抽出されたファイルをサムネイルディレクトリに移動
        const extractedBasename = path.basename(entryName);
        const extractedPath = path.join(TEMP_DIR, extractedBasename);

        if (fs.existsSync(extractedPath)) {
            fs.renameSync(extractedPath, outPath);
            return outPath;
        }

        return null;
    } catch (error) {
        console.error(`[ArchiveHandler] Failed to extract thumbnail: ${filePath}`, error);
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
                console.warn(`[ArchiveHandler] Failed to extract preview frame: ${entryName}`, e);
            }
        }

        return previewPaths;
    } catch (error) {
        console.error(`[ArchiveHandler] Failed to get archive previews: ${filePath}`, error);
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
            console.log('[ArchiveHandler] Temp archives cleaned');
        }
    } catch (e) {
        console.error('[ArchiveHandler] Failed to clean temp archives', e);
    }
}
