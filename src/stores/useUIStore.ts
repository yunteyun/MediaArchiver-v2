import { create } from 'zustand';
import type { MediaFile } from '../types/file';
import type { ToastData } from '../components/Toast';
import type { DisplayMode, GroupBy, SearchTarget, ThumbnailPresentation } from './useSettingsStore';
import { beginUiPerfTrace } from '../utils/perfDebug';

export interface ScanProgress {
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

export type SettingsModalTab = 'general' | 'thumbnails' | 'scan' | 'storage' | 'apps' | 'logs' | 'backup' | 'ratings' | 'maintenance';
export type LightboxOpenMode = 'default' | 'archive-audio' | 'archive-image';
export type FileSortBy = 'name' | 'date' | 'size' | 'type' | 'accessCount' | 'lastAccessed' | 'overallRating';
export type FileSortOrder = 'asc' | 'desc';
export type RatingQuickFilter = 'none' | 'overall4plus' | 'unrated';
export interface SearchCondition {
    text: string;
    target: SearchTarget;
}

export interface ListDisplayDefaults {
    sortBy: FileSortBy;
    sortOrder: FileSortOrder;
    groupBy: GroupBy;
    displayMode: DisplayMode;
    activeDisplayPresetId: string;
    thumbnailPresentation: ThumbnailPresentation;
}

interface UIState {
    sidebarWidth: number;
    sidebarCollapsed: boolean;
    viewMode: 'grid' | 'list';
    lightboxFile: MediaFile | null;
    lightboxOpenMode: LightboxOpenMode;
    lightboxStartTime: number | null;
    searchQuery: string;
    searchTarget: SearchTarget;
    searchExtraConditions: SearchCondition[];
    ratingQuickFilter: RatingQuickFilter;
    currentSortBy: FileSortBy;
    currentSortOrder: FileSortOrder;
    currentGroupBy: GroupBy;
    currentDisplayMode: DisplayMode;
    currentActiveDisplayPresetId: string;
    currentThumbnailPresentation: ThumbnailPresentation;
    selectedFileTypes: MediaFile['type'][];
    settingsModalOpen: boolean;
    settingsModalRequestedTab: SettingsModalTab | null;
    scanProgress: ScanProgress | null;
    scanProgressAutoDismissPending: boolean;
    toasts: ToastData[];
    duplicateViewOpen: boolean;
    mainView: 'grid' | 'profile';  // メインエリアの表示切り替え
    hoveredPreviewId: string | null;  // Phase 17-3: 同時再生制御用
    deleteDialogOpen: boolean;
    deleteDialogFilePath: string | null;
    deleteDialogFileId: string | null;
    // Phase 22-C-2: ファイル移動ダイアログ
    moveDialogOpen: boolean;
    moveFileIds: string[];  // 将来の複数選択対応
    moveCurrentFolderId: string | null;
    // Phase 23: 右サイドパネル
    isRightPanelOpen: boolean;
    previewContext: 'grid-hover' | 'right-panel' | null;  // プレビュー排他制御
    // アクション
    setSidebarWidth: (width: number) => void;
    toggleSidebar: () => void;
    setViewMode: (mode: 'grid' | 'list') => void;
    openLightbox: (file: MediaFile, mode?: LightboxOpenMode, startTime?: number | null) => void;
    closeLightbox: () => void;
    setSearchQuery: (query: string) => void;
    setSearchTarget: (target: SearchTarget) => void;
    setSearchConditions: (conditions: SearchCondition[]) => void;
    clearSearchConditions: (target?: SearchTarget) => void;
    setRatingQuickFilter: (filter: RatingQuickFilter) => void;
    applyListDisplayDefaults: (defaults: ListDisplayDefaults) => void;
    setCurrentSortBy: (sortBy: FileSortBy) => void;
    setCurrentSortOrder: (order: FileSortOrder) => void;
    setCurrentGroupBy: (groupBy: GroupBy) => void;
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
    openDeleteDialog: (fileId: string, filePath: string) => void;
    closeDeleteDialog: () => void;
    // Phase 22-C-2
    openMoveDialog: (fileIds: string[], currentFolderId: string | null) => void;
    closeMoveDialog: () => void;
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
    searchQuery: '',
    searchTarget: 'fileName',
    searchExtraConditions: [],
    ratingQuickFilter: 'none',
    currentSortBy: 'date',
    currentSortOrder: 'desc',
    currentGroupBy: 'none',
    currentDisplayMode: 'standard',
    currentActiveDisplayPresetId: 'standard',
    currentThumbnailPresentation: 'modeDefault',
    selectedFileTypes: ['video', 'image', 'archive', 'audio'],
    settingsModalOpen: false,
    settingsModalRequestedTab: null,
    scanProgress: null,
    scanProgressAutoDismissPending: false,
    toasts: [],
    duplicateViewOpen: false,
    mainView: 'grid',
    hoveredPreviewId: null,  // Phase 17-3
    isScanProgressVisible: false,
    deleteDialogOpen: false,
    deleteDialogFilePath: null,
    deleteDialogFileId: null,
    // Phase 22-C-2
    moveDialogOpen: false,
    moveFileIds: [],
    moveCurrentFolderId: null,
    // Phase 23: 右サイドパネル
    isRightPanelOpen: true,
    previewContext: null,

