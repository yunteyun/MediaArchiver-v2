/**
 * Tag Service - タグ管理サービス
 * 
 * プロファイルDB（dbManager）を使用してタグを管理
 */

import { v4 as uuidv4 } from 'uuid';
import { dbManager } from './databaseManager';

// 毎回現在のプロファイルDBを取得（dbは実際には関数呼び出し）
const db = () => dbManager.getDb();

// --- Types ---

export interface TagCategory {
    id: string;
    name: string;
    color: string;
    sortOrder: number;
    createdAt: number;
}

export interface TagDefinition {
    id: string;
    name: string;
    color: string;
    categoryId: string | null;
    sortOrder: number;
    createdAt: number;
}

// --- Category Operations ---

export function getAllCategories(): TagCategory[] {
    const rows = db().prepare(`
        SELECT id, name, color, sort_order, created_at 
        FROM tag_categories 
        ORDER BY sort_order ASC, name ASC
    `).all() as any[];

    return rows.map(row => ({
        id: row.id,
        name: row.name,
        color: row.color,
        sortOrder: row.sort_order,
        createdAt: row.created_at
    }));
}

export function createCategory(name: string, color: string = 'gray'): TagCategory {
    const id = uuidv4();
    const now = Date.now();
    const maxOrder = (db().prepare('SELECT MAX(sort_order) as max FROM tag_categories').get() as any)?.max || 0;

    db().prepare(`
        INSERT INTO tag_categories (id, name, color, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?)
    `).run(id, name, color, maxOrder + 1, now);

    return { id, name, color, sortOrder: maxOrder + 1, createdAt: now };
}

export function updateCategory(id: string, updates: { name?: string; color?: string; sortOrder?: number }): TagCategory | null {
    const existing = db().prepare('SELECT * FROM tag_categories WHERE id = ?').get(id) as any;
    if (!existing) return null;

    const newName = updates.name ?? existing.name;
    const newColor = updates.color ?? existing.color;
    const newSortOrder = updates.sortOrder ?? existing.sort_order;

    db().prepare(`
        UPDATE tag_categories SET name = ?, color = ?, sort_order = ? WHERE id = ?
    `).run(newName, newColor, newSortOrder, id);

    return { id, name: newName, color: newColor, sortOrder: newSortOrder, createdAt: existing.created_at };
}

export function deleteCategory(id: string): void {
    db().prepare('DELETE FROM tag_categories WHERE id = ?').run(id);
}

// --- Tag Definition Operations ---

export function getAllTags(): TagDefinition[] {
    const rows = db().prepare(`
        SELECT id, name, color, category_id, sort_order, created_at 
        FROM tag_definitions 
        ORDER BY sort_order ASC, name ASC
    `).all() as any[];

    return rows.map(row => ({
        id: row.id,
        name: row.name,
        color: row.color,
        categoryId: row.category_id,
        sortOrder: row.sort_order,
        createdAt: row.created_at
    }));
}

