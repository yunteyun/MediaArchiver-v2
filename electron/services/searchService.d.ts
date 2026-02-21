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
    text?: string;
    tags?: TagCondition;
    ratings?: RatingCondition[];
    types?: string[];
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
export declare function searchFiles(condition: SearchCondition): SearchResult[];