    setSidebarWidth: (width) => set({ sidebarWidth: width }),
    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    setViewMode: (viewMode) => set({ viewMode }),
    openLightbox: (file, mode = 'default', startTime = null) => {
        beginUiPerfTrace('center-viewer-open', { fileId: file.id, fileType: file.type, mode });
        set({ lightboxFile: file, lightboxOpenMode: mode, lightboxStartTime: startTime });
    },
    closeLightbox: () => set({ lightboxFile: null, lightboxOpenMode: 'default', lightboxStartTime: null }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setSearchTarget: (target) => set({ searchTarget: target }),
    setSearchConditions: (conditions) => set(() => {
        const normalized = conditions
            .map((condition) => ({
                text: typeof condition?.text === 'string' ? condition.text : '',
                target: condition?.target === 'folderName' ? 'folderName' : 'fileName',
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
        currentDisplayMode: defaults.displayMode,
        currentActiveDisplayPresetId: defaults.activeDisplayPresetId,
        currentThumbnailPresentation: defaults.thumbnailPresentation,
    }),
    setCurrentSortBy: (currentSortBy) => set({ currentSortBy }),
    setCurrentSortOrder: (currentSortOrder) => set({ currentSortOrder }),
    setCurrentGroupBy: (currentGroupBy) => set({ currentGroupBy }),
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
    clearFileTypeFilter: () => set({ selectedFileTypes: ['video', 'image', 'archive', 'audio'] }),
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
    setScanProgress: (progress) => set((state) => ({
        scanProgress: progress,
        scanProgressAutoDismissPending:
            progress?.phase === 'complete' || progress?.phase === 'error'
                ? true
                : progress?.phase === 'counting' || progress?.phase === 'scanning'
                    ? false
                    : state.scanProgressAutoDismissPending,
        // NOTE:
        // スキャン開始時のみ UX 向上のため自動表示する。
        // それ以外のフェーズではユーザーの表示選択を尊重し、状態は変更しない。
        isScanProgressVisible:
            progress?.phase === 'counting' ||
                (progress?.phase === 'scanning' &&
                    state.scanProgress?.phase !== 'counting' &&
                    state.scanProgress?.phase !== 'scanning')
                ? true
                : state.isScanProgressVisible
    })),
    clearScanProgress: () => set({ scanProgress: null, isScanProgressVisible: false, scanProgressAutoDismissPending: false }),
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
    openDeleteDialog: (fileId, filePath) => set({ deleteDialogOpen: true, deleteDialogFileId: fileId, deleteDialogFilePath: filePath }),
    closeDeleteDialog: () => set({ deleteDialogOpen: false, deleteDialogFilePath: null, deleteDialogFileId: null }),
    // Phase 22-C-2
    openMoveDialog: (fileIds, currentFolderId) => set({ moveDialogOpen: true, moveFileIds: fileIds, moveCurrentFolderId: currentFolderId }),
    closeMoveDialog: () => set({ moveDialogOpen: false, moveFileIds: [], moveCurrentFolderId: null }),

    // Phase 17-3: 同時再生制御
    setHoveredPreview: (id) => set({ hoveredPreviewId: id }),

    // Phase 23: 右サイドパネル
    toggleRightPanel: () => set((state) => {
        beginUiPerfTrace('right-panel-toggle', { open: !state.isRightPanelOpen });
        return { isRightPanelOpen: !state.isRightPanelOpen };
    }),
    setPreviewContext: (ctx) => set({ previewContext: ctx }),
}));
