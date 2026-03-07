import React from 'react';
import { AppWindow, FolderOpen, RefreshCw } from 'lucide-react';
import type { FileCardTagOrderMode, TagDisplayStyle, TagPopoverTrigger } from '../../stores/useSettingsStore';
import {
    LIGHTBOX_OVERLAY_OPACITY_MAX,
    LIGHTBOX_OVERLAY_OPACITY_MIN,
    LIGHTBOX_OVERLAY_OPACITY_STEP,
} from '../../features/lightbox-clean/constants';

interface UpdateCheckUiState {
    checkedAt: number;
    result: AppUpdateCheckResult;
}

interface GeneralSettingsTabProps {
    videoVolume: number;
    onVideoVolumeChange: (value: number) => void;
    audioVolume: number;
    onAudioVolumeChange: (value: number) => void;
    lightboxOverlayOpacity: number;
    onLightboxOverlayOpacityChange: (value: number) => void;
    performanceMode: boolean;
    onPerformanceModeChange: (checked: boolean) => void;
    isCheckingForUpdates: boolean;
    updateCheckState: UpdateCheckUiState | null;
    onCheckForUpdates: () => void;
    isDownloadingUpdateZip: boolean;
    updateDownloadState: AppUpdateDownloadResult | null;
    onDownloadLatestUpdateZip: () => void;
    isApplyingUpdate: boolean;
    onApplyUpdateFromZip: () => void;
    onApplyUpdateViaZipDialog: () => void;
    showFileName: boolean;
    onShowFileNameChange: (checked: boolean) => void;
    showDuration: boolean;
    onShowDurationChange: (checked: boolean) => void;
    showTags: boolean;
    onShowTagsChange: (checked: boolean) => void;
    tagPopoverTrigger: TagPopoverTrigger;
    onTagPopoverTriggerChange: (value: TagPopoverTrigger) => void;
    tagDisplayStyle: TagDisplayStyle;
    onTagDisplayStyleChange: (value: TagDisplayStyle) => void;
    fileCardTagOrderMode: FileCardTagOrderMode;
    onFileCardTagOrderModeChange: (value: FileCardTagOrderMode) => void;
    showFileSize: boolean;
    onShowFileSizeChange: (checked: boolean) => void;
}

