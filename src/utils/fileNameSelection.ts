export function getEditableNameSelectionRange(fileName: string): { start: number; end: number } {
    if (!fileName) {
        return { start: 0, end: 0 };
    }

    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex <= 0) {
        return { start: 0, end: fileName.length };
    }

    return { start: 0, end: lastDotIndex };
}
