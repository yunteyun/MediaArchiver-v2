/**
 * colors.ts - アプリ共通色定数
 *
 * タグ色・ファイルタイプ色・チャート色を一元管理する。
 * 色定義の重複を防ぎ、変更を1箇所で完結させるための基盤ファイル。
 */

// ============================================================
// タグ色 (18色)
// ============================================================

/** 色名 → HEX値マップ（タグ・カテゴリ・フォルダバッジ共通） */
export const TAG_COLOR_HEX: Record<string, string> = {
    gray:    '#4b5563',  // gray-600
    red:     '#dc2626',  // red-600
    orange:  '#ea580c',  // orange-600
    amber:   '#d97706',  // amber-600
    yellow:  '#f59e0b',  // amber-500（yellow は amber-500 に統一）
    lime:    '#65a30d',  // lime-600
    green:   '#16a34a',  // green-600
    emerald: '#059669',  // emerald-600
    teal:    '#0d9488',  // teal-600
    cyan:    '#0891b2',  // cyan-600
    sky:     '#0284c7',  // sky-600
    blue:    '#2563eb',  // blue-600
    indigo:  '#4f46e5',  // indigo-600
    violet:  '#7c3aed',  // violet-600
    purple:  '#9333ea',  // purple-600
    fuchsia: '#c026d3',  // fuchsia-600
    pink:    '#db2777',  // pink-600
    rose:    '#e11d48',  // rose-600
};

/**
 * 色名 → Tailwind クラス文字列マップ（filled モード用）
 * orange/yellow/amber/lime は明るい背景なので暗文字を使う。
 */
export const TAG_COLOR_CLASSES: Record<string, string> = {
    gray:    'bg-gray-600 text-gray-100 border-gray-500',
    red:     'bg-red-600 text-red-100 border-red-500',
    orange:  'bg-orange-600 text-gray-900 border-orange-500',
    amber:   'bg-amber-600 text-gray-900 border-amber-500',
    yellow:  'bg-amber-500 text-gray-900 border-amber-400',
    lime:    'bg-lime-600 text-gray-900 border-lime-500',
    green:   'bg-green-600 text-green-100 border-green-500',
    emerald: 'bg-emerald-600 text-emerald-100 border-emerald-500',
    teal:    'bg-teal-600 text-teal-100 border-teal-500',
    cyan:    'bg-cyan-600 text-cyan-100 border-cyan-500',
    sky:     'bg-sky-600 text-sky-100 border-sky-500',
    blue:    'bg-blue-600 text-blue-100 border-blue-500',
    indigo:  'bg-indigo-600 text-indigo-100 border-indigo-500',
    violet:  'bg-violet-600 text-violet-100 border-violet-500',
    purple:  'bg-purple-600 text-purple-100 border-purple-500',
    fuchsia: 'bg-fuchsia-600 text-fuchsia-100 border-fuchsia-500',
    pink:    'bg-pink-600 text-pink-100 border-pink-500',
    rose:    'bg-rose-600 text-rose-100 border-rose-500',
};

/**
 * 色名を HEX 値に解決する。
 *
 * - TAG_COLOR_HEX のキーにあれば対応 HEX を返す
 * - '#' 始まり / 'rgb(' 始まり / 'hsl(' 始まりはすでに CSS 色値なのでそのまま返す
 * - 未知のキーは fallback（省略時は gray の HEX）を返す
 */
export function resolveColorHex(colorName?: string, fallback?: string): string {
    if (!colorName) return fallback ?? TAG_COLOR_HEX.gray;
    const normalized = colorName.trim().toLowerCase();
    if (!normalized) return fallback ?? TAG_COLOR_HEX.gray;

    // TAG_COLOR_HEX に定義済み
    if (TAG_COLOR_HEX[normalized]) return TAG_COLOR_HEX[normalized];

    // 既に CSS 色値（パススルー）
    if (
        normalized.startsWith('#') ||
        normalized.startsWith('rgb(') ||
        normalized.startsWith('rgba(') ||
        normalized.startsWith('hsl(') ||
        normalized.startsWith('hsla(')
    ) {
        return colorName;
    }

    return fallback ?? TAG_COLOR_HEX.gray;
}

/**
 * 背景色名に応じたテキスト色を返す。
 * orange / yellow / amber / lime は明るいため暗文字、それ以外は白。
 */
export function getTextColorForBackground(colorName: string): string {
    const lightColors = ['orange', 'yellow', 'amber', 'lime'];
    const lower = colorName.toLowerCase();
    if (lightColors.some((c) => lower.includes(c))) return '#1a1a2e';
    return '#FFFFFF';
}

// ============================================================
// ファイルタイプ色
// ============================================================

/** ファイルタイプ名 → HEX値マップ */
export const FILE_TYPE_COLORS: Record<string, string> = {
    image:   '#3b82f6',  // 青
    video:   '#22c55e',  // 緑
    archive: '#f97316',  // オレンジ
    audio:   '#a855f7',  // 紫
};

// ============================================================
// チャート共通定数
// ============================================================

/** recharts Tooltip 共通スタイル */
export const CHART_TOOLTIP_STYLES = {
    contentStyle: {
        backgroundColor: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '10px',
        boxShadow: '0 12px 30px rgba(15, 23, 42, 0.45)',
    },
    labelStyle: {
        color: '#f8fafc',
        fontWeight: 600,
    },
    itemStyle: {
        color: '#cbd5e1',
    },
    wrapperStyle: {
        outline: 'none',
        zIndex: 20,
    },
} as const;

/** チャート軸・目盛りのテキスト色 */
export const CHART_AXIS_COLOR = '#94a3b8';

/** チャートグリッド線の色 */
export const CHART_GRID_COLOR = '#334155';

/** チャートのホバーカーソル色 */
export const CHART_HOVER_CURSOR = { fill: 'rgba(59, 130, 246, 0.12)' };

/** タグ別グラフのデフォルト配色パレット（10色） */
export const TAG_CHART_PALETTE: string[] = [
    '#60a5fa',
    '#34d399',
    '#f59e0b',
    '#f472b6',
    '#a78bfa',
    '#22d3ee',
    '#fb7185',
    '#84cc16',
    '#38bdf8',
    '#f97316',
];
