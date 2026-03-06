import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { app } from 'electron';

export interface AppUpdateCheckResult {
    success: boolean;
    currentVersion: string;
    latestVersion?: string;
    hasUpdate?: boolean;
    downloadUrl?: string;
    downloadFileName?: string;
    releaseUrl?: string;
    publishedAt?: string;
    releaseNotes?: string;
    sourceUrl: string;
    error?: string;
}

export interface AppUpdateDownloadResult {
    success: boolean;
    sourceUrl: string;
    filePath?: string;
    fileName?: string;
    bytes?: number;
    sha256?: string;
    expectedSha256?: string;
    verified?: boolean;
    error?: string;
}

type ReleaseFeedPayload = {
    tag_name?: unknown;
    html_url?: unknown;
    published_at?: unknown;
    body?: unknown;
    assets?: unknown;
};

const DEFAULT_RELEASE_FEED_URL = 'https://api.github.com/repos/yunteyun/MediaArchiver-v2/releases/latest';
const MAX_REDIRECTS = 5;

type ReleaseAsset = {
    name: string;
    browserDownloadUrl: string;
    size: number;
};

function normalizeVersion(raw: string): string {
    return raw.trim().replace(/^v/i, '').replace(/-d/i, 'd');
}

function parseVersion(version: string): [number, number, number, number] | null {
    const normalized = normalizeVersion(version);
    const match = normalized.match(/^(\d+)\.(\d+)\.(\d+)(?:d(\d+))?$/i);
    if (!match) return null;

    const major = Number(match[1]);
    const minor = Number(match[2]);
    const patch = Number(match[3]);
    const debugPatch = Number(match[4] ?? 0);

    if (![major, minor, patch, debugPatch].every((n) => Number.isFinite(n))) return null;
    return [major, minor, patch, debugPatch];
}

function compareVersions(current: string, latest: string): number | null {
    const a = parseVersion(current);
    const b = parseVersion(latest);
    if (!a || !b) return null;

    for (let i = 0; i < a.length; i += 1) {
        if (a[i]! < b[i]!) return -1;
        if (a[i]! > b[i]!) return 1;
    }
    return 0;
}

function requestText(url: string, timeoutMs = 10000, redirectCount = 0): Promise<string> {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const requester = parsedUrl.protocol === 'http:' ? http : https;

        const req = requester.request(
            parsedUrl,
            {
                method: 'GET',
                headers: {
                    Accept: 'application/vnd.github+json',
                    'User-Agent': 'MediaArchiver-v2-update-check',
                },
            },
            (res) => {
                const statusCode = res.statusCode ?? 0;

                if (statusCode >= 300 && statusCode < 400) {
                    if (redirectCount >= MAX_REDIRECTS) {
                        reject(new Error('Too many redirects'));
                        return;
                    }
                    const location = res.headers.location;
                    if (!location) {
                        reject(new Error('Redirect location is missing'));
                        return;
                    }
                    const nextUrl = new URL(location, parsedUrl).toString();
                    res.resume();
                    requestText(nextUrl, timeoutMs, redirectCount + 1).then(resolve).catch(reject);
                    return;
                }

                let body = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    body += chunk;
                });
                res.on('end', () => {
                    if (statusCode < 200 || statusCode >= 300) {
                        reject(new Error(`HTTP ${statusCode}`));
                        return;
                    }
                    resolve(body);
                });
            }
        );

        req.on('error', (error) => reject(error));
        req.setTimeout(timeoutMs, () => req.destroy(new Error('Request timeout')));
        req.end();
    });
}

async function requestJson(url: string, timeoutMs = 10000): Promise<unknown> {
    const body = await requestText(url, timeoutMs);
    try {
        return JSON.parse(body);
    } catch {
        throw new Error('Invalid JSON response');
    }
}

function parseReleaseAssets(payload: ReleaseFeedPayload): ReleaseAsset[] {
    if (!Array.isArray(payload.assets)) return [];
    const parsed: ReleaseAsset[] = [];
    for (const rawAsset of payload.assets) {
        if (!rawAsset || typeof rawAsset !== 'object') continue;
        const record = rawAsset as Record<string, unknown>;
        const name = typeof record.name === 'string' ? record.name : null;
        const browserDownloadUrl = typeof record.browser_download_url === 'string'
            ? record.browser_download_url
            : null;
        const sizeRaw = record.size;
        const size = typeof sizeRaw === 'number' && Number.isFinite(sizeRaw) ? sizeRaw : 0;

        if (!name || !browserDownloadUrl) continue;
        parsed.push({ name, browserDownloadUrl, size });
    }
    return parsed;
}

function resolveZipAsset(assets: ReleaseAsset[]): ReleaseAsset | null {
    const zipAssets = assets.filter((asset) => asset.name.toLowerCase().endsWith('.zip'));
    if (zipAssets.length === 0) return null;
    return zipAssets.find((asset) => asset.name.toLowerCase().includes('mediaarchiver')) ?? zipAssets[0]!;
}

function resolveSha256Asset(assets: ReleaseAsset[], zipAssetName: string): ReleaseAsset | null {
    const zipNameLower = zipAssetName.toLowerCase();
    const exact = assets.find((asset) => {
        const lower = asset.name.toLowerCase();
        return lower === `${zipNameLower}.sha256` || lower === `${zipNameLower}.sha256.txt`;
    });
    if (exact) return exact;
    return assets.find((asset) => asset.name.toLowerCase().endsWith('.sha256')) ?? null;
}

function extractSha256FromText(text: string): string | null {
    const match = text.match(/\b[a-fA-F0-9]{64}\b/);
    return match ? match[0].toLowerCase() : null;
}

