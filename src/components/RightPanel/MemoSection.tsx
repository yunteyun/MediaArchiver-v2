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
    const [isOpen, setIsOpen] = React.useState(false);
    const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        setNotes(file.notes || '');
        setSaveStatus('idle');
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }
    }, [file.id, file.notes]);

    React.useEffect(() => {
        setIsOpen(false);
    }, [file.id]);

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

    const previewText = notes.trim() || 'メモなし';

    return (
        <section className="px-4 py-3 border-b border-surface-700">
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="flex w-full items-start justify-between gap-3 text-left"
            >
                <div className="min-w-0 space-y-1">
                    <SectionTitle>メモ</SectionTitle>
                    <p
                        className="overflow-hidden whitespace-pre-wrap break-words text-xs leading-5 text-surface-500"
                        style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                        }}
                    >
                        {previewText}
                    </p>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[11px] text-surface-500">
                        {saveStatus === 'saving' ? '保存中…' : saveStatus === 'saved' ? '保存済み' : ''}
                    </span>
                    <span className="text-surface-500">{isOpen ? '−' : '+'}</span>
                </div>
            </button>
            {isOpen && (
                <div className="pt-3">
                    <textarea
                        value={notes}
                        onChange={(event) => handleChange(event.target.value)}
                        onBlur={handleBlur}
                        rows={5}
                        placeholder="メモを入力..."
                        className="w-full resize-y rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 text-sm text-surface-100 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none"
                    />
                </div>
            )}
        </section>
    );
});

MemoSection.displayName = 'MemoSection';
