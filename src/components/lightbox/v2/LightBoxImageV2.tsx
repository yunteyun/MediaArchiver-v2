import React from 'react';
import { X } from 'lucide-react';
import { ControlOverlay } from '../ControlOverlay';
import { toMediaUrl } from '../../../utils/mediaPath';
import type { MediaFile } from '../../../types/file';
import { LightboxInfoPaneV2 } from './LightboxInfoPaneV2';

interface LightBoxImageV2Props {
    file: MediaFile;
    showPrevious: boolean;
    showNext: boolean;
    onPrevious?: () => void;
    onNext?: () => void;
    onClose: () => void;
    fileTagIds: string[];
    onAddTag: (tagId: string) => Promise<void>;
    onRemoveTag: (tagId: string) => Promise<void>;
    notes: string;
    notesSaveStatus: 'idle' | 'saving' | 'saved';
    onNotesChange: (value: string) => void;
    onNotesBlur: () => void;
}

const boundedImageStyle: React.CSSProperties = {
    maxWidth: '100%',
    maxHeight: '74vh',
    objectFit: 'contain',
    display: 'block',
};

const overlayStyle: React.CSSProperties = {
    zIndex: 'var(--z-lightbox)',
    backgroundColor: 'rgba(0, 0, 0, 0.96)',
};

export const LightBoxImageV2 = React.memo<LightBoxImageV2Props>(({
    file,
    showPrevious,
    showNext,
    onPrevious,
    onNext,
    onClose,
    fileTagIds,
    onAddTag,
    onRemoveTag,
    notes,
    notesSaveStatus,
    onNotesChange,
    onNotesBlur,
}) => {
    return (
        <div
            className="fixed inset-0 flex items-center justify-center"
            style={overlayStyle}
            onClick={onClose}
            data-lightbox-version="v2-image"
        >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_38%,rgba(255,255,255,0.04),transparent_46%),radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.02),transparent_40%)]" />

            <ControlOverlay
                onClose={onClose}
                onPrevious={onPrevious}
                onNext={onNext}
                showPrevious={showPrevious}
                showNext={showNext}
                showCloseButton={false}
            />

            {import.meta.env.DEV && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[70] px-3 py-1 rounded-full border border-emerald-300/40 bg-emerald-500/18 text-emerald-100 text-xs font-semibold tracking-wide shadow-lg pointer-events-none">
                    Lightbox V2 (Image)
                </div>
            )}

            <div
                className="relative z-10 w-[calc(100vw-24px)] h-[calc(100vh-24px)] max-w-[1680px] max-h-[88vh] rounded-2xl border border-white/12 bg-surface-950 shadow-2xl shadow-black/45"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" />
                <div className="relative flex items-center w-full h-full gap-4 p-4 md:gap-5 md:p-5">

                    <div
                        className="relative z-20 w-80 xl:w-88 h-full min-h-0 flex-shrink-0 rounded-xl bg-surface-950 border border-white/20 shadow-xl ring-1 ring-white/10 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <LightboxInfoPaneV2
                            file={file}
                            fileTagIds={fileTagIds}
                            onAddTag={onAddTag}
                            onRemoveTag={onRemoveTag}
                            notes={notes}
                            notesSaveStatus={notesSaveStatus}
                            onNotesChange={onNotesChange}
                            onNotesBlur={onNotesBlur}
                        />
                    </div>

                    <div
                        className="relative z-10 flex-1 h-full min-w-0 rounded-xl border border-white/12 bg-surface-950 shadow-2xl overflow-hidden"
                        onClick={onClose}
                    >
                        <div className="pointer-events-none absolute inset-0 rounded-xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]" />

                        <div className="relative w-full h-full flex items-center justify-center p-4 md:p-6">
                            <div
                                className="relative max-w-full max-h-full flex items-center justify-center"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClose();
                                    }}
                                    className="absolute top-0 right-0 translate-x-[calc(100%+10px)] -translate-y-[calc(100%+6px)] md:translate-x-[calc(100%+12px)] md:-translate-y-[calc(100%+8px)] z-20 p-2.5 bg-black/86 hover:bg-black/95 border border-white/28 rounded-full transition-colors text-white shadow-xl"
                                    title="閉じる (ESC)"
                                >
                                    <X size={24} />
                                </button>

                                <div className="max-w-full rounded-xl border border-white/22 bg-black shadow-2xl ring-1 ring-white/10 overflow-hidden">
                                    <img
                                        src={toMediaUrl(file.path)}
                                        alt={file.name}
                                        style={boundedImageStyle}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

LightBoxImageV2.displayName = 'LightBoxImageV2';
