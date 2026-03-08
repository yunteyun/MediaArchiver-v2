import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { AppWindow, Database, FileText, HardDrive, Image, RefreshCw, Settings, Star } from 'lucide-react';
import type { SettingsModalTab } from '../../stores/useUIStore';

interface SettingsTabNavProps {
    activeTab: SettingsModalTab;
    onSelectTab: (tab: SettingsModalTab) => void;
}

interface TabItem {
    id: SettingsModalTab;
    label: string;
    description: string;
    icon: LucideIcon;
}

export const SETTINGS_TAB_ITEMS: TabItem[] = [
    { id: 'general', label: '一般', description: '表示や更新導線などの基本設定', icon: Settings },
    { id: 'thumbnails', label: 'サムネイル', description: 'プレビューやカード表示の見え方', icon: Image },
    { id: 'scan', label: 'スキャン', description: '対応形式とフォルダ別の読込設定', icon: RefreshCw },
    { id: 'storage', label: 'ストレージ', description: '保存場所とデータ移行', icon: HardDrive },
    { id: 'apps', label: '外部アプリ', description: '検索先や連携アプリの管理', icon: AppWindow },
    { id: 'logs', label: 'ログ', description: 'トラブル調査用のログ確認', icon: FileText },
    { id: 'backup', label: 'バックアップ', description: 'バックアップと入出力', icon: Database },
    { id: 'ratings', label: '評価', description: '評価軸の追加や並び替え', icon: Star },
];

export function getSettingsTabMeta(tab: SettingsModalTab) {
    return SETTINGS_TAB_ITEMS.find((item) => item.id === tab) ?? SETTINGS_TAB_ITEMS[0];
}

export const SettingsTabNav = React.memo(({ activeTab, onSelectTab }: SettingsTabNavProps) => (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-surface-700 bg-surface-950/35">
        <div className="border-b border-surface-800 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-500">
                Category
            </div>
            <p className="mt-1 text-xs leading-relaxed text-surface-500">
                設定項目を分類して表示します。
            </p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
            {SETTINGS_TAB_ITEMS.map(({ id, label, description, icon: Icon }) => {
                const isActive = activeTab === id;

                return (
                    <button
                        key={id}
                        type="button"
                        onClick={() => onSelectTab(id)}
                        className={`flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors ${isActive
                            ? 'bg-primary-500/12 text-surface-100 ring-1 ring-primary-500/40'
                            : 'text-surface-400 hover:bg-surface-800/70 hover:text-surface-100'
                            }`}
                    >
                        <Icon
                            size={16}
                            className={`mt-0.5 shrink-0 ${isActive ? 'text-primary-300' : 'text-surface-500'}`}
                        />
                        <span className="min-w-0">
                            <span className="block text-sm font-medium">{label}</span>
                            <span className={`mt-1 block text-xs leading-relaxed ${isActive ? 'text-surface-300' : 'text-surface-500'}`}>
                                {description}
                            </span>
                        </span>
                    </button>
                );
            })}
        </nav>
    </aside>
));

SettingsTabNav.displayName = 'SettingsTabNav';
