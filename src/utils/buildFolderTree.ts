import type { MediaFolder } from '../types/file';

/**
 * フォルダツリーノード（Phase 22-A）
 */
export interface FolderTreeNode {
    id: string;
    name: string;
    path: string;
    createdAt: number;
    drive: string;        // path から抽出
    depth: number;        // 算出値
    children: FolderTreeNode[];
}

/**
 * path から親パスを取得
 */
function getParentPath(path: string): string {
    const parts = path.split('\\');
    if (parts.length <= 1) return '';
    parts.pop();
    return parts.join('\\');
}

/**
 * drive を抽出（Windows: "C:", Unix: "/"）
 */
function extractDrive(path: string): string {
    if (path.match(/^[A-Z]:/i)) {
        return path.substring(0, 2).toUpperCase();
    }
    return '/';
}

/**
 * フラットなフォルダリストから階層ツリーを構築
 * Phase 22-A: pathベース疑似ツリー（DB変更なし）
 */
export function buildFolderTree(folders: MediaFolder[]): FolderTreeNode[] {
    // 1. drive を path から抽出
    const nodesWithDrive: FolderTreeNode[] = folders.map(folder => ({
        ...folder,
        drive: extractDrive(folder.path),
        depth: 0,
        children: []
    }));

    // 2. path の階層深さでソート（浅い順）
    const sorted = nodesWithDrive.sort((a, b) => {
        const aDepth = a.path.split('\\').length;
        const bDepth = b.path.split('\\').length;
        if (aDepth !== bDepth) {
            return aDepth - bDepth;
        }
        // 同じ深さの場合はpath順
        return a.path.localeCompare(b.path);
    });

    // 3. 親子関係を path ベースで構築
    const nodeMap = new Map<string, FolderTreeNode>();
    const roots: FolderTreeNode[] = [];

    sorted.forEach(node => {
        nodeMap.set(node.path, node);

        // 親を path から探す
        const parentPath = getParentPath(node.path);
        const parent = parentPath ? nodeMap.get(parentPath) : null;

        if (parent) {
            node.depth = parent.depth + 1;
            parent.children.push(node);
        } else {
            node.depth = 0;
            roots.push(node);
        }
    });

    return roots;
}

/**
 * ドライブ別にグループ化（Phase 22-B）
 */
export function buildFolderTreeByDrive(folders: MediaFolder[]): Map<string, FolderTreeNode[]> {
    const tree = buildFolderTree(folders);
    const driveMap = new Map<string, FolderTreeNode[]>();

    tree.forEach(node => {
        const drive = node.drive;
        if (!driveMap.has(drive)) {
            driveMap.set(drive, []);
        }
        driveMap.get(drive)!.push(node);
    });

    // ドライブ名でソート（C:, D:, ...）
    return new Map([...driveMap.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}
