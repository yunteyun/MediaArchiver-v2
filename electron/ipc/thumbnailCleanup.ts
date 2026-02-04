/**
 * Thumbnail Cleanup IPC Handlers
 */

import { ipcMain } from 'electron';
import { diagnoseThumbnails } from '../services/thumbnailCleanupService';
import { dbManager } from '../services/databaseManager';
import { logger } from '../services/logger';

const log = logger.scope('ThumbnailCleanupIPC');

export function registerThumbnailCleanupHandlers() {
    ipcMain.handle('thumbnail:diagnose', async () => {
        try {
            const profileId = dbManager.getCurrentProfileId();
            if (!profileId) {
                throw new Error('No active profile');
            }
            log.info(`Diagnosing thumbnails for profile: ${profileId}`);
            return await diagnoseThumbnails(profileId);
        } catch (error: any) {
            log.error('Failed to diagnose thumbnails:', error);
            throw error;
        }
    });
}
