interface ExternalApp {
    id: string;
    name: string;
    path: string;
    extensions: string[];
    createdAt: number;
}
export declare function getCachedExternalApps(): ExternalApp[];
export declare function registerAppHandlers(): void;
export {};
