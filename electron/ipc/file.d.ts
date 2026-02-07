interface ExternalApp {
    id: string;
    name: string;
    path: string;
    extensions: string[];
    createdAt: number;
}
export declare function setExternalAppsGetter(getter: () => ExternalApp[]): void;
export declare function registerFileHandlers(): void;
export {};
