import React from 'react';
import { Eye } from 'lucide-react';
import { formatFileSize } from '../../utils/groupFiles';
import { getDisplayFolderName } from '../../utils/path';
import type { DetailedPanelBadgeKey } from './displayModes';
import type { FileCardInfoCommonProps } from './FileCardInfoArea';

type DetailedInfoUiConfig = {
    isDetailedHorizontalMode: boolean;
    detailedPanelBadgeKeys: DetailedPanelBadgeKey[];
    isBadgeMetaMode: boolean;
    containerClass: string;
    titleClass: string;
    metaLineClass: string;
    folderBadgeMaxWidthClass: string;
    bottomRowClass: string;
    standaloneFileSizeClass: string;
    fallbackTagSummaryVisibleCount: number;
    tagSummaryVisibleCount: number;
};

type DetailedBadgeMetaRowProps = {
    ui: DetailedInfoUiConfig;
    showSecondLineSizeBadge: boolean;
    fileSize?: number | null;
    createdDateLabel: string | null;
    folderName: string;
};

type DetailedBottomRowProps = {
    ui: DetailedInfoUiConfig;
    showFileSize: boolean;
    fileSize?: number | null;
    TagSummaryRenderer: FileCardInfoCommonProps['TagSummaryRenderer'];
};

function getDetailedInfoUiConfig(displayPreset: FileCardInfoCommonProps['displayPreset']): DetailedInfoUiConfig {
    const detailedUiPreset = displayPreset.detailedInfoUi;
    const isDetailedHorizontalMode = displayPreset.definition.cardDirection === 'horizontal';

    return {
        isDetailedHorizontalMode,
        detailedPanelBadgeKeys: detailedUiPreset.detailedPanelBadgeKeys,
        isBadgeMetaMode: detailedUiPreset.isBadgeMetaMode,
        containerClass: detailedUiPreset.containerClass,
        titleClass: detailedUiPreset.titleClass,
        metaLineClass: detailedUiPreset.metaLineClass,
        folderBadgeMaxWidthClass: detailedUiPreset.folderBadgeMaxWidthClass,
        bottomRowClass: detailedUiPreset.bottomRowClass,
        standaloneFileSizeClass: detailedUiPreset.standaloneFileSizeClass,
        fallbackTagSummaryVisibleCount: detailedUiPreset.fallbackTagSummaryVisibleCount,
        tagSummaryVisibleCount: detailedUiPreset.tagSummaryVisibleCount,
    };
}

const DETAILED_PANEL_BADGE_LABELS: Record<DetailedPanelBadgeKey, string> = {
    size: 'サイズ',
    extension: '拡張子',
    updatedDate: '更新日',
    folder: 'フォルダ',
};

const DetailedBadgeMetaRow = React.memo(({
    ui,
    showSecondLineSizeBadge,
    fileSize,
    createdDateLabel,
    folderName,
}: DetailedBadgeMetaRowProps) => {
    return (
        <div className="mt-0.5 mb-0.5 min-h-[16px] flex min-w-0 items-center gap-1 overflow-hidden">
            {showSecondLineSizeBadge && !!fileSize && (
                <span className="inline-flex items-center flex-shrink-0 px-1.5 py-0.5 rounded whitespace-nowrap text-[8px] leading-none font-medium text-surface-300 bg-surface-700/80">
                    {formatFileSize(fileSize)}
                </span>
            )}
            {createdDateLabel && (
                <span className="inline-flex items-center flex-shrink-0 px-1.5 py-0.5 rounded whitespace-nowrap text-[8px] leading-none font-medium text-surface-300 bg-surface-700/50 border border-surface-600/60">
                    {createdDateLabel}
                </span>
            )}
            {folderName && (
                <span className={`inline-flex min-w-0 shrink items-center px-1.5 py-0.5 rounded text-[8px] leading-none font-medium text-surface-300 bg-surface-700/50 border border-surface-600/60 ${ui.folderBadgeMaxWidthClass}`}>
                    <span className="truncate">{folderName}</span>
                </span>
            )}
        </div>
    );
});

DetailedBadgeMetaRow.displayName = 'DetailedBadgeMetaRow';

