export type ScanProgressCallback = (progress: {
    jobId: string;
    phase: 'counting' | 'scanning' | 'complete' | 'error';
    current: number;
    total: number;
    currentFile?: string;
    message?: string;
    stats?: {
        newCount: number;
        updateCount: number;
        skipCount: number;
        removedCount?: number;
    };
}) => void;
export interface ScanDirectoryOptions {
    skipInitialCount?: boolean;
    runtimeSettings?: ScanRuntimeSettings;
    cancellationToken?: ScanCancellationToken;
    jobId?: string;
}
export interface ScanRuntimeSettings {
    previewFrameCount: number;
    scanThrottleMs: number;
    thumbnailResolution: number;
    fileTypeCategories: ScanFileTypeCategoryFilters;
    exclusionRules: import("../../src/shared/scanExclusionRules").ScanExclusionRules;
}
export interface ScanFileTypeCategoryFilters {
    video: boolean;
    image: boolean;
    archive: boolean;
    audio: boolean;
}
export interface ScanCancellationToken {
    cancelled: boolean;
}
export declare function cancelScan(): void;
export declare function isScanCancelled(token?: ScanCancellationToken): boolean;
export declare function createScanCancellationToken(): ScanCancellationToken;
export declare function cancelScanToken(token?: ScanCancellationToken): void;
export declare function setPreviewFrameCount(count: number): void;
export declare function getPreviewFrameCount(): number;
export declare function setScanThrottleMs(ms: number): void;
export declare function getScanThrottleMs(): number;
export declare function setThumbnailResolution(resolution: number): void;
export declare function getThumbnailResolution(): number;
export declare function hasActiveScanJobs(): boolean;
export declare function getActiveScanJobCount(): number;
export declare function scanDirectory(dirPath: string, rootFolderId: string, onProgress?: ScanProgressCallback, onBatchCommitted?: ScanBatchCommittedCallback, options?: ScanDirectoryOptions): Promise<void>;
export interface ScanBatchCommittedPayload {
    jobId: string;
    rootFolderId: string;
    scanPath: string;
    committedCount: number;
    totalCommitted: number;
    removedCount: number;
    stage: 'batch' | 'complete' | 'cancelled';
}
export type ScanBatchCommittedCallback = (payload: ScanBatchCommittedPayload) => void;
