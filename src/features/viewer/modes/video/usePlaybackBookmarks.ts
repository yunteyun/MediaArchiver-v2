import { useCallback, useEffect, useMemo, useReducer } from 'react';
import type { MediaFile, PlaybackBookmark } from '../../../../types/file';
import { useFileStore } from '../../../../stores/useFileStore';
import { useUIStore } from '../../../../stores/useUIStore';
import {
    type BookmarkSortMode,
    getInitialBookmarkSortMode,
    persistBookmarkSortMode,
    sortPlaybackBookmarks,
} from '../../../../utils/playbackBookmarks';
import { useElectronViewerApi } from '../../hooks/useElectronViewerApi';

// ── 状態型 ───────────────────────────────────────────────────────────────────

interface BookmarksState {
    bookmarks: PlaybackBookmark[];
    loading: boolean;
    clearing: boolean;
    note: string;
    composerOpen: boolean;
    listOpen: boolean;
    adding: boolean;
    deletingId: string | null;
    editing: { id: string; note: string } | null;
    savingId: string | null;
    settingRepId: string | null;
    highlightedId: string | null;
    sortMode: BookmarkSortMode;
}

const initialState: BookmarksState = {
    bookmarks: [],
    loading: false,
    clearing: false,
    note: '',
    composerOpen: false,
    listOpen: false,
    adding: false,
    deletingId: null,
    editing: null,
    savingId: null,
    settingRepId: null,
    highlightedId: null,
    sortMode: getInitialBookmarkSortMode(),
};

// ── アクション型 ──────────────────────────────────────────────────────────────

type BookmarksAction =
    | { type: 'LOADED'; bookmarks: PlaybackBookmark[] }
    | { type: 'SET_LOADING' }
    | { type: 'START_CLEAR' }
    | { type: 'CLEARED' }
    | { type: 'SET_NOTE'; note: string }
    | { type: 'TOGGLE_COMPOSER' }
    | { type: 'TOGGLE_LIST' }
    | { type: 'START_ADD' }
    | { type: 'ADDED'; bookmark: PlaybackBookmark }
    | { type: 'ADD_DONE' }
    | { type: 'START_DELETE'; id: string }
    | { type: 'DELETED'; id: string }
    | { type: 'DELETE_DONE' }
    | { type: 'START_EDIT'; id: string; note: string }
    | { type: 'SET_EDIT_NOTE'; note: string }
    | { type: 'CANCEL_EDIT' }
    | { type: 'START_SAVE'; id: string }
    | { type: 'SAVED'; bookmark: PlaybackBookmark }
    | { type: 'SAVE_DONE' }
    | { type: 'START_SET_REP'; id: string }
    | { type: 'REP_DONE' }
    | { type: 'SET_HIGHLIGHT'; id: string | null }
    | { type: 'SET_SORT'; mode: BookmarkSortMode }
    | { type: 'RESET' };

// ── リデューサー ──────────────────────────────────────────────────────────────

