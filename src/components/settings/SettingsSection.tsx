import React from 'react';
import { RotateCcw } from 'lucide-react';

export type SettingScope = 'global' | 'profile' | 'folder' | 'temporary' | 'operation';

const SCOPE_META: Record<SettingScope, { label: string; className: string }> = {
    global: {
        label: '全体',
        className: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
    },
    profile: {
        label: 'プロファイル別',
        className: 'border-primary-500/30 bg-primary-500/10 text-primary-200',
    },
    folder: {
        label: 'フォルダ別',
        className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    },
    temporary: {
        label: '一時UI',
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    },
    operation: {
        label: '運用操作',
        className: 'border-surface-600 bg-surface-800/70 text-surface-300',
    },
};

interface SettingsSectionProps {
    title: string;
    description?: string;
    scope?: SettingScope;
    onReset?: () => void;
    resetLabel?: string;
    resetDisabled?: boolean;
    children: React.ReactNode;
    className?: string;
}

export function SettingScopeBadge({ scope }: { scope: SettingScope }) {
    const meta = SCOPE_META[scope];

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.className}`}
        >
            {meta.label}
        </span>
    );
}

export const SettingsSection = React.memo(({
    title,
    description,
    scope,
    onReset,
    resetLabel = '初期値に戻す',
    resetDisabled = false,
    children,
    className = '',
}: SettingsSectionProps) => (
    <section className={`rounded-lg border border-surface-700 bg-surface-900/45 p-4 ${className}`.trim()}>
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-surface-100">{title}</h4>
                    {scope && <SettingScopeBadge scope={scope} />}
                </div>
                {description && (
                    <p className="mt-1 text-xs leading-relaxed text-surface-400">
                        {description}
                    </p>
                )}
            </div>

            {onReset && (
                <button
                    type="button"
                    onClick={onReset}
                    disabled={resetDisabled}
                    className="inline-flex items-center gap-1.5 rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-xs text-surface-200 transition-colors hover:bg-surface-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RotateCcw size={13} />
                    {resetLabel}
                </button>
            )}
        </div>

        <div className="mt-4 space-y-4">
            {children}
        </div>
    </section>
));

SettingsSection.displayName = 'SettingsSection';
