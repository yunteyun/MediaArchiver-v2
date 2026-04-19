import React from 'react';
import type { Tag } from '../../stores/useTagStore';
import type { FileCardTagOrderMode, TagPopoverTrigger } from '../../stores/useSettingsStore';
import type { ResolvedFileCardDisplayPreset } from './displayModes';
import { resolveColorHex, getTextColorForBackground } from '../../lib/colors';
import { getTagSummaryUiConfig, getBalancedSummaryTags, type TagSummaryUiConfig } from './tagSummaryUtils';


type FileCardTagSummaryRowProps = {
    visibleTags: Tag[];
    hiddenCount: number;
    isTagBorderMode: boolean;
    tagSummaryUi: TagSummaryUiConfig;
    triggerRef: React.RefObject<HTMLButtonElement | null>;
    onMoreClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onMoreMouseEnter: () => void;
    onMoreMouseLeave: () => void;
};

export type FileCardTagSummaryProps = {
    visibleCount: number;
    showTags: boolean;
    sortedTags: Tag[];
    fileCardTagOrderMode: FileCardTagOrderMode;
    displayPreset: ResolvedFileCardDisplayPreset;
    isTagBorderMode: boolean;
    triggerRef: React.RefObject<HTMLButtonElement | null>;
    tagPopoverTrigger: TagPopoverTrigger;
    showTagPopover: boolean;
    setShowTagPopover: React.Dispatch<React.SetStateAction<boolean>>;
    openPopover: () => void;
    closePopoverWithDelay: () => void;
};

const FileCardTagSummaryRow = React.memo(({
    visibleTags,
    hiddenCount,
    isTagBorderMode,
    tagSummaryUi,
    triggerRef,
    onMoreClick,
    onMoreMouseEnter,
    onMoreMouseLeave,
}: FileCardTagSummaryRowProps) => {
    return (
        <div className={`flex min-w-0 overflow-hidden ${tagSummaryUi.rowGapClass} ${tagSummaryUi.rowLayoutClass}`}>
            {visibleTags.map(tag => (
                <span
                    key={tag.id}
                    className={`inline-flex min-w-0 ${tagSummaryUi.tagChipMaxWidthClass} items-center ${tagSummaryUi.tagChipPaddingClass} ${tagSummaryUi.tagChipTextClass} ${tagSummaryUi.tagChipFontWeightClass} whitespace-nowrap ${tagSummaryUi.tagChipRadiusClass} ${isTagBorderMode ? 'border-l-2' : ''}`}
                    style={isTagBorderMode ? {
                        backgroundColor: 'rgba(55, 65, 81, 0.9)',
                        color: '#e5e7eb',
                        borderLeftColor: resolveColorHex(tag.categoryColor || tag.color || ''),
                        opacity: 0.85
                    } : {
                        backgroundColor: resolveColorHex(tag.categoryColor || tag.color || ''),
                        color: getTextColorForBackground(tag.categoryColor || tag.color || ''),
                        borderColor: resolveColorHex(tag.categoryColor || tag.color || ''),
                        opacity: 0.85
                    }}
                >
                    <span className="truncate">{tag.name}</span>
                </span>
            ))}
            {hiddenCount > 0 && (
                <button
                    ref={triggerRef}
                    onClick={onMoreClick}
                    onMouseEnter={onMoreMouseEnter}
                    onMouseLeave={onMoreMouseLeave}
                    className={`${tagSummaryUi.tagChipPaddingClass} ${tagSummaryUi.tagChipTextClass} ${tagSummaryUi.tagChipFontWeightClass} whitespace-nowrap ${tagSummaryUi.tagChipRadiusClass} bg-surface-700 hover:bg-surface-600 text-surface-300 transition-colors cursor-pointer`}
                >
                    +{hiddenCount}
                </button>
            )}
        </div>
    );
});

FileCardTagSummaryRow.displayName = 'FileCardTagSummaryRow';

export const FileCardTagSummary = React.memo(({
    visibleCount,
    showTags,
    sortedTags,
    fileCardTagOrderMode,
    displayPreset,
    isTagBorderMode,
    triggerRef,
    tagPopoverTrigger,
    showTagPopover,
    setShowTagPopover,
    openPopover,
    closePopoverWithDelay,
}: FileCardTagSummaryProps) => {
    if (!showTags || sortedTags.length === 0) return null;

    const tagSummaryUi = getTagSummaryUiConfig(displayPreset);
    const visibleTags = fileCardTagOrderMode === 'strict'
        ? sortedTags.slice(0, visibleCount)
        : getBalancedSummaryTags(sortedTags, visibleCount);
    const hiddenCount = Math.max(0, sortedTags.length - visibleCount);

    return (
        <FileCardTagSummaryRow
            visibleTags={visibleTags}
            hiddenCount={hiddenCount}
            isTagBorderMode={isTagBorderMode}
            tagSummaryUi={tagSummaryUi}
            triggerRef={triggerRef}
            onMoreClick={(e) => {
                e.stopPropagation();
                if (tagPopoverTrigger === 'click') setShowTagPopover(!showTagPopover);
            }}
            onMoreMouseEnter={() => {
                if (tagPopoverTrigger === 'hover') openPopover();
            }}
            onMoreMouseLeave={() => {
                if (tagPopoverTrigger === 'hover') closePopoverWithDelay();
            }}
        />
    );
});

FileCardTagSummary.displayName = 'FileCardTagSummary';
