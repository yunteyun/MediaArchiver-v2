import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Play, Plus, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { useAutoOrganizeStore } from '../../stores/useAutoOrganizeStore';
import { useFileStore } from '../../stores/useFileStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { useRatingStore } from '../../stores/useRatingStore';
import { useTagStore } from '../../stores/useTagStore';
import { useUIStore } from '../../stores/useUIStore';
import type { AutoOrganizeRuleV1 } from '../../types/autoOrganize';
import type { MediaFolder } from '../../types/file';
import { buildFolderSelectionValue, resolveSidebarSelectionLabel } from '../sidebar/sidebarShared';
import { SettingsSection } from './SettingsSection';
import { AutoOrganizeRuleEditorDialog } from './AutoOrganizeRuleEditorDialog';
import { AutoOrganizeDryRunDialog } from './AutoOrganizeDryRunDialog';

interface FolderOption {
    value: string;
    label: string;
}

interface TargetFolderOption {
    id: string;
    label: string;
}

type EditorState =
    | { mode: 'create' }
    | { mode: 'edit'; rule: AutoOrganizeRuleV1 }
    | null;

const ALL_FILES_ID = '__all__';
const DRIVE_PREFIX = '__drive:';
const FOLDER_PREFIX = '__folder:';
const VIRTUAL_FOLDER_PREFIX = '__vfolder:';
const VIRTUAL_FOLDER_RECURSIVE_PREFIX = '__vfolderr:';

function buildFolderOptions(folders: MediaFolder[]): FolderOption[] {
    const childCount = new Map<string, number>();
    folders.forEach((folder) => {
        if (!folder.parentId) return;
        childCount.set(folder.parentId, (childCount.get(folder.parentId) ?? 0) + 1);
    });

    const drives = Array.from(new Set(folders.map((folder) => folder.drive).filter(Boolean))).sort();
    const folderOptions = folders
        .filter((folder) => !folder.isVirtualFolder)
        .sort((a, b) => a.path.localeCompare(b.path, 'ja'))
        .map((folder) => ({
            value: buildFolderSelectionValue(folder, (childCount.get(folder.id) ?? 0) > 0),
            label: folder.path,
        }));

    return [
        { value: ALL_FILES_ID, label: 'すべてのファイル' },
        ...drives.map((drive) => ({ value: `${DRIVE_PREFIX}${drive}`, label: `${drive} ドライブ` })),
        ...folderOptions,
    ];
}

function buildTargetFolderOptions(folders: MediaFolder[]): TargetFolderOption[] {
    return folders
        .filter((folder) => !folder.isVirtualFolder)
        .sort((a, b) => a.path.localeCompare(b.path, 'ja'))
        .map((folder) => ({
            id: folder.id,
            label: folder.path,
        }));
}

function describeSelection(selection: string | null, folders: MediaFolder[]): string {
    if (!selection || selection === ALL_FILES_ID) return 'すべてのファイル';
    return resolveSidebarSelectionLabel(selection, folders);
}

function summarizeRule(rule: AutoOrganizeRuleV1, folders: MediaFolder[]): string[] {
    const segments: string[] = [`範囲: ${describeSelection(rule.condition.folderSelection, folders)}`];

    if (rule.action.move.enabled) {
        segments.push(`移動先: ${folders.find((folder) => folder.id === rule.action.move.targetFolderId)?.path ?? '未登録フォルダ'}`);
    }
    if (rule.action.rename.enabled) {
        segments.push(`リネーム: ${rule.action.rename.template}`);
    }

    const textConditionCount = rule.condition.textConditions.filter((condition) => condition.text.trim().length > 0).length;
    if (textConditionCount > 0) segments.push(`検索 ${textConditionCount}件`);
    if (rule.condition.tags.ids.length > 0) segments.push(`タグ ${rule.condition.tags.mode} ${rule.condition.tags.ids.length}件`);
    if (Object.keys(rule.condition.ratings).length > 0) segments.push(`評価 ${Object.keys(rule.condition.ratings).length}軸`);
    if (rule.condition.ratingQuickFilter !== 'none') segments.push(`クイック評価: ${rule.condition.ratingQuickFilter === 'overall4plus' ? '総合評価 4+' : '未評価のみ'}`);
    if (rule.condition.types.length < 4) segments.push(`タイプ: ${rule.condition.types.join(', ')}`);

    return segments;
}

