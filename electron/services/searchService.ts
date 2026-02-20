/**
 * Search Service - 複合検索クエリビルダー
 * Phase 26-D1
 *
 * 条件オブジェクト → SQL動的生成（パラメータバインドで安全に処理）
 *
 * 対応条件:
 *   - テキスト（ファイル名 / フォルダ名）
 *   - タグ（AND / OR）
 *   - 評価軸範囲（axis_id + min/max）
 *   - ファイルタイプ（type）
 */

import { dbManager } from './databaseManager';
import { logger } from './logger';

const db = () => dbManager.getDb();
const log = logger.scope('SearchService');

// --- Types ---

export interface TagCondition {
    ids: string[];
    mode: 'AND' | 'OR';
}

export interface RatingCondition {
    axisId: string;
    min?: number;
    max?: number;
}

export interface SearchCondition {
    text?: string;           // ファイル名 LIKE 検索
    tags?: TagCondition;     // タグフィルター
    ratings?: RatingCondition[];  // 評価軸範囲フィルター
    types?: string[];        // ファイルタイプ（'image','video','audio','archive'）
}

export interface SearchResult {
    id: string;
    name: string;
    path: string;
    type: string;
    size: number;
    duration: number | null;
    width: number | null;
    height: number | null;
    createdAt: number;
    thumbnailPath: string | null;
}

// --- Search ---

export function searchFiles(condition: SearchCondition): SearchResult[] {
    const whereClauses: string[] = [];
    const params: any[] = [];

    // テキスト検索（ファイル名）
    if (condition.text && condition.text.trim().length > 0) {
        whereClauses.push('f.name LIKE ?');
        params.push(`%${condition.text.trim()}%`);
    }

    // タグフィルター
    let tagJoin = '';
    if (condition.tags && condition.tags.ids.length > 0) {
        const { ids, mode } = condition.tags;
        if (mode === 'OR') {
            // ORモード: いずれかのタグを持つファイル
            const placeholders = ids.map(() => '?').join(',');
            tagJoin = `
                JOIN file_tags ft ON ft.file_id = f.id
            `;
            whereClauses.push(`ft.tag_id IN (${placeholders})`);
            params.push(...ids);
        } else {
            // ANDモード: 全タグを持つファイル
            ids.forEach((tagId) => {
                tagJoin += `
                    JOIN file_tags ft_${tagId.replace(/-/g, '_')} ON ft_${tagId.replace(/-/g, '_')}.file_id = f.id AND ft_${tagId.replace(/-/g, '_')}.tag_id = ?
                `;
                params.push(tagId);
            });
        }
    }

    // 評価軸範囲フィルター
    if (condition.ratings && condition.ratings.length > 0) {
        condition.ratings.forEach((r, i) => {
            const alias = `fr${i}`;
            tagJoin += `
                JOIN file_ratings ${alias} ON ${alias}.file_id = f.id AND ${alias}.axis_id = ?
            `;
            params.push(r.axisId);
            if (r.min !== undefined) {
                whereClauses.push(`${alias}.value >= ?`);
                params.push(r.min);
            }
            if (r.max !== undefined) {
                whereClauses.push(`${alias}.value <= ?`);
                params.push(r.max);
            }
        });
    }

    // ファイルタイプフィルター
    if (condition.types && condition.types.length > 0) {
        const placeholders = condition.types.map(() => '?').join(',');
        whereClauses.push(`f.type IN (${placeholders})`);
        params.push(...condition.types);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sql = `
        SELECT DISTINCT f.id, f.name, f.path, f.type, f.size, f.duration,
               f.width, f.height, f.created_at, f.thumbnail_path
        FROM files f
        ${tagJoin}
        ${whereSQL}
        ORDER BY f.created_at DESC
        LIMIT 500
    `;

    try {
        const rows = db().prepare(sql).all(...params) as any[];
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            path: row.path,
            type: row.type,
            size: row.size,
            duration: row.duration,
            width: row.width,
            height: row.height,
            createdAt: row.created_at,
            thumbnailPath: row.thumbnail_path,
        }));
    } catch (e: any) {
        log.error(`searchFiles failed: ${e.message}`);
        log.error(`SQL: ${sql}`);
        throw e;
    }
}
