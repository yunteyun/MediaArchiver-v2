import type { MediaFile } from '../types/file';

export const AUTO_ORGANIZE_RENAME_TOKENS = ['{name}', '{folder}', '{type}'] as const;

export interface AutoOrganizeRenameContext {
    currentFileName: string;
    currentBaseName: string;
    sourceFolderName: string;
    fileType: MediaFile['type'];
}

export interface AutoOrganizeRenamePreview {
    fileName: string;
    baseName: string;
}

function splitPathSegments(filePath: string): string[] {
    return filePath
        .replace(/[\\/]+/g, '/')
        .split('/')
        .filter((segment) => segment.length > 0);
}

function getFileNameFromPath(filePath: string): string {
    const segments = splitPathSegments(filePath);
    return segments[segments.length - 1] ?? filePath;
}

function getFolderNameFromPath(filePath: string): string {
    const segments = splitPathSegments(filePath);
    return segments.length >= 2 ? segments[segments.length - 2] : '';
}

function getExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex <= 0) return '';
    return fileName.slice(lastDotIndex);
}

export function buildAutoOrganizeRenameContext(file: Pick<MediaFile, 'name' | 'path' | 'type'>): AutoOrganizeRenameContext {
    const currentFileName = file.name || getFileNameFromPath(file.path);
    const extension = getExtension(currentFileName);
    const currentBaseName = extension ? currentFileName.slice(0, -extension.length) : currentFileName;

    return {
        currentFileName,
        currentBaseName,
        sourceFolderName: getFolderNameFromPath(file.path),
        fileType: file.type,
    };
}

export function renderAutoOrganizeRenameBaseName(
    template: string,
    context: AutoOrganizeRenameContext
): string {
    return template
        .replaceAll('{name}', context.currentBaseName)
        .replaceAll('{folder}', context.sourceFolderName)
        .replaceAll('{type}', context.fileType)
        .replace(/\s+/g, ' ')
        .trim();
}

export function buildAutoOrganizeRenamePreview(
    file: Pick<MediaFile, 'name' | 'path' | 'type'>,
    template: string
): AutoOrganizeRenamePreview {
    const context = buildAutoOrganizeRenameContext(file);
    const extension = getExtension(context.currentFileName);
    let baseName = renderAutoOrganizeRenameBaseName(template, context);

    if (extension && baseName.toLowerCase().endsWith(extension.toLowerCase())) {
        baseName = baseName.slice(0, -extension.length).trimEnd();
    }

    return {
        baseName,
        fileName: `${baseName}${extension}`,
    };
}
