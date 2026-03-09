import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { buildAutoOrganizeRenamePreview } from '../../src/shared/autoOrganizeRename';
import { buildVisibleFiles, type FileSearchCondition } from '../../src/utils/fileListQuery';
import type {
    AutoOrganizeActionKind,
    AutoOrganizeApplyEntry,
    AutoOrganizeApplyResult,
    AutoOrganizeConditionV1,
    AutoOrganizeDryRunEntry,
    AutoOrganizeDryRunResult,
    AutoOrganizeRuleSummary,
    AutoOrganizeRuleV1,
} from '../../src/types/autoOrganize';
import type { MediaFile } from './database';
import { dbManager } from './databaseManager';
import { getFiles, getFolders, getFolderById, updateFileLocation, updateFileNameAndPath, type MediaFolder } from './database';
import { logger } from './logger';
import { getAllAxes, getAllFileRatings } from './ratingService';
import { getAllFileTagIds } from './tagService';
import { logActivity } from './activityLogService';
import { relocateFile, validateNewFileName } from './fileOperationService';

const log = logger.scope('AutoOrganize');

const AUTO_ORGANIZE_RULES_KEY = 'auto_organize_rules_v1';
const ALL_FILES_ID = '__all__';
const DRIVE_PREFIX = '__drive:';
const FOLDER_PREFIX = '__folder:';
const VIRTUAL_FOLDER_PREFIX = '__vfolder:';
const VIRTUAL_FOLDER_RECURSIVE_PREFIX = '__vfolderr:';
const ALL_FILE_TYPES: AutoOrganizeConditionV1['types'] = ['video', 'image', 'archive', 'audio'];
const PREVIEW_ENTRY_LIMIT = 200;

interface AutoOrganizeRuleStoreV1 {
    version: 1;
    items: AutoOrganizeRuleV1[];
}

interface SearchConditionLike {
    text: string;
    target: 'fileName' | 'folderName';
}

interface EvaluatedRuleAssignments {
    generatedAt: number;
    ruleIds: string[];
    summaries: AutoOrganizeRuleSummary[];
    entries: AutoOrganizeDryRunEntry[];
    truncated: boolean;
    readyEntries: AutoOrganizeDryRunEntry[];
    totalMatchedCount: number;
    totalReadyCount: number;
    totalConflictCount: number;
    totalSkippedCount: number;
}

function ensureProfileSettingsTable(): void {
    const db = dbManager.getDb();
    db.exec(`
        CREATE TABLE IF NOT EXISTS profile_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        )
    `);
}

function normalizeConditionTypes(input: unknown): AutoOrganizeConditionV1['types'] {
    if (!Array.isArray(input)) return [...ALL_FILE_TYPES];
    const normalized = Array.from(new Set(
        input.filter((type): type is AutoOrganizeConditionV1['types'][number] => (
            type === 'video' || type === 'image' || type === 'archive' || type === 'audio'
        ))
    ));
    return normalized.length > 0 ? normalized : [...ALL_FILE_TYPES];
}

function normalizeTextConditions(input: unknown, fallbackText?: string, fallbackTarget?: 'fileName' | 'folderName'): SearchConditionLike[] {
    const fromList = Array.isArray(input)
        ? input.map((item) => {
            const candidate = item && typeof item === 'object' ? (item as Partial<SearchConditionLike>) : {};
            const text = typeof candidate.text === 'string' ? candidate.text.trim() : '';
            if (!text) return null;
            return {
                text,
                target: candidate.target === 'folderName' ? 'folderName' : 'fileName',
            } as SearchConditionLike;
        }).filter((item): item is SearchConditionLike => item !== null)
        : [];

    if (fromList.length > 0) return fromList;

    const legacyText = typeof fallbackText === 'string' ? fallbackText.trim() : '';
    if (!legacyText) return [];
    return [{ text: legacyText, target: fallbackTarget === 'folderName' ? 'folderName' : 'fileName' }];
}

