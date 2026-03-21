import type { MediaFile } from '../../../types/file';

export type ViewerKeyboardAction = 'close' | 'previous' | 'next' | null;

function isEditableElement(target: EventTarget | null): boolean {
    if (!target || typeof target !== 'object') {
        return false;
    }

    const maybeElement = target as { tagName?: string; isContentEditable?: boolean };
    const tagName = typeof maybeElement.tagName === 'string' ? maybeElement.tagName.toUpperCase() : '';
    return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || maybeElement.isContentEditable === true;
}

export function resolveViewerKeyboardAction(
    event: Pick<KeyboardEvent, 'key' | 'defaultPrevented' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'target'>,
    fileType: MediaFile['type'] | null | undefined,
): ViewerKeyboardAction {
    if (event.defaultPrevented || isEditableElement(event.target)) {
        return null;
    }

    if (event.altKey || event.ctrlKey || event.metaKey) {
        return null;
    }

    if (event.key === 'Escape') {
        return 'close';
    }

    if (event.shiftKey) {
        return null;
    }

    if (fileType === 'video') {
        return null;
    }

    if (event.key === 'ArrowLeft') {
        return 'previous';
    }

    if (event.key === 'ArrowRight') {
        return 'next';
    }

    return null;
}
