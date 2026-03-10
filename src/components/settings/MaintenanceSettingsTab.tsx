import React from 'react';
import { AppWindow, FolderOpen, Globe, RefreshCw } from 'lucide-react';
import { SettingsSection } from './SettingsSection';

interface UpdateCheckUiState {
    checkedAt: number;
    result: AppUpdateCheckResult;
}

interface MaintenanceSettingsTabProps {
    isLoadingBundledReleaseNotes: boolean;
    bundledReleaseNotesState: AppBundledReleaseNotesResult | null;
    isCheckingForUpdates: boolean;
    updateCheckState: UpdateCheckUiState | null;
    onCheckForUpdates: () => void;
    isDownloadingUpdateZip: boolean;
    updateDownloadState: AppUpdateDownloadResult | null;
    onDownloadLatestUpdateZip: () => void;
    onOpenReleasePage: () => void;
    onRevealDownloadedZip: () => void;
    isApplyingUpdate: boolean;
    onApplyUpdateFromZip: () => void;
    onApplyUpdateViaZipDialog: () => void;
}

export const MaintenanceSettingsTab = React.memo(({
    isLoadingBundledReleaseNotes,
    bundledReleaseNotesState,
    isCheckingForUpdates,
    updateCheckState,
    onCheckForUpdates,
    isDownloadingUpdateZip,
    updateDownloadState,
    onDownloadLatestUpdateZip,
    onOpenReleasePage,
    onRevealDownloadedZip,
    isApplyingUpdate,
    onApplyUpdateFromZip,
    onApplyUpdateViaZipDialog,
}: MaintenanceSettingsTabProps) => (
    <div className="px-4 py-4 space-y-6">
        <SettingsSection
            title="このバージョンのリリースノート"
            description="ZIP に同梱された現在インストール済み版のリリースノートを表示します。ネットワーク接続なしでも確認できます。"
            scope="operation"
        >
            <div className="text-xs text-surface-500">
                {bundledReleaseNotesState?.success
                    ? `同梱ファイル: v${bundledReleaseNotesState.version}`
                    : '同梱済みリリースノートを確認します。'}
            </div>
            {isLoadingBundledReleaseNotes ? (
                <div className="mt-2 text-sm text-surface-400">読み込み中...</div>
            ) : bundledReleaseNotesState?.success && bundledReleaseNotesState.content ? (
                <div className="mt-2 rounded border border-surface-700 bg-surface-950/40 p-3">
                    <div className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-sm text-surface-200">
                        {bundledReleaseNotesState.content}
                    </div>
                </div>
            ) : (
                <div className="mt-2 text-sm text-amber-300">
                    {bundledReleaseNotesState?.error ?? '同梱リリースノートを読み込めませんでした。'}
                </div>
            )}
        </SettingsSection>

        <SettingsSection
            title="アプリ内更新"
            description="GitHub Releases の最新版を確認し、検証済み ZIP の取得と update.bat 起動までこの画面から行えます。"
            scope="operation"
        >
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="text-sm font-medium text-surface-200">最新版を確認</div>
                        <p className="text-xs text-surface-500 mt-0.5">
                            現在のバージョンと GitHub Releases の最新リリースを比較します。
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={onCheckForUpdates}
                            disabled={isCheckingForUpdates}
                            className="inline-flex items-center gap-1.5 rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 transition-colors hover:bg-surface-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <RefreshCw size={14} className={isCheckingForUpdates ? 'animate-spin' : ''} />
                            {isCheckingForUpdates ? '確認中...' : '更新を確認'}
                        </button>
                        <button
                            type="button"
                            onClick={onOpenReleasePage}
                            disabled={!updateCheckState?.result.releaseUrl}
                            className="inline-flex items-center gap-1.5 rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 transition-colors hover:bg-surface-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Globe size={14} />
                            リリースページを開く
                        </button>
                    </div>
                </div>

                {updateCheckState && (
                    <div className="mt-3 space-y-1 text-xs">
                        {updateCheckState.result.success ? (
                            <>
                                <div className="text-surface-300">
                                    現在: <span className="text-surface-100">v{updateCheckState.result.currentVersion}</span>
                                    {' / '}
                                    最新: <span className="text-surface-100">v{updateCheckState.result.latestVersion}</span>
                                </div>
                                <div className={updateCheckState.result.hasUpdate ? 'text-amber-300' : 'text-emerald-300'}>
                                    {updateCheckState.result.hasUpdate
                                        ? '更新があります。ZIP取得または手動ZIP指定で適用できます。'
                                        : '最新バージョンです。'}
                                </div>
                                {updateCheckState.result.publishedAt && (
                                    <div className="text-surface-500">
                                        公開日: {new Date(updateCheckState.result.publishedAt).toLocaleString('ja-JP')}
                                    </div>
                                )}
                                {updateCheckState.result.releaseNotes && (
                                    <div className="mt-2 rounded border border-surface-700 bg-surface-950/40 p-2">
                                        <div className="text-surface-300">更新内容（最新リリース）</div>
                                        <div className="mt-1 max-h-36 overflow-y-auto whitespace-pre-wrap break-words text-surface-200">
                                            {updateCheckState.result.releaseNotes}
                                        </div>
                                    </div>
                                )}
                                {updateCheckState.result.releaseUrl && (
                                    <div className="text-surface-500 break-all">
                                        リリースURL: {updateCheckState.result.releaseUrl}
                                    </div>
                                )}
                                {!updateCheckState.result.downloadUrl && updateCheckState.result.hasUpdate && (
                                    <div className="text-amber-300">
                                        自動取得できる ZIP が見つからないため、必要に応じてリリースページから手動で取得してください。
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-red-300">
                                更新確認失敗: {updateCheckState.result.error ?? 'unknown error'}
                            </div>
                        )}
                        <div className="text-surface-500">
                            最終確認: {new Date(updateCheckState.checkedAt).toLocaleString('ja-JP')}
                        </div>
                    </div>
                )}

                {updateCheckState?.result.success && updateCheckState.result.hasUpdate && (
                    <div className="mt-3 space-y-2">
                        <button
                            type="button"
                            onClick={onDownloadLatestUpdateZip}
                            disabled={isDownloadingUpdateZip || !updateCheckState.result.downloadUrl}
                            className="inline-flex items-center gap-1.5 rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 transition-colors hover:bg-surface-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <FolderOpen size={14} />
                            {isDownloadingUpdateZip ? 'ZIP取得中...' : '検証済み更新ZIPを取得'}
                        </button>
                        <p className="text-xs text-surface-500">
                            `.sha256` による検証が通ったZIPのみ取得・適用できます。
                        </p>
                    </div>
                )}

                {updateDownloadState && (
                    <div className="mt-2 space-y-1 text-xs">
                        {updateDownloadState.success ? (
                            <>
                                <div className="text-surface-300">
                                    ダウンロード先: <span className="text-surface-100 break-all">{updateDownloadState.filePath}</span>
                                </div>
                                {typeof updateDownloadState.verified === 'boolean' && (
                                    <div className={updateDownloadState.verified ? 'text-emerald-300' : 'text-red-300'}>
                                        ハッシュ検証: {updateDownloadState.verified ? '一致' : '不一致'}
                                    </div>
                                )}
                                <div className="pt-1">
                                    <button
                                        type="button"
                                        onClick={onRevealDownloadedZip}
                                        className="inline-flex items-center gap-1.5 rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 transition-colors hover:bg-surface-700"
                                    >
                                        <FolderOpen size={14} />
                                        保存先を開く
                                    </button>
                                </div>
                                <div className="pt-1">
                                    <button
                                        type="button"
                                        onClick={onApplyUpdateFromZip}
                                        disabled={isApplyingUpdate || updateDownloadState.verified !== true}
                                        className="inline-flex items-center gap-1.5 rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 transition-colors hover:bg-surface-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <AppWindow size={14} />
                                        {isApplyingUpdate ? '適用起動中...' : 'update.bat で適用'}
                                    </button>
                                </div>
                                {updateDownloadState.verified !== true && (
                                    <div className="text-amber-300">
                                        ハッシュ検証済みのZIPのみ適用できます。
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-red-300">
                                ZIP取得失敗: {updateDownloadState.error ?? 'unknown error'}
                            </div>
                        )}
                    </div>
                )}
        </SettingsSection>

        <SettingsSection
            title="手動 ZIP 適用"
            description="手元のリリース ZIP を使って update.bat を起動する従来方式です。ネットワーク制限時や手動配布時の fallback として使います。"
            scope="operation"
        >
                <div className="text-sm font-medium text-surface-200">手動ZIP指定（従来方式）</div>
                <div className="mt-2">
                    <button
                        type="button"
                        onClick={onApplyUpdateViaZipDialog}
                        disabled={isApplyingUpdate}
                        className="inline-flex items-center gap-1.5 rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 transition-colors hover:bg-surface-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <FolderOpen size={14} />
                        {isApplyingUpdate ? '起動中...' : 'ZIPを選んで適用（従来方式）'}
                    </button>
                </div>
                <p className="mt-1 text-xs text-surface-500">
                    `update.bat` のZIP選択ダイアログから、手元のリリースZIPを指定して更新できます。
                </p>
        </SettingsSection>
    </div>
));

MaintenanceSettingsTab.displayName = 'MaintenanceSettingsTab';
