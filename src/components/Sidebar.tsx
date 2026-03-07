import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Plus, ChevronLeft, ChevronRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useFileStore } from '../stores/useFileStore';
import { useUIStore, type SearchCondition, type SearchTarget } from '../stores/useUIStore';
import { useTagStore } from '../stores/useTagStore';
import { useRatingStore } from '../stores/useRatingStore';
import { useSmartFolderStore } from '../stores/useSmartFolderStore';
import { TagFilterPanel, TagManagerModal } from './tags';
import { RatingFilterPanel } from './ratings/RatingFilterPanel';
import { FolderAutoScanSettingsDialog } from './FolderAutoScanSettingsDialog';
import { FolderScanSettingsManagerDialog } from './FolderScanSettingsManagerDialog';
import { AddFolderScanSettingsDialog, type AddFolderScanSettingsSubmit } from './AddFolderScanSettingsDialog';
import { SmartFolderEditorDialog, type SmartFolderFolderOption } from './SmartFolderEditorDialog';
import { SidebarFolderSection } from './sidebar/SidebarFolderSection';
import { SidebarSmartFoldersSection } from './sidebar/SidebarSmartFoldersSection';
import { SidebarUtilityActions } from './sidebar/SidebarUtilityActions';
import {
    ALL_FILES_ID,
    DRIVE_PREFIX,
    FOLDER_PREFIX,
    VIRTUAL_FOLDER_PREFIX,
    VIRTUAL_FOLDER_RECURSIVE_PREFIX,
} from './sidebar/sidebarShared';
import type { MediaFile, MediaFolder } from '../types/file';
import type { SmartFolderConditionV1 } from '../stores/useSmartFolderStore';

const PROGRESSIVE_REFRESH_DEBOUNCE_MS = 1200;
const ALL_FILE_TYPES: MediaFile['type'][] = ['video', 'image', 'archive', 'audio'];
const FILE_TYPE_LABEL_MAP: Record<MediaFile['type'], string> = {
    video: '動画',
    image: '画像',
    archive: '書庫',
    audio: '音声',
};
const SEARCH_TARGET_LABEL_MAP: Record<SearchTarget, string> = {
    fileName: 'ファイル名',
    folderName: 'フォルダ名',
};

function normalizeFolderPathForCompare(folderPath: string): string {
    return folderPath.replace(/[\\/]+$/, '').toLowerCase();
}

function isSameOrDescendantPath(folderPath: string, ancestorPath: string): boolean {
    const normalizedFolderPath = normalizeFolderPathForCompare(folderPath);
    const normalizedAncestorPath = normalizeFolderPathForCompare(ancestorPath);
    if (normalizedFolderPath === normalizedAncestorPath) return true;
    return normalizedFolderPath.startsWith(`${normalizedAncestorPath}\\`);
}

function getDriveFromPath(folderPath: string): string {
    const match = folderPath.match(/^[A-Z]:/i);
    return match ? match[0].toUpperCase() : '/';
}

function isPerfDebugEnabled(): boolean {
    return import.meta.env.DEV && (globalThis as { __MA_DEBUG_PERF?: boolean }).__MA_DEBUG_PERF === true;
}

function resolveSmartFolderFolderLabel(folderSelection: string | null, folders: MediaFolder[]): string {
    if (!folderSelection || folderSelection === ALL_FILES_ID) return '範囲: すべて';

    if (folderSelection.startsWith(DRIVE_PREFIX)) {
        return `範囲: ${folderSelection.slice(DRIVE_PREFIX.length)} ドライブ`;
    }

    if (folderSelection.startsWith(FOLDER_PREFIX)) {
        const folderId = folderSelection.slice(FOLDER_PREFIX.length);
        const folder = folders.find((item) => item.id === folderId);
        return `範囲: ${folder?.name ?? '登録フォルダ'}`;
    }

    if (folderSelection.startsWith(VIRTUAL_FOLDER_RECURSIVE_PREFIX)) {
        const folderPath = folderSelection.slice(VIRTUAL_FOLDER_RECURSIVE_PREFIX.length);
        const name = folderPath.split(/[\\/]/).filter(Boolean).pop() ?? folderPath;
        return `範囲: ${name} (配下)`;
    }

    if (folderSelection.startsWith(VIRTUAL_FOLDER_PREFIX)) {
        const folderPath = folderSelection.slice(VIRTUAL_FOLDER_PREFIX.length);
        const name = folderPath.split(/[\\/]/).filter(Boolean).pop() ?? folderPath;
        return `範囲: ${name}`;
    }

    const folder = folders.find((item) => item.id === folderSelection);
    return `範囲: ${folder?.name ?? '指定フォルダ'}`;
}

