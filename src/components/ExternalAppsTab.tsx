/**
 * ExternalAppsTab - 外部アプリ管理タブ
 * Phase 12-7: 外部アプリ複数設定機能
 */

import React, { useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, FolderOpen, Check, X, Search, Image as ImageIcon } from 'lucide-react';
import { useSettingsStore, ExternalApp, type SearchDestination, type SearchDestinationType } from '../stores/useSettingsStore';
import { useToastStore } from '../stores/useToastStore';

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
    const toggleSearchDestinationEnabled = useSettingsStore((s) => s.toggleSearchDestinationEnabled);
    const toastSuccess = useToastStore((s) => s.success);
    const toastError = useToastStore((s) => s.error);

    // 新規追加フォーム
    const [newAppName, setNewAppName] = useState('');
    const [newAppPath, setNewAppPath] = useState('');
    const [newAppExtensions, setNewAppExtensions] = useState('');

    // 編集モード
    const [editingAppId, setEditingAppId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: '', path: '', extensions: '' });
    const [newSearchDestinationType, setNewSearchDestinationType] = useState<SearchDestinationType>('filename');
    const [newSearchDestinationName, setNewSearchDestinationName] = useState('');
    const [newSearchDestinationUrl, setNewSearchDestinationUrl] = useState('');
    const [editingSearchDestinationId, setEditingSearchDestinationId] = useState<string | null>(null);
    const [editSearchForm, setEditSearchForm] = useState<{ type: SearchDestinationType; name: string; url: string }>({
        type: 'filename',
        name: '',
        url: '',
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
        toastSuccess('外部アプリを削除しました');
    }, [deleteExternalApp, toastSuccess]);

    // Phase 18-B: デフォルトアプリ設定
    const handleSetDefault = useCallback((appId: string, extension: string) => {
        if (!extension) return;
        setDefaultExternalApp(extension, appId);
        toastSuccess(`${extension} のデフォルトアプリを設定しました`);
    }, [setDefaultExternalApp, toastSuccess]);

    const handleRemoveDefault = useCallback((extension: string) => {
        setDefaultExternalApp(extension, null);
        toastSuccess(`${extension} のデフォルト設定を解除しました`);
    }, [setDefaultExternalApp, toastSuccess]);

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

        addSearchDestination(newSearchDestinationType, newSearchDestinationName, newSearchDestinationUrl);
        setNewSearchDestinationName('');
        setNewSearchDestinationUrl('');
        toastSuccess('検索先を追加しました');
    }, [
        addSearchDestination,
        newSearchDestinationName,
        newSearchDestinationType,
        newSearchDestinationUrl,
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
        });
        setEditingSearchDestinationId(null);
        toastSuccess('検索先を更新しました');
    }, [editSearchForm, editingSearchDestinationId, toastError, toastSuccess, updateSearchDestination, validateSearchDestination]);

    const handleCancelSearchDestinationEdit = useCallback(() => {
        setEditingSearchDestinationId(null);
    }, []);

    const handleDeleteSearchDestination = useCallback((id: string) => {
        deleteSearchDestination(id);
        toastSuccess('検索先を削除しました');
    }, [deleteSearchDestination, toastSuccess]);

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
                <div>
                    <h4 className="text-sm font-medium text-surface-300 mb-1">検索先</h4>
                    <p className="text-xs text-surface-500">
                        ファイル名検索は URL に <code>{'{query}'}</code> を含めてください。画像検索は検索ページを開く前に画像を自動でコピーします。
                    </p>
                </div>

                <div className="space-y-4">
                    {[['ファイル名検索', filenameDestinations], ['画像検索', imageDestinations] as const].map(([title, destinations]) => (
                        <div key={title} className="space-y-2">
                            <div className="text-xs font-medium text-surface-400">{title}</div>
                            {destinations.length === 0 ? (
                                <div className="rounded border border-dashed border-surface-700 px-3 py-4 text-sm text-surface-500">
                                    未登録
                                </div>
                            ) : (
                                destinations.map((destination) => (
                                    <div key={destination.id} className="rounded bg-surface-800 p-3">
                                        {editingSearchDestinationId === destination.id ? (
                                            <div className="space-y-2">
                                                <select
                                                    value={editSearchForm.type}
                                                    onChange={(e) => setEditSearchForm((prev) => ({ ...prev, type: e.target.value as SearchDestinationType }))}
                                                    className="w-full rounded bg-surface-700 px-2 py-1 text-sm text-white"
                                                >
                                                    <option value="filename">ファイル名検索</option>
                                                    <option value="image">画像検索</option>
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
                                                    <label className="flex items-center gap-1 text-xs text-surface-400">
                                                        <input
                                                            type="checkbox"
                                                            checked={destination.enabled}
                                                            onChange={(e) => toggleSearchDestinationEnabled(destination.id, e.target.checked)}
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
                            onChange={(e) => setNewSearchDestinationType(e.target.value as SearchDestinationType)}
                            className="w-full rounded bg-surface-800 px-3 py-2 text-sm text-white"
                        >
                            <option value="filename">ファイル名検索</option>
                            <option value="image">画像検索</option>
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
