import type { LucideIcon } from 'lucide-react';
import { AppWindow, Database, FileText, HardDrive, Image, RefreshCw, Settings, ShieldCheck, Star } from 'lucide-react';
import type { SettingsModalTab } from '../../stores/useUIStore';

export interface SettingsTabItem {
    id: SettingsModalTab;
    section: 'settings' | 'management';
    label: string;
    description: string;
    icon: LucideIcon;
}

export const SETTINGS_TAB_ITEMS: SettingsTabItem[] = [
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