function buildSmartFolderPreviewText(
    condition: SmartFolderConditionV1,
    folders: MediaFolder[]
): string {
    const segments: string[] = [resolveSmartFolderFolderLabel(condition.folderSelection, folders)];

    const normalizedTextConditions = normalizeSmartFolderTextConditionsForCompare(condition);
    if (normalizedTextConditions.length > 0) {
        const labels = normalizedTextConditions
            .slice(0, 2)
            .map((item) => {
                const shortQuery = item.text.length > 12 ? `${item.text.slice(0, 12)}...` : item.text;
                return `${SEARCH_TARGET_LABEL_MAP[item.target] ?? 'ファイル名'}:${shortQuery}`;
            })
            .join(' + ');
        const suffix = normalizedTextConditions.length > 2 ? ` (+${normalizedTextConditions.length - 2})` : '';
        segments.push(`検索: ${labels}${suffix}`);
    }

    if (condition.tags.ids.length > 0) {
        segments.push(`タグ: ${condition.tags.mode} ${condition.tags.ids.length}`);
    }

    const activeRatingCount = Object.values(condition.ratings).filter((range) => {
        return typeof range.min === 'number' || typeof range.max === 'number';
    }).length;
    if (activeRatingCount > 0) {
        segments.push(`評価: ${activeRatingCount}軸`);
    }

    const normalizedTypes = condition.types.filter((type): type is MediaFile['type'] => (
        type === 'video' || type === 'image' || type === 'archive' || type === 'audio'
    ));
    if (normalizedTypes.length > 0 && normalizedTypes.length < ALL_FILE_TYPES.length) {
        const labels = normalizedTypes
            .map((type) => FILE_TYPE_LABEL_MAP[type])
            .filter(Boolean)
            .join('/');
        segments.push(`タイプ: ${labels}`);
    }

    if (segments.length === 1) {
        segments.push('条件: 追加なし');
    }

    return segments.join(' / ');
}

function normalizeSmartFolderSelectionForCompare(folderSelection: string | null): string {
    if (!folderSelection || folderSelection === ALL_FILES_ID) return ALL_FILES_ID;
    return folderSelection;
}

function normalizeSmartFolderTypesForCompare(types: MediaFile['type'][]): MediaFile['type'][] {
    const normalized = Array.from(new Set(
        types.filter((type): type is MediaFile['type'] => (
            type === 'video' || type === 'image' || type === 'archive' || type === 'audio'
        ))
    ));
    const next = normalized.length > 0 ? normalized : [...ALL_FILE_TYPES];
    return next.slice().sort();
}

function normalizeSmartFolderTextConditionsForCompare(condition: SmartFolderConditionV1): SearchCondition[] {
    const raw = Array.isArray(condition.textConditions) ? condition.textConditions : [];
    const normalized = raw
        .map((item) => ({
            text: typeof item?.text === 'string' ? item.text.trim() : '',
            target: item?.target === 'folderName' ? 'folderName' : 'fileName',
        }))
        .filter((item) => item.text.length > 0);

    if (normalized.length > 0) return normalized;

    const legacyText = typeof condition.text === 'string' ? condition.text.trim() : '';
    if (!legacyText) return [];
    return [{ text: legacyText, target: condition.textMatchTarget === 'folderName' ? 'folderName' : 'fileName' }];
}

function isSameSmartFolderCondition(a: SmartFolderConditionV1, b: SmartFolderConditionV1): boolean {
    if (normalizeSmartFolderSelectionForCompare(a.folderSelection) !== normalizeSmartFolderSelectionForCompare(b.folderSelection)) {
        return false;
    }
    const aTextConditions = normalizeSmartFolderTextConditionsForCompare(a)
        .slice()
        .sort((left, right) => `${left.target}:${left.text}`.localeCompare(`${right.target}:${right.text}`));
    const bTextConditions = normalizeSmartFolderTextConditionsForCompare(b)
        .slice()
        .sort((left, right) => `${left.target}:${left.text}`.localeCompare(`${right.target}:${right.text}`));
    if (aTextConditions.length !== bTextConditions.length) {
        return false;
    }
    if (aTextConditions.some((item, index) => (
        item.target !== bTextConditions[index].target || item.text !== bTextConditions[index].text
    ))) {
        return false;
    }
    if (a.tags.mode !== b.tags.mode) {
        return false;
    }

    const aTagIds = Array.from(new Set(a.tags.ids)).sort();
    const bTagIds = Array.from(new Set(b.tags.ids)).sort();
    if (aTagIds.length !== bTagIds.length || aTagIds.some((id, index) => id !== bTagIds[index])) {
        return false;
    }

    const aTypes = normalizeSmartFolderTypesForCompare(a.types);
    const bTypes = normalizeSmartFolderTypesForCompare(b.types);
    if (aTypes.length !== bTypes.length || aTypes.some((type, index) => type !== bTypes[index])) {
        return false;
    }

    const normalizeRatings = (ratings: SmartFolderConditionV1['ratings']) => {
        return Object.entries(ratings)
            .map(([axisId, range]) => ({
                axisId,
                min: typeof range.min === 'number' && Number.isFinite(range.min) ? range.min : undefined,
                max: typeof range.max === 'number' && Number.isFinite(range.max) ? range.max : undefined,
            }))
            .filter((item) => item.min !== undefined || item.max !== undefined)
            .sort((left, right) => left.axisId.localeCompare(right.axisId));
    };

    const aRatings = normalizeRatings(a.ratings);
    const bRatings = normalizeRatings(b.ratings);
    if (aRatings.length !== bRatings.length) {
        return false;
    }
    for (let i = 0; i < aRatings.length; i += 1) {
        const left = aRatings[i];
        const right = bRatings[i];
        if (left.axisId !== right.axisId || left.min !== right.min || left.max !== right.max) {
            return false;
        }
    }

    return true;
}

function toSmartFolderOptionLabel(folderSelection: string, folders: MediaFolder[]): string {
    const label = resolveSmartFolderFolderLabel(folderSelection, folders);
    return label.replace(/^範囲:\s*/, '');
}

