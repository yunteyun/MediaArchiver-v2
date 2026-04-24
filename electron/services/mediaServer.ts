import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getBasePath } from './storageConfig';

const TOKEN = crypto.randomBytes(16).toString('hex');
let _server: http.Server | null = null;
let _baseUrl = '';

function getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const types: Record<string, string> = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.ogg': 'video/ogg',
        '.mov': 'video/quicktime',
        '.mkv': 'video/x-matroska',
        '.avi': 'video/x-msvideo',
        '.m4v': 'video/mp4',
        '.ts': 'video/mp2t',
        '.m2ts': 'video/mp2t',
        '.wmv': 'video/x-ms-wmv',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.flac': 'audio/flac',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac',
        '.opus': 'audio/opus',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.avif': 'image/avif',
        '.bmp': 'image/bmp',
        '.tif': 'image/tiff',
        '.tiff': 'image/tiff',
    };
    return types[ext] ?? 'application/octet-stream';
}

function resolveFilePath(decodedPath: string): string {
    if (fs.existsSync(decodedPath)) return decodedPath;
    const normalized = path.normalize(decodedPath);
    const marker = `${path.sep}thumbnails${path.sep}`;
    const idx = normalized.toLowerCase().indexOf(marker.toLowerCase());
    if (idx < 0) return decodedPath;
    const rel = normalized.slice(idx + marker.length);
    const fallback = path.join(getBasePath(), 'thumbnails', rel);
    return fs.existsSync(fallback) ? fallback : decodedPath;
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = req.url ?? '/';
    const prefix = `/${TOKEN}/`;

    if (!url.startsWith(prefix)) {
        res.writeHead(403).end();
        return;
    }

    try {
        const encodedPath = (url.slice(prefix.length).split('?')[0]) ?? '';
        const decodedPath = decodeURIComponent(encodedPath);
        const filePath = resolveFilePath(decodedPath);

        const stat = await fs.promises.stat(filePath);
        const fileSize = stat.size;
        const mimeType = getMimeType(filePath);
        const rangeHeader = req.headers['range'];

        if (rangeHeader) {
            const parts = rangeHeader.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0] ?? '0', 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = end - start + 1;
            const stream = fs.createReadStream(filePath, { start, end });
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': mimeType,
                'Access-Control-Allow-Origin': '*',
            });
            stream.on('error', () => res.destroy());
            stream.pipe(res);
        } else if (mimeType.startsWith('image/')) {
            const LARGE = 100 * 1024 * 1024;
            const headers = {
                'Content-Length': fileSize,
                'Content-Type': mimeType,
                'Accept-Ranges': 'bytes',
                'Access-Control-Allow-Origin': '*',
            };
            if (fileSize < LARGE) {
                const buffer = await fs.promises.readFile(filePath);
                res.writeHead(200, headers);
                res.end(buffer);
            } else {
                const stream = fs.createReadStream(filePath);
                res.writeHead(200, headers);
                stream.on('error', () => res.destroy());
                stream.pipe(res);
            }
        } else {
            const stream = fs.createReadStream(filePath);
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': mimeType,
                'Accept-Ranges': 'bytes',
                'Access-Control-Allow-Origin': '*',
            });
            stream.on('error', () => res.destroy());
            stream.pipe(res);
        }
    } catch {
        if (!res.headersSent) {
            res.writeHead(404).end();
        }
    }
}

export async function startMediaServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        _server = http.createServer((req, res) => {
            void handleRequest(req, res);
        });
        _server.listen(0, '127.0.0.1', () => {
            const addr = _server!.address();
            if (!addr || typeof addr === 'string') {
                reject(new Error('Media server failed to bind'));
                return;
            }
            _baseUrl = `http://127.0.0.1:${addr.port}/${TOKEN}`;
            resolve();
        });
        _server.on('error', reject);
    });
}

export function stopMediaServer(): void {
    _server?.close();
    _server = null;
    _baseUrl = '';
}

export function getMediaBaseUrl(): string {
    return _baseUrl;
}
