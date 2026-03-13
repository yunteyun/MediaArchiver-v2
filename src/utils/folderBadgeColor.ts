import type { CSSProperties } from 'react';

export const FOLDER_BADGE_COLOR_OPTIONS = [
    { value: 'gray', label: 'グレー' },
    { value: 'red', label: 'レッド' },
    { value: 'orange', label: 'オレンジ' },
    { value: 'amber', label: 'アンバー' },
    { value: 'lime', label: 'ライム' },
    { value: 'green', label: 'グリーン' },
    { value: 'teal', label: 'ティール' },
    { value: 'cyan', label: 'シアン' },
    { value: 'blue', label: 'ブルー' },
    { value: 'indigo', label: 'インディゴ' },
    { value: 'violet', label: 'バイオレット' },
    { value: 'pink', label: 'ピンク' },
] as const;

const FOLDER_BADGE_COLOR_HEX: Record<string, string> = {
    gray: '#4b5563',
    red: '#dc2626',
    orange: '#ea580c',
    amber: '#d97706',
    yellow: '#f59e0b',
    lime: '#65a30d',
    green: '#16a34a',
    emerald: '#059669',
    teal: '#0d9488',
    cyan: '#0891b2',
    sky: '#0284c7',
    blue: '#2563eb',
    indigo: '#4f46e5',
    violet: '#7c3aed',
    purple: '#9333ea',
    fuchsia: '#c026d3',
    pink: '#db2777',
    rose: '#e11d48',
};

function normalizeFolderBadgeColor(colorName?: string | null): string | null {
    if (!colorName) return null;
    const normalized = colorName.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
}

function hexToRgba(hex: string, alpha: number): string {
    const normalized = hex.replace('#', '');
    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function resolveFolderBadgeColorHex(colorName?: string | null): string | null {
    const normalized = normalizeFolderBadgeColor(colorName);
    if (!normalized) return null;
    return FOLDER_BADGE_COLOR_HEX[normalized] ?? null;
}

export function getFolderBadgeAccentColor(colorName?: string | null): string | undefined {
    return resolveFolderBadgeColorHex(colorName) ?? undefined;
}

export function getFolderBadgePillStyle(colorName?: string | null): CSSProperties | undefined {
    const hex = resolveFolderBadgeColorHex(colorName);
    if (!hex) return undefined;
    return {
        borderLeftColor: hex,
        borderLeftWidth: '3px',
        borderLeftStyle: 'solid',
        boxShadow: `inset 0 0 0 1px ${hexToRgba(hex, 0.18)}`,
    };
}

export function getFolderBadgePanelStyle(colorName?: string | null): CSSProperties | undefined {
    const hex = resolveFolderBadgeColorHex(colorName);
    if (!hex) return undefined;
    return {
        borderLeftColor: hex,
        borderLeftWidth: '3px',
        borderLeftStyle: 'solid',
        boxShadow: `inset 0 0 0 1px ${hexToRgba(hex, 0.16)}`,
    };
}
