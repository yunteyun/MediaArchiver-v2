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
 * ファイルのグループキーを取得
 */
function getGroupKey(file: MediaFile, groupBy: GroupBy): string {
    switch (groupBy) {
        case 'date': {
            const date = new Date(file.createdAt);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
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
    switch (groupBy) {
        case 'date': {
            const [year, month] = key.split('-');
            const monthNum = month ? parseInt(month, 10) : 1;
            return `${year}年${monthNum}月`;
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
    sortBy: 'name' | 'date' | 'size' | 'type',
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
        case 'date':
            // 新しい月が上
            return groups.sort((a, b) => b.key.localeCompare(a.key));
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
    sortBy: 'name' | 'date' | 'size' | 'type',
    sortOrder: 'asc' | 'desc'
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

    // グループ化
    const groupMap = new Map<string, MediaFile[]>();

    files.forEach(file => {
        const key = getGroupKey(file, groupBy);
        const existing = groupMap.get(key) || [];
        groupMap.set(key, [...existing, file]);
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
