import { useFileStore } from '../stores/useFileStore';
import { useUIStore } from '../stores/useUIStore';
import type { MediaFile } from '../types/file';

/**
 * 右パネル・フローティングプレビュー共通:
 * 中央ビューア表示中はそのファイルを、そうでなければグリッドでフォーカス中のファイルを返す。
 */
export function useActiveFile(): MediaFile | undefined {
    const focusedId = useFileStore((s) => s.focusedId);
    const fileMap = useFileStore((s) => s.fileMap);
    const lightboxFile = useUIStore((s) => s.lightboxFile);

    return lightboxFile
        ? (fileMap.get(lightboxFile.id) ?? lightboxFile)
        : (focusedId ? fileMap.get(focusedId) : undefined);
}
