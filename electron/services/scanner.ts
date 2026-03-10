import fs from 'fs';
import path from 'path';
import pLimit from 'p-limit';
import * as db from './database';
import { dbManager } from './databaseManager';
import { logger } from './logger';
import { generateThumbnail, getVideoDuration, getMediaMetadata, generatePreviewFrames, checkIsAnimated } from './thumbnail';
import { validatePathLength, isSkippableError, getErrorCode } from './pathValidator';
import * as archiveHandler from './archiveHandler';
import { logPerf, startPerfTimer } from './perfDebug';
import {
    DEFAULT_SCAN_EXCLUSION_RULES,
    normalizeScanExclusionRules,
    pathHasExcludedDirectory,
    shouldSkipDirectoryEntry,
    shouldSkipFileByExtension,
    type ScanExclusionRules,
} from '../../src/shared/scanExclusionRules';

const log = logger.scope('Scanner');

// サムネイル生成の同時実行数制限（CPU負荷軽減）
const thumbnailLimit = pLimit(3);

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.wmv'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
const ARCHIVE_EXTENSIONS = ['.zip', '.cbz', '.rar', '.cbr', '.7z'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.m4a', '.ogg', '.aac', '.wma'];

export interface ScanFileTypeCategoryFilters {
    video: boolean;
    image: boolean;
    archive: boolean;
    audio: boolean;
}

export interface ScanRuntimeSettings {
    previewFrameCount: number;
    scanThrottleMs: number;
    thumbnailResolution: number;
    fileTypeCategories: ScanFileTypeCategoryFilters;
    exclusionRules: ScanExclusionRules;
}

export interface ScanCancellationToken {
    cancelled: boolean;
}

let enabledScanCategories: ScanFileTypeCategoryFilters = {
    video: true,
    image: true,
    archive: true,
    audio: true,
};
let scanExclusionRules: ScanExclusionRules = { ...DEFAULT_SCAN_EXCLUSION_RULES };

function normalizeScanFileTypeCategories(input: Partial<ScanFileTypeCategoryFilters> | undefined): ScanFileTypeCategoryFilters {
    return {
        video: input?.video ?? true,
        image: input?.image ?? true,
        archive: input?.archive ?? true,
        audio: input?.audio ?? true,
    };
}

function resolveEffectiveScanFileTypeCategories(
    rootFolderId: string,
    profileDefaults: ScanFileTypeCategoryFilters
): ScanFileTypeCategoryFilters {
    const folderSettings = db.getFolderScanSettings(rootFolderId);
    const overrides = folderSettings.fileTypeOverrides || {};
    return {
        video: overrides.video ?? profileDefaults.video,
        image: overrides.image ?? profileDefaults.image,
        archive: overrides.archive ?? profileDefaults.archive,
        audio: overrides.audio ?? profileDefaults.audio,
    };
}

export function setScanFileTypeCategories(filters: Partial<ScanFileTypeCategoryFilters>) {
    enabledScanCategories = normalizeScanFileTypeCategories(filters);
}

export function getScanFileTypeCategories(): ScanFileTypeCategoryFilters {
    return { ...enabledScanCategories };
}

export function setScanExclusionRules(rules: ScanExclusionRules) {
    scanExclusionRules = normalizeScanExclusionRules(rules);
}

export function getScanExclusionRules(): ScanExclusionRules {
    return { ...scanExclusionRules };
}

export function getCurrentScanRuntimeSettings(): ScanRuntimeSettings {
    return {
        previewFrameCount: previewFrameCountSetting,
        scanThrottleMs: scanThrottleMsSetting,
        thumbnailResolution: thumbnailResolutionSetting,
        fileTypeCategories: getScanFileTypeCategories(),
        exclusionRules: getScanExclusionRules(),
    };
}

export function createScanCancellationToken(): ScanCancellationToken {
    return { cancelled: false };
}

export function cancelScanToken(token?: ScanCancellationToken): void {
    if (token) {
        token.cancelled = true;
    }
}

function getMediaTypeFromExtension(ext: string): 'video' | 'image' | 'archive' | 'audio' | null {
    if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
    if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
    if (ARCHIVE_EXTENSIONS.includes(ext)) return 'archive';
    if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
    return null;
}

function isScanTypeEnabled(
    type: 'video' | 'image' | 'archive' | 'audio',
    filters: ScanFileTypeCategoryFilters = enabledScanCategories
): boolean {
    return filters[type];
}

function isScannableMediaType(
    ext: string,
    filters: ScanFileTypeCategoryFilters = enabledScanCategories
): 'video' | 'image' | 'archive' | 'audio' | null {
    const type = getMediaTypeFromExtension(ext);
    if (!type) return null;
    return isScanTypeEnabled(type, filters) ? type : null;
}

const IMAGE_ANIMATION_CHECK_BACKFILL_VERSION = 1;

function getImageAnimationCheckBackfillVersion(metadata?: string): number {
    if (!metadata) return 0;
    try {
        const parsed = JSON.parse(metadata);
        const version = Number(parsed?.animationCheckBackfillVersion ?? 0);
        return Number.isFinite(version) ? version : 0;
    } catch {
        return 0;
    }
}

function attachImageAnimationCheckBackfillMarker(metadata?: string): string | undefined {
    if (!metadata) return metadata;
    try {
        const parsed = JSON.parse(metadata);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return metadata;
        if ((parsed as Record<string, unknown>).animationCheckBackfillVersion === IMAGE_ANIMATION_CHECK_BACKFILL_VERSION) {
            return metadata;
        }
        const next = {
            ...(parsed as Record<string, unknown>),
            animationCheckBackfillVersion: IMAGE_ANIMATION_CHECK_BACKFILL_VERSION
        };
        return JSON.stringify(next);
    } catch {
        return metadata;
    }
}

export type ScanProgressCallback = (progress: {
    jobId: string;
    phase: 'counting' | 'scanning' | 'complete' | 'error';
    current: number;
    total: number;
    currentFile?: string;
    message?: string;
    stats?: {
        newCount: number;
        updateCount: number;
        skipCount: number;
        removedCount?: number;
    };
}) => void;

export interface ScanBatchCommittedPayload {
    jobId: string;
    rootFolderId: string;
    scanPath: string;
    committedCount: number;
    totalCommitted: number;
    removedCount: number;
    stage: 'batch' | 'complete' | 'cancelled';
}

function parseLegacyArchiveImageCount(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    if (value < 0) return null;
    return Math.floor(value);
}

function hasArchiveImageCountMetadataForDisplay(metadata?: string): boolean {
    if (!metadata) return false;

    try {
        const parsed = JSON.parse(metadata) as {
            imageEntries?: unknown;
            imageCount?: unknown;
            pageCount?: unknown;
            fileCount?: unknown;
        };

        if (!parsed || typeof parsed !== 'object') return false;
        if (Array.isArray(parsed.imageEntries)) return true;
        if (parseLegacyArchiveImageCount(parsed.imageCount) != null) return true;
        if (parseLegacyArchiveImageCount(parsed.pageCount) != null) return true;
        if (parseLegacyArchiveImageCount(parsed.fileCount) != null) return true;
        return false;
    } catch {
        return false;
    }
}

export type ScanBatchCommittedCallback = (payload: ScanBatchCommittedPayload) => void;

export interface ScanDirectoryOptions {
    skipInitialCount?: boolean;
    runtimeSettings?: ScanRuntimeSettings;
    cancellationToken?: ScanCancellationToken;
    jobId?: string;
}

export function cancelScan() {
    // Legacy no-op. Cancellation is controlled per scan job via token.
}
export function isScanCancelled(token?: ScanCancellationToken) {
    return token?.cancelled === true;
}

// プレビューフレーム数の設定（デフォルト: 10）
let previewFrameCountSetting = 10;
export function setPreviewFrameCount(count: number) {
    previewFrameCountSetting = count;
}
export function getPreviewFrameCount() {
    return previewFrameCountSetting;
}

// スキャン速度抑制（ファイル間待機時間 ms）
let scanThrottleMsSetting = 0;
export function setScanThrottleMs(ms: number) {
    scanThrottleMsSetting = ms;
}
export function getScanThrottleMs() {
    return scanThrottleMsSetting;
}

// サムネイル生成解像度（幅px、デフォルト: 320）
let thumbnailResolutionSetting = 320;
export function setThumbnailResolution(resolution: number) {
    thumbnailResolutionSetting = resolution;
}
export function getThumbnailResolution() {
    return thumbnailResolutionSetting;
}

// Throttle設定（ms）
const PROGRESS_THROTTLE_MS = 50;

// バッチトランザクションサイズ
const TRANSACTION_BATCH_SIZE = 100;

// 保留中のDB書き込み操作
interface PendingWrite {
    fileData: Parameters<typeof db.insertFile>[0];
    existingId?: string;
}

const activeScanJobs = new Map<string, { dirPath: string; rootFolderId: string }>();

export function hasActiveScanJobs(): boolean {
    return activeScanJobs.size > 0;
}

export function getActiveScanJobCount(): number {
    return activeScanJobs.size;
}

// バッチコミット関数
function commitBatch(pendingWrites: PendingWrite[]): number {
    if (pendingWrites.length === 0) return 0;

    const database = dbManager.getDb();
        const transaction = database.transaction(() => {
        pendingWrites.forEach(pw => {
            db.upsertFileRecord(pw.fileData, pw.existingId);
        });
    });

    transaction();
    return pendingWrites.length;
}

// ファイル数をカウント (再帰)
async function countFiles(
    dirPath: string,
    scanFilters: ScanFileTypeCategoryFilters,
    exclusionRules: ScanExclusionRules,
    cancellationToken?: ScanCancellationToken
): Promise<number> {
    // パス長チェック
    if (!validatePathLength(dirPath)) {
        log.warn(`Skipping path (too long): ${dirPath.substring(0, 100)}...`);
        return 0;
    }
    if (!fs.existsSync(dirPath)) return 0;
    if (isScanCancelled(cancellationToken)) return 0;

    let count = 0;
    try {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            if (isScanCancelled(cancellationToken)) {
                return count;
            }
            try {
                const fullPath = path.join(dirPath, entry.name);

                // パス長チェック
                if (!validatePathLength(fullPath)) {
                    log.warn(`Skipping path (too long): ${entry.name}`);
                    continue;
                }

                if (entry.isDirectory()) {
                    if (shouldSkipDirectoryEntry(entry.name, exclusionRules)) {
                        continue;
                    }
                    count += await countFiles(fullPath, scanFilters, exclusionRules, cancellationToken);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (!shouldSkipFileByExtension(ext, exclusionRules) && isScannableMediaType(ext, scanFilters)) {
                        count++;
                    }
                }
            } catch (entryErr) {
                // エントリごとのエラーはスキップ
                if (isSkippableError(entryErr)) {
                    log.debug(`Skipping entry (${getErrorCode(entryErr)}): ${entry.name}`);
                } else {
                    log.warn(`Error processing entry ${entry.name}:`, entryErr);
                }
            }
        }
    } catch (e) {
        // ディレクトリ読み取りエラー
        if (isSkippableError(e)) {
            log.debug(`Cannot read directory (${getErrorCode(e)}): ${dirPath}`);
        } else {
            log.warn(`Error reading directory ${dirPath}:`, e);
        }
    }
    return count;
}

