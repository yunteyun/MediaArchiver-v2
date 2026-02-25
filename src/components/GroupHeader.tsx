import React from 'react';
import * as LucideIcons from 'lucide-react';
import type { FileGroup } from '../utils/groupFiles';
import { formatFileSize } from '../utils/groupFiles';

interface GroupHeaderProps {
    group: FileGroup;
    sticky?: boolean;
}

/**
 * グループヘッダーコンポーネント（Phase 12-10）
 */
export const GroupHeader: React.FC<GroupHeaderProps> = ({ group, sticky = true }) => {
    const Icon = group.icon ? (LucideIcons[group.icon as keyof typeof LucideIcons] as React.ComponentType<{ size?: number; className?: string }>) : null;

    // グループ内のファイルの合計サイズを計算
    const totalSize = group.files.reduce((sum, file) => sum + file.size, 0);

    return (
        <div className={`h-10 px-4 py-2 bg-surface-800 border-b border-surface-700 flex items-center gap-2 ${sticky ? 'sticky top-0 z-10' : ''}`}>
            {Icon && <Icon size={18} className="text-surface-400" />}
            <span className="text-surface-200 font-medium">
                {group.label}
            </span>
            <span className="text-surface-500 text-sm ml-2">
                {group.files.length}件
            </span>
            <span className="text-surface-600 text-xs ml-auto">
                {formatFileSize(totalSize)}
            </span>
        </div>
    );
};
