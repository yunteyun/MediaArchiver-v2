import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { AUTO_ORGANIZE_RENAME_TOKENS } from '../../shared/autoOrganizeRename';
import type { AutoOrganizeConditionV1, AutoOrganizeRuleV1 } from '../../types/autoOrganize';
import type { Tag } from '../../stores/useTagStore';
import type { RatingAxis } from '../../stores/useRatingStore';
import type { MediaFile } from '../../types/file';
import type { RatingQuickFilter, SearchCondition, SearchTarget } from '../../stores/useUIStore';

interface FolderOption {
    value: string;
    label: string;
}

interface TargetFolderOption {
    id: string;
    label: string;
}

interface SubmitPayload {
    name: string;
    enabled: boolean;
    condition: AutoOrganizeConditionV1;
    action: AutoOrganizeRuleV1['action'];
}

interface AutoOrganizeRuleEditorDialogProps {
    isOpen: boolean;
    title: string;
    submitLabel: string;
    initialRule?: AutoOrganizeRuleV1 | null;
    folderOptions: FolderOption[];
    targetFolderOptions: TargetFolderOption[];
    tags: Tag[];
    ratingAxes: RatingAxis[];
    isSubmitting?: boolean;
    onClose: () => void;
    onSubmit: (payload: SubmitPayload) => Promise<void> | void;
}

type RatingInputMap = Record<string, { min: string; max: string }>;
const FILE_TYPES: MediaFile['type'][] = ['video', 'image', 'archive', 'audio'];
const FILE_TYPE_OPTIONS: Array<{ value: MediaFile['type']; label: string }> = [
    { value: 'video', label: '動画' },
    { value: 'image', label: '画像' },
    { value: 'archive', label: '書庫' },
    { value: 'audio', label: '音声' },
];
const SEARCH_TARGET_OPTIONS: Array<{ value: SearchTarget; label: string }> = [
    { value: 'fileName', label: 'ファイル名' },
    { value: 'folderName', label: 'フォルダ名' },
];
const RATING_QUICK_FILTER_OPTIONS: Array<{ value: RatingQuickFilter; label: string }> = [
    { value: 'none', label: 'なし' },
    { value: 'overall4plus', label: '総合評価 4+' },
    { value: 'unrated', label: '未評価のみ' },
];

function normalizeTypes(input: unknown): MediaFile['type'][] {
    if (!Array.isArray(input)) return [...FILE_TYPES];
    const normalized = Array.from(new Set(
        input.filter((type): type is MediaFile['type'] => (
            type === 'video' || type === 'image' || type === 'archive' || type === 'audio'
        ))
    ));
    return normalized.length > 0 ? normalized : [...FILE_TYPES];
}

function normalizeTextConditions(input: unknown, fallbackText?: string, fallbackTarget?: SearchTarget): SearchCondition[] {
    const fromList = Array.isArray(input)
        ? input.map((item) => {
            const candidate = item && typeof item === 'object' ? (item as Partial<SearchCondition>) : {};
            const text = typeof candidate.text === 'string' ? candidate.text.trim() : '';
            if (!text) return null;
            return {
                text,
                target: candidate.target === 'folderName' ? 'folderName' : 'fileName',
            } as SearchCondition;
        }).filter((item): item is SearchCondition => item !== null)
        : [];

    if (fromList.length > 0) return fromList;
    const legacyText = typeof fallbackText === 'string' ? fallbackText.trim() : '';
    if (!legacyText) return [];
    return [{ text: legacyText, target: fallbackTarget === 'folderName' ? 'folderName' : 'fileName' }];
}

function createRatingInputMap(condition: AutoOrganizeConditionV1): RatingInputMap {
    const next: RatingInputMap = {};
    Object.entries(condition.ratings || {}).forEach(([axisId, range]) => {
        next[axisId] = {
            min: typeof range.min === 'number' ? String(range.min) : '',
            max: typeof range.max === 'number' ? String(range.max) : '',
        };
    });
    return next;
}

