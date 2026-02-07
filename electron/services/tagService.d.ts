/**
 * Tag Service - タグ管理サービス
 *
 * プロファイルDB（dbManager）を使用してタグを管理
 */
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
export declare function getAllCategories(): TagCategory[];
export declare function createCategory(name: string, color?: string): TagCategory;
export declare function updateCategory(id: string, updates: {
    name?: string;
    color?: string;
    sortOrder?: number;
}): TagCategory | null;
export declare function deleteCategory(id: string): void;
export declare function getAllTags(): TagDefinition[];
export declare function createTag(name: string, color?: string, categoryId?: string | null): TagDefinition;
export declare function updateTag(id: string, updates: {
    name?: string;
    color?: string;
    categoryId?: string | null;
    sortOrder?: number;
}): TagDefinition | null;
export declare function deleteTag(id: string): void;
export declare function getTagByName(name: string): TagDefinition | null;
export declare function addTagToFile(fileId: string, tagId: string): void;
export declare function removeTagFromFile(fileId: string, tagId: string): void;
export declare function getFileTags(fileId: string): TagDefinition[];
export declare function getFileTagIds(fileId: string): string[];
export declare function getFilesByTagIds(tagIds: string[], mode?: 'AND' | 'OR'): string[];
/**
 * 全ファイルのタグIDを一括取得
 * パフォーマンス最適化: N回のIPC呼び出し → 1回
 * @returns Record<fileId, tagId[]> 形式（IPC通信で安全なプレーンオブジェクト）
 */
export declare function getAllFileTagIds(): Record<string, string[]>;
export declare function initDefaultTags(): void;
