import { ipcMain, Menu, shell, BrowserWindow, dialog, clipboard, nativeImage } from 'electron';
import { deleteFile, findFileById, updateFileThumbnail, updateFilePreviewFrames, incrementAccessCount, incrementExternalOpenCount, updateFileLocation, updateFileNameAndPath, getFolders, getFiles, getFilesByFolderIds } from '../services/database';
import { generateThumbnail, generatePreviewFrames, regenerateAllThumbnails } from '../services/thumbnail';
import { getPreviewFrameCount, getThumbnailResolution } from '../services/scanner';
import path from 'path';
import sharp from 'sharp';
import { spawn } from 'child_process';
import { access } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { getCachedExternalApps } from './app';
import { deleteFileSafe, moveFileToFolder, relocateFile, validateNewFileName } from '../services/fileOperationService';

type SearchDestinationType = 'filename' | 'image';
type SearchDestinationIcon = 'search' | 'globe' | 'image' | 'camera' | 'book' | 'sparkles' | 'link';

interface SearchDestination {
    id: string;
    name: string;
    type: SearchDestinationType;
    url: string;
    icon: SearchDestinationIcon;
    enabled: boolean;
}

const DEFAULT_SEARCH_DESTINATIONS: SearchDestination[] = [
    { id: 'filename-google', name: 'Google', type: 'filename', url: 'https://www.google.com/search?q={query}', icon: 'search', enabled: true },
    { id: 'filename-duckduckgo', name: 'DuckDuckGo', type: 'filename', url: 'https://duckduckgo.com/?q={query}', icon: 'globe', enabled: true },
    { id: 'filename-bing', name: 'Bing', type: 'filename', url: 'https://www.bing.com/search?q={query}', icon: 'globe', enabled: true },
    { id: 'image-google-lens', name: 'Google Lens', type: 'image', url: 'https://lens.google.com/', icon: 'camera', enabled: true },
    { id: 'image-bing-visual-search', name: 'Bing Visual Search', type: 'image', url: 'https://www.bing.com/visualsearch', icon: 'image', enabled: true },
    { id: 'image-yandex-images', name: 'Yandex Images', type: 'image', url: 'https://yandex.com/images/', icon: 'image', enabled: true },
];

function getDefaultSearchDestinationIcon(type: SearchDestinationType): SearchDestinationIcon {
    return type === 'filename' ? 'search' : 'image';
}

function getSearchDestinationIconPrefix(icon: SearchDestinationIcon): string {
    if (icon === 'search') return '🔎';
    if (icon === 'globe') return '🌐';
    if (icon === 'image') return '🖼';
    if (icon === 'camera') return '📷';
    if (icon === 'book') return '📚';
    if (icon === 'sparkles') return '✨';
    return '🔗';
}

function normalizeSearchDestinationIcon(icon: unknown, type: SearchDestinationType): SearchDestinationIcon {
    const allowedIcons: SearchDestinationIcon[] = ['search', 'globe', 'image', 'camera', 'book', 'sparkles', 'link'];
    return typeof icon === 'string' && allowedIcons.includes(icon as SearchDestinationIcon)
        ? icon as SearchDestinationIcon
        : getDefaultSearchDestinationIcon(type);
}