// Internal scan function
async function scanDirectoryInternal(
    dirPath: string,
    rootFolderId: string,
    onProgress: ScanProgressCallback | undefined,
    onBatchCommitted: ScanBatchCommittedCallback | undefined,
    state: {
        jobId: string;
        current: number;
        total: number;
        lastProgressTime: number;
        stats: { newCount: number; updateCount: number; skipCount: number; removedCount?: number };
        pendingWrites: PendingWrite[];
        scanFilters: ScanFileTypeCategoryFilters;
        committedCount: number;
        runtimeSettings: ScanRuntimeSettings;
        cancellationToken?: ScanCancellationToken;
    }
) {
    // パス長チェック
    if (!validatePathLength(dirPath)) {
        log.warn(`Skipping directory (path too long): ${dirPath.substring(0, 100)}...`);
        return;
    }
    if (!fs.existsSync(dirPath)) return;
    if (isScanCancelled(state.cancellationToken)) return;

    let entries;
    try {
        entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    } catch (readErr) {
        if (isSkippableError(readErr)) {
            log.debug(`Cannot read directory (${getErrorCode(readErr)}): ${dirPath}`);
        } else {
            log.warn(`Error reading directory ${dirPath}:`, readErr);
        }
        return;
    }

    for (const entry of entries) {
        // キャンセルチェック
        if (isScanCancelled(state.cancellationToken)) return;

        try {
            const fullPath = path.join(dirPath, entry.name);

            // パス長チェック
            if (!validatePathLength(fullPath)) {
                log.warn(`Skipping file (path too long): ${entry.name}`);
                state.stats.skipCount++;
                continue;
            }

            if (entry.isDirectory()) {
                if (shouldSkipDirectoryEntry(entry.name, state.runtimeSettings.exclusionRules)) {
                    state.stats.skipCount++;
                    continue;
                }
                await scanDirectoryInternal(fullPath, rootFolderId, onProgress, onBatchCommitted, state);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (shouldSkipFileByExtension(ext, state.runtimeSettings.exclusionRules)) {
                    state.stats.skipCount++;
                    continue;
                }
                const type = isScannableMediaType(ext, state.scanFilters);

                if (type) {
                    state.current++;

                    let fileStats;
                    try {
                        fileStats = await fs.promises.stat(fullPath);
                    } catch (statErr) {
                        if (isSkippableError(statErr)) {
                            log.debug(`Skipping file (${getErrorCode(statErr)}): ${entry.name}`);
                        } else {
                            log.warn(`Cannot stat file ${entry.name}:`, statErr);
                        }
                        state.stats.skipCount++;
                        continue;
                    }

                    const existing = db.findFileScanRecordByPath(fullPath);
                    // Skip if size and mtime match AND thumbnail exists (if applicable)
                    // For videos, also require preview_frames to exist

                    // All media types need thumbnails (video, image, archive, audio)
                    const isMedia = type === 'video' || type === 'image' || type === 'archive' || type === 'audio';
                    const hasThumbnail = !!existing?.thumbnail_path;

                    // Check if preview frames actually exist on disk (not just in DB)
                    let hasPreviewFrames = false;
                    if (existing?.preview_frames) {
                        const framePaths = existing.preview_frames.split(',').filter(Boolean);
                        // Check if at least one frame file exists
                        hasPreviewFrames = framePaths.length > 0 && framePaths.some(framePath => {
                            try {
                                return fs.existsSync(framePath);
                            } catch {
                                return false;
                            }
                        });
                    }

                    // Videos require both thumbnail and preview frames (only if setting > 0)
                    // Phase 15-2: 画像はメタデータ(width/height)も必要
                    const hasMetadata = !!existing?.metadata;
                    const hasArchiveImageCountMetadata = type === 'archive'
                        ? hasArchiveImageCountMetadataForDisplay(existing?.metadata)
                        : false;
                    const isComplete = type === 'video'
                        ? (hasThumbnail && (hasPreviewFrames || state.runtimeSettings.previewFrameCount === 0) && hasMetadata)
                        : type === 'audio'
                            ? (hasThumbnail && hasMetadata)
                        : type === 'image'
                            ? (hasThumbnail && hasMetadata)
                            : type === 'archive'
                                ? (hasThumbnail && hasArchiveImageCountMetadata)
                                : (!isMedia || hasThumbnail);

                    const needsPngAnimationBackfillCheck = type === 'image'
                        && ext === '.png'
                        && !!existing
                        && existing.is_animated === 0
                        && getImageAnimationCheckBackfillVersion(existing.metadata) < IMAGE_ANIMATION_CHECK_BACKFILL_VERSION;

                    if (existing &&
                        existing.size === fileStats.size &&
                        existing.mtime_ms === Math.floor(fileStats.mtimeMs) &&
                        isComplete &&
                        !needsPngAnimationBackfillCheck
                    ) {
                        state.stats.skipCount++;
                        // Throttled progress update
                        const now = Date.now();
                        if (onProgress && (now - state.lastProgressTime > PROGRESS_THROTTLE_MS || state.current === state.total)) {
                            state.lastProgressTime = now;
                            const progressTotal = state.total > 0 ? Math.max(state.total, state.current) : 0;
                            onProgress({
                                jobId: state.jobId,
                                phase: 'scanning',
                                current: state.current,
                                total: progressTotal,
                                currentFile: entry.name,
                                stats: state.stats
                            });
                        }
                        continue;
                    }

                    // Generate thumbnail if missing
                    let thumbnailPath = existing?.thumbnail_path;
                    if (!thumbnailPath) {
                        try {
                            if (onProgress) {
                                onProgress({
                                    jobId: state.jobId,
                                    phase: 'scanning',
                                    current: state.current,
                                    total: state.total,
                                    currentFile: entry.name,
                                    message: `サムネイル生成中...`
                                });
                            }
                            // p-limitで同時実行数を制限（CPU負荷軽減）
                            const generated = await thumbnailLimit(() => generateThumbnail(fullPath, state.runtimeSettings.thumbnailResolution));
                            if (isScanCancelled(state.cancellationToken)) return;
                            if (generated) thumbnailPath = generated;
                        } catch (e) {
                            log.error('Thumbnail generation failed:', e);
                        }
                    }

                    // Generate duration if missing (video and audio)
                    let duration = existing?.duration;
                    if ((type === 'video' || type === 'audio') && !duration) {
                        try {
                            duration = await getVideoDuration(fullPath);
                        } catch (e) {
                            log.error('Duration extraction failed:', e);
                        }
                    }


                    // Generate preview frames if missing (video only, for scrub mode)
                    let previewFrames = existing?.preview_frames;

                    // Check if preview frames actually exist on disk
                    let needsPreviewFrames = false;
                    if (type === 'video' && state.runtimeSettings.previewFrameCount > 0) {
                        if (!previewFrames) {
                            // No DB record at all
                            needsPreviewFrames = true;
                        } else {
                            // DB record exists, check if files actually exist
                            const framePaths = previewFrames.split(',').filter(Boolean);
                            const anyFileExists = framePaths.some(framePath => {
                                try {
                                    return fs.existsSync(framePath);
                                } catch {
                                    return false;
                                }
                            });
                            needsPreviewFrames = !anyFileExists;
                        }
                    }

                    if (needsPreviewFrames) {
                        try {
                            if (onProgress) {
                                onProgress({
                                    jobId: state.jobId,
                                    phase: 'scanning',
                                    current: state.current,
                                    total: state.total,
                                    currentFile: entry.name,
                                    message: `プレビューフレーム生成中...`
                                });
                            }
                            // p-limitで同時実行数を制限（CPU負荷軽減）
                            previewFrames = await thumbnailLimit(() => generatePreviewFrames(fullPath, state.runtimeSettings.previewFrameCount)) || undefined;

                            // スキャン速度抑制（コイル鳴き対策）
                            if (state.runtimeSettings.scanThrottleMs > 0) {
                                await new Promise(resolve => setTimeout(resolve, state.runtimeSettings.scanThrottleMs));
                            }

                            if (isScanCancelled(state.cancellationToken)) return;
                        } catch (e) {
                            log.error('Preview frames generation failed:', e);
                        }
                    }

                    // Generate archive metadata if missing/incomplete (archive only)
                    let metadata = existing?.metadata;
                    if (type === 'archive' && !hasArchiveImageCountMetadataForDisplay(metadata)) {
                        try {
                            if (onProgress) {
                                onProgress({
                                    jobId: state.jobId,
                                    phase: 'scanning',
                                    current: state.current,
                                    total: state.total,
                                    currentFile: entry.name,
                                    message: `書庫メタデータ取得中...`
                                });
                            }
                            const meta = await archiveHandler.getArchiveMetadata(fullPath);
                            if (meta) {
                                metadata = JSON.stringify(meta);
                            }
                        } catch (e) {
                            log.error('Archive metadata extraction failed:', e);
                        }
                    }

                    // Phase 15-2: 画像メタデータ抽出（width/height）
                    if (type === 'image' && !metadata) {
                        try {
                            const sharp = (await import('sharp')).default;
                            const imgMeta = await sharp(fullPath).metadata();
                            if (imgMeta.width && imgMeta.height) {
                                metadata = JSON.stringify({
                                    width: imgMeta.width,
                                    height: imgMeta.height,
                                    format: imgMeta.format
                                });
                            }
                        } catch (e) {
                            log.error('Image metadata extraction failed:', e);
                        }
                    }

                    if ((type === 'video' || type === 'audio') && !metadata) {
                        try {
                            const mediaMeta = await getMediaMetadata(fullPath);
                            if (mediaMeta) {
                                metadata = JSON.stringify(mediaMeta);
                            }
                        } catch (e) {
                            log.error('Media metadata extraction failed:', e);
                        }
                    }

                    // Check if image is animated (GIF/WebP)
                    let isAnimated: boolean | undefined = undefined;
                    if (type === 'image') {
                        // 既存ファイルで is_animated が未設定(0)の場合も再チェック
                        if (!existing || existing.is_animated === undefined || existing.is_animated === 0) {
                            try {
                                isAnimated = await checkIsAnimated(fullPath);
                            } catch (e) {
                                log.error('Animation check failed:', e);
                            }
                        } else {
                            isAnimated = existing.is_animated === 1;
                        }
                    }

                    if (type === 'image' && ext === '.png') {
                        metadata = attachImageAnimationCheckBackfillMarker(metadata);
                    }

                    // Insert or Update - バッチに追加
                    const isNew = !existing;
                    const fileData = {
                        name: entry.name,
                        path: fullPath,
                        size: fileStats.size,
                        type: type,
                        created_at: fileStats.birthtimeMs,
                        mtime_ms: Math.floor(fileStats.mtimeMs),
                        root_folder_id: rootFolderId,
                        tags: existing ? db.getTagIdsByFileId(existing.id) : [],
                        duration: duration,
                        thumbnail_path: thumbnailPath,
                        preview_frames: previewFrames,
                        content_hash: existing?.content_hash,
                        metadata: metadata,
                        is_animated: isAnimated ? 1 : 0  // SQLiteはbooleanをINTEGERとして保存
                    };

                    state.pendingWrites.push({ fileData, existingId: existing?.id });

                    // バッチサイズに達したらコミット
                    if (state.pendingWrites.length >= TRANSACTION_BATCH_SIZE) {
                        const committedCount = commitBatch(state.pendingWrites);
                        state.committedCount += committedCount;
                        state.pendingWrites = [];
                        onBatchCommitted?.({
                            rootFolderId,
                            scanPath: dirPath,
                            committedCount,
                            totalCommitted: state.committedCount,
                            removedCount: 0,
                            stage: 'batch'
                        });
                    }

                    // Update stats
                    if (isNew) {
                        state.stats.newCount++;
                    } else {
                        state.stats.updateCount++;
                    }

                    // Throttled progress update
                    const nowAfter = Date.now();
                    if (onProgress && (nowAfter - state.lastProgressTime > PROGRESS_THROTTLE_MS || state.current === state.total)) {
                            state.lastProgressTime = nowAfter;
                            const progressTotal = state.total > 0 ? Math.max(state.total, state.current) : 0;
                            onProgress({
                                jobId: state.jobId,
                                phase: 'scanning',
                                current: state.current,
                                total: progressTotal,
                            currentFile: entry.name,
                            message: isNew ? '新規登録' : '更新',
                            stats: state.stats
                        });
                    }
                }
            }
        } catch (err) {
            if (isSkippableError(err)) {
                log.debug(`Skipping entry (${getErrorCode(err)}): ${entry.name}`);
                state.stats.skipCount++;
            } else {
                log.error(`Failed to scan entry ${entry.name}:`, err);
            }
        }
    }
}

