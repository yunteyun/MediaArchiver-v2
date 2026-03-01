export const VIDEO_PREVIEW_SAFE_MARGIN_RATIO = 0.1;
export const VIDEO_PREVIEW_SEQUENTIAL_SEGMENTS = 5;
export const VIDEO_PREVIEW_SEQUENTIAL_MIN_DURATION = 8;

export function getRandomSafeTime(duration: number, currentTime?: number): number {
    const safeStart = duration * VIDEO_PREVIEW_SAFE_MARGIN_RATIO;
    const safeEnd = duration * (1 - VIDEO_PREVIEW_SAFE_MARGIN_RATIO);
    let nextTime = safeStart + Math.random() * (safeEnd - safeStart);

    if (currentTime !== undefined) {
        const minGap = duration * 0.1;
        if (Math.abs(nextTime - currentTime) < minGap) {
            nextTime = safeStart + Math.random() * (safeEnd - safeStart);
        }
    }

    return nextTime;
}

export function getSequentialPreviewTime(duration: number, segmentIndex: number): number {
    const safeStart = duration * VIDEO_PREVIEW_SAFE_MARGIN_RATIO;
    const safeEnd = duration * (1 - VIDEO_PREVIEW_SAFE_MARGIN_RATIO);
    const segmentDuration = (safeEnd - safeStart) / VIDEO_PREVIEW_SEQUENTIAL_SEGMENTS;
    return safeStart + (segmentIndex * segmentDuration);
}

export function shouldFallbackSequentialPreview(duration: number): boolean {
    return duration < VIDEO_PREVIEW_SEQUENTIAL_MIN_DURATION;
}
