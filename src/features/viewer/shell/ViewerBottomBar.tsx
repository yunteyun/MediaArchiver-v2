import React from 'react';
import { FolderInput, Pencil, Trash2 } from 'lucide-react';
import type { ViewerSlot } from '../types';

interface ViewerBottomBarProps {
    onRename: () => void;
    onMove: () => void;
    onDelete: () => void;
    /** 'bottom-action' スロットに登録されたエントリ */
    actionSlots: ViewerSlot[];
    /** 'popover' スロットに登録されたエントリ */
    popoverSlots: ViewerSlot[];
}

const actionBtnClass =
    'flex items-center gap-1.5 rounded-lg border border-surface-600 bg-viewer-surface-soft px-3 py-1.5 text-xs font-medium text-surface-200 shadow-lg transition hover:bg-surface-900 hover:text-surface-50';

export const ViewerBottomBar: React.FC<ViewerBottomBarProps> = ({
    onRename,
    onMove,
    onDelete,
    actionSlots,
    popoverSlots,
}) => (
    <div className="pointer-events-auto relative flex h-12 flex-shrink-0 items-center justify-center gap-3 px-5">
        {/* 共通アクション */}
        <button type="button" onClick={onRename} className={actionBtnClass} title="名前を変更">
            <Pencil size={14} />
            <span>リネーム</span>
        </button>
        <button type="button" onClick={onMove} className={actionBtnClass} title="別のフォルダへ移動">
            <FolderInput size={14} />
            <span>移動</span>
        </button>
        <button type="button" onClick={onDelete} className={actionBtnClass} title="ゴミ箱へ移動">
            <Trash2 size={14} />
            <span>ゴミ箱へ</span>
        </button>

        {/* モード固有のアクションスロット */}
        {actionSlots.length > 0 && (
            <>
                <div className="mx-1 h-5 w-px bg-surface-600" />
                {actionSlots.map(slot => (
                    <React.Fragment key={slot.id}>{slot.render()}</React.Fragment>
                ))}
            </>
        )}

        {/* ポップオーバースロット（BottomBar 上方に絶対配置） */}
        {popoverSlots.map(slot => (
            <React.Fragment key={slot.id}>{slot.render()}</React.Fragment>
        ))}
    </div>
);