export const GeneralSettingsTab = React.memo(({
    videoVolume,
    onVideoVolumeChange,
    audioVolume,
    onAudioVolumeChange,
    lightboxOverlayOpacity,
    onLightboxOverlayOpacityChange,
    performanceMode,
    onPerformanceModeChange,
    isCheckingForUpdates,
    updateCheckState,
    isDownloadingUpdateZip,
    updateDownloadState,
    isApplyingUpdate,
    onCheckForUpdates,
    onDownloadLatestUpdateZip,
    onApplyUpdateFromZip,
    onApplyUpdateViaZipDialog,
    showFileName,
    onShowFileNameChange,
    showDuration,
    onShowDurationChange,
    showTags,
    onShowTagsChange,
    tagPopoverTrigger,
    onTagPopoverTriggerChange,
    tagDisplayStyle,
    onTagDisplayStyleChange,
    fileCardTagOrderMode,
    onFileCardTagOrderModeChange,
    showFileSize,
    onShowFileSizeChange,
}: GeneralSettingsTabProps) => (
    <div className="px-4 py-4 space-y-6">
        <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
                動画再生時の音量: {Math.round(videoVolume * 100)}%
            </label>
            <input
                type="range"
                min="0"
                max="100"
                value={Math.round(videoVolume * 100)}
                onChange={(e) => onVideoVolumeChange(Number(e.target.value) / 100)}
                className="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
            <div className="flex justify-between text-xs text-surface-500 mt-1">
                <span>0%</span>
                <span>100%</span>
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
                音声ファイル再生時の音量: {Math.round(audioVolume * 100)}%
            </label>
            <input
                type="range"
                min="0"
                max="100"
                value={Math.round(audioVolume * 100)}
                onChange={(e) => onAudioVolumeChange(Number(e.target.value) / 100)}
                className="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
            <div className="flex justify-between text-xs text-surface-500 mt-1">
                <span>0%</span>
                <span>100%</span>
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
                ライトボックス背景濃度: {lightboxOverlayOpacity}%
            </label>
            <input
                type="range"
                min={LIGHTBOX_OVERLAY_OPACITY_MIN}
                max={LIGHTBOX_OVERLAY_OPACITY_MAX}
                step={LIGHTBOX_OVERLAY_OPACITY_STEP}
                value={lightboxOverlayOpacity}
                onChange={(e) => onLightboxOverlayOpacityChange(Number(e.target.value))}
                className="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
            <div className="flex justify-between text-xs text-surface-500 mt-1">
                <span>{LIGHTBOX_OVERLAY_OPACITY_MIN}%</span>
                <span>{LIGHTBOX_OVERLAY_OPACITY_MAX}%</span>
            </div>
            <p className="mt-1 text-xs text-surface-500">
                画像ライトボックスの背景オーバーレイ濃度を調整します。
            </p>
        </div>

        <div>
            <label className="flex items-center justify-between cursor-pointer">
                <div>
                    <span className="block text-sm font-medium text-surface-300">
                        パフォーマンスモード
                    </span>
                    <span className="block text-xs text-surface-500 mt-0.5">
                        ホバーアニメーションを無効化して軽くする
                    </span>
                </div>
                <input
                    type="checkbox"
                    checked={performanceMode}
                    onChange={(e) => onPerformanceModeChange(e.target.checked)}
                    className="w-5 h-5 accent-primary-500 rounded"
                />
            </label>
        </div>

        <div className="rounded border border-surface-700 bg-surface-900/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="text-sm font-medium text-surface-200">更新確認（PoC）</div>
                    <p className="text-xs text-surface-500 mt-0.5">
                        最新版を手動で確認します（適用は従来どおり `update.bat`）。
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
                                    ? '更新があります。適用は update.bat を利用してください。'
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

            <div className="mt-3 rounded border border-surface-700 bg-surface-950/40 p-2">
                <div className="text-xs text-surface-300">手動ZIP指定（従来方式）</div>
                <div className="mt-1">
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

        <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
                表示項目
            </label>
            <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showFileName}
                        onChange={(e) => onShowFileNameChange(e.target.checked)}
                        className="w-4 h-4 accent-primary-500 rounded"
                    />
                    <span className="text-surface-200 text-sm">ファイル名</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showDuration}
                        onChange={(e) => onShowDurationChange(e.target.checked)}
                        className="w-4 h-4 accent-primary-500 rounded"
                    />
                    <span className="text-surface-200 text-sm">再生時間</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showTags}
                        onChange={(e) => onShowTagsChange(e.target.checked)}
                        className="w-4 h-4 accent-primary-500 rounded"
                    />
                    <span className="text-surface-200 text-sm">タグ</span>
                </label>
                {showTags && (
                    <div className="ml-6 mt-1">
                        <label className="block text-xs text-surface-400 mb-1">タグポップオーバー表示</label>
                        <select
                            value={tagPopoverTrigger}
                            onChange={(e) => onTagPopoverTriggerChange(e.target.value as TagPopoverTrigger)}
                            className="w-full px-2 py-1 text-xs bg-surface-800 border border-surface-600 rounded text-surface-200 focus:outline-none focus:border-primary-500"
                        >
                            <option value="click">クリック</option>
                            <option value="hover">ホバー</option>
                        </select>
                    </div>
                )}
                {showTags && (
                    <div className="ml-6 mt-1">
                        <label className="block text-xs text-surface-400 mb-1">タグ表示スタイル</label>
                        <select
                            value={tagDisplayStyle}
                            onChange={(e) => onTagDisplayStyleChange(e.target.value as TagDisplayStyle)}
                            className="w-full px-2 py-1 text-xs bg-surface-800 border border-surface-600 rounded text-surface-200 focus:outline-none focus:border-primary-500"
                        >
                            <option value="filled">塗りつぶし（フル背景色）</option>
                            <option value="border">左端ライン（ダーク背景）</option>
                        </select>
                    </div>
                )}
                {showTags && (
                    <div className="ml-6 mt-1">
                        <label className="block text-xs text-surface-400 mb-1">ファイルカード要約タグの並び</label>
                        <select
                            value={fileCardTagOrderMode}
                            onChange={(e) => onFileCardTagOrderModeChange(e.target.value as FileCardTagOrderMode)}
                            className="w-full px-2 py-1 text-xs bg-surface-800 border border-surface-600 rounded text-surface-200 focus:outline-none focus:border-primary-500"
                        >
                            <option value="balanced">カテゴリ分散（カテゴリ偏りを抑える）</option>
                            <option value="strict">厳密順（カテゴリ順→タグ順）</option>
                        </select>
                        <p className="mt-1 text-[11px] text-surface-500">
                            ファイルカードの省略タグ表示（3件表示など）にのみ適用されます。
                        </p>
                    </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showFileSize}
                        onChange={(e) => onShowFileSizeChange(e.target.checked)}
                        className="w-4 h-4 accent-primary-500 rounded"
                    />
                    <span className="text-surface-200 text-sm">ファイルサイズ</span>
                </label>
            </div>
        </div>
    </div>
));

GeneralSettingsTab.displayName = 'GeneralSettingsTab';
