import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { SettingsSection } from './SettingsSection';

const MAX_QUICK_TEXTS = 20;

export const RenameQuickTextSection: React.FC = React.memo(() => {
    const renameQuickTexts = useSettingsStore((s) => s.renameQuickTexts);
    const setRenameQuickTexts = useSettingsStore((s) => s.setRenameQuickTexts);
    const [inputValue, setInputValue] = useState('');

    const handleAdd = () => {
        const trimmed = inputValue.trim();
        if (!trimmed) return;
        if (renameQuickTexts.includes(trimmed)) return;
        if (renameQuickTexts.length >= MAX_QUICK_TEXTS) return;
        setRenameQuickTexts([...renameQuickTexts, trimmed]);
        setInputValue('');
    };

    const handleRemove = (index: number) => {
        setRenameQuickTexts(renameQuickTexts.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    const handleReset = () => setRenameQuickTexts([]);

    return (
        <SettingsSection
            title="リネーム用クイック挿入"
            description="ファイル名変更ダイアログにボタンとして表示されるテキストを登録できます。記号や定型文をワンクリックで挿入できます。"
            scope="global"
            onReset={handleReset}
            resetDisabled={renameQuickTexts.length === 0}
        >
            <div className="flex gap-2">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="挿入テキストを入力"
                    className="min-w-0 flex-1 rounded border border-surface-600 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 outline-none transition focus:border-primary-500"
                />
                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={!inputValue.trim() || renameQuickTexts.includes(inputValue.trim()) || renameQuickTexts.length >= MAX_QUICK_TEXTS}
                    className="inline-flex items-center gap-1 rounded bg-primary-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Plus size={14} />
                    追加
                </button>
            </div>
            {renameQuickTexts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {renameQuickTexts.map((text, index) => (
                        <span
                            key={`${text}-${index}`}
                            className="inline-flex items-center gap-1 rounded border border-surface-600 bg-surface-800 px-2 py-1 text-sm text-surface-200"
                        >
                            {text}
                            <button
                                type="button"
                                onClick={() => handleRemove(index)}
                                className="rounded p-0.5 text-surface-400 transition-colors hover:bg-surface-700 hover:text-surface-100"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            {renameQuickTexts.length >= MAX_QUICK_TEXTS && (
                <p className="text-xs text-amber-400">
                    登録上限（{MAX_QUICK_TEXTS}件）に達しています。
                </p>
            )}
        </SettingsSection>
    );
});

RenameQuickTextSection.displayName = 'RenameQuickTextSection';
