/**
 * Rating Store - 評価軸の状態管理
 * Phase 26-B3
 * 
 * キャッシュ構造:
 *   axes: RatingAxis[]
 *   fileRatings: Record<fileId, Record<axisId, number>>
 */

import { create } from 'zustand';

export interface RatingAxis {
    id: string;
    name: string;
    minValue: number;
    maxValue: number;
    step: number;
    isSystem: boolean;
    sortOrder: number;
    createdAt: number;
}

interface RatingState {
    // State
    axes: RatingAxis[];
    fileRatings: Record<string, Record<string, number>>;
    isLoaded: boolean;
    /** 評価フィルター: axisId → { min?, max? } */
    ratingFilter: Record<string, { min?: number; max?: number }>;

    // Actions
    loadAxes: () => Promise<void>;
    loadAllFileRatings: () => Promise<void>;
    createAxis: (name: string, minValue?: number, maxValue?: number, step?: number) => Promise<RatingAxis>;
    updateAxis: (id: string, updates: { name?: string; minValue?: number; maxValue?: number; step?: number; sortOrder?: number }) => Promise<void>;
    deleteAxis: (id: string) => Promise<{ success: boolean; reason?: string }>;
    setFileRating: (fileId: string, axisId: string, value: number) => Promise<void>;
    removeFileRating: (fileId: string, axisId: string) => Promise<void>;
    loadFileRatings: (fileId: string) => Promise<void>;
    /** 評価フィルター: 軸ごとに min/max をセット */
    setRatingFilter: (axisId: string, min?: number, max?: number) => void;
    /** 評価フィルター: 全解除 */
    clearRatingFilters: () => void;

    // Helpers
    getAxisById: (id: string) => RatingAxis | undefined;
    getFileRating: (fileId: string, axisId: string) => number | undefined;
    getOverallAxis: () => RatingAxis | undefined;
}

export const useRatingStore = create<RatingState>((set, get) => ({
    axes: [],
    fileRatings: {},
    isLoaded: false,
    ratingFilter: {},

    loadAxes: async () => {
        try {
            const axes = await window.electronAPI.getRatingAxes();
            set({ axes, isLoaded: true });
        } catch (error) {
            console.error('Failed to load rating axes:', error);
        }
    },

    loadAllFileRatings: async () => {
        try {
            const all = await window.electronAPI.getAllFileRatings();
            set({ fileRatings: all });
        } catch (error) {
            console.error('Failed to load all file ratings:', error);
        }
    },

    createAxis: async (name, minValue, maxValue, step) => {
        const newAxis = await window.electronAPI.createRatingAxis(name, minValue, maxValue, step);
        set((state) => ({ axes: [...state.axes, newAxis] }));
        return newAxis;
    },

    updateAxis: async (id, updates) => {
        await window.electronAPI.updateRatingAxis(id, updates);
        set((state) => ({
            axes: state.axes.map(axis =>
                axis.id === id ? { ...axis, ...updates } : axis
            )
        }));
    },

    deleteAxis: async (id) => {
        const result = await window.electronAPI.deleteRatingAxis(id);
        if (result.success) {
            set((state) => ({
                axes: state.axes.filter(a => a.id !== id),
                // 該当軸の評価を全ファイルから削除
                fileRatings: Object.fromEntries(
                    Object.entries(state.fileRatings).map(([fileId, ratings]) => [
                        fileId,
                        Object.fromEntries(Object.entries(ratings).filter(([axisId]) => axisId !== id))
                    ])
                )
            }));
        }
        return result;
    },

    setFileRating: async (fileId, axisId, value) => {
        await window.electronAPI.setFileRating(fileId, axisId, value);
        set((state) => ({
            fileRatings: {
                ...state.fileRatings,
                [fileId]: {
                    ...(state.fileRatings[fileId] ?? {}),
                    [axisId]: value,
                }
            }
        }));
    },

    removeFileRating: async (fileId, axisId) => {
        await window.electronAPI.removeFileRating(fileId, axisId);
        set((state) => {
            const fileEntry = { ...(state.fileRatings[fileId] ?? {}) };
            delete fileEntry[axisId];
            return {
                fileRatings: {
                    ...state.fileRatings,
                    [fileId]: fileEntry,
                }
            };
        });
    },

    // 特定ファイルの評価を遅延ロード（RightPanel表示時などにLazy取得）
    loadFileRatings: async (fileId) => {
        try {
            const ratings = await window.electronAPI.getFileRatings(fileId);
            const ratingMap: Record<string, number> = {};
            for (const r of ratings) {
                ratingMap[r.axisId] = r.value;
            }
            set((state) => ({
                fileRatings: {
                    ...state.fileRatings,
                    [fileId]: ratingMap,
                }
            }));
        } catch (error) {
            console.error('Failed to load file ratings:', error);
        }
    },

    // Helpers
    getAxisById: (id) => get().axes.find(a => a.id === id),
    getFileRating: (fileId, axisId) => get().fileRatings[fileId]?.[axisId],
    getOverallAxis: () => get().axes.find(a => a.isSystem) ?? get().axes[0],

    setRatingFilter: (axisId, min, max) =>
        set((state) => ({
            ratingFilter: {
                ...state.ratingFilter,
                [axisId]: { min, max },
            },
        })),

    clearRatingFilters: () => set({ ratingFilter: {} }),
}));
