import { describe, expect, it } from 'vitest';
import { resolveViewerKeyboardAction } from '../viewerKeyboard';

function createKeyboardEventLike(overrides: Partial<KeyboardEvent> & { key: string }) {
    return {
        key: overrides.key,
        defaultPrevented: overrides.defaultPrevented ?? false,
        altKey: overrides.altKey ?? false,
        ctrlKey: overrides.ctrlKey ?? false,
        metaKey: overrides.metaKey ?? false,
        shiftKey: overrides.shiftKey ?? false,
        target: overrides.target ?? null,
    };
}

describe('resolveViewerKeyboardAction', () => {
    it('allows close on escape', () => {
        expect(resolveViewerKeyboardAction(createKeyboardEventLike({ key: 'Escape' }), 'image')).toBe('close');
    });

    it('maps arrows to navigation for non-video media', () => {
        expect(resolveViewerKeyboardAction(createKeyboardEventLike({ key: 'ArrowLeft' }), 'image')).toBe('previous');
        expect(resolveViewerKeyboardAction(createKeyboardEventLike({ key: 'ArrowRight' }), 'archive')).toBe('next');
    });

    it('ignores arrows for video to avoid seek conflicts', () => {
        expect(resolveViewerKeyboardAction(createKeyboardEventLike({ key: 'ArrowLeft' }), 'video')).toBeNull();
        expect(resolveViewerKeyboardAction(createKeyboardEventLike({ key: 'ArrowRight' }), 'video')).toBeNull();
    });

    it('ignores modified or editable targets', () => {
        const input = globalThis.document?.createElement('input') ?? ({ tagName: 'INPUT', isContentEditable: false } as HTMLElement);
        expect(resolveViewerKeyboardAction(createKeyboardEventLike({ key: 'ArrowLeft', target: input }), 'image')).toBeNull();
        expect(resolveViewerKeyboardAction(createKeyboardEventLike({ key: 'ArrowRight', ctrlKey: true }), 'image')).toBeNull();
        expect(resolveViewerKeyboardAction(createKeyboardEventLike({ key: 'ArrowRight', shiftKey: true }), 'image')).toBeNull();
    });
});
