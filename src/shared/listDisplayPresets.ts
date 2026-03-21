import type { DateGroupingMode, GroupBy } from '../stores/useSettingsStore';
import type { FileSortBy, FileSortOrder } from '../stores/useUIStore';

export type ListDisplayPresetId = 'recent' | 'weekly' | 'monthly' | 'type';

export interface ListDisplayPresetSettings {
    sortBy: FileSortBy;
    sortOrder: FileSortOrder;
    groupBy: GroupBy;
    dateGroupingMode: DateGroupingMode;
}

export interface ListDisplayPresetDefinition {
    id: ListDisplayPresetId;
    label: string;
    description: string;
    settings: ListDisplayPresetSettings;
}

export const LIST_DISPLAY_PRESETS: ListDisplayPresetDefinition[] = [
    {
        id: 'recent',
        label: '新着順',
        description: 'グループなしで新しい順に見る',
        settings: {
            sortBy: 'date',
            sortOrder: 'desc',
            groupBy: 'none',
            dateGroupingMode: 'auto',
        },
    },
    {
        id: 'weekly',
        label: '週ごと',
        description: '古い項目も週単位でまとまる',
        settings: {
            sortBy: 'date',
            sortOrder: 'desc',
            groupBy: 'date',
            dateGroupingMode: 'week',
        },
    },
    {
        id: 'monthly',
        label: '月ごと',
        description: '古い項目は月単位でまとまる',
        settings: {
            sortBy: 'date',
            sortOrder: 'desc',
            groupBy: 'date',
            dateGroupingMode: 'auto',
        },
    },
    {
        id: 'type',
        label: 'タイプ別',
        description: '種類ごとに名前順で並べる',
        settings: {
            sortBy: 'name',
            sortOrder: 'asc',
            groupBy: 'type',
            dateGroupingMode: 'auto',
        },
    },
];

export function findMatchingListDisplayPresetId(settings: ListDisplayPresetSettings): ListDisplayPresetId | null {
    const matched = LIST_DISPLAY_PRESETS.find((preset) => (
        preset.settings.sortBy === settings.sortBy &&
        preset.settings.sortOrder === settings.sortOrder &&
        preset.settings.groupBy === settings.groupBy &&
        preset.settings.dateGroupingMode === settings.dateGroupingMode
    ));

    return matched?.id ?? null;
}
