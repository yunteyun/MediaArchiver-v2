/**
 * Custom Protocol Handler for Media Files
 * 
 * Provides secure access to local media files via media:// protocol.
 * This allows webSecurity to remain enabled while serving local files.
 */

import { protocol, net } from 'electron';
import { pathToFileURL } from 'url';

/**
 * Register the media:// protocol handler
 * 
 * Converts media://C:/path/to/file.jpg to file:///C:/path/to/file.jpg
 * and serves it via Electron's net.fetch API.
 */
export function registerMediaProtocol() {
    protocol.handle('media', (request) => {
        try {
            // Extract file path from media:// URL
            const filePath = request.url.replace('media://', '');
            const decodedPath = decodeURIComponent(filePath);

            // Convert to file:// URL and fetch
            const fileUrl = pathToFileURL(decodedPath).href;
            return net.fetch(fileUrl);
        } catch (error) {
            console.error('Failed to handle media:// protocol:', error);
            // Return 404 response on error
            return new Response('File not found', { status: 404 });
        }
    });
}