function buildSmartFolderFolderOptions(
    folders: MediaFolder[],
    currentFolderId: string | null
): SmartFolderFolderOption[] {
    const options: SmartFolderFolderOption[] = [];
    const seen = new Set<string>();
    const pushOption = (value: string, label: string) => {
        if (!value || seen.has(value)) return;
        seen.add(value);
        options.push({ value, label });
    };

    pushOption(ALL_FILES_ID, 'すべてのファイル');

    if (currentFolderId && currentFolderId !== ALL_FILES_ID) {
        pushOption(currentFolderId, `${toSmartFolderOptionLabel(currentFolderId, folders)} (現在選択中)`);
    }

    const driveList = Array.from(
        new Set(
            folders
                .map((folder) => String(folder.drive || ''))
                .filter((drive) => drive.length > 0)
        )
    ).sort((a, b) => a.localeCompare(b, 'ja'));
    driveList.forEach((drive) => {
        pushOption(`${DRIVE_PREFIX}${drive}`, `${drive} ドライブ`);
    });

    const registeredFolders = folders
        .filter((folder) => !folder.isVirtualFolder)
        .slice()
        .sort((a, b) => a.path.localeCompare(b.path, 'ja'));
    registeredFolders.forEach((folder) => {
        pushOption(`${FOLDER_PREFIX}${folder.id}`, `登録: ${folder.path}`);
    });

    const virtualFolders = folders
        .filter((folder) => !!folder.isVirtualFolder)
        .slice()
        .sort((a, b) => a.path.localeCompare(b.path, 'ja'));
    virtualFolders.forEach((folder) => {
        pushOption(`${VIRTUAL_FOLDER_RECURSIVE_PREFIX}${folder.path}`, `仮想: ${folder.path} (配下)`);
    });

    return options;
}

type SmartFolderEditorState =
    | {
        mode: 'create';
        initialName: string;
        initialCondition: SmartFolderConditionV1;
    }
    | {
        mode: 'edit';
        smartFolderId: string;
    }
    | null;

