import React, { useEffect, useReducer, useRef } from 'react';
import { Music } from 'lucide-react';
import { useUIStore } from '../../../stores/useUIStore';
import type { LightboxOpenMode } from '../../../stores/useUIStore';
import { LIGHTBOX_ARCHIVE_PREVIEW_LIMIT } from '../../../components/lightbox/shared/lightboxShared';
import { isAudioArchive } from '../../../utils/fileHelpers';
import { toMediaUrl } from '../../../utils/mediaPath';
import { useViewerContext } from '../viewerContexts';
import { useViewerKeyboard } from '../hooks/useViewerKeyboard';
import { useArchiveAudioPlayer } from './archive/useArchiveAudioPlayer';
import { ArchiveAudioList } from './archive/ArchiveAudioList';

// ── 状態マシン ──────────────────────────────────────────────────────────────

type ArchiveView =
    | { kind: 'grid' }
    | { kind: 'detail'; index: number };

type ArchiveAction =
    | { type: 'SELECT_FRAME'; index: number }
    | { type: 'BACK_TO_GRID' }
    | { type: 'NAV'; direction: 'prev' | 'next'; total: number };

function archiveReducer(state: ArchiveView, action: ArchiveAction): ArchiveView {
    switch (action.type) {
        case 'SELECT_FRAME':
            return { kind: 'detail', index: action.index };
        case 'BACK_TO_GRID':
            return { kind: 'grid' };
        case 'NAV': {
            if (state.kind !== 'detail') return state;
            const next = action.direction === 'prev'
                ? Math.max(0, state.index - 1)
                : Math.min(action.total - 1, state.index + 1);
            return { kind: 'detail', index: next };
        }
        default:
            return state;
    }
}

// ── コンポーネント ────────────────────────────────────────────────────────────

interface ArchiveContentProps {
    openMode: LightboxOpenMode;
}

const mediaStyle: React.CSSProperties = {
    display: 'block',
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
};

