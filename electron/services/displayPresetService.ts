import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import type { ExternalDisplayPresetManifest } from '../../src/components/fileCard/displayModes';

const VALID_DISPLAY_MODES = new Set([
    'standard',
    'standardLarge',
    'manga',
    'video',
    'whiteBrowser',
    'mangaDetailed',
    'compact',
]);

const VALID_THUMBNAIL_PRESENTATIONS = new Set([
    'modeDefault',
    'contain',
    'cover',
    'square',
]);

const VALID_ICON_KEYS = new Set([
    'grid',
    'maximize',
    'layoutGrid',
    'film',
    'minimize',
]);

const VALID_INFO_VARIANTS = new Set([
    'compact',
    'detailed',
]);

const VALID_CARD_DIRECTIONS = new Set([
    'vertical',
    'horizontal',
]);

const VALID_BADGE_KEYS = new Set([
    'size',
    'extension',
    'updatedDate',
    'folder',
]);

const VALID_COMPACT_INFO_UI_KEYS = new Set([
    'containerClass',
    'titleClass',
    'metaRowClass',
    'fileSizeClass',
]);

const LAYOUT_RANGES = {
    cardWidth: { min: 140, max: 720 },
    thumbnailHeight: { min: 96, max: 720 },
    infoAreaHeight: { min: 40, max: 480 },
    totalHeight: { min: 140, max: 1200 },
} as const;

const MENU_ORDER_RANGE = { min: 0, max: 999 };
const CARD_GROW_MAX_RANGE = { min: 0, max: 240 };
const VISIBLE_COUNT_RANGE = { min: 1, max: 30 };

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getSampleDisplayPresetManifest(): ExternalDisplayPresetManifest {
    return {
        id: 'sample-whitebrowser-contain',
        extends: 'whiteBrowser',
        label: 'Sample WhiteBrowser Contain',
        menuOrder: 47,
        thumbnailPresentation: 'contain',
        layout: {
            cardWidth: 460,
            thumbnailHeight: 210,
            infoAreaHeight: 210,
            totalHeight: 380,
        },
        tagSummaryUi: {
            visibleCount: 12,
            chipMaxWidthClass: 'max-w-[120px]',
        },
        detailedInfoUi: {
            folderBadgeMaxWidthClass: 'max-w-[160px]',
            tagSummaryVisibleCount: 12,
        },
    };
}

function getWhiteBrowserBalancedPresetManifest(): ExternalDisplayPresetManifest {
    return {
        id: 'whitebrowser-balanced',
        extends: 'whiteBrowser',
        label: 'WhiteBrowser Balanced',
        menuOrder: 48,
        thumbnailPresentation: 'contain',
        layout: {
            cardWidth: 480,
            thumbnailHeight: 220,
            infoAreaHeight: 220,
            totalHeight: 400,
        },
        tagSummaryUi: {
            visibleCount: 10,
            chipMaxWidthClass: 'max-w-[128px]',
        },
        detailedInfoUi: {
            folderBadgeMaxWidthClass: 'max-w-[176px]',
            tagSummaryVisibleCount: 10,
        },
    };
}

function getCompactDensePresetManifest(): ExternalDisplayPresetManifest {
    return {
        id: 'compact-dense',
        extends: 'compact',
        label: '標準（XS/高密度）',
        menuOrder: 5,
        thumbnailPresentation: 'modeDefault',
        layout: {
            aspectRatio: '1/1',
            cardWidth: 156,
            thumbnailHeight: 156,
            infoAreaHeight: 40,
            totalHeight: 196,
        },
        tagSummaryUi: {
            visibleCount: 1,
            chipPaddingClass: 'px-1 py-px',
            chipTextClass: 'text-[6px] leading-none',
            chipFontWeightClass: 'font-medium',
            chipRadiusClass: 'rounded-sm',
            chipMaxWidthClass: 'max-w-[44px]',
            rowGapClass: 'gap-0.5',
        },
        compactInfoUi: {
            containerClass: 'px-1.5 py-1 flex flex-col justify-start bg-surface-800 gap-0',
            titleClass: 'text-[11px] text-white truncate leading-tight font-semibold mb-0.5',
            metaRowClass: 'flex items-start justify-between gap-1',
            fileSizeClass: 'text-[9px] text-surface-200 font-semibold tracking-tight flex-shrink-0 bg-surface-700/60 px-1 py-0.5 rounded-sm',
        },
    };
}

