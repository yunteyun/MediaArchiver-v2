import React, { useCallback, useMemo, useRef } from 'react';
import type { ViewerSlot } from './types';
import {
    ViewerContext,
    SlotContext,
    KeyboardContext,
    type ViewerContextValue,
    type SlotContextValue,
    type KeyboardContextValue,
} from './viewerContexts';

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
