import { useEffect, useRef } from 'react';
import type { ModeKeyHandler } from '../types';
import { useKeyboardContext } from '../viewerContexts';

/**
 * モードコンポーネントが優先キーハンドラを登録するフック。
 * `handler` が true を返したキーは Shell の共通ハンドラ（Esc: 閉じる、←→: 前後）に伝播しない。
 * `handler` に null を渡すか、コンポーネントがアンマウントされると自動的に解除される。
 */
export function useViewerKeyboard(handler: ModeKeyHandler | null): void {
    const { setModeKeyHandler } = useKeyboardContext();
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        if (handler === null) {
            setModeKeyHandler(null);
            return;
        }

        // 安定したラッパーを登録し、内部で常に最新の handler を呼ぶ
        setModeKeyHandler((e) => handlerRef.current?.(e) ?? false);

        return () => {
            setModeKeyHandler(null);
        };
    // handler の null/非null だけをトリガーにする
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handler === null, setModeKeyHandler]);
}