function getLegacyCompactDensePresetManifest(): ExternalDisplayPresetManifest {
    return {
        id: 'compact-dense',
        extends: 'compact',
        label: '標準（XS/高密度）',
        menuOrder: 5,
        thumbnailPresentation: 'modeDefault',
        layout: {
            aspectRatio: '1/1',
            cardWidth: 156,
            thumbnailHeight: 156,
            infoAreaHeight: 40,
            totalHeight: 196,
        },
        tagSummaryUi: {
            visibleCount: 1,
            chipPaddingClass: 'px-1 py-0.5',
            chipTextClass: 'text-[7px] leading-none',
            chipRadiusClass: 'rounded-sm',
            chipMaxWidthClass: 'max-w-[50px]',
        },
        compactInfoUi: {
            containerClass: 'px-1.5 py-1 flex flex-col justify-start bg-surface-800 gap-0',
            titleClass: 'text-[11px] text-white truncate leading-tight font-semibold mb-0.5',
            metaRowClass: 'flex items-start justify-between gap-1',
            fileSizeClass: 'text-[9px] text-surface-200 font-semibold tracking-tight flex-shrink-0 bg-surface-700/60 px-1 py-0.5 rounded-sm',
        },
    };
}

type NormalizeManifestResult = {
    manifest: ExternalDisplayPresetManifest | null;
    warnings: string[];
};

function pickBoundedInteger(
    rawValue: unknown,
    label: string,
    min: number,
    max: number,
    warnings: string[]
): number | undefined {
    if (rawValue === undefined) return undefined;
    if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
        warnings.push(`${label} は数値で指定してください`);
        return undefined;
    }

    const normalized = Math.floor(rawValue);
    if (normalized < min || normalized > max) {
        warnings.push(`${label} は ${min}〜${max} の範囲で指定してください`);
        return undefined;
    }

    return normalized;
}

function pickStringEnum<T extends string>(
    rawValue: unknown,
    label: string,
    allowed: Set<T>,
    warnings: string[]
): T | undefined {
    if (rawValue === undefined) return undefined;
    if (typeof rawValue !== 'string') {
        warnings.push(`${label} は文字列で指定してください`);
        return undefined;
    }
    if (!allowed.has(rawValue as T)) {
        warnings.push(`${label} に指定できない値です`);
        return undefined;
    }
    return rawValue as T;
}

