import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
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

const ViewerContext = createContext<ViewerContextValue | null>(null);

export function useViewerContext(): ViewerContextValue {
    const ctx = useContext(ViewerContext);
    if (!ctx) throw new Error('useViewerContext must be used inside ViewerShell');
    return ctx;
}

// ─── Slot Context ──────────────────────────────────────────────────────────────

interface SlotContextValue {
    registerSlot: (slot: ViewerSlot) => void;
    unregisterSlot: (id: string) => void;
    getSlots: (kind: SlotKind) => ViewerSlot[];
}

const SlotContext = createContext<SlotContextValue | null>(null);

export function useSlotContext(): SlotContextValue {
    const ctx = useContext(SlotContext);
    if (!ctx) throw new Error('useSlotContext must be used inside ViewerShell');
    return ctx;
}

// ─── Keyboard Context ─────────────────────────────────────────────────────────

interface KeyboardContextValue {
    /** モードが自身のキーハンドラを登録する。アンマウント時は null を渡す */
    setModeKeyHandler: (handler: ModeKeyHandler | null) => void;
}

const KeyboardContext = createContext<KeyboardContextValue | null>(null);

export function useKeyboardContext(): KeyboardContextValue {
    const ctx = useContext(KeyboardContext);
    if (!ctx) throw new Error('useKeyboardContext must be used inside ViewerShell');
    return ctx;
}

// ─── Combined Provider ────────────────────────────────────────────────────────

interface ViewerProviderProps {
    value: ViewerContextValue;
    children: React.ReactNode;
    /** Shell が slot 一覧を購読するための setter */
    onSlotsChange: (slots: ViewerSlot[]) => void;
    /** Shell が mode key handler ref を公開するための setter */
    modeHandlerRef: React.MutableRefObject<ModeKeyHandler | null>;
}

export const ViewerProvider: React.FC<ViewerProviderProps> = ({
    value,
    children,
    onSlotsChange,
    modeHandlerRef,
}) => {
    const slotsRef = useRef<Map<string, ViewerSlot>>(new Map());

    const registerSlot = useCallback((slot: ViewerSlot) => {
        slotsRef.current.set(slot.id, slot);
        onSlotsChange([...slotsRef.current.values()]);
    }, [onSlotsChange]);

    const unregisterSlot = useCallback((id: string) => {
        slotsRef.current.delete(id);
        onSlotsChange([...slotsRef.current.values()]);
    }, [onSlotsChange]);

    const getSlots = useCallback((kind: SlotKind): ViewerSlot[] => {
        return [...slotsRef.current.values()].filter(s => s.kind === kind);
    }, []);

    const slotCtx = useMemo<SlotContextValue>(
        () => ({ registerSlot, unregisterSlot, getSlots }),
        [registerSlot, unregisterSlot, getSlots],
    );

    const setModeKeyHandler = useCallback((handler: ModeKeyHandler | null) => {
        modeHandlerRef.current = handler;
    }, [modeHandlerRef]);

    const keyboardCtx = useMemo<KeyboardContextValue>(
        () => ({ setModeKeyHandler }),
        [setModeKeyHandler],
    );

    return (
        <ViewerContext.Provider value={value}>
            <SlotContext.Provider value={slotCtx}>
                <KeyboardContext.Provider value={keyboardCtx}>
                    {children}
                </KeyboardContext.Provider>
            </SlotContext.Provider>
        </ViewerContext.Provider>
    );
};
