import { ipcMain } from 'electron';
import {
    applyAutoOrganize,
    applyAutoOrganizeRollback,
    createAutoOrganizeRule,
    deleteAutoOrganizeRule,
    dryRunAutoOrganize,
    dryRunAutoOrganizeRollback,
    getAllAutoOrganizeRules,
    getAutoOrganizeRuns,
    getAutoOrganizeSettings,
    updateAutoOrganizeRule,
    updateAutoOrganizeSettings,
} from '../services/autoOrganizeService';
import { logger } from '../services/logger';

const log = logger.scope('AutoOrganizeIPC');

export function registerAutoOrganizeHandlers(): void {
    ipcMain.handle('autoOrganize:getAll', async () => {
        return getAllAutoOrganizeRules();
    });

    ipcMain.handle('autoOrganize:getSettings', async () => {
        return getAutoOrganizeSettings();
    });

    ipcMain.handle('autoOrganize:updateSettings', async (_event, updates) => {
        return updateAutoOrganizeSettings(updates || {});
    });

    ipcMain.handle('autoOrganize:getRuns', async (_event, limit?: number) => {
        return getAutoOrganizeRuns(limit);
    });

    ipcMain.handle('autoOrganize:create', async (_event, payload: {
        name: string;
        enabled?: boolean;
        condition?: unknown;
        action?: unknown;
        automation?: unknown;
    }) => {
        try {
            return createAutoOrganizeRule(payload);
        } catch (error) {
            log.error('autoOrganize:create failed:', error);
            throw error;
        }
    });

    ipcMain.handle('autoOrganize:update', async (_event, payload: {
        id: string;
        updates: {
            name?: string;
            enabled?: boolean;
            condition?: unknown;
            action?: unknown;
            automation?: unknown;
            sortOrder?: number;
        };
    }) => {
        try {
            return updateAutoOrganizeRule(payload);
        } catch (error) {
            log.error('autoOrganize:update failed:', error);
            throw error;
        }
    });

    ipcMain.handle('autoOrganize:delete', async (_event, id: string) => {
        return deleteAutoOrganizeRule(id);
    });

    ipcMain.handle('autoOrganize:dryRun', async (_event, ruleIds?: string[]) => {
        return dryRunAutoOrganize(ruleIds);
    });

    ipcMain.handle('autoOrganize:apply', async (_event, ruleIds?: string[]) => {
        return applyAutoOrganize(ruleIds);
    });

    ipcMain.handle('autoOrganize:rollbackDryRun', async (_event, runId: string) => {
        return dryRunAutoOrganizeRollback(runId);
    });

    ipcMain.handle('autoOrganize:rollbackApply', async (_event, runId: string) => {
        return applyAutoOrganizeRollback(runId);
    });
}
