import { v4 as uuidv4 } from 'uuid';
import { dbManager } from './databaseManager';
import { logger } from './logger';

const log = logger.scope('SmartFolder');

const SMART_FOLDERS_KEY = 'smart_folders_v1';
type SearchTarget = 'fileName' | 'folderName';
interface SearchCondition {
    text: string;
    target: SearchTarget;
}

export interface SmartFolderConditionV1 {
    folderSelection: string | null;
    text: string;
    textMatchTarget: SearchTarget;
    textConditions: SearchCondition[];
    tags: {
        ids: string[];
        mode: 'AND' | 'OR';
    };
    ratings: Record<string, { min?: number; max?: number }>;
    types: Array<'video' | 'image' | 'archive' | 'audio'>;
}

export interface SmartFolderV1 {
    id: string;
    name: string;
    condition: SmartFolderConditionV1;
    sortOrder: number;
    createdAt: number;
    updatedAt: number;
}

interface SmartFolderStoreV1 {
    version: 1;
    items: SmartFolderV1[];
}

const DEFAULT_CONDITION: SmartFolderConditionV1 = {
    folderSelection: null,
    text: '',
    textMatchTarget: 'fileName',
    textConditions: [],
    tags: {
        ids: [],
        mode: 'OR',
    },
    ratings: {},
    types: ['video', 'image', 'archive', 'audio'],
};

function ensureProfileSettingsTable(): void {
    const db = dbManager.getDb();
    db.exec(`
        CREATE TABLE IF NOT EXISTS profile_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        )
    `);
}

function normalizeTagMode(value: unknown): 'AND' | 'OR' {
    return value === 'AND' ? 'AND' : 'OR';
}

function normalizeConditionTypes(input: unknown): Array<'video' | 'image' | 'archive' | 'audio'> {
    if (!Array.isArray(input)) return [...DEFAULT_CONDITION.types];
    const normalized = Array.from(new Set(
        input.filter((type): type is 'video' | 'image' | 'archive' | 'audio' => (
            type === 'video' || type === 'image' || type === 'archive' || type === 'audio'
        ))
    ));
    return normalized.length > 0 ? normalized : [...DEFAULT_CONDITION.types];
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

function normalizeCondition(input: unknown): SmartFolderConditionV1 {
    const candidate = input && typeof input === 'object' ? (input as Partial<SmartFolderConditionV1>) : {};
    const tagsCandidate = candidate.tags && typeof candidate.tags === 'object' ? candidate.tags : {};
    const ratingsCandidate = candidate.ratings && typeof candidate.ratings === 'object' ? candidate.ratings : {};

    const ratings: Record<string, { min?: number; max?: number }> = {};
    Object.entries(ratingsCandidate).forEach(([axisId, range]) => {
        if (!range || typeof range !== 'object') return;
        const min = typeof range.min === 'number' && Number.isFinite(range.min) ? range.min : undefined;
        const max = typeof range.max === 'number' && Number.isFinite(range.max) ? range.max : undefined;
        if (min === undefined && max === undefined) return;
        ratings[axisId] = { min, max };
    });
    const textConditions = normalizeTextConditions(
        candidate.textConditions,
        candidate.text,
        candidate.textMatchTarget
    );
    const primaryTextCondition = textConditions[0];

    return {
        folderSelection: typeof candidate.folderSelection === 'string' ? candidate.folderSelection : null,
        text: primaryTextCondition?.text ?? '',
        textMatchTarget: primaryTextCondition?.target ?? 'fileName',
        textConditions,
        tags: {
            ids: Array.isArray(tagsCandidate.ids)
                ? tagsCandidate.ids.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
                : [],
            mode: normalizeTagMode(tagsCandidate.mode),
        },
        ratings,
        types: normalizeConditionTypes(candidate.types),
    };
}

function normalizeSmartFolder(input: unknown, index: number): SmartFolderV1 | null {
    if (!input || typeof input !== 'object') return null;
    const candidate = input as Partial<SmartFolderV1>;
    if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) return null;
    if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0) return null;

    const now = Date.now();
    const createdAt = typeof candidate.createdAt === 'number' && Number.isFinite(candidate.createdAt)
        ? candidate.createdAt
        : now;
    const updatedAt = typeof candidate.updatedAt === 'number' && Number.isFinite(candidate.updatedAt)
        ? candidate.updatedAt
        : createdAt;
    const sortOrder = typeof candidate.sortOrder === 'number' && Number.isFinite(candidate.sortOrder)
        ? candidate.sortOrder
        : index;

    return {
        id: candidate.id,
        name: candidate.name.trim(),
        condition: normalizeCondition(candidate.condition),
        sortOrder,
        createdAt,
        updatedAt,
    };
}

