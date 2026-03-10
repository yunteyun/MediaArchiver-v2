/**
 * RatingAxesManager - 評価軸管理コンポーネント
 * Phase 26-B3: SettingsModal の「評価軸」タブとして表示
 */

import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Shield, Check, X, Star } from 'lucide-react';
import { useRatingStore, RatingAxis } from '../../stores/useRatingStore';

interface AxisFormState {
    name: string;
    min: string;
    max: string;
    step: string;
}

interface RatingAxesManagerProps {
    activeProfileLabel: string;
}

function createAxisFormState(axis?: RatingAxis): AxisFormState {
    return {
        name: axis?.name ?? '',
        min: axis ? String(axis.minValue) : '1',
        max: axis ? String(axis.maxValue) : '5',
        step: axis ? String(axis.step) : '1',
    };
}

function extractErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) return error.message;
    if (typeof error === 'string' && error.trim()) return error;
    return fallback;
}

function parseAxisForm(form: AxisFormState): {
    name: string;
    minValue: number;
    maxValue: number;
    step: number;
} | null {
    const name = form.name.trim();
    const minValue = Number(form.min);
    const maxValue = Number(form.max);
    const step = Number(form.step);

    if (!name) {
        throw new Error('評価軸名を入力してください');
    }
    if (!Number.isFinite(minValue) || !Number.isFinite(maxValue) || !Number.isFinite(step)) {
        throw new Error('最小値・最大値・刻み幅は数値で入力してください');
    }
    if (minValue <= 0 || maxValue <= 0) {
        throw new Error('最小値と最大値は 0 より大きい値にしてください');
    }
    if (maxValue < minValue) {
        throw new Error('最大値は最小値以上にしてください');
    }
    if (step <= 0) {
        throw new Error('刻み幅は 0 より大きい値にしてください');
    }
    if (step < 1 && Math.abs(step - 0.5) > 1e-6) {
        throw new Error('刻み幅は 0.5 または 1 以上を指定してください');
    }

    return { name, minValue, maxValue, step };
}

