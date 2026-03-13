import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { collectExistingFolderTreePaths } from '../folderTreePaths';

const tempRoots: string[] = [];

function createTempRoot(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-folder-tree-'));
    tempRoots.push(root);
    return root;
}

describe('folderTreePaths', () => {
    afterEach(() => {
        while (tempRoots.length > 0) {
            const root = tempRoots.pop();
            if (!root) continue;
            fs.rmSync(root, { recursive: true, force: true });
        }
    });

    it('collects empty descendant directories under registered roots', () => {
        const root = createTempRoot();
        const child = path.join(root, 'child');
        const grandChild = path.join(child, 'grand-child');
        fs.mkdirSync(grandChild, { recursive: true });
        fs.writeFileSync(path.join(root, 'sample.txt'), 'ok', 'utf8');

        const paths = collectExistingFolderTreePaths([root]);
        const normalized = new Set(paths.map((folderPath) => path.normalize(folderPath)));

        expect(normalized.has(path.normalize(root))).toBe(true);
        expect(normalized.has(path.normalize(child))).toBe(true);
        expect(normalized.has(path.normalize(grandChild))).toBe(true);
    });
});
