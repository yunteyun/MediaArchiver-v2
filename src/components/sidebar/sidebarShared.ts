import type { MediaFolder } from '../../types/file';

export const ALL_FILES_ID = '__all__';
export const DRIVE_PREFIX = '__drive:';
export const FOLDER_PREFIX = '__folder:';
export const VIRTUAL_FOLDER_PREFIX = '__vfolder:';
export const VIRTUAL_FOLDER_RECURSIVE_PREFIX = '__vfolderr:';

export function normalizeSidebarSelection(selection: string | null | undefined): string {
    if (!selection) return ALL_FILES_ID;
    return selection;
}

export function buildFolderSelectionValue(folder: MediaFolder, hasChildren: boolean): string {
    if (folder.isVirtualFolder) {
        return hasChildren ? `${VIRTUAL_FOLDER_RECURSIVE_PREFIX}${folder.path}` : `${VIRTUAL_FOLDER_PREFIX}${folder.path}`;
    }
    return hasChildren ? `${FOLDER_PREFIX}${folder.id}` : folder.id;
}

export function resolveSidebarSelectionLabel(selection: string, folders: MediaFolder[]): string {
    if (selection === ALL_FILES_ID) return 'すべてのファイル';

    if (selection.startsWith(DRIVE_PREFIX)) {
        return `${selection.slice(DRIVE_PREFIX.length)} ドライブ`;
    }

    if (selection.startsWith(FOLDER_PREFIX)) {
        const folderId = selection.slice(FOLDER_PREFIX.length);
        const folder = folders.find((item) => item.id === folderId);
        return folder ? `${folder.name} (配下)` : '登録フォルダ (配下)';
    }

    if (selection.startsWith(VIRTUAL_FOLDER_RECURSIVE_PREFIX)) {
        const folderPath = selection.slice(VIRTUAL_FOLDER_RECURSIVE_PREFIX.length);
        const name = folderPath.split(/[\\/]/).filter(Boolean).pop() ?? folderPath;
        return `${name} (配下)`;
    }

    if (selection.startsWith(VIRTUAL_FOLDER_PREFIX)) {
        const folderPath = selection.slice(VIRTUAL_FOLDER_PREFIX.length);
        return folderPath.split(/[\\/]/).filter(Boolean).pop() ?? folderPath;
    }

    const folder = folders.find((item) => item.id === selection);
    return folder?.name ?? selection;
}