async function reloadCurrentView() {
    const currentFolderId = useFileStore.getState().currentFolderId;
    let files;

    if (!currentFolderId || currentFolderId === ALL_FILES_ID) {
        files = await window.electronAPI.getFiles();
    } else if (currentFolderId.startsWith(DRIVE_PREFIX)) {
        files = await window.electronAPI.getFilesByDrive(currentFolderId.slice(DRIVE_PREFIX.length));
    } else if (currentFolderId.startsWith(FOLDER_PREFIX)) {
        files = await window.electronAPI.getFilesByFolderRecursive(currentFolderId.slice(FOLDER_PREFIX.length));
    } else if (currentFolderId.startsWith(VIRTUAL_FOLDER_RECURSIVE_PREFIX)) {
        files = await window.electronAPI.getFilesByFolderPathRecursive(currentFolderId.slice(VIRTUAL_FOLDER_RECURSIVE_PREFIX.length));
    } else if (currentFolderId.startsWith(VIRTUAL_FOLDER_PREFIX)) {
        files = await window.electronAPI.getFilesByFolderPathDirect(currentFolderId.slice(VIRTUAL_FOLDER_PREFIX.length));
    } else {
        files = await window.electronAPI.getFiles(currentFolderId);
    }

    useFileStore.getState().setFiles(files);
    const metadata = await window.electronAPI.getFolderMetadata();
    useFileStore.getState().setFolderMetadata(metadata);
}

