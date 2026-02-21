/**
 * Rating Service - 評価軸管理サービス
 * Phase 26-B1
 *
 * プロファイルDB（dbManager）を使用して評価軸とファイル評価を管理。
 * 既存のタグベース評価（cat_rating）とは独立して動作する（C案: 並行運用）。
 */
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
/** 全評価軸を取得（sort_order昇順） */
export declare function getAllAxes(): RatingAxis[];
/** 評価軸を作成 */
export declare function createAxis(name: string, minValue?: number, maxValue?: number, step?: number, isSystem?: boolean): RatingAxis;
/** 評価軸を更新（is_systemはUI経由では変更不可） */
export declare function updateAxis(id: string, updates: {
    name?: string;
    minValue?: number;
    maxValue?: number;
    step?: number;
    sortOrder?: number;
}): RatingAxis | null;
/** 評価軸を削除（is_system=1は削除不可） */
export declare function deleteAxis(id: string): {
    success: boolean;
    reason?: string;
};
/** ファイルの全評価を取得 */
export declare function getFileRatings(fileId: string): FileRating[];
/** ファイルの評価を設定（UPSERT） */
export declare function setFileRating(fileId: string, axisId: string, value: number): void;
/** ファイルの特定軸の評価を削除 */
export declare function removeFileRating(fileId: string, axisId: string): void;
/** 全ファイルの評価を一括取得（Store初期化用） */
export declare function getAllFileRatings(): Record<string, Record<string, number>>;
/** 評価軸の統計（axisId別の評価分布） */
export declare function getRatingDistribution(axisId: string): {
    value: number;
    count: number;
}[];
/** 初回起動時にデフォルト評価軸（overall）を作成 */
export declare function initDefaultAxes(): void;
