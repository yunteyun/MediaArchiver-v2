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

function normalizeDisplayVersion(version: string): string {
    return version.trim().replace(/^v/i, '').replace(/-d/i, 'd');
}

function getCandidatePaths(version: string): string[] {
    const normalizedVersion = normalizeDisplayVersion(version);
    const filenames = Array.from(new Set([
        `v${version}.md`,
        `v${normalizedVersion}.md`,
    ]));
    if (app.isPackaged) {
        return filenames.map((filename) => path.join(process.resourcesPath, 'release-notes', filename));
    }

    return filenames.flatMap((filename) => ([
        path.join(process.cwd(), 'release-notes', filename),
        path.join(app.getAppPath(), 'release-notes', filename),
    ]));
}

export async function getBundledReleaseNotes(version = app.getVersion()): Promise<BundledReleaseNotesResult> {
    const candidates = getCandidatePaths(version);
    const displayVersion = normalizeDisplayVersion(version);

    for (const candidatePath of candidates) {
        try {
            await fs.promises.access(candidatePath, fs.constants.R_OK);
            const content = await fs.promises.readFile(candidatePath, 'utf8');
            return {
                success: true,
                version: displayVersion,
                path: candidatePath,
                content: content.trim(),
            };
        } catch {
            // Try next candidate path.
        }
    }

    return {
        success: false,
        version: displayVersion,
        error: `同梱リリースノートが見つかりませんでした: v${displayVersion}`,
    };
}
