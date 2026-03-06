import http from 'http';
import https from 'https';

export interface AppUpdateCheckResult {
    success: boolean;
    currentVersion: string;
    latestVersion?: string;
    hasUpdate?: boolean;
    releaseUrl?: string;
    publishedAt?: string;
    sourceUrl: string;
    error?: string;
}

type ReleaseFeedPayload = {
    tag_name?: unknown;
    html_url?: unknown;
    published_at?: unknown;
};

const DEFAULT_RELEASE_FEED_URL = 'https://api.github.com/repos/yunteyun/MediaArchiver-v2/releases/latest';

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

function requestJson(url: string, timeoutMs = 10000): Promise<unknown> {
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
                    try {
                        resolve(JSON.parse(body));
                    } catch {
                        reject(new Error('Invalid JSON response'));
                    }
                });
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
            releaseUrl: typeof payload.html_url === 'string' ? payload.html_url : undefined,
            publishedAt: typeof payload.published_at === 'string' ? payload.published_at : undefined,
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

