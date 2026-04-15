import React from 'react';
import type { SettingsModalCategory, SettingsSubTab } from '../../stores/useUIStore';
import { getSubTabsForCategory } from './SettingsTabMeta';

interface SettingsSubTabNavProps {
    category: SettingsModalCategory;
    activeSubTab: SettingsSubTab;
    onSelectSubTab: (subTab: SettingsSubTab) => void;
}

export const SettingsSubTabNav = React.memo(({
    category,
    activeSubTab,
    onSelectSubTab,
}: SettingsSubTabNavProps) => {
    const subTabs = getSubTabsForCategory(category);

    if (subTabs.length === 0) return null;

    return (
        <div className="flex shrink-0 gap-0 border-b border-surface-700 bg-surface-900/80 px-5">
            {subTabs.map((tab) => {
                const isActive = activeSubTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onSelectSubTab(tab.id)}
                        className={`relative px-4 py-2.5 text-sm transition-colors whitespace-nowrap ${
                            isActive
                                ? 'text-primary-300'
                                : 'text-surface-400 hover:text-surface-200'
                        }`}
                    >
                        {tab.label}
                        {isActive && (
                            <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-primary-400" />
                        )}
                    </button>
                );
            })}
        </div>
    );
});

SettingsSubTabNav.displayName = 'SettingsSubTabNav';
