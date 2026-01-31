/// <reference types="vite/client" />

interface Window {
    electronAPI: {
        // Database
        getFiles: (folderId?: string) => Promise<MediaFile[]>;
        // Scanner
        scanFolder: (path: string) => Promise<void>;
        // App
        openExternal: (path: string) => Promise<void>;
        // Events (from main to renderer)
        onScanProgress: (callback: (progress: ScanProgress) => void) => void;
    };
}
