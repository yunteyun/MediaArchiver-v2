import { useEffect, useState, RefObject } from 'react';

/**
 * ResizeObserver を使用してコンテナのサイズを監視するカスタムフック
 * @param ref - 監視対象の要素への ref
 * @returns 要素の幅（px）
 */
export function useResizeObserver(ref: RefObject<HTMLElement>): number {
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new ResizeObserver((entries) => {
            if (entries[0]) {
                setWidth(entries[0].contentRect.width);
            }
        });

        observer.observe(element);

        // 初期サイズを設定
        setWidth(element.getBoundingClientRect().width);

        return () => {
            observer.disconnect();
        };
    }, [ref]);

    return width;
}
