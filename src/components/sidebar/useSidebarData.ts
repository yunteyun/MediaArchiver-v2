import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useFileStore } from '../../stores/useFileStore';
import { useSmartFolderStore } from '../../stores/useSmartFolderStore';
import { useUIStore } from '../../stores/useUIStore';
import type { MediaFile, MediaFolder } from '../../types/file';
import {
    ALL_FILES_ID,
    DRIVE_PREFIX,
    FOLDER_PREFIX,
    normalizeSidebarSelection,
    VIRTUAL_FOLDER_PREFIX,
    VIRTUAL_FOLDER_RECURSIVE_PREFIX,
} from './sidebarShared';

const PROGRESSIVE_REFRESH_DEBOUNCE_MS = 1200;
const PINNED_SELECTIONS_STORAGE_KEY = 'sidebar.pinnedSelections.v1';
const RECENT_SELECTIONS_STORAGE_KEY = 'sidebar.recentSelections.v1';
const MAX_RECENT_SELECTIONS = 6;

function readPersistedSelectionList(key: string): string[] {
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((value): value is string => typeof value === 'string');
    } catch {
        return [];
    }
}

function writePersistedSelectionList(key: string, values: string[]) {
    try {
        window.localStorage.setItem(key, JSON.stringify(values));
    } catch {
        // ignore localStorage failures
    }
}

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

function buildVirtualFolders(registeredFolders: MediaFolder[], treePaths: string[]): MediaFolder[] {
    const registeredPathSet = new Set(
        registeredFolders.map((folder) => String(folder.path).toLowerCase())
    );

    return treePaths
        .filter((folderPath) => !registeredPathSet.has(String(folderPath).toLowerCase()))
        .map((folderPath) => {
            const normalizedPath = String(folderPath);
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
            };
        });
}

function filterFoldersForTree(folders: MediaFolder[], query: string): MediaFolder[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return folders;

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
        folders.forEach((folder) => {
            const path = String(folder.path).toLowerCase();
            if (path.startsWith(prefix)) {
                include.add(path);
            }
        });
    };

    folders.forEach((folder) => {
        const name = String(folder.name || '').toLowerCase();
        const folderPath = String(folder.path || '');
        const normalizedPath = folderPath.toLowerCase();
        if (name.includes(normalizedQuery) || normalizedPath.includes(normalizedQuery)) {
            addAncestors(folderPath);
            addDescendants(folderPath);
        }
    });

    return folders.filter((folder) => include.has(String(folder.path).toLowerCase()));
}

interface UseSidebarDataResult {
    currentFolderId: string | null;
    folders: MediaFolder[];
    folderTreeSearch: string;
    setFolderTreeSearch: Dispatch<SetStateAction<string>>;
    folderTreeRecursiveCountsByPath: Record<string, number>;
    filteredFoldersForTree: MediaFolder[];
    pinnedSelections: string[];
    recentSelections: string[];
    loadFolders: () => Promise<void>;
    handleSelectFolder: (folderId: string | null) => Promise<void>;
    handleSelectAllFiles: () => void;
    togglePinnedSelection: (selection: string) => void;
}

