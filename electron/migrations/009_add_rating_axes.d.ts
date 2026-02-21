import type { Migration } from './types';
/**
 * Migration 009: Add Rating Axes tables
 * Phase 26-B1: 評価軸（rating_axes）とファイル評価（file_ratings）テーブルを追加
 *
 * 設計ポイント:
 * - is_system=1 の軸はUI上で削除不可とする（overall軸など）
 * - min_value/max_value/step により可変レンジ対応
 * - file_ratings は files/rating_axes に対してCASCADE DELETE
 */
export declare const addRatingAxes: Migration;