function buildFilenameSearchQuery(filePath: string): string {
    const parsed = path.parse(filePath);
    const normalized = parsed.name
        .normalize('NFKC')
        .replace(/[\u3000]/g, ' ')
        .replace(/[_.]+/g, ' ')
        .replace(/[[\](){}]+/g, ' ')
        .replace(/(?<=\s|^)(?:img|image|scan|sample|copy|cropped?|edited?)(?=\s|$)/gi, ' ')
        .replace(/(?<=\s|^)\d{2,4}x\d{2,4}(?=\s|$)/gi, ' ')
        .replace(/(?<=\s|^)(?:\d{1,4}p|4k|8k|uhd|fhd|qhd|hd)(?=\s|$)/gi, ' ')
        .replace(/(?<=\s|^)(?:vol|chapter|ch|page|p)\s*\d{1,4}(?=\s|$)/gi, ' ')
        .replace(/(?<=\s|^)(?:v|ver)\s*\d+(?:\.\d+)?(?=\s|$)/gi, ' ')
        .replace(/(?<=\s|^)\d{1,4}(?:枚|pages?|p)(?=\s|$)/gi, ' ')
        .replace(/(?<=\s|^)\d{5,}(?=\s|$)/g, ' ')
        .replace(/\b(?:jpg|jpeg|png|gif|webp|avif|bmp|zip|rar|7z|cbz|cbr|mp4|mkv|webm)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return normalized || parsed.name.trim();
}

function buildSuggestedRename(filePath: string): string {
    const parsed = path.parse(filePath);
    const suggestedBaseName = buildFilenameSearchQuery(filePath);
    return suggestedBaseName ? `${suggestedBaseName}${parsed.ext}` : parsed.base;
}

function resolveImageSearchSourcePaths(filePath: string, singleFile: ReturnType<typeof findFileById> | null): string[] {
    if (!singleFile) return [];

    const candidates: string[] = [];
    const pushCandidate = (candidate?: string | null) => {
        if (!candidate) return;
        if (!candidates.includes(candidate)) {
            candidates.push(candidate);
        }
    };

    if (singleFile.type === 'image') {
        // アニメ画像は元ファイルのデコードで失敗しやすいため、サムネイル優先で候補化する。
        if (singleFile.is_animated === 1) {
            pushCandidate(singleFile.thumbnail_path);
            pushCandidate(filePath);
        } else {
            pushCandidate(filePath);
            pushCandidate(singleFile.thumbnail_path);
        }
    }

    if (singleFile.type === 'archive') {
        pushCandidate(singleFile.thumbnail_path);
    }

    return candidates;
}

function normalizeSearchDestinations(input: unknown): SearchDestination[] {
    if (!Array.isArray(input) || input.length === 0) {
        return DEFAULT_SEARCH_DESTINATIONS;
    }

    const normalized = input
        .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const candidate = item as Partial<SearchDestination>;
            if (
                (candidate.type !== 'filename' && candidate.type !== 'image') ||
                typeof candidate.name !== 'string' ||
                typeof candidate.url !== 'string'
            ) {
                return null;
            }

            const trimmedName = candidate.name.trim();
            const trimmedUrl = candidate.url.trim();
            if (!trimmedName || !trimmedUrl || !/^https?:\/\//i.test(trimmedUrl)) {
                return null;
            }
            if (candidate.type === 'filename' && !trimmedUrl.includes('{query}')) {
                return null;
            }

            return {
                id: typeof candidate.id === 'string' ? candidate.id : crypto.randomUUID(),
                name: trimmedName,
                type: candidate.type,
                url: trimmedUrl,
                icon: normalizeSearchDestinationIcon(candidate.icon, candidate.type),
                enabled: candidate.enabled !== false,
            } satisfies SearchDestination;
        })
        .filter((destination): destination is SearchDestination => destination !== null);

    return normalized.length > 0 ? normalized : DEFAULT_SEARCH_DESTINATIONS;
}

async function copyImageToClipboard(imagePaths: string[]): Promise<string> {
    const errors: string[] = [];

    for (const imagePath of imagePaths) {
        try {
            await access(imagePath, fsConstants.F_OK);
            let image = nativeImage.createFromPath(imagePath);
            if (image.isEmpty()) {
                const pngBuffer = await sharp(imagePath, { animated: true })
                    .png()
                    .toBuffer();
                image = nativeImage.createFromBuffer(pngBuffer);
            }
            if (image.isEmpty()) {
                throw new Error('画像データを読み込めませんでした');
            }
            clipboard.writeImage(image);
            return imagePath;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push(`${imagePath}: ${message}`);
        }
    }

    throw new Error(errors.length > 0 ? errors.join('\n') : '利用可能な画像が見つかりませんでした');
}

async function openFilenameSearch(destination: SearchDestination, filePath: string): Promise<void> {
    const query = buildFilenameSearchQuery(filePath);
    if (!query) return;
    const targetUrl = destination.url.replace(/\{query\}/g, encodeURIComponent(query));
    await shell.openExternal(targetUrl);
}

async function openImageSearch(destination: SearchDestination, imagePaths: string[]): Promise<void> {
    await copyImageToClipboard(imagePaths);
    await shell.openExternal(destination.url);
}

