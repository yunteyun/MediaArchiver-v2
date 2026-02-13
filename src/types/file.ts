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
}
