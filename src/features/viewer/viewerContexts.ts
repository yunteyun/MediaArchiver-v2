import { createContext, useContext } from 'react';
import type { MediaFile } from '../../types/file';
import type { ModeKeyHandler, SlotKind, ViewerSlot } from './types';

// ─── Viewer Context ────────────────────────────────────────────────────────────

export interface ViewerContextValue {
    file: MediaFile;
    files: MediaFile[];
    currentIndex: number;
    closeLightbox: () => void;
    goToPrevious: () => void;
    goToNext: () => void;
    openRenameDialog: (fileId: string, name: string, path: string) => void;
    openMoveDialog: (fileIds: string[], folderId: string | null) => void;
    openDeleteDialog: (fileIds: string[], filePaths: string[]) => void;
    videoVolume: number;
    audioVolume: number;
    lightboxStartTime: number | null;
}

export const ViewerContext = createContext<ViewerContextValue | null>(null);

export function useViewerContext(): ViewerContextValue {
    const ctx = useContext(ViewerContext);
    if (!ctx) throw new Error('useViewerContext must be used inside ViewerShell');
    return ctx;
}

// ─── Slot Context ──────────────────────────────────────────────────────────────

export interface SlotContextValue {
    registerSlot: (slot: ViewerSlot) => void;
    unregisterSlot: (id: string) => void;
    getSlots: (kind: SlotKind) => ViewerSlot[];
}

export const SlotContext = createContext<SlotContextValue | null>(null);

export function useSlotContext(): SlotContextValue {
    const ctx = useContext(SlotContext);
    if (!ctx) throw new Error('useSlotContext must be used inside ViewerShell');
    return ctx;
}

// ─── Keyboard Context ─────────────────────────────────────────────────────────

export interface KeyboardContextValue {
    /** モードが自身のキーハンドラを登録する。アンマウント時は null を渡す */
    setModeKeyHandler: (handler: ModeKeyHandler | null) => void;
}

export const KeyboardContext = createContext<KeyboardContextValue | null>(null);

export function useKeyboardContext(): KeyboardContextValue {
    const ctx = useContext(KeyboardContext);
    if (!ctx) throw new Error('useKeyboardContext must be used inside ViewerShell');
    return ctx;
}
