export type AutoOrganizeSearchTarget = 'fileName' | 'folderName';
export type AutoOrganizeRatingQuickFilter = 'none' | 'midOrAbove' | 'unrated';

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

export interface AutoOrganizeRuleAutomationV1 {
    runOnScanComplete: boolean;
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
    automation: AutoOrganizeRuleAutomationV1;
    sortOrder: number;
    createdAt: number;
    updatedAt: number;
}

export type AutoOrganizeActionKind = 'move' | 'rename' | 'move_and_rename';
export type AutoOrganizeTriggerSource = 'manual' | 'manual_scan' | 'startup_scan' | 'watch_scan' | 'rollback';

export interface AutoOrganizeSettingsV1 {
    enabled: boolean;
    runOnManualScan: boolean;
    runOnStartupScan: boolean;
    runOnWatchScan: boolean;
    historyLimit: number;
}

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

export interface AutoOrganizeRunSummary {
    id: string;
    createdAt: number;
    triggerSource: AutoOrganizeTriggerSource;
    rootFolderId: string | null;
    scanPath: string | null;
    ruleIds: string[];
    ruleNames: string[];
    appliedCount: number;
    failedCount: number;
    skippedCount: number;
}

export interface AutoOrganizeRunEntryV1 {
    id: string;
    runId: string;
    createdAt: number;
    fileId: string;
    fileName: string;
    sourcePath: string;
    targetPath: string;
    sourceFileName: string;
    targetFileName: string;
    sourceRootFolderId: string;
    targetRootFolderId: string;
    ruleId: string;
    ruleName: string;
    actionKind: AutoOrganizeActionKind;
}

export interface AutoOrganizeRollbackPreviewEntry {
    entryId: string;
    runId: string;
    fileId: string;
    fileName: string;
    sourcePath: string;
    targetPath: string;
    actionKind: AutoOrganizeActionKind;
    status: 'ready' | 'conflict' | 'skipped_missing_current' | 'skipped_missing_source_parent';
    reason?: string;
}

export interface AutoOrganizeRollbackPreviewResult {
    success: boolean;
    runId: string;
    generatedAt: number;
    totalEntryCount: number;
    readyCount: number;
    conflictCount: number;
    skippedCount: number;
    entries: AutoOrganizeRollbackPreviewEntry[];
    truncated: boolean;
    error?: string;
}

export interface AutoOrganizeRollbackApplyEntry {
    entryId: string;
    runId: string;
    fileId: string;
    fileName: string;
    sourcePath: string;
    targetPath: string;
    actionKind: AutoOrganizeActionKind;
    status: 'reverted' | 'failed' | 'skipped';
    reason?: string;
}

export interface AutoOrganizeRollbackApplyResult {
    success: boolean;
    runId: string;
    appliedAt: number;
    revertedCount: number;
    failedCount: number;
    skippedCount: number;
    entries: AutoOrganizeRollbackApplyEntry[];
    truncated: boolean;
    error?: string;
}
