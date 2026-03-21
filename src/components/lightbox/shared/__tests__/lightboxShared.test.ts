import { describe, expect, it } from 'vitest';
import { clampOverlayOpacity, isImageLikeFile, resolveLightboxMediaKind } from '../lightboxShared';

describe('lightboxShared', () => {
    it('clamps overlay opacity into the supported range', () => {
        expect(clampOverlayOpacity(20)).toBe(70);
        expect(clampOverlayOpacity(96)).toBe(96);
        expect(clampOverlayOpacity(200)).toBe(100);
        expect(clampOverlayOpacity(Number.NaN)).toBe(96);
    });

    it('detects image-like files from type or extension', () => {
        expect(isImageLikeFile({ type: 'image', name: 'photo.bin', path: 'C:/photo.bin' } as const)).toBe(true);
        expect(isImageLikeFile({ type: 'other', name: 'cover.webp', path: 'C:/cover.webp' } as const)).toBe(true);
        expect(isImageLikeFile({ type: 'other', name: 'movie.dat', path: 'C:/movie.dat' } as const)).toBe(false);
    });

    it('resolves lightbox media kinds consistently', () => {
        expect(resolveLightboxMediaKind({ type: 'video', name: 'clip.mp4', path: 'C:/clip.mp4' } as const)).toBe('video');
        expect(resolveLightboxMediaKind({ type: 'archive', name: 'book.zip', path: 'C:/book.zip' } as const)).toBe('archive');
        expect(resolveLightboxMediaKind({ type: 'other', name: 'cover.avif', path: 'C:/cover.avif' } as const)).toBe('image');
        expect(resolveLightboxMediaKind({ type: 'other', name: 'file.bin', path: 'C:/file.bin' } as const)).toBe('unsupported');
        expect(resolveLightboxMediaKind(null)).toBe('unsupported');
    });
});
