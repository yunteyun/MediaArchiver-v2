import type { PlaybackBookmark } from '../types/file';

export const BOOKMARK_DUPLICATE_THRESHOLD_SECONDS = 2;
export const BOOKMARK_SORT_STORAGE_KEY = 'playback-bookmarks-sort-mode';

export type BookmarkSortMode = 'timeline' | 'recent';

type BookmarkSortStorage = Pick<Storage, 'getItem' | 'setItem'>;

function getBookmarkSortStorage(storage?: BookmarkSortStorage | null): BookmarkSortStorage | null {
    if (storage !== undefined) {
        return storage;
    }

    if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
        return null;
    }

    return globalThis.localStorage;
}

export function getInitialBookmarkSortMode(storage?: BookmarkSortStorage | null): BookmarkSortMode {
    try {
        const stored = getBookmarkSortStorage(storage)?.getItem(BOOKMARK_SORT_STORAGE_KEY);
        return stored === 'recent' ? 'recent' : 'timeline';
    } catch {
        return 'timeline';
    }
}

export function persistBookmarkSortMode(sortMode: BookmarkSortMode, storage?: BookmarkSortStorage | null): void {
    try {
        getBookmarkSortStorage(storage)?.setItem(BOOKMARK_SORT_STORAGE_KEY, sortMode);
    } catch {
        // Ignore storage failures and keep the current in-memory setting.
    }
}

export function sortPlaybackBookmarks(items: PlaybackBookmark[], sortMode: BookmarkSortMode): PlaybackBookmark[] {
    const next = [...items];
    if (sortMode === 'recent') {
        return next.sort((a, b) => b.createdAt - a.createdAt || a.timeSeconds - b.timeSeconds);
    }

    return next.sort((a, b) => a.timeSeconds - b.timeSeconds || a.createdAt - b.createdAt);
}
