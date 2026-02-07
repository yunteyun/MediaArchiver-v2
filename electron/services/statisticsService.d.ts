/**
 * Statistics Service - ライブラリ統計取得
 *
 * ⚠️ パフォーマンス: 必ず SQL の GROUP BY / COUNT / SUM を使用
 * JavaScript側での配列操作は避ける
 */
export interface TypeStats {
    type: string;
    count: number;
    size: number;
}
export interface TagStats {
    tagId: string;
    tagName: string;
    tagColor: string;
    count: number;
}
export interface FolderStats {
    folderId: string;
    folderPath: string;
    count: number;
    size: number;
}
export interface RecentFile {
    id: string;
    name: string;
    path: string;
    type: string;
    createdAt: number;
    thumbnailPath: string | null;
}
export interface MonthlyTrend {
    month: string;
    count: number;
}
export interface UntaggedStats {
    tagged: number;
    untagged: number;
}
export interface RatingStats {
    rating: string;
    count: number;
}
export interface LargeFile {
    id: string;
    name: string;
    path: string;
    type: string;
    size: number;
    thumbnailPath: string | null;
}
export interface ExtensionStats {
    type: string;
    extension: string;
    count: number;
}
export interface ResolutionStats {
    resolution: string;
    count: number;
}
export interface LibraryStats {
    totalFiles: number;
    totalSize: number;
    byType: TypeStats[];
    byTag: TagStats[];
    byFolder: FolderStats[];
    recentFiles: RecentFile[];
    monthlyTrend: MonthlyTrend[];
    untaggedStats: UntaggedStats;
    ratingStats: RatingStats[];
    largeFiles: LargeFile[];
    extensionStats: ExtensionStats[];
    resolutionStats: ResolutionStats[];
}
export declare function getLibraryStats(): LibraryStats;
