import React from 'react';
import { BookmarkPlus, Pencil, Trash2, X } from 'lucide-react';
import type { SmartFolderV1 } from '../../stores/useSmartFolderStore';

interface SidebarSmartFoldersSectionProps {
    sidebarCollapsed: boolean;
    activeSmartFolder: SmartFolderV1 | null;
    activeSmartFolderConditionStatus: 'matched' | 'changed' | 'none';
    smartFolderMutating: boolean;
    smartFolderLoading: boolean;
    smartFolders: SmartFolderV1[];
    activeSmartFolderId: string | null;
    smartFolderPreviewMap: Map<string, string>;
    onClearSmartFolderConditions: () => void;
    onOpenCreateSmartFolderEditor: () => void;
    onApplySmartFolder: (smartFolderId: string) => void;
    onOpenEditSmartFolderEditor: (smartFolderId: string) => void;
    onDeleteSmartFolder: (smartFolderId: string, smartFolderName: string) => void;
}

export const SidebarSmartFoldersSection = React.memo(({
    sidebarCollapsed,
    activeSmartFolder,
    activeSmartFolderConditionStatus,
    smartFolderMutating,
    smartFolderLoading,
    smartFolders,
    activeSmartFolderId,
    smartFolderPreviewMap,
    onClearSmartFolderConditions,
    onOpenCreateSmartFolderEditor,
    onApplySmartFolder,
    onOpenEditSmartFolderEditor,
    onDeleteSmartFolder,
}: SidebarSmartFoldersSectionProps) => {
    if (sidebarCollapsed) {
        return null;
    }

    return (
        <>
            <div className="border-t border-surface-700 my-2" />
            <div className="px-1 mb-2">
                <div className="flex items-center justify-between text-xs text-surface-400 mb-1">
                    <span className="font-medium">スマートフォルダ</span>
                    <span className="inline-flex items-center gap-1">
                        {activeSmartFolder && (
                            <button
                                type="button"
                                onClick={onClearSmartFolderConditions}
                                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-amber-300 hover:bg-surface-800"
                                title="範囲 / 検索 / タグ / 評価 / タイプの条件を解除"
                                disabled={smartFolderMutating}
                            >
                                <X size={12} />
                                解除
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onOpenCreateSmartFolderEditor}
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-surface-300 hover:bg-surface-800"
                            title="現在の条件を保存"
                            disabled={smartFolderMutating}
                        >
                            <BookmarkPlus size={12} />
                            保存
                        </button>
                    </span>
                </div>

                <div className={`mb-1 rounded border px-2 py-1 text-[10px] ${
                    activeSmartFolderConditionStatus === 'none'
                        ? 'border-surface-700 text-surface-500'
                        : activeSmartFolderConditionStatus === 'matched'
                            ? 'border-blue-500/30 text-blue-200'
                            : 'border-amber-500/40 text-amber-200'
                }`}>
                    {activeSmartFolderConditionStatus === 'none' ? (
                        <span>状態: 未適用</span>
                    ) : activeSmartFolderConditionStatus === 'matched' ? (
                        <span>適用中: {activeSmartFolder?.name}（保存条件と一致）</span>
                    ) : (
                        <span>適用中: {activeSmartFolder?.name}（条件変更済み / 解除可能）</span>
                    )}
                </div>

                {smartFolderLoading ? (
                    <div className="text-xs text-surface-500 px-2 py-1">読み込み中...</div>
                ) : smartFolders.length === 0 ? (
                    <div className="text-xs text-surface-500 px-2 py-1">保存済み条件はありません</div>
                ) : (
                    <div className="space-y-1">
                        {smartFolders.map((smartFolder) => {
                            const isActive = activeSmartFolderId === smartFolder.id;
                            return (
                                <button
                                    key={smartFolder.id}
                                    type="button"
                                    onClick={() => {
                                        if (isActive) {
                                            onClearSmartFolderConditions();
                                            return;
                                        }
                                        onApplySmartFolder(smartFolder.id);
                                    }}
                                    className={`w-full flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                                        isActive
                                            ? 'bg-blue-600 text-white'
                                            : 'text-surface-300 hover:bg-surface-800'
                                    }`}
                                    title={isActive
                                        ? `${smartFolder.name}（再クリックで解除）`
                                        : `${smartFolder.name}（クリックで適用）`}
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className="truncate block">{smartFolder.name}</span>
                                        <span className={`truncate block text-[10px] mt-0.5 ${
                                            isActive ? 'text-blue-100/90' : 'text-surface-500'
                                        }`}>
                                            {smartFolderPreviewMap.get(smartFolder.id)}
                                        </span>
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onOpenEditSmartFolderEditor(smartFolder.id);
                                            }}
                                            className={`rounded p-1 ${isActive ? 'hover:bg-blue-500/40' : 'hover:bg-surface-700'}`}
                                            title="条件編集"
                                        >
                                            <Pencil size={11} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onDeleteSmartFolder(smartFolder.id, smartFolder.name);
                                            }}
                                            className={`rounded p-1 ${isActive ? 'hover:bg-blue-500/40' : 'hover:bg-surface-700'}`}
                                            title="削除"
                                        >
                                            <Trash2 size={11} />
                                        </button>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
});

SidebarSmartFoldersSection.displayName = 'SidebarSmartFoldersSection';
