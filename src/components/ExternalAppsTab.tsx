/**
 * ExternalAppsTab - 外部アプリ管理タブ
 * Phase 12-7: 外部アプリ複数設定機能
 */

import React, { useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, FolderOpen, Check, X, Search, Image as ImageIcon, ArrowUp, ArrowDown, Globe, Camera, BookImage, Sparkles, Link2, Download, Upload } from 'lucide-react';
import { useSettingsStore, ExternalApp, type SearchDestination, type SearchDestinationType, type SearchDestinationIcon } from '../stores/useSettingsStore';
import { useToastStore } from '../stores/useToastStore';
import { useProfileStore } from '../stores/useProfileStore';

type SearchDestinationExportV1 = {
    version: 1;
    destinations: Array<{
        type: SearchDestinationType;
        name: string;
        url: string;
        icon?: SearchDestinationIcon;
        enabled?: boolean;
    }>;
};

const SEARCH_DESTINATION_ICON_OPTIONS: Array<{ value: SearchDestinationIcon; label: string }> = [
    { value: 'search', label: '検索' },
    { value: 'globe', label: '地球' },
    { value: 'image', label: '画像' },
    { value: 'camera', label: 'カメラ' },
    { value: 'book', label: 'ブック' },
    { value: 'sparkles', label: 'きらめき' },
    { value: 'link', label: 'リンク' },
];

function SearchDestinationIconPreview({ icon }: { icon: SearchDestinationIcon }) {
    const className = 'text-surface-300';

    if (icon === 'search') return <Search size={14} className={className} />;
    if (icon === 'globe') return <Globe size={14} className={className} />;
    if (icon === 'image') return <ImageIcon size={14} className={className} />;
    if (icon === 'camera') return <Camera size={14} className={className} />;
    if (icon === 'book') return <BookImage size={14} className={className} />;
    if (icon === 'sparkles') return <Sparkles size={14} className={className} />;
    return <Link2 size={14} className={className} />;
}

