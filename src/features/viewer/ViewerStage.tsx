import React, { useMemo } from 'react';
import { Archive } from 'lucide-react';
import type { LightboxOpenMode } from '../../stores/useUIStore';
import { resolveLightboxMediaKind } from '../../components/lightbox/shared/lightboxShared';
import { useViewerContext } from './ViewerContext';
import { ImageContent } from './modes/ImageContent';
import { AudioContent } from './modes/AudioContent';
import { VideoContent } from './modes/VideoContent';
import { ArchiveContent } from './modes/ArchiveContent';
import { MangaContent } from './modes/MangaContent';

/**
 * ファイル種別に応じた <Mode>Content を dispatch するコンテナ。
 * Shell はメディア種別を知らない。種別判定はここだけで行う。
 *
 * archive-manga の自動判定（旧 useUIStore.openLightbox 内で行っていたもの）も
 * ここで担う: metadata に imageEntries があれば openMode を上書きする。
 */

interface ViewerStageProps {
    openMode: LightboxOpenMode;
    videoVolume: number;
    audioVolume: number;
    startTimeSeconds: number | null;
}

function resolveOpenMode(
    rawMode: LightboxOpenMode,
    fileMetadata: string | null | undefined,
    fileType: string,
): LightboxOpenMode {
    if (rawMode !== 'default' || fileType !== 'archive') return rawMode;
    try {
        const meta = fileMetadata ? (JSON.parse(fileMetadata) as Record<string, unknown>) : null;
        const entries = meta?.imageEntries;
        if (Array.isArray(entries) && entries.length > 0) return 'archive-manga';
    } catch {
        // metadata parse failure は無視
    }
    return rawMode;
}

export const ViewerStage = React.memo<ViewerStageProps>(({
    openMode: rawOpenMode,
    videoVolume,
    audioVolume,
    startTimeSeconds,
}) => {
    const { file } = useViewerContext();
    const kind = useMemo(() => resolveLightboxMediaKind(file), [file]);
    const openMode = useMemo(
        () => resolveOpenMode(rawOpenMode, file.metadata, file.type),
        [rawOpenMode, file.metadata, file.type],
    );

    void videoVolume;   // ViewerContext 経由でモード側が参照
    void audioVolume;
    void startTimeSeconds;

    if (kind === 'video') return <VideoContent />;
    if (kind === 'archive' && openMode === 'archive-manga') return <MangaContent />;
    if (kind === 'archive') return <ArchiveContent openMode={openMode} />;
    if (kind === 'audio') return <AudioContent />;
    if (kind === 'image') return <ImageContent />;

    return (
        <div className="pointer-events-auto px-6 py-8 text-center">
            <Archive size={56} className="mx-auto mb-4 text-surface-500" />
            <p className="text-sm font-semibold text-surface-200">この形式は表示できません</p>
        </div>
    );
});

ViewerStage.displayName = 'ViewerStage';
