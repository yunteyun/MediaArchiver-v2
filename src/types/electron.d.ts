export { };

declare global {
    interface Window {
        electronAPI: {
            // Database
            getFiles: (folderId?: string) => Promise<any[]>;

            // Folder
            addFolder: (folderPath: string) => Promise<any>;
            getFolders: () => Promise<any[]>;
            deleteFolder: (folderId: string) => Promise<void>;

            // Scanner
            scanFolder: (folderPath: string) => Promise<void>;

            // App
            openExternal: (path: string) => Promise<void>;
            showInExplorer: (path: string) => Promise<void>;

            // Dialog
            selectFolder: () => Promise<string | null>;

            // Events
            onScanProgress: (callback: (progress: any) => void) => () => void;
        };
    }
}