export const ExternalAppsTab = React.memo(() => {
    const externalApps = useSettingsStore((s) => s.externalApps);
    const addExternalApp = useSettingsStore((s) => s.addExternalApp);
    const updateExternalApp = useSettingsStore((s) => s.updateExternalApp);
    const deleteExternalApp = useSettingsStore((s) => s.deleteExternalApp);
    // Phase 18-B: デフォルト外部アプリ設定
    const defaultExternalApps = useSettingsStore((s) => s.defaultExternalApps);
    const setDefaultExternalApp = useSettingsStore((s) => s.setDefaultExternalApp);
    const searchDestinations = useSettingsStore((s) => s.searchDestinations);
    const addSearchDestination = useSettingsStore((s) => s.addSearchDestination);
    const updateSearchDestination = useSettingsStore((s) => s.updateSearchDestination);
    const deleteSearchDestination = useSettingsStore((s) => s.deleteSearchDestination);
    const replaceSearchDestinations = useSettingsStore((s) => s.replaceSearchDestinations);
    const resetSearchDestinations = useSettingsStore((s) => s.resetSearchDestinations);
    const toggleSearchDestinationEnabled = useSettingsStore((s) => s.toggleSearchDestinationEnabled);
    const moveSearchDestination = useSettingsStore((s) => s.moveSearchDestination);
    const profiles = useProfileStore((s) => s.profiles);
    const activeProfileId = useProfileStore((s) => s.activeProfileId);
    const toastSuccess = useToastStore((s) => s.success);
    const toastError = useToastStore((s) => s.error);
    const activeProfileLabel = React.useMemo(() => {
        const profile = profiles.find((item) => item.id === activeProfileId);
        return profile ? profile.name : activeProfileId;
    }, [activeProfileId, profiles]);

    const persistProfileExternalPreferences = useCallback(async () => {
        const state = useSettingsStore.getState();
        await window.electronAPI.setProfileScopedSettings({
            defaultExternalApps: state.defaultExternalApps,
            searchDestinations: state.searchDestinations,
        });
    }, []);

    // 新規追加フォーム
    const [newAppName, setNewAppName] = useState('');
    const [newAppPath, setNewAppPath] = useState('');
    const [newAppExtensions, setNewAppExtensions] = useState('');

    // 編集モード
    const [editingAppId, setEditingAppId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: '', path: '', extensions: '' });
    const [newSearchDestinationType, setNewSearchDestinationType] = useState<SearchDestinationType>('filename');
    const [newSearchDestinationIcon, setNewSearchDestinationIcon] = useState<SearchDestinationIcon>('search');
    const [newSearchDestinationName, setNewSearchDestinationName] = useState('');
    const [newSearchDestinationUrl, setNewSearchDestinationUrl] = useState('');
    const [editingSearchDestinationId, setEditingSearchDestinationId] = useState<string | null>(null);
    const [editSearchForm, setEditSearchForm] = useState<{ type: SearchDestinationType; name: string; url: string; icon: SearchDestinationIcon }>({
        type: 'filename',
        name: '',
        url: '',
        icon: 'search',
    });

    // 拡張子パース
    const parseExtensions = (input: string): string[] => {
        if (!input.trim()) return [];
        return input
            .split(',')
            .map(ext => ext.trim())
            .filter(ext => ext.length > 0)
            .map(ext => ext.replace(/^\./, '').toLowerCase());
    };

    // ファイル選択
    const handleSelectFile = useCallback(async (forEdit: boolean = false) => {
        const result = await window.electronAPI.selectFile();
        if (result) {
            if (forEdit) {
                setEditForm(prev => ({ ...prev, path: result }));
            } else {
                setNewAppPath(result);
                // パスからアプリ名を自動設定
                if (!newAppName) {
                    const fileName = result.split('\\').pop()?.replace('.exe', '') || '';
                    setNewAppName(fileName);
                }
            }
        }
    }, [newAppName]);

    // 追加
    const handleAddApp = useCallback(async () => {
        if (!newAppName.trim()) {
            toastError('アプリ名を入力してください');
            return;
        }
        if (!newAppPath) {
            toastError('アプリのパスを選択してください');
            return;
        }

        const isValid = await window.electronAPI.validatePath(newAppPath);
        if (!isValid) {
            toastError('選択されたファイルは実行できません');
            return;
        }

        addExternalApp(newAppName.trim(), newAppPath, parseExtensions(newAppExtensions));
        setNewAppName('');
        setNewAppPath('');
        setNewAppExtensions('');
        toastSuccess('外部アプリを追加しました');
    }, [newAppName, newAppPath, newAppExtensions, addExternalApp, toastSuccess, toastError]);

    // 編集開始
    const handleStartEdit = useCallback((app: ExternalApp) => {
        setEditingAppId(app.id);
        setEditForm({
            name: app.name,
            path: app.path,
            extensions: app.extensions.join(', ')
        });
    }, []);

    // 編集保存
    const handleSaveEdit = useCallback(async () => {
        if (!editingAppId) return;

        if (!editForm.name.trim()) {
            toastError('アプリ名を入力してください');
            return;
        }

        const isValid = await window.electronAPI.validatePath(editForm.path);
        if (!isValid) {
            toastError('選択されたファイルは実行できません');
            return;
        }

        updateExternalApp(editingAppId, {
            name: editForm.name.trim(),
            path: editForm.path,
            extensions: parseExtensions(editForm.extensions)
        });
        setEditingAppId(null);
        toastSuccess('外部アプリを更新しました');
    }, [editingAppId, editForm, updateExternalApp, toastSuccess, toastError]);

    // 編集キャンセル
    const handleCancelEdit = useCallback(() => {
        setEditingAppId(null);
    }, []);

    // 削除
    const handleDeleteApp = useCallback((id: string) => {
        deleteExternalApp(id);
        void persistProfileExternalPreferences().catch(() => {
            toastError('プロファイル別の既定アプリ設定の保存に失敗しました');
        });
        toastSuccess('外部アプリを削除しました');
    }, [deleteExternalApp, persistProfileExternalPreferences, toastError, toastSuccess]);

    // Phase 18-B: デフォルトアプリ設定
    const handleSetDefault = useCallback((appId: string, extension: string) => {
        if (!extension) return;
        setDefaultExternalApp(extension, appId);
        void persistProfileExternalPreferences().catch(() => {
            toastError('既定アプリ設定の保存に失敗しました');
        });
        toastSuccess(`${extension} のデフォルトアプリを設定しました`);
    }, [persistProfileExternalPreferences, setDefaultExternalApp, toastError, toastSuccess]);

    const handleRemoveDefault = useCallback((extension: string) => {
        setDefaultExternalApp(extension, null);
        void persistProfileExternalPreferences().catch(() => {
            toastError('既定アプリ設定の保存に失敗しました');
        });
        toastSuccess(`${extension} のデフォルト設定を解除しました`);
    }, [persistProfileExternalPreferences, setDefaultExternalApp, toastError, toastSuccess]);

    const validateSearchDestination = useCallback((type: SearchDestinationType, name: string, url: string): string | null => {
        const normalizedName = name.trim();
        const normalizedUrl = url.trim();
        if (!normalizedName) return '検索先名を入力してください';
        if (!normalizedUrl) return 'URLを入力してください';
        if (!/^https?:\/\//i.test(normalizedUrl)) return 'URL は http:// または https:// で始めてください';
        if (type === 'filename' && !normalizedUrl.includes('{query}')) {
            return 'ファイル名検索の URL には {query} を含めてください';
        }
        return null;
    }, []);

    const handleAddSearchDestination = useCallback(() => {
        const error = validateSearchDestination(
            newSearchDestinationType,
            newSearchDestinationName,
            newSearchDestinationUrl
        );
        if (error) {
            toastError(error);
            return;
        }

        addSearchDestination(newSearchDestinationType, newSearchDestinationName, newSearchDestinationUrl, newSearchDestinationIcon);
        setNewSearchDestinationIcon(newSearchDestinationType === 'filename' ? 'search' : 'image');
        setNewSearchDestinationName('');
        setNewSearchDestinationUrl('');
        void persistProfileExternalPreferences().catch(() => {
            toastError('検索先の保存に失敗しました');
        });
        toastSuccess('検索先を追加しました');
    }, [
        addSearchDestination,
        newSearchDestinationIcon,
        newSearchDestinationName,
        newSearchDestinationType,
        newSearchDestinationUrl,
        persistProfileExternalPreferences,
        toastError,
        toastSuccess,
        validateSearchDestination
    ]);

    const handleStartSearchDestinationEdit = useCallback((destination: SearchDestination) => {
        setEditingSearchDestinationId(destination.id);
        setEditSearchForm({
            type: destination.type,
            name: destination.name,
            url: destination.url,
            icon: destination.icon,
        });
    }, []);

    const handleSaveSearchDestinationEdit = useCallback(() => {
        if (!editingSearchDestinationId) return;

        const error = validateSearchDestination(
            editSearchForm.type,
            editSearchForm.name,
            editSearchForm.url
        );
        if (error) {
            toastError(error);
            return;
        }

        updateSearchDestination(editingSearchDestinationId, {
            type: editSearchForm.type,
            name: editSearchForm.name,
            url: editSearchForm.url,
            icon: editSearchForm.icon,
        });
        setEditingSearchDestinationId(null);
        void persistProfileExternalPreferences().catch(() => {
            toastError('検索先の保存に失敗しました');
        });
        toastSuccess('検索先を更新しました');
    }, [editSearchForm, editingSearchDestinationId, persistProfileExternalPreferences, toastError, toastSuccess, updateSearchDestination, validateSearchDestination]);

    const handleCancelSearchDestinationEdit = useCallback(() => {
        setEditingSearchDestinationId(null);
    }, []);

    const handleDeleteSearchDestination = useCallback((id: string) => {
        deleteSearchDestination(id);
        void persistProfileExternalPreferences().catch(() => {
            toastError('検索先の保存に失敗しました');
        });
        toastSuccess('検索先を削除しました');
    }, [deleteSearchDestination, persistProfileExternalPreferences, toastError, toastSuccess]);

    const parseImportedSearchDestinations = useCallback((content: string): SearchDestinationExportV1['destinations'] => {
        const parsed = JSON.parse(content) as Partial<SearchDestinationExportV1>;
        if (parsed.version !== 1 || !Array.isArray(parsed.destinations)) {
            throw new Error('対応していない検索先ファイルです');
        }

        return parsed.destinations.flatMap((entry) => {
            if (!entry || typeof entry !== 'object') return [];
            const type = entry.type;
            const name = typeof entry.name === 'string' ? entry.name.trim() : '';
            const url = typeof entry.url === 'string' ? entry.url.trim() : '';
            const icon = entry.icon;

            if ((type !== 'filename' && type !== 'image') || !name || !url) return [];
            if (type === 'filename' && !url.includes('{query}')) return [];

            const normalizedIcon: SearchDestinationIcon =
                icon && SEARCH_DESTINATION_ICON_OPTIONS.some((option) => option.value === icon)
                    ? icon
                    : (type === 'filename' ? 'search' : 'image');

            return [{
                type,
                name,
                url,
                icon: normalizedIcon,
                enabled: entry.enabled !== false,
            }];
        });
    }, []);

    const handleExportSearchDestinations = useCallback(async () => {
        const payload: SearchDestinationExportV1 = {
            version: 1,
            destinations: searchDestinations.map((destination) => ({
                type: destination.type,
                name: destination.name,
                url: destination.url,
                icon: destination.icon,
                enabled: destination.enabled,
            })),
        };

        const timestamp = new Date().toISOString().slice(0, 10);
        const result = await window.electronAPI.saveTextFile({
            title: '検索先をエクスポート',
            defaultPath: `mediaarchiver-search-destinations-${timestamp}.json`,
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] },
            ],
            content: JSON.stringify(payload, null, 2),
        });

        if (!result.canceled) {
            toastSuccess('検索先をエクスポートしました');
        }
    }, [searchDestinations, toastSuccess]);

    const handleImportSearchDestinations = useCallback(async (mode: 'merge' | 'replace') => {
        const result = await window.electronAPI.openTextFile({
            title: '検索先をインポート',
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] },
            ],
        });

        if (result.canceled || !result.content) return;

        try {
            const imported = parseImportedSearchDestinations(result.content);
            if (imported.length === 0) {
                toastError('インポートできる検索先が見つかりませんでした');
                return;
            }

            if (mode === 'replace') {
                const confirmed = window.confirm(
                    `現在の検索先 ${searchDestinations.length} 件を置き換えて、インポート内容 ${imported.length} 件へ切り替えます。続行しますか？`
                );
                if (!confirmed) return;

                replaceSearchDestinations(imported.map((destination) => ({
                    type: destination.type,
                    name: destination.name,
                    url: destination.url,
                    icon: destination.icon,
                    enabled: destination.enabled !== false,
                })));
                void persistProfileExternalPreferences().catch(() => {
                    toastError('検索先の保存に失敗しました');
                });
                toastSuccess(`検索先を ${imported.length} 件で置き換えました`);
                return;
            }

            const existingKeys = new Set(
                searchDestinations.map((destination) => `${destination.type}::${destination.name}::${destination.url}`)
            );

            let importedCount = 0;
            let skippedCount = 0;

            for (const destination of imported) {
                const key = `${destination.type}::${destination.name}::${destination.url}`;
                if (existingKeys.has(key)) {
                    skippedCount += 1;
                    continue;
                }

                addSearchDestination(destination.type, destination.name, destination.url, destination.icon);
                if (destination.enabled === false) {
                    const latest = useSettingsStore.getState().searchDestinations.at(-1);
                    if (latest) {
                        toggleSearchDestinationEnabled(latest.id, false);
                    }
                }
                existingKeys.add(key);
                importedCount += 1;
            }

            void persistProfileExternalPreferences().catch(() => {
                toastError('検索先の保存に失敗しました');
            });

            if (importedCount === 0) {
                toastError('新しく追加できる検索先はありませんでした');
                return;
            }

            toastSuccess(`検索先を ${importedCount} 件取り込みました${skippedCount > 0 ? `（重複 ${skippedCount} 件を除外）` : ''}`);
        } catch (error) {
            toastError(`インポートに失敗しました: ${(error as Error).message}`);
        }
    }, [addSearchDestination, parseImportedSearchDestinations, persistProfileExternalPreferences, replaceSearchDestinations, searchDestinations, toastError, toastSuccess, toggleSearchDestinationEnabled]);

    const handleResetSearchDestinations = useCallback(() => {
        const confirmed = window.confirm('検索先を初期プリセットへ戻します。現在の検索先は上書きされます。続行しますか？');
        if (!confirmed) return;

        resetSearchDestinations();
        void persistProfileExternalPreferences().catch(() => {
            toastError('検索先の保存に失敗しました');
        });
        toastSuccess('検索先を初期プリセットへ戻しました');
    }, [persistProfileExternalPreferences, resetSearchDestinations, toastError, toastSuccess]);

    const renderSearchDestinationTypeLabel = (type: SearchDestinationType) => {
        return type === 'filename' ? 'ファイル名検索' : '画像検索';
    };

    const filenameDestinations = searchDestinations.filter((destination) => destination.type === 'filename');
    const imageDestinations = searchDestinations.filter((destination) => destination.type === 'image');

    return (
        <div className="p-4 space-y-4">
            <div className="space-y-1">
                <p className="text-sm text-surface-400">
                    ファイルを開く外部アプリケーションを登録できます。右クリックメニューから起動できます。
                </p>
                <p className="text-sm text-surface-400">
                    あわせて、ファイル名検索と画像検索の検索先も追加できます。画像検索は「開く」と同時に画像をコピーする前提です。
                </p>
                <p className="text-xs text-surface-500">
                    外部アプリ定義はアプリ全体で共有されます。既定アプリと検索先は現在のプロファイル `{activeProfileLabel}` に保存されます。
                </p>
            </div>

            {/* 登録済みアプリリスト */}
            <div className="space-y-2">
                {externalApps.length === 0 ? (
                    <div className="text-center text-surface-500 py-6">
                        外部アプリが登録されていません
                    </div>
                ) : (
                    externalApps.map(app => (
                        <div
                            key={app.id}
                            className="flex items-center justify-between p-3 bg-surface-800 rounded"
                        >
                            {editingAppId === app.id ? (
                                // 編集モード
                                <div className="flex-1 space-y-2">
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-2 py-1 bg-surface-700 text-white rounded text-sm"
                                        placeholder="アプリ名"
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={editForm.path}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, path: e.target.value }))}
                                            className="flex-1 px-2 py-1 bg-surface-700 text-white rounded text-sm"
                                            placeholder="パス"
                                            readOnly
                                        />
                                        <button
                                            onClick={() => handleSelectFile(true)}
                                            className="px-2 py-1 bg-surface-600 hover:bg-surface-500 rounded text-sm"
                                        >
                                            <FolderOpen size={14} />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={editForm.extensions}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, extensions: e.target.value }))}
                                        className="w-full px-2 py-1 bg-surface-700 text-white rounded text-sm"
                                        placeholder="拡張子（カンマ区切り、空欄で全ファイル）"
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            onClick={handleCancelEdit}
                                            className="p-1 hover:bg-surface-600 rounded"
                                        >
                                            <X size={16} className="text-surface-400" />
                                        </button>
                                        <button
                                            onClick={handleSaveEdit}
                                            className="p-1 hover:bg-surface-600 rounded"
                                        >
                                            <Check size={16} className="text-green-400" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // 表示モード
                                <>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-white truncate">{app.name}</div>
                                        <div className="text-xs text-surface-400 truncate">{app.path}</div>
                                        {app.extensions.length > 0 && (
                                            <div className="text-xs text-surface-500">
                                                対応: {app.extensions.join(', ')}
                                            </div>
                                        )}
                                        {/* Phase 18-B: デフォルト設定表示 */}
                                        <div className="mt-2 space-y-1">
                                            <div className="text-xs text-surface-400">デフォルト設定:</div>
                                            <div className="flex flex-wrap gap-1">
                                                {Object.entries(defaultExternalApps)
                                                    .filter(([, appId]) => appId === app.id)
                                                    .map(([ext]) => (
                                                        <span
                                                            key={ext}
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-600/20 text-primary-400 rounded text-xs"
                                                        >
                                                            .{ext}
                                                            <button
                                                                onClick={() => handleRemoveDefault(ext)}
                                                                className="hover:text-primary-300"
                                                                title="解除"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </span>
                                                    ))}
                                            </div>
                                            <select
                                                onChange={(e) => handleSetDefault(app.id, e.target.value)}
                                                value=""
                                                className="w-full px-2 py-1 bg-surface-700 text-white rounded text-xs"
                                            >
                                                <option value="">拡張子を選択してデフォルトに設定...</option>
                                                {app.extensions.map(ext => (
                                                    <option key={ext} value={ext}>.{ext}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                        <button
                                            onClick={() => handleStartEdit(app)}
                                            className="p-1.5 hover:bg-surface-600 rounded"
                                            title="編集"
                                        >
                                            <Edit2 size={14} className="text-surface-400" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteApp(app.id)}
                                            className="p-1.5 hover:bg-surface-600 rounded"
                                            title="削除"
                                        >
                                            <Trash2 size={14} className="text-red-400" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* 新規追加フォーム */}
            <div className="border-t border-surface-700 pt-4">
                <h4 className="text-sm font-medium text-surface-300 mb-3">新規追加</h4>
                <div className="space-y-2">
                    <input
                        type="text"
                        value={newAppName}
                        onChange={(e) => setNewAppName(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-800 text-white rounded text-sm"
                        placeholder="アプリ名"
                    />
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newAppPath}
                            className="flex-1 px-3 py-2 bg-surface-800 text-white rounded text-sm"
                            placeholder="パスを選択..."
                            readOnly
                        />
                        <button
                            onClick={() => handleSelectFile(false)}
                            className="px-3 py-2 bg-surface-700 hover:bg-surface-600 rounded text-sm flex items-center gap-1"
                        >
                            <FolderOpen size={14} />
                            選択
                        </button>
                    </div>
                    <input
                        type="text"
                        value={newAppExtensions}
                        onChange={(e) => setNewAppExtensions(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-800 text-white rounded text-sm"
                        placeholder="対応拡張子（カンマ区切り、空欄で全ファイル対応）"
                    />
                    <button
                        onClick={handleAddApp}
                        className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white rounded text-sm flex items-center justify-center gap-2"
                    >
                        <Plus size={16} />
                        追加
                    </button>
                </div>
            </div>

            <div className="border-t border-surface-700 pt-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h4 className="text-sm font-medium text-surface-300 mb-1">検索先</h4>
                        <p className="text-xs text-surface-500">
                            ファイル名検索は URL に <code>{'{query}'}</code> を含めてください。画像検索は検索ページを開く前に画像を自動でコピーします。
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { void handleExportSearchDestinations(); }}
                            className="inline-flex items-center gap-1 rounded bg-surface-700 px-3 py-1.5 text-xs text-surface-200 hover:bg-surface-600"
                        >
                            <Download size={14} />
                            エクスポート
                        </button>
                        <button
                            onClick={() => { void handleImportSearchDestinations('merge'); }}
                            className="inline-flex items-center gap-1 rounded bg-surface-700 px-3 py-1.5 text-xs text-surface-200 hover:bg-surface-600"
                        >
                            <Upload size={14} />
                            追記インポート
                        </button>
                        <button
                            onClick={() => { void handleImportSearchDestinations('replace'); }}
                            className="inline-flex items-center gap-1 rounded bg-surface-700 px-3 py-1.5 text-xs text-surface-200 hover:bg-surface-600"
                        >
                            <Upload size={14} />
                            置換インポート
                        </button>
                        <button
                            onClick={handleResetSearchDestinations}
                            className="inline-flex items-center gap-1 rounded bg-surface-700 px-3 py-1.5 text-xs text-surface-200 hover:bg-surface-600"
                        >
                            <Sparkles size={14} />
                            既定へ戻す
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {[['ファイル名検索', filenameDestinations], ['画像検索', imageDestinations] as const].map(([title, destinations]) => (
                        <div key={title} className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-xs font-medium text-surface-400">{title}</div>
                                <div className="text-[10px] text-surface-500">上から順に右クリックメニューへ表示</div>
                            </div>
                            {destinations.length === 0 ? (
                                <div className="rounded border border-dashed border-surface-700 px-3 py-4 text-sm text-surface-500">
                                    未登録
                                </div>
                            ) : (
                                destinations.map((destination, index) => (
                                    <div key={destination.id} className="rounded bg-surface-800 p-3">
                                        {editingSearchDestinationId === destination.id ? (
                                            <div className="space-y-2">
                                                <select
                                                    value={editSearchForm.type}
                                                    onChange={(e) => setEditSearchForm((prev) => ({
                                                        ...prev,
                                                        type: e.target.value as SearchDestinationType,
                                                        icon: prev.type === 'filename' && e.target.value === 'image'
                                                            ? 'image'
                                                            : prev.type === 'image' && e.target.value === 'filename'
                                                                ? 'search'
                                                                : prev.icon
                                                    }))}
                                                    className="w-full rounded bg-surface-700 px-2 py-1 text-sm text-white"
                                                >
                                                    <option value="filename">ファイル名検索</option>
                                                    <option value="image">画像検索</option>
                                                </select>
                                                <select
                                                    value={editSearchForm.icon}
                                                    onChange={(e) => setEditSearchForm((prev) => ({ ...prev, icon: e.target.value as SearchDestinationIcon }))}
                                                    className="w-full rounded bg-surface-700 px-2 py-1 text-sm text-white"
                                                >
                                                    {SEARCH_DESTINATION_ICON_OPTIONS.map((option) => (
                                                        <option key={option.value} value={option.value}>{option.label}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="text"
                                                    value={editSearchForm.name}
                                                    onChange={(e) => setEditSearchForm((prev) => ({ ...prev, name: e.target.value }))}
                                                    className="w-full rounded bg-surface-700 px-2 py-1 text-sm text-white"
                                                    placeholder="検索先名"
                                                />
                                                <input
                                                    type="text"
                                                    value={editSearchForm.url}
                                                    onChange={(e) => setEditSearchForm((prev) => ({ ...prev, url: e.target.value }))}
                                                    className="w-full rounded bg-surface-700 px-2 py-1 text-sm text-white"
                                                    placeholder={editSearchForm.type === 'filename' ? 'https://example.com/?q={query}' : 'https://example.com/'}
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={handleCancelSearchDestinationEdit} className="p-1 hover:bg-surface-600 rounded">
                                                        <X size={16} className="text-surface-400" />
                                                    </button>
                                                    <button onClick={handleSaveSearchDestinationEdit} className="p-1 hover:bg-surface-600 rounded">
                                                        <Check size={16} className="text-green-400" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-surface-700">
                                                            <SearchDestinationIconPreview icon={destination.icon} />
                                                        </span>
                                                        <span className="font-medium text-white">{destination.name}</span>
                                                        <span className="rounded bg-surface-700 px-2 py-0.5 text-[10px] text-surface-300">
                                                            {renderSearchDestinationTypeLabel(destination.type)}
                                                        </span>
                                                        {!destination.enabled && (
                                                            <span className="rounded bg-surface-700 px-2 py-0.5 text-[10px] text-surface-400">
                                                                無効
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="mt-1 break-all text-xs text-surface-400">{destination.url}</div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => {
                                                            moveSearchDestination(destination.id, 'up');
                                                            void persistProfileExternalPreferences().catch(() => {
                                                                toastError('検索先の保存に失敗しました');
                                                            });
                                                        }}
                                                        className="p-1.5 hover:bg-surface-600 rounded disabled:cursor-not-allowed disabled:opacity-40"
                                                        title="上へ"
                                                        disabled={index === 0}
                                                    >
                                                        <ArrowUp size={14} className="text-surface-400" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            moveSearchDestination(destination.id, 'down');
                                                            void persistProfileExternalPreferences().catch(() => {
                                                                toastError('検索先の保存に失敗しました');
                                                            });
                                                        }}
                                                        className="p-1.5 hover:bg-surface-600 rounded disabled:cursor-not-allowed disabled:opacity-40"
                                                        title="下へ"
                                                        disabled={index === destinations.length - 1}
                                                    >
                                                        <ArrowDown size={14} className="text-surface-400" />
                                                    </button>
                                                    <label className="flex items-center gap-1 text-xs text-surface-400">
                                                        <input
                                                            type="checkbox"
                                                            checked={destination.enabled}
                                                            onChange={(e) => {
                                                                toggleSearchDestinationEnabled(destination.id, e.target.checked);
                                                                void persistProfileExternalPreferences().catch(() => {
                                                                    toastError('検索先の保存に失敗しました');
                                                                });
                                                            }}
                                                            className="h-4 w-4 accent-primary-500"
                                                        />
                                                        有効
                                                    </label>
                                                    <button
                                                        onClick={() => handleStartSearchDestinationEdit(destination)}
                                                        className="p-1.5 hover:bg-surface-600 rounded"
                                                        title="編集"
                                                    >
                                                        <Edit2 size={14} className="text-surface-400" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSearchDestination(destination.id)}
                                                        className="p-1.5 hover:bg-surface-600 rounded"
                                                        title="削除"
                                                    >
                                                        <Trash2 size={14} className="text-red-400" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    ))}
                </div>

                <div className="border-t border-surface-700 pt-4">
                    <h5 className="mb-3 text-sm font-medium text-surface-300">検索先を追加</h5>
                    <div className="space-y-2">
                        <select
                            value={newSearchDestinationType}
                            onChange={(e) => {
                                const nextType = e.target.value as SearchDestinationType;
                                setNewSearchDestinationType(nextType);
                                setNewSearchDestinationIcon(nextType === 'filename' ? 'search' : 'image');
                            }}
                            className="w-full rounded bg-surface-800 px-3 py-2 text-sm text-white"
                        >
                            <option value="filename">ファイル名検索</option>
                            <option value="image">画像検索</option>
                        </select>
                        <select
                            value={newSearchDestinationIcon}
                            onChange={(e) => setNewSearchDestinationIcon(e.target.value as SearchDestinationIcon)}
                            className="w-full rounded bg-surface-800 px-3 py-2 text-sm text-white"
                        >
                            {SEARCH_DESTINATION_ICON_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            value={newSearchDestinationName}
                            onChange={(e) => setNewSearchDestinationName(e.target.value)}
                            className="w-full rounded bg-surface-800 px-3 py-2 text-sm text-white"
                            placeholder="検索先名"
                        />
                        <input
                            type="text"
                            value={newSearchDestinationUrl}
                            onChange={(e) => setNewSearchDestinationUrl(e.target.value)}
                            className="w-full rounded bg-surface-800 px-3 py-2 text-sm text-white"
                            placeholder={newSearchDestinationType === 'filename' ? 'https://example.com/?q={query}' : 'https://example.com/'}
                        />
                        <div className="rounded border border-surface-700 bg-surface-900/40 px-3 py-2 text-xs text-surface-500">
                            {newSearchDestinationType === 'filename' ? (
                                <div className="flex items-center gap-2">
                                    <Search size={14} className="text-surface-400" />
                                    URL に <code>{'{query}'}</code> を入れると、整形済みファイル名が差し込まれます。
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <ImageIcon size={14} className="text-surface-400" />
                                    画像検索は URL を開く前に画像をクリップボードへコピーします。貼り付け対応サイト向けです。
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleAddSearchDestination}
                            className="flex w-full items-center justify-center gap-2 rounded bg-primary-600 py-2 text-sm text-white hover:bg-primary-500"
                        >
                            <Plus size={16} />
                            追加
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

ExternalAppsTab.displayName = 'ExternalAppsTab';