export const RatingAxesManager: React.FC<RatingAxesManagerProps> = ({ activeProfileLabel }) => {
    const {
        axes,
        isLoaded,
        loadAxes,
        createAxis,
        updateAxis,
        deleteAxis,
        setOverallAxis,
    } = useRatingStore();

    // 新規作成フォーム
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createForm, setCreateForm] = useState<AxisFormState>(() => createAxisFormState());
    const [createError, setCreateError] = useState<string | null>(null);

    // 編集状態
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<AxisFormState>(() => createAxisFormState());
    const [editError, setEditError] = useState<string | null>(null);

    // 削除確認
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [setOverallError, setSetOverallError] = useState<string | null>(null);

    useEffect(() => {
        if (!isLoaded) {
            loadAxes();
        }
    }, [isLoaded, loadAxes]);

    const handleCreate = async () => {
        setCreateError(null);
        try {
            const parsed = parseAxisForm(createForm);
            if (!parsed) return;
            await createAxis(parsed.name, parsed.minValue, parsed.maxValue, parsed.step);
            setCreateForm(createAxisFormState());
            setShowCreateForm(false);
        } catch (error) {
            setCreateError(extractErrorMessage(error, '評価軸の追加に失敗しました'));
        }
    };

    const handleEditStart = (axis: RatingAxis) => {
        setEditingId(axis.id);
        setEditForm(createAxisFormState(axis));
        setEditError(null);
    };

    const handleEditSave = async (id: string) => {
        setEditError(null);
        try {
            const parsed = parseAxisForm(editForm);
            if (!parsed) return;
            await updateAxis(id, {
                name: parsed.name,
                minValue: parsed.minValue,
                maxValue: parsed.maxValue,
                step: parsed.step,
            });
            setEditingId(null);
        } catch (error) {
            setEditError(extractErrorMessage(error, '評価軸の更新に失敗しました'));
        }
    };

    const handleEditCancel = () => {
        setEditingId(null);
        setEditError(null);
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

    const handleSetOverall = async (id: string) => {
        setSetOverallError(null);
        try {
            await setOverallAxis(id);
        } catch (error) {
            console.error('Failed to update overall rating axis:', error);
            setSetOverallError('総合評価軸の切り替えに失敗しました');
        }
    };

    const handleEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, id: string) => {
        if (event.key === 'Enter') {
            void handleEditSave(id);
        }
        if (event.key === 'Escape') {
            handleEditCancel();
        }
    };

    return (
        <div className="px-4 py-4 space-y-4">
            <div>
                <h3 className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2 mb-3">
                    評価軸の管理
                </h3>
                <p className="text-xs text-surface-500 mb-4">
                    評価軸は現在のプロファイルに保存されます。対象: {activeProfileLabel}。
                    ファイルに対して複数の評価軸（例: 総合評価、演技、映像美）を定義でき、シールドの付いた軸が現在の総合評価です。
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
                                    <span title="現在の総合評価">
                                        <Shield size={14} className="text-primary-400 flex-shrink-0" />
                                    </span>
                                )}

                                {/* 名前 / 編集フォーム */}
                                <div className="flex-1 min-w-0">
                                    {editingId === axis.id ? (
                                        <div className="space-y-2">
                                            <input
                                                autoFocus
                                                type="text"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                                                onKeyDown={(e) => handleEditKeyDown(e, axis.id)}
                                                className="w-full px-2 py-1.5 text-sm bg-surface-700 border border-primary-500 rounded text-white focus:outline-none"
                                            />
                                            <div className="grid grid-cols-3 gap-2">
                                                <label className="text-[11px] text-surface-400">
                                                    <span className="block mb-1">最小値</span>
                                                    <input
                                                        type="number"
                                                        value={editForm.min}
                                                        step="0.5"
                                                        onChange={(e) => setEditForm((prev) => ({ ...prev, min: e.target.value }))}
                                                        onKeyDown={(e) => handleEditKeyDown(e, axis.id)}
                                                        className="w-full px-2 py-1.5 text-sm bg-surface-700 border border-surface-600 rounded text-white focus:outline-none focus:border-primary-500"
                                                    />
                                                </label>
                                                <label className="text-[11px] text-surface-400">
                                                    <span className="block mb-1">最大値</span>
                                                    <input
                                                        type="number"
                                                        value={editForm.max}
                                                        step="0.5"
                                                        onChange={(e) => setEditForm((prev) => ({ ...prev, max: e.target.value }))}
                                                        onKeyDown={(e) => handleEditKeyDown(e, axis.id)}
                                                        className="w-full px-2 py-1.5 text-sm bg-surface-700 border border-surface-600 rounded text-white focus:outline-none focus:border-primary-500"
                                                    />
                                                </label>
                                                <label className="text-[11px] text-surface-400">
                                                    <span className="block mb-1">刻み幅</span>
                                                    <input
                                                        type="number"
                                                        value={editForm.step}
                                                        step="0.5"
                                                        onChange={(e) => setEditForm((prev) => ({ ...prev, step: e.target.value }))}
                                                        onKeyDown={(e) => handleEditKeyDown(e, axis.id)}
                                                        className="w-full px-2 py-1.5 text-sm bg-surface-700 border border-surface-600 rounded text-white focus:outline-none focus:border-primary-500"
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <span className="text-sm text-white font-medium">{axis.name}</span>
                                            {axis.isSystem && (
                                                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary-500/15 px-2 py-0.5 text-[11px] text-primary-300">
                                                    <Star size={10} />
                                                    総合評価
                                                </span>
                                            )}
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
                                                onClick={handleEditCancel}
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
                                                <button
                                                    onClick={() => { void handleSetOverall(axis.id); }}
                                                    className="px-2 py-1 text-xs rounded border border-surface-600 text-surface-300 hover:bg-surface-700 hover:text-white transition-colors"
                                                    title="この軸を総合評価にする"
                                                >
                                                    総合評価にする
                                                </button>
                                            )}
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
                {setOverallError && (
                    <p className="text-xs text-red-400 mt-2">{setOverallError}</p>
                )}
                {editError && (
                    <p className="text-xs text-red-400 mt-2">{editError}</p>
                )}

                {/* 新規作成フォーム */}
                {showCreateForm ? (
                    <div className="mt-3 p-3 bg-surface-800 rounded-lg border border-surface-600 space-y-3">
                        <div>
                            <label className="block text-xs text-surface-400 mb-1">評価軸名</label>
                            <input
                                autoFocus
                                type="text"
                                value={createForm.name}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
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
                                    value={createForm.min}
                                    step="0.5"
                                    onChange={(e) => setCreateForm((prev) => ({ ...prev, min: e.target.value }))}
                                    className="w-full px-3 py-1.5 text-sm bg-surface-700 border border-surface-600 rounded text-white focus:outline-none focus:border-primary-500"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs text-surface-400 mb-1">最大値</label>
                                <input
                                    type="number"
                                    value={createForm.max}
                                    step="0.5"
                                    onChange={(e) => setCreateForm((prev) => ({ ...prev, max: e.target.value }))}
                                    className="w-full px-3 py-1.5 text-sm bg-surface-700 border border-surface-600 rounded text-white focus:outline-none focus:border-primary-500"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs text-surface-400 mb-1">刻み幅</label>
                                <input
                                    type="number"
                                    value={createForm.step}
                                    step="0.5"
                                    onChange={(e) => setCreateForm((prev) => ({ ...prev, step: e.target.value }))}
                                    className="w-full px-3 py-1.5 text-sm bg-surface-700 border border-surface-600 rounded text-white focus:outline-none focus:border-primary-500"
                                />
                            </div>
                        </div>
                        {createError && (
                            <p className="text-xs text-red-400">{createError}</p>
                        )}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCreate}
                                disabled={!createForm.name.trim()}
                                className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm rounded transition-colors"
                            >
                                <Plus size={14} />
                                追加
                            </button>
                            <button
                                onClick={() => {
                                    setShowCreateForm(false);
                                    setCreateForm(createAxisFormState());
                                    setCreateError(null);
                                }}
                                className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-300 text-sm rounded transition-colors"
                            >
                                キャンセル
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => {
                            setShowCreateForm(true);
                            setCreateForm(createAxisFormState());
                            setCreateError(null);
                        }}
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
