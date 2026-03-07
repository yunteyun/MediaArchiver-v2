import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { AppWindow, Database, FileText, HardDrive, Image, RefreshCw, Settings } from 'lucide-react';
import type { SettingsModalTab } from '../../stores/useUIStore';

interface SettingsTabNavProps {
    activeTab: SettingsModalTab;
    onSelectTab: (tab: SettingsModalTab) => void;
}

interface TabItem {
    id: Exclude<SettingsModalTab, 'ratings'>;
    label: string;
    icon: LucideIcon;
}

const TAB_ITEMS: TabItem[] = [
    { id: 'general', label: '一般', icon: Settings },
    { id: 'thumbnails', label: 'サムネイル', icon: Image },
    { id: 'scan', label: 'スキャン', icon: RefreshCw },
    { id: 'storage', label: 'ストレージ', icon: HardDrive },
    { id: 'apps', label: '外部アプリ', icon: AppWindow },
    { id: 'logs', label: 'ログ', icon: FileText },
    { id: 'backup', label: 'バックアップ', icon: Database },
];

export const SettingsTabNav = React.memo(({ activeTab, onSelectTab }: SettingsTabNavProps) => (
    <div className="flex flex-nowrap overflow-x-auto border-b border-surface-700">
        {TAB_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
                key={id}
                onClick={() => onSelectTab(id)}
                className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${activeTab === id
                    ? 'text-primary-400 border-b-2 border-primary-400'
                    : 'text-surface-400 hover:text-surface-200'
                    }`}
            >
                <span className="flex items-center gap-2">
                    <Icon size={16} />
                    {label}
                </span>
            </button>
        ))}
    </div>
));

SettingsTabNav.displayName = 'SettingsTabNav';
