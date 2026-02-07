import type { MediaFile } from '../types/file';

/**
 * Check if an archive file contains audio files based on metadata
 * @param file MediaFile object
 * @returns boolean
 */
export const isAudioArchive = (file: MediaFile): boolean => {
    if (file.type !== 'archive' || !file.metadata) {
        return false;
    }

    try {
        const metadata = JSON.parse(file.metadata);
        return !!metadata.hasAudio;
    } catch (e) {
        // metadata parse error, treat as false
        return false;
    }
};
