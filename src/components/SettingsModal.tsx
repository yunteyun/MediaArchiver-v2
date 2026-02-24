/**
 * SettingsModal - アプリケーション設定モーダル（タブ式）
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Settings, FileText, RefreshCw, FolderOpen, AlertCircle, AlertTriangle, Info, Database, AppWindow, Image, HardDrive, Star } from 'lucide-react';
import { useUIStore, type SettingsModalTab } from '../stores/useUIStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { ExternalAppsTab } from './ExternalAppsTab';
import { StorageCleanupSection } from './settings/StorageCleanupSection';
import { RatingAxesManager } from './settings/RatingAxesManager';

// Phase 25: ローカル型定義
type StorageMode = 'appdata' | 'install' | 'custom';
interface StorageConfig { mode: StorageMode; customPath?: string; resolvedPath: string; }


type TabType = SettingsModalTab;

export const SettingsModal = React.memo(() => {
    const isOpen = useUIStore((s) => s.settingsModalOpen);
    const requestedTab = useUIStore((s) => s.settingsModalRequestedTab);
    const closeModal = useUIStore((s) => s.closeSettingsModal);

    const videoVolume = useSettingsStore((s) => s.videoVolume);
    const setVideoVolume = useSettingsStore((s) => s.setVideoVolume);
    const audioVolume = useSettingsStore((s) => s.audioVolume);
    const setAudioVolume = useSettingsStore((s) => s.setAudioVolume);
    const thumbnailAction = useSettingsStore((s) => s.thumbnailAction);
    const setThumbnailAction = useSettingsStore((s) => s.setThumbnailAction);
    const performanceMode = useSettingsStore((s) => s.performanceMode);
    const setPerformanceMode = useSettingsStore((s) => s.setPerformanceMode);
    const autoScanOnStartup = useSettingsStore((s) => s.autoScanOnStartup);
    const setAutoScanOnStartup = useSettingsStore((s) => s.setAutoScanOnStartup);
    const previewFrameCount = useSettingsStore((s) => s.previewFrameCount);
    const setPreviewFrameCount = useSettingsStore((s) => s.setPreviewFrameCount);
    const scanThrottleMs = useSettingsStore((s) => s.scanThrottleMs);
    const setScanThrottleMs = useSettingsStore((s) => s.setScanThrottleMs);
    const thumbnailResolution = useSettingsStore((s) => s.thumbnailResolution);
    const setThumbnailResolution = useSettingsStore((s) => s.setThumbnailResolution);


    const showFileName = useSettingsStore((s) => s.showFileName);
    const setShowFileName = useSettingsStore((s) => s.setShowFileName);
    const showDuration = useSettingsStore((s) => s.showDuration);
    const setShowDuration = useSettingsStore((s) => s.setShowDuration);
    const showTags = useSettingsStore((s) => s.showTags);
    const setShowTags = useSettingsStore((s) => s.setShowTags);
    const showFileSize = useSettingsStore((s) => s.showFileSize);
    const setShowFileSize = useSettingsStore((s) => s.setShowFileSize);
    // Phase 14-8: タグポップオーバートリガー設定
    const tagPopoverTrigger = useSettingsStore((s) => s.tagPopoverTrigger);
    const setTagPopoverTrigger = useSettingsStore((s) => s.setTagPopoverTrigger);
    // タグ表示スタイル設定
    const tagDisplayStyle = useSettingsStore((s) => s.tagDisplayStyle);
    const setTagDisplayStyle = useSettingsStore((s) => s.setTagDisplayStyle);
    const fileCardTagOrderMode = useSettingsStore((s) => s.fileCardTagOrderMode);
    const setFileCardTagOrderMode = useSettingsStore((s) => s.setFileCardTagOrderMode);
    // Phase 17-3: playモード詳細設定
    const playMode = useSettingsStore((s) => s.playMode);
    const setPlayModeJumpType = useSettingsStore((s) => s.setPlayModeJumpType);
    const setPlayModeJumpInterval = useSettingsStore((s) => s.setPlayModeJumpInterval);

    const [activeTab, setActiveTab] = useState<TabType>('general');
    const [logs, setLogs] = useState<string[]>([]);
    const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    // Phase 26: バージョン表記
    const [appVersion, setAppVersion] = useState<string>('');

    // Phase 25: ストレージ設定
    const [storageConfig, setStorageConfig] = useState<StorageConfig | null>(null);
    const [selectedMode, setSelectedMode] = useState<StorageMode>('appdata');
    const [customPath, setCustomPath] = useState('');
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationMsg, setMigrationMsg] = useState<{ type: 'success' | 'error'; text: string; oldBase?: string } | null>(null);

    const loadStorageConfig = useCallback(async () => {
        try {
            const cfg = await window.electronAPI.getStorageConfig();
            setStorageConfig(cfg);
            setSelectedMode(cfg.mode);
            setCustomPath(cfg.customPath ?? '');
        } catch (e) {
            console.error('Failed to load storage config:', e);
        }
    }, []);

    const handleMigrate = async () => {
        if (isMigrating) return;
        setIsMigrating(true);
        setMigrationMsg(null);
        try {
            const result = await window.electronAPI.setStorageConfig(
                selectedMode,
                selectedMode === 'custom' ? customPath : undefined
            );
            if (result.success) {
                setMigrationMsg({ type: 'success', text: `移行完了: ${result.newBase}`, oldBase: result.oldBase });
                await loadStorageConfig();
            } else {
                setMigrationMsg({ type: 'error', text: result.error ?? '移行に失敗しました' });
            }
        } catch (e: any) {
            setMigrationMsg({ type: 'error', text: e.message });
        }
        setIsMigrating(false);
    };

    const handleDeleteOldData = async () => {
        if (!migrationMsg?.oldBase) return;
        if (!confirm(`旧データを削除しますか？\n${migrationMsg.oldBase}\n\nこの操作は元に戻せません。`)) return;
        const result = await window.electronAPI.deleteOldStorageData(migrationMsg.oldBase);
        if (result.success) {
            setMigrationMsg(null);
            alert('旧データを削除しました');
        } else {
            alert(`削除失敗: ${result.error}`);
        }
    };


    const loadLogs = useCallback(async () => {
        setIsLoadingLogs(true);
        try {
            const logLines = await window.electronAPI.getLogs(300);
            setLogs(logLines || []);
        } catch (e) {
            console.error('Failed to load logs:', e);
            setLogs(['ログの読み込みに失敗しました']);
        }
        setIsLoadingLogs(false);
    }, []);

    useEffect(() => {
        if (isOpen && requestedTab) {
            setActiveTab(requestedTab);
        }
    }, [isOpen, requestedTab]);

    useEffect(() => {
        if (isOpen && activeTab === 'logs') {
            loadLogs();
        }
        if (isOpen && activeTab === 'storage') {
            loadStorageConfig();
        }
    }, [isOpen, activeTab, loadLogs, loadStorageConfig]);

    // Phase 26: バージョン取得
    useEffect(() => {
        if (isOpen && !appVersion) {
            window.electronAPI.getAppVersion().then((v: string) => setAppVersion(v)).catch(() => { });
        }
    }, [isOpen, appVersion]);

    const filteredLogs = logs.filter(line => {
        if (logFilter === 'all') return true;
        if (logFilter === 'error') return line.includes('[error]');
        if (logFilter === 'warn') return line.includes('[warn]');
        if (logFilter === 'info') return line.includes('[info]');
        return true;
    });

    const getLogLevelIcon = (line: string) => {
        if (line.includes('[error]')) return <AlertCircle size={14} className="text-red-400 flex-shrink-0" />;
        if (line.includes('[warn]')) return <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0" />;
        if (line.includes('[info]')) return <Info size={14} className="text-blue-400 flex-shrink-0" />;
        return <Info size={14} className="text-surface-500 flex-shrink-0" />;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60" style={{ zIndex: 'var(--z-modal)' }}>
            <div
                className="bg-surface-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 h-[80vh] max-h-[80vh] min-h-[560px] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
                    <div className="flex items-center gap-2">
                        <Settings size={20} className="text-primary-400" />
                        <h2 className="text-lg font-semibold text-white">設定</h2>
                    </div>
                    <button
                        onClick={closeModal}
                        className="p-1 hover:bg-surface-700 rounded transition-colors"
                    >
                        <X size={20} className="text-surface-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex flex-nowrap overflow-x-auto border-b border-surface-700">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'general'
                            ? 'text-primary-400 border-b-2 border-primary-400'
                            : 'text-surface-400 hover:text-surface-200'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <Settings size={16} />
                            一般
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('thumbnails')}
                        className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'thumbnails'
                            ? 'text-primary-400 border-b-2 border-primary-400'
                            : 'text-surface-400 hover:text-surface-200'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <Image size={16} />
                            サムネイル
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('storage')}
                        className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'storage'
                            ? 'text-primary-400 border-b-2 border-primary-400'
                            : 'text-surface-400 hover:text-surface-200'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <HardDrive size={16} />
                            ストレージ
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('apps')}
                        className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'apps'
                            ? 'text-primary-400 border-b-2 border-primary-400'
                            : 'text-surface-400 hover:text-surface-200'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <AppWindow size={16} />
                            外部アプリ
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'logs'
                            ? 'text-primary-400 border-b-2 border-primary-400'
                            : 'text-surface-400 hover:text-surface-200'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <FileText size={16} />
                            ログ
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('backup')}
                        className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'backup'
                            ? 'text-primary-400 border-b-2 border-primary-400'
                            : 'text-surface-400 hover:text-surface-200'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <Database size={16} />
                            バックアップ
                        </span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'general' && (
                        <div className="px-4 py-4 space-y-6">

                            {/* Video Volume */}
                            <div>
                                <label className="block text-sm font-medium text-surface-300 mb-2">
                                    動画再生時の音量: {Math.round(videoVolume * 100)}%
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={Math.round(videoVolume * 100)}
                                    onChange={(e) => setVideoVolume(Number(e.target.value) / 100)}
                                    className="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                />
                                <div className="flex justify-between text-xs text-surface-500 mt-1">
                                    <span>0%</span>
                                    <span>100%</span>
                                </div>
                            </div>

                            {/* Audio Volume */}
                            <div>
                                <label className="block text-sm font-medium text-surface-300 mb-2">
                                    音声ファイル再生時の音量: {Math.round(audioVolume * 100)}%
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={Math.round(audioVolume * 100)}
                                    onChange={(e) => setAudioVolume(Number(e.target.value) / 100)}
                                    className="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                />
                                <div className="flex justify-between text-xs text-surface-500 mt-1">
                                    <span>0%</span>
                                    <span>100%</span>
                                </div>
                            </div>


                            {/* Performance Mode */}
                            <div>
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <span className="block text-sm font-medium text-surface-300">
                                            パフォーマンスモード
                                        </span>
                                        <span className="block text-xs text-surface-500 mt-0.5">
                                            ホバーアニメーションを無効化して軽くする
                                        </span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={performanceMode}
                                        onChange={(e) => setPerformanceMode(e.target.checked)}
                                        className="w-5 h-5 accent-primary-500 rounded"
                                    />
                                </label>
                            </div>



                            {/* Display Options */}
                            <div>
                                <label className="block text-sm font-medium text-surface-300 mb-2">
                                    表示項目
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showFileName}
                                            onChange={(e) => setShowFileName(e.target.checked)}
                                            className="w-4 h-4 accent-primary-500 rounded"
                                        />
                                        <span className="text-surface-200 text-sm">ファイル名</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showDuration}
                                            onChange={(e) => setShowDuration(e.target.checked)}
                                            className="w-4 h-4 accent-primary-500 rounded"
                                        />
                                        <span className="text-surface-200 text-sm">再生時間</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showTags}
                                            onChange={(e) => setShowTags(e.target.checked)}
                                            className="w-4 h-4 accent-primary-500 rounded"
                                        />
                                        <span className="text-surface-200 text-sm">タグ</span>
                                    </label>
                                    {/* Phase 14-8: タグポップオーバートリガー設定 */}
                                    {showTags && (
                                        <div className="ml-6 mt-1">
                                            <label className="block text-xs text-surface-400 mb-1">タグポップオーバー表示</label>
                                            <select
                                                value={tagPopoverTrigger}
                                                onChange={(e) => setTagPopoverTrigger(e.target.value as 'click' | 'hover')}
                                                className="w-full px-2 py-1 text-xs bg-surface-800 border border-surface-600 rounded text-surface-200 focus:outline-none focus:border-primary-500"
                                            >
                                                <option value="click">クリック</option>
                                                <option value="hover">ホバー</option>
                                            </select>
                                        </div>
                                    )}
                                    {/* タグ表示スタイル設定 */}
                                    {showTags && (
                                        <div className="ml-6 mt-1">
                                            <label className="block text-xs text-surface-400 mb-1">タグ表示スタイル</label>
                                            <select
                                                value={tagDisplayStyle}
                                                onChange={(e) => setTagDisplayStyle(e.target.value as 'filled' | 'border')}
                                                className="w-full px-2 py-1 text-xs bg-surface-800 border border-surface-600 rounded text-surface-200 focus:outline-none focus:border-primary-500"
                                            >
                                                <option value="filled">塗りつぶし（フル背景色）</option>
                                                <option value="border">左端ライン（ダーク背景）</option>
                                            </select>
                                        </div>
                                    )}
                                    {showTags && (
                                        <div className="ml-6 mt-1">
                                            <label className="block text-xs text-surface-400 mb-1">ファイルカード要約タグの並び</label>
                                            <select
                                                value={fileCardTagOrderMode}
                                                onChange={(e) => setFileCardTagOrderMode(e.target.value as 'balanced' | 'strict')}
                                                className="w-full px-2 py-1 text-xs bg-surface-800 border border-surface-600 rounded text-surface-200 focus:outline-none focus:border-primary-500"
                                            >
                                                <option value="balanced">カテゴリ分散（カテゴリ偏りを抑える）</option>
                                                <option value="strict">厳密順（カテゴリ順→タグ順）</option>
                                            </select>
                                            <p className="mt-1 text-[11px] text-surface-500">
                                                ファイルカードの省略タグ表示（3件表示など）にのみ適用されます。
                                            </p>
                                        </div>
                                    )}
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showFileSize}
                                            onChange={(e) => setShowFileSize(e.target.checked)}
                                            className="w-4 h-4 accent-primary-500 rounded"
                                        />
                                        <span className="text-surface-200 text-sm">ファイルサイズ</span>
                                    </label>
                                </div>
                            </div>

                            {/* Auto Scan on Startup */}
                            <div>
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <span className="block text-sm font-medium text-surface-300">
                                            起動時に自動スキャン
                                        </span>
                                        <span className="block text-xs text-surface-500 mt-0.5">
                                            アプリ起動時に全フォルダをスキャン
                                        </span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={autoScanOnStartup}
                                        onChange={(e) => setAutoScanOnStartup(e.target.checked)}
                                        className="w-5 h-5 accent-primary-500 rounded"
                                    />
                                </label>
                            </div>

                        </div>
                    )}

                    {activeTab === 'thumbnails' && (
                        <div className="px-4 py-4 space-y-6">
                            {/* サムネイル設定セクション */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2">
                                    サムネイル設定
                                </h3>

                                {/* Thumbnail Resolution */}
                                <div>
                                    <label className="block text-sm font-medium text-surface-300 mb-2">
                                        サムネイル解像度: {thumbnailResolution}px
                                    </label>
                                    <input
                                        type="range"
                                        min="160"
                                        max="480"
                                        step="40"
                                        value={thumbnailResolution}
                                        onChange={(e) => {
                                            const resolution = Number(e.target.value);
                                            setThumbnailResolution(resolution);
                                            window.electronAPI.setThumbnailResolution(resolution);
                                        }}
                                        className="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                    />
                                    <div className="flex justify-between text-xs text-surface-500 mt-1">
                                        <span>160px</span>
                                        <span>480px</span>
                                    </div>
                                    <p className="text-xs text-surface-500 mt-1">
                                        次回スキャンから反映。拡大表示時や高DPI環境で効果が出ます。
                                    </p>
                                </div>

                                {/* Thumbnail Hover Action */}
                                <div>
                                    <label className="block text-sm font-medium text-surface-300 mb-2">
                                        サムネイルホバー時の動作
                                    </label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="thumbnailAction"
                                                value="scrub"
                                                checked={thumbnailAction === 'scrub'}
                                                onChange={() => setThumbnailAction('scrub')}
                                                className="w-4 h-4 accent-primary-500"
                                            />
                                            <span className="text-surface-200">スクラブ</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="thumbnailAction"
                                                value="play"
                                                checked={thumbnailAction === 'play'}
                                                onChange={() => setThumbnailAction('play')}
                                                className="w-4 h-4 accent-primary-500"
                                            />
                                            <span className="text-surface-200">再生</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Phase 17-3: Playモード詳細設定 */}
                                {thumbnailAction === 'play' && (
                                    <div className="ml-6 mt-3 space-y-3 border-l-2 border-surface-700 pl-4">
                                        {/* ジャンプタイプ */}
                                        <div>
                                            <label className="block text-sm font-medium text-surface-300 mb-1">
                                                プレビュー動作
                                            </label>
                                            <select
                                                value={playMode.jumpType}
                                                onChange={(e) => setPlayModeJumpType(e.target.value as any)}
                                                className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded text-sm text-surface-200 focus:outline-none focus:border-primary-500"
                                            >
                                                <option value="light">軽量（ジャンプなし）</option>
                                                <option value="random">ランダムジャンプ</option>
                                                <option value="sequential">固定間隔ジャンプ</option>
                                            </select>
                                            <div className="text-xs text-surface-400 mt-1.5 space-y-0.5">
                                                <div><strong>軽量:</strong> 先頭から再生のみ（低負荷）</div>
                                                <div><strong>ランダム:</strong> 毎回ランダムな位置にジャンプ</div>
                                                <div><strong>固定間隔:</strong> 動画を分割して順番にプレビュー</div>
                                            </div>
                                        </div>

                                        {/* ジャンプ間隔（軽量モード以外） */}
                                        {playMode.jumpType !== 'light' && (
                                            <div>
                                                <label className="block text-sm font-medium text-surface-300 mb-1">
                                                    ジャンプ間隔
                                                </label>
                                                <select
                                                    value={playMode.jumpInterval}
                                                    onChange={(e) => setPlayModeJumpInterval(Number(e.target.value) as any)}
                                                    className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded text-sm text-surface-200 focus:outline-none focus:border-primary-500"
                                                >
                                                    <option value={1000}>1秒（高速プレビュー）</option>
                                                    <option value={2000}>2秒（推奨）</option>
                                                    <option value={3000}>3秒</option>
                                                    <option value={5000}>5秒（じっくり確認）</option>
                                                </select>
                                                <p className="text-xs text-surface-400 mt-1.5">
                                                    短いほど多くのシーンを確認できますが、負荷が高くなります
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Preview Frame Count */}
                                <div>
                                    <label className="block text-sm font-medium text-surface-300 mb-2">
                                        プレビューフレーム数: {previewFrameCount === 0 ? 'オフ' : `${previewFrameCount}枚`}
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="30"
                                        step="5"
                                        value={previewFrameCount}
                                        onChange={(e) => {
                                            const count = Number(e.target.value);
                                            setPreviewFrameCount(count);
                                            window.electronAPI.setPreviewFrameCount(count);
                                        }}
                                        className="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                    />
                                    <div className="flex justify-between text-xs text-surface-500 mt-1">
                                        <span>オフ</span>
                                        <span>30枚</span>
                                    </div>
                                    <p className="text-xs text-surface-500 mt-1">
                                        スキャン速度に影響します。0でプレビューフレーム生成をスキップ。
                                    </p>
                                </div>

                                {/* Scan Throttle Delay */}
                                <div>
                                    <label className="block text-sm font-medium text-surface-300 mb-2">
                                        スキャン速度調整（コイル鳴き対策）
                                    </label>
                                    <select
                                        value={scanThrottleMs}
                                        onChange={(e) => {
                                            const ms = Number(e.target.value);
                                            setScanThrottleMs(ms);
                                            window.electronAPI.setScanThrottleMs(ms);
                                        }}
                                        className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded text-surface-200 focus:outline-none focus:border-primary-500"
                                    >
                                        <option value="0">通常速度（推奨）</option>
                                        <option value="50">少し遅く（軽度の対策）</option>
                                        <option value="100">遅く（中程度の対策）</option>
                                        <option value="200">かなり遅く（重度の対策）</option>
                                    </select>
                                    <p className="text-xs text-surface-500 mt-1">
                                        プレビュー生成時のファイル間待機時間を調整します。PCから異音がする場合に設定してください。
                                    </p>
                                </div>
                            </div>

                        </div>
                    )}

                    {activeTab === 'storage' && (
                        <div className="px-4 py-4 space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2 flex items-center gap-2">
                                    <HardDrive size={15} />
                                    保存場所
                                </h3>
                                <p className="text-xs text-surface-500">
                                    データベース、サムネイル、プレビューキャッシュ、ログなどの保存先をまとめて切り替えます。
                                </p>

                                {storageConfig && (
                                    <p className="text-xs text-surface-400">
                                        現在: <span className="text-surface-200 font-mono">{storageConfig.resolvedPath}</span>
                                    </p>
                                )}

                                <div className="space-y-2">
                                    {([
                                        { value: 'appdata', label: 'AppData（デフォルト）', desc: '%APPDATA%\\media-archiver-v2\\' },
                                        { value: 'install', label: 'インストールフォルダ', desc: 'exe と同じフォルダ内の data\\（ポータブル運用）' },
                                        { value: 'custom', label: '任意の場所', desc: 'フォルダを選択して指定' },
                                    ] as { value: StorageMode; label: string; desc: string }[]).map(opt => (
                                        <label key={opt.value} className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-surface-800">
                                            <input
                                                type="radio"
                                                name="storageMode"
                                                value={opt.value}
                                                checked={selectedMode === opt.value}
                                                onChange={() => setSelectedMode(opt.value)}
                                                className="mt-0.5 w-4 h-4 accent-primary-500"
                                            />
                                            <div>
                                                <span className="text-sm text-surface-200">{opt.label}</span>
                                                <span className="block text-xs text-surface-500">{opt.desc}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>

                                {selectedMode === 'custom' && (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={customPath}
                                            onChange={(e) => setCustomPath(e.target.value)}
                                            placeholder="フォルダパスを入力"
                                            className="flex-1 px-3 py-1.5 bg-surface-800 border border-surface-600 rounded text-sm text-surface-200 focus:outline-none focus:border-primary-500"
                                        />
                                        <button
                                            onClick={async () => {
                                                const p = await window.electronAPI.browseStorageFolder();
                                                if (p) setCustomPath(p);
                                            }}
                                            className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-200 text-sm rounded transition-colors flex items-center gap-1"
                                        >
                                            <FolderOpen size={14} />
                                            参照
                                        </button>
                                    </div>
                                )}

                                {migrationMsg && (
                                    <div className={`p-3 rounded text-sm ${migrationMsg.type === 'success' ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                                        <p>{migrationMsg.text}</p>
                                        {migrationMsg.type === 'success' && migrationMsg.oldBase && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className="text-xs text-surface-400">再起動後に有効になります。旧データ:</span>
                                                <button
                                                    onClick={handleDeleteOldData}
                                                    className="px-2 py-0.5 bg-red-700 hover:bg-red-600 text-white text-xs rounded transition-colors"
                                                >
                                                    旧データを削除
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={handleMigrate}
                                    disabled={isMigrating || (selectedMode === 'custom' && !customPath)}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded transition-colors disabled:opacity-50"
                                >
                                    {isMigrating ? <RefreshCw size={14} className="animate-spin" /> : <HardDrive size={14} />}
                                    {isMigrating ? '移行中...' : '変更して移行'}
                                </button>
                                <p className="text-xs text-surface-500">
                                    移行後はアプリの再起動が必要です。旧データは自動削除されません。
                                </p>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2">
                                    サムネイル管理
                                </h3>
                                <StorageCleanupSection />
                            </div>
                        </div>
                    )}

                    {activeTab === 'apps' && (
                        <ExternalAppsTab />
                    )}

                    {activeTab === 'logs' && (
                        <div className="p-4 space-y-4">
                            {/* Log Controls */}
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-surface-400">フィルター:</label>
                                    <select
                                        value={logFilter}
                                        onChange={(e) => setLogFilter(e.target.value as any)}
                                        className="bg-surface-800 text-surface-200 text-sm px-2 py-1 rounded border border-surface-600 focus:outline-none focus:border-primary-500"
                                    >
                                        <option value="all">すべて</option>
                                        <option value="error">エラーのみ</option>
                                        <option value="warn">警告のみ</option>
                                        <option value="info">情報のみ</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={loadLogs}
                                        disabled={isLoadingLogs}
                                        className="flex items-center gap-1 px-3 py-1 bg-surface-700 hover:bg-surface-600 text-surface-200 text-sm rounded transition-colors disabled:opacity-50"
                                    >
                                        <RefreshCw size={14} className={isLoadingLogs ? 'animate-spin' : ''} />
                                        更新
                                    </button>
                                    <button
                                        onClick={() => window.electronAPI.openLogFolder()}
                                        className="flex items-center gap-1 px-3 py-1 bg-surface-700 hover:bg-surface-600 text-surface-200 text-sm rounded transition-colors"
                                    >
                                        <FolderOpen size={14} />
                                        フォルダを開く
                                    </button>
                                </div>
                            </div>

                            {/* Log Display */}
                            <div className="bg-surface-950 rounded border border-surface-700 h-80 overflow-y-auto font-mono text-xs">
                                {filteredLogs.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-surface-500">
                                        {isLoadingLogs ? '読み込み中...' : 'ログがありません'}
                                    </div>
                                ) : (
                                    <div className="p-2 space-y-0.5">
                                        {filteredLogs.map((line, idx) => (
                                            <div
                                                key={idx}
                                                className={`flex items-start gap-2 py-0.5 px-1 rounded hover:bg-surface-800 ${line.includes('[error]') ? 'text-red-300' :
                                                    line.includes('[warn]') ? 'text-yellow-300' :
                                                        'text-surface-300'
                                                    }`}
                                            >
                                                {getLogLevelIcon(line)}
                                                <span className="break-all">{line}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <p className="text-xs text-surface-500">
                                最新300行を表示。ログファイルは日付ごとに自動ローテーションされます。
                            </p>
                        </div>
                    )}

                    {activeTab === 'backup' && (
                        <div className="px-4 py-4 space-y-6">
                            <div>
                                <h3 className="text-sm font-semibold text-white mb-3">データベースバックアップ</h3>

                                {/* 手動バックアップボタン */}
                                <button
                                    onClick={async () => {
                                        try {
                                            const profileId = await window.electronAPI.getActiveProfileId();
                                            const result = await window.electronAPI.createBackup(profileId);
                                            if (result.success) {
                                                alert('バックアップが作成されました');
                                                // 履歴を再読み込み（簡易実装）
                                            } else {
                                                alert(`バックアップ失敗: ${result.error}`);
                                            }
                                        } catch (e: any) {
                                            alert(`エラー: ${e.message}`);
                                        }
                                    }}
                                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors"
                                >
                                    今すぐバックアップを作成
                                </button>

                                <p className="text-xs text-surface-500 mt-2">
                                    現在のデータベースを安全にバックアップします（VACUUM INTO使用）
                                </p>
                            </div>

                            <div className="text-xs text-surface-400 bg-surface-800 p-3 rounded">
                                <p className="font-semibold mb-1">⚠️ 注意事項</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>バックアップにはDBサイズの1.5倍のディスク容量が必要です</li>
                                    <li>リストアを実行するとアプリが再起動されます</li>
                                    <li>バックアップファイルは自動的に世代管理されます（最大5世代）</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeTab === 'ratings' && (
                        <RatingAxesManager />
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-surface-700 flex items-center justify-between">
                    {/* Phase 26: バージョン表記 */}
                    <span className="text-xs text-surface-500">
                        {appVersion ? `v${appVersion}` : ''}
                    </span>
                    <button
                        onClick={closeModal}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded transition-colors"
                    >
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    );
});

SettingsModal.displayName = 'SettingsModal';
