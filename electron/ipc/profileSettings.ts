import { ipcMain } from 'electron';
import {
    getProfileScopedSettings,
    setProfileScopedSettings,
    replaceProfileScopedSettings,
    type ProfileScopedSettingsV1,
} from '../services/profileSettingsService';

export function registerProfileSettingsHandlers() {
    ipcMain.handle('profileSettings:get', async () => {
        return getProfileScopedSettings();
    });

    ipcMain.handle('profileSettings:set', async (_event, partial: Partial<ProfileScopedSettingsV1>) => {
        return setProfileScopedSettings(partial || {});
    });

    ipcMain.handle('profileSettings:replace', async (_event, settings: ProfileScopedSettingsV1) => {
        return replaceProfileScopedSettings(settings);
    });
}
