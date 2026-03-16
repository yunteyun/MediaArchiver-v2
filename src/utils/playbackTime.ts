export function formatPlaybackTime(seconds: number): string {
    const totalSeconds = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remain = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}`;
    }

    return `${minutes}:${String(remain).padStart(2, '0')}`;
}

export function formatPlaybackUpdatedAt(timestamp: number | null | undefined): string | null {
    if (!timestamp || !Number.isFinite(timestamp)) return null;
    return new Date(timestamp).toLocaleString('ja-JP');
}