function ensureDownloadDirectory(): string {
    const dir = path.join(app.getPath('temp'), 'MediaArchiver-v2-updates');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function downloadFileWithSha256(
    url: string,
    outputPath: string,
    timeoutMs = 60000,
    redirectCount = 0
): Promise<{ bytes: number; sha256: string }> {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const requester = parsedUrl.protocol === 'http:' ? http : https;

        const req = requester.request(
            parsedUrl,
            {
                method: 'GET',
                headers: {
                    'User-Agent': 'MediaArchiver-v2-update-download',
                },
            },
            (res) => {
                const statusCode = res.statusCode ?? 0;

                if (statusCode >= 300 && statusCode < 400) {
                    if (redirectCount >= MAX_REDIRECTS) {
                        reject(new Error('Too many redirects'));
                        return;
                    }
                    const location = res.headers.location;
                    if (!location) {
                        reject(new Error('Redirect location is missing'));
                        return;
                    }
                    const nextUrl = new URL(location, parsedUrl).toString();
                    res.resume();
                    downloadFileWithSha256(nextUrl, outputPath, timeoutMs, redirectCount + 1).then(resolve).catch(reject);
                    return;
                }

                if (statusCode < 200 || statusCode >= 300) {
                    reject(new Error(`HTTP ${statusCode}`));
                    return;
                }

                const hash = crypto.createHash('sha256');
                let bytes = 0;
                const output = fs.createWriteStream(outputPath);

                res.on('data', (chunk: Buffer) => {
                    bytes += chunk.length;
                    hash.update(chunk);
                });

                res.on('error', (error) => reject(error));
                output.on('error', (error) => reject(error));

                output.on('finish', () => {
                    resolve({ bytes, sha256: hash.digest('hex').toLowerCase() });
                });

                res.pipe(output);
            }
        );

        req.on('error', (error) => reject(error));
        req.setTimeout(timeoutMs, () => req.destroy(new Error('Request timeout')));
        req.end();
    });
}

export async function checkForAppUpdate(
    currentVersion: string,
    sourceUrl = DEFAULT_RELEASE_FEED_URL
): Promise<AppUpdateCheckResult> {
    const normalizedCurrentVersion = normalizeVersion(currentVersion);

    try {
        const payload = await requestJson(sourceUrl) as ReleaseFeedPayload;
        const assets = parseReleaseAssets(payload);
        const zipAsset = resolveZipAsset(assets);
        const latestRaw = typeof payload.tag_name === 'string' ? payload.tag_name : '';
        const latestVersion = normalizeVersion(latestRaw);
        if (!latestVersion) {
            return {
                success: false,
                currentVersion: normalizedCurrentVersion,
                sourceUrl,
                error: '最新版のバージョン情報を取得できませんでした',
            };
        }

        const compared = compareVersions(normalizedCurrentVersion, latestVersion);
        const hasUpdate = compared == null
            ? normalizedCurrentVersion !== latestVersion
            : compared < 0;

        return {
            success: true,
            currentVersion: normalizedCurrentVersion,
            latestVersion,
            hasUpdate,
            downloadUrl: zipAsset?.browserDownloadUrl,
            downloadFileName: zipAsset?.name,
            releaseUrl: typeof payload.html_url === 'string' ? payload.html_url : undefined,
            publishedAt: typeof payload.published_at === 'string' ? payload.published_at : undefined,
            releaseNotes: typeof payload.body === 'string' ? payload.body.trim() : undefined,
            sourceUrl,
        };
    } catch (error) {
        return {
            success: false,
            currentVersion: normalizedCurrentVersion,
            sourceUrl,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

export async function downloadLatestUpdateZip(
    sourceUrl = DEFAULT_RELEASE_FEED_URL
): Promise<AppUpdateDownloadResult> {
    try {
        const payload = await requestJson(sourceUrl) as ReleaseFeedPayload;
        const assets = parseReleaseAssets(payload);
        const zipAsset = resolveZipAsset(assets);

        if (!zipAsset) {
            return {
                success: false,
                sourceUrl,
                error: '最新版のZIP資産が見つかりませんでした',
            };
        }

        const downloadDir = ensureDownloadDirectory();
        const fileName = `${Date.now()}-${sanitizeFileName(zipAsset.name)}`;
        const filePath = path.join(downloadDir, fileName);

        const downloaded = await downloadFileWithSha256(zipAsset.browserDownloadUrl, filePath);

        let expectedSha256: string | undefined;
        let verified: boolean | undefined;
        const shaAsset = resolveSha256Asset(assets, zipAsset.name);
        if (shaAsset) {
            try {
                const checksumText = await requestText(shaAsset.browserDownloadUrl, 15000);
                const parsedSha256 = extractSha256FromText(checksumText);
                if (parsedSha256) {
                    expectedSha256 = parsedSha256;
                    verified = downloaded.sha256 === parsedSha256;
                }
            } catch {
                // Keep checksum as best-effort; download result itself remains valid.
            }
        }

        if (verified === false) {
            try {
                fs.unlinkSync(filePath);
            } catch {
                // ignore cleanup failures
            }
            return {
                success: false,
                sourceUrl,
                fileName: zipAsset.name,
                expectedSha256,
                sha256: downloaded.sha256,
                verified,
                error: 'ダウンロードしたZIPのハッシュ検証に失敗しました',
            };
        }

        return {
            success: true,
            sourceUrl,
            filePath,
            fileName: zipAsset.name,
            bytes: downloaded.bytes,
            sha256: downloaded.sha256,
            expectedSha256,
            verified,
        };
    } catch (error) {
        return {
            success: false,
            sourceUrl,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
