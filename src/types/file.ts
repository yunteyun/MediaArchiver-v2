export interface MediaFile {
    id: string;
    name: string;
    path: string;
    size: number;
    type: 'video' | 'image' | 'archive' | 'audio';
    createdAt: number;
    duration?: string;
    thumbnailPath?: string;
    previewFrames?: string;
    rootFolderId?: string;
    tags: string[];
    contentHash?: string;
    metadata?: string;
    mtimeMs?: number;
    notes?: string;
    isAnimated?: boolean; // preview上で「フレーム変化を持つ」メディア（主にGIF/WebP、将来的にAPNG/AVIF等にも対応）
    // Phase 17: アクセストラッキング
    accessCount: number;
    lastAccessedAt: number | null;
    // Phase 18-A: 外部アプリ起動トラッキング
    externalOpenCount: number;
    lastExternalOpenedAt: number | null;
}

export interface MediaFolder {
    id: string;
    name: string;
    path: string;
    createdAt: number;
    parentId: string | null;  // Phase 22-C: 親フォルダID
    drive: string;             // Phase 22-C: ドライブ文字（C:, D:など）
    autoScan?: number;
    watchNewFiles?: number;
    auto_scan?: number;
    watch_new_files?: number;
    lastScanAt?: number | null;
    lastScanStatus?: string | null;
    lastScanMessage?: string | null;
    last_scan_at?: number | null;
    last_scan_status?: string | null;
    last_scan_message?: string | null;
    scanSettingsJson?: string | null; // renderer側で使うcamelCase（将来用）
    scan_settings_json?: string | null; // Electron IPC返却のsnake_case互換
}
