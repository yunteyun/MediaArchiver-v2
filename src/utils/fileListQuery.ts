import type { MediaFile } from '../types/file';
import type { RatingDisplayThresholds } from '../shared/ratingDisplayThresholds';
import {
    matchesRatingQuickFilterValue,
    type RatingQuickFilter,
} from '../shared/ratingQuickFilter';

export type FileSortBy = 'name' | 'date' | 'size' | 'type' | 'accessCount' | 'lastAccessed' | 'overallRating';
export type FileSortOrder = 'asc' | 'desc';
export type FileTagFilterMode = 'AND' | 'OR';
export type FileSearchTarget = 'fileName' | 'folderName';

export interface FileSearchCondition {
    text: string;
    target: FileSearchTarget;
}

export interface FileListQueryOptions {
    sortBy: FileSortBy;
    sortOrder: FileSortOrder;
    fileTagsCache: Map<string, string[]>;
    selectedTagIds: string[];
    filterMode: FileTagFilterMode;
    ratingFilter: Record<string, { min?: number; max?: number }>;
    fileRatings: Record<string, Record<string, number>>;
    overallRatingAxisId?: string | null;
    ratingQuickFilter?: RatingQuickFilter;
    ratingDisplayThresholds?: RatingDisplayThresholds;
    searchConditions: FileSearchCondition[];
    selectedFileTypes: MediaFile['type'][];
}

const ALL_FILE_TYPES: MediaFile['type'][] = ['video', 'image', 'archive', 'audio'];

function compareLastAccessed(a: MediaFile, b: MediaFile): number {
    if (a.lastAccessedAt === null && b.lastAccessedAt === null) {
        return 0;
    }
    if (a.lastAccessedAt === null) {
        return 1;
    }
    if (b.lastAccessedAt === null) {
        return -1;
    }
    return a.lastAccessedAt - b.lastAccessedAt;
}

export function sortFiles(
    files: MediaFile[],
    sortBy: FileSortBy,
    sortOrder: FileSortOrder,
    fileRatings: Record<string, Record<string, number>> = {},
    overallRatingAxisId?: string | null,
): MediaFile[] {
    return [...files].sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
            case 'name':
                comparison = a.name.localeCompare(b.name);
                break;
            case 'date':
                comparison = a.createdAt - b.createdAt;
                break;
            case 'size':
                comparison = a.size - b.size;
                break;
            case 'type':
                comparison = a.type.localeCompare(b.type);
                break;
            case 'accessCount':
                comparison = (a.accessCount || 0) - (b.accessCount || 0);
                break;
            case 'lastAccessed':
                comparison = compareLastAccessed(a, b);
                if (a.lastAccessedAt === null || b.lastAccessedAt === null) {
                    return comparison;
                }
                break;
            case 'overallRating': {
                const axisId = overallRatingAxisId ?? '';
                const aRating = axisId ? (fileRatings[a.id]?.[axisId] ?? Number.NEGATIVE_INFINITY) : Number.NEGATIVE_INFINITY;
                const bRating = axisId ? (fileRatings[b.id]?.[axisId] ?? Number.NEGATIVE_INFINITY) : Number.NEGATIVE_INFINITY;
                comparison = aRating - bRating;
                if (comparison === 0) {
                    comparison = a.name.localeCompare(b.name);
                }
                break;
            }
        }

        return sortOrder === 'asc' ? comparison : -comparison;
    });
}

function matchesTagFilter(
    file: MediaFile,
    selectedTagIds: string[],
    filterMode: FileTagFilterMode,
    fileTagsCache: Map<string, string[]>
): boolean {
    if (selectedTagIds.length === 0) {
        return true;
    }

    const fileTags = fileTagsCache.get(file.id) || [];
    return filterMode === 'OR'
        ? selectedTagIds.some((tagId) => fileTags.includes(tagId))
        : selectedTagIds.every((tagId) => fileTags.includes(tagId));
}

function matchesRatingFilter(
    file: MediaFile,
    ratingFilter: Record<string, { min?: number; max?: number }>,
    fileRatings: Record<string, Record<string, number>>
): boolean {
    const activeRatingAxes = Object.entries(ratingFilter).filter(
        ([, range]) => range.min !== undefined || range.max !== undefined
    );

    if (activeRatingAxes.length === 0) {
        return true;
    }

    const ratings = fileRatings[file.id] ?? {};
    for (const [axisId, { min, max }] of activeRatingAxes) {
        const rating = ratings[axisId];
        if (rating == null) {
            return false;
        }
        if (min !== undefined && rating < min) {
            return false;
        }
        if (max !== undefined && rating > max) {
            return false;
        }
    }

    return true;
}

function matchesSearchCondition(file: MediaFile, condition: FileSearchCondition): boolean {
    const query = condition.text.trim().toLowerCase();
    if (!query) {
        return true;
    }

    if (condition.target === 'folderName') {
        const normalizedPath = String(file.path || '').replace(/[\\/]+/g, '/');
        const folderPath = normalizedPath.includes('/')
            ? normalizedPath.slice(0, normalizedPath.lastIndexOf('/'))
            : '';
        const folderName = folderPath
            ? folderPath.slice(folderPath.lastIndexOf('/') + 1)
            : '';
        return folderName.toLowerCase().includes(query) || folderPath.toLowerCase().includes(query);
    }

    return file.name.toLowerCase().includes(query);
}

function matchesSearchFilters(file: MediaFile, searchConditions: FileSearchCondition[]): boolean {
    if (searchConditions.length === 0) {
        return true;
    }

    return searchConditions.every((condition) => matchesSearchCondition(file, condition));
}

function matchesRatingQuickFilter(
    file: MediaFile,
    quickFilter: RatingQuickFilter,
    overallRatingAxisId: string | null | undefined,
    fileRatings: Record<string, Record<string, number>>,
    ratingDisplayThresholds?: RatingDisplayThresholds,
): boolean {
    const rating = overallRatingAxisId ? fileRatings[file.id]?.[overallRatingAxisId] : undefined;
    return matchesRatingQuickFilterValue(rating, quickFilter, ratingDisplayThresholds);
}

function matchesFileTypeFilter(file: MediaFile, selectedFileTypes: MediaFile['type'][]): boolean {
    if (selectedFileTypes.length >= ALL_FILE_TYPES.length) {
        return true;
    }

    const selectedTypeSet = new Set(selectedFileTypes);
    return selectedTypeSet.has(file.type);
}

export function buildVisibleFiles(files: MediaFile[], options: FileListQueryOptions): MediaFile[] {
    const sortedFiles = sortFiles(
        files,
        options.sortBy,
        options.sortOrder,
        options.fileRatings,
        options.overallRatingAxisId,
    );

    return sortedFiles.filter((file) => (
        matchesTagFilter(file, options.selectedTagIds, options.filterMode, options.fileTagsCache) &&
        matchesRatingFilter(file, options.ratingFilter, options.fileRatings) &&
        matchesRatingQuickFilter(file, options.ratingQuickFilter ?? 'none', options.overallRatingAxisId, options.fileRatings, options.ratingDisplayThresholds) &&
        matchesSearchFilters(file, options.searchConditions) &&
        matchesFileTypeFilter(file, options.selectedFileTypes)
    ));
}
