import React from 'react';
import { FolderOpen, RefreshCw } from 'lucide-react';
import type { FileCardTagOrderMode, TagDisplayStyle, TagPopoverTrigger } from '../../stores/useSettingsStore';
import {
    LIGHTBOX_OVERLAY_OPACITY_MAX,
    LIGHTBOX_OVERLAY_OPACITY_MIN,
    LIGHTBOX_OVERLAY_OPACITY_STEP,
} from '../../features/lightbox-clean/constants';

interface GeneralSettingsTabProps {
    videoVolume: number;
    onVideoVolumeChange: (value: number) => void;
    audioVolume: number;
    onAudioVolumeChange: (value: number) => void;
    lightboxOverlayOpacity: number;
    onLightboxOverlayOpacityChange: (value: number) => void;
    performanceMode: boolean;
    onPerformanceModeChange: (checked: boolean) => void;
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
    displayPresetDirectory: string | null;
    displayPresetCount: number;
    displayPresetWarnings: string[];
    onOpenDisplayPresetFolder: () => void;
    isReloadingDisplayPresets: boolean;
    onReloadDisplayPresets: () => void;
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
    displayPresetDirectory,
    displayPresetCount,
    displayPresetWarnings,
    onOpenDisplayPresetFolder,
    isReloadingDisplayPresets,
    onReloadDisplayPresets,
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
                    <div className="text-sm font-medium text-surface-200">表示プリセット</div>
                    <p className="text-xs text-surface-500 mt-0.5">
                        外部 JSON を配置して、一覧カードの表示プリセットを追加できます。
                    </p>
                    <p className="mt-1 text-[11px] text-surface-400">
                        読込済み: {displayPresetCount} 件
                    </p>
                    {displayPresetDirectory && (
                        <p className="mt-1 break-all text-[11px] text-surface-500">
                            保存先: {displayPresetDirectory}
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={onReloadDisplayPresets}
                        disabled={isReloadingDisplayPresets}
                        className="inline-flex items-center gap-1.5 rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 transition-colors hover:bg-surface-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw size={14} className={isReloadingDisplayPresets ? 'animate-spin' : ''} />
                        {isReloadingDisplayPresets ? '再読込中...' : '再読込'}
                    </button>
                    <button
                        type="button"
                        onClick={onOpenDisplayPresetFolder}
                        className="inline-flex items-center gap-1.5 rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 transition-colors hover:bg-surface-700"
                    >
                        <FolderOpen size={14} />
                        表示プリセットフォルダを開く
                    </button>
                </div>
            </div>
            {displayPresetWarnings.length > 0 && (
                <div className="mt-3 rounded border border-amber-700/50 bg-amber-950/20 p-3">
                    <div className="text-sm font-medium text-amber-200">
                        読み込み警告 ({displayPresetWarnings.length})
                    </div>
                    <div className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-amber-100/90">
                        {displayPresetWarnings.map((warning) => (
                            <div key={warning}>{warning}</div>
                        ))}
                    </div>
                </div>
            )}
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
