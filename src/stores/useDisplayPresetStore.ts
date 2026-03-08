import { create } from 'zustand';
import { resolveExternalDisplayPresets, type ExternalDisplayPresetManifest, type ResolvedFileCardDisplayPreset } from '../components/fileCard/displayModes';

interface DisplayPresetState {
    presets: ResolvedFileCardDisplayPreset[];
    directory: string | null;
    warnings: string[];
    isLoaded: boolean;
    isLoading: boolean;
    loadDisplayPresets: (options?: { force?: boolean }) => Promise<void>;
}

export const useDisplayPresetStore = create<DisplayPresetState>((set, get) => ({
    presets: [],
    directory: null,
    warnings: [],
    isLoaded: false,
    isLoading: false,

    loadDisplayPresets: async (options) => {
        const { isLoaded, isLoading } = get();
        if ((isLoaded && !options?.force) || isLoading) return;

        set({ isLoading: true });
        try {
            const result = await window.electronAPI.getDisplayPresets();
            const manifests = Array.isArray(result.presets)
                ? result.presets as ExternalDisplayPresetManifest[]
                : [];
            const resolved = resolveExternalDisplayPresets(manifests);
            if (Array.isArray(result.warnings)) {
                result.warnings.forEach((warning) => console.warn('[displayPreset]', warning));
            }
            set({
                presets: resolved,
                directory: result.directory,
                warnings: Array.isArray(result.warnings) ? result.warnings : [],
                isLoaded: true,
            });
        } catch (error) {
            console.error('Failed to load display presets:', error);
            set({
                presets: [],
                directory: null,
                warnings: ['表示プリセットの読み込みに失敗しました。'],
                isLoaded: false,
            });
        } finally {
            set({ isLoading: false });
        }
    },
}));
