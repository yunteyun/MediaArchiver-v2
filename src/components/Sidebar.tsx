import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Plus, ChevronLeft, ChevronRight, Loader2, CheckCircle2, AlertCircle, Filter, Wrench, ChevronDown } from 'lucide-react';
import { useFileStore } from '../stores/useFileStore';
import { useUIStore, type SearchCondition, type SearchTarget } from '../stores/useUIStore';
import { useTagStore } from '../stores/useTagStore';
import { useRatingStore } from '../stores/useRatingStore';
import { useSettingsStore } from '../stores/useSettingsStore';
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
import { useSidebarData } from './sidebar/useSidebarData';
import {
    ALL_FILES_ID,
    DRIVE_PREFIX,
    FOLDER_PREFIX,
    VIRTUAL_FOLDER_PREFIX,
    VIRTUAL_FOLDER_RECURSIVE_PREFIX,
} from './sidebar/sidebarShared';
import type { MediaFile, MediaFolder } from '../types/file';
import type { SmartFolderConditionV1 } from '../stores/useSmartFolderStore';

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
    if (condition.ratingQuickFilter === 'overall4plus') {
        segments.push('総合: 4+');
    } else if (condition.ratingQuickFilter === 'unrated') {
        segments.push('総合: 未評価');
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
    if ((a.ratingQuickFilter ?? 'none') !== (b.ratingQuickFilter ?? 'none')) {
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

function createSmartFolderTemplateCondition(templateKey: 'overall4plus' | 'unrated'): SmartFolderConditionV1 {
    return {
        folderSelection: ALL_FILES_ID,
        text: '',
        textMatchTarget: 'fileName',
        textConditions: [],
        ratingQuickFilter: templateKey,
        tags: { ids: [], mode: 'OR' },
        ratings: {},
        types: [...ALL_FILE_TYPES],
    };
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

const SIDEBAR_SECTION_STATE_STORAGE_KEY = 'sidebar.sectionState.v1';

function readSidebarSectionState(): { filtersOpen: boolean; toolsOpen: boolean } {
    try {
        const raw = window.localStorage.getItem(SIDEBAR_SECTION_STATE_STORAGE_KEY);
        if (!raw) {
            return { filtersOpen: false, toolsOpen: false };
        }
        const parsed = JSON.parse(raw);
        return {
            filtersOpen: parsed?.filtersOpen !== false,
            toolsOpen: parsed?.toolsOpen !== false,
        };
    } catch {
        return { filtersOpen: false, toolsOpen: false };
    }
}

function writeSidebarSectionState(state: { filtersOpen: boolean; toolsOpen: boolean }) {
    try {
        window.localStorage.setItem(SIDEBAR_SECTION_STATE_STORAGE_KEY, JSON.stringify(state));
    } catch {
        // ignore localStorage failures
    }
}

interface SidebarToggleSectionProps {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    title: string;
    isOpen: boolean;
    badge?: string | null;
    onToggle: () => void;
    children: React.ReactNode;
}

const SidebarToggleSection = React.memo(({
    icon: Icon,
    title,
    isOpen,
    badge,
    onToggle,
    children,
}: SidebarToggleSectionProps) => {
    return (
        <section className="border-t border-surface-700 mt-2 pt-2">
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-surface-300 transition-colors hover:bg-surface-800"
                aria-expanded={isOpen}
            >
                <Icon size={18} className="flex-shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
                {badge && (
                    <span className="rounded-full bg-primary-500/15 px-2 py-0.5 text-[10px] font-medium text-primary-300">
                        {badge}
                    </span>
                )}
                <ChevronDown
                    size={16}
                    className={`flex-shrink-0 text-surface-500 transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                />
            </button>
            {isOpen && <div>{children}</div>}
        </section>
    );
});

SidebarToggleSection.displayName = 'SidebarToggleSection';

export const Sidebar = React.memo(() => {
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
    const ratingQuickFilter = useUIStore((s) => s.ratingQuickFilter);
    const selectedFileTypes = useUIStore((s) => s.selectedFileTypes);
    const defaultSearchTarget = useSettingsStore((s) => s.defaultSearchTarget);
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

    const [tagManagerOpen, setTagManagerOpen] = useState(false);
    const [folderSettingsOpen, setFolderSettingsOpen] = useState(false);
    const [folderSettingsTarget, setFolderSettingsTarget] = useState<MediaFolder | null>(null);
    const [folderScanSettingsManagerOpen, setFolderScanSettingsManagerOpen] = useState(false);
    const [addFolderSettingsOpen, setAddFolderSettingsOpen] = useState(false);
    const [pendingAddFolderPath, setPendingAddFolderPath] = useState<string | null>(null);
    const [smartFolderEditorState, setSmartFolderEditorState] = useState<SmartFolderEditorState>(null);
    const [sectionState, setSectionState] = useState(() => readSidebarSectionState());
    const {
        currentFolderId,
        folders,
        folderTreeSearch,
        setFolderTreeSearch,
        folderTreeRecursiveCountsByPath,
        filteredFoldersForTree,
        pinnedSelections,
        recentSelections,
        loadFolders,
        handleSelectFolder,
        handleSelectAllFiles,
        togglePinnedSelection,
    } = useSidebarData();
    const previousHasFilterActivityRef = useRef(false);
    const previousHasToolAlertRef = useRef(false);



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
            ratingQuickFilter,
            ratings: normalizedRatings,
            types: [...selectedFileTypes],
        };
    }, [currentFolderId, filterMode, ratingFilter, ratingQuickFilter, searchQuery, searchTarget, searchExtraConditions, selectedFileTypes, selectedTagIds]);

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

    const handleOpenTemplateSmartFolderEditor = useCallback((templateKey: 'overall4plus' | 'unrated') => {
        const label = templateKey === 'overall4plus' ? '総合評価 4+' : '未評価のみ';
        setSmartFolderEditorState({
            mode: 'create',
            initialName: `${label} ${createDefaultSmartFolderName()}`,
            initialCondition: createSmartFolderTemplateCondition(templateKey),
        });
    }, [createDefaultSmartFolderName]);

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
            uiStore.clearSearchConditions(defaultSearchTarget);
            uiStore.setSelectedFileTypes([...ALL_FILE_TYPES]);
            uiStore.setRatingQuickFilter('none');
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
    }, [defaultSearchTarget, handleSelectFolder, setActiveSmartFolderId]);

    const handleOpenEditSmartFolderEditor = useCallback((id: string) => {
        setSmartFolderEditorState({
            mode: 'edit',
            smartFolderId: id,
        });
    }, []);

    const handleDuplicateSmartFolder = useCallback(async (id: string) => {
        const source = smartFolders.find((item) => item.id === id);
        if (!source) {
            window.alert('スマートフォルダが見つかりません');
            return;
        }

        try {
            await createSmartFolder(`${source.name} のコピー`, source.condition);
        } catch (error) {
            console.error('Failed to duplicate smart folder:', error);
            window.alert('スマートフォルダの複製に失敗しました');
        }
    }, [createSmartFolder, smartFolders]);

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
                ratingQuickFilter: 'none',
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
            ratingQuickFilter: 'none',
            tags: { ids: [], mode: 'OR' },
            ratings: {},
            types: [...ALL_FILE_TYPES],
        };
    }, [editingSmartFolder, smartFolderEditorState]);

    const hiddenScanIndicator = useMemo(() => {
        if (!scanProgress || isScanProgressVisible) return null;

        const summary = scanProgress.stats
            ? `新規 ${scanProgress.stats.newCount} / 更新 ${scanProgress.stats.updateCount} / スキップ ${scanProgress.stats.skipCount}${typeof scanProgress.stats.removedCount === 'number' ? ` / 削除 ${scanProgress.stats.removedCount}` : ''}`
            : scanProgress.message;
        const label = scanProgress.folderName
            ? `${scanProgress.folderName}`
            : scanProgress.phase === 'error'
                ? 'スキャンエラー'
                : scanProgress.phase === 'complete'
                    ? 'スキャン結果'
                    : 'スキャン中...';

        if (scanProgress.phase === 'complete') {
            return {
                icon: <CheckCircle2 size={18} className="flex-shrink-0 text-green-400" />,
                text: label,
                detail: summary,
                title: 'スキャン結果を表示',
                className: 'hover:bg-surface-800 text-green-400',
            };
        }

        if (scanProgress.phase === 'error') {
            return {
                icon: <AlertCircle size={18} className="flex-shrink-0 text-red-400" />,
                text: label,
                detail: summary,
                title: 'スキャン結果を表示',
                className: 'hover:bg-surface-800 text-red-400',
            };
        }

        return {
            icon: <Loader2 size={18} className="flex-shrink-0 animate-spin text-blue-400" />,
            text: label,
            detail: summary,
            title: 'スキャン中 - クリックで表示',
            className: 'hover:bg-surface-800 text-blue-400',
        };
    }, [isScanProgressVisible, scanProgress]);

    const activeRatingFilterCount = useMemo(() => (
        Object.values(ratingFilter).filter((range) => (
            typeof range.min === 'number' || typeof range.max === 'number'
        )).length
    ), [ratingFilter]);

    const hasSidebarFilterActivity = selectedTagIds.length > 0 || activeRatingFilterCount > 0 || ratingQuickFilter !== 'none';
    const hasToolAlert = !!hiddenScanIndicator;

    useEffect(() => {
        writeSidebarSectionState(sectionState);
    }, [sectionState]);

    useEffect(() => {
        if (hasSidebarFilterActivity && !previousHasFilterActivityRef.current) {
            setSectionState((prev) => (prev.filtersOpen ? prev : { ...prev, filtersOpen: true }));
        }
        previousHasFilterActivityRef.current = hasSidebarFilterActivity;
    }, [hasSidebarFilterActivity]);

    useEffect(() => {
        if (hasToolAlert && !previousHasToolAlertRef.current) {
            setSectionState((prev) => (prev.toolsOpen ? prev : { ...prev, toolsOpen: true }));
        }
        previousHasToolAlertRef.current = hasToolAlert;
    }, [hasToolAlert]);

    const filterSectionBadge = hasSidebarFilterActivity
        ? `適用中${selectedTagIds.length > 0 || activeRatingFilterCount > 1 || ratingQuickFilter !== 'none'
            ? ` ${selectedTagIds.length + activeRatingFilterCount + (ratingQuickFilter !== 'none' ? 1 : 0)}`
            : ''}`
        : null;
    const toolsSectionBadge = hasToolAlert ? '通知あり' : null;

    const toggleFiltersSection = useCallback(() => {
        setSectionState((prev) => ({ ...prev, filtersOpen: !prev.filtersOpen }));
    }, []);

    const toggleToolsSection = useCallback(() => {
        setSectionState((prev) => ({ ...prev, toolsOpen: !prev.toolsOpen }));
    }, []);


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
                    pinnedSelections={pinnedSelections}
                    recentSelections={recentSelections}
                    onSelectAllFiles={handleSelectAllFiles}
                    onOpenFolderScanSettingsManager={() => setFolderScanSettingsManagerOpen(true)}
                    onSelectFolder={handleSelectFolder}
                    onOpenFolderSettings={(folder) => {
                        setFolderSettingsTarget(folder);
                        setFolderSettingsOpen(true);
                    }}
                    onTogglePinnedSelection={togglePinnedSelection}
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
                    onOpenTemplateSmartFolderEditor={handleOpenTemplateSmartFolderEditor}
                    onApplySmartFolder={(smartFolderId) => { void handleApplySmartFolder(smartFolderId); }}
                    onDuplicateSmartFolder={(smartFolderId) => { void handleDuplicateSmartFolder(smartFolderId); }}
                    onOpenEditSmartFolderEditor={handleOpenEditSmartFolderEditor}
                    onDeleteSmartFolder={(smartFolderId, smartFolderName) => {
                        void handleDeleteSmartFolder(smartFolderId, smartFolderName);
                    }}
                />

                {/* Tag Filter Panel */}
                {!sidebarCollapsed && (
                    <SidebarToggleSection
                        icon={Filter}
                        title="フィルタ"
                        isOpen={sectionState.filtersOpen}
                        badge={filterSectionBadge}
                        onToggle={toggleFiltersSection}
                    >
                        <TagFilterPanel onOpenManager={() => setTagManagerOpen(true)} />
                        <RatingFilterPanel />
                    </SidebarToggleSection>
                )}

                {sidebarCollapsed ? (
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
                ) : (
                    <SidebarToggleSection
                        icon={Wrench}
                        title="ツール"
                        isOpen={sectionState.toolsOpen}
                        badge={toolsSectionBadge}
                        onToggle={toggleToolsSection}
                    >
                        <SidebarUtilityActions
                            sidebarCollapsed={sidebarCollapsed}
                            showTopSeparator={false}
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
                    </SidebarToggleSection>
                )}
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