function normalizeStore(input: unknown): SmartFolderStoreV1 {
    const candidate = input && typeof input === 'object' ? (input as Partial<SmartFolderStoreV1>) : {};
    const rawItems = Array.isArray(candidate.items) ? candidate.items : [];
    const normalizedItems = rawItems
        .map((item, index) => normalizeSmartFolder(item, index))
        .filter((item): item is SmartFolderV1 => item !== null)
        .sort((a, b) => a.sortOrder - b.sortOrder);

    return {
        version: 1,
        items: normalizedItems,
    };
}

function readStore(): SmartFolderStoreV1 {
    ensureProfileSettingsTable();
    const db = dbManager.getDb();
    const row = db.prepare('SELECT value FROM profile_settings WHERE key = ?').get(SMART_FOLDERS_KEY) as { value: string } | undefined;
    if (!row) return { version: 1, items: [] };

    try {
        return normalizeStore(JSON.parse(row.value));
    } catch (error) {
        log.warn('Failed to parse smart folders settings. Fallback to empty.', error);
        return { version: 1, items: [] };
    }
}

function writeStore(store: SmartFolderStoreV1): void {
    ensureProfileSettingsTable();
    const db = dbManager.getDb();
    const now = Date.now();
    db.prepare(`
        INSERT INTO profile_settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(SMART_FOLDERS_KEY, JSON.stringify(store), now);
}

export function getAllSmartFolders(): SmartFolderV1[] {
    return readStore().items;
}

export function getSmartFolderById(id: string): SmartFolderV1 | null {
    const item = readStore().items.find((folder) => folder.id === id);
    return item ?? null;
}

export function createSmartFolder(input: {
    name: string;
    condition?: unknown;
}): SmartFolderV1 {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name) {
        throw new Error('スマートフォルダ名が空です');
    }

    const store = readStore();
    const now = Date.now();
    const nextSortOrder = store.items.length;

    const created: SmartFolderV1 = {
        id: uuidv4(),
        name,
        condition: normalizeCondition(input.condition ?? DEFAULT_CONDITION),
        sortOrder: nextSortOrder,
        createdAt: now,
        updatedAt: now,
    };

    store.items.push(created);
    writeStore(store);
    return created;
}

export function updateSmartFolder(
    id: string,
    updates: {
        name?: string;
        condition?: unknown;
        sortOrder?: number;
    }
): SmartFolderV1 {
    const store = readStore();
    const index = store.items.findIndex((item) => item.id === id);
    if (index < 0) {
        throw new Error('スマートフォルダが見つかりません');
    }

    const current = store.items[index];
    const nextName = typeof updates.name === 'string' ? updates.name.trim() : current.name;
    if (!nextName) {
        throw new Error('スマートフォルダ名が空です');
    }

    const nextCondition = updates.condition === undefined
        ? current.condition
        : normalizeCondition(updates.condition);

    const nextSortOrder = typeof updates.sortOrder === 'number' && Number.isFinite(updates.sortOrder)
        ? Math.max(0, Math.floor(updates.sortOrder))
        : current.sortOrder;

    const updated: SmartFolderV1 = {
        ...current,
        name: nextName,
        condition: nextCondition,
        sortOrder: nextSortOrder,
        updatedAt: Date.now(),
    };

    store.items[index] = updated;
    store.items = [...store.items]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item, order) => ({ ...item, sortOrder: order }));

    writeStore(store);
    const result = store.items.find((item) => item.id === id);
    if (!result) {
        throw new Error('スマートフォルダ更新後の整合性エラー');
    }
    return result;
}

export function deleteSmartFolder(id: string): { success: boolean } {
    const store = readStore();
    const before = store.items.length;
    store.items = store.items.filter((item) => item.id !== id);
    if (store.items.length === before) {
        return { success: false };
    }

    store.items = store.items.map((item, index) => ({ ...item, sortOrder: index }));
    writeStore(store);
    return { success: true };
}
