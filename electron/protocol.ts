/**
 * Custom Protocol Handler for Media Files
 * 
 * Provides secure access to local media files via media:// protocol.
 * This allows webSecurity to remain enabled while serving local files.
 */

import { protocol } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.ogg': 'video/ogg',
        '.mov': 'video/quicktime',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.flac': 'audio/flac',
        '.m4a': 'audio/mp4',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml'
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Register the media:// protocol handler
 * 
 * Implements manual Range request handling to support video seeking.
 * Converts media://C:/path/to/file.mp4 to secure file streaming.
 */
export function registerMediaProtocol() {
    protocol.handle('media', (request) => {
        try {
            const parsed = new URL(request.url);

            // New format: media://local/<encoded-path>
            // Legacy format: media://<encoded-path>
            let encodedPath = '';
            if (parsed.hostname === 'local') {
                encodedPath = parsed.pathname.replace(/^\/+/, '');
            } else {
                encodedPath = request.url.replace(/^media:\/\//, '');
            }

            const decodedPath = decodeURIComponent(encodedPath);

            // Normalize path (remove leading slash on Windows if needed, though usually fileURLToPath handles it)
            // But here we need direct fs access path
            let filePath = decodedPath;

            // Allow file:/// prefix locally if passed
            if (filePath.startsWith('file:///')) {
                filePath = new URL(filePath).pathname;
                // Remove leading slash on Windows (e.g. /C:/...)
                if (process.platform === 'win32' && /^\/[a-zA-Z]:/.test(filePath)) {
                    filePath = filePath.substring(1);
                }
            }

            // Normalize /D:/... to D:/... on Windows
            if (process.platform === 'win32' && /^\/[a-zA-Z]:\//.test(filePath)) {
                filePath = filePath.substring(1);
            }

            // Stat file
            const stat = fs.statSync(filePath);
            const fileSize = stat.size;
            const mimeType = getMimeType(filePath);

            // Handle Range Header
            const rangeHeader = request.headers.get('Range');

            if (rangeHeader) {
                const parts = rangeHeader.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunksize = (end - start) + 1;

                const stream = fs.createReadStream(filePath, { start, end });

                return new Response(stream as any, {
                    status: 206,
                    headers: {
                        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': chunksize.toString(),
                        'Content-Type': mimeType,
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            } else {
                const stream = fs.createReadStream(filePath);
                return new Response(stream as any, {
                    status: 200,
                    headers: {
                        'Content-Length': fileSize.toString(),
                        'Content-Type': mimeType,
                        'Accept-Ranges': 'bytes', // Enable seeking support
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }

        } catch (error) {
            console.error('Failed to handle media:// protocol:', error);
            // Return 404 response on error
            return new Response('File not found', { status: 404 });
        }
    });
}