export function registerFileHandlers() {
    ipcMain.handle('file:showContextMenu', async (event, { fileId, filePath, selectedFileIds, searchDestinations }) => {
        // Bug 2修正: 複数選択対応
        const effectiveFileIds = selectedFileIds && selectedFileIds.length > 0 ? selectedFileIds : [fileId];
        const isMultiple = effectiveFileIds.length > 1;
        const singleFile = !isMultiple ? findFileById(fileId) : null;

        const ext = path.extname(filePath).toLowerCase().substring(1);
        const cachedApps = getCachedExternalApps();
        const imageSearchSourcePaths = !isMultiple ? resolveImageSearchSourcePaths(filePath, singleFile) : [];
        const configuredSearchDestinations = normalizeSearchDestinations(searchDestinations);
        const filenameSearchDestinations = configuredSearchDestinations.filter((destination) => destination.type === 'filename' && destination.enabled);
        const imageSearchDestinations = configuredSearchDestinations.filter((destination) => destination.type === 'image' && destination.enabled);

        // 対応する外部アプリをフィルタリング
        const compatibleApps = cachedApps.filter(app =>
            app.extensions.length === 0 || app.extensions.includes(ext)
        );

        // メニューテンプレートを動的に構築
        const menuTemplate: Electron.MenuItemConstructorOptions[] = [
            {
                label: 'デフォルトアプリで開く',
                enabled: !isMultiple, // 複数選択時は無効
                click: async () => {
                    await shell.openPath(filePath);
                    const result = incrementExternalOpenCount(fileId);
                    event.sender.send('file:externalOpenCountUpdated', {
                        fileId,
                        externalOpenCount: result.externalOpenCount,
                        lastExternalOpenedAt: result.lastExternalOpenedAt,
                    });
                }
            },
        ];

        // 「別のモードで開く」
        // NOTE:
        // metadata.hasAudio が未保存の旧データでもメニューを出せるよう、
        // 書庫なら表示して、実際の表示は Lightbox 側の内容に委ねる。
        if (!isMultiple && singleFile?.type === 'archive') {
            const openAsSubmenu: Electron.MenuItemConstructorOptions[] = [];
            openAsSubmenu.push({
                label: '画像書庫として開く',
                click: () => {
                    event.sender.send('file:openAsMode', { fileId, mode: 'archive-image' });
                }
            });
            openAsSubmenu.push({
                label: '音声書庫として開く',
                click: () => {
                    event.sender.send('file:openAsMode', { fileId, mode: 'archive-audio' });
                }
            });

            if (openAsSubmenu.length > 0) {
                menuTemplate.push({ type: 'separator' });
                menuTemplate.push({
                    label: '別のモードで開く',
                    submenu: openAsSubmenu,
                });
            }
        }

        // 登録済み外部アプリを追加
        if (compatibleApps.length > 0) {
            menuTemplate.push({ type: 'separator' });
            for (const app of compatibleApps) {
                menuTemplate.push({
                    label: `${app.name}で開く`,
                    enabled: !isMultiple, // 複数選択時は無効
                    click: async () => {
                        try {
                            const child = spawn(path.resolve(app.path), [path.resolve(filePath)], {
                                detached: true,
                                stdio: 'ignore'
                            });
                            child.unref();

                            const result = incrementExternalOpenCount(fileId);
                            event.sender.send('file:externalOpenCountUpdated', {
                                fileId,
                                externalOpenCount: result.externalOpenCount,
                                lastExternalOpenedAt: result.lastExternalOpenedAt,
                            });
                        } catch (e) {
                            console.error('Failed to open with app:', e);
                        }
                    }
                });
            }
        }

        // 既存のメニュー項目を追加
        menuTemplate.push(
            { type: 'separator' },
            {
                label: '移動',
                enabled: !isMultiple, // 複数選択時は無効（将来対応）
                click: async () => {
                    const file = findFileById(fileId);
                    if (!file) return;

                    // UIStoreのopenMoveDialogを呼び出す
                    event.sender.send('file:openMoveDialog', {
                        fileIds: [fileId],
                        currentFolderId: file.root_folder_id
                    });
                }
            },
            {
                label: 'エクスプローラーで表示',
                enabled: !isMultiple, // 複数選択時は無効
                click: async () => {
                    shell.showItemInFolder(filePath);
                }
            },
            {
                label: 'ファイル名で検索',
                enabled: !isMultiple,
                submenu: [
                    ...filenameSearchDestinations.map((destination) => ({
                        label: `${getSearchDestinationIconPrefix(destination.icon)} ${destination.name} で検索`,
                        click: async () => {
                            await openFilenameSearch(destination, filePath);
                        }
                    })),
                    ...(filenameSearchDestinations.length > 0 ? [{ type: 'separator' as const }] : []),
                    {
                        label: '検索語をコピー',
                        click: () => {
                            const query = buildFilenameSearchQuery(filePath);
                            if (!query) return;
                            clipboard.writeText(query);
                        }
                    },
                ],
            },
            {
                label: '画像で検索',
                enabled: !isMultiple && imageSearchSourcePaths.length > 0,
                submenu: [
                    {
                        label: '画像をコピー',
                        click: async () => {
                            if (imageSearchSourcePaths.length === 0) return;
                            try {
                                await copyImageToClipboard(imageSearchSourcePaths);
                                event.sender.send('ui:showToast', {
                                    message: '画像をコピーしました',
                                    type: 'success',
                                    duration: 1800,
                                });
                            } catch (error) {
                                console.error('Failed to copy image for visual search:', error);
                                await dialog.showMessageBox({
                                    type: 'error',
                                    title: '画像コピーエラー',
                                    message: '画像をクリップボードへコピーできませんでした。',
                                    detail: error instanceof Error ? error.message : String(error),
                                });
                            }
                        }
                    },
                    ...(imageSearchDestinations.length > 0 ? [{ type: 'separator' as const }] : []),
                    ...imageSearchDestinations.map((destination) => ({
                        label: `${getSearchDestinationIconPrefix(destination.icon)} ${destination.name} を開く（画像をコピー）`,
                        click: async () => {
                            if (imageSearchSourcePaths.length === 0) return;
                            try {
                                await openImageSearch(destination, imageSearchSourcePaths);
                                event.sender.send('ui:showToast', {
                                    message: '画像をコピーしました',
                                    type: 'success',
                                    duration: 1800,
                                });
                            } catch (error) {
                                console.error('Failed to open image search destination:', error);
                                await dialog.showMessageBox({
                                    type: 'error',
                                    title: '画像検索エラー',
                                    message: '画像検索を開始できませんでした。',
                                    detail: error instanceof Error ? error.message : String(error),
                                });
                            }
                        }
                    })),
                ],
            },
            {
                label: '名前を変更',
                enabled: !isMultiple,
                click: async () => {
                    if (!singleFile) return;
                    event.sender.send('file:requestRename', {
                        fileId,
                        currentName: singleFile.name,
                        currentPath: singleFile.path,
                        suggestedName: buildSuggestedRename(singleFile.path),
                    });
                }
            },
            { type: 'separator' },
            {
                label: 'サムネイル再作成',
                enabled: !isMultiple, // 複数選択時は無効
                click: async () => {
                    try {
                        const file = findFileById(fileId);
                        if (!file) return;

                        // 開始通知
                        event.sender.send('scanner:progress', {
                            phase: 'scanning',
                            current: 0,
                            total: 1,
                            currentFile: path.basename(filePath),
                            message: 'サムネイル生成中...'
                        });

                        // サムネイル生成
                        const thumbnailPath = await generateThumbnail(filePath, getThumbnailResolution());
                        if (thumbnailPath) {
                            updateFileThumbnail(fileId, thumbnailPath);
                        }

                        // 動画ファイルの場合はプレビューフレームも再生成
                        const fileExt = path.extname(filePath).toLowerCase();
                        const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.webm', '.flv', '.m4v', '.mpeg', '.mpg', '.3gp'];
                        if (videoExts.includes(fileExt)) {
                            const frameCount = getPreviewFrameCount();

                            // 設定が0の場合はスキップ
                            if (frameCount === 0) {
                                console.log('[Thumbnail Regeneration] Preview frame count is 0, skipping generation');
                            } else {
                                // プレビューフレーム生成中の通知
                                event.sender.send('scanner:progress', {
                                    phase: 'scanning',
                                    current: 0,
                                    total: 1,
                                    currentFile: path.basename(filePath),
                                    message: 'プレビューフレーム生成中...'
                                });

                                console.log(`[Thumbnail Regeneration] Regenerating preview frames (target: ${frameCount} frames)`);
                                const previewFrames = await generatePreviewFrames(filePath, frameCount);
                                if (previewFrames) {
                                    updateFilePreviewFrames(fileId, previewFrames);
                                    console.log('[Thumbnail Regeneration] Preview frames regenerated successfully');
                                } else {
                                    console.log('[Thumbnail Regeneration] Preview frames generation failed');
                                }
                            }
                        }

                        // 完了通知
                        event.sender.send('scanner:progress', {
                            phase: 'complete',
                            current: 1,
                            total: 1,
                            message: 'サムネイル再生成完了'
                        });

                        // ファイル更新を通知
                        event.sender.send('file:thumbnailRegenerated', fileId);
                    } catch (e) {
                        console.error('Failed to regenerate thumbnail:', e);
                        // エラー通知
                        event.sender.send('scanner:progress', {
                            phase: 'error',
                            message: 'サムネイル再生成に失敗しました'
                        });
                    }
                }
            },
            { type: 'separator' },
            {
                label: 'フォルダに移動',
                submenu: getFolders().map(folder => ({
                    label: isMultiple ? `${folder.name} (${effectiveFileIds.length}件)` : folder.name,
                    click: async () => {
                        // Bug 2修正: 複数ファイルの移動
                        for (const id of effectiveFileIds) {
                            event.sender.send('file:requestMove', { fileId: id, targetFolderId: folder.id });
                        }
                    }
                }))
            },
            { type: 'separator' },
            {
                label: isMultiple ? `ファイルを削除 (${effectiveFileIds.length}件)` : 'ファイルを削除',
                click: async () => {
                    // Bug 2修正: 複数ファイルの削除
                    for (const id of effectiveFileIds) {
                        const file = findFileById(id);
                        if (file) {
                            event.sender.send('file:showDeleteDialog', { fileId: id, filePath: file.path });
                        }
                    }
                }
            }
        );

        const menu = Menu.buildFromTemplate(menuTemplate);

        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            menu.popup({ window: win });
        }
    });

    // === File Delete Confirmation Handler (Phase 12-17B) ===
    ipcMain.handle('file:confirmDelete', async (event, { fileId, filePath, permanentDelete }) => {
        // 完全削除の場合は二重確認
        if (permanentDelete) {
            const { response } = await dialog.showMessageBox({
                type: 'warning',
                title: '完全削除の確認',
                message: '本当に完全に削除しますか？',
                detail: 'この操作は取り消せません。ファイルはゴミ箱に移動せず、完全に削除されます。',
                buttons: ['完全に削除', 'キャンセル'],
                defaultId: 1,  // デフォルト: キャンセル
                cancelId: 1
            });

            if (response === 1) {
                return { success: false, cancelled: true };
            }
        }

        try {
            // 削除実行
            const moveToTrash = !permanentDelete;
            const result = await deleteFileSafe(filePath, moveToTrash);

            if (!result.success) {
                return { success: false, error: result.error };
            }

            // DB削除
            deleteFile(fileId);
            event.sender.send('file:deleted', fileId);

            return { success: true };
        } catch (e) {
            console.error('Failed to delete file:', e);
            return {
                success: false,
                error: e instanceof Error ? e.message : String(e)
            };
        }
    });

    // Phase 17: アクセス回数をインクリメント
    ipcMain.handle('file:incrementAccessCount', async (_event, fileId: string) => {
        try {
            const result = incrementAccessCount(fileId);
            return {
                success: true,
                accessCount: result.accessCount,
                lastAccessedAt: result.lastAccessedAt
            };
        } catch (error) {
            console.error('Failed to increment access count:', error);
            return { success: false, error: String(error) };
        }
    });

    // 外部アプリ起動回数をインクリメント
    ipcMain.handle('file:incrementExternalOpenCount', async (_event, fileId: string) => {
        try {
            const result = incrementExternalOpenCount(fileId);
            return {
                success: true,
                externalOpenCount: result.externalOpenCount,
                lastExternalOpenedAt: result.lastExternalOpenedAt,
            };
        } catch (error) {
            console.error('Failed to increment external open count:', error);
            return { success: false, error: String(error) };
        }
    });

    // Phase 18-C: ファイル移動
    ipcMain.handle('file:moveToFolder', async (event, { fileId, targetFolderId }) => {
        try {
            console.log('[File Move] Starting file move:', { fileId, targetFolderId });

            // DBからファイル情報取得
            const file = findFileById(fileId);
            if (!file) {
                console.error('[File Move] File not found:', fileId);
                return { success: false, error: 'ファイルが見つかりません' };
            }
            console.log('[File Move] Source file:', file.path);

            // 移動先フォルダ情報取得
            const folders = getFolders();
            const targetFolder = folders.find(f => f.id === targetFolderId);
            if (!targetFolder) {
                console.error('[File Move] Target folder not found:', targetFolderId);
                return { success: false, error: '移動先フォルダが見つかりません' };
            }
            console.log('[File Move] Target folder:', targetFolder.path);

            // 新しいパスを生成
            const fileName = path.basename(file.path);
            const newPath = path.join(targetFolder.path, fileName);
            console.log('[File Move] New path:', newPath);

            // ファイル移動実行
            const moveResult = await moveFileToFolder(file.path, newPath);
            console.log('[File Move] Move result:', moveResult);

            if (!moveResult.success) {
                console.error('[File Move] Move failed:', moveResult.error);
                return { success: false, error: moveResult.error };
            }

            // DB更新
            updateFileLocation(fileId, newPath, targetFolderId);
            console.log('[File Move] DB updated');

            // フロントエンドに通知
            event.sender.send('file:moved', { fileId, newPath, targetFolderId });

            return { success: true, newPath };
        } catch (error) {
            console.error('[File Move] Exception:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });

    ipcMain.handle('file:rename', async (_event, { fileId, newName }: { fileId: string; newName: string }) => {
        try {
            if (!fileId || typeof fileId !== 'string') {
                return { success: false, error: '対象ファイルが不正です' };
            }

            const nameValidationError = validateNewFileName(newName ?? '');
            if (nameValidationError) {
                return { success: false, error: nameValidationError };
            }

            const file = findFileById(fileId);
            if (!file) {
                return { success: false, error: 'ファイルが見つかりません' };
            }

            const normalizedName = newName.trim();
            if (normalizedName === file.name) {
                return { success: true, newName: file.name, newPath: file.path };
            }

            const sourcePath = file.path;
            const targetPath = path.join(path.dirname(sourcePath), normalizedName);

            if (sourcePath === targetPath) {
                return { success: true, newName: file.name, newPath: file.path };
            }

            const relocateResult = await relocateFile(sourcePath, targetPath);
            if (!relocateResult.success) {
                return { success: false, error: relocateResult.error ?? 'ファイル名の変更に失敗しました' };
            }

            updateFileNameAndPath(fileId, normalizedName, targetPath);
            return { success: true, newName: normalizedName, newPath: targetPath };
        } catch (error) {
            console.error('[File Rename] Failed:', error);
            const err = error as NodeJS.ErrnoException;
            if (err?.code === 'EEXIST') {
                return { success: false, error: '同じ名前のファイルが既に存在します' };
            }
            if (err?.code === 'ENOENT') {
                return { success: false, error: 'ファイルが見つかりません' };
            }
            if (err?.code === 'EACCES' || err?.code === 'EPERM') {
                return { success: false, error: 'ファイル名を変更する権限がありません' };
            }
            return { success: false, error: err?.message || 'ファイル名の変更に失敗しました' };
        }
    });

    // Phase 22-C: ドライブ配下の全ファイル取得
    ipcMain.handle('getFilesByDrive', async (_, drive: string) => {
        const folders = getFolders().filter(f => f.drive === drive);
        const folderIds = folders.map(f => f.id);

        if (folderIds.length === 0) return [];

        return getFilesByFolderIds(folderIds);
    });

    // Phase 22-C: フォルダ配下の全ファイル取得（再帰）
    ipcMain.handle('getFilesByFolderRecursive', async (_, folderId: string) => {
        const folders = getFolders();

        // parentMap構築
        const parentMap = new Map<string, string[]>();
        folders.forEach(f => {
            if (!f.parent_id) return;
            if (!parentMap.has(f.parent_id)) {
                parentMap.set(f.parent_id, []);
            }
            parentMap.get(f.parent_id)!.push(f.id);
        });

        // 子孫フォルダID取得
        const descendants: string[] = [];
        const stack = [folderId];

        while (stack.length) {
            const current = stack.pop()!;
            const children = parentMap.get(current) || [];

            children.forEach(child => {
                descendants.push(child);
                stack.push(child);
            });
        }

        return getFilesByFolderIds([folderId, ...descendants]);
    });

    // Phase 24: サムネイル一括再生成（WebP化）
    ipcMain.handle('thumbnail:regenerateAll', async (event) => {
        const files = getFiles();  // 引数なしで全件取得

        const result = await regenerateAllThumbnails(
            files.map(f => ({
                id: f.id,
                path: f.path,
                type: f.type,
                thumbnailPath: f.thumbnail_path ?? null,
            })),
            async (fileId, newThumbnailPath) => {
                updateFileThumbnail(fileId, newThumbnailPath);
            },
            (current, total) => {
                event.sender.send('thumbnail:regenerateProgress', { current, total });
            }
        );

        return result;
    });
}