function reducer(state: BookmarksState, action: BookmarksAction): BookmarksState {
    switch (action.type) {
        case 'LOADED': return { ...state, bookmarks: action.bookmarks, loading: false };
        case 'SET_LOADING': return { ...state, loading: true };
        case 'START_CLEAR': return { ...state, clearing: true };
        case 'CLEARED': return { ...state, clearing: false };
        case 'SET_NOTE': return { ...state, note: action.note };
        case 'TOGGLE_COMPOSER':
            return { ...state, composerOpen: !state.composerOpen, listOpen: false };
        case 'TOGGLE_LIST':
            return { ...state, listOpen: !state.listOpen, composerOpen: false };
        case 'START_ADD': return { ...state, adding: true };
        case 'ADDED': {
            const next = [...state.bookmarks];
            const idx = next.findIndex(b => b.id === action.bookmark.id);
            if (idx >= 0) next[idx] = action.bookmark; else next.push(action.bookmark);
            return {
                ...state,
                bookmarks: next,
                adding: false,
                note: '',
                composerOpen: false,
                listOpen: true,
                highlightedId: action.bookmark.id,
            };
        }
        case 'ADD_DONE': return { ...state, adding: false };
        case 'START_DELETE': return { ...state, deletingId: action.id };
        case 'DELETED':
            return { ...state, bookmarks: state.bookmarks.filter(b => b.id !== action.id), deletingId: null };
        case 'DELETE_DONE': return { ...state, deletingId: null };
        case 'START_EDIT': return { ...state, editing: { id: action.id, note: action.note } };
        case 'SET_EDIT_NOTE':
            return state.editing ? { ...state, editing: { ...state.editing, note: action.note } } : state;
        case 'CANCEL_EDIT': return { ...state, editing: null, savingId: null };
        case 'START_SAVE': return { ...state, savingId: action.id };
        case 'SAVED': {
            const next = state.bookmarks.map(b => b.id === action.bookmark.id ? action.bookmark : b);
            return { ...state, bookmarks: next, editing: null, savingId: null };
        }
        case 'SAVE_DONE': return { ...state, savingId: null };
        case 'START_SET_REP': return { ...state, settingRepId: action.id };
        case 'REP_DONE': return { ...state, settingRepId: null };
        case 'SET_HIGHLIGHT': return { ...state, highlightedId: action.id };
        case 'SET_SORT': return { ...state, sortMode: action.mode };
        case 'RESET': return { ...initialState, sortMode: state.sortMode };
        default: return state;
    }
}

// ── フック ────────────────────────────────────────────────────────────────────

