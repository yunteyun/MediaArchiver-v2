/**
 * Tag IPC Handler - タグ関連の IPC 通信
 */

import { ipcMain } from 'electron';
import {
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getAllTags,
    createTag,
    updateTag,
    deleteTag,
    addTagToFile,
    removeTagFromFile,
    getFileTags,
    getFileTagIds,
    getFilesByTagIds,
    getAllFileTagIds,
    initDefaultTags
} from '../services/tagService';

export function registerTagHandlers(): void {
    // Initialize default tags on first run
    initDefaultTags();

    // === Category Operations ===
    ipcMain.handle('tag:getCategories', async () => {
        return getAllCategories();
    });

    ipcMain.handle('tag:createCategory', async (_event, { name, color }: { name: string; color?: string }) => {
        return createCategory(name, color);
    });

    ipcMain.handle('tag:updateCategory', async (_event, { id, name, color, sortOrder }: { id: string; name?: string; color?: string; sortOrder?: number }) => {
        return updateCategory(id, { name, color, sortOrder });
    });

    ipcMain.handle('tag:deleteCategory', async (_event, { id }: { id: string }) => {
        deleteCategory(id);
        return { success: true };
    });

    // === Tag Definition Operations ===
    ipcMain.handle('tag:getAll', async () => {
        return getAllTags();
    });

    ipcMain.handle('tag:create', async (_event, { name, color, categoryId, icon, description }: { name: string; color?: string; categoryId?: string; icon?: string; description?: string }) => {
        return createTag(name, color, categoryId || null, icon, description);
    });

    ipcMain.handle('tag:update', async (_event, { id, name, color, categoryId, sortOrder, icon, description }: { id: string; name?: string; color?: string; categoryId?: string | null; sortOrder?: number; icon?: string; description?: string }) => {
        return updateTag(id, { name, color, categoryId, sortOrder, icon, description });
    });

    ipcMain.handle('tag:delete', async (_event, { id }: { id: string }) => {
        deleteTag(id);
        return { success: true };
    });

    // === File-Tag Operations ===
    ipcMain.handle('tag:addToFile', async (_event, { fileId, tagId }: { fileId: string; tagId: string }) => {
        addTagToFile(fileId, tagId);
        return { success: true };
    });

    ipcMain.handle('tag:removeFromFile', async (_event, { fileId, tagId }: { fileId: string; tagId: string }) => {
        removeTagFromFile(fileId, tagId);
        return { success: true };
    });

    ipcMain.handle('tag:getFileTags', async (_event, { fileId }: { fileId: string }) => {
        return getFileTags(fileId);
    });

    ipcMain.handle('tag:getFileTagIds', async (_event, { fileId }: { fileId: string }) => {
        return getFileTagIds(fileId);
    });

    ipcMain.handle('tag:getFilesByTags', async (_event, { tagIds, mode }: { tagIds: string[]; mode?: 'AND' | 'OR' }) => {
        return getFilesByTagIds(tagIds, mode);
    });

    // 一括取得API（パフォーマンス最適化）
    ipcMain.handle('tag:getAllFileTagIds', async () => {
        return getAllFileTagIds();
    });
}
