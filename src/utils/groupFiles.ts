import type { DateGroupingMode } from '../stores/useSettingsStore';
import type { MediaFile } from '../types/file';

// グループ化型定義
export type GroupBy = 'none' | 'date' | 'size' | 'type';

// ファイルグループ
export interface FileGroup {
    key: string;           // グループのユニークキー
    label: string;         // 表示ラベル
    files: MediaFile[];    // グループ内のファイル
    icon: string;          // lucide-react アイコン名
}

export interface GroupFilesOptions {
    dateGroupingMode?: DateGroupingMode;
    now?: Date;
}

// サイズ区分定義（Phase 12-10）
const SIZE_RANGES = [
    { key: 'huge', label: '巨大 (>1GB)', min: 1024 * 1024 * 1024, icon: 'HardDrive' },
    { key: 'xlarge', label: '特大 (500MB-1GB)', min: 500 * 1024 * 1024, icon: 'HardDrive' },
    { key: 'large', label: '大 (100MB-500MB)', min: 100 * 1024 * 1024, icon: 'HardDrive' },
    { key: 'medium', label: '中 (10MB-100MB)', min: 10 * 1024 * 1024, icon: 'HardDrive' },
    { key: 'small', label: '小 (<10MB)', min: 0, icon: 'HardDrive' }
];

// タイプラベル定義
const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
    video: { label: '動画', icon: 'Film' },
    image: { label: '画像', icon: 'Image' },
    audio: { label: '音声', icon: 'Music' },
    archive: { label: '書庫', icon: 'Archive' }
};

/**
 * 日付境界計算（Phase 21-A: 相対時間区分）
 * ループ外で1回だけ計算する
 */
function getWeekStart(date: Date): Date {
    const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayOfWeek = weekStart.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(weekStart.getDate() - daysToMonday);
    return weekStart;
}

function getDateBoundaries(now = new Date()) {

    // 今日の開始時刻（00:00:00）
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 昨日の開始時刻
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // 今週の月曜日（weekStartsOn: 1）
    const weekStart = getWeekStart(todayStart);

    // 先週の月曜日
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    // 2週間前の月曜日
    const twoWeeksStart = new Date(weekStart);
    twoWeeksStart.setDate(twoWeeksStart.getDate() - 14);

    return {
        now,
        todayStart: todayStart.getTime(),
        yesterdayStart: yesterdayStart.getTime(),
        weekStart: weekStart.getTime(),
        lastWeekStart: lastWeekStart.getTime(),
        twoWeeksStart: twoWeeksStart.getTime()
    };
}

function getWeekGroupKey(timestamp: number): string {
    const weekStart = getWeekStart(new Date(timestamp));
    return `week:${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
}

function formatMonthDay(date: Date): string {
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getWeekOfMonth(date: Date): number {
    return Math.floor((date.getDate() - 1) / 7) + 1;
}

function formatWeekGroupLabel(weekStart: Date): string {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const sameMonth =
        weekStart.getFullYear() === weekEnd.getFullYear() &&
        weekStart.getMonth() === weekEnd.getMonth();

    if (sameMonth) {
        return `${weekStart.getFullYear()}年${weekStart.getMonth() + 1}月 第${getWeekOfMonth(weekStart)}週 (${formatMonthDay(weekStart)} - ${formatMonthDay(weekEnd)})`;
    }

    return `${weekStart.getFullYear()}年${weekStart.getMonth() + 1}月${weekStart.getDate()}日週 (${formatMonthDay(weekStart)} - ${formatMonthDay(weekEnd)})`;
}

/**
 * 相対時間区分を判定（Phase 21-A）
 * 判定順序は厳守すること
 */
function getRelativeTimeGroup(timestamp: number, boundaries: ReturnType<typeof getDateBoundaries>): string | null {
    const { todayStart, yesterdayStart, weekStart, lastWeekStart, twoWeeksStart } = boundaries;

    // 今日
    if (timestamp >= todayStart) {
        return 'relative:today';
    }

    // 昨日
    if (timestamp >= yesterdayStart && timestamp < todayStart) {
        return 'relative:yesterday';
    }

    // 今週（今日・昨日を除く）
    if (timestamp >= weekStart && timestamp < yesterdayStart) {
        return 'relative:thisWeek';
    }

    // 先週
    if (timestamp >= lastWeekStart && timestamp < weekStart) {
        return 'relative:lastWeek';
    }

    // 2週間前
    if (timestamp >= twoWeeksStart && timestamp < lastWeekStart) {
        return 'relative:twoWeeksAgo';
    }

    // それ以降は既存ロジック
    return null;
}

/**
 * ファイルのグループキーを取得
 */
function getGroupKey(
    file: MediaFile,
    groupBy: GroupBy,
    boundaries?: ReturnType<typeof getDateBoundaries>,
    dateGroupingMode: DateGroupingMode = 'auto'
): string {
    switch (groupBy) {
        case 'date': {
            // Phase 21-A: 相対時間区分を優先
            if (boundaries) {
                const relativeGroup = getRelativeTimeGroup(file.createdAt, boundaries);
                if (relativeGroup) {
                    return relativeGroup;
                }
            }

            if (dateGroupingMode === 'week') {
                return getWeekGroupKey(file.createdAt);
            }

            // 既存ロジック（年/月）
            const date = new Date(file.createdAt);
            return `month:${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        case 'size': {
            for (const range of SIZE_RANGES) {
                if (file.size >= range.min) {
                    return range.key;
                }
            }
            return SIZE_RANGES[SIZE_RANGES.length - 1]?.key || 'small';
        }
        case 'type':
            return file.type;
        default:
            return 'all';
    }
}

