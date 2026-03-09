export interface LibraryStats {
    totalFiles: number;
    totalSize: number;
    byType: { type: string; count: number; size: number }[];
    byTag: { tagId: string; tagName: string; tagColor: string; count: number }[];
    byFolder: { folderId: string; folderPath: string; count: number; size: number }[];
    recentFiles: { id: string; name: string; path: string; type: string; createdAt: number; thumbnailPath: string | null }[];
    monthlyTrend: { month: string; count: number }[];
    untaggedStats: { tagged: number; untagged: number };
    ratingStats: { rating: string; count: number }[];
    largeFiles: { id: string; name: string; path: string; type: string; size: number; thumbnailPath: string | null }[];
    extensionStats: { type: string; extension: string; count: number }[];
    resolutionStats: { resolution: string; count: number }[];
    thumbnailSize: number;
}
