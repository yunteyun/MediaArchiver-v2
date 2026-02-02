/**
 * useProfileStore - プロファイル管理ストア
 */

import { create } from 'zustand';

export interface Profile {
    id: string;
    name: string;
    dbFilename: string;
    createdAt: number;
    updatedAt: number;
}

interface ProfileState {
    profiles: Profile[];
    activeProfileId: string;
    isLoading: boolean;
    // アクション
    loadProfiles: () => Promise<void>;
    createProfile: (name: string) => Promise<Profile>;
    updateProfile: (id: string, updates: { name?: string }) => Promise<void>;
    deleteProfile: (id: string) => Promise<boolean>;
    switchProfile: (id: string) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
    profiles: [],
    activeProfileId: 'default',
    isLoading: false,

    loadProfiles: async () => {
        set({ isLoading: true });
        try {
            const [profiles, activeId] = await Promise.all([
                window.electronAPI.getProfiles(),
                window.electronAPI.getActiveProfileId()
            ]);
            set({
                profiles,
                activeProfileId: activeId,
                isLoading: false
            });
        } catch (error) {
            console.error('Failed to load profiles:', error);
            set({ isLoading: false });
        }
    },

    createProfile: async (name: string) => {
        const profile = await window.electronAPI.createProfile(name);
        set((state) => ({
            profiles: [...state.profiles, profile]
        }));
        return profile;
    },

    updateProfile: async (id: string, updates: { name?: string }) => {
        await window.electronAPI.updateProfile(id, updates);
        set((state) => ({
            profiles: state.profiles.map(p =>
                p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
            )
        }));
    },

    deleteProfile: async (id: string) => {
        if (id === 'default') {
            console.error('Cannot delete default profile');
            return false;
        }
        const result = await window.electronAPI.deleteProfile(id);
        if (result) {
            set((state) => ({
                profiles: state.profiles.filter(p => p.id !== id)
            }));
        }
        return result;
    },

    switchProfile: async (id: string) => {
        if (get().activeProfileId === id) return;

        set({ isLoading: true });
        try {
            await window.electronAPI.switchProfile(id);
            set({
                activeProfileId: id,
                isLoading: false
            });
        } catch (error) {
            console.error('Failed to switch profile:', error);
            set({ isLoading: false });
        }
    }
}));
