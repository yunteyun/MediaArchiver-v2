import React from 'react';
import { FolderOpen, HardDrive, RefreshCw } from 'lucide-react';
import { StorageCleanupSection } from './StorageCleanupSection';

type StorageMode = 'appdata' | 'install' | 'custom';

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
}: StorageSettingsTabProps) => (
    <div className="px-4 py-4 space-y-6">
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2 flex items-center gap-2">
                <HardDrive size={15} />
                保存場所
            </h3>
            <p className="text-xs text-surface-500">
                データベース、サムネイル、プレビューキャッシュ、ログなどの保存先をまとめて切り替えます。
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
        </div>

        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2">
                サムネイル管理
            </h3>
            <StorageCleanupSection />
        </div>
    </div>
));

StorageSettingsTab.displayName = 'StorageSettingsTab';
