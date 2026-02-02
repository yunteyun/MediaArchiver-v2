/**
 * ProfileSwitcher - ヘッダー用プロファイル切り替えドロップダウン
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Settings } from 'lucide-react';
import { useProfileStore } from '../stores/useProfileStore';

interface ProfileSwitcherProps {
    onOpenManageModal: () => void;
}

export const ProfileSwitcher = React.memo(({ onOpenManageModal }: ProfileSwitcherProps) => {
    const profiles = useProfileStore((s) => s.profiles);
    const activeProfileId = useProfileStore((s) => s.activeProfileId);
    const isLoading = useProfileStore((s) => s.isLoading);
    const switchProfile = useProfileStore((s) => s.switchProfile);

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 現在のプロファイル名
    const activeProfile = profiles.find(p => p.id === activeProfileId);
    const activeProfileName = activeProfile?.name || 'Loading...';

    // 外側クリックで閉じる
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleProfileSelect = async (profileId: string) => {
        if (profileId === activeProfileId) {
            setIsOpen(false);
            return;
        }
        await switchProfile(profileId);
        setIsOpen(false);
        // データ再読み込みは App.tsx 側で onProfileSwitched イベントを監視して行う
    };

    const handleManageClick = () => {
        setIsOpen(false);
        onOpenManageModal();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* トリガーボタン */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isLoading}
                className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg
                    bg-surface-800 hover:bg-surface-700 
                    text-surface-200 text-sm font-medium
                    transition-colors border border-surface-600
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
                <User size={16} className="text-primary-400" />
                <span className="max-w-[120px] truncate">{activeProfileName}</span>
                <ChevronDown
                    size={16}
                    className={`text-surface-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* ドロップダウン */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-surface-800 border border-surface-600 rounded-lg shadow-xl z-50 overflow-hidden">
                    {/* プロファイル一覧 */}
                    <div className="max-h-60 overflow-y-auto">
                        {profiles.map((profile) => (
                            <button
                                key={profile.id}
                                onClick={() => handleProfileSelect(profile.id)}
                                className={`
                                    w-full flex items-center gap-2 px-3 py-2 text-left text-sm
                                    hover:bg-surface-700 transition-colors
                                    ${profile.id === activeProfileId
                                        ? 'bg-primary-600/20 text-primary-300'
                                        : 'text-surface-200'
                                    }
                                `}
                            >
                                <User size={14} className={profile.id === activeProfileId ? 'text-primary-400' : 'text-surface-500'} />
                                <span className="truncate flex-1">{profile.name}</span>
                                {profile.id === activeProfileId && (
                                    <span className="text-xs text-primary-400">✓</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* 区切り線 */}
                    <div className="border-t border-surface-600" />

                    {/* 管理ボタン */}
                    <button
                        onClick={handleManageClick}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-surface-300 hover:bg-surface-700 transition-colors"
                    >
                        <Settings size={14} className="text-surface-500" />
                        <span>プロファイルを管理</span>
                    </button>
                </div>
            )}
        </div>
    );
});

ProfileSwitcher.displayName = 'ProfileSwitcher';
