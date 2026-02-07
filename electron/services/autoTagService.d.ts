/**
 * Auto Tag Service - 自動タグ割り当てサービス
 * Phase 12-8 フェーズ2
 */
export type MatchTarget = 'filename' | 'foldername' | 'both';
export type MatchMode = 'partial' | 'exact';
export interface AutoTagRule {
    id: string;
    tagId: string;
    keywords: string[];
    target: MatchTarget;
    matchMode: MatchMode;
    enabled: boolean;
    sortOrder: number;
    createdAt: number;
}
export interface ApplyResult {
    success: boolean;
    filesProcessed: number;
    filesUpdated: number;
    tagsAssigned: number;
}
export interface PreviewMatch {
    fileId: string;
    fileName: string;
    matchedKeywords: string[];
}
export declare function getAllRules(): AutoTagRule[];
export declare function createRule(tagId: string, keywords: string[], target: MatchTarget, matchMode: MatchMode): AutoTagRule;
export declare function updateRule(id: string, updates: Partial<Omit<AutoTagRule, 'id' | 'createdAt'>>): void;
export declare function deleteRule(id: string): void;
/**
 * ファイルにマッチするルールのタグIDを取得
 */
export declare function matchFile(fileName: string, folderName: string, rules: AutoTagRule[]): string[];
/**
 * ルールのプレビュー（どのファイルにマッチするか）
 */
export declare function previewRule(rule: AutoTagRule, files: Array<{
    id: string;
    name: string;
    path: string;
}>): PreviewMatch[];
/**
 * ルールをファイルに適用
 */
export declare function applyRulesToFiles(fileIds: string[], rules?: AutoTagRule[]): ApplyResult;
/**
 * 選択ファイルに自動タグを適用（進捗コールバック付き）
 */
export declare function applyRulesToFilesWithProgress(fileIds: string[], onProgress?: (progress: number) => void): Promise<ApplyResult>;
