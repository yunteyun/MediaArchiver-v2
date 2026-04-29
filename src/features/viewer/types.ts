import type React from 'react';

/** Shell が提供するスロットの種類（v3 仕様書準拠） */
export type SlotKind = 'bottom-action' | 'popover';

/** モードコンポーネントが Shell に登録するスロットエントリ */
export interface ViewerSlot {
    id: string;
    kind: SlotKind;
    /** 呼び出すたびに最新の ReactNode を返すレンダー関数 */
    render: () => React.ReactNode;
}

/**
 * モード固有のキーボードハンドラ。
 * キーを処理した場合は true を返すと Shell の共通ハンドラへの伝播を止める。
 */
export type ModeKeyHandler = (e: KeyboardEvent) => boolean;
