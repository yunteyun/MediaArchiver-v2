import React from 'react';
import { FolderOpen, HardDrive, RefreshCw } from 'lucide-react';
import { StorageCleanupSection } from './StorageCleanupSection';
import { SettingsSection } from './SettingsSection';

type StorageMode = 'appdata' | 'install' | 'custom';
type StorageMaintenanceSettings = {
    autoCleanupOrphanedThumbnailsOnStartup: boolean;
    autoCleanupThresholdMb: number;
};

interface StorageConfig {
    mode: StorageMode;
    customPath?: string;
    resolvedPath: string;
}

interface MigrationMessage {
    type: 'success' | 'error';
    text: string;
    oldBase?: string;
}

interface StorageSettingsTabProps {
    storageConfig: StorageConfig | null;
    selectedMode: StorageMode;
    onSelectedModeChange: (mode: StorageMode) => void;
    customPath: string;
    onCustomPathChange: (value: string) => void;
    onBrowseCustomPath: () => void;
    migrationMsg: MigrationMessage | null;
    onDeleteOldData: () => void;
    isMigrating: boolean;
    onMigrate: () => void;
    storageMaintenanceSettings: StorageMaintenanceSettings;
    onStorageMaintenanceSettingsChange: (settings: StorageMaintenanceSettings) => void;
    onResetStorageMaintenanceSettings: () => void;
}

export const StorageSettingsTab = React.memo(({
    storageConfig,
    selectedMode,
    onSelectedModeChange,
    customPath,
    onCustomPathChange,
    onBrowseCustomPath,
    migrationMsg,
    onDeleteOldData,
    isMigrating,
    onMigrate,
    storageMaintenanceSettings,
    onStorageMaintenanceSettingsChange,
    onResetStorageMaintenanceSettings,
}: StorageSettingsTabProps) => (
    <div className="px-4 py-4 space-y-6">
        <SettingsSection
            title="保存場所"
            description="データベース、サムネイル、プレビューキャッシュ、ログなどの保存先をまとめて切り替えます。変更時は移行処理が走るため、ここは reset ではなく明示操作のみです。"
            scope="global"
        >
            <p className="text-xs text-surface-500">
                変更後はデータ移行と再起動が必要です。保存先変更は運用操作に近いため、現在値を確認してから実行してください。
            </p>

            {storageConfig && (
                <p className="text-xs text-surface-400">
                    現在: <span className="text-surface-200 font-mono">{storageConfig.resolvedPath}</span>
                </p>
            )}

            <div className="space-y-2">
                {([
                    { value: 'appdata', label: 'AppData（デフォルト）', desc: '%APPDATA%\\media-archiver-v2\\' },
                    { value: 'install', label: 'インストールフォルダ', desc: 'exe と同じフォルダ内の data\\（ポータブル運用）' },
                    { value: 'custom', label: '任意の場所', desc: 'フォルダを選択して指定' },
                ] as { value: StorageMode; label: string; desc: string }[]).map((option) => (
                    <label key={option.value} className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-surface-800">
                        <input
                            type="radio"
                            name="storageMode"
                            value={option.value}
                            checked={selectedMode === option.value}
                            onChange={() => onSelectedModeChange(option.value)}
                            className="mt-0.5 w-4 h-4 accent-primary-500"
                        />
                        <div>
                            <span className="text-sm text-surface-200">{option.label}</span>
                            <span className="block text-xs text-surface-500">{option.desc}</span>
                        </div>
                    </label>
                ))}
            </div>

            {selectedMode === 'custom' && (
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={customPath}
                        onChange={(event) => onCustomPathChange(event.target.value)}
                        placeholder="フォルダパスを入力"
                        className="flex-1 px-3 py-1.5 bg-surface-800 border border-surface-600 rounded text-sm text-surface-200 focus:outline-none focus:border-primary-500"
                    />
                    <button
                        onClick={onBrowseCustomPath}
                        className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-200 text-sm rounded transition-colors flex items-center gap-1"
                    >
                        <FolderOpen size={14} />
                        参照
                    </button>
                </div>
            )}

            {migrationMsg && (
                <div className={`p-3 rounded text-sm ${migrationMsg.type === 'success' ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                    <p>{migrationMsg.text}</p>
                    {migrationMsg.type === 'success' && migrationMsg.oldBase && (
                        <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-surface-400">再起動後に有効になります。旧データ:</span>
                            <button
                                onClick={onDeleteOldData}
                                className="px-2 py-0.5 bg-red-700 hover:bg-red-600 text-white text-xs rounded transition-colors"
                            >
                                旧データを削除
                            </button>
                        </div>
                    )}
                </div>
            )}

            <button
                onClick={onMigrate}
                disabled={isMigrating || (selectedMode === 'custom' && !customPath)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded transition-colors disabled:opacity-50"
            >
                {isMigrating ? <RefreshCw size={14} className="animate-spin" /> : <HardDrive size={14} />}
                {isMigrating ? '移行中...' : '変更して移行'}
            </button>
            <p className="text-xs text-surface-500">
                移行後はアプリの再起動が必要です。旧データは自動削除されません。
            </p>
        </SettingsSection>

        <SettingsSection
            title="自動整理"
            description="孤立サムネイルだけを対象にした軽い保守設定です。アプリ全体に適用されます。"
            scope="global"
            onReset={onResetStorageMaintenanceSettings}
        >
            <label className="flex items-start gap-3 rounded border border-surface-700 bg-surface-900/50 p-3 cursor-pointer hover:border-surface-600">
                <input
                    type="checkbox"
                    checked={storageMaintenanceSettings.autoCleanupOrphanedThumbnailsOnStartup}
                    onChange={(event) => onStorageMaintenanceSettingsChange({
                        ...storageMaintenanceSettings,
                        autoCleanupOrphanedThumbnailsOnStartup: event.target.checked,
                    })}
                    className="mt-0.5 w-4 h-4 accent-primary-500"
                />
                <div>
                    <div className="text-sm text-surface-200">起動時に孤立サムネイルを自動整理</div>
                    <div className="text-xs text-surface-500 mt-0.5">
                        DB に参照されていないサムネイルだけを対象にします。通常のサムネイルは削除しません。
                    </div>
                </div>
            </label>

            <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                    自動整理を実行するしきい値
                </label>
                <select
                    value={storageMaintenanceSettings.autoCleanupThresholdMb}
                    onChange={(event) => onStorageMaintenanceSettingsChange({
                        ...storageMaintenanceSettings,
                        autoCleanupThresholdMb: Number(event.target.value),
                    })}
                    disabled={!storageMaintenanceSettings.autoCleanupOrphanedThumbnailsOnStartup}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded text-surface-200 focus:outline-none focus:border-primary-500 disabled:opacity-60"
                >
                    <option value="0">0 MB 以上なら実行</option>
                    <option value="100">100 MB 以上なら実行</option>
                    <option value="500">500 MB 以上なら実行</option>
                    <option value="1024">1 GB 以上なら実行</option>
                    <option value="2048">2 GB 以上なら実行</option>
                </select>
                <p className="text-xs text-surface-500 mt-1">
                    起動時に診断し、無駄な容量がこの値以上のときだけ自動クリーンアップします。
                </p>
            </div>
        </SettingsSection>

        <SettingsSection
            title="サムネイル管理"
            description="手動診断や削除など、低頻度の保守操作をまとめています。"
            scope="operation"
        >
            <StorageCleanupSection />
        </SettingsSection>
    </div>
));

StorageSettingsTab.displayName = 'StorageSettingsTab';
