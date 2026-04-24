/**
 * Media Path Utilities
 *
 * Converts file paths to HTTP media server URLs for secure local access.
 */

let _cachedBase: string | null = null;

function getBase(): string {
    if (_cachedBase !== null) return _cachedBase;
    _cachedBase = window.electronAPI.getMediaBaseUrl();
    return _cachedBase;
}

/**
 * Convert a file path to a media server URL.
 *
 * @example
 * toMediaUrl('C:\\Users\\user\\image.jpg') // => 'http://127.0.0.1:PORT/TOKEN/C%3A%2FUsers%2Fuser%2Fimage.jpg'
 */
export function toMediaUrl(filePath: string | null | undefined): string {
    if (!filePath) return '';
    const normalized = filePath.replace(/\\/g, '/');
    return `${getBase()}/${encodeURIComponent(normalized)}`;
}
