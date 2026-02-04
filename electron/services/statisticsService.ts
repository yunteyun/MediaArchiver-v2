/**
 * Statistics Service - ライブラリ統計取得
 * 
 * ⚠️ パフォーマンス: 必ず SQL の GROUP BY / COUNT / SUM を使用
 * JavaScript側での配列操作は避ける
 */

import { dbManager } from './databaseManager';
import { logger } from './logger';

const log = logger.scope('StatisticsService');

// --- Types ---

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
    month: string;  // YYYY-MM
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
    monthlyTrend: MonthlyTrend[];  // 月別登録推移
    untaggedStats: UntaggedStats;  // 未整理ファイル率
    ratingStats: RatingStats[];    // 評価分布
    largeFiles: LargeFile[];       // 巨大ファイルTop 10
    extensionStats: ExtensionStats[];  // 拡張子ランキング
    resolutionStats: ResolutionStats[]; // 解像度分布
}

// --- Public API ---

export function getLibraryStats(): LibraryStats {
    const db = dbManager.getDb();
    log.debug('Fetching library statistics');

    // 総ファイル数と総サイズ（SQL で計算）
    const totalRow = db.prepare(`
        SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as size FROM files
    `).get() as { count: number; size: number };

    // ファイルタイプ別統計（SQL GROUP BY）
    const byType = db.prepare(`
        SELECT type, COUNT(*) as count, COALESCE(SUM(size), 0) as size
        FROM files
        GROUP BY type
        ORDER BY count DESC
    `).all() as TypeStats[];

    // タグ別統計（SQL JOIN + GROUP BY）
    const byTag = db.prepare(`
        SELECT 
            td.id as tagId, 
            td.name as tagName, 
            td.color as tagColor,
            COUNT(ft.file_id) as count
        FROM tag_definitions td
        LEFT JOIN file_tags ft ON td.id = ft.tag_id
        GROUP BY td.id
        HAVING count > 0
        ORDER BY count DESC
        LIMIT 20
    `).all() as TagStats[];

    // フォルダ別統計（SQL GROUP BY）
    const byFolder = db.prepare(`
        SELECT 
            fo.id as folderId,
            fo.path as folderPath,
            COUNT(f.id) as count,
            COALESCE(SUM(f.size), 0) as size
        FROM folders fo
        LEFT JOIN files f ON fo.id = f.root_folder_id
        GROUP BY fo.id
        ORDER BY count DESC
    `).all() as FolderStats[];

    // 最近追加されたファイル（上位10件）
    const recentFiles = db.prepare(`
        SELECT id, name, path, type, created_at as createdAt, thumbnail_path as thumbnailPath
        FROM files
        ORDER BY created_at DESC
        LIMIT 10
    `).all() as RecentFile[];

    // 月別登録推移（過去12ヶ月）
    const monthlyTrend = db.prepare(`
        SELECT 
            strftime('%Y-%m', datetime(created_at / 1000, 'unixepoch')) as month,
            COUNT(*) as count
        FROM files
        WHERE created_at IS NOT NULL
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12
    `).all() as MonthlyTrend[];

    // 未整理ファイル率（タグあり/なし）
    const taggedCount = db.prepare(`
        SELECT COUNT(DISTINCT file_id) as count FROM file_tags
    `).get() as { count: number };

    const untaggedStats: UntaggedStats = {
        tagged: taggedCount.count,
        untagged: totalRow.count - taggedCount.count
    };

    // 評価分布（★1-5）
    const ratingStats = db.prepare(`
        SELECT 
            td.name as rating,
            COUNT(ft.file_id) as count
        FROM tag_definitions td
        LEFT JOIN file_tags ft ON td.id = ft.tag_id
        WHERE td.category_id = 'cat_rating'
        GROUP BY td.id
        HAVING count > 0
        ORDER BY td.name DESC
    `).all() as RatingStats[];

    // 巨大ファイル Top 10
    const largeFiles = db.prepare(`
        SELECT id, name, path, type, size, thumbnail_path as thumbnailPath
        FROM files
        ORDER BY size DESC
        LIMIT 10
    `).all() as LargeFile[];

    // 拡張子ランキング（Top 20）
    const extensionStats = db.prepare(`
        SELECT 
            type,
            LOWER(SUBSTR(name, INSTR(name, '.') + 1)) as extension,
            COUNT(*) as count
        FROM files
        WHERE name LIKE '%.%'
        GROUP BY type, extension
        ORDER BY count DESC
        LIMIT 20
    `).all() as ExtensionStats[];

    // 解像度分布（動画・画像のみ）
    const resolutionStats = db.prepare(`
        SELECT 
            CASE 
                WHEN CAST(json_extract(metadata, '$.width') AS INTEGER) >= 3840 THEN '4K (3840x2160以上)'
                WHEN CAST(json_extract(metadata, '$.width') AS INTEGER) >= 1920 THEN 'FHD (1920x1080)'
                WHEN CAST(json_extract(metadata, '$.width') AS INTEGER) >= 1280 THEN 'HD (1280x720)'
                WHEN CAST(json_extract(metadata, '$.width') AS INTEGER) > 0 THEN 'SD (720p未満)'
                ELSE '不明'
            END as resolution,
            COUNT(*) as count
        FROM files
        WHERE type IN ('video', 'image') AND metadata IS NOT NULL
        GROUP BY resolution
        ORDER BY 
            CASE resolution
                WHEN '4K (3840x2160以上)' THEN 1
                WHEN 'FHD (1920x1080)' THEN 2
                WHEN 'HD (1280x720)' THEN 3
                WHEN 'SD (720p未満)' THEN 4
                ELSE 5
            END
    `).all() as ResolutionStats[];

    return {
        totalFiles: totalRow.count,
        totalSize: totalRow.size,
        byType,
        byTag,
        byFolder,
        recentFiles,
        monthlyTrend: monthlyTrend.reverse(), // 古い順に並び替え
        untaggedStats,
        ratingStats,
        largeFiles,
        extensionStats,
        resolutionStats
    };
}
