import type { DisplayMode } from '../../../stores/useSettingsStore';
import { compactDisplayPreset } from './compact';
import { mangaDetailedDisplayPreset } from './mangaDetailed';
import { mangaDisplayPreset } from './manga';
import { standardLargeDisplayPreset } from './standardLarge';
import { standardDisplayPreset } from './standard';
import type { FileCardDisplayPreset } from './types';
import { videoDisplayPreset } from './video';
import { whiteBrowserDisplayPreset } from './whiteBrowser';

export const FILE_CARD_DISPLAY_PRESETS = {
    standard: standardDisplayPreset,
    standardLarge: standardLargeDisplayPreset,
    manga: mangaDisplayPreset,
    video: videoDisplayPreset,
    whiteBrowser: whiteBrowserDisplayPreset,
    mangaDetailed: mangaDetailedDisplayPreset,
    compact: compactDisplayPreset,
} satisfies Record<DisplayMode, FileCardDisplayPreset>;