export function useSidebarData(): UseSidebarDataResult {
    const currentFolderId = useFileStore((state) => state.currentFolderId);
    const setFiles = useFileStore((state) => state.setFiles);
    const setCurrentFolderId = useFileStore((state) => state.setCurrentFolderId);
    const duplicateViewOpen = useUIStore((state) => state.duplicateViewOpen);
    const mainView = useUIStore((state) => state.mainView);
    const setActiveSmartFolderId = useSmartFolderStore((state) => state.setActiveSmartFolderId);

    const [folders, setFolders] = useState<MediaFolder[]>([]);
    const [folderTreeSearch, setFolderTreeSearch] = useState('');
    const [folderTreeRecursiveCountsByPath, setFolderTreeRecursiveCountsByPath] = useState<Record<string, number>>({});
    const [pinnedSelections, setPinnedSelections] = useState<string[]>(() => readPersistedSelectionList(PINNED_SELECTIONS_STORAGE_KEY));
    const [recentSelections, setRecentSelections] = useState<string[]>(() => readPersistedSelectionList(RECENT_SELECTIONS_STORAGE_KEY));
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
            const [registeredFolders, treeStats] = await Promise.all([
                window.electronAPI.getFolders(),
                window.electronAPI.getFolderTreeStats(),
            ]);
            const treePaths = treeStats?.paths || [];
            setFolderTreeRecursiveCountsByPath(treeStats?.recursiveCountsByPath || {});

            const virtualFolders = buildVirtualFolders(registeredFolders, treePaths);
            setFolders([...registeredFolders, ...virtualFolders]);

            if (perfDebugEnabled) {
                console.debug('[perf][Sidebar][loadFolders]', {
                    registeredCount: registeredFolders.length,
                    virtualFolderCount: virtualFolders.length,
                    elapsedMs: Number((performance.now() - start).toFixed(2)),
                });
            }
        } catch (error) {
            if (perfDebugEnabled) {
                console.debug('[perf][Sidebar][loadFolders]', {
                    status: 'error',
                    error: error instanceof Error ? error.message : String(error),
                    elapsedMs: Number((performance.now() - start).toFixed(2)),
                });
            }
            console.error('Failed to load folders:', error);
        }
    }, [perfDebugEnabled]);

    const loadFilesForSelection = useCallback(async (
        folderId: string | null,
        options?: { reloadTagCache?: boolean }
    ): Promise<MediaFile[]> => {
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
        const normalizedSelection = normalizeSidebarSelection(folderId);
        setActiveSmartFolderId(null);
        setCurrentFolderId(folderId);
        setRecentSelections((prev) => {
            const next = [normalizedSelection, ...prev.filter((value) => value !== normalizedSelection)].slice(0, MAX_RECENT_SELECTIONS);
            return next;
        });
        useUIStore.getState().closeDuplicateView();
        useUIStore.getState().setMainView('grid');

        try {
            const loadedFiles = await loadFilesForSelection(folderId);
            if (perfDebugEnabled) {
                console.debug('[perf][Sidebar][handleSelectFolder]', {
                    folderId: folderId ?? ALL_FILES_ID,
                    fileCount: loadedFiles.length,
                    elapsedMs: Number((performance.now() - start).toFixed(2)),
                });
            }
        } catch (error) {
            if (perfDebugEnabled) {
                console.debug('[perf][Sidebar][handleSelectFolder]', {
                    folderId: folderId ?? ALL_FILES_ID,
                    status: 'error',
                    error: error instanceof Error ? error.message : String(error),
                    elapsedMs: Number((performance.now() - start).toFixed(2)),
                });
            }
            console.error('Error loading files:', error);
        }
    }, [loadFilesForSelection, perfDebugEnabled, setActiveSmartFolderId, setCurrentFolderId]);

    const handleSelectAllFiles = useCallback(() => {
        void handleSelectFolder(ALL_FILES_ID);
    }, [handleSelectFolder]);

    const togglePinnedSelection = useCallback((selection: string) => {
        const normalizedSelection = normalizeSidebarSelection(selection);
        setPinnedSelections((prev) => (
            prev.includes(normalizedSelection)
                ? prev.filter((value) => value !== normalizedSelection)
                : [...prev, normalizedSelection]
        ));
    }, []);

    const filteredFoldersForTree = useMemo(() => {
        return filterFoldersForTree(folders, folderTreeSearch);
    }, [folders, folderTreeSearch]);

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
        void loadFolders();

        const { currentFolderId: initialFolderId, files: initialFiles } = useFileStore.getState();
        if (initialFolderId === null && initialFiles.length === 0) {
            void handleSelectFolder(ALL_FILES_ID);
        }
    }, [handleSelectFolder, loadFolders]);

    useEffect(() => {
        writePersistedSelectionList(PINNED_SELECTIONS_STORAGE_KEY, pinnedSelections);
    }, [pinnedSelections]);

    useEffect(() => {
        writePersistedSelectionList(RECENT_SELECTIONS_STORAGE_KEY, recentSelections);
    }, [recentSelections]);

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
    }, [
        currentFolderId,
        handleSelectFolder,
        isCurrentViewAffectedByScanBatch,
        loadFolders,
        scheduleProgressiveRefresh,
        setCurrentFolderId,
        setFiles,
    ]);

    return {
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
    };
}
