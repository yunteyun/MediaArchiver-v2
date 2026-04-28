import { useEffect, useId, useRef } from 'react';
import type React from 'react';
import type { SlotKind } from '../types';
import { useSlotContext } from '../ViewerContext';

/**
 * モードコンポーネントが Shell のスロットに UI を登録するフック。
 * `render` が毎レンダーで変わっても内部 ref で常に最新版を保持するため、
 * 呼び出し側は useCallback / useMemo でのメモ化は任意。
 */
export function useViewerSlots(
    kind: SlotKind,
    render: (() => React.ReactNode) | null,
): void {
    const { registerSlot, unregisterSlot } = useSlotContext();
    const id = useId();
    const renderRef = useRef(render);
    renderRef.current = render;

    useEffect(() => {
        if (render === null) return;

        registerSlot({
            id,
            kind,
            render: () => renderRef.current?.() ?? null,
        });

        return () => {
            unregisterSlot(id);
        };
    // render の有無だけをトリガーにし、関数本体の変更は ref 経由で反映する
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, kind, render === null, registerSlot, unregisterSlot]);
}