function normalizeManifest(raw: unknown): NormalizeManifestResult {
    const warnings: string[] = [];
    if (!isRecord(raw)) {
        return { manifest: null, warnings: ['manifest はオブジェクト形式で指定してください'] };
    }
    const id = typeof raw.id === 'string' ? raw.id.trim() : '';
    const extendsMode = typeof raw.extends === 'string' ? raw.extends.trim() : '';
    if (!id) {
        return { manifest: null, warnings: ['id が未指定です'] };
    }
    if (!VALID_DISPLAY_MODES.has(extendsMode)) {
        return { manifest: null, warnings: ['extends に有効な built-in preset を指定してください'] };
    }

    const normalized: ExternalDisplayPresetManifest = {
        id,
        extends: extendsMode as ExternalDisplayPresetManifest['extends'],
    };

    if (typeof raw.label === 'string' && raw.label.trim()) normalized.label = raw.label.trim();
    const normalizedMenuOrder = pickBoundedInteger(raw.menuOrder, 'menuOrder', MENU_ORDER_RANGE.min, MENU_ORDER_RANGE.max, warnings);
    if (normalizedMenuOrder !== undefined) normalized.menuOrder = normalizedMenuOrder;
    const normalizedIconKey = pickStringEnum(raw.iconKey, 'iconKey', VALID_ICON_KEYS, warnings);
    if (normalizedIconKey) normalized.iconKey = normalizedIconKey as ExternalDisplayPresetManifest['iconKey'];
    const normalizedCardGrowMax = pickBoundedInteger(raw.cardGrowMax, 'cardGrowMax', CARD_GROW_MAX_RANGE.min, CARD_GROW_MAX_RANGE.max, warnings);
    if (normalizedCardGrowMax !== undefined) normalized.cardGrowMax = normalizedCardGrowMax;
    const normalizedInfoVariant = pickStringEnum(raw.infoVariant, 'infoVariant', VALID_INFO_VARIANTS, warnings);
    if (normalizedInfoVariant) normalized.infoVariant = normalizedInfoVariant as ExternalDisplayPresetManifest['infoVariant'];
    const normalizedCardDirection = pickStringEnum(raw.cardDirection, 'cardDirection', VALID_CARD_DIRECTIONS, warnings);
    if (normalizedCardDirection) normalized.cardDirection = normalizedCardDirection as ExternalDisplayPresetManifest['cardDirection'];
    if (typeof raw.horizontalThumbnailAspectRatio === 'string' && raw.horizontalThumbnailAspectRatio.trim()) {
        normalized.horizontalThumbnailAspectRatio = raw.horizontalThumbnailAspectRatio.trim();
    } else if (raw.horizontalThumbnailAspectRatio !== undefined) {
        warnings.push('horizontalThumbnailAspectRatio は文字列で指定してください');
    }
    if (typeof raw.hideThumbnailBadges === 'boolean') normalized.hideThumbnailBadges = raw.hideThumbnailBadges;
    const normalizedThumbnailPresentation = pickStringEnum(raw.thumbnailPresentation, 'thumbnailPresentation', VALID_THUMBNAIL_PRESENTATIONS, warnings);
    if (normalizedThumbnailPresentation) {
        normalized.thumbnailPresentation = normalizedThumbnailPresentation as ExternalDisplayPresetManifest['thumbnailPresentation'];
    }

    if (isRecord(raw.layout)) {
        normalized.layout = {};
        if (typeof raw.layout.aspectRatio === 'string' && raw.layout.aspectRatio.trim()) {
            normalized.layout.aspectRatio = raw.layout.aspectRatio.trim();
        } else if (raw.layout.aspectRatio !== undefined) {
            warnings.push('layout.aspectRatio は文字列で指定してください');
        }
        const normalizedCardWidth = pickBoundedInteger(raw.layout.cardWidth, 'layout.cardWidth', LAYOUT_RANGES.cardWidth.min, LAYOUT_RANGES.cardWidth.max, warnings);
        if (normalizedCardWidth !== undefined) normalized.layout.cardWidth = normalizedCardWidth;
        const normalizedThumbnailHeight = pickBoundedInteger(raw.layout.thumbnailHeight, 'layout.thumbnailHeight', LAYOUT_RANGES.thumbnailHeight.min, LAYOUT_RANGES.thumbnailHeight.max, warnings);
        if (normalizedThumbnailHeight !== undefined) normalized.layout.thumbnailHeight = normalizedThumbnailHeight;
        const normalizedInfoAreaHeight = pickBoundedInteger(raw.layout.infoAreaHeight, 'layout.infoAreaHeight', LAYOUT_RANGES.infoAreaHeight.min, LAYOUT_RANGES.infoAreaHeight.max, warnings);
        if (normalizedInfoAreaHeight !== undefined) normalized.layout.infoAreaHeight = normalizedInfoAreaHeight;
        const normalizedTotalHeight = pickBoundedInteger(raw.layout.totalHeight, 'layout.totalHeight', LAYOUT_RANGES.totalHeight.min, LAYOUT_RANGES.totalHeight.max, warnings);
        if (normalizedTotalHeight !== undefined) normalized.layout.totalHeight = normalizedTotalHeight;
    }

    if (isRecord(raw.tagSummaryUi)) {
        normalized.tagSummaryUi = {};
        const normalizedVisibleCount = pickBoundedInteger(raw.tagSummaryUi.visibleCount, 'tagSummaryUi.visibleCount', VISIBLE_COUNT_RANGE.min, VISIBLE_COUNT_RANGE.max, warnings);
        if (normalizedVisibleCount !== undefined) normalized.tagSummaryUi.visibleCount = normalizedVisibleCount;
        if (typeof raw.tagSummaryUi.chipPaddingClass === 'string') normalized.tagSummaryUi.chipPaddingClass = raw.tagSummaryUi.chipPaddingClass;
        if (typeof raw.tagSummaryUi.chipTextClass === 'string') normalized.tagSummaryUi.chipTextClass = raw.tagSummaryUi.chipTextClass;
        if (typeof raw.tagSummaryUi.chipFontWeightClass === 'string') normalized.tagSummaryUi.chipFontWeightClass = raw.tagSummaryUi.chipFontWeightClass;
        if (typeof raw.tagSummaryUi.chipRadiusClass === 'string') normalized.tagSummaryUi.chipRadiusClass = raw.tagSummaryUi.chipRadiusClass;
        if (typeof raw.tagSummaryUi.chipMaxWidthClass === 'string') normalized.tagSummaryUi.chipMaxWidthClass = raw.tagSummaryUi.chipMaxWidthClass;
        if (typeof raw.tagSummaryUi.rowGapClass === 'string') normalized.tagSummaryUi.rowGapClass = raw.tagSummaryUi.rowGapClass;
        if (typeof raw.tagSummaryUi.rowLayoutClass === 'string') normalized.tagSummaryUi.rowLayoutClass = raw.tagSummaryUi.rowLayoutClass;
    }

    if (isRecord(raw.detailedInfoUi)) {
        normalized.detailedInfoUi = {};
        if (Array.isArray(raw.detailedInfoUi.detailedPanelBadgeKeys)) {
            const filteredBadgeKeys = raw.detailedInfoUi.detailedPanelBadgeKeys.filter((value): value is 'size' | 'extension' | 'updatedDate' | 'folder' => (
                typeof value === 'string' && VALID_BADGE_KEYS.has(value)
            ));
            if (filteredBadgeKeys.length !== raw.detailedInfoUi.detailedPanelBadgeKeys.length) {
                warnings.push('detailedInfoUi.detailedPanelBadgeKeys に無効な値が含まれていたため除外しました');
            }
            normalized.detailedInfoUi.detailedPanelBadgeKeys = filteredBadgeKeys;
        }
        if (typeof raw.detailedInfoUi.isBadgeMetaMode === 'boolean') normalized.detailedInfoUi.isBadgeMetaMode = raw.detailedInfoUi.isBadgeMetaMode;
        if (typeof raw.detailedInfoUi.containerClass === 'string') normalized.detailedInfoUi.containerClass = raw.detailedInfoUi.containerClass;
        if (typeof raw.detailedInfoUi.titleClass === 'string') normalized.detailedInfoUi.titleClass = raw.detailedInfoUi.titleClass;
        if (typeof raw.detailedInfoUi.metaLineClass === 'string') normalized.detailedInfoUi.metaLineClass = raw.detailedInfoUi.metaLineClass;
        if (typeof raw.detailedInfoUi.bottomRowClass === 'string') normalized.detailedInfoUi.bottomRowClass = raw.detailedInfoUi.bottomRowClass;
        if (typeof raw.detailedInfoUi.standaloneFileSizeClass === 'string') normalized.detailedInfoUi.standaloneFileSizeClass = raw.detailedInfoUi.standaloneFileSizeClass;
        const normalizedFallbackVisibleCount = pickBoundedInteger(raw.detailedInfoUi.fallbackTagSummaryVisibleCount, 'detailedInfoUi.fallbackTagSummaryVisibleCount', VISIBLE_COUNT_RANGE.min, VISIBLE_COUNT_RANGE.max, warnings);
        if (normalizedFallbackVisibleCount !== undefined) normalized.detailedInfoUi.fallbackTagSummaryVisibleCount = normalizedFallbackVisibleCount;
        if (typeof raw.detailedInfoUi.folderBadgeMaxWidthClass === 'string') normalized.detailedInfoUi.folderBadgeMaxWidthClass = raw.detailedInfoUi.folderBadgeMaxWidthClass;
        const normalizedTagSummaryVisibleCount = pickBoundedInteger(raw.detailedInfoUi.tagSummaryVisibleCount, 'detailedInfoUi.tagSummaryVisibleCount', VISIBLE_COUNT_RANGE.min, VISIBLE_COUNT_RANGE.max, warnings);
        if (normalizedTagSummaryVisibleCount !== undefined) normalized.detailedInfoUi.tagSummaryVisibleCount = normalizedTagSummaryVisibleCount;
    }

    if (isRecord(raw.compactInfoUi)) {
        normalized.compactInfoUi = {};
        if (typeof raw.compactInfoUi.containerClass === 'string') normalized.compactInfoUi.containerClass = raw.compactInfoUi.containerClass;
        if (typeof raw.compactInfoUi.titleClass === 'string') normalized.compactInfoUi.titleClass = raw.compactInfoUi.titleClass;
        if (typeof raw.compactInfoUi.metaRowClass === 'string') normalized.compactInfoUi.metaRowClass = raw.compactInfoUi.metaRowClass;
        if (typeof raw.compactInfoUi.fileSizeClass === 'string') normalized.compactInfoUi.fileSizeClass = raw.compactInfoUi.fileSizeClass;

        Object.keys(raw.compactInfoUi).forEach((key) => {
            if (!VALID_COMPACT_INFO_UI_KEYS.has(key)) {
                warnings.push(`compactInfoUi.${key} は未対応のため無視しました`);
            }
        });
    }

    return { manifest: normalized, warnings };
}

