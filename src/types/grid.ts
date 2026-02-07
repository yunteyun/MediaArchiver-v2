import type { MediaFile, MediaFolder } from './file';

/**
 * FileGridで表示する統合アイテム型
 * フォルダとファイルを統合的に扱い、将来のソート拡張に対応
 */
export type GridItem =
    | { type: 'folder'; folder: MediaFolder; thumbnailPath?: string; fileCount: number }
    | { type: 'file'; file: MediaFile };
