/**
 * Duplicate Service - 重複ファイル検出サービス
 *
 * 「サイズ衝突時のみ計算」戦略を採用:
 * 1. DBから同じサイズを持つファイルグループを抽出
 * 2. そのグループ内のファイルのみハッシュ計算
 * 3. ハッシュ値で真の重複を判定
 */
import type { MediaFile } from './database';
export interface DuplicateGroup {
    hash: string;
    size: number;
    files: MediaFile[];
    count: number;
}
export interface DuplicateStats {
    totalGroups: number;
    totalFiles: number;
    wastedSpace: number;
}
export interface DuplicateProgress {
    phase: 'analyzing' | 'hashing' | 'complete';
    current: number;
    total: number;
    currentFile?: string;
}
/**
 * 検出をキャンセル
 */
export declare function cancelDuplicateSearch(): void;
/**
 * 重複ファイルを検出
 *
 * @param onProgress 進捗コールバック
 * @returns 重複グループ配列
 */
export declare function findDuplicates(onProgress?: (progress: DuplicateProgress) => void): Promise<DuplicateGroup[]>;
/**
 * 重複統計を取得
 */
export declare function getDuplicateStats(groups: DuplicateGroup[]): DuplicateStats;
/**
 * ファイルサイズを人間が読める形式に変換
 */
export declare function formatFileSize(bytes: number): string;
