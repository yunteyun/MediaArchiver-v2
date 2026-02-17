import React from 'react';
import { FileText, Check } from 'lucide-react';

interface MemoSectionProps {
    notes: string;
    saveStatus: 'idle' | 'saving' | 'saved';
    onChange: (value: string) => void;
    onBlur: () => void;
}

export const MemoSection = React.memo<MemoSectionProps>(({
    notes,
    saveStatus,
    onChange,
    onBlur
}) => {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <FileText size={14} className="text-surface-400" />
                <h3 className="text-sm font-medium text-surface-300">メモ</h3>
                {saveStatus === 'saving' && (
                    <span className="text-xs text-surface-500">保存中...</span>
                )}
                {saveStatus === 'saved' && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                        <Check size={12} />
                        保存済み
                    </span>
                )}
            </div>
            <textarea
                value={notes}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                placeholder="メモを入力..."
                className="w-full h-24 bg-black/30 text-white text-sm px-3 py-2 rounded border border-white/20 resize-none focus:outline-none focus:border-primary-500 placeholder-surface-500"
            />
        </div>
    );
});

MemoSection.displayName = 'MemoSection';
