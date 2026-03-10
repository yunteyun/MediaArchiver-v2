import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export interface BundledReleaseNotesResult {
    success: boolean;
    version: string;
    path?: string;
    content?: string;
    error?: string;
}

function getCandidatePaths(version: string): string[] {
    const filename = `v${version}.md`;
    if (app.isPackaged) {
        return [path.join(process.resourcesPath, 'release-notes', filename)];
    }

    return [
        path.join(process.cwd(), 'release-notes', filename),
        path.join(app.getAppPath(), 'release-notes', filename),
    ];
}

export async function getBundledReleaseNotes(version = app.getVersion()): Promise<BundledReleaseNotesResult> {
    const candidates = getCandidatePaths(version);

    for (const candidatePath of candidates) {
        try {
            await fs.promises.access(candidatePath, fs.constants.R_OK);
            const content = await fs.promises.readFile(candidatePath, 'utf8');
            return {
                success: true,
                version,
                path: candidatePath,
                content: content.trim(),
            };
        } catch {
            // Try next candidate path.
        }
    }

    return {
        success: false,
        version,
        error: `同梱リリースノートが見つかりませんでした: v${version}`,
    };
}
