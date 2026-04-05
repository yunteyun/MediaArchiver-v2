import React, { useEffect, useRef, useCallback } from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useActiveFile } from '../../hooks/useActiveFile';
import { PreviewSection } from './PreviewSection';

export const FloatingPreview: React.FC = () => {
    const file = useActiveFile();
    const floatingPreviewX = useSettingsStore((s) => s.floatingPreviewX);
    const floatingPreviewY = useSettingsStore((s) => s.floatingPreviewY);
    const setFloatingPreviewPosition = useSettingsStore((s) => s.setFloatingPreviewPosition);

    const containerRef = useRef<HTMLDivElement>(null);
    const posRef = useRef({ x: floatingPreviewX, y: floatingPreviewY });
    const dragOffsetRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        posRef.current = { x: floatingPreviewX, y: floatingPreviewY };
        if (containerRef.current) {
            containerRef.current.style.left = `${floatingPreviewX}px`;
            containerRef.current.style.top = `${floatingPreviewY}px`;
        }
    }, [floatingPreviewX, floatingPreviewY]);

    const clampPosition = useCallback((x: number, y: number) => {
        const w = containerRef.current?.offsetWidth ?? 280;
        const h = containerRef.current?.offsetHeight ?? 60;
        const maxX = window.innerWidth - w;
        const maxY = window.innerHeight - h;
        return {
            x: Math.max(0, Math.min(x, maxX)),
            y: Math.max(0, Math.min(y, maxY)),
        };
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('[data-drag-handle]') === null) return;
        e.preventDefault();
        const rect = containerRef.current!.getBoundingClientRect();
        dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };

        const onMouseMove = (ev: MouseEvent) => {
            if (!containerRef.current) return;
            const clamped = clampPosition(
                ev.clientX - dragOffsetRef.current.x,
                ev.clientY - dragOffsetRef.current.y,
            );
            containerRef.current.style.left = `${clamped.x}px`;
            containerRef.current.style.top = `${clamped.y}px`;
            posRef.current = clamped;
        };
        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            setFloatingPreviewPosition(posRef.current.x, posRef.current.y);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }, [clampPosition, setFloatingPreviewPosition]);

    useEffect(() => {
        const onResize = () => {
            const clamped = clampPosition(posRef.current.x, posRef.current.y);
            if (clamped.x !== posRef.current.x || clamped.y !== posRef.current.y) {
                setFloatingPreviewPosition(clamped.x, clamped.y);
            }
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [clampPosition, setFloatingPreviewPosition]);

    if (!file) return null;

    return (
        <div
            ref={containerRef}
            className="fixed z-50 w-[280px] rounded-lg bg-surface-900 border border-surface-700 shadow-2xl overflow-hidden select-none"
            style={{ left: floatingPreviewX, top: floatingPreviewY }}
            onMouseDown={handleMouseDown}
        >
            <div
                data-drag-handle
                className="flex items-center justify-between px-3 py-1.5 bg-surface-800 border-b border-surface-700 cursor-grab active:cursor-grabbing"
            >
                <span className="text-xs text-surface-400 font-medium select-none">プレビュー</span>
                <svg className="w-3.5 h-3.5 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 8h16M4 16h16" />
                </svg>
            </div>
            <PreviewSection file={file} />
        </div>
    );
};
