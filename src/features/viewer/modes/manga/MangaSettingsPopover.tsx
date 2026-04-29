import React, { useEffect, useRef } from 'react';
import { useMangaViewerSettingsStore } from '../../../../stores/useMangaViewerSettingsStore';
import type { MangaBindingDirection, MangaPageMode } from './pagePairing';

interface RadioOption { value: string; label: string }

const RadioGroup = React.memo<{
    name: string;
    value: string;
    onChange: (v: string) => void;
    options: RadioOption[];
}>(({ name, value, onChange, options }) => (
    <div className="flex flex-col gap-1.5">
        {options.map((opt) => (
            <label key={opt.value} className="flex cursor-pointer items-center gap-2">
                <input
                    type="radio"
                    name={name}
                    value={opt.value}
                    checked={value === opt.value}
                    onChange={() => onChange(opt.value)}
                    className="h-4 w-4 accent-primary-500"
                />
                <span className="text-sm text-white">{opt.label}</span>
            </label>
        ))}
    </div>
));
RadioGroup.displayName = 'RadioGroup';

interface MangaSettingsPopoverProps {
    onClose: () => void;
}

export const MangaSettingsPopover = React.memo<MangaSettingsPopoverProps>(({ onClose }) => {
    const pageMode = useMangaViewerSettingsStore(s => s.pageMode);
    const bindingDirection = useMangaViewerSettingsStore(s => s.bindingDirection);
    const firstPageSingle = useMangaViewerSettingsStore(s => s.firstPageSingle);
    const setPageMode = useMangaViewerSettingsStore(s => s.setPageMode);
    const setBindingDirection = useMangaViewerSettingsStore(s => s.setBindingDirection);
    const setFirstPageSingle = useMangaViewerSettingsStore(s => s.setFirstPageSingle);

    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handlePointerDown = (e: PointerEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        window.addEventListener('pointerdown', handlePointerDown, true);
        return () => window.removeEventListener('pointerdown', handlePointerDown, true);
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="pointer-events-auto absolute bottom-full right-4 z-viewer-popover mb-2 w-64 rounded-xl border border-surface-500 bg-surface-950 p-5 shadow-2xl"
        >
            <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-white">ページ設定</span>
                <button type="button" onClick={onClose} className="text-surface-400 hover:text-white">✕</button>
            </div>

            <section className="mb-4 flex flex-col gap-2">
                <span className="text-xs font-medium text-surface-400">ページモード</span>
                <RadioGroup
                    name="pageMode"
                    value={pageMode}
                    onChange={v => setPageMode(v as MangaPageMode)}
                    options={[
                        { value: 'spread', label: '見開き' },
                        { value: 'single', label: '単ページ' },
                    ]}
                />
            </section>

            <section className="mb-4 flex flex-col gap-2">
                <span className="text-xs font-medium text-surface-400">本を開く方向</span>
                <RadioGroup
                    name="bindingDirection"
                    value={bindingDirection}
                    onChange={v => setBindingDirection(v as MangaBindingDirection)}
                    options={[
                        { value: 'rtl', label: '右開き（← 次ページ）' },
                        { value: 'ltr', label: '左開き（→ 次ページ）' },
                    ]}
                />
            </section>

            <section className="flex flex-col gap-2">
                <span className="text-xs font-medium text-surface-400">最初のページを単独表示</span>
                <label className={`flex cursor-pointer items-center gap-2 ${pageMode === 'single' ? 'opacity-40' : ''}`}>
                    <input
                        type="checkbox"
                        checked={firstPageSingle}
                        disabled={pageMode === 'single'}
                        onChange={e => setFirstPageSingle(e.target.checked)}
                        className="h-4 w-4 accent-primary-500"
                    />
                    <span className="text-sm text-white">表紙を単独表示</span>
                </label>
            </section>
        </div>
    );
});

MangaSettingsPopover.displayName = 'MangaSettingsPopover';
