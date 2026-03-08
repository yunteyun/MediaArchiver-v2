import React from 'react';
import { AppWindow, FolderOpen, RefreshCw } from 'lucide-react';

interface UpdateCheckUiState {
    checkedAt: number;
    result: AppUpdateCheckResult;
}

interface MaintenanceSettingsTabProps {
    isCheckingForUpdates: boolean;
    updateCheckState: UpdateCheckUiState | null;
    onCheckForUpdates: () => void;
    isDownloadingUpdateZip: boolean;
    updateDownloadState: AppUpdateDownloadResult | null;
    onDownloadLatestUpdateZip: () => void;
    isApplyingUpdate: boolean;
    onApplyUpdateFromZip: () => void;
    onApplyUpdateViaZipDialog: () => void;
}

export const MaintenanceSettingsTab = React.memo(({
    isCheckingForUpdates,
    updateCheckState,
    onCheckForUpdates,
    isDownloadingUpdateZip,
    updateDownloadState,
    onDownloadLatestUpdateZip,
    isApplyingUpdate,
    onApplyUpdateFromZip,
    onApplyUpdateViaZipDialog,
}: MaintenanceSettingsTabProps) => (
    <div className="px-4 py-4 space-y-6">
        <div className="space-y-4">
            <div className="rounded border border-surface-700 bg-surface-900/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="text-sm font-medium text-surface-200">更新確認（PoC）</div>
                        <p className="text-xs text-surface-500 mt-0.5">
                            最新版を手動で確認します。更新適用もこの画面から起動できます。
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCheckForUpdates}
                        disabled={isCheckingForUpdates}
                        className="inline-flex items-center gap-1.5 rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 transition-colors hover:bg-surface-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw size={14} className={isCheckingForUpdates ? 'animate-spin' : ''} />
                        {isCheckingForUpdates ? '確認中...' : '更新を確認'}
                    </button>
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
                            disabled={isDownloadingUpdateZip}
                            className="inline-flex items-center gap-1.5 rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 transition-colors hover:bg-surface-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <FolderOpen size={14} />
                            {isDownloadingUpdateZip ? 'ZIP取得中...' : '更新ZIPを取得（PoC）'}
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
                                        onClick={onApplyUpdateFromZip}
                                        disabled={isApplyingUpdate || updateDownloadState.verified !== true}
                                        className="inline-flex items-center gap-1.5 rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 transition-colors hover:bg-surface-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <AppWindow size={14} />
                                        {isApplyingUpdate ? '適用起動中...' : 'update.bat で適用（PoC）'}
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
            </div>

            <div className="rounded border border-surface-700 bg-surface-950/40 p-3">
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
            </div>
        </div>
    </div>
));

MaintenanceSettingsTab.displayName = 'MaintenanceSettingsTab';