export function createTag(name: string, color: string = 'gray', categoryId: string | null = null): TagDefinition {
    const id = uuidv4();
    const now = Date.now();
    const maxOrder = (db().prepare('SELECT MAX(sort_order) as max FROM tag_definitions').get() as any)?.max || 0;

    db().prepare(`
        INSERT INTO tag_definitions (id, name, color, category_id, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, color, categoryId, maxOrder + 1, now);

    return { id, name, color, categoryId, sortOrder: maxOrder + 1, createdAt: now };
}

export function updateTag(id: string, updates: { name?: string; color?: string; categoryId?: string | null; sortOrder?: number }): TagDefinition | null {
    const existing = db().prepare('SELECT * FROM tag_definitions WHERE id = ?').get(id) as any;
    if (!existing) return null;

    const newName = updates.name ?? existing.name;
    const newColor = updates.color ?? existing.color;
    const newCategoryId = updates.categoryId !== undefined ? updates.categoryId : existing.category_id;
    const newSortOrder = updates.sortOrder ?? existing.sort_order;

    db().prepare(`
        UPDATE tag_definitions SET name = ?, color = ?, category_id = ?, sort_order = ? WHERE id = ?
    `).run(newName, newColor, newCategoryId, newSortOrder, id);

    return { id, name: newName, color: newColor, categoryId: newCategoryId, sortOrder: newSortOrder, createdAt: existing.created_at };
}

export function deleteTag(id: string): void {
    db().prepare('DELETE FROM tag_definitions WHERE id = ?').run(id);
}

export function getTagByName(name: string): TagDefinition | null {
    const row = db().prepare('SELECT * FROM tag_definitions WHERE name = ?').get(name) as any;
    if (!row) return null;

    return {
        id: row.id,
        name: row.name,
        color: row.color,
        categoryId: row.category_id,
        sortOrder: row.sort_order,
        createdAt: row.created_at
    };
}

// --- File-Tag Operations ---

export function addTagToFile(fileId: string, tagId: string): void {
    const now = Date.now();
    db().prepare(`
        INSERT OR IGNORE INTO file_tags (file_id, tag_id, added_at)
        VALUES (?, ?, ?)
    `).run(fileId, tagId, now);

    // アクティビティログ記録（Fire-and-Forget）
    const file = db().prepare('SELECT name FROM files WHERE id = ?').get(fileId) as { name: string } | undefined;
    const tag = db().prepare('SELECT name FROM tag_definitions WHERE id = ?').get(tagId) as { name: string } | undefined;
    if (file && tag) {
        import('./activityLogService').then(({ logActivity }) => {
            logActivity('tag_add', fileId, tag.name, { fileName: file.name })
                .catch(e => logger.scope('TagService').warn('Activity log failed:', e.message));
        });
    }
}

export function removeTagFromFile(fileId: string, tagId: string): void {
    // 削除前に情報取得
    const file = db().prepare('SELECT name FROM files WHERE id = ?').get(fileId) as { name: string } | undefined;
    const tag = db().prepare('SELECT name FROM tag_definitions WHERE id = ?').get(tagId) as { name: string } | undefined;

    db().prepare('DELETE FROM file_tags WHERE file_id = ? AND tag_id = ?').run(fileId, tagId);

    // アクティビティログ記録（Fire-and-Forget）
    if (file && tag) {
        import('./activityLogService').then(({ logActivity }) => {
            logActivity('tag_remove', fileId, tag.name, { fileName: file.name })
                .catch(e => logger.scope('TagService').warn('Activity log failed:', e.message));
        });
    }
}

export function getFileTags(fileId: string): TagDefinition[] {
    const rows = db().prepare(`
        SELECT td.id, td.name, td.color, td.category_id, td.sort_order, td.created_at
        FROM file_tags ft
        JOIN tag_definitions td ON ft.tag_id = td.id
        WHERE ft.file_id = ?
        ORDER BY td.sort_order ASC, td.name ASC
    `).all(fileId) as any[];

    return rows.map(row => ({
        id: row.id,
        name: row.name,
        color: row.color,
        categoryId: row.category_id,
        sortOrder: row.sort_order,
        createdAt: row.created_at
    }));
}

export function getFileTagIds(fileId: string): string[] {
    const rows = db().prepare('SELECT tag_id FROM file_tags WHERE file_id = ?').all(fileId) as { tag_id: string }[];
    return rows.map(r => r.tag_id);
}

export function getFilesByTagIds(tagIds: string[], mode: 'AND' | 'OR' = 'OR'): string[] {
    if (tagIds.length === 0) return [];

    if (mode === 'OR') {
        const placeholders = tagIds.map(() => '?').join(', ');
        const rows = db().prepare(`
            SELECT DISTINCT file_id FROM file_tags WHERE tag_id IN (${placeholders})
        `).all(...tagIds) as { file_id: string }[];
        return rows.map(r => r.file_id);
    } else {
        // AND mode: files that have ALL specified tags
        const placeholders = tagIds.map(() => '?').join(', ');
        const rows = db().prepare(`
            SELECT file_id FROM file_tags 
            WHERE tag_id IN (${placeholders})
            GROUP BY file_id
            HAVING COUNT(DISTINCT tag_id) = ?
        `).all(...tagIds, tagIds.length) as { file_id: string }[];
        return rows.map(r => r.file_id);
    }
}

/**
 * 全ファイルのタグIDを一括取得
 * パフォーマンス最適化: N回のIPC呼び出し → 1回
 * @returns Record<fileId, tagId[]> 形式（IPC通信で安全なプレーンオブジェクト）
 */
export function getAllFileTagIds(): Record<string, string[]> {
    const rows = db().prepare(`
        SELECT file_id, tag_id FROM file_tags
    `).all() as { file_id: string; tag_id: string }[];

    const result: Record<string, string[]> = {};
    for (const row of rows) {
        if (!result[row.file_id]) {
            result[row.file_id] = [];
        }
        result[row.file_id]!.push(row.tag_id);
    }
    return result;
}

// --- Initialization: Migrate default tags ---

export function initDefaultTags(): void {
    // Check if we already have tags
    const tagCount = (db().prepare('SELECT COUNT(*) as count FROM tag_definitions').get() as { count: number }).count;
    if (tagCount > 0) return;

    const now = Date.now();

    // Create default categories
    const categories = [
        { id: 'cat_genre', name: 'ジャンル', color: 'blue' },
        { id: 'cat_rating', name: '評価', color: 'amber' },
        { id: 'cat_status', name: '状態', color: 'emerald' }
    ];

    for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        db().prepare(`
            INSERT OR IGNORE INTO tag_categories (id, name, color, sort_order, created_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(cat!.id, cat!.name, cat!.color, i, now);
    }

    // Create default tags
    const tags = [
        { name: 'アニメ', categoryId: 'cat_genre' },
        { name: 'ゲーム', categoryId: 'cat_genre' },
        { name: '実写', categoryId: 'cat_genre' },
        { name: '風景', categoryId: 'cat_genre' },
        { name: 'イラスト', categoryId: 'cat_genre' },
        { name: '★5(最高)', categoryId: 'cat_rating' },
        { name: '★4(良)', categoryId: 'cat_rating' },
        { name: '★3(普通)', categoryId: 'cat_rating' },
        { name: '重要', categoryId: 'cat_rating' },
        { name: '未チェック', categoryId: 'cat_status' },
        { name: '確認済', categoryId: 'cat_status' },
        { name: '編集待ち', categoryId: 'cat_status' }
    ];

    for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];
        db().prepare(`
            INSERT OR IGNORE INTO tag_definitions (id, name, color, category_id, sort_order, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), tag!.name, 'gray', tag!.categoryId, i, now);
    }
}
