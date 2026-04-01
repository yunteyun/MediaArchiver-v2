/**
 * Auto Tag Service - 自動タグ割り当てサービス
 * Phase 12-8 フェーズ2
 */

import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { dbManager } from './databaseManager';
import { logger } from './logger';
import { addTagToFile, createTag, getAllTags, getFileTags, type TagDefinition } from './tagService';

const log = logger.scope('AutoTag');
const db = () => dbManager.getDb();

// --- Types ---

export type MatchTarget = 'filename' | 'foldername' | 'both';
export type MatchMode = 'partial' | 'exact';  // regexは後日追加

export interface AutoTagRule {
    id: string;
    tagId: string;
    keywords: string[];
    target: MatchTarget;
    matchMode: MatchMode;
    enabled: boolean;
    sortOrder: number;
    createdAt: number;
}

interface AutoTagRuleRow {
    id: string;
    tag_id: string;
    keywords: string;
    target: string;
    match_mode: string;
    enabled: number;
    sort_order: number;
    created_at: number;
}

export interface ApplyResult {
    success: boolean;
    filesProcessed: number;
    filesUpdated: number;
    tagsAssigned: number;
}

export interface FilenameBracketTagPreviewResult {
    filesProcessed: number;
    filesWithCandidates: number;
    candidateTagNames: string[];
    newTagNames: string[];
}

export interface FilenameBracketTagApplyResult extends ApplyResult {
    tagsCreated: number;
    createdTagNames: string[];
}

export interface PreviewMatch {
    fileId: string;
    fileName: string;
    matchedKeywords: string[];
}

function normalizeExtractedTagName(raw: string): string {
    return raw
        .normalize('NFKC')
        .replace(/\u3000/g, ' ')
        .replace(/^[\s._-]+|[\s._-]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractBracketTagNames(fileName: string): string[] {
    const baseName = path.parse(fileName).name.normalize('NFKC');
    const extracted = new Map<string, string>();
    const matches = baseName.matchAll(/(?:\[|\(|［|（)([^\]）)]*)(?:\]|\)|］|）)/gu);

    for (const match of matches) {
        const rawSegment = match[1];
        if (!rawSegment) continue;

        const parts = rawSegment.split(/[\s,，、/／|｜;；]+/u);
        for (const part of parts) {
            const normalized = normalizeExtractedTagName(part);
            if (!normalized) continue;

            const key = normalized.toLocaleLowerCase();
            if (!extracted.has(key)) {
                extracted.set(key, normalized);
            }
        }
    }

    return Array.from(extracted.values());
}

function buildTagLookup(tags: TagDefinition[]): Map<string, TagDefinition> {
    const lookup = new Map<string, TagDefinition>();
    for (const tag of tags) {
        const key = normalizeExtractedTagName(tag.name).toLocaleLowerCase();
        if (key && !lookup.has(key)) {
            lookup.set(key, tag);
        }
    }
    return lookup;
}

function sortTagNames(names: Iterable<string>): string[] {
    return Array.from(names).sort((left, right) => left.localeCompare(right, 'ja'));
}

// --- CRUD Operations ---

export function getAllRules(): AutoTagRule[] {
    const rows = db().prepare(`
        SELECT id, tag_id, keywords, target, match_mode, enabled, sort_order, created_at
        FROM auto_tag_rules
        ORDER BY sort_order ASC, created_at ASC
    `).all() as AutoTagRuleRow[];

    return rows.map(row => ({
        id: row.id,
        tagId: row.tag_id,
        keywords: JSON.parse(row.keywords) as string[],
        target: row.target as MatchTarget,
        matchMode: row.match_mode as MatchMode,
        enabled: row.enabled === 1,
        sortOrder: row.sort_order,
        createdAt: row.created_at
    }));
}

