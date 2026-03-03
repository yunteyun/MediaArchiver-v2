import type { MediaFile } from './file';

export interface IpcChannels {
    // Database
    'db:getFiles': {
        request: { folderId?: string };
        response: MediaFile[];
    };

    // Scanner
    'scanner:start': {
        request: { folderPath: string };
        response: void;
    };
    'scanner:progress': {
        request: void; // Event from main
        response: {
            phase: 'counting' | 'scanning' | 'complete' | 'error';
            current: number;
            total: number;
            currentFile?: string;
            message?: string;
        };
    };

    // Folder
    'folder:add': {
        request: { folderPath: string };
        response: { id: string; path: string; name: string; createdAt: number };
    };
    'folder:list': {
        request: void;
        response: { id: string; path: string; name: string; createdAt: number }[];
    };
    'folder:delete': {
        request: { folderId: string };
        response: void;
    };

    // App
    'app:openExternal': {
        request: { path: string };
        response: void;
    };
}

export type IpcRequest<T extends keyof IpcChannels> = IpcChannels[T]['request'];
export type IpcResponse<T extends keyof IpcChannels> = IpcChannels[T]['response'];
