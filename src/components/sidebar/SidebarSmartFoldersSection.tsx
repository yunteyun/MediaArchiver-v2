import React from 'react';
import { createPortal } from 'react-dom';
import {
    ArrowDown,
    ArrowUp,
    BookmarkPlus,
    Copy,
    Filter,
    FolderOpen,
    Pencil,
    Search,
    SlidersHorizontal,
    Sparkles,
    Star,
    Tag,
    Trash2,
    X,
} from 'lucide-react';
import type { SmartFolderV1 } from '../../stores/useSmartFolderStore';
import { useRatingDisplay } from '../ratings/useRatingDisplay';

interface SmartFolderSummaryItem {
    kind: 'scope' | 'search' | 'tags' | 'ratings' | 'quickRating' | 'types';
    detail: string;
    shortLabel?: string;
}

interface SmartFolderSummary {
    details: string[];
    items: SmartFolderSummaryItem[];
}

interface SmartFolderTooltipState {
    smartFolderId: string;
    smartFolderName: string;
    anchorRect: DOMRect;
    details: string[];
}

interface SmartFolderActionMenuState {
    smartFolderId: string;
    smartFolderName: string;
    anchorRect: DOMRect;
    canMoveUp: boolean;
    canMoveDown: boolean;
}

interface SidebarSmartFoldersSectionProps {
    sidebarCollapsed: boolean;
    activeSmartFolder: SmartFolderV1 | null;
    activeSmartFolderConditionStatus: 'matched' | 'changed' | 'none';
    smartFolderMutating: boolean;
    smartFolderLoading: boolean;
    smartFolders: SmartFolderV1[];
    activeSmartFolderId: string | null;
    smartFolderSummaryMap: Map<string, SmartFolderSummary>;
    onClearSmartFolderConditions: () => void;
    onOpenCreateSmartFolderEditor: () => void;
    onOpenTemplateSmartFolderEditor: (templateKey: 'midOrAbove' | 'unrated') => void;
    onApplySmartFolder: (smartFolderId: string) => void;
    onDuplicateSmartFolder: (smartFolderId: string) => void;
    onMoveSmartFolder: (smartFolderId: string, direction: 'up' | 'down') => void;
    onOpenEditSmartFolderEditor: (smartFolderId: string) => void;
    onDeleteSmartFolder: (smartFolderId: string, smartFolderName: string) => void;
}