export function usePlaybackBookmarks(file: MediaFile) {
    const api = useElectronViewerApi();
    const refreshFile = useFileStore(s => s.refreshFile);
    const updatePlaybackPosition = useFileStore(s => s.updatePlaybackPosition);
    const openLightbox = useUIStore(s => s.openLightbox);
    const lightboxFile = useUIStore(s => s.lightboxFile);
    const lightboxCurrentTime = useUIStore(s => s.lightboxCurrentTime);
    const showToast = useUIStore(s => s.showToast);

    const [state, dispatch] = useReducer(reducer, initialState);

    // ブックマーク読み込み
    useEffect(() => {
        if (file.type !== 'video') { dispatch({ type: 'LOADED', bookmarks: [] }); return; }
        let disposed = false;
        dispatch({ type: 'SET_LOADING' });
        void api.getPlaybackBookmarks(file.id).then(result => {
            if (!disposed) dispatch({ type: 'LOADED', bookmarks: result });
        }).catch(() => {
            if (!disposed) dispatch({ type: 'LOADED', bookmarks: [] });
        });
        return () => { disposed = true; };
    }, [api, file.id, file.type]);

    // ファイル切替でリセット
    useEffect(() => {
        dispatch({ type: 'RESET' });
    }, [file.id]);

    // ハイライト自動解除
    useEffect(() => {
        if (!state.highlightedId) return;
        const id = setTimeout(() => dispatch({ type: 'SET_HIGHLIGHT', id: null }), 1600);
        return () => clearTimeout(id);
    }, [state.highlightedId]);

    // ソートモード永続化
    useEffect(() => {
        persistBookmarkSortMode(state.sortMode);
    }, [state.sortMode]);

    const sortedBookmarks = useMemo(
        () => sortPlaybackBookmarks(state.bookmarks, state.sortMode),
        [state.bookmarks, state.sortMode],
    );

    // 現在再生時間
    const activeCurrentTime = useMemo(() => {
        if (lightboxFile?.id === file.id && typeof lightboxCurrentTime === 'number' && Number.isFinite(lightboxCurrentTime)) {
            return Math.max(0, lightboxCurrentTime);
        }
        return null;
    }, [lightboxFile, file.id, lightboxCurrentTime]);

    const savedPosition = typeof file.playbackPositionSeconds === 'number' && Number.isFinite(file.playbackPositionSeconds)
        ? file.playbackPositionSeconds
        : null;

    // ── アクションハンドラ ────────────────────────────────────────────────────

    const handleResume = useCallback(() => {
        if (!savedPosition) return;
        openLightbox(file, 'default', savedPosition);
    }, [savedPosition, openLightbox, file]);

    const handleClear = useCallback(async () => {
        if (state.clearing || !savedPosition) return;
        dispatch({ type: 'START_CLEAR' });
        try {
            const result = await api.updatePlaybackPosition(file.id, null);
            updatePlaybackPosition(file.id, result.playbackPositionSeconds ?? null, result.playbackPositionUpdatedAt ?? null);
        } catch { /* ignore */ } finally {
            dispatch({ type: 'CLEARED' });
        }
    }, [api, file.id, state.clearing, savedPosition, updatePlaybackPosition]);

    const handleAddBookmark = useCallback(async () => {
        if (activeCurrentTime === null || state.adding) return;
        dispatch({ type: 'START_ADD' });
        try {
            const result = await api.createPlaybackBookmark(file.id, activeCurrentTime, state.note);
            if (!result.success || !result.bookmark) {
                showToast(result.error ?? '見どころの追加に失敗しました', 'error');
                dispatch({ type: 'ADD_DONE' });
                return;
            }
            dispatch({ type: 'ADDED', bookmark: result.bookmark });
            showToast('見どころを追加しました', 'success', 1800);
        } catch {
            showToast('見どころの追加に失敗しました', 'error');
            dispatch({ type: 'ADD_DONE' });
        }
    }, [api, file.id, activeCurrentTime, state.note, state.adding, showToast]);

    const handleDeleteBookmark = useCallback(async (bookmarkId: string) => {
        if (state.deletingId === bookmarkId) return;
        dispatch({ type: 'START_DELETE', id: bookmarkId });
        try {
            const result = await api.deletePlaybackBookmark(bookmarkId);
            if (result.success) dispatch({ type: 'DELETED', id: bookmarkId });
            else dispatch({ type: 'DELETE_DONE' });
        } catch { dispatch({ type: 'DELETE_DONE' }); }
    }, [api, state.deletingId]);

    const handleSaveNote = useCallback(async (bookmarkId: string) => {
        if (state.savingId === bookmarkId || !state.editing) return;
        dispatch({ type: 'START_SAVE', id: bookmarkId });
        try {
            const result = await api.updatePlaybackBookmarkNote(bookmarkId, state.editing.note);
            if (result.success && result.bookmark) dispatch({ type: 'SAVED', bookmark: result.bookmark });
            else dispatch({ type: 'SAVE_DONE' });
        } catch { dispatch({ type: 'SAVE_DONE' }); }
    }, [api, state.savingId, state.editing]);

    const handleSetRepresentative = useCallback(async (bookmark: PlaybackBookmark) => {
        if (state.settingRepId === bookmark.id) return;
        dispatch({ type: 'START_SET_REP', id: bookmark.id });
        try {
            const result = await api.setRepresentativeThumbnail(file.id, bookmark.timeSeconds);
            if (!result.success) {
                showToast(result.error ?? '表紙の固定に失敗しました', 'error');
            } else {
                await refreshFile(file.id);
                showToast('見どころを表紙にしました', 'success', 1800);
            }
        } catch {
            showToast('表紙の固定に失敗しました', 'error');
        } finally {
            dispatch({ type: 'REP_DONE' });
        }
    }, [api, file.id, state.settingRepId, refreshFile, showToast]);

    return {
        state,
        sortedBookmarks,
        savedPosition,
        activeCurrentTime,
        dispatch,
        handleResume,
        handleClear,
        handleAddBookmark,
        handleDeleteBookmark,
        handleSaveNote,
        handleSetRepresentative,
    };
}
