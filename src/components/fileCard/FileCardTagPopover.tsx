import React from 'react';
import { createPortal } from 'react-dom';
import type { Tag } from '../../stores/useTagStore';
import type { TagPopoverTrigger } from '../../stores/useSettingsStore';
import { resolveColorHex, getTextColorForBackground } from '../../lib/colors';

type FileCardTagPopoverProps = {
    show: boolean;
    triggerRef: React.RefObject<HTMLButtonElement | null>;
    popoverRef: React.RefObject<HTMLDivElement | null>;
    sortedTags: Tag[];
    isTagBorderMode: boolean;
    tagPopoverTrigger: TagPopoverTrigger;
    onClose: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
};

export const FileCardTagPopover = React.memo(({
    show,
    triggerRef,
    popoverRef,
    sortedTags,
    isTagBorderMode,
    tagPopoverTrigger,
    onClose,
    onMouseEnter,
    onMouseLeave,
}: FileCardTagPopoverProps) => {
    if (!show || !triggerRef.current) return null;

    return createPortal(
        <div
            ref={popoverRef}
            onMouseEnter={() => {
                if (tagPopoverTrigger === 'hover') onMouseEnter();
            }}
            onMouseLeave={() => {
                if (tagPopoverTrigger === 'hover') onMouseLeave();
            }}
            className="bg-surface-800 border border-surface-600 rounded-lg shadow-2xl p-3 min-w-[200px] max-w-[300px]"
            style={{
                position: 'fixed',
                top: `${triggerRef.current.getBoundingClientRect().bottom + 4}px`,
                left: `${triggerRef.current.getBoundingClientRect().left}px`,
                zIndex: 9999
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-surface-200">
                    タグ ({sortedTags.length})
                </span>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    className="text-surface-400 hover:text-surface-200 text-sm"
                >
                    ✕
                </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
                {sortedTags.map(tag => (
                    <span
                        key={tag.id}
                        className={`px-2 py-1 text-[10px] font-bold whitespace-nowrap rounded ${isTagBorderMode ? 'border-l-4' : ''}`}
                        style={isTagBorderMode ? {
                            backgroundColor: 'rgba(55, 65, 81, 0.9)',
                            color: '#e5e7eb',
                            borderLeftColor: resolveColorHex(tag.categoryColor || tag.color || '')
                        } : {
                            backgroundColor: resolveColorHex(tag.categoryColor || tag.color || ''),
                            color: getTextColorForBackground(tag.categoryColor || tag.color || '')
                        }}
                    >
                        {tag.name}
                    </span>
                ))}
            </div>
        </div>,
        document.body
    );
});

FileCardTagPopover.displayName = 'FileCardTagPopover';
