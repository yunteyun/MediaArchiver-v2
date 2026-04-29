/**
 * ビューア関連の electronAPI 呼び出しを一箇所に集約したラッパー。
 * window.electronAPI への直書きをモードコンポーネントから排除し、
 * テスト時の差し替え点をここに一本化する。
 */
export function useElectronViewerApi() {
    return {
        // ── 再生位置 ─────────────────────────────────────────────────────────
        updatePlaybackPosition: (fileId: string, positionSeconds: number | null) =>
            window.electronAPI.updateFilePlaybackPosition(fileId, positionSeconds),

        // ── 見どころブックマーク ──────────────────────────────────────────────
        getPlaybackBookmarks: (fileId: string) =>
            window.electronAPI.getPlaybackBookmarks(fileId),
        createPlaybackBookmark: (fileId: string, timeSeconds: number, note: string) =>
            window.electronAPI.createPlaybackBookmark(fileId, timeSeconds, note),
        updatePlaybackBookmarkNote: (bookmarkId: string, note: string) =>
            window.electronAPI.updatePlaybackBookmarkNote(bookmarkId, note),
        deletePlaybackBookmark: (bookmarkId: string) =>
            window.electronAPI.deletePlaybackBookmark(bookmarkId),
        setRepresentativeThumbnail: (fileId: string, timeSeconds: number) =>
            window.electronAPI.setRepresentativeThumbnail(fileId, timeSeconds),

        // ── mpv ─────────────────────────────────────────────────────────────
        isMpvAvailable: () => window.electronAPI.isMpvAvailable(),
        openMpv: (options: Parameters<typeof window.electronAPI.openMpv>[0]) =>
            window.electronAPI.openMpv(options),
        closeMpv: () => window.electronAPI.closeMpv(),
        mpvPause: () => window.electronAPI.mpvPause(),
        mpvSeek: (sec: number) => window.electronAPI.mpvSeek(sec),
        mpvSetVolume: (v: number) => window.electronAPI.mpvSetVolume(v),
        mpvSetMuted: (muted: boolean) => window.electronAPI.mpvSetMuted(muted),
        mpvSetSpeed: (speed: number) => window.electronAPI.mpvSetSpeed(speed),
        mpvSetFullscreen: (fs: boolean) => window.electronAPI.mpvSetFullscreen(fs),
        mpvSetVisible: (visible: boolean) => window.electronAPI.mpvSetVisible(visible),
        mpvResize: (rect: Parameters<typeof window.electronAPI.mpvResize>[0]) =>
            window.electronAPI.mpvResize(rect),

        // ── mpv イベント購読 ──────────────────────────────────────────────────
        onMpvTimeUpdate: window.electronAPI.onMpvTimeUpdate.bind(window.electronAPI),
        onMpvDurationUpdate: window.electronAPI.onMpvDurationUpdate.bind(window.electronAPI),
        onMpvPauseChange: window.electronAPI.onMpvPauseChange.bind(window.electronAPI),
        onMpvMuteChange: window.electronAPI.onMpvMuteChange.bind(window.electronAPI),
        onMpvSpeedChange: window.electronAPI.onMpvSpeedChange.bind(window.electronAPI),
        onMpvFullscreenChange: window.electronAPI.onMpvFullscreenChange.bind(window.electronAPI),
        onMpvEnded: window.electronAPI.onMpvEnded.bind(window.electronAPI),

        // ── 書庫 ─────────────────────────────────────────────────────────────
        getArchivePreviewFrames: (path: string, limit: number) =>
            window.electronAPI.getArchivePreviewFrames(path, limit),
        getArchiveAudioFiles: (path: string) =>
            window.electronAPI.getArchiveAudioFiles(path),
        extractArchiveAudioFile: (archivePath: string, entry: string) =>
            window.electronAPI.extractArchiveAudioFile(archivePath, entry),
        cleanArchiveTemp: () => window.electronAPI.cleanArchiveTemp(),
        getArchiveImageByIndex: (archivePath: string, index: number) =>
            window.electronAPI.getArchiveImageByIndex(archivePath, index),
        getArchiveMetadata: (path: string) =>
            window.electronAPI.getArchiveMetadata(path),

        // ── アクセスカウント ───────────────────────────────────────────────────
        incrementAccessCount: (fileId: string) =>
            window.electronAPI.incrementAccessCount(fileId),
    } as const;
}