export async function scanDirectory(
    dirPath: string,
    rootFolderId: string,
    onProgress?: ScanProgressCallback,
    onBatchCommitted?: ScanBatchCommittedCallback,
    options?: ScanDirectoryOptions
) {
    const perfStartedAt = startPerfTimer();
    const jobId = options?.jobId ?? crypto.randomUUID();
    activeScanJobs.set(jobId, { dirPath, rootFolderId });
    db.updateFolderLastScanStatus(rootFolderId, {
        at: Date.now(),
        status: 'running',
        message: 'スキャン開始'
    });

    try {
        const runtimeSettings = options?.runtimeSettings ?? getCurrentScanRuntimeSettings();
        const cancellationToken = options?.cancellationToken;
        const effectiveScanFilters = resolveEffectiveScanFileTypeCategories(
            rootFolderId,
            runtimeSettings.fileTypeCategories
        );
        let total = 0;

        if (!options?.skipInitialCount) {
            if (onProgress) {
                onProgress({ jobId, phase: 'counting', current: 0, total: 0, message: 'ファイル数をカウント中...' });
            }

            const countStartedAt = startPerfTimer();
            total = await countFiles(dirPath, effectiveScanFilters, runtimeSettings.exclusionRules, cancellationToken);
            logPerf('scanner.countFiles', countStartedAt, {
                folder: path.basename(dirPath) || dirPath,
                total
            });
        }

        if (onProgress) {
            onProgress({ jobId, phase: 'scanning', current: 0, total, message: 'スキャン開始...' });
        }

        const state = {
            jobId,
            current: 0,
            total,
            lastProgressTime: 0,
            stats: { newCount: 0, updateCount: 0, skipCount: 0, removedCount: 0 },
            pendingWrites: [] as PendingWrite[],
            scanFilters: effectiveScanFilters,
            committedCount: 0,
            runtimeSettings,
            cancellationToken,
        };
        await scanDirectoryInternal(dirPath, rootFolderId, onProgress, onBatchCommitted, state);

        // 残りのバッチをコミット
        if (state.pendingWrites.length > 0) {
            const committedCount = commitBatch(state.pendingWrites);
            state.committedCount += committedCount;
            state.pendingWrites = [];
            onBatchCommitted?.({
                jobId,
                rootFolderId,
                scanPath: dirPath,
                committedCount,
                totalCommitted: state.committedCount,
                removedCount: 0,
                stage: 'batch'
            });
        }

        // Orphan check (simplified)
        const registeredFiles = db.getFileCleanupCandidatesByRootFolderId(rootFolderId);
        let removedCount = 0;
        for (const file of registeredFiles) {
            const isMissingOnDisk = !fs.existsSync(file.path);
            const type = file.type as 'video' | 'image' | 'archive' | 'audio' | undefined;
            const disabledByProfile =
                type === 'video' || type === 'image' || type === 'archive' || type === 'audio'
                    ? !isScanTypeEnabled(type, state.scanFilters)
                    : false;
            const excludedByRules =
                shouldSkipFileByExtension(path.extname(file.path).toLowerCase(), runtimeSettings.exclusionRules)
                || pathHasExcludedDirectory(file.path, dirPath, runtimeSettings.exclusionRules);

            if (isMissingOnDisk || disabledByProfile || excludedByRules) {
                db.deleteFile(file.id);
                removedCount++;
            }
        }

        // キャンセルされた場合
        if (isScanCancelled(cancellationToken)) {
            const finalTotal = state.total > 0 ? Math.max(state.total, state.current) : state.current;
            onBatchCommitted?.({
                jobId,
                rootFolderId,
                scanPath: dirPath,
                committedCount: 0,
                totalCommitted: state.committedCount,
                removedCount,
                stage: 'cancelled'
            });
            logPerf('scanner.scanDirectory', perfStartedAt, {
                folder: path.basename(dirPath) || dirPath,
                total: finalTotal,
                countMode: options?.skipInitialCount ? 'skipped' : 'full',
                phase: 'cancelled',
                newCount: state.stats.newCount,
                updateCount: state.stats.updateCount,
                skipCount: state.stats.skipCount,
                removedCount
            });
            db.updateFolderLastScanStatus(rootFolderId, {
                at: Date.now(),
                status: 'cancelled',
                message: `キャンセル: ${state.stats.newCount}件新規, ${state.stats.updateCount}件更新, ${state.stats.skipCount}件スキップ`
            });
            if (onProgress) {
                onProgress({
                    jobId,
                    phase: 'complete',
                    current: state.current,
                    total: finalTotal,
                    message: `キャンセル: ${state.stats.newCount}件新規, ${state.stats.updateCount}件更新, ${state.stats.skipCount}件スキップ`,
                    stats: {
                        ...state.stats,
                        removedCount,
                    }
                });
            }
            return;
        }

        const finalTotal = state.total > 0 ? Math.max(state.total, state.current) : state.current;
        if (onProgress) {
            console.log(`Scan completed. Total: ${finalTotal}, New: ${state.stats.newCount}, Update: ${state.stats.updateCount}, Skip: ${state.stats.skipCount}, Removed: ${removedCount}`);
            onProgress({
                jobId,
                phase: 'complete',
                current: finalTotal,
                total: finalTotal,
                message: `完了: ${state.stats.newCount}件新規, ${state.stats.updateCount}件更新, ${state.stats.skipCount}件スキップ, ${removedCount}件削除`,
                stats: {
                    ...state.stats,
                    removedCount,
                }
            });
        }
        db.updateFolderLastScanStatus(rootFolderId, {
            at: Date.now(),
            status: 'success',
            message: `完了: ${state.stats.newCount}件新規, ${state.stats.updateCount}件更新, ${state.stats.skipCount}件スキップ, ${removedCount}件削除`
        });
        onBatchCommitted?.({
            jobId,
            rootFolderId,
            scanPath: dirPath,
            committedCount: 0,
            totalCommitted: state.committedCount,
            removedCount,
            stage: 'complete'
        });
        logPerf('scanner.scanDirectory', perfStartedAt, {
            folder: path.basename(dirPath) || dirPath,
            total: finalTotal,
            countMode: options?.skipInitialCount ? 'skipped' : 'full',
            phase: 'complete',
            newCount: state.stats.newCount,
            updateCount: state.stats.updateCount,
            skipCount: state.stats.skipCount,
            removedCount
        });

    } catch (e) {
        logPerf('scanner.scanDirectory', perfStartedAt, {
            folder: path.basename(dirPath) || dirPath,
            countMode: options?.skipInitialCount ? 'skipped' : 'full',
            phase: 'error',
            error: e instanceof Error ? e.message : String(e)
        });
        db.updateFolderLastScanStatus(rootFolderId, {
            at: Date.now(),
            status: 'error',
            message: String(e)
        });
        if (onProgress) {
            onProgress({ jobId, phase: 'error', current: 0, total: 0, message: String(e) });
        }
        throw e;
    } finally {
        activeScanJobs.delete(jobId);
    }
}
