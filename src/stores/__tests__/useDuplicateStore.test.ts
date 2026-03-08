import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDuplicateStore, type DuplicateGroup } from '../useDuplicateStore';

function createGroup(overrides: Partial<DuplicateGroup> = {}): DuplicateGroup {
    return {
        hash: overrides.hash ?? 'hash-1',
        size: overrides.size ?? 100,
        count: overrides.count ?? 2,
        files: overrides.files ?? [
            {
                id: 'file-1',
                name: 'file-1.png',
                path: 'C:\\library\\file-1.png',
                size: 100,
                type: 'image',
                created_at: 10,
                mtime_ms: 10,
                tags: [],
            },
            {
                id: 'file-2',
                name: 'file-2.png',
                path: 'C:\\library\\file-2.png',
                size: 100,
                type: 'image',
                created_at: 20,
                mtime_ms: 20,
                tags: [],
            },
        ],
    };
}

describe('useDuplicateStore', () => {
    beforeEach(() => {
        useDuplicateStore.setState({
            groups: [],
            stats: null,
            isSearching: false,
            progress: null,
            selectedFileIds: new Set(),
            isDeleting: false,
            hasSearched: false,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('loads duplicate search results and marks search complete', async () => {
        const groups = [createGroup()];
        const findDuplicates = vi.fn().mockResolvedValue({
            groups,
            stats: {
                totalGroups: 1,
                totalFiles: 1,
                wastedSpace: 100,
            },
        });

        vi.stubGlobal('window', {
            electronAPI: {
                findDuplicates,
                cancelDuplicateSearch: vi.fn(),
                deleteDuplicateFiles: vi.fn(),
            },
        });

        await useDuplicateStore.getState().startSearch();

        const state = useDuplicateStore.getState();
        expect(findDuplicates).toHaveBeenCalledTimes(1);
        expect(state.groups).toEqual(groups);
        expect(state.stats).toEqual({
            totalGroups: 1,
            totalFiles: 1,
            wastedSpace: 100,
        });
        expect(state.progress).toEqual({ phase: 'complete', current: 0, total: 0 });
        expect(state.isSearching).toBe(false);
        expect(state.hasSearched).toBe(true);
    });

    it('removes successfully deleted duplicate files and recalculates stats', async () => {
        const groupA = createGroup({
            hash: 'hash-a',
            size: 100,
            count: 3,
            files: [
                {
                    id: 'keep-a',
                    name: 'keep-a.png',
                    path: 'C:\\library\\keep-a.png',
                    size: 100,
                    type: 'image',
                    created_at: 10,
                    tags: [],
                },
                {
                    id: 'delete-a1',
                    name: 'delete-a1.png',
                    path: 'C:\\library\\delete-a1.png',
                    size: 100,
                    type: 'image',
                    created_at: 11,
                    tags: [],
                },
                {
                    id: 'delete-a2',
                    name: 'delete-a2.png',
                    path: 'C:\\library\\delete-a2.png',
                    size: 100,
                    type: 'image',
                    created_at: 12,
                    tags: [],
                },
            ],
        });
        const groupB = createGroup({
            hash: 'hash-b',
            size: 50,
            count: 2,
            files: [
                {
                    id: 'keep-b',
                    name: 'keep-b.png',
                    path: 'C:\\library\\keep-b.png',
                    size: 50,
                    type: 'image',
                    created_at: 13,
                    tags: [],
                },
                {
                    id: 'delete-b1',
                    name: 'delete-b1.png',
                    path: 'C:\\library\\delete-b1.png',
                    size: 50,
                    type: 'image',
                    created_at: 14,
                    tags: [],
                },
            ],
        });

        useDuplicateStore.setState({
            groups: [groupA, groupB],
            stats: {
                totalGroups: 2,
                totalFiles: 3,
                wastedSpace: 250,
            },
            selectedFileIds: new Set(['delete-a1', 'delete-a2', 'delete-b1']),
        });

        const deleteDuplicateFiles = vi.fn().mockResolvedValue([
            { id: 'delete-a1', success: true },
            { id: 'delete-a2', success: false, error: 'busy' },
            { id: 'delete-b1', success: true },
        ]);

        vi.stubGlobal('window', {
            electronAPI: {
                findDuplicates: vi.fn(),
                cancelDuplicateSearch: vi.fn(),
                deleteDuplicateFiles,
            },
        });

        await useDuplicateStore.getState().deleteSelectedFiles();

        const state = useDuplicateStore.getState();
        expect(deleteDuplicateFiles).toHaveBeenCalledWith(['delete-a1', 'delete-a2', 'delete-b1']);
        expect(state.groups).toHaveLength(1);
        expect(state.groups[0]?.hash).toBe('hash-a');
        expect(state.groups[0]?.files.map((file) => file.id)).toEqual(['keep-a', 'delete-a2']);
        expect(state.stats).toEqual({
            totalGroups: 1,
            totalFiles: 1,
            wastedSpace: 100,
        });
        expect(state.selectedFileIds.size).toBe(0);
        expect(state.isDeleting).toBe(false);
    });

    it('selects all but the newest file for newest strategy', () => {
        useDuplicateStore.setState({
            groups: [createGroup({
                hash: 'hash-newest',
                files: [
                    {
                        id: 'old',
                        name: 'old.png',
                        path: 'C:\\library\\old.png',
                        size: 100,
                        type: 'image',
                        created_at: 10,
                        mtime_ms: 10,
                        tags: [],
                    },
                    {
                        id: 'newest',
                        name: 'newest.png',
                        path: 'C:\\library\\newest.png',
                        size: 100,
                        type: 'image',
                        created_at: 20,
                        mtime_ms: 30,
                        tags: [],
                    },
                    {
                        id: 'mid',
                        name: 'mid.png',
                        path: 'C:\\library\\mid.png',
                        size: 100,
                        type: 'image',
                        created_at: 15,
                        mtime_ms: 20,
                        tags: [],
                    },
                ],
                count: 3,
            })],
            selectedFileIds: new Set(),
        });

        useDuplicateStore.getState().selectByStrategy('hash-newest', 'newest');

        expect(Array.from(useDuplicateStore.getState().selectedFileIds).sort()).toEqual(['mid', 'old']);
    });
});
