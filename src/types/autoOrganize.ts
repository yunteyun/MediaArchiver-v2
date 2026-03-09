export type AutoOrganizeSearchTarget = 'fileName' | 'folderName';
export type AutoOrganizeRatingQuickFilter = 'none' | 'overall4plus' | 'unrated';

export interface AutoOrganizeSearchCondition {
    text: string;
    target: AutoOrganizeSearchTarget;
}

export interface AutoOrganizeConditionV1 {
    folderSelection: string | null;
    text: string;
    textMatchTarget: AutoOrganizeSearchTarget;
    textConditions: AutoOrganizeSearchCondition[];
    ratingQuickFilter: AutoOrganizeRatingQuickFilter;
    tags: {
        ids: string[];
        mode: 'AND' | 'OR';
    };
    ratings: Record<string, { min?: number; max?: number }>;
    types: Array<'video' | 'image' | 'archive' | 'audio'>;
}

export interface AutoOrganizeMoveActionV1 {
    enabled: boolean;
    targetFolderId: string;
}

export interface AutoOrganizeRenameActionV1 {
    enabled: boolean;
    template: string;
}

export interface AutoOrganizeActionV1 {
    move: AutoOrganizeMoveActionV1;
    rename: AutoOrganizeRenameActionV1;
}

export interface AutoOrganizeRuleV1 {
    id: string;
    name: string;
    enabled: boolean;
    condition: AutoOrganizeConditionV1;
    action: AutoOrganizeActionV1;
    sortOrder: number;
    createdAt: number;
    updatedAt: number;
}

export type AutoOrganizeActionKind = 'move' | 'rename' | 'move_and_rename';

export interface AutoOrganizeRuleSummary {
    ruleId: string;
    ruleName: string;
    matchedCount: number;
    readyCount: number;
    conflictCount: number;
    skippedCount: number;
}

export interface AutoOrganizeDryRunEntry {
    ruleId: string;
    ruleName: string;
    fileId: string;
    fileName: string;
    sourcePath: string;
    targetPath: string;
    targetFolderId: string;
    targetFolderName: string;
    actionKind: AutoOrganizeActionKind;
    status: 'ready' | 'conflict' | 'skipped_same_path' | 'skipped_missing_target' | 'skipped_invalid_name';
    reason?: string;
}

export interface AutoOrganizeDryRunResult {
    success: boolean;
    generatedAt: number;
    ruleIds: string[];
    totalRuleCount: number;
    totalMatchedCount: number;
    totalReadyCount: number;
    totalConflictCount: number;
    totalSkippedCount: number;
    summaries: AutoOrganizeRuleSummary[];
    entries: AutoOrganizeDryRunEntry[];
    truncated: boolean;
    error?: string;
}

export interface AutoOrganizeApplyEntry {
    ruleId: string;
    ruleName: string;
    fileId: string;
    fileName: string;
    sourcePath: string;
    targetPath: string;
    actionKind: AutoOrganizeActionKind;
    status: 'applied' | 'failed' | 'skipped';
    reason?: string;
}

export interface AutoOrganizeApplyResult {
    success: boolean;
    appliedAt: number;
    ruleIds: string[];
    appliedCount: number;
    failedCount: number;
    skippedCount: number;
    entries: AutoOrganizeApplyEntry[];
    truncated: boolean;
    error?: string;
}
