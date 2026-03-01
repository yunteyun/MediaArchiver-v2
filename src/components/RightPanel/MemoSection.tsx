import React from 'react';
import type { MediaFile } from '../../types/file';
import { useFileStore } from '../../stores/useFileStore';
import { SectionTitle } from './SectionTitle';

interface MemoSectionProps {
    file: MediaFile;
}

export const MemoSection = React.memo<MemoSectionProps>(({ file }) => {
    const refreshFile = useFileStore((state) => state.refreshFile);
    const [notes, setNotes] = React.useState(file.notes || '');
    const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'saved'>('idle');
    const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        setNotes(file.notes || '');
        setSaveStatus('idle');
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }
    }, [file.id, file.notes]);

    React.useEffect(() => () => {
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }
    }, []);

    const saveNotes = React.useCallback(async (value: string) => {
        setSaveStatus('saving');
        try {
            await window.electronAPI.updateFileNotes(file.id, value);
            await refreshFile(file.id);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 1500);
        } catch (error) {
            console.error('Failed to save notes in RightPanel:', error);
            setSaveStatus('idle');
        }
    }, [file.id, refreshFile]);

    const handleChange = React.useCallback((value: string) => {
        setNotes(value);
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }
        saveTimerRef.current = setTimeout(() => {
            void saveNotes(value);
        }, 800);
    }, [saveNotes]);

    const handleBlur = React.useCallback(() => {
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }
        void saveNotes(notes);
    }, [notes, saveNotes]);

    return (
        <section className="px-4 py-3 space-y-2 border-b border-surface-700">
            <div className="flex items-center justify-between gap-3">
                <SectionTitle>メモ</SectionTitle>
                <span className="text-[11px] text-surface-500">
                    {saveStatus === 'saving' ? '保存中…' : saveStatus === 'saved' ? '保存済み' : ''}
                </span>
            </div>
            <textarea
                value={notes}
                onChange={(event) => handleChange(event.target.value)}
                onBlur={handleBlur}
                rows={5}
                placeholder="メモを入力..."
                className="w-full resize-y rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 text-sm text-surface-100 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none"
            />
        </section>
    );
});

MemoSection.displayName = 'MemoSection';
