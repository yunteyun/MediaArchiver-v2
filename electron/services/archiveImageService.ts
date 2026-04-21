import { path7za } from '7zip-bin';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';
import { app } from 'electron';
import { execFile } from 'child_process';
import util from 'util';
import { v4 as uuidv4 } from 'uuid';
import pLimit from 'p-limit';
import { getProfileThumbnailRootDir } from './thumbnailPaths';
import { THUMBNAIL_WEBP_QUALITY } from './thumbnailQuality';
import { getArchiveMetadata } from './archiveHandler';
import { logger } from './logger';

const log = logger.scope('ArchiveImageService');
const execFilePromise = util.promisify(execFile);

// 漫画ビューア専用の並列制限（既存 previewLimit との競合を避ける）
const mangaPageLimit = pLimit(2);

function resolve7zaPath(): string {
    if (app.isPackaged) {
        return path.join(
            process.resourcesPath,
            'app.asar.unpacked',
            'node_modules',
            '7zip-bin',
            'win', 'x64', '7za.exe'
        );
    }
    const candidates = [
        path7za,
        path.join(process.cwd(), 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe'),
        path.join(app.getAppPath(), '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe'),
        path.join(__dirname, '..', '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe'),
    ].map(p => path.normalize(p));
    for (const c of candidates) {
        if (fs.existsSync(c)) return c;
    }
    return path7za;
}

const SEVEN_ZA_PATH = resolve7zaPath();

function buildCacheKey(filePath: string): string {
    try {
        const stat = fs.statSync(filePath);
        return crypto.createHash('sha1').update(`${filePath}|${stat.size}|${stat.mtimeMs}`).digest('hex');
    } catch {
        return crypto.createHash('sha1').update(filePath).digest('hex');
    }
}

function getMangaPageDir(cacheKey: string): string {
    const dir = path.join(getProfileThumbnailRootDir(null), 'archive-manga', cacheKey);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

export async function getArchiveImageByIndex(
    filePath: string,
    index: number
): Promise<string | null> {
    return mangaPageLimit(() => getArchiveImageByIndexRaw(filePath, index));
}

async function getArchiveImageByIndexRaw(
    filePath: string,
    index: number
): Promise<string | null> {
    try {
        const cacheKey = buildCacheKey(filePath);
        const cacheDir = getMangaPageDir(cacheKey);
        const cachedPath = path.join(cacheDir, `page_${String(index).padStart(4, '0')}.webp`);

        if (fs.existsSync(cachedPath)) return cachedPath;

        const metadata = await getArchiveMetadata(filePath);
        if (!metadata?.imageEntries?.length) return null;
        if (index < 0 || index >= metadata.imageEntries.length) return null;

        const entryName = metadata.imageEntries[index];
        const extractId = uuidv4();
        const subDir = path.join(app.getPath('userData'), 'temp', 'archives', extractId);
        fs.mkdirSync(subDir, { recursive: true });

        try {
            await execFilePromise(SEVEN_ZA_PATH, [
                'e', filePath, `-o${subDir}`, entryName, '-y', '-sccUTF-8'
            ]);

            const extractedPath = path.join(subDir, path.basename(entryName));
            if (!fs.existsSync(extractedPath)) return null;

            await sharp(extractedPath)
                .webp({ quality: THUMBNAIL_WEBP_QUALITY.archive })
                .toFile(cachedPath);

            return cachedPath;
        } finally {
            try {
                if (fs.existsSync(subDir)) fs.rmSync(subDir, { recursive: true, force: true });
            } catch { /* cleanup failure is non-fatal */ }
        }
    } catch (e) {
        log.error(`Failed to get archive image [${index}]: ${filePath}`, e);
        return null;
    }
}
