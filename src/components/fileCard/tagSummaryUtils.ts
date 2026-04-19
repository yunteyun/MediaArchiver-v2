import type { Tag } from '../../stores/useTagStore';
import type { ResolvedFileCardDisplayPreset } from './displayModes';

export type TagSummaryUiConfig = {
    tagChipPaddingClass: string;
    tagChipTextClass: string;
    tagChipFontWeightClass: string;
    tagChipRadiusClass: string;
    tagChipMaxWidthClass: string;
    rowGapClass: string;
    rowLayoutClass: string;
};

export function getTagSummaryUiConfig(displayPreset: ResolvedFileCardDisplayPreset): TagSummaryUiConfig {
    const preset = displayPreset.tagSummaryUi;
    return {
        tagChipPaddingClass: preset.chipPaddingClass,
        tagChipTextClass: preset.chipTextClass,
        tagChipFontWeightClass: preset.chipFontWeightClass,
        tagChipRadiusClass: preset.chipRadiusClass,
        tagChipMaxWidthClass: preset.chipMaxWidthClass,
        rowGapClass: preset.rowGapClass,
        rowLayoutClass: preset.rowLayoutClass,
    };
}

export function getBalancedSummaryTags(tags: Tag[], visibleCount: number): Tag[] {
    if (visibleCount <= 0) return [];
    if (tags.length <= visibleCount) return tags.slice(0, visibleCount);

    const categorizedBuckets: Tag[][] = [];
    const bucketIndexByCategoryId = new Map<string, number>();
    const uncategorizedBucket: Tag[] = [];

    for (const tag of tags) {
        if (!tag.categoryId) {
            uncategorizedBucket.push(tag);
            continue;
        }

        let bucketIndex = bucketIndexByCategoryId.get(tag.categoryId);
        if (bucketIndex === undefined) {
            bucketIndex = categorizedBuckets.length;
            bucketIndexByCategoryId.set(tag.categoryId, bucketIndex);
            categorizedBuckets.push([]);
        }
        categorizedBuckets[bucketIndex]!.push(tag);
    }

    const buckets = uncategorizedBucket.length > 0
        ? [...categorizedBuckets, uncategorizedBucket]
        : categorizedBuckets;

    const bucketPositions = new Array(buckets.length).fill(0);
    const result: Tag[] = [];

    while (result.length < visibleCount) {
        let pickedInRound = false;

        for (let i = 0; i < buckets.length; i += 1) {
            const bucket = buckets[i];
            const pos = bucketPositions[i];
            if (!bucket || pos >= bucket.length) continue;

            result.push(bucket[pos]!);
            bucketPositions[i] = pos + 1;
            pickedInRound = true;

            if (result.length >= visibleCount) break;
        }

        if (!pickedInRound) break;
    }

    return result;
}