export const AutoOrganizeSettingsTab = React.memo(() => {
    const rules = useAutoOrganizeStore((state) => state.rules);
    const lastDryRun = useAutoOrganizeStore((state) => state.lastDryRun);
    const lastApplyResult = useAutoOrganizeStore((state) => state.lastApplyResult);
    const isLoading = useAutoOrganizeStore((state) => state.isLoading);
    const isMutating = useAutoOrganizeStore((state) => state.isMutating);
    const isRunning = useAutoOrganizeStore((state) => state.isRunning);
    const loadRules = useAutoOrganizeStore((state) => state.loadRules);
    const createRule = useAutoOrganizeStore((state) => state.createRule);
    const updateRule = useAutoOrganizeStore((state) => state.updateRule);
    const deleteRule = useAutoOrganizeStore((state) => state.deleteRule);
    const duplicateRule = useAutoOrganizeStore((state) => state.duplicateRule);
    const dryRunRules = useAutoOrganizeStore((state) => state.dryRunRules);
    const applyRules = useAutoOrganizeStore((state) => state.applyRules);
    const clearLastDryRun = useAutoOrganizeStore((state) => state.clearLastDryRun);
    const clearLastApplyResult = useAutoOrganizeStore((state) => state.clearLastApplyResult);
    const tags = useTagStore((state) => state.tags);
    const ratingAxes = useRatingStore((state) => state.axes);
    const activeProfileId = useProfileStore((state) => state.activeProfileId);

    const [folders, setFolders] = useState<MediaFolder[]>([]);
    const [editorState, setEditorState] = useState<EditorState>(null);
    const [dryRunOpen, setDryRunOpen] = useState(false);

    const loadFolders = useCallback(async () => {
        const nextFolders = await window.electronAPI.getFolders();
        setFolders(nextFolders);
    }, []);

    useEffect(() => {
        clearLastDryRun();
        clearLastApplyResult();
        void loadRules();
        void loadFolders();
    }, [activeProfileId, clearLastApplyResult, clearLastDryRun, loadFolders, loadRules]);

    const folderOptions = useMemo(() => buildFolderOptions(folders), [folders]);
    const targetFolderOptions = useMemo(() => buildTargetFolderOptions(folders), [folders]);
    const enabledRules = useMemo(() => rules.filter((rule) => rule.enabled), [rules]);

    const handleRunDryRun = useCallback(async (ruleIds?: string[]) => {
        const result = await dryRunRules(ruleIds);
        if (!result.success) {
            useUIStore.getState().showToast(result.error || 'Dry Run に失敗しました', 'error');
            return;
        }
        setDryRunOpen(true);
    }, [dryRunRules]);

    const handleApplyFromDryRun = useCallback(async () => {
        if (!lastDryRun?.success) return;
        const result = await applyRules(lastDryRun.ruleIds);
        if (!result.success) {
            useUIStore.getState().showToast(result.error || '自動整理の適用に失敗しました', 'error');
            return;
        }
        await Promise.all([reloadCurrentView(), loadFolders(), loadRules()]);
        useUIStore.getState().showToast(`自動整理を適用しました（処理 ${result.appliedCount} 件）`, 'success');
    }, [applyRules, lastDryRun, loadFolders, loadRules]);

    return (
        <div className="space-y-6 px-4 py-4">
            <SettingsSection
                title="自動整理ルール"
                description="保存済み条件に一致したファイルを移動またはリネームします。手動実行のみで、適用前に Dry Run を必須にしています。"
                scope="profile"
            >
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            clearLastDryRun();
                            clearLastApplyResult();
                            setEditorState({ mode: 'create' });
                        }}
                        className="inline-flex items-center gap-2 rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 transition-colors hover:bg-surface-700"
                    >
                        <Plus size={14} />
                        新規ルール
                    </button>
                    <button
                        type="button"
                        onClick={() => { void handleRunDryRun(); }}
                        disabled={enabledRules.length === 0 || isRunning}
                        className="inline-flex items-center gap-2 rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 transition-colors hover:bg-surface-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Play size={14} />
                        有効ルールを Dry Run
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            void loadRules();
                            void loadFolders();
                        }}
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 transition-colors hover:bg-surface-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                        再読込
                    </button>
                </div>

                <div className="rounded border border-surface-700 bg-surface-950/25 p-3 text-xs text-surface-400">
                    有効 {enabledRules.length} 件 / 全 {rules.length} 件
                    {lastDryRun?.success && (
                        <span className="ml-3">
                            直近 Dry Run: 適用可能 {lastDryRun.totalReadyCount} 件 / 競合 {lastDryRun.totalConflictCount} 件
                        </span>
                    )}
                </div>

                {rules.length === 0 ? (
                    <div className="rounded border border-dashed border-surface-700 bg-surface-950/20 p-6 text-center text-sm text-surface-500">
                        ルールはまだありません。まずは 1 件作成して Dry Run で件数確認から始めてください。
                    </div>
                ) : (
                    <div className="space-y-3">
                        {rules.map((rule) => {
                            const segments = summarizeRule(rule, folders);
                            return (
                                <div key={rule.id} className="rounded-lg border border-surface-700 bg-surface-900/45 p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="text-sm font-semibold text-surface-100">{rule.name}</div>
                                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${
                                                    rule.enabled
                                                        ? 'border-emerald-700/40 bg-emerald-900/10 text-emerald-200'
                                                        : 'border-surface-700 bg-surface-900/60 text-surface-400'
                                                }`}>
                                                    {rule.enabled ? '有効' : '無効'}
                                                </span>
                                            </div>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {segments.map((segment) => (
                                                    <span key={segment} className="rounded border border-surface-800 bg-surface-950/30 px-2 py-1 text-[11px] text-surface-300">
                                                        {segment}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <label className="inline-flex items-center gap-2 rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200">
                                                <input
                                                    type="checkbox"
                                                    checked={rule.enabled}
                                                    onChange={(event) => {
                                                        void updateRule({ id: rule.id, updates: { enabled: event.target.checked } });
                                                    }}
                                                    className="h-4 w-4 accent-primary-500"
                                                    disabled={isMutating}
                                                />
                                                有効
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => { void handleRunDryRun([rule.id]); }}
                                                disabled={isRunning}
                                                className="inline-flex items-center gap-2 rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 transition-colors hover:bg-surface-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                <Sparkles size={14} />
                                                Dry Run
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    clearLastDryRun();
                                                    clearLastApplyResult();
                                                    setEditorState({ mode: 'edit', rule });
                                                }}
                                                className="rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 transition-colors hover:bg-surface-700"
                                            >
                                                編集
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    void duplicateRule(rule.id).catch((error) => {
                                                        useUIStore.getState().showToast(
                                                            error instanceof Error ? error.message : 'ルールの複製に失敗しました',
                                                            'error'
                                                        );
                                                    });
                                                }}
                                                disabled={isMutating}
                                                className="rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 transition-colors hover:bg-surface-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                複製
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!window.confirm(`ルール「${rule.name}」を削除しますか？`)) return;
                                                    void deleteRule(rule.id).then((success) => {
                                                        if (!success) {
                                                            useUIStore.getState().showToast('ルールの削除に失敗しました', 'error');
                                                        }
                                                    }).catch((error) => {
                                                        useUIStore.getState().showToast(
                                                            error instanceof Error ? error.message : 'ルールの削除に失敗しました',
                                                            'error'
                                                        );
                                                    });
                                                }}
                                                disabled={isMutating}
                                                className="inline-flex items-center gap-2 rounded border border-red-700/40 bg-red-900/10 px-3 py-1.5 text-sm text-red-200 transition-colors hover:bg-red-900/20 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                <Trash2 size={14} />
                                                削除
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </SettingsSection>

            <AutoOrganizeRuleEditorDialog
                isOpen={editorState !== null}
                title={editorState?.mode === 'edit' ? '自動整理ルールを編集' : '自動整理ルールを追加'}
                submitLabel={editorState?.mode === 'edit' ? '保存' : '作成'}
                initialRule={editorState?.mode === 'edit' ? editorState.rule : null}
                folderOptions={folderOptions}
                targetFolderOptions={targetFolderOptions}
                tags={tags}
                ratingAxes={ratingAxes}
                isSubmitting={isMutating}
                onClose={() => setEditorState(null)}
                onSubmit={async (payload) => {
                    try {
                        if (editorState?.mode === 'edit') {
                            await updateRule({
                                id: editorState.rule.id,
                                updates: payload,
                            });
                        } else {
                            await createRule(payload);
                        }
                        setEditorState(null);
                    } catch (error) {
                        useUIStore.getState().showToast(
                            error instanceof Error ? error.message : 'ルールの保存に失敗しました',
                            'error'
                        );
                    }
                }}
            />

            <AutoOrganizeDryRunDialog
                isOpen={dryRunOpen}
                result={lastDryRun}
                applyResult={lastApplyResult}
                isRunning={isRunning}
                onClose={() => setDryRunOpen(false)}
                onApply={() => { void handleApplyFromDryRun(); }}
            />
        </div>
    );
});

AutoOrganizeSettingsTab.displayName = 'AutoOrganizeSettingsTab';
