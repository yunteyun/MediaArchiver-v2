import React from 'react';
import type { MediaFile, PlaybackBookmark } from '../../../../types/file';
import { formatPlaybackTime, formatPlaybackUpdatedAt } from '../../../../utils/playbackTime';
import { usePlaybackBookmarks } from './usePlaybackBookmarks';

interface Props {
    file: MediaFile;
    onClose?: () => void;
    /** mpv など lightboxCurrentTime を使えない場合の上書き */
    currentTime?: number;
    onSeek?: (sec: number) => void;
}

export const PlaybackBookmarksPopover = React.memo<Props>(({
    file,
    onClose: _onClose,
    currentTime: currentTimeProp,
    onSeek,
}) => {
    const {
        state,
        sortedBookmarks,
        savedPosition,
        activeCurrentTime: baseActiveTime,
        dispatch,
        handleResume,
        handleClear,
        handleAddBookmark,
        handleDeleteBookmark,
        handleSaveNote,
        handleSetRepresentative,
    } = usePlaybackBookmarks(file);

    const activeCurrentTime = currentTimeProp !== undefined && Number.isFinite(currentTimeProp)
        ? Math.max(0, currentTimeProp)
        : baseActiveTime;

    const hasSavedPosition = savedPosition !== null && savedPosition > 0;
    const updatedAt = formatPlaybackUpdatedAt(file.playbackPositionUpdatedAt);

    const seekTo = (sec: number) => {
        if (onSeek) onSeek(sec);
    };

    if (file.type !== 'video') return null;

    return (
        <div className="pointer-events-auto absolute bottom-full right-4 z-viewer-popover mb-2 w-[312px] rounded-xl border border-surface-500 bg-surface-950 px-4 py-3 shadow-2xl">
            {/* ヘッダー */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-surface-100">再開 / 見どころ</div>
                    <p className="mt-1 text-[11px] leading-5 text-surface-400">
                        {hasSavedPosition
                            ? `再開位置 ${formatPlaybackTime(savedPosition ?? 0)} を保存中`
                            : '再開位置と見どころをここで扱えます'}
                    </p>
                </div>
                {activeCurrentTime !== null && (
                    <div className="shrink-0 rounded-md border border-surface-700 bg-surface-900 px-2.5 py-1 text-sm font-semibold leading-none text-surface-100">
                        {formatPlaybackTime(activeCurrentTime)}
                    </div>
                )}
            </div>

            {updatedAt && hasSavedPosition && (
                <p className="mt-2 truncate text-[11px] text-surface-500">最終保存: {updatedAt}</p>
            )}

            {/* アクションボタン */}
            <div className="mt-3 flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={handleResume}
                    disabled={!hasSavedPosition}
                    className="rounded-md border border-primary-700 bg-primary-900/30 px-2.5 py-1 text-xs font-semibold text-primary-100 transition-colors hover:bg-primary-900/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    続きから開く
                </button>
                <button
                    type="button"
                    onClick={() => dispatch({ type: 'TOGGLE_COMPOSER' })}
                    disabled={activeCurrentTime === null}
                    className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${state.composerOpen ? 'border-primary-700 bg-primary-900/30 text-primary-100' : 'border-surface-700 bg-surface-900 text-surface-300 hover:bg-surface-800'} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                    追加
                </button>
                <button
                    type="button"
                    onClick={() => dispatch({ type: 'TOGGLE_LIST' })}
                    className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${state.listOpen ? 'border-primary-700 bg-primary-900/30 text-primary-100' : 'border-surface-700 bg-surface-900 text-surface-300 hover:bg-surface-800'}`}
                >
                    一覧
                </button>
                <button
                    type="button"
                    onClick={() => void handleClear()}
                    disabled={!hasSavedPosition || state.clearing}
                    className="rounded-md border border-surface-700 bg-surface-900 px-2.5 py-1 text-xs text-surface-300 transition-colors hover:bg-surface-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {state.clearing ? 'クリア中...' : 'クリア'}
                </button>
            </div>

            {/* 追加フォーム */}
            {state.composerOpen && (
                <div className="mt-3 space-y-2 rounded-lg border border-surface-700 bg-surface-900 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-medium text-surface-300">この位置を見どころに追加</p>
                        {activeCurrentTime !== null && (
                            <span className="rounded-md border border-surface-700 bg-surface-950 px-2 py-1 text-[11px] font-semibold leading-none text-surface-100">
                                {formatPlaybackTime(activeCurrentTime)}
                            </span>
                        )}
                    </div>
                    <input
                        type="text"
                        value={state.note}
                        onChange={e => dispatch({ type: 'SET_NOTE', note: e.target.value.slice(0, 80) })}
                        placeholder="メモを一言残す（任意）"
                        className="w-full rounded-md border border-surface-700 bg-surface-950 px-3 py-2 text-xs text-surface-100 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => { dispatch({ type: 'TOGGLE_COMPOSER' }); dispatch({ type: 'SET_NOTE', note: '' }); }}
                            className="rounded-md border border-surface-700 bg-surface-950 px-2.5 py-1 text-[11px] text-surface-300 transition-colors hover:bg-surface-800"
                        >
                            キャンセル
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleAddBookmark()}
                            disabled={activeCurrentTime === null || state.adding}
                            className="rounded-md border border-primary-700 bg-primary-900/30 px-2.5 py-1 text-[11px] font-medium text-primary-100 transition-colors hover:bg-primary-900/50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {state.adding ? '追加中...' : '追加する'}
                        </button>
                    </div>
                </div>
            )}

            {/* 一覧 */}
            {state.listOpen && (
                <div className="mt-3 space-y-2 rounded-lg border border-surface-700 bg-surface-900 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-medium text-surface-300">見どころ一覧</p>
                        {state.bookmarks.length > 1 && (
                            <button
                                type="button"
                                onClick={() => dispatch({ type: 'SET_SORT', mode: state.sortMode === 'timeline' ? 'recent' : 'timeline' })}
                                className="rounded-md border border-surface-700 bg-surface-950 px-2 py-1 text-[11px] text-surface-300 transition-colors hover:bg-surface-800"
                            >
                                {state.sortMode === 'timeline' ? '時刻順' : '新しい順'}
                            </button>
                        )}
                    </div>

                    {state.loading ? (
                        <p className="text-xs text-surface-500">読み込み中...</p>
                    ) : sortedBookmarks.length > 0 ? (
                        <div className="max-h-[260px] space-y-1.5 overflow-y-auto pr-1">
                            {sortedBookmarks.map(bookmark => (
                                <BookmarkItem
                                    key={bookmark.id}
                                    bookmark={bookmark}
                                    activeCurrentTime={activeCurrentTime}
                                    isEditing={state.editing?.id === bookmark.id}
                                    editingNote={state.editing?.note ?? ''}
                                    isSaving={state.savingId === bookmark.id}
                                    isDeleting={state.deletingId === bookmark.id}
                                    isSettingRep={state.settingRepId === bookmark.id}
                                    isHighlighted={state.highlightedId === bookmark.id}
                                    onSeek={seekTo}
                                    onStartEdit={() => dispatch({ type: 'START_EDIT', id: bookmark.id, note: bookmark.note ?? '' })}
                                    onSetEditNote={note => dispatch({ type: 'SET_EDIT_NOTE', note })}
                                    onCancelEdit={() => dispatch({ type: 'CANCEL_EDIT' })}
                                    onSaveNote={() => void handleSaveNote(bookmark.id)}
                                    onDelete={() => void handleDeleteBookmark(bookmark.id)}
                                    onSetRep={() => void handleSetRepresentative(bookmark)}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs leading-5 text-surface-500">まだ保存されていません。</p>
                    )}
                </div>
            )}
        </div>
    );
});

PlaybackBookmarksPopover.displayName = 'PlaybackBookmarksPopover';

// ── ブックマークアイテム ───────────────────────────────────────────────────────

interface BookmarkItemProps {
    bookmark: PlaybackBookmark;
    activeCurrentTime: number | null;
    isEditing: boolean;
    editingNote: string;
    isSaving: boolean;
    isDeleting: boolean;
    isSettingRep: boolean;
    isHighlighted: boolean;
    onSeek: (sec: number) => void;
    onStartEdit: () => void;
    onSetEditNote: (note: string) => void;
    onCancelEdit: () => void;
    onSaveNote: () => void;
    onDelete: () => void;
    onSetRep: () => void;
}

const BookmarkItem = React.memo<BookmarkItemProps>(({
    bookmark,
    activeCurrentTime,
    isEditing,
    editingNote,
    isSaving,
    isDeleting,
    isSettingRep,
    isHighlighted,
    onSeek,
    onStartEdit,
    onSetEditNote,
    onCancelEdit,
    onSaveNote,
    onDelete,
    onSetRep,
}) => {
    const hasNote = Boolean(bookmark.note?.trim());
    const isNear = activeCurrentTime !== null && Math.abs(bookmark.timeSeconds - activeCurrentTime) < 3;

    const containerClass = [
        'rounded-md border px-3 transition-colors',
        isEditing || hasNote ? 'space-y-2 py-2.5' : 'space-y-1.5 py-2',
        isHighlighted
            ? 'border-primary-500 bg-primary-950/30 shadow-[0_0_0_1px_rgba(59,130,246,0.25)]'
            : isNear
                ? 'border-primary-700/80 bg-primary-950/15'
                : 'border-surface-700 bg-surface-950',
    ].join(' ');

    return (
        <div className={containerClass}>
            <div className="flex items-start gap-2">
                <button
                    type="button"
                    onClick={() => onSeek(bookmark.timeSeconds)}
                    className="min-w-0 flex-1 rounded-md text-left transition-colors hover:bg-surface-900/70"
                >
                    <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-surface-100">
                            {formatPlaybackTime(bookmark.timeSeconds)}
                        </div>
                        {isNear && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-primary-700/80 bg-primary-900/25 px-1.5 py-0.5 text-[10px] font-medium leading-none text-primary-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary-300" />
                                近い
                            </span>
                        )}
                    </div>
                    {!isEditing && hasNote && (
                        <div className="mt-1 truncate text-[11px] text-surface-400" title={bookmark.note ?? undefined}>
                            {bookmark.note}
                        </div>
                    )}
                </button>
                <div className="flex gap-1.5">
                    <IconButton onClick={onSetRep} disabled={isSettingRep} title="この見どころを表紙にする">
                        {isSettingRep ? <Spinner /> : <RepIcon />}
                    </IconButton>
                    <IconButton onClick={onStartEdit} title="メモを編集する">
                        <EditIcon />
                    </IconButton>
                    <IconButton onClick={onDelete} disabled={isDeleting} title="この見どころを削除">
                        {isDeleting ? <Spinner /> : <TrashIcon />}
                    </IconButton>
                </div>
            </div>

            {isEditing && (
                <div className="space-y-2">
                    <input
                        type="text"
                        value={editingNote}
                        onChange={e => onSetEditNote(e.target.value.slice(0, 80))}
                        placeholder="メモを一言残す（任意）"
                        className="w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-xs text-surface-100 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onCancelEdit} className="rounded-md border border-surface-700 bg-surface-900 px-2.5 py-1 text-[11px] text-surface-300 transition-colors hover:bg-surface-800">
                            キャンセル
                        </button>
                        <button type="button" onClick={onSaveNote} disabled={isSaving} className="rounded-md border border-primary-700 bg-primary-900/30 px-2.5 py-1 text-[11px] font-medium text-primary-100 transition-colors hover:bg-primary-900/50 disabled:cursor-not-allowed disabled:opacity-60">
                            {isSaving ? '保存中...' : '保存'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});
BookmarkItem.displayName = 'BookmarkItem';

// ── 小コンポーネント ────────────────────────────────────────────────────────

const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...props }) => (
    <button
        type="button"
        {...props}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-surface-700 bg-surface-900 text-surface-300 transition-colors hover:bg-surface-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
        {children}
    </button>
);

const Spinner = () => (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" opacity="0.35" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
);

const RepIcon = () => (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h16" /><path d="M7 4h10" /><path d="M6 10h12v8H6z" /><path d="M12 13v2" /><path d="M11 14h2" />
    </svg>
);

const EditIcon = () => (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m4 20 4.5-1 9-9-3.5-3.5-9 9L4 20Z" /><path d="M13.5 6.5 17 10" />
    </svg>
);

const TrashIcon = () => (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h16" /><path d="M9 7V5h6v2" /><path d="M7 7l1 12h8l1-12" />
    </svg>
);
