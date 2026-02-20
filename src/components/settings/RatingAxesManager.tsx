/**
 * RatingAxesManager - 評価軸管理コンポーネント
 * Phase 26-B3: SettingsModal の「評価軸」タブとして表示
 */

import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Shield, Check, X } from 'lucide-react';
import { useRatingStore, RatingAxis } from '../../stores/useRatingStore';

export const RatingAxesManager: React.FC = () => {
    const { axes, isLoaded, loadAxes, createAxis, updateAxis, deleteAxis } = useRatingStore();

    // 新規作成フォーム
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newMin, setNewMin] = useState(1);
    const [newMax, setNewMax] = useState(5);
    const [newStep, setNewStep] = useState(1);

    // 編集状態
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    // 削除確認
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    useEffect(() => {
        if (!isLoaded) {
            loadAxes();
        }
    }, [isLoaded, loadAxes]);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        await createAxis(newName.trim(), newMin, newMax, newStep);
        setNewName('');
        setNewMin(1);
        setNewMax(5);
        setNewStep(1);
        setShowCreateForm(false);
    };

    const handleEditStart = (axis: RatingAxis) => {
        setEditingId(axis.id);
        setEditName(axis.name);
    };

    const handleEditSave = async (id: string) => {
        if (!editName.trim()) return;
        await updateAxis(id, { name: editName.trim() });
        setEditingId(null);
    };

    const handleDelete = async (id: string) => {
        setDeleteError(null);
        const result = await deleteAxis(id);
        if (!result.success) {
            if (result.reason === 'system_axis') {
                setDeleteError('システム軸は削除できません');
            } else {
                setDeleteError('削除に失敗しました');
            }
            setDeleteTargetId(null);
        } else {
            setDeleteTargetId(null);
        }
    };

    return (
        <div className="px-4 py-4 space-y-4">
            <div>
                <h3 className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2 mb-3">
                    評価軸の管理
                </h3>
                <p className="text-xs text-surface-500 mb-4">
                    ファイルに対して複数の評価軸（例: 総合評価、演技、映像美）を定義できます。
                    ⭐マークのある軸はシステム軸で削除できません。
                </p>

                {/* 軸一覧 */}
                <div className="space-y-2">
                    {axes.length === 0 ? (
                        <p className="text-xs text-surface-500 text-center py-4">評価軸がありません</p>
                    ) : (
                        axes.map(axis => (
                            <div
                                key={axis.id}
                                className="flex items-center gap-3 p-3 bg-surface-800 rounded-lg border border-surface-700"
                            >
                                {/* システム軸バッジ */}
                                {axis.isSystem && (
                                    <span title="システム軸">
                                        <Shield size={14} className="text-primary-400 flex-shrink-0" />
                                    </span>
                                )}

                                {/* 名前 / 編集フォーム */}
                                <div className="flex-1 min-w-0">
                                    {editingId === axis.id ? (
                                        <input
                                            autoFocus
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleEditSave(axis.id);
                                                if (e.key === 'Escape') setEditingId(null);
                                            }}
                                            className="w-full px-2 py-0.5 text-sm bg-surface-700 border border-primary-500 rounded text-white focus:outline-none"
                                        />
                                    ) : (
                                        <div>
                                            <span className="text-sm text-white font-medium">{axis.name}</span>
                                            <span className="ml-2 text-xs text-surface-500">
                                                {axis.minValue}〜{axis.maxValue}（step {axis.step}）
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* アクション */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {editingId === axis.id ? (
                                        <>
                                            <button
                                                onClick={() => handleEditSave(axis.id)}
                                                className="p-1.5 hover:bg-green-700 rounded transition-colors text-green-400"
                                                title="保存"
                                            >
                                                <Check size={14} />
                                            </button>
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="p-1.5 hover:bg-surface-700 rounded transition-colors text-surface-400"
                                                title="キャンセル"
                                            >
                                                <X size={14} />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleEditStart(axis)}
                                                className="p-1.5 hover:bg-surface-700 rounded transition-colors text-surface-400 hover:text-white"
                                                title="名前を変更"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            {!axis.isSystem && (
                                                deleteTargetId === axis.id ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleDelete(axis.id)}
                                                            className="px-2 py-0.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
                                                        >
                                                            削除
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteTargetId(null)}
                                                            className="px-2 py-0.5 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 rounded transition-colors"
                                                        >
                                                            取消
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            setDeleteTargetId(axis.id);
                                                            setDeleteError(null);
                                                        }}
                                                        className="p-1.5 hover:bg-red-900/40 rounded transition-colors text-surface-500 hover:text-red-400"
                                                        title="削除"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* エラー表示 */}
                {deleteError && (
                    <p className="text-xs text-red-400 mt-2">{deleteError}</p>
                )}

                {/* 新規作成フォーム */}
                {showCreateForm ? (
                    <div className="mt-3 p-3 bg-surface-800 rounded-lg border border-surface-600 space-y-3">
                        <div>
                            <label className="block text-xs text-surface-400 mb-1">評価軸名</label>
                            <input
                                autoFocus
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="例: 映像品質"
                                className="w-full px-3 py-1.5 text-sm bg-surface-700 border border-surface-600 rounded text-white focus:outline-none focus:border-primary-500"
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            />
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-xs text-surface-400 mb-1">最小値</label>
                                <input
                                    type="number"
                                    value={newMin}
                                    onChange={(e) => setNewMin(Number(e.target.value))}
                                    className="w-full px-3 py-1.5 text-sm bg-surface-700 border border-surface-600 rounded text-white focus:outline-none focus:border-primary-500"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs text-surface-400 mb-1">最大値</label>
                                <input
                                    type="number"
                                    value={newMax}
                                    onChange={(e) => setNewMax(Number(e.target.value))}
                                    className="w-full px-3 py-1.5 text-sm bg-surface-700 border border-surface-600 rounded text-white focus:outline-none focus:border-primary-500"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs text-surface-400 mb-1">刻み幅</label>
                                <input
                                    type="number"
                                    value={newStep}
                                    step="0.5"
                                    onChange={(e) => setNewStep(Number(e.target.value))}
                                    className="w-full px-3 py-1.5 text-sm bg-surface-700 border border-surface-600 rounded text-white focus:outline-none focus:border-primary-500"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCreate}
                                disabled={!newName.trim()}
                                className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm rounded transition-colors"
                            >
                                <Plus size={14} />
                                追加
                            </button>
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-300 text-sm rounded transition-colors"
                            >
                                キャンセル
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="mt-3 flex items-center gap-1.5 text-sm text-primary-400 hover:text-primary-300 transition-colors"
                    >
                        <Plus size={16} />
                        評価軸を追加
                    </button>
                )}
            </div>
        </div>
    );
};
