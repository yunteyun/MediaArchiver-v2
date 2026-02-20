/**
 * Rating IPC Handler - 評価軸関連の IPC 通信
 * Phase 26-B2
 */

import { ipcMain } from 'electron';
import {
    getAllAxes,
    createAxis,
    updateAxis,
    deleteAxis,
    getFileRatings,
    setFileRating,
    removeFileRating,
    getAllFileRatings,
    getRatingDistribution,
    initDefaultAxes,
} from '../services/ratingService';

export function registerRatingHandlers(): void {
    // Initialize default axes on first run
    initDefaultAxes();

    // === Axis Operations ===
    ipcMain.handle('rating:getAllAxes', async () => {
        return getAllAxes();
    });

    ipcMain.handle('rating:createAxis', async (_event, {
        name, minValue, maxValue, step
    }: { name: string; minValue?: number; maxValue?: number; step?: number }) => {
        return createAxis(name, minValue, maxValue, step, false);
    });

    ipcMain.handle('rating:updateAxis', async (_event, {
        id, name, minValue, maxValue, step, sortOrder
    }: { id: string; name?: string; minValue?: number; maxValue?: number; step?: number; sortOrder?: number }) => {
        return updateAxis(id, { name, minValue, maxValue, step, sortOrder });
    });

    ipcMain.handle('rating:deleteAxis', async (_event, { id }: { id: string }) => {
        return deleteAxis(id);
    });

    // === File Rating Operations ===
    ipcMain.handle('rating:getFileRatings', async (_event, { fileId }: { fileId: string }) => {
        return getFileRatings(fileId);
    });

    ipcMain.handle('rating:setFileRating', async (_event, {
        fileId, axisId, value
    }: { fileId: string; axisId: string; value: number }) => {
        setFileRating(fileId, axisId, value);
        return { success: true };
    });

    ipcMain.handle('rating:removeFileRating', async (_event, {
        fileId, axisId
    }: { fileId: string; axisId: string }) => {
        removeFileRating(fileId, axisId);
        return { success: true };
    });

    ipcMain.handle('rating:getAllFileRatings', async () => {
        return getAllFileRatings();
    });

    ipcMain.handle('rating:getDistribution', async (_event, { axisId }: { axisId: string }) => {
        return getRatingDistribution(axisId);
    });
}
