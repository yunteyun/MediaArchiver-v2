/**
 * Tag utilities for UI display
 */

import type { Tag } from '../stores/useTagStore';

/**
 * タグを表示用に整形（省略表示対応）
 * 一覧/LightBox/将来の別カード表示で共通利用可能
 * 
 * @param tags タグ配列
 * @param max 最大表示数
 * @returns 表示用タグと非表示数
 */
export const getVisibleTags = (
    tags: Tag[],
    max: number
): { visible: Tag[]; hiddenCount: number } => ({
    visible: tags.slice(0, max),
    hiddenCount: Math.max(0, tags.length - max),
});
