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
}

export interface MediaFolder {
    id: string;
    name: string;
    path: string;
    createdAt: number;
}
