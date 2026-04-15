import React, { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import {
    excludedSubdirectoriesToText,
    parseExcludedSubdirectoriesText,
} from '../shared/folderScanSettings';
import { Dialog } from './ui/Dialog';

export type AddFolderScanSettingsSubmit = {
    autoScan: boolean;
    watchNewFiles: boolean;
    fileTypeFilters: {
        video: boolean;
        image: boolean;
        archive: boolean;
        audio: boolean;
    };
    excludedSubdirectories: string[];
    selectedSubfolderPaths: string[];
    shallowScan: boolean;
    startScanNow: boolean;
};

type SubfolderMode = 'include' | 'shallow' | 'register';

interface AddFolderScanSettingsDialogProps {
    isOpen: boolean;
    folderPath: string | null;
    onClose: () => void;
    onSubmit: (settings: AddFolderScanSettingsSubmit) => void;
    onFetchSubfolders: (folderPath: string) => Promise<string[]>;
}

const DEFAULT_STATE = {
    autoScan: false,
    watchNewFiles: false,
    fileTypeFilters: {
        video: true,
        image: true,
        archive: true,
        audio: true,
    },
    excludedSubdirectories: [] as string[],
    startScanNow: true,
};

const SUBFOLDER_OPTIONS: { value: SubfolderMode; label: string; description: string }[] = [
    {
        value: 'include',
        label: 'サブフォルダ内も含めてスキャンする',
        description: 'サブフォルダ内のファイルもすべてスキャン対象にする',
    },
    {
        value: 'shallow',
        label: '直下のファイルのみスキャンする',
        description: 'このフォルダ直下のファイルのみ対象にし、サブフォルダは除外する',
    },
    {
        value: 'register',
        label: 'サブフォルダを個別に登録する',
        description: '配下のサブフォルダを独立したフォルダとして個別に登録する',
    },
];

export const AddFolderScanSettingsDialog = React.memo(({
    isOpen,
    folderPath,
    onClose,
    onSubmit,
    onFetchSubfolders,
}: AddFolderScanSettingsDialogProps) => {
    const [state, setState] = useState(DEFAULT_STATE);
    const [excludedSubdirectoriesText, setExcludedSubdirectoriesText] = useState('');
    const [subfolderMode, setSubfolderMode] = useState<SubfolderMode>('include');
    const [subfolderPaths, setSubfolderPaths] = useState<string[]>([]);
    const [checkedSubfolders, setCheckedSubfolders] = useState<Set<string>>(new Set());
    const [subfolderLoading, setSubfolderLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setState(DEFAULT_STATE);
        setExcludedSubdirectoriesText(excludedSubdirectoriesToText(DEFAULT_STATE.excludedSubdirectories));
        setSubfolderMode('include');
        setSubfolderPaths([]);
        setCheckedSubfolders(new Set());
        setSubfolderLoading(false);
    }, [isOpen, folderPath]);

    const handleSubfolderModeChange = async (mode: SubfolderMode) => {
        setSubfolderMode(mode);
        if (mode === 'register' && folderPath) {
            setSubfolderLoading(true);
            try {
                const paths = await onFetchSubfolders(folderPath);
                setSubfolderPaths(paths);
                setCheckedSubfolders(new Set(paths));
            } finally {
                setSubfolderLoading(false);
            }
        } else {
            setSubfolderPaths([]);
            setCheckedSubfolders(new Set());
        }
    };

    const toggleSubfolder = (p: string) => {
        setCheckedSubfolders(prev => {
            const next = new Set(prev);
            if (next.has(p)) {
                next.delete(p);
            } else {
                next.add(p);
            }
            return next;
        });
    };

    const toggleAll = (checked: boolean) => {
        setCheckedSubfolders(checked ? new Set(subfolderPaths) : new Set());
    };

    const allChecked = subfolderPaths.length > 0 && checkedSubfolders.size === subfolderPaths.length;
    const someChecked = checkedSubfolders.size > 0 && checkedSubfolders.size < subfolderPaths.length;

    if (!folderPath) return null;

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            className="w-[620px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-4rem)]"
        >
            <Dialog.Header>
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
            </Dialog.Header>

            <Dialog.Body className="space-y-4 px-4 py-4">
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

                    <div className="rounded border border-surface-700 bg-surface-900/40 p-3 space-y-2">
                        <div className="text-sm font-medium text-surface-200">サブフォルダの扱い</div>
                        {SUBFOLDER_OPTIONS.map((opt) => (
                            <label key={opt.value} className="flex cursor-pointer items-start gap-3">
                                <input
                                    type="radio"
                                    name="subfolderMode"
                                    className="mt-0.5 h-4 w-4 accent-primary-500"
                                    checked={subfolderMode === opt.value}
                                    onChange={() => void handleSubfolderModeChange(opt.value)}
                                />
                                <div>
                                    <div className="text-sm text-surface-200">{opt.label}</div>
                                    <div className="text-xs text-surface-500">{opt.description}</div>
                                </div>
                            </label>
                        ))}

                        {subfolderMode === 'register' && (
                            <div className="mt-2 ml-7">
                                {subfolderLoading ? (
                                    <div className="flex items-center gap-2 py-2 text-xs text-surface-400">
                                        <Loader2 size={14} className="animate-spin" />
                                        サブフォルダを取得中...
                                    </div>
                                ) : subfolderPaths.length === 0 ? (
                                    <div className="py-2 text-xs text-surface-500">サブフォルダが見つかりませんでした</div>
                                ) : (
                                    <>
                                        <div className="mb-2 flex items-center justify-between">
                                            <label className="flex cursor-pointer items-center gap-2 text-xs text-surface-400">
                                                <input
                                                    type="checkbox"
                                                    className="h-3.5 w-3.5 accent-primary-500"
                                                    checked={allChecked}
                                                    ref={(el) => { if (el) el.indeterminate = someChecked; }}
                                                    onChange={(e) => toggleAll(e.target.checked)}
                                                />
                                                すべて選択（{checkedSubfolders.size} / {subfolderPaths.length}）
                                            </label>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto rounded border border-surface-700 bg-surface-950">
                                            {subfolderPaths.map((p) => (
                                                <label
                                                    key={p}
                                                    className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-surface-800 transition-colors"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="h-3.5 w-3.5 shrink-0 accent-primary-500"
                                                        checked={checkedSubfolders.has(p)}
                                                        onChange={() => toggleSubfolder(p)}
                                                    />
                                                    <span className="truncate text-xs text-surface-200" title={p}>{p}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
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

                    <div className="rounded border border-surface-700 bg-surface-900/40 p-3">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <div className="text-sm font-medium text-surface-200">除外する子フォルダ</div>
                                <div className="text-xs text-surface-500">
                                    ルート直下からの相対パスを1行ずつ入力します。例: `cache` / `temp\\raw`
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setExcludedSubdirectoriesText('')}
                                className="rounded border border-surface-700 px-2 py-1 text-xs text-surface-300 transition-colors hover:bg-surface-800"
                            >
                                クリア
                            </button>
                        </div>
                        <textarea
                            value={excludedSubdirectoriesText}
                            onChange={(e) => setExcludedSubdirectoriesText(e.target.value)}
                            rows={4}
                            placeholder={'cache\ntemp\\raw'}
                            className="mt-3 w-full rounded border border-surface-700 bg-surface-950 px-3 py-2 text-sm text-surface-100 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none"
                        />
                        <div className="mt-2 text-xs text-surface-500">
                            指定した子フォルダとその配下は、この登録フォルダのスキャン対象から外します。
                        </div>
                    </div>
            </Dialog.Body>

            <Dialog.Footer>
                <button
                    onClick={onClose}
                    className="rounded bg-surface-700 px-4 py-2 text-sm text-surface-200 transition-colors hover:bg-surface-600"
                >
                    キャンセル
                </button>
                <button
                    onClick={() => onSubmit({
                        ...state,
                        excludedSubdirectories: parseExcludedSubdirectoriesText(excludedSubdirectoriesText),
                        selectedSubfolderPaths: subfolderMode === 'register' ? [...checkedSubfolders] : [],
                        shallowScan: subfolderMode === 'shallow',
                    })}
                    className="rounded bg-primary-600 px-4 py-2 text-sm text-white transition-colors hover:bg-primary-500"
                >
                    登録
                </button>
            </Dialog.Footer>
        </Dialog>
    );
});

AddFolderScanSettingsDialog.displayName = 'AddFolderScanSettingsDialog';
