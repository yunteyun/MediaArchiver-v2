import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getBasePath } from './storageConfig';

export type ThumbnailKind = 'image' | 'video' | 'audio' | 'archive' | 'preview' | 'archive-preview';

const PROFILE_ROOT_DIR = 'profiles';
const FALLBACK_PROFILE_ID = '_global';

function ensureDir(dirPath: string): string {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    return dirPath;
}

export function getThumbnailRootDir(): string {
    return path.join(getBasePath(), 'thumbnails');
}

export function normalizeThumbnailProfileId(profileId?: string | null): string {
    const trimmed = profileId?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : FALLBACK_PROFILE_ID;
}

export function getProfileThumbnailRootDir(profileId?: string | null): string {
    return path.join(getThumbnailRootDir(), PROFILE_ROOT_DIR, normalizeThumbnailProfileId(profileId));
}

export function getThumbnailKindDir(kind: ThumbnailKind, profileId?: string | null): string {
    return path.join(getProfileThumbnailRootDir(profileId), kind);
}

export function ensureThumbnailKindDir(kind: ThumbnailKind, profileId?: string | null): string {
    return ensureDir(getThumbnailKindDir(kind, profileId));
}

export function createThumbnailOutputPath(
    kind: ThumbnailKind,
    extensionWithDot: string,
    profileId?: string | null
): string {
    const ext = extensionWithDot.startsWith('.') ? extensionWithDot : `.${extensionWithDot}`;
    return path.join(ensureThumbnailKindDir(kind, profileId), `${uuidv4()}${ext}`);
}

export function createPreviewFramesDir(videoId: string, profileId?: string | null): string {
    return ensureDir(path.join(ensureThumbnailKindDir('preview', profileId), videoId));
}
