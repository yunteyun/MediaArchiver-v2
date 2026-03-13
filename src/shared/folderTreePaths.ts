import fs from 'fs';
import path from 'path';

function normalizeFolderTreePath(folderPath: string): string {
    return path.resolve(folderPath).replace(/[\\/]+$/, '');
}

function isReadableDirectory(folderPath: string): boolean {
    try {
        return fs.statSync(folderPath).isDirectory();
    } catch {
        return false;
    }
}

export function collectExistingFolderTreePaths(rootPaths: string[]): string[] {
    const normalizedRoots = Array.from(new Set(
        rootPaths
            .filter((folderPath) => typeof folderPath === 'string' && folderPath.trim().length > 0)
            .map((folderPath) => normalizeFolderTreePath(folderPath))
    ));

    const results = new Set<string>();
    const queued = [...normalizedRoots];
    const visited = new Set<string>();

    while (queued.length > 0) {
        const currentPath = queued.pop();
        if (!currentPath) continue;

        const visitKey = currentPath.toLowerCase();
        if (visited.has(visitKey)) continue;
        visited.add(visitKey);
        results.add(currentPath);

        if (!isReadableDirectory(currentPath)) {
            continue;
        }

        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(currentPath, { withFileTypes: true });
        } catch {
            continue;
        }

        for (const entry of entries) {
            if (!entry.isDirectory() || entry.isSymbolicLink()) {
                continue;
            }

            queued.push(normalizeFolderTreePath(path.join(currentPath, entry.name)));
        }
    }

    return [...results];
}
