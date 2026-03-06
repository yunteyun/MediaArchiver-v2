import type { MediaFile } from '../types/file';

type ArchiveMetadata = {
    hasAudio?: unknown;
    audioEntries?: unknown;
    imageEntries?: unknown;
    imageCount?: unknown;
    pageCount?: unknown;
    fileCount?: unknown;
};

function parseArchiveMetadata(file: Pick<MediaFile, 'type' | 'metadata'>): ArchiveMetadata | null {
    if (file.type !== 'archive' || !file.metadata) {
        return null;
    }

    try {
        const metadata = JSON.parse(file.metadata) as ArchiveMetadata;
        return metadata && typeof metadata === 'object' ? metadata : null;
    } catch {
        return null;
    }
}

function parseLegacyCount(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    if (value < 0) return null;
    return Math.floor(value);
}

/**
 * Check if an archive file contains audio files based on metadata
 * @param file MediaFile object
 * @returns boolean
 */
export const isAudioArchive = (file: MediaFile): boolean => {
    const metadata = parseArchiveMetadata(file);
    if (!metadata) return false;
    if (Array.isArray(metadata.audioEntries) && metadata.audioEntries.length > 0) return true;
    return !!metadata.hasAudio;
};

/**
 * Read archive image/page count with backward compatibility for legacy metadata shapes.
 */
export const getArchiveImageCount = (file: Pick<MediaFile, 'type' | 'metadata'>): number | null => {
    const metadata = parseArchiveMetadata(file);
    if (!metadata) return null;

    if (Array.isArray(metadata.imageEntries)) {
        return metadata.imageEntries.length;
    }

    const legacyImageCount =
        parseLegacyCount(metadata.imageCount)
        ?? parseLegacyCount(metadata.pageCount);
    if (legacyImageCount != null) {
        return legacyImageCount;
    }

    // Fallback for older metadata that only kept total file count.
    return parseLegacyCount(metadata.fileCount);
};
