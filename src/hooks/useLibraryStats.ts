import { useCallback, useEffect, useState } from 'react';
import { useProfileStore } from '../stores/useProfileStore';
import type { LibraryStats } from '../types/statistics';

export function useLibraryStats(enabled = true) {
    const activeProfileId = useProfileStore((s) => s.activeProfileId);
    const [stats, setStats] = useState<LibraryStats | null>(null);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState<string | null>(null);

    const loadStats = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await window.electronAPI.getLibraryStats();
            setStats(data);
        } catch (e) {
            console.error('Failed to load library stats:', e);
            setError(e instanceof Error ? e.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;
        void loadStats();
    }, [activeProfileId, enabled, loadStats]);

    return {
        stats,
        loading,
        error,
        loadStats,
    };
}
