import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { AppWindow, Database, FileText, HardDrive, Image, RefreshCw, Settings, ShieldCheck, Star } from 'lucide-react';
import type { SettingsModalTab } from '../../stores/useUIStore';

interface SettingsTabNavProps {
    activeTab: SettingsModalTab;
    onSelectTab: (tab: SettingsModalTab) => void;
}

interface TabItem {
    id: SettingsModalTab;
    section: 'settings' | 'management';
    label: string;
    description: string;
    icon: LucideIcon;
}

export const SETTINGS_TAB_ITEMS: TabItem[] = [
    { id: 'general', section: 'settings', label: '一般 / 表示', description: '基本動作と一覧表示の既定値', icon: Settings },
    { id: 'thumbnails', section: 'settings', label: 'プレビュー / 再生', description: 'ホバー動作と右パネルの再生設定', icon: Image },
    { id: 'scan', section: 'settings', label: 'スキャン', description: '対応形式と読込速度の設定', icon: RefreshCw },
    { id: 'ratings', section: 'settings', label: '評価', description: '評価軸と並び順の設定', icon: Star },
    { id: 'apps', section: 'settings', label: '連携', description: '検索先と外部連携の設定', icon: AppWindow },
    { id: 'maintenance', section: 'management', label: '更新', description: '更新確認と適用導線', icon: ShieldCheck },
    { id: 'storage', section: 'management', label: '保存 / キャッシュ', description: '保存場所とデータ移行の設定', icon: HardDrive },
    { id: 'logs', section: 'management', label: 'ログ', description: 'ログ確認と共有の操作', icon: FileText },
    { id: 'backup', section: 'management', label: 'バックアップ / 入出力', description: 'バックアップとCSV入出力', icon: Database },
];

export function getSettingsTabMeta(tab: SettingsModalTab) {
    return SETTINGS_TAB_ITEMS.find((item) => item.id === tab) ?? SETTINGS_TAB_ITEMS[0];
}

const TAB_SECTIONS: Array<{
    id: TabItem['section'];
    label: string;
    description: string;
}> = [
    { id: 'settings', label: '設定', description: '既定の動作や表示を決めます。' },
    { id: 'management', label: '管理', description: '更新、保守、共有などの操作です。' },
];

export const SettingsTabNav = React.memo(({ activeTab, onSelectTab }: SettingsTabNavProps) => (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-surface-700 bg-surface-950/35">
        <div className="border-b border-surface-800 px-4 py-4">
            <div className="text-[11px] font-semibold tracking-[0.14em] text-surface-500">
                カテゴリ
            </div>
            <p className="mt-1 text-xs leading-relaxed text-surface-500">
                設定項目を分類して表示します。
            </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
            {TAB_SECTIONS.map((section) => {
                const items = SETTINGS_TAB_ITEMS.filter((item) => item.section === section.id);
                return (
                    <div key={section.id} className="mb-4 last:mb-0">
                        <div className="px-3 pb-2">
                            <div className="text-[11px] font-semibold tracking-[0.14em] text-surface-500">
                                {section.label}
                            </div>
                            <div className="mt-1 text-[11px] leading-relaxed text-surface-500">
                                {section.description}
                            </div>
                        </div>

                        <div className="space-y-1">
                            {items.map(({ id, label, description, icon: Icon }) => {
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
                        </div>
                    </div>
                );
            })}
        </nav>
    </aside>
));

SettingsTabNav.displayName = 'SettingsTabNav';