export const ArchiveContent = React.memo<ArchiveContentProps>(({ openMode }) => {
    const { file, audioVolume } = useViewerContext();
    const showToastFn = useUIStore(s => s.showToast);
    const showToast = useRef(showToastFn);
    showToast.current = showToastFn;

    const [archiveFrames, setArchiveFrames] = React.useState<string[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [audioEntries, setAudioEntries] = React.useState<string[]>([]);
    const archiveFramesRef = useRef(archiveFrames);
    archiveFramesRef.current = archiveFrames;

    const [view, dispatch] = useReducer(archiveReducer, { kind: 'grid' });
    const audioPlayer = useArchiveAudioPlayer(file.path, audioEntries);

    // ファイル切り替えでリセット
    useEffect(() => {
        dispatch({ type: 'BACK_TO_GRID' });
        setAudioEntries([]);
    }, [file.id, file.path]);

    // アンマウント時に書庫音声の一時ファイルをクリーンアップ
    useEffect(() => () => {
        void window.electronAPI.cleanArchiveTemp();
    }, []);

    // 書庫フレーム・音声エントリを読み込む
    useEffect(() => {
        let disposed = false;
        setArchiveFrames([]);
        setLoading(true);
        setError(null);

        const load = async () => {
            try {
                const [frames, audioFiles] = await Promise.all([
                    window.electronAPI.getArchivePreviewFrames(file.path, LIGHTBOX_ARCHIVE_PREVIEW_LIMIT),
                    window.electronAPI.getArchiveAudioFiles(file.path),
                ]);
                if (disposed) return;
                setArchiveFrames(Array.isArray(frames)
                    ? frames.filter(Boolean).slice(0, LIGHTBOX_ARCHIVE_PREVIEW_LIMIT)
                    : []);
                setAudioEntries(Array.isArray(audioFiles) ? audioFiles.filter(Boolean) : []);
            } catch {
                if (disposed) return;
                setError('書庫プレビューの取得に失敗しました');
                showToast.current?.('書庫プレビューの取得に失敗しました', 'error');
            } finally {
                if (!disposed) setLoading(false);
            }
        };

        void load();
        return () => { disposed = true; };
    }, [file.path]);

    // 音量同期
    useEffect(() => {
        if (audioPlayer.audioRef.current) {
            audioPlayer.audioRef.current.volume = Math.max(0, Math.min(1, audioVolume));
        }
    }, [audioVolume, file.id, audioPlayer.audioRef]);

    // 詳細ビュー時のキーボードナビ
    const keyboardHandler = React.useMemo(() => {
        if (view.kind !== 'detail') return null;
        return (e: KeyboardEvent): boolean => {
            if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return false;
            if (e.key === 'Escape') {
                e.preventDefault();
                dispatch({ type: 'BACK_TO_GRID' });
                return true;
            }
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                dispatch({ type: 'NAV', direction: 'prev', total: archiveFramesRef.current.length });
                return true;
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                dispatch({ type: 'NAV', direction: 'next', total: archiveFramesRef.current.length });
                return true;
            }
            return false;
        };
    }, [view.kind]);

    useViewerKeyboard(keyboardHandler);

    // ── レンダー ───────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="pointer-events-auto px-6 py-8 text-center">
                <p className="text-sm text-surface-400">書庫プレビューを読み込み中...</p>
            </div>
        );
    }
    if (error) {
        return (
            <div className="pointer-events-auto px-6 py-8 text-center">
                <p className="text-sm text-surface-300">{error}</p>
            </div>
        );
    }
    if (archiveFrames.length === 0 && audioEntries.length === 0) {
        return (
            <div className="pointer-events-auto px-6 py-8 text-center">
                <p className="text-sm text-surface-400">表示できるプレビューフレームがありません</p>
            </div>
        );
    }

    // 詳細ビュー
    if (view.kind === 'detail') {
        const frame = archiveFrames[view.index] ?? '';
        return (
            <div className="pointer-events-auto flex max-h-full w-full max-w-[1180px] flex-col gap-4 text-surface-100">
                <div className="flex items-center justify-between gap-3 text-sm text-surface-200">
                    <button
                        type="button"
                        onClick={() => dispatch({ type: 'BACK_TO_GRID' })}
                        className="rounded-md border border-surface-600 bg-black/60 px-3 py-1.5 transition hover:bg-surface-900"
                    >
                        グリッドへ戻る
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-surface-400">Esc で戻る</span>
                        <button
                            type="button"
                            onClick={() => dispatch({ type: 'NAV', direction: 'prev', total: archiveFrames.length })}
                            disabled={view.index <= 0}
                            className="rounded-md border border-surface-600 bg-black/60 px-3 py-1.5 transition hover:bg-surface-900 disabled:cursor-not-allowed disabled:border-surface-800 disabled:text-surface-500"
                        >
                            前へ
                        </button>
                        <span>{view.index + 1} / {archiveFrames.length}</span>
                        <button
                            type="button"
                            onClick={() => dispatch({ type: 'NAV', direction: 'next', total: archiveFrames.length })}
                            disabled={view.index >= archiveFrames.length - 1}
                            className="rounded-md border border-surface-600 bg-black/60 px-3 py-1.5 transition hover:bg-surface-900 disabled:cursor-not-allowed disabled:border-surface-800 disabled:text-surface-500"
                        >
                            次へ
                        </button>
                    </div>
                </div>
                <div className="flex max-h-full max-w-full items-center justify-center overflow-hidden">
                    <img
                        src={toMediaUrl(frame)}
                        alt={`Archive frame ${view.index + 1}`}
                        style={mediaStyle}
                        className="pointer-events-auto max-h-full max-w-full"
                        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                    />
                </div>
            </div>
        );
    }

    // グリッドビュー
    const hasAudioEntries = audioEntries.length > 0 || isAudioArchive(file);
    const audioFocused = openMode === 'archive-audio' && audioEntries.length > 0;
    const imageFocused = openMode === 'archive-image' && archiveFrames.length > 0;
    const showGrid = archiveFrames.length > 0 && !audioFocused;
    const showAudio = audioEntries.length > 0 && !imageFocused;
    const isMixed = showGrid && showAudio;

    const gridColClass = archiveFrames.length <= 1
        ? 'grid-cols-1'
        : archiveFrames.length <= 4
            ? 'grid-cols-2'
            : 'grid-cols-3';

    const gridPanelClass = isMixed
        ? archiveFrames.length <= 1
            ? 'w-[min(30vw,280px)] flex-shrink-0'
            : archiveFrames.length <= 4
                ? 'w-[min(42vw,420px)] flex-shrink-0'
                : 'w-[min(48vw,520px)] flex-shrink-0'
        : 'w-full';

    return (
        <div className="pointer-events-auto flex max-h-full w-full max-w-[1180px] flex-col gap-4 text-surface-100">
            <div className={`flex max-h-full min-h-0 gap-5 ${showAudio ? 'items-stretch justify-center' : 'justify-center'}`}>
                {showGrid ? (
                    <div className={gridPanelClass}>
                        <div className="rounded-xl border border-surface-600/80 bg-black/60 p-4 shadow-2xl backdrop-blur-sm">
                            <div className={`grid max-h-full ${gridColClass} gap-3 overflow-auto`}>
                                {archiveFrames.map((framePath, index) => (
                                    <button
                                        type="button"
                                        key={`${framePath}-${index}`}
                                        className="aspect-square overflow-hidden rounded-md border border-surface-600/70 bg-surface-800/90 transition hover:ring-2 hover:ring-surface-400"
                                        onClick={() => dispatch({ type: 'SELECT_FRAME', index })}
                                    >
                                        <img
                                            src={toMediaUrl(framePath)}
                                            alt={`Archive frame ${index + 1}`}
                                            className="h-full w-full bg-surface-800/95 object-contain"
                                            onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : hasAudioEntries ? (
                    <div className="flex h-56 w-56 flex-shrink-0 items-center justify-center rounded-xl border border-surface-600/80 bg-gradient-to-br from-surface-700 to-surface-900 shadow-2xl">
                        <Music size={72} className="text-primary-400" />
                    </div>
                ) : null}

                {showAudio && (
                    <ArchiveAudioList
                        entries={audioEntries}
                        audioVolume={audioVolume}
                        player={audioPlayer}
                        wide={showGrid}
                    />
                )}
            </div>
        </div>
    );
});

ArchiveContent.displayName = 'ArchiveContent';