/**
 * グループキーからラベルを取得
 */
function getGroupLabel(key: string, groupBy: GroupBy): string {
    // Phase 21-A: 相対時間区分
    if (key.startsWith('relative:')) {
        const relativeType = key.split(':')[1];
        switch (relativeType) {
            case 'today': return '今日';
            case 'yesterday': return '昨日';
            case 'thisWeek': return '今週';
            case 'lastWeek': return '先週';
            case 'twoWeeksAgo': return '2週間前';
        }
    }

    switch (groupBy) {
        case 'date': {
            if (key.startsWith('week:')) {
                const [year, month, day] = key.substring(5).split('-').map((value) => parseInt(value ?? '0', 10));
                const weekStart = new Date(year, Math.max(0, month - 1), day);
                return formatWeekGroupLabel(weekStart);
            }

            // 既存ロジック（年/月）
            if (key.startsWith('month:')) {
                const monthKey = key.substring(6); // "month:" を除去
                const [year, month] = monthKey.split('-');
                const monthNum = month ? parseInt(month, 10) : 1;
                return `${year}年${monthNum}月`;
            }
            return key;
        }
        case 'size': {
            const range = SIZE_RANGES.find(r => r.key === key);
            return range?.label || key;
        }
        case 'type': {
            const typeInfo = TYPE_LABELS[key];
            return typeInfo?.label || key;
        }
        default:
            return '';
    }
}

/**
 * グループアイコンを取得
 */
function getGroupIcon(key: string, groupBy: GroupBy): string {
    // Phase 21-A: 相対時間区分
    if (key.startsWith('relative:')) {
        return 'Calendar';
    }

    switch (groupBy) {
        case 'date':
            return 'Calendar';
        case 'size': {
            const range = SIZE_RANGES.find(r => r.key === key);
            return range?.icon || 'HardDrive';
        }
        case 'type': {
            const typeInfo = TYPE_LABELS[key];
            return typeInfo?.icon || 'File';
        }
        default:
            return '';
    }
}

/**
 * ファイルをソート
 */
function sortFiles(
    files: MediaFile[],
    sortBy: 'name' | 'date' | 'size' | 'type' | 'accessCount' | 'lastAccessed',
    sortOrder: 'asc' | 'desc'
): MediaFile[] {
    const sorted = [...files].sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
            case 'name':
                comparison = a.name.localeCompare(b.name);
                break;
            case 'date':
                comparison = a.createdAt - b.createdAt;
                break;
            case 'size':
                comparison = a.size - b.size;
                break;
            case 'type':
                comparison = a.type.localeCompare(b.type);
                break;
            case 'accessCount': // Phase 17: アクセス回数ソート
                comparison = (a.accessCount || 0) - (b.accessCount || 0);
                break;
            case 'lastAccessed': // Phase 17: 直近アクセスソート
                // null は常に最後に（降順・昇順どちらでも）
                if (a.lastAccessedAt === null && b.lastAccessedAt === null) {
                    comparison = 0;
                } else if (a.lastAccessedAt === null) {
                    // a が null の場合、常に a を後ろに（sortOrder の反転を後で無効化）
                    return 1;
                } else if (b.lastAccessedAt === null) {
                    // b が null の場合、常に b を後ろに（sortOrder の反転を後で無効化）
                    return -1;
                } else {
                    comparison = a.lastAccessedAt - b.lastAccessedAt;
                }
                break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
}

