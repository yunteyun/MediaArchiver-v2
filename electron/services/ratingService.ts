/**
 * Rating Service - 評価軸管理サービス
 * Phase 26-B1
 * 
 * プロファイルDB（dbManager）を使用して評価軸とファイル評価を管理。
 * 既存のタグベース評価（cat_rating）とは独立して動作する（C案: 並行運用）。
 */

import { v4 as uuidv4 } from 'uuid';
import { dbManager } from './databaseManager';
import { logger } from './logger';

const db = () => dbManager.getDb();
const log = logger.scope('RatingService');

// --- Types ---

export interface RatingAxis {
    id: string;
    name: string;
    minValue: number;
    maxValue: number;
    step: number;
    isSystem: boolean;
    sortOrder: number;
    createdAt: number;
}

export interface FileRating {
    fileId: string;
    axisId: string;
    value: number;
    updatedAt: number;
}

// --- Row mapper ---

function mapAxisRow(row: any): RatingAxis {
    return {
        id: row.id,
        name: row.name,
        minValue: row.min_value,
        maxValue: row.max_value,
        step: row.step,
        isSystem: row.is_system === 1,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
    };
}

// --- Axis Operations ---

/** 全評価軸を取得（sort_order昇順） */
export function getAllAxes(): RatingAxis[] {
    const rows = db().prepare(`
        SELECT id, name, min_value, max_value, step, is_system, sort_order, created_at
        FROM rating_axes
        ORDER BY sort_order ASC, created_at ASC
    `).all() as any[];

    return rows.map(mapAxisRow);
}

/** 評価軸を作成 */
export function createAxis(
    name: string,
    minValue: number = 1,
    maxValue: number = 5,
    step: number = 1,
    isSystem: boolean = false
): RatingAxis {
    const id = uuidv4();
    const now = Date.now();

    // sortOrder: 既存の最大値 + 1
    const maxOrder = (db().prepare('SELECT MAX(sort_order) as m FROM rating_axes').get() as any)?.m ?? -1;

    db().prepare(`
        INSERT INTO rating_axes (id, name, min_value, max_value, step, is_system, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, minValue, maxValue, step, isSystem ? 1 : 0, maxOrder + 1, now);

    log.info(`Created axis: ${name} (id=${id})`);
    return mapAxisRow(
        db().prepare('SELECT * FROM rating_axes WHERE id = ?').get(id)
    );
}

/** 評価軸を更新（is_systemはUI経由では変更不可） */
export function updateAxis(
    id: string,
    updates: { name?: string; minValue?: number; maxValue?: number; step?: number; sortOrder?: number }
): RatingAxis | null {
    const existing = db().prepare('SELECT * FROM rating_axes WHERE id = ?').get(id) as any;
    if (!existing) return null;

    const name = updates.name ?? existing.name;
    const minValue = updates.minValue ?? existing.min_value;
    const maxValue = updates.maxValue ?? existing.max_value;
    const step = updates.step ?? existing.step;
    const sortOrder = updates.sortOrder ?? existing.sort_order;

    db().prepare(`
        UPDATE rating_axes
        SET name = ?, min_value = ?, max_value = ?, step = ?, sort_order = ?
        WHERE id = ?
    `).run(name, minValue, maxValue, step, sortOrder, id);

    return mapAxisRow(
        db().prepare('SELECT * FROM rating_axes WHERE id = ?').get(id)
    );
}

/** 評価軸を削除（is_system=1は削除不可） */
export function deleteAxis(id: string): { success: boolean; reason?: string } {
    const axis = db().prepare('SELECT is_system FROM rating_axes WHERE id = ?').get(id) as any;
    if (!axis) return { success: false, reason: 'not_found' };
    if (axis.is_system === 1) return { success: false, reason: 'system_axis' };

    db().prepare('DELETE FROM rating_axes WHERE id = ?').run(id);
    // file_ratings は FOREIGN KEY CASCADE で自動削除
    log.info(`Deleted axis: ${id}`);
    return { success: true };
}

// --- File Rating Operations ---

/** ファイルの全評価を取得 */
export function getFileRatings(fileId: string): FileRating[] {
    const rows = db().prepare(`
        SELECT file_id, axis_id, value, updated_at
        FROM file_ratings
        WHERE file_id = ?
    `).all(fileId) as any[];

    return rows.map(row => ({
        fileId: row.file_id,
        axisId: row.axis_id,
        value: row.value,
        updatedAt: row.updated_at,
    }));
}

/** ファイルの評価を設定（UPSERT） */
export function setFileRating(fileId: string, axisId: string, value: number): void {
    const now = Date.now();
    db().prepare(`
        INSERT INTO file_ratings (file_id, axis_id, value, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (file_id, axis_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(fileId, axisId, value, now);
}

/** ファイルの特定軸の評価を削除 */
export function removeFileRating(fileId: string, axisId: string): void {
    db().prepare('DELETE FROM file_ratings WHERE file_id = ? AND axis_id = ?').run(fileId, axisId);
}

/** 全ファイルの評価を一括取得（Store初期化用） */
export function getAllFileRatings(): Record<string, Record<string, number>> {
    const rows = db().prepare('SELECT file_id, axis_id, value FROM file_ratings').all() as any[];

    const result: Record<string, Record<string, number>> = {};
    for (const row of rows) {
        if (!result[row.file_id]) result[row.file_id] = {};
        result[row.file_id]![row.axis_id] = row.value;
    }
    return result;
}

/** 評価軸の統計（axisId別の評価分布） */
export function getRatingDistribution(axisId: string): { value: number; count: number }[] {
    return db().prepare(`
        SELECT value, COUNT(file_id) as count
        FROM file_ratings
        WHERE axis_id = ?
        GROUP BY value
        ORDER BY value DESC
    `).all(axisId) as any[];
}

// --- Initialization ---

/** 初回起動時にデフォルト評価軸（overall）を作成 */
export function initDefaultAxes(): void {
    const existing = db().prepare('SELECT COUNT(*) as count FROM rating_axes').get() as any;
    if (existing.count > 0) return; // 既に初期化済み

    createAxis('総合評価', 1, 5, 1, true); // is_system=true: 削除不可
    log.info('Default rating axes initialized (overall)');
}
