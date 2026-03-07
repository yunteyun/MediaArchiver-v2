import React from 'react';
import { Settings } from 'lucide-react';
import type { FileTypeCategoryFilters } from '../../stores/useSettingsStore';

interface ScanSettingsTabProps {
    activeProfileLabel: string;
    profileFileTypeFilters: FileTypeCategoryFilters;
    onProfileFileTypeToggle: (
        category: keyof FileTypeCategoryFilters,
        checked: boolean
    ) => void;
    onOpenFolderScanSettingsManager: () => void;
    scanThrottleMs: number;
    onProfileScanThrottleMsChange: (ms: number) => void;
}

const FILE_TYPE_ITEMS: Array<{
    key: keyof FileTypeCategoryFilters;
    label: string;
    hint: string;
}> = [
    { key: 'video', label: '動画', hint: '.mp4 / .mkv / .webm' },
    { key: 'image', label: '画像', hint: '.jpg / .png / .webp' },
    { key: 'archive', label: '書庫', hint: '.zip / .cbz / .7z' },
    { key: 'audio', label: '音声', hint: '.mp3 / .flac / .m4a' },
];

export const ScanSettingsTab = React.memo(({
    activeProfileLabel,
    profileFileTypeFilters,
    onProfileFileTypeToggle,
    onOpenFolderScanSettingsManager,
    scanThrottleMs,
    onProfileScanThrottleMsChange,
}: ScanSettingsTabProps) => (
    <div className="px-4 py-4 space-y-6">
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2">
                スキャン設定
            </h3>

            <div className="space-y-4 rounded-lg border border-primary-900/40 bg-primary-950/10 p-3">
                <div>
                    <h4 className="text-sm font-medium text-primary-200">
                        プロファイル別スキャン設定
                    </h4>
                    <p className="text-xs text-surface-400 mt-1">
                        この設定は現在のプロファイルにのみ適用されます。
                    </p>
                    <p className="text-xs text-surface-500 mt-1">
                        対象: <span className="text-surface-300">{activeProfileLabel}</span>
                    </p>
                </div>

                <div className="rounded border border-surface-700 bg-surface-900/40 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="text-sm font-medium text-surface-200">フォルダ別スキャン設定（一覧管理）</div>
                            <div className="text-xs text-surface-500 mt-0.5">
                                起動時スキャン / 起動中新規ファイルスキャン / 対象カテゴリを登録フォルダ一覧で確認・編集します。
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onOpenFolderScanSettingsManager}
                            className="inline-flex items-center justify-center gap-1.5 rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 transition-colors hover:bg-surface-700"
                        >
                            <Settings size={15} />
                            一覧を開く
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-surface-300 mb-2">
                        対応形式（カテゴリON/OFF）
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {FILE_TYPE_ITEMS.map((item) => (
                            <label
                                key={item.key}
                                className="flex items-center justify-between gap-3 rounded border border-surface-700 bg-surface-900/60 px-3 py-2 cursor-pointer hover:border-surface-600"
                            >
                                <div className="min-w-0">
                                    <div className="text-sm text-surface-200">{item.label}</div>
                                    <div className="text-[11px] text-surface-500 truncate">{item.hint}</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={profileFileTypeFilters[item.key]}
                                    onChange={(e) => onProfileFileTypeToggle(item.key, e.target.checked)}
                                    className="w-4 h-4 accent-primary-500 rounded shrink-0"
                                />
                            </label>
                        ))}
                    </div>
                    <p className="text-xs text-surface-500 mt-2">
                        OFFにしたカテゴリは新規スキャン対象外になります。既に登録済みの対象は再スキャン時に一覧/DBから整理されます（元ファイルは削除しません）。
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-surface-300 mb-2">
                        スキャン速度調整（プロファイル別 / コイル鳴き対策）
                    </label>
                    <select
                        value={scanThrottleMs}
                        onChange={(e) => onProfileScanThrottleMsChange(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded text-surface-200 focus:outline-none focus:border-primary-500"
                    >
                        <option value="0">通常速度（推奨）</option>
                        <option value="50">少し遅く（軽度の対策）</option>
                        <option value="100">遅く（中程度の対策）</option>
                        <option value="200">かなり遅く（重度の対策）</option>
                    </select>
                    <p className="text-xs text-surface-500 mt-1">
                        プレビュー生成時のファイル間待機時間を調整します。PCから異音がする場合に設定してください。
                    </p>
                </div>
            </div>

            <div className="rounded border border-surface-800 bg-surface-900/50 p-3">
                <p className="text-xs text-surface-400">
                    `プレビューフレーム数` はサムネイルタブにあります（プロファイル別設定）。
                </p>
            </div>
        </div>
    </div>
));

ScanSettingsTab.displayName = 'ScanSettingsTab';
