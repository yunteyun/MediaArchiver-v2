import { useState, useEffect } from 'react';

const MAX_VISIBLE_ANIMATED_PREVIEWS = 2;

const activeVisibleAnimatedPreviewIds = new Set<string>();
const visibleAnimatedPreviewListeners = new Set<() => void>();

function notifyVisibleAnimatedPreviewListeners() {
    for (const listener of visibleAnimatedPreviewListeners) {
        listener();
    }
}

function subscribeVisibleAnimatedPreviewSlots(listener: () => void) {
    visibleAnimatedPreviewListeners.add(listener);
    return () => {
        visibleAnimatedPreviewListeners.delete(listener);
    };
}

function requestVisibleAnimatedPreviewSlot(fileId: string): boolean {
    if (activeVisibleAnimatedPreviewIds.has(fileId)) return true;
    if (activeVisibleAnimatedPreviewIds.size >= MAX_VISIBLE_ANIMATED_PREVIEWS) return false;
    activeVisibleAnimatedPreviewIds.add(fileId);
    notifyVisibleAnimatedPreviewListeners();
    return true;
}

function releaseVisibleAnimatedPreviewSlot(fileId: string) {
    if (!activeVisibleAnimatedPreviewIds.delete(fileId)) return;
    notifyVisibleAnimatedPreviewListeners();
}

type UseAnimatedPreviewSlotsParams = {
    fileId: string;
    isAnimatedImage: boolean;
    animatedImagePreviewMode: 'hover' | 'visible' | 'disabled';
    performanceMode: boolean;
    isThumbnailVisible: boolean;
};

export function useAnimatedPreviewSlots({
    fileId,
    isAnimatedImage,
    animatedImagePreviewMode,
    performanceMode,
    isThumbnailVisible,
}: UseAnimatedPreviewSlotsParams) {
    const [visibleAnimatedPreviewVersion, setVisibleAnimatedPreviewVersion] = useState(0);
    const [isVisibleAnimatedPreviewActive, setIsVisibleAnimatedPreviewActive] = useState(false);

    useEffect(() => {
        if (animatedImagePreviewMode !== 'visible') {
            setIsVisibleAnimatedPreviewActive(false);
            return;
        }
        return subscribeVisibleAnimatedPreviewSlots(() => {
            setVisibleAnimatedPreviewVersion((prev) => prev + 1);
        });
    }, [animatedImagePreviewMode]);

    useEffect(() => {
        const shouldUseVisibleAnimatedPreview =
            isAnimatedImage &&
            animatedImagePreviewMode === 'visible' &&
            !performanceMode &&
            isThumbnailVisible;

        if (!shouldUseVisibleAnimatedPreview) {
            releaseVisibleAnimatedPreviewSlot(fileId);
            setIsVisibleAnimatedPreviewActive(false);
            return;
        }

        const acquired = requestVisibleAnimatedPreviewSlot(fileId);
        setIsVisibleAnimatedPreviewActive(acquired);
    }, [
        fileId,
        isAnimatedImage,
        animatedImagePreviewMode,
        performanceMode,
        isThumbnailVisible,
        visibleAnimatedPreviewVersion,
    ]);

    useEffect(() => {
        return () => {
            releaseVisibleAnimatedPreviewSlot(fileId);
        };
    }, [fileId]);

    return { isVisibleAnimatedPreviewActive };
}
