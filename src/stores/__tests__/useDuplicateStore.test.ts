import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDuplicateStore, type DuplicateGroup } from '../useDuplicateStore';
import type { DuplicateSearchMode } from '../../shared/duplicateNameCandidates';

function createGroup(overrides: Partial<DuplicateGroup> = {}): DuplicateGroup {
    return {
        hash: overrides.hash ?? 'hash-1',
        size: overrides.size ?? 100,
        sizeMin: overrides.sizeMin ?? (overrides.size ?? 100),
        sizeMax: overrides.sizeMax ?? (overrides.size ?? 100),
        matchKind: overrides.matchKind ?? 'content_hash',
        matchLabel: overrides.matchLabel ?? '完全一致',
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
            searchMode: 'exact',
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
        expect(state.searchMode).toBe('exact');
    });

    it('passes the requested search mode to the electron bridge', async () => {
        const findDuplicates = vi.fn().mockResolvedValue({
            groups: [],
            stats: {
                totalGroups: 0,
                totalFiles: 0,
                wastedSpace: 0,
            },
        });

        vi.stubGlobal('window', {
            electronAPI: {
                findDuplicates,
                cancelDuplicateSearch: vi.fn(),
                deleteDuplicateFiles: vi.fn(),
            },
        });

        await useDuplicateStore.getState().startSearch('similar_name' satisfies DuplicateSearchMode);

        expect(findDuplicates).toHaveBeenCalledWith('similar_name');
        expect(useDuplicateStore.getState().searchMode).toBe('similar_name');
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

    it('keeps only the specified file in a group', () => {
        useDuplicateStore.setState({
            groups: [createGroup({
                hash: 'hash-keep',
                count: 3,
                files: [
                    {
                        id: 'keep-me',
                        name: 'keep-me.png',
                        path: 'C:\\library\\keep-me.png',
                        size: 100,
                        type: 'image',
                        created_at: 10,
                        tags: [],
                    },
                    {
                        id: 'delete-1',
                        name: 'delete-1.png',
                        path: 'C:\\library\\delete-1.png',
                        size: 100,
                        type: 'image',
                        created_at: 11,
                        tags: [],
                    },
                    {
                        id: 'delete-2',
                        name: 'delete-2.png',
                        path: 'C:\\library\\delete-2.png',
                        size: 100,
                        type: 'image',
                        created_at: 12,
                        tags: [],
                    },
                ],
            })],
            selectedFileIds: new Set(['keep-me']),
        });

        useDuplicateStore.getState().keepOnlyFileInGroup('hash-keep', 'keep-me');

        expect(Array.from(useDuplicateStore.getState().selectedFileIds).sort()).toEqual(['delete-1', 'delete-2']);
    });

    it('applies strategy selection across groups up to the provided limit', () => {
        useDuplicateStore.setState({
            groups: [
                createGroup({
                    hash: 'hash-bulk-a',
                    count: 2,
                    files: [
                        {
                            id: 'keep-a',
                            name: 'keep-a.png',
                            path: 'C:\\library\\keep-a.png',
                            size: 100,
                            type: 'image',
                            created_at: 100,
                            mtime_ms: 100,
                            tags: [],
                        },
                        {
                            id: 'delete-a',
                            name: 'delete-a.png',
                            path: 'C:\\library\\delete-a.png',
                            size: 100,
                            type: 'image',
                            created_at: 90,
                            mtime_ms: 90,
                            tags: [],
                        },
                    ],
                }),
                createGroup({
                    hash: 'hash-bulk-b',
                    count: 2,
                    files: [
                        {
                            id: 'keep-b',
                            name: 'keep-b.png',
                            path: 'C:\\library\\keep-b.png',
                            size: 100,
                            type: 'image',
                            created_at: 80,
                            mtime_ms: 80,
                            tags: [],
                        },
                        {
                            id: 'delete-b',
                            name: 'delete-b.png',
                            path: 'C:\\library\\delete-b.png',
                            size: 100,
                            type: 'image',
                            created_at: 70,
                            mtime_ms: 70,
                            tags: [],
                        },
                    ],
                }),
                createGroup({
                    hash: 'hash-bulk-c',
                    count: 2,
                    files: [
                        {
                            id: 'keep-c',
                            name: 'keep-c.png',
                            path: 'C:\\library\\keep-c.png',
                            size: 100,
                            type: 'image',
                            created_at: 60,
                            mtime_ms: 60,
                            tags: [],
                        },
                        {
                            id: 'delete-c',
                            name: 'delete-c.png',
                            path: 'C:\\library\\delete-c.png',
                            size: 100,
                            type: 'image',
                            created_at: 50,
                            mtime_ms: 50,
                            tags: [],
                        },
                    ],
                }),
            ],
            selectedFileIds: new Set(),
        });

        useDuplicateStore.getState().selectAcrossGroupsByStrategy('newest', 2);

        expect(Array.from(useDuplicateStore.getState().selectedFileIds).sort()).toEqual([
            'delete-a',
            'delete-b',
        ]);
    });
});
