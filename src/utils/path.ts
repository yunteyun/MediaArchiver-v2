/**
 * Path utilities for UI display
 * 
 * UI表示専用（検索・ソート・DB用途では使用しない）
 */

/**
 * ファイルパスから表示用のフォルダ名を取得
 * 
 * UI表示専用（検索・ソート・DB用途では使用しない）
 * 将来的な拡張（UNC/仮想プロトコル/2階層表示等）に対応しやすいよう、責務を分離
 * 
 * @param path ファイルパス
 * @returns フォルダ名（ドライブ名 + 最後のフォルダ名のみ）
 */
export const getDisplayFolderName = (path: string): string => {
    const parts = path.split(/[/\\]/);
    return parts.length > 1 ? (parts[parts.length - 2] ?? '') : '';
};