function parseOptionalNumber(value: string): number | undefined {
    if (!value.trim()) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

const DEFAULT_CONDITION: AutoOrganizeConditionV1 = {
    folderSelection: '__all__',
    text: '',
    textMatchTarget: 'fileName',
    textConditions: [],
    ratingQuickFilter: 'none',
    tags: { ids: [], mode: 'OR' },
    ratings: {},
    types: [...FILE_TYPES],
};

export const AutoOrganizeRuleEditorDialog: React.FC<AutoOrganizeRuleEditorDialogProps> = ({
    isOpen,
    title,
    submitLabel,
    initialRule,
    folderOptions,
    targetFolderOptions,
    tags,
    ratingAxes,
    isSubmitting = false,
    onClose,
    onSubmit,
}) => {
    const condition = initialRule?.condition ?? DEFAULT_CONDITION;
    const [name, setName] = useState(initialRule?.name ?? '');
    const [enabled, setEnabled] = useState(initialRule?.enabled ?? true);
    const [folderSelection, setFolderSelection] = useState(condition.folderSelection ?? '__all__');
    const [textConditions, setTextConditions] = useState<SearchCondition[]>(() => {
        const normalized = normalizeTextConditions(condition.textConditions, condition.text, condition.textMatchTarget);
        return normalized.length > 0 ? normalized : [{ text: '', target: 'fileName' }];
    });
    const [tagIds, setTagIds] = useState<string[]>(condition.tags.ids);
    const [tagMode, setTagMode] = useState<'AND' | 'OR'>(condition.tags.mode === 'AND' ? 'AND' : 'OR');
    const [ratingQuickFilter, setRatingQuickFilter] = useState<RatingQuickFilter>(condition.ratingQuickFilter ?? 'none');
    const [ratingInputs, setRatingInputs] = useState<RatingInputMap>(() => createRatingInputMap(condition));
    const [tagSearch, setTagSearch] = useState('');
    const [types, setTypes] = useState<MediaFile['type'][]>(() => normalizeTypes(condition.types));
    const [moveEnabled, setMoveEnabled] = useState(initialRule?.action.move.enabled ?? true);
    const [targetFolderId, setTargetFolderId] = useState(initialRule?.action.move.targetFolderId ?? targetFolderOptions[0]?.id ?? '');
    const [renameEnabled, setRenameEnabled] = useState(initialRule?.action.rename.enabled ?? false);
    const [renameTemplate, setRenameTemplate] = useState(initialRule?.action.rename.template ?? '{name}');

    useEffect(() => {
        if (!isOpen) return;
        const nextCondition = initialRule?.condition ?? DEFAULT_CONDITION;
        setName(initialRule?.name ?? '');
        setEnabled(initialRule?.enabled ?? true);
        setFolderSelection(nextCondition.folderSelection ?? '__all__');
        const normalizedTextConditions = normalizeTextConditions(nextCondition.textConditions, nextCondition.text, nextCondition.textMatchTarget);
        setTextConditions(normalizedTextConditions.length > 0 ? normalizedTextConditions : [{ text: '', target: 'fileName' }]);
        setTagIds([...nextCondition.tags.ids]);
        setTagMode(nextCondition.tags.mode === 'AND' ? 'AND' : 'OR');
        setRatingQuickFilter(nextCondition.ratingQuickFilter ?? 'none');
        setRatingInputs(createRatingInputMap(nextCondition));
        setTagSearch('');
        setTypes(normalizeTypes(nextCondition.types));
        setMoveEnabled(initialRule?.action.move.enabled ?? true);
        setTargetFolderId(initialRule?.action.move.targetFolderId ?? targetFolderOptions[0]?.id ?? '');
        setRenameEnabled(initialRule?.action.rename.enabled ?? false);
        setRenameTemplate(initialRule?.action.rename.template ?? '{name}');
    }, [initialRule, isOpen, targetFolderOptions]);

    const filteredTags = useMemo(() => {
        const query = tagSearch.trim().toLowerCase();
        if (!query) return tags;
        return tags.filter((tag) => tag.name.toLowerCase().includes(query));
    }, [tagSearch, tags]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-[780px] max-w-[calc(100vw-2rem)] rounded-xl border border-surface-700 bg-surface-900 shadow-xl">
                <div className="flex items-center justify-between border-b border-surface-700 px-4 py-3">
                    <h2 className="text-base font-semibold text-white">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded p-1 text-surface-300 hover:bg-surface-800 hover:text-white transition-colors"
                        aria-label="閉じる"
                        disabled={isSubmitting}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="grid gap-3 px-4 py-4">
                    <div className="rounded border border-surface-700 bg-surface-900/40 p-3">
                        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                            <div>
                                <label className="mb-1 block text-xs text-surface-400">ルール名</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    className="w-full rounded border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 focus:border-primary-500 focus:outline-none"
                                    placeholder="自動整理ルール名"
                                    maxLength={80}
                                />
                            </div>
                            <label className="inline-flex items-center gap-2 rounded border border-surface-700 bg-surface-900/50 px-3 py-2 text-sm text-surface-200">
                                <input
                                    type="checkbox"
                                    checked={enabled}
                                    onChange={(event) => setEnabled(event.target.checked)}
                                    className="h-4 w-4 accent-primary-500"
                                />
                                有効
                            </label>
                        </div>
                    </div>

                    <div className="rounded border border-surface-700 bg-surface-900/40 p-3">
                        <label className="mb-1 block text-xs text-surface-400">対象範囲</label>
                        <select
                            value={folderSelection}
                            onChange={(event) => setFolderSelection(event.target.value)}
                            className="w-full rounded border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 focus:border-primary-500 focus:outline-none"
                        >
                            {folderOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="rounded border border-surface-700 bg-surface-900/40 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <label className="block text-xs text-surface-400">実行内容</label>
                            <div className="text-[11px] text-surface-500">少なくとも 1 つ有効にしてください</div>
                        </div>
                        <div className="mt-3 grid gap-3">
                            <div className="rounded border border-surface-800 bg-surface-950/25 p-3">
                                <label className="inline-flex items-center gap-2 text-sm text-surface-200">
                                    <input
                                        type="checkbox"
                                        checked={moveEnabled}
                                        onChange={(event) => setMoveEnabled(event.target.checked)}
                                        className="h-4 w-4 accent-primary-500"
                                    />
                                    移動
                                </label>
                                <div className="mt-2">
                                    <label className="mb-1 block text-xs text-surface-400">移動先フォルダ</label>
                                    <select
                                        value={targetFolderId}
                                        onChange={(event) => setTargetFolderId(event.target.value)}
                                        disabled={!moveEnabled}
                                        className="w-full rounded border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 focus:border-primary-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {targetFolderOptions.map((option) => (
                                            <option key={option.id} value={option.id}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="rounded border border-surface-800 bg-surface-950/25 p-3">
                                <label className="inline-flex items-center gap-2 text-sm text-surface-200">
                                    <input
                                        type="checkbox"
                                        checked={renameEnabled}
                                        onChange={(event) => setRenameEnabled(event.target.checked)}
                                        className="h-4 w-4 accent-primary-500"
                                    />
                                    リネーム
                                </label>
                                <div className="mt-2">
                                    <label className="mb-1 block text-xs text-surface-400">リネームテンプレート</label>
                                    <input
                                        type="text"
                                        value={renameTemplate}
                                        onChange={(event) => setRenameTemplate(event.target.value)}
                                        disabled={!renameEnabled}
                                        className="w-full rounded border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 focus:border-primary-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="{name}"
                                    />
                                    <div className="mt-2 text-[11px] text-surface-500">
                                        拡張子は維持されます。使用可能トークン: {AUTO_ORGANIZE_RENAME_TOKENS.join(' / ')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded border border-surface-700 bg-surface-900/40 p-3">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs text-surface-400">検索条件</label>
                            <button
                                type="button"
                                onClick={() => setTextConditions((prev) => [...prev, { text: '', target: 'fileName' }])}
                                className="rounded px-2 py-0.5 text-[11px] text-surface-300 hover:bg-surface-800"
                            >
                                + 条件追加
                            </button>
                        </div>
                        <div className="mt-2 space-y-2">
                            {textConditions.map((conditionItem, index) => (
                                <div key={`${index}-${conditionItem.target}`} className="grid grid-cols-[110px_1fr_auto] items-center gap-2">
                                    <select
                                        value={conditionItem.target}
                                        onChange={(event) => {
                                            const nextTarget = event.target.value as SearchTarget;
                                            setTextConditions((prev) => prev.map((item, itemIndex) => (
                                                itemIndex === index ? { ...item, target: nextTarget } : item
                                            )));
                                        }}
                                        className="rounded border border-surface-700 bg-surface-900 px-2 py-1 text-xs text-surface-200 focus:border-primary-500 focus:outline-none"
                                    >
                                        {SEARCH_TARGET_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        value={conditionItem.text}
                                        onChange={(event) => {
                                            const nextText = event.target.value;
                                            setTextConditions((prev) => prev.map((item, itemIndex) => (
                                                itemIndex === index ? { ...item, text: nextText } : item
                                            )));
                                        }}
                                        className="w-full rounded border border-surface-700 bg-surface-900 px-3 py-1.5 text-xs text-surface-200 focus:border-primary-500 focus:outline-none"
                                        placeholder={conditionItem.target === 'folderName' ? 'フォルダ名で検索' : 'ファイル名で検索'}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTextConditions((prev) => {
                                                if (prev.length <= 1) return [{ text: '', target: 'fileName' }];
                                                return prev.filter((_, itemIndex) => itemIndex !== index);
                                            });
                                        }}
                                        className="rounded px-2 py-1 text-[11px] text-surface-500 hover:bg-surface-800 hover:text-surface-300"
                                    >
                                        削除
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded border border-surface-700 bg-surface-900/40 p-3">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs text-surface-400">ファイルタイプ</label>
                            {types.length < FILE_TYPES.length && (
                                <button
                                    type="button"
                                    onClick={() => setTypes([...FILE_TYPES])}
                                    className="rounded px-2 py-0.5 text-[11px] text-surface-400 hover:bg-surface-800 hover:text-surface-200"
                                >
                                    全タイプ
                                </button>
                            )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {FILE_TYPE_OPTIONS.map((option) => {
                                const active = types.includes(option.value);
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            setTypes((prev) => {
                                                if (prev.includes(option.value)) {
                                                    if (prev.length === 1) return prev;
                                                    return prev.filter((type) => type !== option.value);
                                                }
                                                return [...prev, option.value];
                                            });
                                        }}
                                        className={`rounded px-2 py-1 text-xs transition-colors ${
                                            active ? 'bg-primary-600 text-white' : 'bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="rounded border border-surface-700 bg-surface-900/40 p-3">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs text-surface-400">タグ条件</label>
                            <div className="inline-flex rounded border border-surface-700 bg-surface-900 p-0.5 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setTagMode('OR')}
                                    className={`rounded px-2 py-0.5 ${tagMode === 'OR' ? 'bg-primary-600 text-white' : 'text-surface-400 hover:text-surface-200'}`}
                                >
                                    OR
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTagMode('AND')}
                                    className={`rounded px-2 py-0.5 ${tagMode === 'AND' ? 'bg-primary-600 text-white' : 'text-surface-400 hover:text-surface-200'}`}
                                >
                                    AND
                                </button>
                            </div>
                        </div>
                        <input
                            type="text"
                            value={tagSearch}
                            onChange={(event) => setTagSearch(event.target.value)}
                            className="mt-2 w-full rounded border border-surface-700 bg-surface-900 px-2 py-1.5 text-xs text-surface-200 focus:border-primary-500 focus:outline-none"
                            placeholder="タグを検索"
                        />
                        <div className="mt-2 max-h-36 overflow-auto rounded border border-surface-800 bg-surface-900/50 p-2">
                            {filteredTags.length === 0 ? (
                                <div className="text-xs text-surface-500">一致するタグがありません</div>
                            ) : (
                                <div className="grid grid-cols-2 gap-1">
                                    {filteredTags.map((tag) => {
                                        const checked = tagIds.includes(tag.id);
                                        return (
                                            <label key={tag.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-surface-800 text-xs text-surface-200">
                                                <input
                                                    type="checkbox"
                                                    className="h-3.5 w-3.5 accent-primary-500"
                                                    checked={checked}
                                                    onChange={(event) => {
                                                        const isChecked = event.target.checked;
                                                        setTagIds((prev) => {
                                                            if (isChecked) return prev.includes(tag.id) ? prev : [...prev, tag.id];
                                                            return prev.filter((id) => id !== tag.id);
                                                        });
                                                    }}
                                                />
                                                <span className="inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
                                                <span className="truncate">{tag.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded border border-surface-700 bg-surface-900/40 p-3">
                        <label className="mb-2 block text-xs text-surface-400">評価クイック条件</label>
                        <div className="flex flex-wrap gap-1.5">
                            {RATING_QUICK_FILTER_OPTIONS.map((option) => {
                                const active = ratingQuickFilter === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setRatingQuickFilter(option.value)}
                                        className={`rounded px-2 py-1 text-xs transition-colors ${
                                            active ? 'bg-primary-600 text-white' : 'bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="rounded border border-surface-700 bg-surface-900/40 p-3">
                        <label className="mb-2 block text-xs text-surface-400">評価条件</label>
                        {ratingAxes.length === 0 ? (
                            <div className="text-xs text-surface-500">評価軸がありません</div>
                        ) : (
                            <div className="space-y-2">
                                {ratingAxes.map((axis) => {
                                    const input = ratingInputs[axis.id] || { min: '', max: '' };
                                    return (
                                        <div key={axis.id} className="grid grid-cols-[1fr_90px_90px_auto] items-center gap-2 text-xs">
                                            <div className="truncate text-surface-300">{axis.name}</div>
                                            <input
                                                type="number"
                                                min={axis.minValue}
                                                max={axis.maxValue}
                                                step={axis.step}
                                                value={input.min}
                                                onChange={(event) => {
                                                    const value = event.target.value;
                                                    setRatingInputs((prev) => ({
                                                        ...prev,
                                                        [axis.id]: { ...(prev[axis.id] || { min: '', max: '' }), min: value },
                                                    }));
                                                }}
                                                className="rounded border border-surface-700 bg-surface-900 px-2 py-1 text-surface-200 focus:border-primary-500 focus:outline-none"
                                                placeholder="min"
                                            />
                                            <input
                                                type="number"
                                                min={axis.minValue}
                                                max={axis.maxValue}
                                                step={axis.step}
                                                value={input.max}
                                                onChange={(event) => {
                                                    const value = event.target.value;
                                                    setRatingInputs((prev) => ({
                                                        ...prev,
                                                        [axis.id]: { ...(prev[axis.id] || { min: '', max: '' }), max: value },
                                                    }));
                                                }}
                                                className="rounded border border-surface-700 bg-surface-900 px-2 py-1 text-surface-200 focus:border-primary-500 focus:outline-none"
                                                placeholder="max"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setRatingInputs((prev) => ({
                                                        ...prev,
                                                        [axis.id]: { min: '', max: '' },
                                                    }));
                                                }}
                                                className="rounded px-2 py-1 text-surface-500 hover:bg-surface-800 hover:text-surface-300"
                                            >
                                                解除
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-surface-700 px-4 py-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded bg-surface-700 px-4 py-2 text-sm text-surface-200 transition-colors hover:bg-surface-600"
                        disabled={isSubmitting}
                    >
                        キャンセル
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const normalizedRatings: Record<string, { min?: number; max?: number }> = {};
                            Object.entries(ratingInputs).forEach(([axisId, input]) => {
                                const min = parseOptionalNumber(input.min);
                                const max = parseOptionalNumber(input.max);
                                if (min === undefined && max === undefined) return;
                                normalizedRatings[axisId] = { min, max };
                            });

                            const normalizedName = name.trim();
                            if (!normalizedName || (moveEnabled && !targetFolderId) || (!moveEnabled && !renameEnabled)) return;
                            const normalizedTypes = normalizeTypes(types);
                            const normalizedTextConditions = textConditions
                                .map((conditionItem) => ({
                                    text: conditionItem.text.trim(),
                                    target: conditionItem.target === 'folderName' ? 'folderName' : 'fileName',
                                }))
                                .filter((conditionItem) => conditionItem.text.length > 0);
                            const primaryTextCondition = normalizedTextConditions[0];
                            const normalizedRenameTemplate = renameTemplate.trim();

                            void onSubmit({
                                name: normalizedName,
                                enabled,
                                condition: {
                                    folderSelection: folderSelection || '__all__',
                                    text: primaryTextCondition?.text ?? '',
                                    textMatchTarget: primaryTextCondition?.target ?? 'fileName',
                                    textConditions: normalizedTextConditions,
                                    tags: { ids: [...tagIds], mode: tagMode },
                                    ratingQuickFilter,
                                    ratings: normalizedRatings,
                                    types: normalizedTypes,
                                },
                                action: {
                                    move: {
                                        enabled: moveEnabled,
                                        targetFolderId: moveEnabled ? targetFolderId : '',
                                    },
                                    rename: {
                                        enabled: renameEnabled,
                                        template: normalizedRenameTemplate || '{name}',
                                    },
                                },
                            });
                        }}
                        className="rounded bg-primary-600 px-4 py-2 text-sm text-white transition-colors hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={
                            isSubmitting
                            || !name.trim()
                            || (!moveEnabled && !renameEnabled)
                            || (moveEnabled && !targetFolderId)
                            || (renameEnabled && !renameTemplate.trim())
                        }
                    >
                        {submitLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
