import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { useFileStore } from '../../stores/useFileStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useTagStore } from '../../stores/useTagStore';
import { MediaViewer } from './MediaViewer';
import { ControlOverlay } from './ControlOverlay';
import { InfoPanel } from './InfoPanel';

export const LightBox = React.memo(() => {
    const lightboxFile = useUIStore((s) => s.lightboxFile);
    const lightboxOpenMode = useUIStore((s) => s.lightboxOpenMode);
    const closeLightbox = useUIStore((s) => s.closeLightbox);
    const files = useFileStore((s) => s.files);
    const updateFileTagCache = useFileStore((s) => s.updateFileTagCache);
    const incrementAccessCount = useFileStore((s) => s.incrementAccessCount);
    const videoVolume = useSettingsStore((s) => s.videoVolume);
    const audioVolume = useSettingsStore((s) => s.audioVolume);
    const setVideoVolume = useSettingsStore((s) => s.setVideoVolume);
    const setAudioVolume = useSettingsStore((s) => s.setAudioVolume);

    // Tag state
    const [fileTagIds, setFileTagIds] = useState<string[]>([]);
    const loadTags = useTagStore((s) => s.loadTags);
    const loadCategories = useTagStore((s) => s.loadCategories);
    const tags = useTagStore((s) => s.tags);

    // Memo state
    const [notes, setNotes] = useState('');
    const [notesSaveStatus, setNotesSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [selectedArchiveImage, setSelectedArchiveImage] = useState<string | null>(null);
    const isArchiveSingleView = lightboxFile?.type === 'archive' && !!selectedArchiveImage;

    const handleCloseRequest = useCallback(() => {
        if (isArchiveSingleView) {
            setSelectedArchiveImage(null);
            return;
        }
        closeLightbox();
    }, [isArchiveSingleView, closeLightbox]);

    const currentIndex = files.findIndex(f => f.id === lightboxFile?.id);

    const goToPrevious = useCallback(() => {
        const prevFile = files[currentIndex - 1];
        if (currentIndex > 0 && prevFile) {
            useUIStore.getState().openLightbox(prevFile);
        }
    }, [currentIndex, files]);

    const goToNext = useCallback(() => {
        const nextFile = files[currentIndex + 1];
        if (currentIndex < files.length - 1 && nextFile) {
            useUIStore.getState().openLightbox(nextFile);
        }
    }, [currentIndex, files]);

    // クイックタグ付け（1-9キー）
    const handleQuickTag = useCallback(async (digit: number) => {
        if (!lightboxFile || digit < 1 || digit > 9) return;

        const tagIndex = digit - 1;
        if (tagIndex >= tags.length) {
            return;
        }

        const targetTag = tags[tagIndex];
        if (!targetTag) return;

        const isTagged = fileTagIds.includes(targetTag.id);

        try {
            if (isTagged) {
                await window.electronAPI.removeTagFromFile(lightboxFile.id, targetTag.id);
                const newTagIds = fileTagIds.filter(id => id !== targetTag.id);
                setFileTagIds(newTagIds);
                updateFileTagCache(lightboxFile.id, newTagIds);
            } else {
                await window.electronAPI.addTagToFile(lightboxFile.id, targetTag.id);
                const newTagIds = [...fileTagIds, targetTag.id];
                setFileTagIds(newTagIds);
                updateFileTagCache(lightboxFile.id, newTagIds);
            }
        } catch (err) {
            console.error('Quick tag failed:', err);
        }
    }, [lightboxFile, tags, fileTagIds, updateFileTagCache]);

    // メモ保存（debounce）
    const saveNotes = useCallback(async (value: string) => {
        if (!lightboxFile) return;
        setNotesSaveStatus('saving');
        try {
            await window.electronAPI.updateFileNotes(lightboxFile.id, value);
            setNotesSaveStatus('saved');
            setTimeout(() => setNotesSaveStatus('idle'), 2000);
        } catch (err) {
            console.error('Failed to save notes:', err);
            setNotesSaveStatus('idle');
        }
    }, [lightboxFile]);

    const handleNotesChange = useCallback((value: string) => {
        setNotes(value);
        // debounce: 1秒後に保存
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            saveNotes(value);
        }, 1000);
    }, [saveNotes]);

    // フォーカス外れたら即保存
    const handleNotesBlur = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        if (lightboxFile) {
            saveNotes(notes);
        }
    }, [lightboxFile, notes, saveNotes]);

    // タグ追加
    const handleAddTag = useCallback(async (tagId: string) => {
        if (!lightboxFile) return;
        await window.electronAPI.addTagToFile(lightboxFile.id, tagId);
        const newTagIds = [...fileTagIds, tagId];
        setFileTagIds(newTagIds);
        updateFileTagCache(lightboxFile.id, newTagIds);
    }, [lightboxFile, fileTagIds, updateFileTagCache]);

    // タグ削除
    const handleRemoveTag = useCallback(async (tagId: string) => {
        if (!lightboxFile) return;
        await window.electronAPI.removeTagFromFile(lightboxFile.id, tagId);
        const newTagIds = fileTagIds.filter(id => id !== tagId);
        setFileTagIds(newTagIds);
        updateFileTagCache(lightboxFile.id, newTagIds);
    }, [lightboxFile, fileTagIds, updateFileTagCache]);

    // 音量変更
    const handleVolumeChange = useCallback((mediaType: 'video' | 'audio', volume: number) => {
        const safeVolume = Math.max(0, Math.min(1, volume));
        if (mediaType === 'video') {
            setVideoVolume(safeVolume);
            return;
        }
        setAudioVolume(safeVolume);
    }, [setVideoVolume, setAudioVolume]);

    // キーボードイベント
    useEffect(() => {
        if (!lightboxFile) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // テキストエリアにフォーカスがある場合は無視
            if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;

            if (e.key === 'Escape') {
                handleCloseRequest();
            }

            // 動画ファイルの場合は矢印キーをMediaViewerに任せる（シーク操作優先）
            if (lightboxFile.type !== 'video') {
                if (e.key === 'ArrowLeft') goToPrevious();
                if (e.key === 'ArrowRight') goToNext();
            }

            // 数字キーでクイックタグ
            if (e.key >= '1' && e.key <= '9') {
                handleQuickTag(parseInt(e.key, 10));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxFile, handleCloseRequest, goToPrevious, goToNext, handleQuickTag]);

    // Load file tags and notes when lightbox opens
    useEffect(() => {
        if (lightboxFile) {
            setSelectedArchiveImage(null);
            loadTags();
            loadCategories();
            window.electronAPI.getFileTagIds(lightboxFile.id)
                .then(setFileTagIds)
                .catch(console.error);
            // メモを読み込み
            setNotes(lightboxFile.notes || '');
            setNotesSaveStatus('idle');
        } else {
            setFileTagIds([]);
            setNotes('');
        }
    }, [lightboxFile, loadTags, loadCategories]);

    // Phase 17: Lightbox表示時にアクセスカウント
    useEffect(() => {
        if (!lightboxFile) return;

        const countAccess = async () => {
            const result = await window.electronAPI.incrementAccessCount(lightboxFile.id);
            if (result.success && result.lastAccessedAt) {
                incrementAccessCount(lightboxFile.id, result.lastAccessedAt);
            }
        };

        countAccess();
    }, [lightboxFile?.id, incrementAccessCount]);

    // クリーンアップ
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    if (!lightboxFile) return null;

    return (
        <div
            className="fixed inset-0 bg-black/95 flex items-center justify-center"
            style={{ zIndex: 'var(--z-lightbox)' }}
            onClick={handleCloseRequest}
        >
            <ControlOverlay
                onClose={handleCloseRequest}
                onPrevious={goToPrevious}
                onNext={goToNext}
                showPrevious={currentIndex > 0}
                showNext={currentIndex < files.length - 1}
                showCloseButton={lightboxFile.type !== 'archive'}
            />

            {/* 常に2カラムレイアウト: 情報エリア（左）| メディア（右） */}
            <div className="flex items-center w-full h-full" onClick={(e) => e.stopPropagation()}>
                <InfoPanel
                    file={lightboxFile}
                    fileTagIds={fileTagIds}
                    onAddTag={handleAddTag}
                    onRemoveTag={handleRemoveTag}
                    notes={notes}
                    notesSaveStatus={notesSaveStatus}
                    onNotesChange={handleNotesChange}
                    onNotesBlur={handleNotesBlur}
                />
                <div className="flex-1 flex items-center justify-center p-6 md:p-8 bg-gradient-to-br from-black/30 via-surface-950/60 to-black/50">
                    <MediaViewer
                        file={lightboxFile}
                        archiveOpenMode={lightboxOpenMode}
                        videoVolume={videoVolume}
                        audioVolume={audioVolume}
                        onVolumeChange={handleVolumeChange}
                        selectedArchiveImage={selectedArchiveImage}
                        onSelectArchiveImage={setSelectedArchiveImage}
                        onRequestClose={handleCloseRequest}
                    />
                </div>
            </div>
        </div>
    );
});

LightBox.displayName = 'LightBox';
