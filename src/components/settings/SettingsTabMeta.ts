import type { LucideIcon } from 'lucide-react';
import { AppWindow, Database, Monitor, Wrench } from 'lucide-react';
import type { SettingsModalCategory, SettingsSubTab } from '../../stores/useUIStore';

export interface SettingsCategoryItem {
    id: SettingsModalCategory;
    label: string;
    description: string;
    icon: LucideIcon;
}

export interface SettingsSubTabItem {
    id: SettingsSubTab;
    category: SettingsModalCategory;
    label: string;
}

export const SETTINGS_CATEGORIES: SettingsCategoryItem[] = [
    { id: 'display',     label: '表示',         description: '見た目と操作感を設定します。',       icon: Monitor   },
    { id: 'data',        label: 'データ',        description: '取込・整理・保存の設定をします。',   icon: Database  },
    { id: 'integration', label: '連携',          description: '外部アプリと検索先を設定します。',   icon: AppWindow },
    { id: 'maintenance', label: 'メンテナンス',  description: '更新・ログ・入出力の操作です。',     icon: Wrench    },
];

export const SETTINGS_SUB_TABS: SettingsSubTabItem[] = [
    { id: 'list-display',        category: 'display',     label: '一覧表示'           },
    { id: 'card-display',        category: 'display',     label: 'カード表示'         },
    { id: 'playback',            category: 'display',     label: '再生と見た目'       },
    { id: 'preview',             category: 'display',     label: 'プレビュー'         },
    { id: 'ratings',             category: 'display',     label: '評価'               },
    { id: 'scan',                category: 'data',        label: 'スキャン'           },
    { id: 'organize',            category: 'data',        label: '自動整理'           },
    { id: 'storage',             category: 'data',        label: '保存・キャッシュ'   },
    { id: 'external-apps',       category: 'integration', label: '外部アプリ'         },
    { id: 'search-destinations', category: 'integration', label: '検索先'             },
    { id: 'update',              category: 'maintenance', label: '更新'               },
    { id: 'logs',                category: 'maintenance', label: 'ログ'               },
    { id: 'backup',              category: 'maintenance', label: 'バックアップ・入出力' },
];

export function getCategoryMeta(category: SettingsModalCategory): SettingsCategoryItem {
    return SETTINGS_CATEGORIES.find((c) => c.id === category) ?? SETTINGS_CATEGORIES[0];
}

export function getSubTabsForCategory(category: SettingsModalCategory): SettingsSubTabItem[] {
    return SETTINGS_SUB_TABS.filter((s) => s.category === category);
}

export function getDefaultSubTab(category: SettingsModalCategory): SettingsSubTab | null {
    const tabs = getSubTabsForCategory(category);
    return tabs.length > 0 ? tabs[0].id : null;
}
