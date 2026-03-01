import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { MediaFolder } from '../types/file';
import { useUIStore } from '../stores/useUIStore';
import { useSettingsStore } from '../stores/useSettingsStore';

type FileTypeCategoryKey = 'video' | 'image' | 'archive' | 'audio';

type FileTypeOverridesState = Record<FileTypeCategoryKey, boolean>;

function parseFolderFileTypeOverrides(folder: MediaFolder | null): Partial<Record<FileTypeCategoryKey, boolean>> {
    if (!folder) return {};
    const raw = folder.scan_settings_json ?? folder.scanSettingsJson;
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        const overrides = parsed?.fileTypeOverrides;
        if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return {};
        const result: Partial<Record<FileTypeCategoryKey, boolean>> = {};
        for (const key of ['video', 'image', 'archive', 'audio'] as const) {
            if (typeof (overrides as Record<string, unknown>)[key] === 'boolean') {
                result[key] = Boolean((overrides as Record<string, unknown>)[key]);
            }
        }
        return result;
    } catch {
        return {};
    }
}

interface FolderAutoScanSettingsDialogProps {
    isOpen: boolean;
    folder: MediaFolder | null;
    onClose: () => void;
    onSaved?: () => void;
}

export const FolderAutoScanSettingsDialog = React.memo(({
    isOpen,
    folder,
    onClose,
    onSaved
}: FolderAutoScanSettingsDialogProps) => {
    const [autoScanEnabled, setAutoScanEnabled] = useState(false);
    const [watchNewFilesEnabled, setWatchNewFilesEnabled] = useState(false);
    const profileFileTypeFilters = useSettingsStore((s) => s.profileFileTypeFilters);
    const [fileTypeOverrides, setFileTypeOverrides] = useState<FileTypeOverridesState>({
        video: true,
        image: true,
        archive: true,
        audio: true,
    });
    const [hasFileTypeOverrides, setHasFileTypeOverrides] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!folder) return;
        setAutoScanEnabled((folder.auto_scan ?? folder.autoScan ?? 0) === 1);
        setWatchNewFilesEnabled((folder.watch_new_files ?? folder.watchNewFiles ?? 0) === 1);
        const overrides = parseFolderFileTypeOverrides(folder);
        setFileTypeOverrides({
            video: overrides.video ?? profileFileTypeFilters.video,
            image: overrides.image ?? profileFileTypeFilters.image,
            archive: overrides.archive ?? profileFileTypeFilters.archive,
            audio: overrides.audio ?? profileFileTypeFilters.audio,
        });
        setHasFileTypeOverrides(Object.keys(overrides).length > 0);
    }, [folder, profileFileTypeFilters]);

    if (!isOpen || !folder) return null;

    const handleSave = async () => {
        setSaving(true);
        try {
            await Promise.all([
                window.electronAPI.setFolderAutoScan(folder.id, autoScanEnabled),
                window.electronAPI.setFolderWatchNewFiles(folder.id, watchNewFilesEnabled),
                window.electronAPI.setFolderScanFileTypeOverrides(folder.id, {
                    video: fileTypeOverrides.video === profileFileTypeFilters.video ? null : fileTypeOverrides.video,
                    image: fileTypeOverrides.image === profileFileTypeFilters.image ? null : fileTypeOverrides.image,
                    archive: fileTypeOverrides.archive === profileFileTypeFilters.archive ? null : fileTypeOverrides.archive,
                    audio: fileTypeOverrides.audio === profileFileTypeFilters.audio ? null : fileTypeOverrides.audio,
                }),
            ]);
            useUIStore.getState().showToast('フォルダ別自動スキャン設定を保存しました', 'success');
            onSaved?.();
            onClose();
        } catch (e) {
            console.error('Failed to save folder auto scan settings:', e);
            useUIStore.getState().showToast('フォルダ別自動スキャン設定の保存に失敗しました', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-[560px] max-w-[calc(100vw-2rem)] rounded-xl border border-surface-700 bg-surface-900 shadow-xl">
                <div className="flex items-center justify-between border-b border-surface-700 px-4 py-3">
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-white">フォルダ別 自動スキャン設定</h2>
                        <p className="mt-0.5 truncate text-xs text-surface-400" title={folder.path}>{folder.path}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded p-1 text-surface-300 hover:bg-surface-800 hover:text-white transition-colors"
                        aria-label="閉じる"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4 px-4 py-4">
                    <div className="rounded-lg border border-surface-700 bg-surface-900/50 p-3">
                        <div className="text-sm font-medium text-surface-200">スキャン実行タイミング</div>
                        <div className="mt-3 space-y-3">
                            <label className="flex cursor-pointer items-start gap-3">
                                <input
                                    type="checkbox"
                                    className="mt-0.5 h-4 w-4 accent-primary-500"
                                    checked={autoScanEnabled}
                                    onChange={(e) => setAutoScanEnabled(e.target.checked)}
                                />
                                <div>
                                    <div className="text-sm text-surface-200">起動時スキャン</div>
                                    <div className="text-xs text-surface-500">
                                        アプリ起動時に、このフォルダを対象にスキャンします。
                                    </div>
                                </div>
                            </label>

                            <label className="flex cursor-pointer items-start gap-3">
                                <input
                                    type="checkbox"
                                    className="mt-0.5 h-4 w-4 accent-primary-500"
                                    checked={watchNewFilesEnabled}
                                    onChange={(e) => setWatchNewFilesEnabled(e.target.checked)}
                                />
                                <div>
                                    <div className="text-sm text-surface-200">起動中新規ファイルスキャン</div>
                                    <div className="text-xs text-surface-500">
                                        フォルダ変更を監視し、追加/更新を検知したらデバウンス後に再スキャンします（MVP）。
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="rounded-lg border border-surface-700 bg-surface-900/50 p-3">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <div className="text-sm font-medium text-surface-200">スキャン対象カテゴリ（このフォルダ）</div>
                                <div className="text-xs text-surface-500">
                                    プロファイル既定を初期値として表示。変更した値のみフォルダ別設定として保存します。
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setFileTypeOverrides({
                                        video: profileFileTypeFilters.video,
                                        image: profileFileTypeFilters.image,
                                        archive: profileFileTypeFilters.archive,
                                        audio: profileFileTypeFilters.audio,
                                    });
                                    setHasFileTypeOverrides(false);
                                }}
                                className="rounded border border-surface-700 px-2 py-1 text-xs text-surface-300 hover:bg-surface-800 transition-colors"
                            >
                                既定に戻す
                            </button>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                            {([
                                ['video', '動画'],
                                ['image', '画像'],
                                ['archive', '書庫'],
                                ['audio', '音声'],
                            ] as [FileTypeCategoryKey, string][]).map(([key, label]) => {
                                const differs = fileTypeOverrides[key] !== profileFileTypeFilters[key];
                                return (
                                    <label
                                        key={key}
                                        className={`flex cursor-pointer items-start gap-2 rounded border px-2 py-2 transition-colors ${differs ? 'border-amber-700/60 bg-amber-900/10' : 'border-surface-700 bg-surface-900/30'}`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="mt-0.5 h-4 w-4 accent-primary-500"
                                            checked={fileTypeOverrides[key]}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setFileTypeOverrides(prev => ({ ...prev, [key]: checked }));
                                                setHasFileTypeOverrides(true);
                                            }}
                                        />
                                        <div className="min-w-0">
                                            <div className="text-sm text-surface-200">{label}</div>
                                            <div className="text-[11px] text-surface-500">
                                                既定: {profileFileTypeFilters[key] ? 'ON' : 'OFF'}
                                                {differs ? ' / このフォルダ: 変更あり' : ''}
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                        {!hasFileTypeOverrides && (
                            <div className="mt-2 text-xs text-surface-500">
                                現在はプロファイル既定を使用しています。
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-surface-700 px-4 py-3">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="rounded bg-surface-700 px-4 py-2 text-sm text-surface-200 transition-colors hover:bg-surface-600 disabled:opacity-60"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={() => { void handleSave(); }}
                        disabled={saving}
                        className="rounded bg-primary-600 px-4 py-2 text-sm text-white transition-colors hover:bg-primary-500 disabled:opacity-60"
                    >
                        {saving ? '保存中...' : '保存'}
                    </button>
                </div>
            </div>
        </div>
    );
});

FolderAutoScanSettingsDialog.displayName = 'FolderAutoScanSettingsDialog';
