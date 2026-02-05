/**
 * Media Path Utilities
 * 
 * Converts file paths to media:// protocol URLs for secure access.
 */

/**
 * Convert a file path to a media:// protocol URL
 * 
 * @param filePath - Absolute file path (Windows or Unix style)
 * @returns media:// URL or empty string if path is null/undefined
 * 
 * @example
 * toMediaUrl('C:\\Users\\user\\image.jpg') // => 'media://C:/Users/user/image.jpg'
 * toMediaUrl('/home/user/image.jpg') // => 'media:///home/user/image.jpg'
 */
export function toMediaUrl(filePath: string | null | undefined): string {
    if (!filePath) return '';

    // Normalize Windows backslashes to forward slashes
    const normalized = filePath.replace(/\\/g, '/');

    // Encode the path to handle special characters
    return `media://${encodeURIComponent(normalized)}`;
}
