import React from 'react';
import type { SettingsModalCategory } from '../../stores/useUIStore';
import { SETTINGS_CATEGORIES } from './SettingsTabMeta';

interface SettingsTabNavProps {
    activeCategory: SettingsModalCategory;
    onSelectCategory: (category: SettingsModalCategory) => void;
}

export const SettingsTabNav = React.memo(({ activeCategory, onSelectCategory }: SettingsTabNavProps) => (
    <aside className="flex h-full w-52 shrink-0 flex-col border-r border-surface-700 bg-surface-950/35">
        <div className="border-b border-surface-800 px-4 py-4">
            <div className="text-[11px] font-semibold tracking-[0.14em] text-surface-500">
                カテゴリ
            </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
            <div className="space-y-1">
                {SETTINGS_CATEGORIES.map(({ id, label, description, icon: Icon }) => {
                    const isActive = activeCategory === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onSelectCategory(id)}
                            className={`flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
                                isActive
                                    ? 'bg-primary-500/12 text-surface-100 ring-1 ring-primary-500/40'
                                    : 'text-surface-400 hover:bg-surface-800/70 hover:text-surface-100'
                            }`}
                        >
                            <Icon
                                size={16}
                                className={`mt-0.5 shrink-0 ${isActive ? 'text-primary-300' : 'text-surface-500'}`}
                            />
                            <span className="min-w-0">
                                <span className="block text-sm font-medium">{label}</span>
                                <span className={`mt-1 block text-xs leading-relaxed ${isActive ? 'text-surface-300' : 'text-surface-500'}`}>
                                    {description}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    </aside>
));

SettingsTabNav.displayName = 'SettingsTabNav';
