import { create } from 'zustand';
import type { MediaFile } from '../types/file';
import type { ToastData } from '../components/Toast';
import {
    DEFAULT_LIST_DISPLAY_SETTINGS,
    type DateGroupingMode,
    type DisplayMode,
    type GroupBy,
    type SearchTarget,
    type ThumbnailPresentation,
} from './useSettingsStore';
import { beginUiPerfTrace } from '../utils/perfDebug';
import type { RatingQuickFilter } from '../shared/ratingQuickFilter';
export type { RatingQuickFilter } from '../shared/ratingQuickFilter';
export type { SearchTarget } from './useSettingsStore';

export interface ScanProgress {
    jobId?: string;
    phase: 'counting' | 'scanning' | 'complete' | 'error';
    current: number;
    total: number;
    currentFile?: string;
    folderName?: string;
    message?: string;
    stats?: {
        newCount: number;
        updateCount: number;
        skipCount: number;
        removedCount?: number;
    };
}

export type SettingsModalTab = 'general' | 'thumbnails' | 'scan' | 'storage' | 'apps' | 'logs' | 'backup' | 'ratings' | 'maintenance' | 'organize';
export type LightboxOpenMode = 'default' | 'archive-audio' | 'archive-image';
export type FileSortBy = 'name' | 'date' | 'size' | 'type' | 'accessCount' | 'lastAccessed' | 'overallRating';
export type FileSortOrder = 'asc' | 'desc';
export interface SearchCondition {
    text: string;
    target: SearchTarget;
}

export interface ListDisplayDefaults {
    sortBy: FileSortBy;
    sortOrder: FileSortOrder;
    groupBy: GroupBy;
    dateGroupingMode: DateGroupingMode;
    displayMode: DisplayMode;
    activeDisplayPresetId: string;
    thumbnailPresentation: ThumbnailPresentation;
}

export interface ProfileScopedSavedFilterState {
    searchQuery: string;
    searchTarget: SearchTarget;
    ratingQuickFilter: RatingQuickFilter;
    selectedFileTypes: MediaFile['type'][];
}

export interface ProfileScopedUiDefaults {
    defaultSearchTarget: SearchTarget;
    listDisplayDefaults: ListDisplayDefaults;
    savedFilterState?: ProfileScopedSavedFilterState;
}

const ALL_FILE_TYPES: MediaFile['type'][] = ['video', 'image', 'archive', 'audio'];

