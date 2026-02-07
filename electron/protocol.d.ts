/**
 * Custom Protocol Handler for Media Files
 *
 * Provides secure access to local media files via media:// protocol.
 * This allows webSecurity to remain enabled while serving local files.
 */
/**
 * Register the media:// protocol handler
 *
 * Implements manual Range request handling to support video seeking.
 * Converts media://C:/path/to/file.mp4 to secure file streaming.
 */
export declare function registerMediaProtocol(): void;
