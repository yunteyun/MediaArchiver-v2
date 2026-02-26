import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export type AddFolderScanSettingsSubmit = {
    autoScan: boolean;
    watchNewFiles: boolean;
    fileTypeFilters: {
        video: boolean;
        image: boolean;
        archive: boolean;
        audio: boolean;
    };
    startScanNow: boolean;
};

interface AddFolderScanSettingsDialogProps {
    isOpen: boolean;
    folderPath: string | null;
    onClose: () => void;
    onSubmit: (settings: AddFolderScanSettingsSubmit) => void;
}

const DEFAULT_STATE: AddFolderScanSettingsSubmit = {
    autoScan: false,
    watchNewFiles: false,
    fileTypeFilters: {
        video: true,
        image: true,
        archive: true,
        audio: true,
    },
    startScanNow: true,
};

export const AddFolderScanSettingsDialog = React.memo(({
    isOpen,
    folderPath,
    onClose,
    onSubmit
}: AddFolderScanSettingsDialogProps) => {
    const [state, setState] = useState<AddFolderScanSettingsSubmit>(DEFAULT_STATE);

    useEffect(() => {
        if (!isOpen) return;
        setState(DEFAULT_STATE);
    }, [isOpen, folderPath]);

    if (!isOpen || !folderPath) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-[620px] max-w-[calc(100vw-2rem)] rounded-xl border border-surface-700 bg-surface-900 shadow-xl">
                <div className="flex items-center justify-between border-b border-surface-700 px-4 py-3">
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-white">フォルダ登録時のスキャン設定</h2>
                        <p className="mt-0.5 truncate text-xs text-surface-400" title={folderPath}>{folderPath}</p>
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
                    <div className="rounded border border-surface-700 bg-surface-900/40 p-3">
                        <div className="mb-2 text-sm font-medium text-surface-200">標準設定</div>
                        <div className="text-xs text-surface-500">
                            起動時スキャン: OFF / 起動中新規ファイルスキャン: OFF / ファイルタイプ: すべてON
                        </div>
                    </div>

                    <div className="rounded border border-surface-700 bg-surface-900/40 p-3 space-y-3">
                        <div className="text-sm font-medium text-surface-200">自動スキャン</div>

                        <label className="flex cursor-pointer items-start gap-3">
                            <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 accent-primary-500"
                                checked={state.autoScan}
                                onChange={(e) => setState(prev => ({ ...prev, autoScan: e.target.checked }))}
                            />
                            <div>
                                <div className="text-sm text-surface-200">起動時スキャン</div>
                                <div className="text-xs text-surface-500">アプリ起動時にこのフォルダをスキャン対象にする</div>
                            </div>
                        </label>

                        <label className="flex cursor-pointer items-start gap-3">
                            <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 accent-primary-500"
                                checked={state.watchNewFiles}
                                onChange={(e) => setState(prev => ({ ...prev, watchNewFiles: e.target.checked }))}
                            />
                            <div>
                                <div className="text-sm text-surface-200">起動中新規ファイルスキャン</div>
                                <div className="text-xs text-surface-500">フォルダ変更を監視し、追加/更新時に再スキャンする</div>
                            </div>
                        </label>
                    </div>

                    <div className="rounded border border-surface-700 bg-surface-900/40 p-3">
                        <div className="mb-2 text-sm font-medium text-surface-200">対象ファイルタイプ</div>
                        <div className="grid grid-cols-2 gap-2">
                            {([
                                ['video', '動画'],
                                ['image', '画像'],
                                ['archive', '書庫'],
                                ['audio', '音声'],
                            ] as const).map(([key, label]) => (
                                <label key={key} className="flex cursor-pointer items-center justify-between rounded border border-surface-700 px-3 py-2 text-sm text-surface-200">
                                    <span>{label}</span>
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 accent-primary-500"
                                        checked={state.fileTypeFilters[key]}
                                        onChange={(e) => setState(prev => ({
                                            ...prev,
                                            fileTypeFilters: { ...prev.fileTypeFilters, [key]: e.target.checked }
                                        }))}
                                    />
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="rounded border border-surface-700 bg-surface-900/40 p-3">
                        <label className="flex cursor-pointer items-center gap-3">
                            <input
                                type="checkbox"
                                className="h-4 w-4 accent-primary-500"
                                checked={state.startScanNow}
                                onChange={(e) => setState(prev => ({ ...prev, startScanNow: e.target.checked }))}
                            />
                            <div>
                                <div className="text-sm text-surface-200">登録後にすぐスキャン開始</div>
                                <div className="text-xs text-surface-500">OFF の場合は登録のみ行います</div>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-surface-700 px-4 py-3">
                    <button
                        onClick={onClose}
                        className="rounded bg-surface-700 px-4 py-2 text-sm text-surface-200 transition-colors hover:bg-surface-600"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={() => onSubmit(state)}
                        className="rounded bg-primary-600 px-4 py-2 text-sm text-white transition-colors hover:bg-primary-500"
                    >
                        登録
                    </button>
                </div>
            </div>
        </div>
    );
});

AddFolderScanSettingsDialog.displayName = 'AddFolderScanSettingsDialog';
