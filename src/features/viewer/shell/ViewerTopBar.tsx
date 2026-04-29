import React from 'react';
import { X } from 'lucide-react';

interface ViewerTopBarProps {
    fileName: string;
    onClose: () => void;
}

export const ViewerTopBar: React.FC<ViewerTopBarProps> = ({ fileName, onClose }) => (
    <div className="pointer-events-auto flex h-12 flex-shrink-0 items-center justify-between px-5">
        <div className="min-w-0 flex-1 pr-4">
            <p className="truncate text-sm font-medium text-surface-200" title={fileName}>
                {fileName}
            </p>
        </div>
        <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-surface-600 bg-viewer-surface text-surface-100 shadow-lg transition hover:bg-surface-900"
            title="閉じる (Esc)"
        >
            <X size={18} />
        </button>
    </div>
);
