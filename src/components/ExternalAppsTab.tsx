/**
 * ExternalAppsTab - 外部アプリ管理タブ
 * Phase 12-7: 外部アプリ複数設定機能
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Edit2, Trash2, FolderOpen, Check, X } from 'lucide-react';
import { useSettingsStore, ExternalApp } from '../stores/useSettingsStore';
import { useToastStore } from '../stores/useToastStore';

export const ExternalAppsTab = React.memo(() => {
    const externalApps = useSettingsStore((s) => s.externalApps);
    const addExternalApp = useSettingsStore((s) => s.addExternalApp);
    const updateExternalApp = useSettingsStore((s) => s.updateExternalApp);
    const deleteExternalApp = useSettingsStore((s) => s.deleteExternalApp);
    const toastSuccess = useToastStore((s) => s.success);
    const toastError = useToastStore((s) => s.error);

    // 新規追加フォーム
    const [newAppName, setNewAppName] = useState('');
    const [newAppPath, setNewAppPath] = useState('');
    const [newAppExtensions, setNewAppExtensions] = useState('');

    // 編集モード
    const [editingAppId, setEditingAppId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: '', path: '', extensions: '' });

    // 外部アプリキャッシュを Main プロセスに同期
    useEffect(() => {
        window.electronAPI.setExternalApps(externalApps);
    }, [externalApps]);

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

    return (
        <div className="p-4 space-y-4">
            <p className="text-sm text-surface-400 mb-4">
                ファイルを開く外部アプリケーションを登録できます。右クリックメニューから起動できます。
            </p>

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
        </div>
    );
});

ExternalAppsTab.displayName = 'ExternalAppsTab';