export const Sidebar = React.memo(() => {
    const currentFolderId = useFileStore((s) => s.currentFolderId);
    const files = useFileStore((s) => s.files);
    const setFiles = useFileStore((s) => s.setFiles);
    const setCurrentFolderId = useFileStore((s) => s.setCurrentFolderId);

    const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
    const toggleSidebar = useUIStore((s) => s.toggleSidebar);
    const scanProgress = useUIStore((s) => s.scanProgress);
    const isScanProgressVisible = useUIStore((s) => s.isScanProgressVisible);
    const clearScanProgress = useUIStore((s) => s.clearScanProgress);
    const acknowledgeScanProgress = useUIStore((s) => s.acknowledgeScanProgress);
    const duplicateViewOpen = useUIStore((s) => s.duplicateViewOpen);
    const mainView = useUIStore((s) => s.mainView);
    const searchQuery = useUIStore((s) => s.searchQuery);
    const searchTarget = useUIStore((s) => s.searchTarget);
    const searchExtraConditions = useUIStore((s) => s.searchExtraConditions);
    const selectedFileTypes = useUIStore((s) => s.selectedFileTypes);
    const tags = useTagStore((s) => s.tags);
    const loadTags = useTagStore((s) => s.loadTags);
    const selectedTagIds = useTagStore((s) => s.selectedTagIds);
    const filterMode = useTagStore((s) => s.filterMode);
    const ratingAxes = useRatingStore((s) => s.axes);
    const loadRatingAxes = useRatingStore((s) => s.loadAxes);
    const ratingFilter = useRatingStore((s) => s.ratingFilter);
    const smartFolders = useSmartFolderStore((s) => s.smartFolders);
    const activeSmartFolderId = useSmartFolderStore((s) => s.activeSmartFolderId);
    const smartFolderLoading = useSmartFolderStore((s) => s.isLoading);
    const smartFolderMutating = useSmartFolderStore((s) => s.isMutating);
    const loadSmartFolders = useSmartFolderStore((s) => s.loadSmartFolders);
    const createSmartFolder = useSmartFolderStore((s) => s.createSmartFolder);
    const updateSmartFolder = useSmartFolderStore((s) => s.updateSmartFolder);
    const deleteSmartFolder = useSmartFolderStore((s) => s.deleteSmartFolder);
    const applySmartFolder = useSmartFolderStore((s) => s.applySmartFolder);
    const setActiveSmartFolderId = useSmartFolderStore((s) => s.setActiveSmartFolderId);

    const [folders, setFolders] = useState<MediaFolder[]>([]);
    const [tagManagerOpen, setTagManagerOpen] = useState(false);
    const [folderSettingsOpen, setFolderSettingsOpen] = useState(false);
    const [folderSettingsTarget, setFolderSettingsTarget] = useState<MediaFolder | null>(null);
    const [folderScanSettingsManagerOpen, setFolderScanSettingsManagerOpen] = useState(false);
    const [addFolderSettingsOpen, setAddFolderSettingsOpen] = useState(false);
    const [pendingAddFolderPath, setPendingAddFolderPath] = useState<string | null>(null);
    const [folderTreeSearch, setFolderTreeSearch] = useState('');
    const [folderTreeRecursiveCountsByPath, setFolderTreeRecursiveCountsByPath] = useState<Record<string, number>>({});
    const [smartFolderEditorState, setSmartFolderEditorState] = useState<SmartFolderEditorState>(null);
    const perfDebugEnabled = isPerfDebugEnabled();
    const progressiveRefreshStateRef = useRef<{
        timer: ReturnType<typeof setTimeout> | null;
        inFlight: boolean;
        rerun: boolean;
    }>({
        timer: null,
        inFlight: false,
        rerun: false,
    });

    const loadFolders = useCallback(async () => {
        const start = perfDebugEnabled ? performance.now() : 0;
        try {
            const [registered, treeStats] = await Promise.all([
                window.electronAPI.getFolders(),
                window.electronAPI.getFolderTreeStats(),
            ]);
            const treePaths = treeStats?.paths || [];
            setFolderTreeRecursiveCountsByPath(treeStats?.recursiveCountsByPath || {});

            const registeredPathSet = new Set<string>(registered.map((f: any) => String(f.path).toLowerCase()));
            const virtualFolders: MediaFolder[] = (treePaths || [])
                .filter((p: string) => !registeredPathSet.has(String(p).toLowerCase()))
                .map((p: string) => {
                    const normalizedPath = String(p);
                    const name = normalizedPath.split(/[\\/]/).pop() || normalizedPath;
                    const drive = normalizedPath.match(/^[A-Z]:/i) ? normalizedPath.substring(0, 2).toUpperCase() : '/';
                    return {
                        id: `virtual:${normalizedPath}`,
                        name,
                        path: normalizedPath,
                        createdAt: 0,
                        parentId: null,
                        drive,
                        isVirtualFolder: true,
                    } as MediaFolder;
                });

            setFolders([...(registered as MediaFolder[]), ...virtualFolders]);
            if (perfDebugEnabled) {
                console.debug('[perf][Sidebar][loadFolders]', {
                    registeredCount: registered.length,
                    virtualFolderCount: virtualFolders.length,
                    elapsedMs: Number((performance.now() - start).toFixed(2)),
                });
            }
        } catch (e) {
            if (perfDebugEnabled) {
                console.debug('[perf][Sidebar][loadFolders]', {
                    status: 'error',
                    error: e instanceof Error ? e.message : String(e),
                    elapsedMs: Number((performance.now() - start).toFixed(2)),
                });
            }
            console.error('Failed to load folders:', e);
        }
    }, [perfDebugEnabled]);



    const handleAddFolder = useCallback(async () => {
        try {
            const path = await window.electronAPI.selectFolder();
            if (path) {
                setPendingAddFolderPath(path);
                setAddFolderSettingsOpen(true);
            }
        } catch (e) {
            console.error('Error adding folder:', e);
        }
    }, []);

    const handleConfirmAddFolderSettings = useCallback(async (settings: AddFolderScanSettingsSubmit) => {
        if (!pendingAddFolderPath) return;

        try {
            const folder = await window.electronAPI.addFolder(pendingAddFolderPath);

            await Promise.all([
                window.electronAPI.setFolderAutoScan(folder.id, settings.autoScan),
                window.electronAPI.setFolderWatchNewFiles(folder.id, settings.watchNewFiles),
                window.electronAPI.setFolderScanFileTypeOverrides(folder.id, {
                    video: settings.fileTypeFilters.video,
                    image: settings.fileTypeFilters.image,
                    archive: settings.fileTypeFilters.archive,
                    audio: settings.fileTypeFilters.audio,
                }),
            ]);

            if (settings.startScanNow) {
                await window.electronAPI.scanFolder(pendingAddFolderPath);
            }

            setAddFolderSettingsOpen(false);
            setPendingAddFolderPath(null);
            void loadFolders();
        } catch (e) {
            console.error('Error applying add-folder scan settings:', e);
        }
    }, [pendingAddFolderPath, loadFolders]);

    const loadFilesForSelection = useCallback(async (
        folderId: string | null,
        options?: { reloadTagCache?: boolean }
    ) => {
        if (!folderId || folderId === ALL_FILES_ID) {
            const loadedFiles = await window.electronAPI.getFiles();
            setFiles(loadedFiles, options);
            return loadedFiles;
        }

        if (folderId.startsWith(DRIVE_PREFIX)) {
            const drive = folderId.slice(DRIVE_PREFIX.length);
            const loadedFiles = await window.electronAPI.getFilesByDrive(drive);
            setFiles(loadedFiles, options);
            return loadedFiles;
        }

        if (folderId.startsWith(FOLDER_PREFIX)) {
            const actualId = folderId.slice(FOLDER_PREFIX.length);
            const loadedFiles = await window.electronAPI.getFilesByFolderRecursive(actualId);
            setFiles(loadedFiles, options);
            return loadedFiles;
        }

        if (folderId.startsWith(VIRTUAL_FOLDER_RECURSIVE_PREFIX)) {
            const folderPath = folderId.slice(VIRTUAL_FOLDER_RECURSIVE_PREFIX.length);
            const loadedFiles = await window.electronAPI.getFilesByFolderPathRecursive(folderPath);
            setFiles(loadedFiles, options);
            return loadedFiles;
        }

        if (folderId.startsWith(VIRTUAL_FOLDER_PREFIX)) {
            const folderPath = folderId.slice(VIRTUAL_FOLDER_PREFIX.length);
            const loadedFiles = await window.electronAPI.getFilesByFolderPathDirect(folderPath);
            setFiles(loadedFiles, options);
            return loadedFiles;
        }

        const loadedFiles = await window.electronAPI.getFiles(folderId);
        setFiles(loadedFiles, options);
        return loadedFiles;
    }, [setFiles]);

    const handleSelectFolder = useCallback(async (folderId: string | null) => {
        const start = perfDebugEnabled ? performance.now() : 0;
        setActiveSmartFolderId(null);
        setCurrentFolderId(folderId);
        useUIStore.getState().closeDuplicateView(); // 重複ビューを閉じる
        useUIStore.getState().setMainView('grid');  // 統計ビューを閉じる
        try {
            const files = await loadFilesForSelection(folderId);
            if (perfDebugEnabled) {
                console.debug('[perf][Sidebar][handleSelectFolder]', {
                    folderId: folderId ?? ALL_FILES_ID,
                    fileCount: files.length,
                    elapsedMs: Number((performance.now() - start).toFixed(2)),
                });
            }
        } catch (e) {
            if (perfDebugEnabled) {
                console.debug('[perf][Sidebar][handleSelectFolder]', {
                    folderId: folderId ?? ALL_FILES_ID,
                    status: 'error',
                    error: e instanceof Error ? e.message : String(e),
                    elapsedMs: Number((performance.now() - start).toFixed(2)),
                });
            }
            console.error('Error loading files:', e);
        }
    }, [setActiveSmartFolderId, setCurrentFolderId, loadFilesForSelection, perfDebugEnabled]);

    // 「すべてのファイル」を選択
    const handleSelectAllFiles = useCallback(() => {
        handleSelectFolder(ALL_FILES_ID);
    }, [handleSelectFolder]);

    useEffect(() => {
        void loadFolders();

        // 起動直後/プロファイル切替直後:
        // 見た目上は「すべてのファイル」選択状態（currentFolderId=null）なので、
        // 実データも全件ロードしてフィルター対象を一致させる。
        const { currentFolderId: initialFolderId, files: initialFiles } = useFileStore.getState();
        if (initialFolderId === null && initialFiles.length === 0) {
            void handleSelectFolder(ALL_FILES_ID);
        }
    }, [loadFolders, handleSelectFolder]);

    useEffect(() => {
        void loadSmartFolders();
    }, [loadSmartFolders]);

    useEffect(() => {
        void loadTags();
        void loadRatingAxes();
    }, [loadRatingAxes, loadTags]);

    const buildCurrentSmartFolderCondition = useCallback(() => {
        const normalizedRatings: Record<string, { min?: number; max?: number }> = {};
        Object.entries(ratingFilter).forEach(([axisId, range]) => {
            const min = typeof range.min === 'number' && Number.isFinite(range.min) ? range.min : undefined;
            const max = typeof range.max === 'number' && Number.isFinite(range.max) ? range.max : undefined;
            if (min === undefined && max === undefined) return;
            normalizedRatings[axisId] = { min, max };
        });

        return {
            folderSelection: currentFolderId,
            text: searchQuery,
            textMatchTarget: searchTarget,
            textConditions: [
                { text: searchQuery, target: searchTarget },
                ...searchExtraConditions,
            ].filter((item) => item.text.trim().length > 0),
            tags: {
                ids: [...selectedTagIds],
                mode: filterMode,
            },
            ratings: normalizedRatings,
            types: [...selectedFileTypes],
        };
    }, [currentFolderId, filterMode, ratingFilter, searchQuery, searchTarget, searchExtraConditions, selectedFileTypes, selectedTagIds]);

    const createDefaultSmartFolderName = useCallback(() => {
        const now = new Date();
        const pad = (value: number) => String(value).padStart(2, '0');
        return `条件 ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }, []);

    const handleOpenCreateSmartFolderEditor = useCallback(() => {
        setSmartFolderEditorState({
            mode: 'create',
            initialName: createDefaultSmartFolderName(),
            initialCondition: buildCurrentSmartFolderCondition(),
        });
    }, [buildCurrentSmartFolderCondition, createDefaultSmartFolderName]);

    const handleApplySmartFolder = useCallback(async (smartFolderId: string) => {
        try {
            const applied = await applySmartFolder(smartFolderId, {
                applyFolderSelection: handleSelectFolder,
            });
            if (!applied) {
                window.alert('スマートフォルダが見つかりません');
            }
        } catch (error) {
            console.error('Failed to apply smart folder:', error);
            window.alert('スマートフォルダの適用に失敗しました');
        }
    }, [applySmartFolder, handleSelectFolder]);

    const handleClearSmartFolderConditions = useCallback(async () => {
        try {
            const uiStore = useUIStore.getState();
            uiStore.clearSearchConditions();
            uiStore.setSelectedFileTypes([...ALL_FILE_TYPES]);
            useTagStore.setState({
                selectedTagIds: [],
                filterMode: 'OR',
            });
            useRatingStore.setState({
                ratingFilter: {},
            });
            await handleSelectFolder(ALL_FILES_ID);
            setActiveSmartFolderId(null);
            uiStore.showToast('スマートフォルダ条件を解除しました');
        } catch (error) {
            console.error('Failed to clear smart folder conditions:', error);
            window.alert('スマートフォルダ条件の解除に失敗しました');
        }
    }, [handleSelectFolder, setActiveSmartFolderId]);

    const handleOpenEditSmartFolderEditor = useCallback((id: string) => {
        setSmartFolderEditorState({
            mode: 'edit',
            smartFolderId: id,
        });
    }, []);

    const handleSubmitSmartFolderEditor = useCallback(async (
        payload: {
            name: string;
            condition: SmartFolderConditionV1;
        }
    ) => {
        if (!smartFolderEditorState) return;
        try {
            if (smartFolderEditorState.mode === 'create') {
                await createSmartFolder(payload.name, payload.condition);
            } else {
                await updateSmartFolder(smartFolderEditorState.smartFolderId, {
                    name: payload.name,
                    condition: payload.condition,
                });
            }
            setSmartFolderEditorState(null);
        } catch (error) {
            console.error('Failed to save smart folder:', error);
            window.alert('スマートフォルダの保存に失敗しました');
        }
    }, [createSmartFolder, smartFolderEditorState, updateSmartFolder]);

    const handleDeleteSmartFolder = useCallback(async (id: string, name: string) => {
        const confirmed = window.confirm(`スマートフォルダ「${name}」を削除しますか？`);
        if (!confirmed) return;

        try {
            const deleted = await deleteSmartFolder(id);
            if (!deleted) {
                window.alert('スマートフォルダが見つかりません');
            }
        } catch (error) {
            console.error('Failed to delete smart folder:', error);
            window.alert('スマートフォルダの削除に失敗しました');
        }
    }, [deleteSmartFolder]);

    const filteredFoldersForTree = useMemo(() => {
        const q = folderTreeSearch.trim().toLowerCase();
        if (!q) return folders;

        const include = new Set<string>();
        const addAncestors = (folderPath: string) => {
            let current = folderPath;
            while (current) {
                include.add(current.toLowerCase());
                const parent = current.replace(/[\\/][^\\/]+$/, '');
                if (!parent || parent === current) break;
                current = parent;
            }
        };

        const addDescendants = (folderPath: string) => {
            const prefix = `${folderPath.replace(/[\\/]+$/, '')}\\`.toLowerCase();
            folders.forEach((f) => {
                const p = String(f.path).toLowerCase();
                if (p.startsWith(prefix)) include.add(p);
            });
        };

        folders.forEach((folder) => {
            const name = String(folder.name || '').toLowerCase();
            const folderPath = String(folder.path || '');
            const folderPathLower = folderPath.toLowerCase();
            if (name.includes(q) || folderPathLower.includes(q)) {
                addAncestors(folderPath);
                addDescendants(folderPath);
            }
        });

        return folders.filter((f) => include.has(String(f.path).toLowerCase()));
    }, [folders, folderTreeSearch]);

    const smartFolderPreviewMap = useMemo(() => {
        const map = new Map<string, string>();
        smartFolders.forEach((smartFolder) => {
            map.set(
                smartFolder.id,
                buildSmartFolderPreviewText(smartFolder.condition, folders)
            );
        });
        return map;
    }, [smartFolders, folders]);

    const activeSmartFolder = useMemo(() => {
        if (!activeSmartFolderId) return null;
        return smartFolders.find((item) => item.id === activeSmartFolderId) ?? null;
    }, [activeSmartFolderId, smartFolders]);

    const activeSmartFolderConditionStatus = useMemo<'matched' | 'changed' | 'none'>(() => {
        if (!activeSmartFolder) return 'none';
        const current = buildCurrentSmartFolderCondition();
        return isSameSmartFolderCondition(activeSmartFolder.condition, current) ? 'matched' : 'changed';
    }, [activeSmartFolder, buildCurrentSmartFolderCondition]);

    const smartFolderFolderOptions = useMemo(() => {
        return buildSmartFolderFolderOptions(folders, currentFolderId);
    }, [folders, currentFolderId]);

    const editingSmartFolder = useMemo(() => {
        if (!smartFolderEditorState || smartFolderEditorState.mode !== 'edit') return null;
        return smartFolders.find((item) => item.id === smartFolderEditorState.smartFolderId) ?? null;
    }, [smartFolderEditorState, smartFolders]);

    const smartFolderEditorInitialName = useMemo(() => {
        if (!smartFolderEditorState) return '';
        if (smartFolderEditorState.mode === 'create') return smartFolderEditorState.initialName;
        return editingSmartFolder?.name ?? '';
    }, [editingSmartFolder, smartFolderEditorState]);

    const smartFolderEditorInitialCondition = useMemo<SmartFolderConditionV1>(() => {
        if (!smartFolderEditorState) {
            return {
                folderSelection: ALL_FILES_ID,
                text: '',
                textMatchTarget: 'fileName',
                textConditions: [],
                tags: { ids: [], mode: 'OR' },
                ratings: {},
                types: [...ALL_FILE_TYPES],
            };
        }
        if (smartFolderEditorState.mode === 'create') return smartFolderEditorState.initialCondition;
        return editingSmartFolder?.condition ?? {
            folderSelection: ALL_FILES_ID,
            text: '',
            textMatchTarget: 'fileName',
            textConditions: [],
            tags: { ids: [], mode: 'OR' },
            ratings: {},
            types: [...ALL_FILE_TYPES],
        };
    }, [editingSmartFolder, smartFolderEditorState]);

    const registeredFolderMap = useMemo(() => {
        const next = new Map<string, MediaFolder>();
        folders.forEach((folder) => {
            if (!folder.isVirtualFolder) {
                next.set(folder.id, folder);
            }
        });
        return next;
    }, [folders]);

    const isCurrentViewAffectedByScanBatch = useCallback((payload: ScanBatchCommittedPayload) => {
        if (mainView !== 'grid' || duplicateViewOpen) {
            return false;
        }

        if (!currentFolderId || currentFolderId === ALL_FILES_ID) {
            return true;
        }

        if (currentFolderId.startsWith(DRIVE_PREFIX)) {
            const drive = currentFolderId.slice(DRIVE_PREFIX.length).toUpperCase();
            return getDriveFromPath(payload.scanPath) === drive;
        }

        if (currentFolderId.startsWith(FOLDER_PREFIX)) {
            const selectedFolderId = currentFolderId.slice(FOLDER_PREFIX.length);
            let current = registeredFolderMap.get(payload.rootFolderId) ?? null;
            while (current) {
                if (current.id === selectedFolderId) {
                    return true;
                }
                current = current.parentId ? (registeredFolderMap.get(current.parentId) ?? null) : null;
            }
            return false;
        }

        if (currentFolderId.startsWith(VIRTUAL_FOLDER_RECURSIVE_PREFIX)) {
            const selectedPath = currentFolderId.slice(VIRTUAL_FOLDER_RECURSIVE_PREFIX.length);
            return isSameOrDescendantPath(payload.scanPath, selectedPath);
        }

        if (currentFolderId.startsWith(VIRTUAL_FOLDER_PREFIX)) {
            const selectedPath = currentFolderId.slice(VIRTUAL_FOLDER_PREFIX.length);
            return normalizeFolderPathForCompare(payload.scanPath) === normalizeFolderPathForCompare(selectedPath);
        }

        return payload.rootFolderId === currentFolderId;
    }, [currentFolderId, duplicateViewOpen, mainView, registeredFolderMap]);

    const flushProgressiveRefresh = useCallback(async () => {
        const refreshState = progressiveRefreshStateRef.current;
        if (refreshState.inFlight) {
            refreshState.rerun = true;
            return;
        }

        refreshState.inFlight = true;
        const start = perfDebugEnabled ? performance.now() : 0;

        try {
            const activeFolderId = currentFolderId ?? ALL_FILES_ID;
            const refreshedFiles = await loadFilesForSelection(activeFolderId, { reloadTagCache: false });
            if (perfDebugEnabled) {
                console.debug('[perf][Sidebar][progressiveRefresh]', {
                    folderId: activeFolderId,
                    fileCount: refreshedFiles.length,
                    elapsedMs: Number((performance.now() - start).toFixed(2)),
                });
            }
        } catch (error) {
            if (perfDebugEnabled) {
                console.debug('[perf][Sidebar][progressiveRefresh]', {
                    folderId: currentFolderId ?? ALL_FILES_ID,
                    status: 'error',
                    error: error instanceof Error ? error.message : String(error),
                    elapsedMs: Number((performance.now() - start).toFixed(2)),
                });
            }
            console.error('Failed to progressively refresh scanned files:', error);
        } finally {
            refreshState.inFlight = false;
            if (refreshState.rerun) {
                refreshState.rerun = false;
                refreshState.timer = setTimeout(() => {
                    refreshState.timer = null;
                    void flushProgressiveRefresh();
                }, PROGRESSIVE_REFRESH_DEBOUNCE_MS);
            }
        }
    }, [currentFolderId, loadFilesForSelection, perfDebugEnabled]);

    const scheduleProgressiveRefresh = useCallback((options?: { immediate?: boolean }) => {
        const refreshState = progressiveRefreshStateRef.current;

        if (refreshState.timer) {
            clearTimeout(refreshState.timer);
            refreshState.timer = null;
        }

        if (options?.immediate) {
            void flushProgressiveRefresh();
            return;
        }

        refreshState.timer = setTimeout(() => {
            refreshState.timer = null;
            void flushProgressiveRefresh();
        }, PROGRESSIVE_REFRESH_DEBOUNCE_MS);
    }, [flushProgressiveRefresh]);

    useEffect(() => {
        const refreshState = progressiveRefreshStateRef.current;

        const cleanupDelete = window.electronAPI.onFolderDeleted((folderId) => {
            console.log('Folder deleted:', folderId);
            void loadFolders();
            if (currentFolderId === folderId) {
                setCurrentFolderId(null);
                setFiles([]);
            }
        });

        const cleanupRescan = window.electronAPI.onFolderRescanComplete((folderId) => {
            console.log('Folder rescan complete:', folderId);
            if (currentFolderId === folderId || currentFolderId === ALL_FILES_ID) {
                void handleSelectFolder(currentFolderId);
            }
        });

        const cleanupScanBatchCommitted = window.electronAPI.onScanBatchCommitted((payload) => {
            if (payload.stage === 'complete' || payload.stage === 'cancelled') {
                void loadFolders();
            }

            if (!isCurrentViewAffectedByScanBatch(payload)) {
                return;
            }

            scheduleProgressiveRefresh({ immediate: payload.stage !== 'batch' });
        });

        return () => {
            if (refreshState.timer) {
                clearTimeout(refreshState.timer);
                refreshState.timer = null;
            }
            cleanupDelete();
            cleanupRescan();
            cleanupScanBatchCommitted();
        };
    }, [loadFolders, currentFolderId, setCurrentFolderId, setFiles, handleSelectFolder, isCurrentViewAffectedByScanBatch, scheduleProgressiveRefresh]);

    const hiddenScanIndicator = useMemo(() => {
        if (!scanProgress || isScanProgressVisible) return null;

        if (scanProgress.phase === 'complete') {
            return {
                icon: <CheckCircle2 size={18} className="flex-shrink-0 text-green-400" />,
                text: 'スキャン結果',
                title: 'スキャン結果を表示',
                className: 'hover:bg-surface-800 text-green-400',
            };
        }

        if (scanProgress.phase === 'error') {
            return {
                icon: <AlertCircle size={18} className="flex-shrink-0 text-red-400" />,
                text: 'スキャンエラー',
                title: 'スキャン結果を表示',
                className: 'hover:bg-surface-800 text-red-400',
            };
        }

        return {
            icon: <Loader2 size={18} className="flex-shrink-0 animate-spin text-blue-400" />,
            text: 'スキャン中...',
            title: 'スキャン中 - クリックで表示',
            className: 'hover:bg-surface-800 text-blue-400',
        };
    }, [isScanProgressVisible, scanProgress]);


    return (
        <aside
            className={`
                bg-surface-900 border-r border-surface-700 flex flex-col h-full relative group/sidebar
                transition-all duration-300 ease-in-out
                ${sidebarCollapsed ? 'w-16' : 'w-64'}
            `}
        >
            {/* Toggle Button on the border */}
            <button
                onClick={toggleSidebar}
                className={`
                    absolute top-8 -right-3 z-20
                    p-1 rounded-full border border-surface-600
                    bg-surface-800 text-surface-400 hover:text-white hover:bg-surface-700
                    transition-colors shadow-md
                `}
                title={sidebarCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
            >
                {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            <div className={`
                p-4 border-b border-surface-700 flex items-center
                ${sidebarCollapsed ? 'justify-center' : 'justify-between'}
            `}>
                {!sidebarCollapsed && <h2 className="text-sm font-semibold text-white truncate tracking-wide">ライブラリ</h2>}

                <button
                    onClick={handleAddFolder}
                    className="p-1.5 hover:bg-surface-700 rounded transition-colors"
                    title="フォルダを追加"
                >
                    <Plus size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                <SidebarFolderSection
                    sidebarCollapsed={sidebarCollapsed}
                    currentFolderId={currentFolderId}
                    folders={folders}
                    folderTreeSearch={folderTreeSearch}
                    onFolderTreeSearchChange={setFolderTreeSearch}
                    filteredFoldersForTree={filteredFoldersForTree}
                    folderTreeRecursiveCountsByPath={folderTreeRecursiveCountsByPath}
                    onSelectAllFiles={handleSelectAllFiles}
                    onOpenFolderScanSettingsManager={() => setFolderScanSettingsManagerOpen(true)}
                    onSelectFolder={handleSelectFolder}
                    onOpenFolderSettings={(folder) => {
                        setFolderSettingsTarget(folder);
                        setFolderSettingsOpen(true);
                    }}
                />

                <SidebarSmartFoldersSection
                    sidebarCollapsed={sidebarCollapsed}
                    activeSmartFolder={activeSmartFolder}
                    activeSmartFolderConditionStatus={activeSmartFolderConditionStatus}
                    smartFolderMutating={smartFolderMutating}
                    smartFolderLoading={smartFolderLoading}
                    smartFolders={smartFolders}
                    activeSmartFolderId={activeSmartFolderId}
                    smartFolderPreviewMap={smartFolderPreviewMap}
                    onClearSmartFolderConditions={() => { void handleClearSmartFolderConditions(); }}
                    onOpenCreateSmartFolderEditor={handleOpenCreateSmartFolderEditor}
                    onApplySmartFolder={(smartFolderId) => { void handleApplySmartFolder(smartFolderId); }}
                    onOpenEditSmartFolderEditor={handleOpenEditSmartFolderEditor}
                    onDeleteSmartFolder={(smartFolderId, smartFolderName) => {
                        void handleDeleteSmartFolder(smartFolderId, smartFolderName);
                    }}
                />

                {/* Tag Filter Panel */}
                {!sidebarCollapsed && (
                    <>
                        <TagFilterPanel onOpenManager={() => setTagManagerOpen(true)} />
                        <RatingFilterPanel />
                    </>
                )}

                <SidebarUtilityActions
                    sidebarCollapsed={sidebarCollapsed}
                    duplicateViewOpen={duplicateViewOpen}
                    mainView={mainView}
                    onOpenDuplicateView={() => {
                        setCurrentFolderId(null);
                        useUIStore.getState().openDuplicateView();
                        useUIStore.getState().setMainView('grid');
                    }}
                    onOpenStatistics={() => {
                        useUIStore.getState().closeDuplicateView();
                        useUIStore.getState().setMainView('statistics');
                    }}
                    onOpenSettings={() => useUIStore.getState().openSettingsModal()}
                    hiddenScanIndicator={hiddenScanIndicator}
                    canDismissScanIndicator={!!scanProgress && (scanProgress.phase === 'complete' || scanProgress.phase === 'error')}
                    onShowScanProgress={() => {
                        acknowledgeScanProgress();
                        useUIStore.getState().setScanProgressVisible(true);
                    }}
                    onDismissScanIndicator={clearScanProgress}
                />
            </div>

            {/* Tag Manager Modal */}
            <TagManagerModal isOpen={tagManagerOpen} onClose={() => setTagManagerOpen(false)} />
            <FolderAutoScanSettingsDialog
                isOpen={folderSettingsOpen}
                folder={folderSettingsTarget}
                onClose={() => setFolderSettingsOpen(false)}
                onSaved={() => {
                    void loadFolders();
                }}
            />
            <FolderScanSettingsManagerDialog
                isOpen={folderScanSettingsManagerOpen}
                onClose={() => setFolderScanSettingsManagerOpen(false)}
            />
            <AddFolderScanSettingsDialog
                isOpen={addFolderSettingsOpen}
                folderPath={pendingAddFolderPath}
                onClose={() => {
                    setAddFolderSettingsOpen(false);
                    setPendingAddFolderPath(null);
                }}
                onSubmit={(settings) => { void handleConfirmAddFolderSettings(settings); }}
            />
            <SmartFolderEditorDialog
                isOpen={smartFolderEditorState !== null}
                title={smartFolderEditorState?.mode === 'edit' ? 'スマートフォルダを編集' : 'スマートフォルダを保存'}
                submitLabel={smartFolderEditorState?.mode === 'edit' ? '更新' : '保存'}
                initialName={smartFolderEditorInitialName}
                initialCondition={smartFolderEditorInitialCondition}
                folderOptions={smartFolderFolderOptions}
                tags={tags}
                ratingAxes={ratingAxes}
                isSubmitting={smartFolderMutating}
                onClose={() => setSmartFolderEditorState(null)}
                onSubmit={handleSubmitSmartFolderEditor}
            />
        </aside>
    );
});

Sidebar.displayName = 'Sidebar';