function normalizeCondition(input: unknown): AutoOrganizeConditionV1 {
    const candidate = input && typeof input === 'object' ? (input as Partial<AutoOrganizeConditionV1>) : {};
    const tagsCandidate = candidate.tags && typeof candidate.tags === 'object' ? candidate.tags : {};
    const ratingsCandidate = candidate.ratings && typeof candidate.ratings === 'object' ? candidate.ratings : {};

    const ratings: Record<string, { min?: number; max?: number }> = {};
    Object.entries(ratingsCandidate).forEach(([axisId, range]) => {
        if (!range || typeof range !== 'object') return;
        const min = typeof range.min === 'number' && Number.isFinite(range.min) ? range.min : undefined;
        const max = typeof range.max === 'number' && Number.isFinite(range.max) ? range.max : undefined;
        if (min === undefined && max === undefined) return;
        ratings[axisId] = { min, max };
    });

    const textConditions = normalizeTextConditions(
        candidate.textConditions,
        candidate.text,
        candidate.textMatchTarget === 'folderName' ? 'folderName' : 'fileName'
    );
    const primaryTextCondition = textConditions[0];

    return {
        folderSelection: typeof candidate.folderSelection === 'string' ? candidate.folderSelection : ALL_FILES_ID,
        text: primaryTextCondition?.text ?? '',
        textMatchTarget: primaryTextCondition?.target ?? 'fileName',
        textConditions,
        ratingQuickFilter:
            candidate.ratingQuickFilter === 'overall4plus' || candidate.ratingQuickFilter === 'unrated'
                ? candidate.ratingQuickFilter
                : 'none',
        tags: {
            ids: Array.isArray(tagsCandidate.ids)
                ? tagsCandidate.ids.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
                : [],
            mode: tagsCandidate.mode === 'AND' ? 'AND' : 'OR',
        },
        ratings,
        types: normalizeConditionTypes(candidate.types),
    };
}

function normalizeAction(input: unknown) {
    const candidate = input && typeof input === 'object' ? (input as Partial<AutoOrganizeRuleV1['action']>) : {};
    const legacyTargetFolderId = typeof (candidate as { targetFolderId?: unknown }).targetFolderId === 'string'
        ? (candidate as { targetFolderId: string }).targetFolderId
        : '';
    const moveCandidate = candidate.move && typeof candidate.move === 'object'
        ? (candidate.move as Partial<AutoOrganizeRuleV1['action']['move']>)
        : {};
    const renameCandidate = candidate.rename && typeof candidate.rename === 'object'
        ? (candidate.rename as Partial<AutoOrganizeRuleV1['action']['rename']>)
        : {};

    return {
        move: {
            enabled: typeof moveCandidate.enabled === 'boolean' ? moveCandidate.enabled : legacyTargetFolderId.length > 0,
            targetFolderId: typeof moveCandidate.targetFolderId === 'string' ? moveCandidate.targetFolderId : legacyTargetFolderId,
        },
        rename: {
            enabled: renameCandidate.enabled === true,
            template: typeof renameCandidate.template === 'string' && renameCandidate.template.trim().length > 0
                ? renameCandidate.template.trim()
                : '{name}',
        },
    };
}

function normalizeRule(input: unknown, index: number): AutoOrganizeRuleV1 | null {
    if (!input || typeof input !== 'object') return null;
    const candidate = input as Partial<AutoOrganizeRuleV1>;
    if (typeof candidate.id !== 'string' || !candidate.id.trim()) return null;
    if (typeof candidate.name !== 'string' || !candidate.name.trim()) return null;

    const now = Date.now();
    const sortOrder = typeof candidate.sortOrder === 'number' && Number.isFinite(candidate.sortOrder)
        ? candidate.sortOrder
        : index;
    const createdAt = typeof candidate.createdAt === 'number' && Number.isFinite(candidate.createdAt)
        ? candidate.createdAt
        : now;
    const updatedAt = typeof candidate.updatedAt === 'number' && Number.isFinite(candidate.updatedAt)
        ? candidate.updatedAt
        : createdAt;

    return {
        id: candidate.id,
        name: candidate.name.trim(),
        enabled: candidate.enabled !== false,
        condition: normalizeCondition(candidate.condition),
        action: normalizeAction(candidate.action),
        sortOrder,
        createdAt,
        updatedAt,
    };
}