export function getDisplayPresetDirectory(): string {
    return path.join(app.getPath('userData'), 'display-presets');
}

function ensureDisplayPresetDirectory(): string {
    const directory = getDisplayPresetDirectory();
    fs.mkdirSync(directory, { recursive: true });

    const defaultManifests = [
        {
            fileName: 'sample-whitebrowser-contain.json',
            manifest: getSampleDisplayPresetManifest(),
        },
        {
            fileName: 'whitebrowser-balanced.json',
            manifest: getWhiteBrowserBalancedPresetManifest(),
        },
        {
            fileName: 'compact-dense.json',
            manifest: getCompactDensePresetManifest(),
        },
    ];

    for (const { fileName, manifest } of defaultManifests) {
        const presetPath = path.join(directory, fileName);
        if (!fs.existsSync(presetPath)) {
            fs.writeFileSync(presetPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
        }
    }

    const compactDensePath = path.join(directory, 'compact-dense.json');
    if (fs.existsSync(compactDensePath)) {
        try {
            const parsed = JSON.parse(fs.readFileSync(compactDensePath, 'utf8')) as unknown;
            if (JSON.stringify(parsed) === JSON.stringify(getLegacyCompactDensePresetManifest())) {
                fs.writeFileSync(compactDensePath, `${JSON.stringify(getCompactDensePresetManifest(), null, 2)}\n`, 'utf8');
            }
        } catch {
            // Keep user-edited files untouched; load-time validation will report issues.
        }
    }

    return directory;
}

export function listExternalDisplayPresetManifests(): {
    directory: string;
    presets: ExternalDisplayPresetManifest[];
    warnings: string[];
} {
    const directory = ensureDisplayPresetDirectory();
    const warnings: string[] = [];
    const presets: ExternalDisplayPresetManifest[] = [];
    const seenIds = new Set<string>();

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.json') continue;
        const filePath = path.join(directory, entry.name);
        try {
            const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
            const normalized = normalizeManifest(parsed);
            normalized.warnings.forEach((warning) => warnings.push(`${entry.name}: ${warning}`));
            if (!normalized.manifest) {
                continue;
            }
            const manifest = normalized.manifest;
            if (seenIds.has(manifest.id)) {
                warnings.push(`${entry.name}: ID "${manifest.id}" が重複しているため無視しました`);
                continue;
            }
            if (VALID_DISPLAY_MODES.has(manifest.id)) {
                warnings.push(`${entry.name}: built-in preset ID と同名のため無視しました`);
                continue;
            }
            seenIds.add(manifest.id);
            presets.push(manifest);
        } catch (error) {
            warnings.push(`${entry.name}: 読み込みに失敗しました (${error instanceof Error ? error.message : String(error)})`);
        }
    }

    return { directory, presets, warnings };
}