/**
 * グループをソート
 */
function sortGroups(groups: FileGroup[], groupBy: GroupBy): FileGroup[] {
    switch (groupBy) {
        case 'date': {
            // Phase 21-A: 相対時間区分の優先順位
            const relativeOrder = ['relative:today', 'relative:yesterday', 'relative:thisWeek', 'relative:lastWeek', 'relative:twoWeeksAgo'];
            const getDateGroupSortValue = (key: string): number => {
                if (key.startsWith('week:')) {
                    return new Date(key.substring(5)).getTime();
                }
                if (key.startsWith('month:')) {
                    return new Date(`${key.substring(6)}-01`).getTime();
                }
                return 0;
            };

            return groups.sort((a, b) => {
                const aIsRelative = a.key.startsWith('relative:');
                const bIsRelative = b.key.startsWith('relative:');

                // 両方とも相対時間区分の場合
                if (aIsRelative && bIsRelative) {
                    const aIndex = relativeOrder.indexOf(a.key);
                    const bIndex = relativeOrder.indexOf(b.key);
                    return aIndex - bIndex;
                }

                // 相対時間区分が優先
                if (aIsRelative) return -1;
                if (bIsRelative) return 1;

                return getDateGroupSortValue(b.key) - getDateGroupSortValue(a.key);
            });
        }
        case 'size':
            // SIZE_RANGES の順序に従う（大きいサイズが上）
            return groups.sort((a, b) => {
                const aIndex = SIZE_RANGES.findIndex(r => r.key === a.key);
                const bIndex = SIZE_RANGES.findIndex(r => r.key === b.key);
                return aIndex - bIndex;
            });
        case 'type':
            // 日本語順
            return groups.sort((a, b) => a.label.localeCompare(b.label, 'ja'));
        default:
            return groups;
    }
}

/**
 * ファイルをグループ化
 */
export function groupFiles(
    files: MediaFile[],
    groupBy: GroupBy,
    sortBy: 'name' | 'date' | 'size' | 'type' | 'accessCount' | 'lastAccessed',
    sortOrder: 'asc' | 'desc',
    options?: GroupFilesOptions
): FileGroup[] {
    // グループ化なしの場合
    if (groupBy === 'none') {
        const sorted = sortFiles(files, sortBy, sortOrder);
        return [{
            key: 'all',
            label: '',
            files: sorted,
            icon: ''
        }];
    }

    // Phase 21-A: date grouping の場合は日付境界を1回だけ計算
    const boundaries = groupBy === 'date' ? getDateBoundaries(options?.now) : undefined;
    const dateGroupingMode = options?.dateGroupingMode ?? 'auto';

    // グループ化
    const groupMap = new Map<string, MediaFile[]>();

    files.forEach(file => {
        const key = getGroupKey(file, groupBy, boundaries, dateGroupingMode);
        const existing = groupMap.get(key);
        if (existing) {
            existing.push(file);
            return;
        }
        groupMap.set(key, [file]);
    });

    // 各グループ内でソート
    const groups: FileGroup[] = Array.from(groupMap.entries()).map(([key, groupFiles]) => ({
        key,
        label: getGroupLabel(key, groupBy),
        files: sortFiles(groupFiles, sortBy, sortOrder),
        icon: getGroupIcon(key, groupBy)
    }));

    // 空のグループを除外
    const nonEmptyGroups = groups.filter(group => group.files.length > 0);

    // グループ自体をソート
    return sortGroups(nonEmptyGroups, groupBy);
}

/**
 * ファイルサイズをフォーマット
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
