export const LIGHTBOX_OVERLAY_OPACITY_DEFAULT = 96;
export const LIGHTBOX_OVERLAY_OPACITY_MIN = 70;
export const LIGHTBOX_OVERLAY_OPACITY_MAX = 100;
export const LIGHTBOX_OVERLAY_OPACITY_STEP = 1;

export const LIGHTBOX_SHELL_MAX_WIDTH_PX = 1680;
export const LIGHTBOX_SHELL_VIEWPORT_MARGIN_PX = 24;
export const LIGHTBOX_SHELL_MAX_HEIGHT_VH = 88;
export const LIGHTBOX_INFO_PANE_WIDTH_PX = 320;
export const LIGHTBOX_INFO_PANE_WIDTH_XL_PX = 352;
export const LIGHTBOX_MEDIA_MAX_HEIGHT_VH = 74;
export const LIGHTBOX_ARCHIVE_PREVIEW_LIMIT = 12;

export function clampOverlayOpacity(value: number): number {
    const numeric = Number.isFinite(value) ? value : LIGHTBOX_OVERLAY_OPACITY_DEFAULT;
    const rounded = Math.round(numeric);
    return Math.max(LIGHTBOX_OVERLAY_OPACITY_MIN, Math.min(LIGHTBOX_OVERLAY_OPACITY_MAX, rounded));
}
