export type ScanProgressCallback = (progress: {
    phase: 'counting' | 'scanning' | 'complete' | 'error';
    current: number;
    total: number;
    currentFile?: string;
    message?: string;
}) => void;
export declare function scanDirectory(dirPath: string, rootFolderId: string, onProgress?: ScanProgressCallback): Promise<void>;
