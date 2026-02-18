import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script - Renderer と Main プロセス間の安全なブリッジ
 * 
 * contextBridge を使用して、Renderer プロセスから Main プロセスの
 * 機能に安全にアクセスできるAPIを公開します。
 */

contextBridge.exposeInMainWorld('electronAPI', {
    // === Database ===
    getFiles: (folderId?: string) => ipcRenderer.invoke('db:getFiles', folderId),
    getFileById: (fileId: string) => ipcRenderer.invoke('db:getFileById', fileId),

    // === Folder ===
    addFolder: (folderPath: string) => ipcRenderer.invoke('folder:add', folderPath),
    getFolders: () => ipcRenderer.invoke('folder:list'),
    deleteFolder: (folderId: string) => ipcRenderer.invoke('folder:delete', folderId),
    getFolderMetadata: () => ipcRenderer.invoke('folder:getMetadata'),

    // Phase 22-C: ドライブ/フォルダ配下の全ファイル取得
    getFilesByDrive: (drive: string) => ipcRenderer.invoke('getFilesByDrive', drive),
    getFilesByFolderRecursive: (folderId: string) => ipcRenderer.invoke('getFilesByFolderRecursive', folderId),

    // === Scanner ===
    scanFolder: (folderPath: string) => ipcRenderer.invoke('scanner:start', folderPath),

    // === App ===
    openExternal: (path: string) => ipcRenderer.invoke('app:openExternal', path),
    showInExplorer: (path: string) => ipcRenderer.invoke('app:showInExplorer', path),
    getLogs: (lines?: number) => ipcRenderer.invoke('app:getLogs', lines),
    openLogFolder: () => ipcRenderer.invoke('app:openLogFolder'),
    selectFile: () => ipcRenderer.invoke('app:selectFile'),
    validatePath: (appPath: string) => ipcRenderer.invoke('app:validatePath', appPath),
    setExternalApps: (apps: any[]) => ipcRenderer.invoke('app:setExternalApps', apps),
    openWithApp: (filePath: string, appPath: string, fileId?: string) => ipcRenderer.invoke('app:openWithApp', filePath, appPath, fileId),

    // === File Operations ===
    updateFileNotes: (fileId: string, notes: string) =>
        ipcRenderer.invoke('file:updateNotes', { fileId, notes }),

    // Phase 17: Access Count
    incrementAccessCount: (fileId: string) =>
        ipcRenderer.invoke('file:incrementAccessCount', fileId),
    incrementExternalOpenCount: (fileId: string) =>
        ipcRenderer.invoke('file:incrementExternalOpenCount', fileId),

    // === Dialog ===
    selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),

    // === Events (Main -> Renderer) ===
    onScanProgress: (callback: (progress: any) => void) => {
        const subscription = (_event: any, progress: any) => callback(progress);
        ipcRenderer.on('scanner:progress', subscription);
        // Return a cleanup function if needed, but for now specific implementation
        return () => {
            ipcRenderer.removeListener('scanner:progress', subscription);
        };
    },
    cancelScan: () => ipcRenderer.invoke('scanner:cancel'),
    setPreviewFrameCount: (count: number) => ipcRenderer.invoke('scanner:setPreviewFrameCount', count),
    setScanThrottleMs: (ms: number) => ipcRenderer.invoke('scanner:setScanThrottleMs', ms),
    setThumbnailResolution: (resolution: number) => ipcRenderer.invoke('scanner:setThumbnailResolution', resolution),
    autoScan: () => ipcRenderer.invoke('scanner:autoScan'),

    // === Context Menu ===
    showFolderContextMenu: (folderId: string, path: string) =>
        ipcRenderer.invoke('folder:showContextMenu', { folderId, path }),

    onFolderDeleted: (callback: (folderId: string) => void) => {
        const handler = (_event: any, folderId: string) => callback(folderId);
        ipcRenderer.on('folder:deleted', handler);
        return () => ipcRenderer.removeListener('folder:deleted', handler);
    },

    onFolderRescanComplete: (callback: (folderId: string) => void) => {
        const handler = (_event: any, folderId: string) => callback(folderId);
        ipcRenderer.on('folder:rescanComplete', handler);
        return () => ipcRenderer.removeListener('folder:rescanComplete', handler);
    },

    // === File Context Menu ===
    showFileContextMenu: (fileId: string, path: string, selectedFileIds?: string[]) =>
        ipcRenderer.invoke('file:showContextMenu', { fileId, filePath: path, selectedFileIds }),

    onFileDeleted: (callback: (fileId: string) => void) => {
        const handler = (_event: any, fileId: string) => callback(fileId);
        ipcRenderer.on('file:deleted', handler);
        return () => ipcRenderer.removeListener('file:deleted', handler);
    },

    onThumbnailRegenerated: (callback: (fileId: string) => void) => {
        const handler = (_event: any, fileId: string) => callback(fileId);
        ipcRenderer.on('file:thumbnailRegenerated', handler);
        return () => ipcRenderer.removeListener('file:thumbnailRegenerated', handler);
    },

    onExternalOpenCountUpdated: (callback: (data: { fileId: string; externalOpenCount: number; lastExternalOpenedAt: number }) => void) => {
        const handler = (_event: any, data: any) => callback(data);
        ipcRenderer.on('file:externalOpenCountUpdated', handler);
        return () => ipcRenderer.removeListener('file:externalOpenCountUpdated', handler);
    },

    // Phase 22-C-2: ファイル移動ダイアログ
    onOpenMoveDialog: (callback: (data: { fileIds: string[]; currentFolderId: string | null }) => void) => {
        const handler = (_event: any, data: any) => callback(data);
        ipcRenderer.on('file:openMoveDialog', handler);
        return () => ipcRenderer.removeListener('file:openMoveDialog', handler);
    },

    // === File Delete Dialog (Phase 12-17B) ===
    confirmDelete: (fileId: string, filePath: string, permanentDelete: boolean) =>
        ipcRenderer.invoke('file:confirmDelete', { fileId, filePath, permanentDelete }),
    onShowDeleteDialog: (callback: (data: { fileId: string; filePath: string }) => void) => {
        const listener = (_: any, data: any) => callback(data);
        ipcRenderer.on('file:showDeleteDialog', listener);
        return () => ipcRenderer.removeListener('file:showDeleteDialog', listener);
    },

    // Phase 18-C: ファイル移動
    moveFileToFolder: (fileId: string, targetFolderId: string) =>
        ipcRenderer.invoke('file:moveToFolder', { fileId, targetFolderId }),
    onFileMoved: (callback: (data: { fileId: string; newPath: string; targetFolderId: string }) => void) => {
        const listener = (_: any, data: any) => callback(data);
        ipcRenderer.on('file:moved', listener);
        return () => ipcRenderer.removeListener('file:moved', listener);
    },
    onRequestMove: (callback: (data: { fileId: string; targetFolderId: string }) => void) => {
        const listener = (_: any, data: any) => callback(data);
        ipcRenderer.on('file:requestMove', listener);
        return () => ipcRenderer.removeListener('file:requestMove', listener);
    },

    // === Archive ===
    getArchiveMetadata: (path: string) => ipcRenderer.invoke('archive:getMetadata', path),
    getArchivePreviewFrames: (path: string, limit?: number) =>
        ipcRenderer.invoke('archive:getPreviewFrames', { path, limit }),
    cleanArchiveTemp: () => ipcRenderer.invoke('archive:cleanTemp'),
    getArchiveAudioFiles: (archivePath: string) =>
        ipcRenderer.invoke('archive:getAudioFiles', archivePath),
    extractArchiveAudioFile: (archivePath: string, entryName: string) =>
        ipcRenderer.invoke('archive:extractAudioFile', { archivePath, entryName }),

    // === Tags ===
    // Categories
    getTagCategories: () => ipcRenderer.invoke('tag:getCategories'),
    createTagCategory: (name: string, color?: string) =>
        ipcRenderer.invoke('tag:createCategory', { name, color }),
    updateTagCategory: (id: string, updates: { name?: string; color?: string; sortOrder?: number }) =>
        ipcRenderer.invoke('tag:updateCategory', { id, ...updates }),
    deleteTagCategory: (id: string) => ipcRenderer.invoke('tag:deleteCategory', { id }),

    // Tag Definitions
    getAllTags: () => ipcRenderer.invoke('tag:getAll'),
    createTag: (name: string, color?: string, categoryId?: string) =>
        ipcRenderer.invoke('tag:create', { name, color, categoryId }),
    updateTag: (id: string, updates: { name?: string; color?: string; categoryId?: string | null; sortOrder?: number }) =>
        ipcRenderer.invoke('tag:update', { id, ...updates }),
    deleteTag: (id: string) => ipcRenderer.invoke('tag:delete', { id }),

    // File-Tag Operations
    addTagToFile: (fileId: string, tagId: string) =>
        ipcRenderer.invoke('tag:addToFile', { fileId, tagId }),
    removeTagFromFile: (fileId: string, tagId: string) =>
        ipcRenderer.invoke('tag:removeFromFile', { fileId, tagId }),
    getFileTags: (fileId: string) => ipcRenderer.invoke('tag:getFileTags', { fileId }),
    getFileTagIds: (fileId: string) => ipcRenderer.invoke('tag:getFileTagIds', { fileId }),
    getFilesByTags: (tagIds: string[], mode?: 'AND' | 'OR') =>
        ipcRenderer.invoke('tag:getFilesByTags', { tagIds, mode }),
    getAllFileTagIds: () => ipcRenderer.invoke('tag:getAllFileTagIds') as Promise<Record<string, string[]>>,

    // === Profile ===
    getProfiles: () => ipcRenderer.invoke('profile:list'),
    getProfile: (id: string) => ipcRenderer.invoke('profile:get', id),
    createProfile: (name: string) => ipcRenderer.invoke('profile:create', name),
    updateProfile: (id: string, updates: { name?: string }) =>
        ipcRenderer.invoke('profile:update', { id, ...updates }),
    deleteProfile: (id: string) => ipcRenderer.invoke('profile:delete', id),
    getActiveProfileId: () => ipcRenderer.invoke('profile:getActive'),
    switchProfile: (profileId: string) => ipcRenderer.invoke('profile:switch', profileId),

    onProfileSwitched: (callback: (profileId: string) => void) => {
        const handler = (_event: any, profileId: string) => callback(profileId);
        ipcRenderer.on('profile:switched', handler);
        return () => ipcRenderer.removeListener('profile:switched', handler);
    },

    // === Backup ===
    createBackup: (profileId: string) => ipcRenderer.invoke('backup:create', { profileId }),
    getBackupHistory: (profileId: string) => ipcRenderer.invoke('backup:history', { profileId }),
    restoreBackup: (backupPath: string) => ipcRenderer.invoke('backup:restore', { backupPath }),
    getBackupSettings: () => ipcRenderer.invoke('backup:getSettings'),
    setBackupSettings: (settings: any) => ipcRenderer.invoke('backup:setSettings', settings),
    shouldAutoBackup: (profileId: string) => ipcRenderer.invoke('backup:shouldAutoBackup', { profileId }),

    // === Duplicate Detection ===
    findDuplicates: () => ipcRenderer.invoke('duplicate:find'),
    cancelDuplicateSearch: () => ipcRenderer.invoke('duplicate:cancel'),
    deleteDuplicateFiles: (fileIds: string[]) => ipcRenderer.invoke('duplicate:deleteFiles', fileIds),
    onDuplicateProgress: (callback: (progress: any) => void) => {
        const handler = (_event: any, progress: any) => callback(progress);
        ipcRenderer.on('duplicate:progress', handler);
        return () => ipcRenderer.removeListener('duplicate:progress', handler);
    },

    // === Statistics ===
    getLibraryStats: () => ipcRenderer.invoke('statistics:get'),

    // === Activity Log ===
    getActivityLogs: (limit?: number, offset?: number, actionFilter?: string) =>
        ipcRenderer.invoke('activityLog:get', limit, offset, actionFilter),
    getActivityLogCount: (actionFilter?: string) =>
        ipcRenderer.invoke('activityLog:count', actionFilter),

    // === Thumbnail Cleanup ===
    diagnoseThumbnails: () =>
        ipcRenderer.invoke('thumbnail:diagnose'),
    cleanupOrphanedThumbnails: () =>
        ipcRenderer.invoke('thumbnail:cleanup'),

    // === Auto Tag Rules (Phase 12-8 フェーズ2) ===
    getAllAutoTagRules: () =>
        ipcRenderer.invoke('autoTag:getAllRules'),
    createAutoTagRule: (tagId: string, keywords: string[], target: string, matchMode: string) =>
        ipcRenderer.invoke('autoTag:createRule', { tagId, keywords, target, matchMode }),
    updateAutoTagRule: (id: string, updates: any) =>
        ipcRenderer.invoke('autoTag:updateRule', { id, updates }),
    deleteAutoTagRule: (id: string) =>
        ipcRenderer.invoke('autoTag:deleteRule', { id }),
    previewAutoTagRule: (rule: any, files: any[]) =>
        ipcRenderer.invoke('autoTag:previewRule', { rule, files }),
    applyAutoTagsToFiles: (fileIds: string[]) =>
        ipcRenderer.invoke('autoTag:applyToFiles', { fileIds }),

    // === Phase 24: Thumbnail Regeneration ===
    regenerateAllThumbnails: () =>
        ipcRenderer.invoke('thumbnail:regenerateAll'),
    onThumbnailRegenerateProgress: (callback: (progress: { current: number; total: number }) => void) => {
        const handler = (_event: any, progress: any) => callback(progress);
        ipcRenderer.on('thumbnail:regenerateProgress', handler);
        return () => ipcRenderer.removeListener('thumbnail:regenerateProgress', handler);
    },
});
