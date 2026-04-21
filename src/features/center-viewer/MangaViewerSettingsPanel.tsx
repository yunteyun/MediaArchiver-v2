import React, { useEffect, useRef } from 'react';
import { Settings } from 'lucide-react';
import { useMangaViewerSettingsStore } from '../../stores/useMangaViewerSettingsStore';
import type { MangaPageMode, MangaBindingDirection } from './mangaPagePairing';

interface MangaViewerSettingsPanelProps {
    isOpen: boolean;
    onToggle: () => void;
}

export const MangaViewerSettingsPanel = React.memo<MangaViewerSettingsPanelProps>(({ isOpen, onToggle }) => {
    const pageMode = useMangaViewerSettingsStore((s) => s.pageMode);
    const bindingDirection = useMangaViewerSettingsStore((s) => s.bindingDirection);
    const firstPageSingle = useMangaViewerSettingsStore((s) => s.firstPageSingle);
    const setPageMode = useMangaViewerSettingsStore((s) => s.setPageMode);
    const setBindingDirection = useMangaViewerSettingsStore((s) => s.setBindingDirection);
    const setFirstPageSingle = useMangaViewerSettingsStore((s) => s.setFirstPageSingle);

    const panelRef = useRef<HTMLDivElement>(null);

    // パネル外クリックで閉じる
    useEffect(() => {
        if (!isOpen) return;
        const handlePointerDown = (e: PointerEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                onToggle();
            }
        };
        window.addEventListener('pointerdown', handlePointerDown, true);
        return () => window.removeEventListener('pointerdown', handlePointerDown, true);
    }, [isOpen, onToggle]);

    return (
        <>
            {/* 歯車ボタン */}
            <button
                type="button"
                onClick={onToggle}
                className="pointer-events-auto absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded bg-black/60 text-white hover:bg-black/80"
                title="ページ設定"
            >
                <Settings size={16} />
            </button>

            {/* 設定パネル */}
            {isOpen && (
                <div
                    ref={panelRef}
                    className="pointer-events-auto absolute right-0 top-0 z-20 flex h-full w-64 flex-col gap-6 overflow-y-auto bg-surface-900/95 p-5 shadow-xl"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">ページ設定</span>
                        <button
                            type="button"
                            onClick={onToggle}
                            className="text-surface-400 hover:text-white"
                            title="閉じる"
                        >
                            ✕
                        </button>
                    </div>

                    {/* ページモード */}
                    <section className="flex flex-col gap-2">
                        <span className="text-xs font-medium text-surface-400">ページモード</span>
                        <RadioGroup
                            name="pageMode"
                            value={pageMode}
                            onChange={(v) => setPageMode(v as MangaPageMode)}
                            options={[
                                { value: 'spread', label: '見開き' },
                                { value: 'single', label: '単ページ' },
                            ]}
                        />
                    </section>

                    {/* 本を開く方向 */}
                    <section className="flex flex-col gap-2">
                        <span className="text-xs font-medium text-surface-400">本を開く方向</span>
                        <RadioGroup
                            name="bindingDirection"
                            value={bindingDirection}
                            onChange={(v) => setBindingDirection(v as MangaBindingDirection)}
                            options={[
                                { value: 'rtl', label: '右開き（← 次ページ）' },
                                { value: 'ltr', label: '左開き（→ 次ページ）' },
                            ]}
                        />
                    </section>

                    {/* 最初のページを単独表示 */}
                    <section className="flex flex-col gap-2">
                        <span className="text-xs font-medium text-surface-400">最初のページを単独表示</span>
                        <label className={`flex cursor-pointer items-center gap-2 ${pageMode === 'single' ? 'opacity-40' : ''}`}>
                            <input
                                type="checkbox"
                                checked={firstPageSingle}
                                disabled={pageMode === 'single'}
                                onChange={(e) => setFirstPageSingle(e.target.checked)}
                                className="h-4 w-4 accent-primary-500"
                            />
                            <span className="text-sm text-white">表紙を単独表示（表紙＋見開き）</span>
                        </label>
                    </section>
                </div>
            )}
        </>
    );
});
MangaViewerSettingsPanel.displayName = 'MangaViewerSettingsPanel';

// ─── ローカルコンポーネント ────────────────────────────────────────────────────

interface RadioOption { value: string; label: string }

const RadioGroup = React.memo<{
    name: string;
    value: string;
    onChange: (value: string) => void;
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
