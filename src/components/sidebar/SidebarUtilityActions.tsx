import React from 'react';
import { BarChart3, Copy, Settings, X } from 'lucide-react';

interface HiddenScanIndicator {
    className: string;
    title: string;
    icon: React.ReactNode;
    text: string;
}

interface SidebarUtilityActionsProps {
    sidebarCollapsed: boolean;
    duplicateViewOpen: boolean;
    mainView: 'grid' | 'statistics';
    onOpenDuplicateView: () => void;
    onOpenStatistics: () => void;
    onOpenSettings: () => void;
    hiddenScanIndicator: HiddenScanIndicator | null;
    canDismissScanIndicator: boolean;
    onShowScanProgress: () => void;
    onDismissScanIndicator: () => void;
}

export const SidebarUtilityActions = React.memo(({
    sidebarCollapsed,
    duplicateViewOpen,
    mainView,
    onOpenDuplicateView,
    onOpenStatistics,
    onOpenSettings,
    hiddenScanIndicator,
    canDismissScanIndicator,
    onShowScanProgress,
    onDismissScanIndicator,
}: SidebarUtilityActionsProps) => (
    <>
        <div className="border-t border-surface-700 my-2" />
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
            onClick={onOpenStatistics}
            className={`
                flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
                ${mainView === 'statistics'
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-surface-800 text-surface-300'}
                ${sidebarCollapsed ? 'justify-center' : ''}
            `}
            title="ライブラリ統計"
        >
            <BarChart3 size={18} className="flex-shrink-0 text-current" />
            {!sidebarCollapsed && (
                <span className="truncate text-sm font-medium">統計</span>
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
                        <span className="truncate text-sm font-medium">{hiddenScanIndicator.text}</span>
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