export const SidebarSmartFoldersSection = React.memo(({
    sidebarCollapsed,
    activeSmartFolder,
    activeSmartFolderConditionStatus,
    smartFolderMutating,
    smartFolderLoading,
    smartFolders,
    activeSmartFolderId,
    smartFolderSummaryMap,
    onClearSmartFolderConditions,
    onOpenCreateSmartFolderEditor,
    onOpenTemplateSmartFolderEditor,
    onApplySmartFolder,
    onDuplicateSmartFolder,
    onMoveSmartFolder,
    onOpenEditSmartFolderEditor,
    onDeleteSmartFolder,
}: SidebarSmartFoldersSectionProps) => {
    const { getQuickFilterLabel } = useRatingDisplay();
    const [tooltipState, setTooltipState] = React.useState<SmartFolderTooltipState | null>(null);
    const [actionMenuState, setActionMenuState] = React.useState<SmartFolderActionMenuState | null>(null);
    const actionMenuRef = React.useRef<HTMLDivElement | null>(null);

    const getSummaryIcon = (kind: SmartFolderSummaryItem['kind']) => {
        switch (kind) {
            case 'scope':
                return FolderOpen;
            case 'search':
                return Search;
            case 'tags':
                return Tag;
            case 'ratings':
                return SlidersHorizontal;
            case 'quickRating':
                return Star;
            case 'types':
                return Filter;
            default:
                return Filter;
        }
    };

    React.useEffect(() => {
        if (!actionMenuState) return undefined;

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (actionMenuRef.current?.contains(target)) return;
            setActionMenuState(null);
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setActionMenuState(null);
            }
        };

        const handleViewportChange = () => {
            setActionMenuState(null);
            setTooltipState(null);
        };

        document.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('resize', handleViewportChange);
        window.addEventListener('scroll', handleViewportChange, true);
        window.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('resize', handleViewportChange);
            window.removeEventListener('scroll', handleViewportChange, true);
            window.removeEventListener('keydown', handleEscape);
        };
    }, [actionMenuState]);

    React.useEffect(() => {
        if (!tooltipState) return undefined;

        const handleViewportChange = () => {
            setTooltipState(null);
        };

        window.addEventListener('resize', handleViewportChange);
        window.addEventListener('scroll', handleViewportChange, true);

        return () => {
            window.removeEventListener('resize', handleViewportChange);
            window.removeEventListener('scroll', handleViewportChange, true);
        };
    }, [tooltipState]);

    const openTooltip = React.useCallback((
        smartFolderId: string,
        smartFolderName: string,
        details: string[],
        anchorRect: DOMRect
    ) => {
        setTooltipState({
            smartFolderId,
            smartFolderName,
            anchorRect,
            details,
        });
    }, []);

    const closeTooltip = React.useCallback((smartFolderId: string) => {
        setTooltipState((prev) => (prev?.smartFolderId === smartFolderId ? null : prev));
    }, []);

    const handleOpenActionMenu = React.useCallback((
        event: React.MouseEvent<HTMLButtonElement>,
        smartFolderId: string,
        smartFolderName: string,
        canMoveUp: boolean,
        canMoveDown: boolean
    ) => {
        event.preventDefault();
        event.stopPropagation();
        const rect = event.currentTarget.getBoundingClientRect();
        setActionMenuState((prev) => (
            prev?.smartFolderId === smartFolderId
                ? null
                : {
                    smartFolderId,
                    smartFolderName,
                    anchorRect: rect,
                    canMoveUp,
                    canMoveDown,
                }
        ));
    }, []);

    const renderTooltip = () => {
        if (!tooltipState) return null;

        const tooltipWidth = 280;
        const tooltipHeightEstimate = 112 + Math.max(0, tooltipState.details.length - 3) * 20;
        const viewportPadding = 12;
        const gap = 8;
        const showBelow = window.innerHeight - tooltipState.anchorRect.bottom >= tooltipHeightEstimate
            || tooltipState.anchorRect.top < tooltipHeightEstimate;
        const top = showBelow
            ? Math.min(
                tooltipState.anchorRect.bottom + gap,
                window.innerHeight - tooltipHeightEstimate - viewportPadding
            )
            : Math.max(viewportPadding, tooltipState.anchorRect.top - tooltipHeightEstimate - gap);
        const left = Math.min(
            Math.max(viewportPadding, tooltipState.anchorRect.left),
            window.innerWidth - tooltipWidth - viewportPadding
        );

        return createPortal(
            <div
                className="pointer-events-none fixed rounded-lg border border-surface-600 bg-surface-900/95 px-3 py-2 text-xs text-surface-200 shadow-xl"
                style={{ top, left, width: tooltipWidth, zIndex: 'var(--z-dropdown)' }}
            >
                <div className="mb-1 font-medium text-white">{tooltipState.smartFolderName}</div>
                <div className="space-y-1 text-[11px] leading-4 text-surface-300">
                    {tooltipState.details.map((detail, index) => (
                        <div key={`${tooltipState.smartFolderId}-detail-${index}`}>{detail}</div>
                    ))}
                </div>
            </div>,
            document.body
        );
    };

    const renderActionMenu = () => {
        if (!actionMenuState) return null;

        const menuWidth = 168;
        const menuHeightEstimate = 200;
        const viewportPadding = 12;
        const gap = 8;
        const showBelow = window.innerHeight - actionMenuState.anchorRect.bottom >= menuHeightEstimate
            || actionMenuState.anchorRect.top < menuHeightEstimate;
        const top = showBelow
            ? Math.min(
                actionMenuState.anchorRect.bottom + gap,
                window.innerHeight - menuHeightEstimate - viewportPadding
            )
            : Math.max(viewportPadding, actionMenuState.anchorRect.top - menuHeightEstimate - gap);
        const left = Math.min(
            Math.max(viewportPadding, actionMenuState.anchorRect.right - menuWidth),
            window.innerWidth - menuWidth - viewportPadding
        );

        const closeMenu = () => setActionMenuState(null);

        return createPortal(
            <div
                ref={actionMenuRef}
                className="fixed rounded-lg border border-surface-600 bg-surface-900 p-1.5 shadow-xl"
                style={{ top, left, width: menuWidth, zIndex: 'var(--z-dropdown)' }}
            >
                <div className="px-2 py-1 text-[11px] font-medium text-surface-400">
                    {actionMenuState.smartFolderName}
                </div>
                <button
                    type="button"
                    onClick={() => {
                        closeMenu();
                        onOpenEditSmartFolderEditor(actionMenuState.smartFolderId);
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-surface-200 hover:bg-surface-800"
                >
                    <Pencil size={12} />
                    条件を編集
                </button>
                <button
                    type="button"
                    onClick={() => {
                        closeMenu();
                        onDuplicateSmartFolder(actionMenuState.smartFolderId);
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-surface-200 hover:bg-surface-800"
                >
                    <Copy size={12} />
                    複製
                </button>
                <button
                    type="button"
                    onClick={() => {
                        closeMenu();
                        onMoveSmartFolder(actionMenuState.smartFolderId, 'up');
                    }}
                    disabled={!actionMenuState.canMoveUp}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs ${
                        actionMenuState.canMoveUp
                            ? 'text-surface-200 hover:bg-surface-800'
                            : 'cursor-default text-surface-500'
                    }`}
                >
                    <ArrowUp size={12} />
                    上へ移動
                </button>
                <button
                    type="button"
                    onClick={() => {
                        closeMenu();
                        onMoveSmartFolder(actionMenuState.smartFolderId, 'down');
                    }}
                    disabled={!actionMenuState.canMoveDown}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs ${
                        actionMenuState.canMoveDown
                            ? 'text-surface-200 hover:bg-surface-800'
                            : 'cursor-default text-surface-500'
                    }`}
                >
                    <ArrowDown size={12} />
                    下へ移動
                </button>
                <div className="my-1 border-t border-surface-700" />
                <button
                    type="button"
                    onClick={() => {
                        closeMenu();
                        onDeleteSmartFolder(actionMenuState.smartFolderId, actionMenuState.smartFolderName);
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-red-300 hover:bg-surface-800"
                >
                    <Trash2 size={12} />
                    削除
                </button>
            </div>,
            document.body
        );
    };

    if (sidebarCollapsed) {
        return null;
    }

    return (
        <>
        <div className="px-2 pb-1">
            <div className="mb-2 flex items-center justify-end gap-1">
                {activeSmartFolder && (
                    <button
                        type="button"
                        onClick={onClearSmartFolderConditions}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-amber-300 hover:bg-surface-800"
                        title="範囲 / 検索 / タグ / 評価 / タイプの条件を解除"
                        disabled={smartFolderMutating}
                    >
                        <X size={12} />
                        解除
                    </button>
                )}
                <button
                    type="button"
                    onClick={onOpenCreateSmartFolderEditor}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-surface-300 hover:bg-surface-800"
                    title="現在の条件を保存"
                    disabled={smartFolderMutating}
                >
                    <BookmarkPlus size={12} />
                    保存
                </button>
            </div>

            <div className={`mb-1 rounded border px-2 py-1 text-[10px] ${
                activeSmartFolderConditionStatus === 'none'
                    ? 'border-surface-700 text-surface-500'
                    : activeSmartFolderConditionStatus === 'matched'
                        ? 'border-blue-500/30 text-blue-200'
                        : 'border-amber-500/40 text-amber-200'
            }`}>
                {activeSmartFolderConditionStatus === 'none' ? (
                    <span>状態: 未適用</span>
                ) : activeSmartFolderConditionStatus === 'matched' ? (
                    <span>適用中: {activeSmartFolder?.name}（保存条件と一致）</span>
                ) : (
                    <span>適用中: {activeSmartFolder?.name}（条件変更済み / 解除可能）</span>
                )}
            </div>

            <div className="mb-2 flex flex-wrap gap-1">
                <button
                    type="button"
                    onClick={() => onOpenTemplateSmartFolderEditor('midOrAbove')}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-surface-300 hover:bg-surface-800"
                    title={`${getQuickFilterLabel('midOrAbove')} のテンプレートから作成`}
                >
                    <Sparkles size={11} />
                    {getQuickFilterLabel('midOrAbove')}
                </button>
                <button
                    type="button"
                    onClick={() => onOpenTemplateSmartFolderEditor('unrated')}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-surface-300 hover:bg-surface-800"
                    title={`${getQuickFilterLabel('unrated')} のテンプレートから作成`}
                >
                    <Sparkles size={11} />
                    {getQuickFilterLabel('unrated')}
                </button>
            </div>

            {smartFolderLoading ? (
                <div className="px-2 py-1 text-xs text-surface-500">読み込み中...</div>
            ) : smartFolders.length === 0 ? (
                <div className="px-2 py-1 text-xs text-surface-500">保存済み条件はありません</div>
            ) : (
                <div className="space-y-1">
                    {smartFolders.map((smartFolder, index) => {
                        const isActive = activeSmartFolderId === smartFolder.id;
                        const canMoveUp = index > 0;
                        const canMoveDown = index < smartFolders.length - 1;
                        const summary = smartFolderSummaryMap.get(smartFolder.id);
                        return (
                            <div
                                key={smartFolder.id}
                                className={`w-full flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                                    isActive
                                        ? 'bg-blue-600 text-white'
                                        : 'text-surface-300 hover:bg-surface-800'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isActive) {
                                            onClearSmartFolderConditions();
                                            return;
                                        }
                                        onApplySmartFolder(smartFolder.id);
                                    }}
                                    className="min-w-0 flex-1 text-left"
                                    onMouseEnter={(event) => {
                                        if (!summary) return;
                                        openTooltip(smartFolder.id, smartFolder.name, summary.details, event.currentTarget.getBoundingClientRect());
                                    }}
                                    onMouseLeave={() => closeTooltip(smartFolder.id)}
                                    aria-label={isActive
                                        ? `${smartFolder.name}（再クリックで解除）`
                                        : `${smartFolder.name}（クリックで適用）`}
                                >
                                    <span className="block truncate">{smartFolder.name}</span>
                                    <span className="mt-1 flex items-center gap-1.5">
                                        {summary?.items.map((item, itemIndex) => {
                                            const Icon = getSummaryIcon(item.kind);
                                            return (
                                                <span
                                                    key={`${smartFolder.id}-${item.kind}-${itemIndex}`}
                                                    className={`inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] ${
                                                        isActive
                                                            ? 'bg-blue-500/25 text-blue-50'
                                                            : 'bg-surface-800 text-surface-400'
                                                    }`}
                                                >
                                                    <Icon size={10} />
                                                    {item.shortLabel && <span>{item.shortLabel}</span>}
                                                </span>
                                            );
                                        })}
                                    </span>
                                </button>
                                <span className="inline-flex flex-shrink-0 items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            handleOpenActionMenu(event, smartFolder.id, smartFolder.name, canMoveUp, canMoveDown);
                                        }}
                                        className={`rounded p-1 ${isActive ? 'hover:bg-blue-500/40' : 'hover:bg-surface-700'}`}
                                        title="操作を開く"
                                    >
                                        <Pencil size={11} />
                                    </button>
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
        {renderTooltip()}
        {renderActionMenu()}
        </>
    );
});

SidebarSmartFoldersSection.displayName = 'SidebarSmartFoldersSection';
