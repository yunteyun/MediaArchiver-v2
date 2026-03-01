import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface SidebarSectionHeaderProps {
    icon: LucideIcon;
    title: string;
    actions?: React.ReactNode;
    className?: string;
}

export const SidebarSectionHeader = React.memo(({
    icon: Icon,
    title,
    actions,
    className = '',
}: SidebarSectionHeaderProps) => {
    return (
        <div className={`flex items-center justify-between gap-2 px-2 py-2 rounded text-surface-300 ${className}`.trim()}>
            <div className="flex items-center gap-2 min-w-0 text-sm font-medium text-current">
                <Icon size={18} />
                <span className="truncate">{title}</span>
            </div>
            {actions && (
                <div className="flex items-center gap-2 flex-shrink-0">
                    {actions}
                </div>
            )}
        </div>
    );
});

SidebarSectionHeader.displayName = 'SidebarSectionHeader';
