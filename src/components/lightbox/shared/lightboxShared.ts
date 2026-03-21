import type { MediaFile } from '../../../types/file';

export const LIGHTBOX_OVERLAY_OPACITY_DEFAULT = 96;
export const LIGHTBOX_OVERLAY_OPACITY_MIN = 70;
export const LIGHTBOX_OVERLAY_OPACITY_MAX = 100;
export const LIGHTBOX_OVERLAY_OPACITY_STEP = 1;
export const LIGHTBOX_ARCHIVE_PREVIEW_LIMIT = 6;

const IMAGE_LIKE_EXT_RE = /\.(png|jpe?g|webp|gif|bmp|avif|apng)$/i;

export type LightboxMediaKind = 'image' | 'video' | 'audio' | 'archive' | 'unsupported';

export function clampOverlayOpacity(value: number): number {
    const numeric = Number.isFinite(value) ? value : LIGHTBOX_OVERLAY_OPACITY_DEFAULT;
    const rounded = Math.round(numeric);
    return Math.max(LIGHTBOX_OVERLAY_OPACITY_MIN, Math.min(LIGHTBOX_OVERLAY_OPACITY_MAX, rounded));
}

export function isImageLikeFile(file: Pick<MediaFile, 'type' | 'name' | 'path'>): boolean {
    if (file.type === 'image') return true;
    return IMAGE_LIKE_EXT_RE.test(file.name ?? '') || IMAGE_LIKE_EXT_RE.test(file.path ?? '');
}

export function resolveLightboxMediaKind(file: Pick<MediaFile, 'type' | 'name' | 'path'> | null | undefined): LightboxMediaKind {
    if (!file) return 'unsupported';
    if (file.type === 'video') return 'video';
    if (file.type === 'audio') return 'audio';
    if (file.type === 'archive') return 'archive';
    if (isImageLikeFile(file)) return 'image';
    return 'unsupported';
}
