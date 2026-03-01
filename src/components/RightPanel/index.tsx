import React from 'react';
import { useFileStore } from '../../stores/useFileStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useUIStore } from '../../stores/useUIStore';
import { FileHeaderSection } from './FileHeaderSection';
import { PreviewSection } from './PreviewSection';
import { EditMetaSection } from './EditMetaSection';
import { MemoSection } from './MemoSection';
import { BasicInfoSection } from './BasicInfoSection';
import { ArchivePreviewSection } from './ArchivePreviewSection';
import type { MediaFolder } from '../../types/file';

export const RightPanel: React.FC = () => {
    const focusedId = useFileStore((s) => s.focusedId);
    const fileMap = useFileStore((s) => s.fileMap);
    const activeProfileId = useSettingsStore((s) => s.activeProfileId);
    const lightboxFile = useUIStore((s) => s.lightboxFile);
    const [folderPathById, setFolderPathById] = React.useState<Map<string, string>>(new Map());

    // 中央カラム内ビューア表示中は、そのファイルを優先して右パネルへ表示する
    const file = lightboxFile ?? (focusedId ? fileMap.get(focusedId) : undefined);
    const rootFolderPath = file?.rootFolderId ? (folderPathById.get(file.rootFolderId) ?? null) : null;

    React.useEffect(() => {
        let disposed = false;
        window.electronAPI.getFolders()
            .then((folders) => {
                if (disposed) return;
                const next = new Map<string, string>();
                (folders as MediaFolder[]).forEach((folder) => {
                    next.set(folder.id, folder.path);
                });
                setFolderPathById(next);
            })
            .catch((err) => {
                console.error('Failed to load folders for RightPanel:', err);
                if (!disposed) {
                    setFolderPathById(new Map());
                }
            });

        return () => {
            disposed = true;
        };
    }, [activeProfileId]);

    return (
        <aside className="w-[300px] shrink-0 h-full flex flex-col bg-surface-900 border-l border-surface-700 overflow-hidden">
            {file ? (
                <>
                    <div className="flex-1 overflow-y-auto">
                        <PreviewSection file={file} />
                        <FileHeaderSection file={file} />
                        <EditMetaSection file={file} />
                        <MemoSection file={file} />
                        <ArchivePreviewSection file={file} />
                        <BasicInfoSection file={file} rootFolderPath={rootFolderPath} />
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