interface UIState {
    sidebarWidth: number;
    sidebarCollapsed: boolean;
    viewMode: 'grid' | 'list';
    lightboxFile: MediaFile | null;
    lightboxOpenMode: LightboxOpenMode;
    lightboxStartTime: number | null;
    lightboxCurrentTime: number | null;
    searchQuery: string;
    searchTarget: SearchTarget;
    searchExtraConditions: SearchCondition[];
    ratingQuickFilter: RatingQuickFilter;
    currentSortBy: FileSortBy;
    currentSortOrder: FileSortOrder;
    currentGroupBy: GroupBy;
    currentDateGroupingMode: DateGroupingMode;
    currentDisplayMode: DisplayMode;
    currentActiveDisplayPresetId: string;
    currentThumbnailPresentation: ThumbnailPresentation;
    selectedFileTypes: MediaFile['type'][];
    settingsModalOpen: boolean;
    settingsModalRequestedTab: SettingsModalTab | null;
    scanProgress: ScanProgress | null;
    activeScanJobId: string | null;
    scanProgressAutoDismissPending: boolean;
    scanProgressLog: string[];
    toasts: ToastData[];
    duplicateViewOpen: boolean;
    mainView: 'grid' | 'profile';  // メインエリアの表示切り替え
    hoveredPreviewId: string | null;  // Phase 17-3: 同時再生制御用
    deleteDialogOpen: boolean;
    deleteDialogFilePaths: string[];
    deleteDialogFileIds: string[];
    // Phase 22-C-2: ファイル移動ダイアログ
    moveDialogOpen: boolean;
    moveFileIds: string[];  // 将来の複数選択対応
    moveCurrentFolderId: string | null;
    // #16: リネームダイアログ
    renameDialogFileId: string | null;
    renameDialogCurrentName: string;
    renameDialogCurrentPath: string;
    renameDialogSuggestedName: string;
    // Phase 23: 右サイドパネル
    isRightPanelOpen: boolean;
    previewContext: 'grid-hover' | 'right-panel' | null;  // プレビュー排他制御
    // アクション
    setSidebarWidth: (width: number) => void;
    toggleSidebar: () => void;
    setViewMode: (mode: 'grid' | 'list') => void;
    openLightbox: (file: MediaFile, mode?: LightboxOpenMode, startTime?: number | null) => void;
    closeLightbox: () => void;
    setLightboxCurrentTime: (timeSeconds: number | null) => void;
    setSearchQuery: (query: string) => void;
    setSearchTarget: (target: SearchTarget) => void;
    setSearchConditions: (conditions: SearchCondition[]) => void;
    clearSearchConditions: (target?: SearchTarget) => void;
    setRatingQuickFilter: (filter: RatingQuickFilter) => void;
    applyListDisplayDefaults: (defaults: ListDisplayDefaults) => void;
    applyProfileScopedUiDefaults: (defaults: ProfileScopedUiDefaults) => void;
    resetTransientStateForProfileSwitch: () => void;
    setCurrentSortBy: (sortBy: FileSortBy) => void;
    setCurrentSortOrder: (order: FileSortOrder) => void;
    setCurrentGroupBy: (groupBy: GroupBy) => void;
    setCurrentDateGroupingMode: (mode: DateGroupingMode) => void;
    setCurrentDisplayPreset: (selection: {
        id: string;
        baseDisplayMode: DisplayMode;
        thumbnailPresentation: ThumbnailPresentation;
    }) => void;
    setCurrentThumbnailPresentation: (presentation: ThumbnailPresentation) => void;
    toggleFileTypeFilter: (fileType: MediaFile['type']) => void;
    clearFileTypeFilter: () => void;
    setSelectedFileTypes: (types: MediaFile['type'][]) => void;
    openSettingsModal: (tab?: SettingsModalTab) => void;
    closeSettingsModal: () => void;
    setScanProgress: (progress: ScanProgress | null) => void;
    clearScanProgress: () => void;
    acknowledgeScanProgress: () => void;
    showToast: (message: string, type?: ToastData['type'], duration?: number) => void;
    removeToast: (id: string) => void;
    openDuplicateView: () => void;
    closeDuplicateView: () => void;
    setDuplicateViewOpen: (open: boolean) => void;
    setMainView: (view: 'grid' | 'profile') => void;
    setHoveredPreview: (id: string | null) => void;  // Phase 17-3
    isScanProgressVisible: boolean;
    setScanProgressVisible: (visible: boolean) => void;
    openDeleteDialog: (fileIds: string[], filePaths: string[]) => void;
    closeDeleteDialog: () => void;
    // Phase 22-C-2
    openMoveDialog: (fileIds: string[], currentFolderId: string | null) => void;
    closeMoveDialog: () => void;
    // #16: リネームダイアログ
    openRenameDialog: (fileId: string, currentName: string, currentPath: string, suggestedName?: string) => void;
    closeRenameDialog: () => void;
    // Phase 23: 右サイドパネル
    toggleRightPanel: () => void;
    setPreviewContext: (ctx: 'grid-hover' | 'right-panel' | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
    sidebarWidth: 250,
    sidebarCollapsed: false,
    viewMode: 'grid',
    lightboxFile: null,
    lightboxOpenMode: 'default',
    lightboxStartTime: null,
    lightboxCurrentTime: null,
    searchQuery: '',
    searchTarget: 'fileName',
    searchExtraConditions: [],
    ratingQuickFilter: 'none',
    currentSortBy: 'date',
    currentSortOrder: 'desc',
    currentGroupBy: 'none',
    currentDateGroupingMode: 'auto',
    currentDisplayMode: 'standard',
    currentActiveDisplayPresetId: 'standard',
    currentThumbnailPresentation: 'modeDefault',
    selectedFileTypes: [...ALL_FILE_TYPES],
    settingsModalOpen: false,
    settingsModalRequestedTab: null,
    scanProgress: null,
    activeScanJobId: null,
    scanProgressAutoDismissPending: false,
    scanProgressLog: [],
    toasts: [],
    duplicateViewOpen: false,
    mainView: 'grid',
    hoveredPreviewId: null,  // Phase 17-3
    isScanProgressVisible: false,
    deleteDialogOpen: false,
    deleteDialogFilePaths: [],
    deleteDialogFileIds: [],
    // Phase 22-C-2
    moveDialogOpen: false,
    moveFileIds: [],
    moveCurrentFolderId: null,
    // #16: リネームダイアログ
    renameDialogFileId: null,
    renameDialogCurrentName: '',
    renameDialogCurrentPath: '',
    renameDialogSuggestedName: '',
    // Phase 23: 右サイドパネル
    isRightPanelOpen: true,
    previewContext: null,

    setSidebarWidth: (width) => set({ sidebarWidth: width }),
    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    setViewMode: (viewMode) => set({ viewMode }),
    openLightbox: (file, mode = 'default', startTime = null) => {
        beginUiPerfTrace('center-viewer-open', { fileId: file.id, fileType: file.type, mode });
        set({ lightboxFile: file, lightboxOpenMode: mode, lightboxStartTime: startTime, lightboxCurrentTime: null });
    },
    closeLightbox: () => set({ lightboxFile: null, lightboxOpenMode: 'default', lightboxStartTime: null, lightboxCurrentTime: null }),
    setLightboxCurrentTime: (lightboxCurrentTime) => set({ lightboxCurrentTime }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setSearchTarget: (target) => set({ searchTarget: target }),
    setSearchConditions: (conditions) => set(() => {
        const normalized: SearchCondition[] = conditions
            .map((condition) => ({
                text: typeof condition?.text === 'string' ? condition.text : '',
                target: condition?.target === 'folderName'
                    ? ('folderName' as SearchTarget)
                    : ('fileName' as SearchTarget),
            }))
            .filter((condition) => condition.text.trim().length > 0);

        const first = normalized[0] ?? { text: '', target: 'fileName' as const };
        return {
            searchQuery: first.text,
            searchTarget: first.target,
            searchExtraConditions: normalized.slice(1),
        };
    }),
    clearSearchConditions: (target) => set((state) => ({
        searchQuery: '',
        searchTarget: target ?? state.searchTarget,
        searchExtraConditions: [],
    })),
    setRatingQuickFilter: (ratingQuickFilter) => set({ ratingQuickFilter }),
    applyListDisplayDefaults: (defaults) => set({
        currentSortBy: defaults.sortBy,
        currentSortOrder: defaults.sortOrder,
        currentGroupBy: defaults.groupBy,
        currentDateGroupingMode: defaults.dateGroupingMode,
        currentDisplayMode: defaults.displayMode,
        currentActiveDisplayPresetId: defaults.activeDisplayPresetId,
        currentThumbnailPresentation: defaults.thumbnailPresentation,
    }),
    applyProfileScopedUiDefaults: ({ defaultSearchTarget, listDisplayDefaults, savedFilterState }) => set({
        searchQuery: savedFilterState?.searchQuery ?? '',
        searchTarget: savedFilterState?.searchTarget ?? defaultSearchTarget,
        searchExtraConditions: [],
        ratingQuickFilter: savedFilterState?.ratingQuickFilter ?? 'none',
        currentSortBy: listDisplayDefaults.sortBy,
        currentSortOrder: listDisplayDefaults.sortOrder,
        currentGroupBy: listDisplayDefaults.groupBy,
        currentDateGroupingMode: listDisplayDefaults.dateGroupingMode,
        currentDisplayMode: listDisplayDefaults.displayMode,
        currentActiveDisplayPresetId: listDisplayDefaults.activeDisplayPresetId,
        currentThumbnailPresentation: listDisplayDefaults.thumbnailPresentation,
        selectedFileTypes: savedFilterState?.selectedFileTypes?.length
            ? [...savedFilterState.selectedFileTypes]
            : [...ALL_FILE_TYPES],
    }),
    resetTransientStateForProfileSwitch: () => set({
        lightboxFile: null,
        lightboxOpenMode: 'default',
        lightboxStartTime: null,
        lightboxCurrentTime: null,
        searchQuery: '',
        searchTarget: DEFAULT_LIST_DISPLAY_SETTINGS.defaultSearchTarget,
        searchExtraConditions: [],
        ratingQuickFilter: 'none',
        currentSortBy: DEFAULT_LIST_DISPLAY_SETTINGS.sortBy,
        currentSortOrder: DEFAULT_LIST_DISPLAY_SETTINGS.sortOrder,
        currentGroupBy: DEFAULT_LIST_DISPLAY_SETTINGS.groupBy,
        currentDateGroupingMode: DEFAULT_LIST_DISPLAY_SETTINGS.dateGroupingMode,
        currentDisplayMode: DEFAULT_LIST_DISPLAY_SETTINGS.displayMode,
        currentActiveDisplayPresetId: DEFAULT_LIST_DISPLAY_SETTINGS.activeDisplayPresetId,
        currentThumbnailPresentation: DEFAULT_LIST_DISPLAY_SETTINGS.thumbnailPresentation,
        selectedFileTypes: [...ALL_FILE_TYPES],
        settingsModalOpen: false,
        settingsModalRequestedTab: null,
        scanProgress: null,
        activeScanJobId: null,
        scanProgressAutoDismissPending: false,
        scanProgressLog: [],
        duplicateViewOpen: false,
        mainView: 'grid',
        hoveredPreviewId: null,
        deleteDialogOpen: false,
        deleteDialogFilePaths: [],
        deleteDialogFileIds: [],
        moveDialogOpen: false,
        moveFileIds: [],
        moveCurrentFolderId: null,
        renameDialogFileId: null,
        renameDialogCurrentName: '',
        renameDialogCurrentPath: '',
        renameDialogSuggestedName: '',
        previewContext: null,
    }),
    setCurrentSortBy: (currentSortBy) => set({ currentSortBy }),
    setCurrentSortOrder: (currentSortOrder) => set({ currentSortOrder }),
    setCurrentGroupBy: (currentGroupBy) => set({ currentGroupBy }),
    setCurrentDateGroupingMode: (currentDateGroupingMode) => set({ currentDateGroupingMode }),
    setCurrentDisplayPreset: (selection) => set({
        currentDisplayMode: selection.baseDisplayMode,
        currentActiveDisplayPresetId: selection.id,
        currentThumbnailPresentation: selection.thumbnailPresentation,
    }),
    setCurrentThumbnailPresentation: (currentThumbnailPresentation) => set({ currentThumbnailPresentation }),
    toggleFileTypeFilter: (fileType) => set((state) => ({
        selectedFileTypes: state.selectedFileTypes.includes(fileType)
            ? state.selectedFileTypes.filter((type) => type !== fileType)
            : [...state.selectedFileTypes, fileType],
    })),
    clearFileTypeFilter: () => set({ selectedFileTypes: [...ALL_FILE_TYPES] }),
    setSelectedFileTypes: (types) => set({
        selectedFileTypes: Array.from(new Set(types.filter((type): type is MediaFile['type'] => (
            type === 'video' || type === 'image' || type === 'archive' || type === 'audio'
        )))),
    }),
    openSettingsModal: (tab) => {
        beginUiPerfTrace('settings-modal-open', { requestedTab: tab ?? 'general' });
        set({ settingsModalOpen: true, settingsModalRequestedTab: tab ?? null });
    },
    closeSettingsModal: () => set({ settingsModalOpen: false }),
    setScanProgress: (progress) => set((state) => {
        if (!progress) {
            return {
                scanProgress: null,
                activeScanJobId: null,
                scanProgressAutoDismissPending: false,
            };
        }

        const currentActiveJobId = state.activeScanJobId;
        if (
            progress.jobId &&
            currentActiveJobId &&
            progress.jobId !== currentActiveJobId &&
            (progress.phase === 'complete' || progress.phase === 'error')
        ) {
            return state;
        }

        const nextActiveJobId =
            progress.jobId && (progress.phase === 'counting' || progress.phase === 'scanning')
                ? progress.jobId
                : progress.jobId && progress.jobId === currentActiveJobId
                    ? null
                    : currentActiveJobId;

        // ログキューの更新
        const MAX_LOG_ENTRIES = 50;
        let nextLog = state.scanProgressLog;
        if (progress.phase === 'counting' && state.scanProgress?.phase !== 'counting') {
            // 新しいスキャン開始時にログをリセット
            nextLog = ['ファイル数を集計中...'];
        } else if (progress.phase === 'scanning' && progress.currentFile && progress.message) {
            const entry = `${progress.currentFile} — ${progress.message}`;
            if (nextLog[nextLog.length - 1] !== entry) {
                nextLog = [...nextLog, entry].slice(-MAX_LOG_ENTRIES);
            }
        } else if (progress.phase === 'complete') {
            const s = progress.stats;
            const summary = s
                ? `完了: 新規 ${s.newCount} / 更新 ${s.updateCount} / スキップ ${s.skipCount}${s.removedCount ? ` / 削除 ${s.removedCount}` : ''}`
                : '完了';
            nextLog = [...nextLog, summary].slice(-MAX_LOG_ENTRIES);
        } else if (progress.phase === 'error') {
            nextLog = [...nextLog, `エラー: ${progress.message || '不明なエラー'}`].slice(-MAX_LOG_ENTRIES);
        }

        return {
            scanProgress: progress,
            activeScanJobId: nextActiveJobId,
            scanProgressLog: nextLog,
            scanProgressAutoDismissPending:
                progress.phase === 'complete' || progress.phase === 'error'
                    ? true
                    : progress.phase === 'counting' || progress.phase === 'scanning'
                        ? false
                        : state.scanProgressAutoDismissPending,
            // NOTE:
            // スキャン開始時のみ UX 向上のため自動表示する。
            // それ以外のフェーズではユーザーの表示選択を尊重し、状態は変更しない。
            isScanProgressVisible:
                progress.phase === 'counting' ||
                    (progress.phase === 'scanning' &&
                        state.scanProgress?.phase !== 'counting' &&
                        state.scanProgress?.phase !== 'scanning')
                    ? true
                    : state.isScanProgressVisible
        };
    }),
    clearScanProgress: () => set({ scanProgress: null, activeScanJobId: null, isScanProgressVisible: false, scanProgressAutoDismissPending: false, scanProgressLog: [] }),
    acknowledgeScanProgress: () => set({ scanProgressAutoDismissPending: false }),
    setScanProgressVisible: (visible) => set({ isScanProgressVisible: visible }),
    showToast: (message: string, type: ToastData['type'] = 'info', duration = 3000) => set((state) => ({
        toasts: [...state.toasts, { id: Date.now().toString(), message, type, duration }]
    })),
    removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
    })),
    openDuplicateView: () => set({ duplicateViewOpen: true }),
    closeDuplicateView: () => set({ duplicateViewOpen: false }),
    setDuplicateViewOpen: (open) => set({ duplicateViewOpen: open }),
    setMainView: (view) => set({ mainView: view }),
    openDeleteDialog: (fileIds, filePaths) => set({
        deleteDialogOpen: true,
        deleteDialogFileIds: [...fileIds],
        deleteDialogFilePaths: [...filePaths],
    }),
    closeDeleteDialog: () => set({ deleteDialogOpen: false, deleteDialogFilePaths: [], deleteDialogFileIds: [] }),
    // Phase 22-C-2
    openMoveDialog: (fileIds, currentFolderId) => set({ moveDialogOpen: true, moveFileIds: fileIds, moveCurrentFolderId: currentFolderId }),
    closeMoveDialog: () => set({ moveDialogOpen: false, moveFileIds: [], moveCurrentFolderId: null }),

    // #16: リネームダイアログ
    openRenameDialog: (fileId, currentName, currentPath, suggestedName) => set({
        renameDialogFileId: fileId,
        renameDialogCurrentName: currentName,
        renameDialogCurrentPath: currentPath,
        renameDialogSuggestedName: suggestedName ?? currentName,
    }),
    closeRenameDialog: () => set({
        renameDialogFileId: null,
        renameDialogCurrentName: '',
        renameDialogCurrentPath: '',
        renameDialogSuggestedName: '',
    }),

    // Phase 17-3: 同時再生制御
    setHoveredPreview: (id) => set({ hoveredPreviewId: id }),

    // Phase 23: 右サイドパネル
    toggleRightPanel: () => set((state) => {
        beginUiPerfTrace('right-panel-toggle', { open: !state.isRightPanelOpen });
        return { isRightPanelOpen: !state.isRightPanelOpen };
    }),
    setPreviewContext: (ctx) => set({ previewContext: ctx }),
}));