const DetailedBottomRow = React.memo(({
    ui,
    showFileSize,
    fileSize,
    TagSummaryRenderer,
}: DetailedBottomRowProps) => {
    return (
        <div className={ui.bottomRowClass}>
            {!ui.isBadgeMetaMode && showFileSize && !!fileSize && (
                <span
                    className={`flex-shrink-0 px-1.5 py-0.5 rounded whitespace-nowrap ${ui.standaloneFileSizeClass}`}
                >
                    {formatFileSize(fileSize)}
                </span>
            )}
            {ui.isBadgeMetaMode ? (
                <div className="min-w-0 flex-1">
                    <TagSummaryRenderer visibleCount={ui.tagSummaryVisibleCount} />
                </div>
            ) : (
                <TagSummaryRenderer visibleCount={ui.fallbackTagSummaryVisibleCount} />
            )}
        </div>
    );
});

DetailedBottomRow.displayName = 'DetailedBottomRow';

export const FileCardInfoDetailed = React.memo(({
    file,
    displayPreset,
    infoAreaHeight,
    showFileSize,
    TagSummaryRenderer,
}: FileCardInfoCommonProps) => {
    const ui = getDetailedInfoUiConfig(displayPreset);
    const showMetaLine = !ui.isBadgeMetaMode;
    const showSecondLineSizeBadge = ui.isBadgeMetaMode && showFileSize && !!file.size;
    const folderName = getDisplayFolderName(file.path);
    const createdDateLabel = file.createdAt
        ? new Date(file.createdAt).toLocaleDateString('ja-JP', {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\//g, '/')
        : null;
    const updatedDateLabel = file.mtimeMs
        ? new Date(file.mtimeMs).toLocaleDateString('ja-JP', {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\//g, '/')
        : null;
    const extension = file.name.includes('.')
        ? file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase()
        : '';

    if (ui.isDetailedHorizontalMode) {
        const detailedPanelBadgeValues: Record<DetailedPanelBadgeKey, string> = {
            size: showFileSize && !!file.size ? formatFileSize(file.size) : '-',
            extension: extension || '-',
            updatedDate: updatedDateLabel || '-',
            folder: folderName || '-',
        };
        const detailedPanelBadges = ui.detailedPanelBadgeKeys.map((key) => ({
            key,
            label: DETAILED_PANEL_BADGE_LABELS[key],
            value: detailedPanelBadgeValues[key],
        }));

        return (
            <div
                className={ui.containerClass}
                style={{ height: '100%' }}
            >
                <h3
                    className={ui.titleClass}
                    title={file.name}
                >
                    {file.name}
                </h3>

                <div className="grid grid-cols-2 gap-1">
                    {detailedPanelBadges.map((badge) => (
                        <div
                            key={badge.key}
                            className="min-w-0 rounded bg-surface-700/60 px-1.5 py-1"
                            title={`${badge.label}: ${badge.value}`}
                        >
                            <div className="truncate text-[8px] leading-none text-surface-400">{badge.label}</div>
                            <div className={`mt-0.5 truncate text-[10px] font-semibold leading-tight text-surface-100 ${badge.key === 'folder' ? ui.folderBadgeMaxWidthClass : ''}`}>
                                {badge.value}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-1 min-w-0">
                    <TagSummaryRenderer visibleCount={ui.tagSummaryVisibleCount} />
                </div>
            </div>
        );
    }

    return (
        <div
            className={ui.containerClass}
            style={{ height: `${infoAreaHeight}px` }}
        >
            <h3
                className={ui.titleClass}
                title={file.name}
            >
                {file.name}
            </h3>
            {showMetaLine ? (
                <div className={ui.metaLineClass}>
                    {folderName}
                    {file.createdAt && (
                        <>
                            {' · '}
                            {createdDateLabel}
                        </>
                    )}
                    {file.accessCount > 0 && (
                        <>
                            {' · '}
                            <Eye size={9} className="inline-block" style={{ verticalAlign: 'text-top' }} />
                            {' '}{file.accessCount}回
                        </>
                    )}
                    {file.externalOpenCount > 0 && (
                        <>
                            {' · '}
                            <span title="外部アプリで開いた回数">↗{file.externalOpenCount}回</span>
                        </>
                    )}
                </div>
            ) : (
                <DetailedBadgeMetaRow
                    ui={ui}
                    showSecondLineSizeBadge={showSecondLineSizeBadge}
                    fileSize={file.size}
                    createdDateLabel={createdDateLabel}
                    folderName={folderName}
                />
            )}
            <DetailedBottomRow
                ui={ui}
                showFileSize={showFileSize}
                fileSize={file.size}
                TagSummaryRenderer={TagSummaryRenderer}
            />
        </div>
    );
});

FileCardInfoDetailed.displayName = 'FileCardInfoDetailed';
