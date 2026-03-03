export type ScanProgressCallback = (progress: {
    phase: 'counting' | 'scanning' | 'complete' | 'error';
    current: number;
    total: number;
    currentFile?: string;
    message?: string;
    stats?: {
        newCount: number;
        updateCount: number;
        skipCount: number;
    };
}) => void;
export interface ScanDirectoryOptions {
    skipInitialCount?: boolean;
}
export declare function cancelScan(): void;
export declare function isScanCancelled(): boolean;
export declare function setPreviewFrameCount(count: number): void;
export declare function getPreviewFrameCount(): number;
export declare function setScanThrottleMs(ms: number): void;
export declare function getScanThrottleMs(): number;
export declare function setThumbnailResolution(resolution: number): void;
export declare function getThumbnailResolution(): number;
export declare function scanDirectory(dirPath: string, rootFolderId: string, onProgress?: ScanProgressCallback, onBatchCommitted?: ScanBatchCommittedCallback, options?: ScanDirectoryOptions): Promise<void>;
export interface ScanBatchCommittedPayload {
    rootFolderId: string;
    scanPath: string;
    committedCount: number;
    totalCommitted: number;
    removedCount: number;
    stage: 'batch' | 'complete' | 'cancelled';
}
export type ScanBatchCommittedCallback = (payload: ScanBatchCommittedPayload) => void;
