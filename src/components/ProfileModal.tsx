/**
 * ProfileModal - プロファイル管理モーダル
 */

import React, { useState } from 'react';
import { X, User, Plus, Trash2, Edit2, Check, XCircle } from 'lucide-react';
import { useProfileStore, Profile } from '../stores/useProfileStore';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProfileModal = React.memo(({ isOpen, onClose }: ProfileModalProps) => {
    const profiles = useProfileStore((s) => s.profiles);
    const activeProfileId = useProfileStore((s) => s.activeProfileId);
    const createProfile = useProfileStore((s) => s.createProfile);
    const updateProfile = useProfileStore((s) => s.updateProfile);
    const deleteProfile = useProfileStore((s) => s.deleteProfile);
    const switchProfile = useProfileStore((s) => s.switchProfile);

    const [newProfileName, setNewProfileName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    if (!isOpen) return null;

    const handleCreate = async () => {
        if (!newProfileName.trim()) return;
        setIsCreating(true);
        try {
            await createProfile(newProfileName.trim());
            setNewProfileName('');
        } catch (error) {
            console.error('Failed to create profile:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleStartEdit = (profile: Profile) => {
        setEditingId(profile.id);
        setEditingName(profile.name);
    };

    const handleSaveEdit = async () => {
        if (!editingId || !editingName.trim()) return;
        await updateProfile(editingId, { name: editingName.trim() });
        setEditingId(null);
        setEditingName('');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingName('');
    };

    const handleDelete = async (id: string) => {
        if (id === 'default') return;
        if (!confirm('このプロファイルを削除しますか？関連するすべてのデータが削除されます。')) return;
        await deleteProfile(id);
    };

    const handleSwitchAndClose = async (id: string) => {
        await switchProfile(id);
        onClose();
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60" style={{ zIndex: 'var(--z-modal)' }}>
            <div
                className="bg-surface-900 rounded-lg shadow-xl w-full max-w-md mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
                    <div className="flex items-center gap-2">
                        <User size={20} className="text-primary-400" />
                        <h2 className="text-lg font-semibold text-white">プロファイル管理</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-surface-700 rounded transition-colors"
                    >
                        <X size={20} className="text-surface-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-4 py-4 space-y-4">
                    {/* 新規作成 */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newProfileName}
                            onChange={(e) => setNewProfileName(e.target.value)}
                            placeholder="新しいプロファイル名"
                            className="flex-1 px-3 py-2 bg-surface-800 border border-surface-600 rounded text-white text-sm placeholder-surface-500 focus:outline-none focus:border-primary-500"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        />
                        <button
                            onClick={handleCreate}
                            disabled={!newProfileName.trim() || isCreating}
                            className="px-3 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:cursor-not-allowed text-white rounded transition-colors flex items-center gap-1"
                        >
                            <Plus size={16} />
                            <span>作成</span>
                        </button>
                    </div>

                    {/* プロファイル一覧 */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {profiles.map((profile) => (
                            <div
                                key={profile.id}
                                className={`
                                    flex items-center gap-2 p-3 rounded-lg border
                                    ${profile.id === activeProfileId
                                        ? 'bg-primary-600/20 border-primary-500/50'
                                        : 'bg-surface-800 border-surface-700 hover:border-surface-600'
                                    }
                                `}
                            >
                                {editingId === profile.id ? (
                                    // 編集モード
                                    <>
                                        <input
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            className="flex-1 px-2 py-1 bg-surface-700 border border-surface-500 rounded text-white text-sm focus:outline-none focus:border-primary-500"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveEdit();
                                                if (e.key === 'Escape') handleCancelEdit();
                                            }}
                                        />
                                        <button
                                            onClick={handleSaveEdit}
                                            className="p-1 text-emerald-400 hover:bg-surface-700 rounded"
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
                                            className="p-1 text-surface-400 hover:bg-surface-700 rounded"
                                        >
                                            <XCircle size={16} />
                                        </button>
                                    </>
                                ) : (
                                    // 表示モード
                                    <>
                                        <User size={16} className={profile.id === activeProfileId ? 'text-primary-400' : 'text-surface-500'} />
                                        <span
                                            className={`flex-1 text-sm cursor-pointer ${profile.id === activeProfileId ? 'text-primary-200' : 'text-surface-200'}`}
                                            onClick={() => handleSwitchAndClose(profile.id)}
                                        >
                                            {profile.name}
                                        </span>
                                        {profile.id === activeProfileId && (
                                            <span className="text-xs text-primary-400 bg-primary-600/30 px-2 py-0.5 rounded">使用中</span>
                                        )}
                                        <button
                                            onClick={() => handleStartEdit(profile)}
                                            className="p-1 text-surface-400 hover:text-white hover:bg-surface-700 rounded transition-colors"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        {profile.id !== 'default' && (
                                            <button
                                                onClick={() => handleDelete(profile.id)}
                                                className="p-1 text-surface-400 hover:text-red-400 hover:bg-surface-700 rounded transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* 説明 */}
                    <p className="text-xs text-surface-500">
                        プロファイルごとに別々のフォルダ、タグ、ファイルを管理できます。
                    </p>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-surface-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded transition-colors"
                    >
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    );
});

ProfileModal.displayName = 'ProfileModal';