export function createRule(
    tagId: string,
    keywords: string[],
    target: MatchTarget,
    matchMode: MatchMode
): AutoTagRule {
    const id = uuidv4();
    const now = Date.now();
    const maxOrder = (db().prepare('SELECT MAX(sort_order) as max FROM auto_tag_rules').get() as { max: number } | undefined)?.max || 0;

    db().prepare(`
        INSERT INTO auto_tag_rules (id, tag_id, keywords, target, match_mode, enabled, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, tagId, JSON.stringify(keywords), target, matchMode, maxOrder + 1, now);

    log.info(`Created auto tag rule: ${id}`);

    return {
        id,
        tagId,
        keywords,
        target,
        matchMode,
        enabled: true,
        sortOrder: maxOrder + 1,
        createdAt: now
    };
}

export function updateRule(id: string, updates: Partial<Omit<AutoTagRule, 'id' | 'createdAt'>>): void {
    const existing = db().prepare('SELECT * FROM auto_tag_rules WHERE id = ?').get(id) as AutoTagRuleRow | undefined;
    if (!existing) {
        throw new Error(`Rule not found: ${id}`);
    }

    const newTagId = updates.tagId ?? existing.tag_id;
    const newKeywords = updates.keywords ? JSON.stringify(updates.keywords) : existing.keywords;
    const newTarget = updates.target ?? existing.target;
    const newMatchMode = updates.matchMode ?? existing.match_mode;
    const newEnabled = updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : existing.enabled;
    const newSortOrder = updates.sortOrder ?? existing.sort_order;

    db().prepare(`
        UPDATE auto_tag_rules
        SET tag_id = ?, keywords = ?, target = ?, match_mode = ?, enabled = ?, sort_order = ?
        WHERE id = ?
    `).run(newTagId, newKeywords, newTarget, newMatchMode, newEnabled, newSortOrder, id);

    log.info(`Updated auto tag rule: ${id}`);
}

export function deleteRule(id: string): void {
    db().prepare('DELETE FROM auto_tag_rules WHERE id = ?').run(id);
    log.info(`Deleted auto tag rule: ${id}`);
}

// --- Matching Logic ---

/**
 * ファイル名/フォルダ名がルールにマッチするか判定
 */
function matchesRule(
    fileName: string,
    folderName: string,
    rule: AutoTagRule
): { matched: boolean; matchedKeywords: string[] } {
    const matchedKeywords: string[] = [];

    const targets: string[] = [];
    if (rule.target === 'filename' || rule.target === 'both') {
        targets.push(fileName.toLowerCase());
    }
    if (rule.target === 'foldername' || rule.target === 'both') {
        targets.push(folderName.toLowerCase());
    }

    for (const keyword of rule.keywords) {
        const keywordLower = keyword.toLowerCase();

        for (const target of targets) {
            let matched = false;

            switch (rule.matchMode) {
                case 'partial':
                    matched = target.includes(keywordLower);
                    break;
                case 'exact':
                    // 拡張子を除いたファイル名との完全一致
                    const baseName = path.parse(target).name;
                    matched = baseName === keywordLower || target === keywordLower;
                    break;
            }

            if (matched) {
                matchedKeywords.push(keyword);
                break; // この keyword はマッチした、次の keyword へ
            }
        }
    }

    return {
        matched: matchedKeywords.length > 0,
        matchedKeywords
    };
}

/**
 * ファイルにマッチするルールのタグIDを取得
 */
export function matchFile(
    fileName: string,
    folderName: string,
    rules: AutoTagRule[]
): string[] {
    const matchedTagIds = new Set<string>();

    for (const rule of rules) {
        if (!rule.enabled) continue;

        const { matched } = matchesRule(fileName, folderName, rule);
        if (matched) {
            matchedTagIds.add(rule.tagId);
        }
    }

    return Array.from(matchedTagIds);
}

// --- Preview ---

/**
 * ルールのプレビュー（どのファイルにマッチするか）
 */
export function previewRule(
    rule: AutoTagRule,
    files: Array<{ id: string; name: string; path: string }>
): PreviewMatch[] {
    const matches: PreviewMatch[] = [];

    for (const file of files) {
        const folderName = path.basename(path.dirname(file.path));
        const { matched, matchedKeywords } = matchesRule(file.name, folderName, rule);

        if (matched) {
            matches.push({
                fileId: file.id,
                fileName: file.name,
                matchedKeywords
            });
        }
    }

    return matches;
}

export function previewFilenameBracketTags(fileIds: string[]): FilenameBracketTagPreviewResult {
    const database = db();
    const selectFileStmt = database.prepare('SELECT name FROM files WHERE id = ?');
    const existingTags = buildTagLookup(getAllTags());
    const candidateTagMap = new Map<string, string>();
    const newTagMap = new Map<string, string>();
    let filesWithCandidates = 0;

    for (const fileId of fileIds) {
        const file = selectFileStmt.get(fileId) as { name: string } | undefined;
        if (!file) continue;

        const tagNames = extractBracketTagNames(file.name);
        if (tagNames.length === 0) continue;

        filesWithCandidates += 1;

        for (const tagName of tagNames) {
            const key = tagName.toLocaleLowerCase();
            if (!candidateTagMap.has(key)) {
                candidateTagMap.set(key, tagName);
            }
            if (!existingTags.has(key) && !newTagMap.has(key)) {
                newTagMap.set(key, tagName);
            }
        }
    }

    return {
        filesProcessed: fileIds.length,
        filesWithCandidates,
        candidateTagNames: sortTagNames(candidateTagMap.values()),
        newTagNames: sortTagNames(newTagMap.values()),
    };
}

// --- Apply ---

/**
 * ルールをファイルに適用
 */
export function applyRulesToFiles(
    fileIds: string[],
    rules?: AutoTagRule[]
): ApplyResult {
    const activeRules = rules ?? getAllRules().filter(r => r.enabled);

    if (activeRules.length === 0) {
        return {
            success: true,
            filesProcessed: fileIds.length,
            filesUpdated: 0,
            tagsAssigned: 0
        };
    }

    let filesUpdated = 0;
    let tagsAssigned = 0;

    const database = db();

    // トランザクション開始
    const transaction = database.transaction(() => {
        for (const fileId of fileIds) {
            // ファイル情報取得
            const file = database.prepare(`
                SELECT name, path FROM files WHERE id = ?
            `).get(fileId) as { name: string; path: string } | undefined;

            if (!file) continue;

            const folderName = path.basename(path.dirname(file.path));
            const matchedTagIds = matchFile(file.name, folderName, activeRules);

            if (matchedTagIds.length === 0) continue;

            // 既存のタグを取得
            const existingTagIds = getFileTags(fileId).map(ft => ft.id);

            // 新しいタグのみ追加
            for (const tagId of matchedTagIds) {
                if (!existingTagIds.includes(tagId)) {
                    addTagToFile(fileId, tagId);
                    tagsAssigned++;
                }
            }

            if (matchedTagIds.some(tagId => !existingTagIds.includes(tagId))) {
                filesUpdated++;
            }
        }
    });

    try {
        transaction();
        log.info(`Applied auto tags: ${filesUpdated} files updated, ${tagsAssigned} tags assigned`);

        return {
            success: true,
            filesProcessed: fileIds.length,
            filesUpdated,
            tagsAssigned
        };
    } catch (error) {
        log.error('Failed to apply auto tags:', error);
        throw error;
    }
}

export function applyFilenameBracketTagsToFiles(fileIds: string[]): FilenameBracketTagApplyResult {
    const database = db();
    const selectFileStmt = database.prepare('SELECT name FROM files WHERE id = ?');
    const tagsByKey = buildTagLookup(getAllTags());
    const createdTagMap = new Map<string, string>();
    let filesUpdated = 0;
    let tagsAssigned = 0;
    let tagsCreated = 0;

    const transaction = database.transaction(() => {
        for (const fileId of fileIds) {
            const file = selectFileStmt.get(fileId) as { name: string } | undefined;
            if (!file) continue;

            const tagNames = extractBracketTagNames(file.name);
            if (tagNames.length === 0) continue;

            const existingFileTagIds = new Set(getFileTags(fileId).map((tag) => tag.id));
            let fileUpdated = false;

            for (const tagName of tagNames) {
                const key = tagName.toLocaleLowerCase();
                let tag = tagsByKey.get(key);

                if (!tag) {
                    tag = createTag(tagName);
                    tagsByKey.set(key, tag);
                    tagsCreated += 1;
                    createdTagMap.set(key, tag.name);
                }

                if (existingFileTagIds.has(tag.id)) {
                    continue;
                }

                addTagToFile(fileId, tag.id);
                existingFileTagIds.add(tag.id);
                tagsAssigned += 1;
                fileUpdated = true;
            }

            if (fileUpdated) {
                filesUpdated += 1;
            }
        }
    });

    try {
        transaction();
        log.info(`Applied filename bracket tags: ${filesUpdated} files updated, ${tagsAssigned} tags assigned, ${tagsCreated} tags created`);

        return {
            success: true,
            filesProcessed: fileIds.length,
            filesUpdated,
            tagsAssigned,
            tagsCreated,
            createdTagNames: sortTagNames(createdTagMap.values()),
        };
    } catch (error) {
        log.error('Failed to apply filename bracket tags:', error);
        throw error;
    }
}

/**
 * 選択ファイルに自動タグを適用（進捗コールバック付き）
 */
export async function applyRulesToFilesWithProgress(
    fileIds: string[],
    onProgress?: (progress: number) => void
): Promise<ApplyResult> {
    const BATCH_SIZE = 100;
    const rules = getAllRules().filter(r => r.enabled);

    if (rules.length === 0 || fileIds.length === 0) {
        return {
            success: true,
            filesProcessed: fileIds.length,
            filesUpdated: 0,
            tagsAssigned: 0
        };
    }

    let totalUpdated = 0;
    let totalAssigned = 0;

    for (let i = 0; i < fileIds.length; i += BATCH_SIZE) {
        const batch = fileIds.slice(i, i + BATCH_SIZE);
        const result = applyRulesToFiles(batch, rules);

        totalUpdated += result.filesUpdated;
        totalAssigned += result.tagsAssigned;

        if (onProgress) {
            onProgress((i + batch.length) / fileIds.length);
        }
    }

    return {
        success: true,
        filesProcessed: fileIds.length,
        filesUpdated: totalUpdated,
        tagsAssigned: totalAssigned
    };
}
