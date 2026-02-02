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
export declare function cancelScan(): void;
export declare function isScanCancelled(): boolean;
export declare function scanDirectory(dirPath: string, rootFolderId: string, onProgress?: ScanProgressCallback): Promise<void>;
