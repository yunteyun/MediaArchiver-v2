import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlaybackBookmark } from '../../types/file';
import {
    getInitialBookmarkSortMode,
    persistBookmarkSortMode,
    sortPlaybackBookmarks,
} from '../playbackBookmarks';

const originalLocalStorage = globalThis.localStorage;

function createBookmark(overrides: Partial<PlaybackBookmark>): PlaybackBookmark {
    return {
        id: overrides.id ?? 'bookmark-id',
        fileId: overrides.fileId ?? 'file-id',
        timeSeconds: overrides.timeSeconds ?? 0,
        note: overrides.note ?? null,
        createdAt: overrides.createdAt ?? 0,
        updatedAt: overrides.updatedAt ?? overrides.createdAt ?? 0,
    };
}

describe('playbackBookmarks utils', () => {
    afterEach(() => {
        if (originalLocalStorage) {
            vi.stubGlobal('localStorage', originalLocalStorage);
        } else {
            delete globalThis.localStorage;
        }
    });

    it('returns timeline when storage is unavailable or invalid', () => {
        delete globalThis.localStorage;
        expect(getInitialBookmarkSortMode()).toBe('timeline');

        vi.stubGlobal('localStorage', {
            getItem: () => 'unexpected',
            setItem: vi.fn(),
        });
        expect(getInitialBookmarkSortMode()).toBe('timeline');
    });

    it('loads and saves the recent sort mode', () => {
        const store = new Map<string, string>();
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => store.get(key) ?? null,
            setItem: (key: string, value: string) => {
                store.set(key, value);
            },
        });

        persistBookmarkSortMode('recent');
        expect(getInitialBookmarkSortMode()).toBe('recent');
    });

    it('sorts bookmarks by timeline or recency', () => {
        const bookmarks = [
            createBookmark({ id: 'a', timeSeconds: 40, createdAt: 100 }),
            createBookmark({ id: 'b', timeSeconds: 10, createdAt: 300 }),
            createBookmark({ id: 'c', timeSeconds: 10, createdAt: 200 }),
        ];

        expect(sortPlaybackBookmarks(bookmarks, 'timeline').map((bookmark) => bookmark.id)).toEqual(['c', 'b', 'a']);
        expect(sortPlaybackBookmarks(bookmarks, 'recent').map((bookmark) => bookmark.id)).toEqual(['b', 'c', 'a']);
    });
});
