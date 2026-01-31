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

    // App
    'app:openExternal': {
        request: { path: string };
        response: void;
    };
}

export type IpcRequest<T extends keyof IpcChannels> = IpcChannels[T]['request'];
export type IpcResponse<T extends keyof IpcChannels> = IpcChannels[T]['response'];
