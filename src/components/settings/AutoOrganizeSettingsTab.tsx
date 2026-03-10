import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Play, Plus, RefreshCw, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { useAutoOrganizeStore } from '../../stores/useAutoOrganizeStore';
import { useFileStore } from '../../stores/useFileStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { useRatingStore } from '../../stores/useRatingStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useTagStore } from '../../stores/useTagStore';
import { useUIStore } from '../../stores/useUIStore';
import type { AutoOrganizeRuleV1 } from '../../types/autoOrganize';
import type { MediaFolder } from '../../types/file';
import { buildFolderSelectionValue, resolveSidebarSelectionLabel } from '../sidebar/sidebarShared';
import { SettingsSection } from './SettingsSection';
import { AutoOrganizeRuleEditorDialog } from './AutoOrganizeRuleEditorDialog';
import { AutoOrganizeDryRunDialog } from './AutoOrganizeDryRunDialog';
import { AutoOrganizeRollbackDialog } from './AutoOrganizeRollbackDialog';
import { getRatingQuickFilterLabel } from '../../shared/ratingQuickFilter';

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
    const ratingDisplayThresholds = useSettingsStore.getState().ratingDisplayThresholds;
    const segments: string[] = [`範囲: ${describeSelection(rule.condition.folderSelection, folders)}`];

    if (rule.action.move.enabled) {
        segments.push(`移動先: ${folders.find((folder) => folder.id === rule.action.move.targetFolderId)?.path ?? '未登録フォルダ'}`);
    }
    if (rule.action.rename.enabled) {
        segments.push(`リネーム: ${rule.action.rename.template}`);
    }
    if (rule.automation.runOnScanComplete) {
        segments.push('自動実行');
    }

    const textConditionCount = rule.condition.textConditions.filter((condition) => condition.text.trim().length > 0).length;
    if (textConditionCount > 0) segments.push(`検索 ${textConditionCount}件`);
    if (rule.condition.tags.ids.length > 0) segments.push(`タグ ${rule.condition.tags.mode} ${rule.condition.tags.ids.length}件`);
    if (Object.keys(rule.condition.ratings).length > 0) segments.push(`評価 ${Object.keys(rule.condition.ratings).length}軸`);
    if (rule.condition.ratingQuickFilter !== 'none') {
        segments.push(`クイック評価: ${getRatingQuickFilterLabel(rule.condition.ratingQuickFilter, ratingDisplayThresholds)}`);
    }
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
    const settings = useAutoOrganizeStore((state) => state.settings);
    const runs = useAutoOrganizeStore((state) => state.runs);
    const lastDryRun = useAutoOrganizeStore((state) => state.lastDryRun);
    const lastApplyResult = useAutoOrganizeStore((state) => state.lastApplyResult);
    const lastRollbackPreview = useAutoOrganizeStore((state) => state.lastRollbackPreview);
    const lastRollbackApplyResult = useAutoOrganizeStore((state) => state.lastRollbackApplyResult);
    const isLoading = useAutoOrganizeStore((state) => state.isLoading);
    const isMutating = useAutoOrganizeStore((state) => state.isMutating);
    const isRunning = useAutoOrganizeStore((state) => state.isRunning);
    const loadRules = useAutoOrganizeStore((state) => state.loadRules);
    const loadSettings = useAutoOrganizeStore((state) => state.loadSettings);
    const updateSettings = useAutoOrganizeStore((state) => state.updateSettings);
    const loadRuns = useAutoOrganizeStore((state) => state.loadRuns);
    const createRule = useAutoOrganizeStore((state) => state.createRule);
    const updateRule = useAutoOrganizeStore((state) => state.updateRule);
    const deleteRule = useAutoOrganizeStore((state) => state.deleteRule);
    const duplicateRule = useAutoOrganizeStore((state) => state.duplicateRule);
    const dryRunRules = useAutoOrganizeStore((state) => state.dryRunRules);
    const applyRules = useAutoOrganizeStore((state) => state.applyRules);
    const dryRunRollback = useAutoOrganizeStore((state) => state.dryRunRollback);
    const applyRollback = useAutoOrganizeStore((state) => state.applyRollback);
    const clearLastDryRun = useAutoOrganizeStore((state) => state.clearLastDryRun);
    const clearLastApplyResult = useAutoOrganizeStore((state) => state.clearLastApplyResult);
    const clearLastRollbackPreview = useAutoOrganizeStore((state) => state.clearLastRollbackPreview);
    const clearLastRollbackApplyResult = useAutoOrganizeStore((state) => state.clearLastRollbackApplyResult);
    const tags = useTagStore((state) => state.tags);
    const ratingAxes = useRatingStore((state) => state.axes);
    const activeProfileId = useProfileStore((state) => state.activeProfileId);

    const [folders, setFolders] = useState<MediaFolder[]>([]);
    const [editorState, setEditorState] = useState<EditorState>(null);
    const [dryRunOpen, setDryRunOpen] = useState(false);
    const [rollbackOpen, setRollbackOpen] = useState(false);

    const loadFolders = useCallback(async () => {
        const nextFolders = await window.electronAPI.getFolders();
        setFolders(nextFolders);
    }, []);

    useEffect(() => {
        clearLastDryRun();
        clearLastApplyResult();
        clearLastRollbackPreview();
        clearLastRollbackApplyResult();
        void loadRules();
        void loadSettings();
        void loadRuns();
        void loadFolders();
    }, [
        activeProfileId,
        clearLastApplyResult,
        clearLastDryRun,
        clearLastRollbackApplyResult,
        clearLastRollbackPreview,
        loadFolders,
        loadRules,
        loadRuns,
        loadSettings,
    ]);

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
        await Promise.all([reloadCurrentView(), loadFolders(), loadRules(), loadRuns()]);
        useUIStore.getState().showToast(`自動整理を適用しました（処理 ${result.appliedCount} 件）`, 'success');
    }, [applyRules, lastDryRun, loadFolders, loadRules, loadRuns]);

    const handleRunRollbackDryRun = useCallback(async (runId: string) => {
        const result = await dryRunRollback(runId);
        if (!result.success) {
            useUIStore.getState().showToast(result.error || 'ロールバック Dry Run に失敗しました', 'error');
            return;
        }
        setRollbackOpen(true);
    }, [dryRunRollback]);

    const handleApplyRollback = useCallback(async () => {
        if (!lastRollbackPreview?.success) return;
        const result = await applyRollback(lastRollbackPreview.runId);
        if (!result.success) {
            useUIStore.getState().showToast(result.error || 'ロールバックに失敗しました', 'error');
            return;
        }
        await Promise.all([reloadCurrentView(), loadFolders(), loadRules(), loadRuns()]);
        useUIStore.getState().showToast(`ロールバックを適用しました（復元 ${result.revertedCount} 件）`, 'success');
    }, [applyRollback, lastRollbackPreview, loadFolders, loadRules, loadRuns]);

    return (
        <div className="space-y-6 px-4 py-4">
            <SettingsSection
                title="自動実行"
                description="スキャン完了後に、自動実行対象のルールだけを現在のプロファイルで適用します。"
                scope="profile"
            >
                <div className="grid gap-3 md:grid-cols-2">
                    <label className="rounded border border-surface-700 bg-surface-900/40 p-3 text-sm text-surface-200">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={settings.enabled}
                                onChange={(event) => {
                                    void updateSettings({ enabled: event.target.checked });
                                }}
                                className="h-4 w-4 accent-primary-500"
                                disabled={isMutating}
                            />
                            自動実行を有効にする
                        </div>
                    </label>
                    <label className="rounded border border-surface-700 bg-surface-900/40 p-3 text-sm text-surface-200">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={settings.runOnManualScan}
                                onChange={(event) => {
                                    void updateSettings({ runOnManualScan: event.target.checked });
                                }}
                                className="h-4 w-4 accent-primary-500"
                                disabled={isMutating}
                            />
                            手動スキャン後に実行
                        </div>
                    </label>
                    <label className="rounded border border-surface-700 bg-surface-900/40 p-3 text-sm text-surface-200">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={settings.runOnStartupScan}
                                onChange={(event) => {
                                    void updateSettings({ runOnStartupScan: event.target.checked });
                                }}
                                className="h-4 w-4 accent-primary-500"
                                disabled={isMutating}
                            />
                            起動時自動スキャン後に実行
                        </div>
                    </label>
                    <label className="rounded border border-surface-700 bg-surface-900/40 p-3 text-sm text-surface-200">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={settings.runOnWatchScan}
                                onChange={(event) => {
                                    void updateSettings({ runOnWatchScan: event.target.checked });
                                }}
                                className="h-4 w-4 accent-primary-500"
                                disabled={isMutating}
                            />
                            監視による再スキャン後に実行
                        </div>
                    </label>
                </div>

                <div className="max-w-xs">
                    <label className="mb-1 block text-xs text-surface-400">保持する実行履歴数</label>
                    <input
                        type="number"
                        min={1}
                        max={100}
                        value={settings.historyLimit}
                        onChange={(event) => {
                            const nextValue = Number(event.target.value);
                            if (!Number.isFinite(nextValue)) return;
                            void updateSettings({ historyLimit: nextValue });
                        }}
                        className="w-full rounded border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 focus:border-primary-500 focus:outline-none"
                        disabled={isMutating}
                    />
                </div>
            </SettingsSection>

            <SettingsSection
                title="自動整理ルール"
                description="保存済み条件に一致したファイルを移動またはリネームします。手動実行でも自動実行でも、適用前に Dry Run 相当の判定結果で安全確認します。"
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

            <SettingsSection
                title="実行履歴 / ロールバック補助"
                description="成功した適用結果を保持し、同じファイル群を元の場所と名前へ戻す preview を確認してから巻き戻せます。"
                scope="profile"
            >
                {runs.length === 0 ? (
                    <div className="rounded border border-dashed border-surface-700 bg-surface-950/20 p-6 text-center text-sm text-surface-500">
                        まだ実行履歴がありません。手動適用か自動実行後にここへ表示されます。
                    </div>
                ) : (
                    <div className="space-y-3">
                        {runs.map((run) => (
                            <div key={run.id} className="rounded-lg border border-surface-700 bg-surface-900/45 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="text-sm font-semibold text-surface-100">
                                                {new Date(run.createdAt).toLocaleString('ja-JP')}
                                            </div>
                                            <span className="rounded border border-surface-700 bg-surface-900/60 px-2 py-0.5 text-[11px] text-surface-300">
                                                {run.triggerSource === 'manual' ? '手動適用'
                                                    : run.triggerSource === 'manual_scan' ? '手動スキャン後'
                                                        : run.triggerSource === 'startup_scan' ? '起動時スキャン後'
                                                            : '監視再スキャン後'}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <span className="rounded border border-surface-800 bg-surface-950/30 px-2 py-1 text-[11px] text-surface-300">
                                                適用 {run.appliedCount} 件
                                            </span>
                                            <span className="rounded border border-surface-800 bg-surface-950/30 px-2 py-1 text-[11px] text-surface-300">
                                                失敗 {run.failedCount} 件
                                            </span>
                                            <span className="rounded border border-surface-800 bg-surface-950/30 px-2 py-1 text-[11px] text-surface-300">
                                                スキップ {run.skippedCount} 件
                                            </span>
                                            {run.scanPath && (
                                                <span className="rounded border border-surface-800 bg-surface-950/30 px-2 py-1 text-[11px] text-surface-300">
                                                    {run.scanPath}
                                                </span>
                                            )}
                                            {run.ruleNames.map((ruleName) => (
                                                <span key={`${run.id}:${ruleName}`} className="rounded border border-surface-800 bg-surface-950/30 px-2 py-1 text-[11px] text-surface-300">
                                                    {ruleName}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { void handleRunRollbackDryRun(run.id); }}
                                        disabled={isRunning || run.appliedCount === 0}
                                        className="inline-flex items-center gap-2 rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 transition-colors hover:bg-surface-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <RotateCcw size={14} />
                                        ロールバック Dry Run
                                    </button>
                                </div>
                            </div>
                        ))}
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

            <AutoOrganizeRollbackDialog
                isOpen={rollbackOpen}
                result={lastRollbackPreview}
                applyResult={lastRollbackApplyResult}
                isRunning={isRunning}
                onClose={() => setRollbackOpen(false)}
                onApply={() => { void handleApplyRollback(); }}
            />
        </div>
    );
});

AutoOrganizeSettingsTab.displayName = 'AutoOrganizeSettingsTab';
