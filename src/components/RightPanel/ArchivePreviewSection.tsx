/**
 * ArchivePreviewSection - 書庫ファイルのプレビューフレームグリッド
 * BASIC INFO の下 / TAG セクションの上に表示する
 */
import React, { useState, useEffect } from 'react';
import { Images } from 'lucide-react';
import type { MediaFile } from '../../types/file';
import { isAudioArchive } from '../../utils/fileHelpers';
import { toMediaUrl } from '../../utils/mediaPath';
import { useUIStore } from '../../stores/useUIStore';
import { SectionTitle } from './SectionTitle';

interface Props {
    file: MediaFile;
}

export const ArchivePreviewSection = React.memo<Props>(({ file }) => {
    const openLightbox = useUIStore((s) => s.openLightbox);
    const [frames, setFrames] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // 音声書庫 or 非書庫は表示しない
    const shouldShow = file.type === 'archive' && !isAudioArchive(file);

    useEffect(() => {
        if (!shouldShow) {
            setFrames([]);
            return;
        }
        setFrames([]);
        setLoading(true);
        window.electronAPI.getArchivePreviewFrames(file.path, 4)
            .then((f: string[]) => setFrames(f))
            .catch(() => setFrames([]))
            .finally(() => setLoading(false));
    }, [file.path, shouldShow]);

    if (!shouldShow) return null;

    return (
        <section className="px-4 py-3 space-y-2 border-b border-surface-700">
            <div className="flex items-center gap-1.5">
                <Images size={13} className="text-surface-400" />
                <SectionTitle>プレビューフレーム</SectionTitle>
            </div>

            {loading ? (
                // ローディングスピナー
                <div className="flex items-center justify-center h-20 text-surface-500">
                    <div className="w-5 h-5 border-2 border-surface-600 border-t-surface-300 rounded-full animate-spin" />
                </div>
            ) : frames.length >= 2 ? (
                // 2×2 グリッド表示
                <div
                    className="grid grid-cols-2 gap-1 cursor-pointer"
                    onClick={() => openLightbox(file)}
                    title="クリックしてライトボックスで開く"
                >
                    {frames.slice(0, 4).map((framePath, i) => (
                        <div
                            key={i}
                            className="aspect-[3/4] overflow-hidden rounded-sm bg-surface-800 flex items-center justify-center"
                        >
                            <img
                                src={toMediaUrl(framePath)}
                                alt={`frame ${i + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        </div>
                    ))}
                    {/* 空きセルを埋める（3枚以下の場合） */}
                    {frames.length < 4 && Array.from({ length: 4 - frames.length }).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-[3/4] rounded-sm bg-surface-800" />
                    ))}
                </div>
            ) : frames.length === 1 ? (
                // 1枚のみの場合
                <div
                    className="w-full overflow-hidden rounded-sm cursor-pointer"
                    onClick={() => openLightbox(file)}
                >
                    <img
                        src={toMediaUrl(frames[0])}
                        alt="preview"
                        className="w-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                </div>
            ) : (
                // フレームなし
                <p className="text-xs text-surface-500">プレビューフレームなし</p>
            )}
        </section>
    );
});

ArchivePreviewSection.displayName = 'ArchivePreviewSection';