function normalizeStore(input: unknown): AutoOrganizeRuleStoreV1 {
    const candidate = input && typeof input === 'object' ? (input as Partial<AutoOrganizeRuleStoreV1>) : {};
    const rawItems = Array.isArray(candidate.items) ? candidate.items : [];
    const items = rawItems
        .map((item, index) => normalizeRule(item, index))
        .filter((item): item is AutoOrganizeRuleV1 => item !== null)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item, index) => ({ ...item, sortOrder: index }));

    return { version: 1, items };
}

function readStore(): AutoOrganizeRuleStoreV1 {
    ensureProfileSettingsTable();
    const db = dbManager.getDb();
    const row = db.prepare('SELECT value FROM profile_settings WHERE key = ?').get(AUTO_ORGANIZE_RULES_KEY) as { value: string } | undefined;
    if (!row) return { version: 1, items: [] };

    try {
        return normalizeStore(JSON.parse(row.value));
    } catch (error) {
        log.warn('Failed to parse auto organize rules. Fallback to empty.', error);
        return { version: 1, items: [] };
    }
}

function writeStore(store: AutoOrganizeRuleStoreV1): void {
    ensureProfileSettingsTable();
    const db = dbManager.getDb();
    const now = Date.now();
    db.prepare(`
        INSERT INTO profile_settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(AUTO_ORGANIZE_RULES_KEY, JSON.stringify(store), now);
}

function normalizePathForCompare(value: string): string {
    return value.replace(/[\\/]+$/, '').toLowerCase();
}

function normalizeDirPathForCompare(dirPath: string): string {
    return normalizePathForCompare(dirPath);
}

function getDriveFromPath(filePath: string): string {
    const match = filePath.match(/^[A-Z]:/i);
    return match ? match[0].toUpperCase() : '/';
}

function isSameOrDescendantPath(filePath: string, ancestorPath: string): boolean {
    const normalizedAncestor = normalizeDirPathForCompare(ancestorPath);
    const fileDir = normalizeDirPathForCompare(path.dirname(filePath));
    if (fileDir === normalizedAncestor) return true;
    return fileDir.startsWith(`${normalizedAncestor}\\`);
}

function buildFolderDescendantsMap(folders: MediaFolder[]): Map<string, Set<string>> {
    const parentMap = new Map<string, string[]>();
    folders.forEach((folder) => {
        if (!folder.parent_id) return;
        if (!parentMap.has(folder.parent_id)) {
            parentMap.set(folder.parent_id, []);
        }
        parentMap.get(folder.parent_id)?.push(folder.id);
    });

    const result = new Map<string, Set<string>>();
    folders.forEach((folder) => {
        const descendants = new Set<string>([folder.id]);
        const stack = [folder.id];
        while (stack.length > 0) {
            const current = stack.pop();
            if (!current) continue;
            const children = parentMap.get(current) ?? [];
            children.forEach((childId) => {
                if (descendants.has(childId)) return;
                descendants.add(childId);
                stack.push(childId);
            });
        }
        result.set(folder.id, descendants);
    });

    return result;
}

function matchesFolderSelection(
    file: MediaFile,
    selection: string | null,
    descendantsById: Map<string, Set<string>>
): boolean {
    if (!selection || selection === ALL_FILES_ID) {
        return true;
    }

    if (selection.startsWith(DRIVE_PREFIX)) {
        return getDriveFromPath(file.path) === selection.slice(DRIVE_PREFIX.length).toUpperCase();
    }

    if (selection.startsWith(FOLDER_PREFIX)) {
        const folderId = selection.slice(FOLDER_PREFIX.length);
        const descendants = descendantsById.get(folderId);
        return !!file.root_folder_id && !!descendants?.has(file.root_folder_id);
    }

    if (selection.startsWith(VIRTUAL_FOLDER_RECURSIVE_PREFIX)) {
        const folderPath = selection.slice(VIRTUAL_FOLDER_RECURSIVE_PREFIX.length);
        return isSameOrDescendantPath(file.path, folderPath);
    }

    if (selection.startsWith(VIRTUAL_FOLDER_PREFIX)) {
        const folderPath = selection.slice(VIRTUAL_FOLDER_PREFIX.length);
        return normalizeDirPathForCompare(path.dirname(file.path)) === normalizeDirPathForCompare(folderPath);
    }

    return file.root_folder_id === selection;
}

function filterFilesBySelection(
    files: MediaFile[],
    selection: string | null,
    descendantsById: Map<string, Set<string>>
): MediaFile[] {
    return files.filter((file) => matchesFolderSelection(file, selection, descendantsById));
}

function toSearchConditions(condition: AutoOrganizeConditionV1): FileSearchCondition[] {
    return normalizeTextConditions(condition.textConditions, condition.text, condition.textMatchTarget).map((item) => ({
        text: item.text,
        target: item.target,
    }));
}

function createEmptySummary(rule: AutoOrganizeRuleV1): AutoOrganizeRuleSummary {
    return {
        ruleId: rule.id,
        ruleName: rule.name,
        matchedCount: 0,
        readyCount: 0,
        conflictCount: 0,
        skippedCount: 0,
    };
}

function getRuleActionKind(action: AutoOrganizeRuleV1['action']): AutoOrganizeActionKind {
    if (action.move.enabled && action.rename.enabled) return 'move_and_rename';
    if (action.move.enabled) return 'move';
    return 'rename';
}

function validateRuleAction(action: AutoOrganizeRuleV1['action']): void {
    if (!action.move.enabled && !action.rename.enabled) {
        throw new Error('移動またはリネームを有効にしてください');
    }
    if (action.move.enabled && !action.move.targetFolderId) {
        throw new Error('移動先フォルダを選択してください');
    }
    if (action.rename.enabled && !action.rename.template.trim()) {
        throw new Error('リネームテンプレートを入力してください');
    }
}

function buildRuleTarget(
    file: MediaFile,
    rule: AutoOrganizeRuleV1,
    targetFolder: MediaFolder | undefined
): {
    actionKind: AutoOrganizeActionKind;
    targetPath: string;
    targetFolderId: string;
    targetFolderName: string;
    status?: AutoOrganizeDryRunEntry['status'];
    reason?: string;
} {
    const actionKind = getRuleActionKind(rule.action);

    if (rule.action.move.enabled && !targetFolder) {
        return {
            actionKind,
            targetPath: file.path,
            targetFolderId: rule.action.move.targetFolderId,
            targetFolderName: '未登録フォルダ',
            status: 'skipped_missing_target',
            reason: '移動先フォルダが見つかりません',
        };
    }

    let nextFileName = path.basename(file.path);
    if (rule.action.rename.enabled) {
        const preview = buildAutoOrganizeRenamePreview(file, rule.action.rename.template);
        if (!preview.baseName.trim()) {
            return {
                actionKind,
                targetPath: file.path,
                targetFolderId: targetFolder?.id ?? file.root_folder_id ?? '',
                targetFolderName: targetFolder?.name ?? path.basename(path.dirname(file.path)),
                status: 'skipped_invalid_name',
                reason: 'リネーム結果が空になります',
            };
        }

        const nameValidationError = validateNewFileName(preview.fileName);
        if (nameValidationError) {
            return {
                actionKind,
                targetPath: file.path,
                targetFolderId: targetFolder?.id ?? file.root_folder_id ?? '',
                targetFolderName: targetFolder?.name ?? path.basename(path.dirname(file.path)),
                status: 'skipped_invalid_name',
                reason: nameValidationError,
            };
        }

        nextFileName = preview.fileName;
    }

    const targetDir = targetFolder?.path ?? path.dirname(file.path);
    return {
        actionKind,
        targetPath: path.join(targetDir, nextFileName),
        targetFolderId: targetFolder?.id ?? file.root_folder_id ?? '',
        targetFolderName: targetFolder?.name ?? path.basename(targetDir),
    };
}

function findConflictFileByPath(targetPath: string, sourceFileId: string): MediaFile | null {
    const normalizedTarget = normalizePathForCompare(targetPath);
    const existing = getFiles().find((file) => file.id !== sourceFileId && normalizePathForCompare(file.path) === normalizedTarget);
    return existing ?? null;
}

function evaluateRules(ruleIds?: string[]): EvaluatedRuleAssignments {
    const store = readStore();
    const selectedRules = (Array.isArray(ruleIds) && ruleIds.length > 0
        ? store.items.filter((rule) => ruleIds.includes(rule.id))
        : store.items.filter((rule) => rule.enabled)
    )
        .sort((a, b) => a.sortOrder - b.sortOrder);

    if (selectedRules.length === 0) {
        return {
            generatedAt: Date.now(),
            ruleIds: [],
            summaries: [],
            entries: [],
            truncated: false,
            readyEntries: [],
            totalMatchedCount: 0,
            totalReadyCount: 0,
            totalConflictCount: 0,
            totalSkippedCount: 0,
        };
    }

    const allFiles = getFiles();
    const allFileTagIds = getAllFileTagIds();
    const fileTagCache = new Map<string, string[]>(Object.entries(allFileTagIds));
    const fileRatings = getAllFileRatings();
    const overallRatingAxisId = getAllAxes().find((axis) => axis.isSystem)?.id ?? null;
    const folders = getFolders();
    const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
    const descendantsById = buildFolderDescendantsMap(folders);
    const assignedFileIds = new Set<string>();
    const summariesMap = new Map<string, AutoOrganizeRuleSummary>();
    const entries: AutoOrganizeDryRunEntry[] = [];
    const readyEntries: AutoOrganizeDryRunEntry[] = [];
    let truncated = false;
    let totalMatchedCount = 0;
    let totalReadyCount = 0;
    let totalConflictCount = 0;
    let totalSkippedCount = 0;

    selectedRules.forEach((rule) => {
        const summary = createEmptySummary(rule);
        summariesMap.set(rule.id, summary);

        const scopedFiles = filterFilesBySelection(allFiles, rule.condition.folderSelection, descendantsById);
        const matchedFiles = buildVisibleFiles(scopedFiles, {
            sortBy: 'date',
            sortOrder: 'desc',
            fileTagsCache: fileTagCache,
            selectedTagIds: rule.condition.tags.ids,
            filterMode: rule.condition.tags.mode,
            ratingFilter: rule.condition.ratings,
            fileRatings,
            overallRatingAxisId,
            ratingQuickFilter: rule.condition.ratingQuickFilter,
            searchConditions: toSearchConditions(rule.condition),
            selectedFileTypes: rule.condition.types,
        });

        const targetFolder = rule.action.move.enabled
            ? foldersById.get(rule.action.move.targetFolderId)
            : undefined;

        matchedFiles.forEach((file) => {
            if (assignedFileIds.has(file.id)) {
                return;
            }
            assignedFileIds.add(file.id);
            summary.matchedCount += 1;
            totalMatchedCount += 1;

            const plannedTarget = buildRuleTarget(file, rule, targetFolder);
            let entry: AutoOrganizeDryRunEntry;
            if (plannedTarget.status === 'skipped_missing_target') {
                summary.skippedCount += 1;
                totalSkippedCount += 1;
                entry = {
                    ruleId: rule.id,
                    ruleName: rule.name,
                    fileId: file.id,
                    fileName: file.name,
                    sourcePath: file.path,
                    targetPath: plannedTarget.targetPath,
                    targetFolderId: plannedTarget.targetFolderId,
                    targetFolderName: plannedTarget.targetFolderName,
                    actionKind: plannedTarget.actionKind,
                    status: plannedTarget.status,
                    reason: plannedTarget.reason,
                };
            } else if (plannedTarget.status === 'skipped_invalid_name') {
                summary.skippedCount += 1;
                totalSkippedCount += 1;
                entry = {
                    ruleId: rule.id,
                    ruleName: rule.name,
                    fileId: file.id,
                    fileName: file.name,
                    sourcePath: file.path,
                    targetPath: plannedTarget.targetPath,
                    targetFolderId: plannedTarget.targetFolderId,
                    targetFolderName: plannedTarget.targetFolderName,
                    actionKind: plannedTarget.actionKind,
                    status: plannedTarget.status,
                    reason: plannedTarget.reason,
                };
            } else if (normalizePathForCompare(plannedTarget.targetPath) === normalizePathForCompare(file.path)) {
                summary.skippedCount += 1;
                totalSkippedCount += 1;
                entry = {
                    ruleId: rule.id,
                    ruleName: rule.name,
                    fileId: file.id,
                    fileName: file.name,
                    sourcePath: file.path,
                    targetPath: plannedTarget.targetPath,
                    targetFolderId: plannedTarget.targetFolderId,
                    targetFolderName: plannedTarget.targetFolderName,
                    actionKind: plannedTarget.actionKind,
                    status: 'skipped_same_path',
                    reason: '既にこの名前と場所です',
                };
            } else {
                const conflict = findConflictFileByPath(plannedTarget.targetPath, file.id);
                if (conflict) {
                    summary.conflictCount += 1;
                    totalConflictCount += 1;
                    entry = {
                        ruleId: rule.id,
                        ruleName: rule.name,
                        fileId: file.id,
                        fileName: file.name,
                        sourcePath: file.path,
                        targetPath: plannedTarget.targetPath,
                        targetFolderId: plannedTarget.targetFolderId,
                        targetFolderName: plannedTarget.targetFolderName,
                        actionKind: plannedTarget.actionKind,
                        status: 'conflict',
                        reason: '適用後の保存先に同名ファイルが存在します',
                    };
                } else {
                    summary.readyCount += 1;
                    totalReadyCount += 1;
                    entry = {
                        ruleId: rule.id,
                        ruleName: rule.name,
                        fileId: file.id,
                        fileName: file.name,
                        sourcePath: file.path,
                        targetPath: plannedTarget.targetPath,
                        targetFolderId: plannedTarget.targetFolderId,
                        targetFolderName: plannedTarget.targetFolderName,
                        actionKind: plannedTarget.actionKind,
                        status: 'ready',
                    };
                    readyEntries.push(entry);
                }
            }

            if (entries.length < PREVIEW_ENTRY_LIMIT) {
                entries.push(entry);
            } else {
                truncated = true;
            }
        });
    });

    return {
        generatedAt: Date.now(),
        ruleIds: selectedRules.map((rule) => rule.id),
        summaries: selectedRules.map((rule) => summariesMap.get(rule.id) ?? createEmptySummary(rule)),
        entries,
        truncated,
        readyEntries,
        totalMatchedCount,
        totalReadyCount,
        totalConflictCount,
        totalSkippedCount,
    };
}

function requireTargetFolder(targetFolderId: string): MediaFolder {
    const targetFolder = getFolderById(targetFolderId);
    if (!targetFolder) {
        throw new Error('移動先フォルダが見つかりません');
    }
    return targetFolder;
}

export function getAllAutoOrganizeRules(): AutoOrganizeRuleV1[] {
    return readStore().items;
}

export function createAutoOrganizeRule(input: {
    name: string;
    enabled?: boolean;
    condition?: unknown;
    action?: unknown;
}): AutoOrganizeRuleV1 {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name) {
        throw new Error('ルール名を入力してください');
    }

    const action = normalizeAction(input.action);
    validateRuleAction(action);
    if (action.move.enabled) {
        requireTargetFolder(action.move.targetFolderId);
    }

    const store = readStore();
    const now = Date.now();
    const created: AutoOrganizeRuleV1 = {
        id: uuidv4(),
        name,
        enabled: input.enabled !== false,
        condition: normalizeCondition(input.condition),
        action,
        sortOrder: store.items.length,
        createdAt: now,
        updatedAt: now,
    };

    store.items.push(created);
    writeStore(store);
    return created;
}

export function updateAutoOrganizeRule(input: {
    id: string;
    updates: {
        name?: string;
        enabled?: boolean;
        condition?: unknown;
        action?: unknown;
        sortOrder?: number;
    };
}): AutoOrganizeRuleV1 {
    const store = readStore();
    const index = store.items.findIndex((rule) => rule.id === input.id);
    if (index < 0) {
        throw new Error('自動整理ルールが見つかりません');
    }

    const current = store.items[index];
    const nextName = typeof input.updates.name === 'string' ? input.updates.name.trim() : current.name;
    if (!nextName) {
        throw new Error('ルール名を入力してください');
    }

    const nextAction = input.updates.action === undefined
        ? current.action
        : normalizeAction(input.updates.action);
    validateRuleAction(nextAction);
    if (nextAction.move.enabled) {
        requireTargetFolder(nextAction.move.targetFolderId);
    }

    const nextRule: AutoOrganizeRuleV1 = {
        ...current,
        name: nextName,
        enabled: typeof input.updates.enabled === 'boolean' ? input.updates.enabled : current.enabled,
        condition: input.updates.condition === undefined ? current.condition : normalizeCondition(input.updates.condition),
        action: nextAction,
        sortOrder: typeof input.updates.sortOrder === 'number' && Number.isFinite(input.updates.sortOrder)
            ? Math.max(0, Math.floor(input.updates.sortOrder))
            : current.sortOrder,
        updatedAt: Date.now(),
    };

    store.items[index] = nextRule;
    store.items = [...store.items]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((rule, order) => ({ ...rule, sortOrder: order }));
    writeStore(store);

    const updated = store.items.find((rule) => rule.id === input.id);
    if (!updated) {
        throw new Error('自動整理ルール更新後の整合性エラー');
    }
    return updated;
}

export function deleteAutoOrganizeRule(id: string): { success: boolean } {
    const store = readStore();
    const before = store.items.length;
    store.items = store.items.filter((rule) => rule.id !== id);
    if (store.items.length === before) {
        return { success: false };
    }
    store.items = store.items.map((rule, index) => ({ ...rule, sortOrder: index }));
    writeStore(store);
    return { success: true };
}

export function dryRunAutoOrganize(ruleIds?: string[]): AutoOrganizeDryRunResult {
    try {
        const evaluated = evaluateRules(ruleIds);
        return {
            success: true,
            generatedAt: evaluated.generatedAt,
            ruleIds: evaluated.ruleIds,
            totalRuleCount: evaluated.summaries.length,
            totalMatchedCount: evaluated.totalMatchedCount,
            totalReadyCount: evaluated.totalReadyCount,
            totalConflictCount: evaluated.totalConflictCount,
            totalSkippedCount: evaluated.totalSkippedCount,
            summaries: evaluated.summaries,
            entries: evaluated.entries,
            truncated: evaluated.truncated,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error('Dry run failed:', message);
        return {
            success: false,
            generatedAt: Date.now(),
            ruleIds: [],
            totalRuleCount: 0,
            totalMatchedCount: 0,
            totalReadyCount: 0,
            totalConflictCount: 0,
            totalSkippedCount: 0,
            summaries: [],
            entries: [],
            truncated: false,
            error: message,
        };
    }
}

export async function applyAutoOrganize(ruleIds?: string[]): Promise<AutoOrganizeApplyResult> {
    try {
        const evaluated = evaluateRules(ruleIds);
        const entries: AutoOrganizeApplyEntry[] = [];
        let truncated = false;
        let appliedCount = 0;
        let failedCount = 0;
        let skippedCount = evaluated.totalSkippedCount + evaluated.totalConflictCount;

        for (const readyEntry of evaluated.readyEntries) {
            const relocateResult = await relocateFile(readyEntry.sourcePath, readyEntry.targetPath);
            if (relocateResult.success) {
                const nextFileName = path.basename(readyEntry.targetPath);
                if (readyEntry.actionKind === 'move') {
                    updateFileLocation(readyEntry.fileId, readyEntry.targetPath, readyEntry.targetFolderId);
                } else if (readyEntry.actionKind === 'rename') {
                    updateFileNameAndPath(readyEntry.fileId, nextFileName, readyEntry.targetPath);
                } else {
                    updateFileLocation(readyEntry.fileId, readyEntry.targetPath, readyEntry.targetFolderId);
                    updateFileNameAndPath(readyEntry.fileId, nextFileName, readyEntry.targetPath);
                }

                appliedCount += 1;
                void logActivity(readyEntry.actionKind === 'rename' ? 'file_rename' : 'file_move', readyEntry.fileId, readyEntry.fileName, {
                    sourcePath: readyEntry.sourcePath,
                    targetPath: readyEntry.targetPath,
                    ruleId: readyEntry.ruleId,
                    ruleName: readyEntry.ruleName,
                    actionKind: readyEntry.actionKind,
                });
                if (entries.length < PREVIEW_ENTRY_LIMIT) {
                    entries.push({
                        ruleId: readyEntry.ruleId,
                        ruleName: readyEntry.ruleName,
                        fileId: readyEntry.fileId,
                        fileName: readyEntry.fileName,
                        sourcePath: readyEntry.sourcePath,
                        targetPath: readyEntry.targetPath,
                        actionKind: readyEntry.actionKind,
                        status: 'applied',
                    });
                } else {
                    truncated = true;
                }
                continue;
            }

            failedCount += 1;
            if (entries.length < PREVIEW_ENTRY_LIMIT) {
                entries.push({
                    ruleId: readyEntry.ruleId,
                    ruleName: readyEntry.ruleName,
                    fileId: readyEntry.fileId,
                    fileName: readyEntry.fileName,
                    sourcePath: readyEntry.sourcePath,
                    targetPath: readyEntry.targetPath,
                    actionKind: readyEntry.actionKind,
                    status: 'failed',
                    reason: relocateResult.error ?? '自動整理の適用に失敗しました',
                });
            } else {
                truncated = true;
            }
        }

        evaluated.entries.forEach((entry) => {
            if (entry.status === 'ready') return;
            if (entries.length < PREVIEW_ENTRY_LIMIT) {
                entries.push({
                    ruleId: entry.ruleId,
                    ruleName: entry.ruleName,
                    fileId: entry.fileId,
                    fileName: entry.fileName,
                    sourcePath: entry.sourcePath,
                    targetPath: entry.targetPath,
                    actionKind: entry.actionKind,
                    status: 'skipped',
                    reason: entry.reason,
                });
            } else {
                truncated = true;
            }
        });

        return {
            success: true,
            appliedAt: Date.now(),
            ruleIds: evaluated.ruleIds,
            appliedCount,
            failedCount,
            skippedCount,
            entries,
            truncated,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error('Apply failed:', message);
        return {
            success: false,
            appliedAt: Date.now(),
            ruleIds: [],
            appliedCount: 0,
            failedCount: 0,
            skippedCount: 0,
            entries: [],
            truncated: false,
            error: message,
        };
    }
}
