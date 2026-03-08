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

function normalizeManifest(raw: unknown): ExternalDisplayPresetManifest | null {
    if (!isRecord(raw)) return null;
    const id = typeof raw.id === 'string' ? raw.id.trim() : '';
    const extendsMode = typeof raw.extends === 'string' ? raw.extends.trim() : '';
    if (!id || !VALID_DISPLAY_MODES.has(extendsMode)) return null;

    const normalized: ExternalDisplayPresetManifest = {
        id,
        extends: extendsMode as ExternalDisplayPresetManifest['extends'],
    };

    if (typeof raw.label === 'string' && raw.label.trim()) normalized.label = raw.label.trim();
    if (typeof raw.menuOrder === 'number' && Number.isFinite(raw.menuOrder)) normalized.menuOrder = Math.floor(raw.menuOrder);
    if (typeof raw.iconKey === 'string') normalized.iconKey = raw.iconKey as ExternalDisplayPresetManifest['iconKey'];
    if (typeof raw.cardGrowMax === 'number' && Number.isFinite(raw.cardGrowMax)) normalized.cardGrowMax = raw.cardGrowMax;
    if (typeof raw.infoVariant === 'string') normalized.infoVariant = raw.infoVariant as ExternalDisplayPresetManifest['infoVariant'];
    if (typeof raw.cardDirection === 'string') normalized.cardDirection = raw.cardDirection as ExternalDisplayPresetManifest['cardDirection'];
    if (typeof raw.horizontalThumbnailAspectRatio === 'string' && raw.horizontalThumbnailAspectRatio.trim()) {
        normalized.horizontalThumbnailAspectRatio = raw.horizontalThumbnailAspectRatio.trim();
    }
    if (typeof raw.hideThumbnailBadges === 'boolean') normalized.hideThumbnailBadges = raw.hideThumbnailBadges;
    if (typeof raw.thumbnailPresentation === 'string' && VALID_THUMBNAIL_PRESENTATIONS.has(raw.thumbnailPresentation)) {
        normalized.thumbnailPresentation = raw.thumbnailPresentation as ExternalDisplayPresetManifest['thumbnailPresentation'];
    }

    if (isRecord(raw.layout)) {
        normalized.layout = {};
        if (typeof raw.layout.aspectRatio === 'string' && raw.layout.aspectRatio.trim()) normalized.layout.aspectRatio = raw.layout.aspectRatio.trim();
        if (typeof raw.layout.cardWidth === 'number' && Number.isFinite(raw.layout.cardWidth)) normalized.layout.cardWidth = raw.layout.cardWidth;
        if (typeof raw.layout.thumbnailHeight === 'number' && Number.isFinite(raw.layout.thumbnailHeight)) normalized.layout.thumbnailHeight = raw.layout.thumbnailHeight;
        if (typeof raw.layout.infoAreaHeight === 'number' && Number.isFinite(raw.layout.infoAreaHeight)) normalized.layout.infoAreaHeight = raw.layout.infoAreaHeight;
        if (typeof raw.layout.totalHeight === 'number' && Number.isFinite(raw.layout.totalHeight)) normalized.layout.totalHeight = raw.layout.totalHeight;
    }

    if (isRecord(raw.tagSummaryUi)) {
        normalized.tagSummaryUi = {};
        if (typeof raw.tagSummaryUi.visibleCount === 'number' && Number.isFinite(raw.tagSummaryUi.visibleCount)) normalized.tagSummaryUi.visibleCount = Math.max(1, Math.floor(raw.tagSummaryUi.visibleCount));
        if (typeof raw.tagSummaryUi.chipPaddingClass === 'string') normalized.tagSummaryUi.chipPaddingClass = raw.tagSummaryUi.chipPaddingClass;
        if (typeof raw.tagSummaryUi.chipTextClass === 'string') normalized.tagSummaryUi.chipTextClass = raw.tagSummaryUi.chipTextClass;
        if (typeof raw.tagSummaryUi.chipRadiusClass === 'string') normalized.tagSummaryUi.chipRadiusClass = raw.tagSummaryUi.chipRadiusClass;
        if (typeof raw.tagSummaryUi.chipMaxWidthClass === 'string') normalized.tagSummaryUi.chipMaxWidthClass = raw.tagSummaryUi.chipMaxWidthClass;
        if (typeof raw.tagSummaryUi.rowLayoutClass === 'string') normalized.tagSummaryUi.rowLayoutClass = raw.tagSummaryUi.rowLayoutClass;
    }

    if (isRecord(raw.detailedInfoUi)) {
        normalized.detailedInfoUi = {};
        if (Array.isArray(raw.detailedInfoUi.detailedPanelBadgeKeys)) {
            normalized.detailedInfoUi.detailedPanelBadgeKeys = raw.detailedInfoUi.detailedPanelBadgeKeys.filter((value): value is 'size' | 'extension' | 'updatedDate' | 'folder' => (
                value === 'size' || value === 'extension' || value === 'updatedDate' || value === 'folder'
            ));
        }
        if (typeof raw.detailedInfoUi.isBadgeMetaMode === 'boolean') normalized.detailedInfoUi.isBadgeMetaMode = raw.detailedInfoUi.isBadgeMetaMode;
        if (typeof raw.detailedInfoUi.containerClass === 'string') normalized.detailedInfoUi.containerClass = raw.detailedInfoUi.containerClass;
        if (typeof raw.detailedInfoUi.titleClass === 'string') normalized.detailedInfoUi.titleClass = raw.detailedInfoUi.titleClass;
        if (typeof raw.detailedInfoUi.metaLineClass === 'string') normalized.detailedInfoUi.metaLineClass = raw.detailedInfoUi.metaLineClass;
        if (typeof raw.detailedInfoUi.bottomRowClass === 'string') normalized.detailedInfoUi.bottomRowClass = raw.detailedInfoUi.bottomRowClass;
        if (typeof raw.detailedInfoUi.standaloneFileSizeClass === 'string') normalized.detailedInfoUi.standaloneFileSizeClass = raw.detailedInfoUi.standaloneFileSizeClass;
        if (typeof raw.detailedInfoUi.fallbackTagSummaryVisibleCount === 'number' && Number.isFinite(raw.detailedInfoUi.fallbackTagSummaryVisibleCount)) {
            normalized.detailedInfoUi.fallbackTagSummaryVisibleCount = Math.max(1, Math.floor(raw.detailedInfoUi.fallbackTagSummaryVisibleCount));
        }
        if (typeof raw.detailedInfoUi.folderBadgeMaxWidthClass === 'string') normalized.detailedInfoUi.folderBadgeMaxWidthClass = raw.detailedInfoUi.folderBadgeMaxWidthClass;
        if (typeof raw.detailedInfoUi.tagSummaryVisibleCount === 'number' && Number.isFinite(raw.detailedInfoUi.tagSummaryVisibleCount)) {
            normalized.detailedInfoUi.tagSummaryVisibleCount = Math.max(1, Math.floor(raw.detailedInfoUi.tagSummaryVisibleCount));
        }
    }

    return normalized;
}

export function getDisplayPresetDirectory(): string {
    return path.join(app.getPath('userData'), 'display-presets');
}

function ensureDisplayPresetDirectory(): string {
    const directory = getDisplayPresetDirectory();
    fs.mkdirSync(directory, { recursive: true });

    const samplePath = path.join(directory, 'sample-whitebrowser-contain.json');
    if (!fs.existsSync(samplePath)) {
        fs.writeFileSync(samplePath, `${JSON.stringify(getSampleDisplayPresetManifest(), null, 2)}\n`, 'utf8');
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
            if (!normalized) {
                warnings.push(`${entry.name}: manifest の形式が不正です`);
                continue;
            }
            if (seenIds.has(normalized.id)) {
                warnings.push(`${entry.name}: ID "${normalized.id}" が重複しているため無視しました`);
                continue;
            }
            if (VALID_DISPLAY_MODES.has(normalized.id)) {
                warnings.push(`${entry.name}: built-in preset ID と同名のため無視しました`);
                continue;
            }
            seenIds.add(normalized.id);
            presets.push(normalized);
        } catch (error) {
            warnings.push(`${entry.name}: 読み込みに失敗しました (${error instanceof Error ? error.message : String(error)})`);
        }
    }

    return { directory, presets, warnings };
}
