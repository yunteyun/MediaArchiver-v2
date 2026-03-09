import React from 'react';
import { Copy, LayoutDashboard, Settings, X } from 'lucide-react';

interface HiddenScanIndicator {
    className: string;
    title: string;
    icon: React.ReactNode;
    text: string;
    detail?: string;
}

interface SidebarUtilityActionsProps {
    sidebarCollapsed: boolean;
    showTopSeparator?: boolean;
    duplicateViewOpen: boolean;
    mainView: 'grid' | 'profile';
    onOpenDuplicateView: () => void;
    onOpenProfileHome: () => void;
    onOpenSettings: () => void;
    hiddenScanIndicator: HiddenScanIndicator | null;
    canDismissScanIndicator: boolean;
    onShowScanProgress: () => void;
    onDismissScanIndicator: () => void;
}

export const SidebarUtilityActions = React.memo(({
    sidebarCollapsed,
    showTopSeparator = true,
    duplicateViewOpen,
    mainView,
    onOpenDuplicateView,
    onOpenProfileHome,
    onOpenSettings,
    hiddenScanIndicator,
    canDismissScanIndicator,
    onShowScanProgress,
    onDismissScanIndicator,
}: SidebarUtilityActionsProps) => (
    <>
        {showTopSeparator && <div className="border-t border-surface-700 my-2" />}
        <div
            onClick={onOpenDuplicateView}
            className={`
                flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
                ${duplicateViewOpen
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-surface-800 text-surface-300'}
                ${sidebarCollapsed ? 'justify-center' : ''}
            `}
            title="重複ファイルを検出"
        >
            <Copy size={18} className="flex-shrink-0 text-current" />
            {!sidebarCollapsed && (
                <span className="truncate text-sm font-medium">重複チェック</span>
            )}
        </div>

        <div
            onClick={onOpenProfileHome}
            className={`
                flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
                ${mainView === 'profile'
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-surface-800 text-surface-300'}
                ${sidebarCollapsed ? 'justify-center' : ''}
            `}
            title="プロファイルトップ"
        >
            <LayoutDashboard size={18} className="flex-shrink-0 text-current" />
            {!sidebarCollapsed && (
                <span className="truncate text-sm font-medium">プロファイル</span>
            )}
        </div>

        <div
            onClick={onOpenSettings}
            className={`
                flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
                hover:bg-surface-800 text-surface-300
                ${sidebarCollapsed ? 'justify-center' : ''}
            `}
            title="設定"
        >
            <Settings size={18} className="flex-shrink-0 text-current" />
            {!sidebarCollapsed && (
                <span className="truncate text-sm font-medium">設定</span>
            )}
        </div>

        {hiddenScanIndicator && (
            <div
                onClick={onShowScanProgress}
                className={`
                    flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
                    ${hiddenScanIndicator.className}
                    ${sidebarCollapsed ? 'justify-center' : ''}
                `}
                title={hiddenScanIndicator.title}
            >
                {hiddenScanIndicator.icon}
                {!sidebarCollapsed && (
                    <>
                        <span className="min-w-0 flex-1">
                            <span className="truncate block text-sm font-medium">{hiddenScanIndicator.text}</span>
                            {hiddenScanIndicator.detail && (
                                <span className="truncate block text-[11px] text-surface-500">
                                    {hiddenScanIndicator.detail}
                                </span>
                            )}
                        </span>
                        {canDismissScanIndicator && (
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onDismissScanIndicator();
                                }}
                                className="ml-auto rounded p-1 text-surface-400 transition-colors hover:bg-surface-700 hover:text-surface-100"
                                title="表示を閉じる"
                                aria-label="表示を閉じる"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </>
                )}
            </div>
        )}
    </>
));

SidebarUtilityActions.displayName = 'SidebarUtilityActions';
