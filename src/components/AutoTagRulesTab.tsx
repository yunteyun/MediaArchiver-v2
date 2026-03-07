/**
 * AutoTagRulesTab - 自動タグ割り当てルール管理タブ
 * Phase 12-8 フェーズ2
 */

import React, { useState, useEffect } from 'react';
import { useTagStore, AutoTagRule, MatchTarget, MatchMode } from '../stores/useTagStore';
import { Plus, Trash2, Power, Tag, FolderOpen, FileText, Edit2, X, Check, Wand2, Tags } from 'lucide-react';
import { useFileStore } from '../stores/useFileStore';
import { useToastStore } from '../stores/useToastStore';

interface RuleFormData {
    tagId: string;
    keywords: string;
    target: MatchTarget;
    matchMode: MatchMode;
}

const MATCH_MODE_HELP = {
    partial: 'ファイル名やフォルダ名の一部に含まれる場合にマッチ',
    exact: 'ファイル名やフォルダ名と完全に一致する場合のみマッチ'
};

const TARGET_LABELS = {
    filename: 'ファイル名',
    foldername: 'フォルダ名',
    both: '両方'
};

export function AutoTagRulesTab() {
    const {
        autoTagRules,
        tags,
        loadAutoTagRules,
        createAutoTagRule,
        updateAutoTagRule,
        deleteAutoTagRule,
        getTagById
    } = useTagStore();
    const files = useFileStore((s) => s.files);
    const selectedIds = useFileStore((s) => s.selectedIds);
    const loadFileTagsCache = useFileStore((s) => s.loadFileTagsCache);
    const toastInfo = useToastStore((s) => s.info);
    const toastSuccess = useToastStore((s) => s.success);
    const toastError = useToastStore((s) => s.error);

    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isApplyingAutoTags, setIsApplyingAutoTags] = useState(false);
    const [isApplyingFilenameTags, setIsApplyingFilenameTags] = useState(false);
    const [formData, setFormData] = useState<RuleFormData>({
        tagId: '',
        keywords: '',
        target: 'both',
        matchMode: 'partial'
    });

    useEffect(() => {
        loadAutoTagRules();
    }, [loadAutoTagRules]);

    const resetForm = () => {
        setFormData({
            tagId: '',
            keywords: '',
            target: 'both',
            matchMode: 'partial'
        });
        setIsAdding(false);
        setEditingId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.tagId || !formData.keywords.trim()) return;

        const keywords = formData.keywords.split(',').map(k => k.trim()).filter(Boolean);

        if (editingId) {
            await updateAutoTagRule(editingId, {
                tagId: formData.tagId,
                keywords,
                target: formData.target,
                matchMode: formData.matchMode
            });
        } else {
            await createAutoTagRule(formData.tagId, keywords, formData.target, formData.matchMode);
        }

        resetForm();
    };

    const handleEdit = (rule: AutoTagRule) => {
        setEditingId(rule.id);
        setFormData({
            tagId: rule.tagId,
            keywords: rule.keywords.join(', '),
            target: rule.target,
            matchMode: rule.matchMode
        });
        setIsAdding(true);
    };

    const handleToggleEnabled = async (rule: AutoTagRule) => {
        await updateAutoTagRule(rule.id, { enabled: !rule.enabled });
    };

    const handleDelete = async (id: string) => {
        if (confirm('このルールを削除しますか？')) {
            await deleteAutoTagRule(id);
        }
    };

    const resolveTargetFileIds = () => (
        selectedIds.size > 0 ? Array.from(selectedIds) : files.map((file) => file.id)
    );

    const handleApplyAutoTags = async () => {
        const targetIds = resolveTargetFileIds();
        if (targetIds.length === 0) {
            toastInfo('適用するファイルがありません');
            return;
        }

        setIsApplyingAutoTags(true);
        try {
            const result = await window.electronAPI.applyAutoTagsToFiles(targetIds);
            if (result.tagsAssigned > 0) {
                await loadFileTagsCache();
                toastSuccess(`${result.filesUpdated}件のファイルに${result.tagsAssigned}個のタグを適用しました`);
            } else {
                toastInfo('適用されたタグはありませんでした');
            }
        } catch (error) {
            console.error('Auto tag apply error:', error);
            toastError('自動タグ適用中にエラーが発生しました');
        } finally {
            setIsApplyingAutoTags(false);
        }
    };

    const handleApplyFilenameBracketTags = async () => {
        const targetIds = resolveTargetFileIds();
        if (targetIds.length === 0) {
            toastInfo('適用するファイルがありません');
            return;
        }

        setIsApplyingFilenameTags(true);
        try {
            const preview = await window.electronAPI.previewFilenameBracketTags(targetIds);
            if (preview.candidateTagNames.length === 0) {
                toastInfo('[] / () 内にタグ候補が見つかりませんでした');
                return;
            }

            const sampleNames = preview.candidateTagNames.slice(0, 8).join(', ');
            const remainingCount = Math.max(preview.candidateTagNames.length - 8, 0);
            const targetLabel = selectedIds.size > 0
                ? `選択中の${targetIds.length}件`
                : `現在表示中の${targetIds.length}件`;
            const confirmed = window.confirm([
                `${targetLabel}からファイル名の [] / () 内の語句をタグとして適用します。`,
                '',
                `候補タグ: ${preview.candidateTagNames.length}件`,
                `新規作成予定: ${preview.newTagNames.length}件`,
                `候補が見つかったファイル: ${preview.filesWithCandidates}件`,
                '',
                `候補例: ${sampleNames}${remainingCount > 0 ? ` ほか${remainingCount}件` : ''}`,
                '',
                'このまま実行しますか？',
            ].join('\n'));
            if (!confirmed) {
                return;
            }

            const result = await window.electronAPI.applyFilenameBracketTagsToFiles(targetIds);
            if (result.tagsAssigned === 0 && result.tagsCreated === 0) {
                toastInfo('追加されたタグはありませんでした');
                return;
            }

            await Promise.all([
                loadFileTagsCache(),
                loadTags(),
            ]);
            toastSuccess(
                `${result.filesUpdated}件のファイルに${result.tagsAssigned}個のタグを適用しました` +
                (result.tagsCreated > 0 ? `（新規タグ ${result.tagsCreated}件作成）` : '')
            );
        } catch (error) {
            console.error('Filename bracket tag apply error:', error);
            toastError('ファイル名記号タグの適用中にエラーが発生しました');
        } finally {
            setIsApplyingFilenameTags(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="mb-4 rounded-lg border border-surface-700 bg-surface-900/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-semibold text-surface-100">タグ補助操作</h3>
                        <p className="mt-1 text-xs leading-relaxed text-surface-400">
                            現在表示中または選択中のファイルを対象に、低頻度の一括タグ操作を手動実行します。
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handleApplyAutoTags}
                            disabled={isApplyingAutoTags || isApplyingFilenameTags}
                            className="inline-flex items-center gap-1.5 rounded bg-primary-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-primary-500 disabled:bg-surface-700 disabled:text-surface-500"
                            title={selectedIds.size > 0 ? `選択中の${selectedIds.size}件に自動タグを適用` : '現在表示中のファイルに自動タグを適用'}
                        >
                            <Wand2 size={16} className={isApplyingAutoTags ? 'animate-spin' : ''} />
                            {isApplyingAutoTags ? '適用中...' : '自動タグ適用'}
                        </button>
                        <button
                            type="button"
                            onClick={handleApplyFilenameBracketTags}
                            disabled={isApplyingAutoTags || isApplyingFilenameTags}
                            className="inline-flex items-center gap-1.5 rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 transition-colors hover:bg-surface-700 disabled:bg-surface-700 disabled:text-surface-500"
                            title={selectedIds.size > 0 ? `選択中の${selectedIds.size}件から [] / () 内の語句をタグ化` : '現在表示中のファイルから [] / () 内の語句をタグ化'}
                        >
                            <Tags size={16} className={isApplyingFilenameTags ? 'animate-pulse' : ''} />
                            {isApplyingFilenameTags ? '確認中...' : 'ファイル名記号タグ'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-surface-100">自動タグ割り当てルール</h3>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded bg-primary-600 hover:bg-primary-500 text-white text-sm"
                >
                    <Plus size={16} />
                    新規ルール
                </button>
            </div>

            {/* Add/Edit Form */}
            {isAdding && (
                <form onSubmit={handleSubmit} className="mb-4 p-4 rounded-lg bg-surface-800 border border-surface-700">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        {/* Tag Selection */}
                        <div>
                            <label className="block text-sm text-surface-300 mb-1">タグ</label>
                            <select
                                value={formData.tagId}
                                onChange={(e) => setFormData({ ...formData, tagId: e.target.value })}
                                className="w-full px-3 py-2 rounded bg-surface-700 border border-surface-600 text-surface-100"
                                required
                            >
                                <option value="">選択してください</option>
                                {tags.map(tag => (
                                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Target Selection */}
                        <div>
                            <label className="block text-sm text-surface-300 mb-1">対象</label>
                            <select
                                value={formData.target}
                                onChange={(e) => setFormData({ ...formData, target: e.target.value as MatchTarget })}
                                className="w-full px-3 py-2 rounded bg-surface-700 border border-surface-600 text-surface-100"
                            >
                                <option value="filename">ファイル名</option>
                                <option value="foldername">フォルダ名</option>
                                <option value="both">両方</option>
                            </select>
                        </div>
                    </div>

                    {/* Keywords */}
                    <div className="mb-4">
                        <label className="block text-sm text-surface-300 mb-1">キーワード（カンマ区切り）</label>
                        <input
                            type="text"
                            value={formData.keywords}
                            onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                            placeholder="例: 風景, 山, 海"
                            className="w-full px-3 py-2 rounded bg-surface-700 border border-surface-600 text-surface-100 placeholder-surface-500"
                            required
                        />
                    </div>

                    {/* Match Mode */}
                    <div className="mb-4">
                        <label className="block text-sm text-surface-300 mb-1">マッチモード</label>
                        <select
                            value={formData.matchMode}
                            onChange={(e) => setFormData({ ...formData, matchMode: e.target.value as MatchMode })}
                            className="w-full px-3 py-2 rounded bg-surface-700 border border-surface-600 text-surface-100"
                        >
                            <option value="partial">部分一致</option>
                            <option value="exact">完全一致</option>
                        </select>
                        <p className="text-xs text-surface-400 mt-1">{MATCH_MODE_HELP[formData.matchMode]}</p>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="flex items-center gap-1 px-3 py-1.5 rounded bg-surface-700 hover:bg-surface-600 text-surface-300"
                        >
                            <X size={16} />
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            className="flex items-center gap-1 px-3 py-1.5 rounded bg-primary-600 hover:bg-primary-500 text-white"
                        >
                            <Check size={16} />
                            {editingId ? '更新' : '作成'}
                        </button>
                    </div>
                </form>
            )}

            {/* Rules List */}
            <div className="flex-1 overflow-y-auto space-y-2">
                {autoTagRules.length === 0 ? (
                    <div className="text-center text-surface-400 py-8">
                        ルールがありません。「新規ルール」をクリックして追加してください。
                    </div>
                ) : (
                    autoTagRules.map(rule => {
                        const tag = getTagById(rule.tagId);
                        return (
                            <div
                                key={rule.id}
                                className={`p-3 rounded-lg border ${rule.enabled
                                        ? 'bg-surface-800 border-surface-700'
                                        : 'bg-surface-800/50 border-surface-700/50 opacity-60'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Tag size={16} className="text-primary-400" />
                                        <span
                                            className="px-2 py-0.5 rounded text-sm"
                                            style={{ backgroundColor: tag?.color || '#666', color: '#fff' }}
                                        >
                                            {tag?.name || '不明'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleToggleEnabled(rule)}
                                            className={`p-1.5 rounded ${rule.enabled
                                                    ? 'text-green-400 hover:bg-green-400/20'
                                                    : 'text-surface-500 hover:bg-surface-700'
                                                }`}
                                            title={rule.enabled ? '無効化' : '有効化'}
                                        >
                                            <Power size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleEdit(rule)}
                                            className="p-1.5 rounded text-surface-400 hover:bg-surface-700"
                                            title="編集"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(rule.id)}
                                            className="p-1.5 rounded text-red-400 hover:bg-red-400/20"
                                            title="削除"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-1 mb-2">
                                    {rule.keywords.map((kw, i) => (
                                        <span key={i} className="px-2 py-0.5 rounded bg-surface-700 text-surface-300 text-xs">
                                            {kw}
                                        </span>
                                    ))}
                                </div>

                                <div className="flex items-center gap-3 text-xs text-surface-400">
                                    <span className="flex items-center gap-1">
                                        {rule.target === 'filename' && <FileText size={12} />}
                                        {rule.target === 'foldername' && <FolderOpen size={12} />}
                                        {rule.target === 'both' && (
                                            <>
                                                <FileText size={12} />
                                                <FolderOpen size={12} />
                                            </>
                                        )}
                                        {TARGET_LABELS[rule.target]}
                                    </span>
                                    <span>
                                        {rule.matchMode === 'partial' ? '部分一致' : '完全一致'}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
