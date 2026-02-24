import { ipcMain, dialog } from 'electron';
import { writeFile } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';

export function registerDialogHandlers() {
    ipcMain.handle('dialog:selectFolder', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory']
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }
        return result.filePaths[0];
    });

    ipcMain.handle('dialog:saveTextFile', async (_event, options: {
        title?: string;
        defaultPath?: string;
        filters?: Array<{ name: string; extensions: string[] }>;
        content: string;
    }) => {
        const result = await dialog.showSaveDialog({
            title: options.title,
            defaultPath: options.defaultPath,
            filters: options.filters,
        });

        if (result.canceled || !result.filePath) {
            return { canceled: true as const };
        }

        await writeFile(result.filePath, options.content, 'utf-8');
        return { canceled: false as const, filePath: result.filePath };
    });

    ipcMain.handle('dialog:openTextFile', async (_event, options?: {
        title?: string;
        filters?: Array<{ name: string; extensions: string[] }>;
    }) => {
        const result = await dialog.showOpenDialog({
            title: options?.title,
            properties: ['openFile'],
            filters: options?.filters ?? [
                { name: 'CSV Files', extensions: ['csv'] },
                { name: 'Text Files', extensions: ['txt'] },
                { name: 'All Files', extensions: ['*'] },
            ],
        });

        if (result.canceled || result.filePaths.length === 0) {
            return { canceled: true as const };
        }

        const filePath = result.filePaths[0]!;
        const content = await readFile(filePath, 'utf-8');
        return { canceled: false as const, filePath, content };
    });

    ipcMain.handle('dialog:openBinaryFile', async (_event, options?: {
        title?: string;
        filters?: Array<{ name: string; extensions: string[] }>;
    }) => {
        const result = await dialog.showOpenDialog({
            title: options?.title,
            properties: ['openFile'],
            filters: options?.filters ?? [
                { name: 'CSV Files', extensions: ['csv'] },
                { name: 'All Files', extensions: ['*'] },
            ],
        });

        if (result.canceled || result.filePaths.length === 0) {
            return { canceled: true as const };
        }

        const filePath = result.filePaths[0]!;
        const bytes = await readFile(filePath);
        return { canceled: false as const, filePath, bytes: Uint8Array.from(bytes) };
    });
}
