import React from 'react';
import { ArrowDown, ArrowUp, BookmarkPlus, Copy, Pencil, Sparkles, Trash2, X } from 'lucide-react';
import type { SmartFolderV1 } from '../../stores/useSmartFolderStore';
import { useRatingDisplay } from '../ratings/useRatingDisplay';

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
    onOpenTemplateSmartFolderEditor: (templateKey: 'midOrAbove' | 'unrated') => void;
    onApplySmartFolder: (smartFolderId: string) => void;
    onDuplicateSmartFolder: (smartFolderId: string) => void;
    onMoveSmartFolder: (smartFolderId: string, direction: 'up' | 'down') => void;
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
    onOpenTemplateSmartFolderEditor,
    onApplySmartFolder,
    onDuplicateSmartFolder,
    onMoveSmartFolder,
    onOpenEditSmartFolderEditor,
    onDeleteSmartFolder,
}: SidebarSmartFoldersSectionProps) => {
    const { getQuickFilterLabel } = useRatingDisplay();
    if (sidebarCollapsed) {
        return null;
    }

    return (
        <div className="px-2 pb-1">
            <div className="mb-2 flex items-center justify-end gap-1">
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

            <div className="mb-2 flex flex-wrap gap-1">
                <button
                    type="button"
                    onClick={() => onOpenTemplateSmartFolderEditor('midOrAbove')}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-surface-300 hover:bg-surface-800"
                    title={`${getQuickFilterLabel('midOrAbove')} のテンプレートから作成`}
                >
                    <Sparkles size={11} />
                    {getQuickFilterLabel('midOrAbove')}
                </button>
                <button
                    type="button"
                    onClick={() => onOpenTemplateSmartFolderEditor('unrated')}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-surface-300 hover:bg-surface-800"
                    title={`${getQuickFilterLabel('unrated')} のテンプレートから作成`}
                >
                    <Sparkles size={11} />
                    {getQuickFilterLabel('unrated')}
                </button>
            </div>

            {smartFolderLoading ? (
                <div className="px-2 py-1 text-xs text-surface-500">読み込み中...</div>
            ) : smartFolders.length === 0 ? (
                <div className="px-2 py-1 text-xs text-surface-500">保存済み条件はありません</div>
            ) : (
                <div className="space-y-1">
                    {smartFolders.map((smartFolder, index) => {
                        const isActive = activeSmartFolderId === smartFolder.id;
                        const canMoveUp = index > 0;
                        const canMoveDown = index < smartFolders.length - 1;
                        return (
                            <div
                                key={smartFolder.id}
                                className={`w-full flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                                    isActive
                                        ? 'bg-blue-600 text-white'
                                        : 'text-surface-300 hover:bg-surface-800'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isActive) {
                                            onClearSmartFolderConditions();
                                            return;
                                        }
                                        onApplySmartFolder(smartFolder.id);
                                    }}
                                    className="min-w-0 flex-1 text-left"
                                    title={isActive
                                        ? `${smartFolder.name}（再クリックで解除）`
                                        : `${smartFolder.name}（クリックで適用）`}
                                >
                                    <span className="block truncate">{smartFolder.name}</span>
                                    <span className={`mt-0.5 block truncate text-[10px] ${
                                        isActive ? 'text-blue-100/90' : 'text-surface-500'
                                    }`}>
                                        {smartFolderPreviewMap.get(smartFolder.id)}
                                    </span>
                                </button>
                                <span className="inline-flex flex-shrink-0 items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => onMoveSmartFolder(smartFolder.id, 'up')}
                                        className={`rounded p-1 ${isActive ? 'hover:bg-blue-500/40' : 'hover:bg-surface-700'} ${canMoveUp ? '' : 'cursor-default opacity-40'}`}
                                        title="上へ移動"
                                        disabled={!canMoveUp}
                                    >
                                        <ArrowUp size={11} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onMoveSmartFolder(smartFolder.id, 'down')}
                                        className={`rounded p-1 ${isActive ? 'hover:bg-blue-500/40' : 'hover:bg-surface-700'} ${canMoveDown ? '' : 'cursor-default opacity-40'}`}
                                        title="下へ移動"
                                        disabled={!canMoveDown}
                                    >
                                        <ArrowDown size={11} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDuplicateSmartFolder(smartFolder.id)}
                                        className={`rounded p-1 ${isActive ? 'hover:bg-blue-500/40' : 'hover:bg-surface-700'}`}
                                        title="複製"
                                    >
                                        <Copy size={11} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onOpenEditSmartFolderEditor(smartFolder.id)}
                                        className={`rounded p-1 ${isActive ? 'hover:bg-blue-500/40' : 'hover:bg-surface-700'}`}
                                        title="条件編集"
                                    >
                                        <Pencil size={11} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDeleteSmartFolder(smartFolder.id, smartFolder.name)}
                                        className={`rounded p-1 ${isActive ? 'hover:bg-blue-500/40' : 'hover:bg-surface-700'}`}
                                        title="削除"
                                    >
                                        <Trash2 size={11} />
                                    </button>
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
});

SidebarSmartFoldersSection.displayName = 'SidebarSmartFoldersSection';
