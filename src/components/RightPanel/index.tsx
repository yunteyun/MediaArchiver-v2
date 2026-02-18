import React from 'react';
import { useFileStore } from '../../stores/useFileStore';
import { PreviewSection } from './PreviewSection';
import { BasicInfoSection } from './BasicInfoSection';
import { TagSection } from './TagSection';

export const RightPanel: React.FC = () => {
    const focusedId = useFileStore((s) => s.focusedId);
    const fileMap = useFileStore((s) => s.fileMap);

    // focusedId から O(1) でファイルを取得
    const file = focusedId ? fileMap.get(focusedId) : undefined;

    return (
        <aside className="w-[240px] shrink-0 h-full flex flex-col bg-surface-900 border-l border-surface-700 overflow-hidden">
            {file ? (
                <>
                    <PreviewSection file={file} />
                    <div className="flex-1 overflow-y-auto">
                        <BasicInfoSection file={file} />
                        <TagSection file={file} />
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-surface-500 px-6 text-center">
                    <svg className="w-12 h-12 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm">グリッドでファイルを選択してください</p>
                </div>
            )}
        </aside>
    );
};
