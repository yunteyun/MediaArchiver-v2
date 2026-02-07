/**
 * SettingsModal - アプリケーション設定モーダル（タブ式）
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Settings, FileText, RefreshCw, FolderOpen, AlertCircle, AlertTriangle, Info, Database } from 'lucide-react';
import { useUIStore } from '../stores/useUIStore';
import { useSettingsStore } from '../stores/useSettingsStore';

type TabType = 'general' | 'logs' | 'backup';

export const SettingsModal = React.memo(() => {
    const isOpen = useUIStore((s) => s.settingsModalOpen);
    const closeModal = useUIStore((s) => s.closeSettingsModal);
    const thumbnailSize = useUIStore((s) => s.thumbnailSize);
    const setThumbnailSize = useUIStore((s) => s.setThumbnailSize);

    const videoVolume = useSettingsStore((s) => s.videoVolume);
    const setVideoVolume = useSettingsStore((s) => s.setVideoVolume);
    const thumbnailAction = useSettingsStore((s) => s.thumbnailAction);
    const setThumbnailAction = useSettingsStore((s) => s.setThumbnailAction);
    const performanceMode = useSettingsStore((s) => s.performanceMode);
    const setPerformanceMode = useSettingsStore((s) => s.setPerformanceMode);
    const autoScanOnStartup = useSettingsStore((s) => s.autoScanOnStartup);
    const setAutoScanOnStartup = useSettingsStore((s) => s.setAutoScanOnStartup);
    const previewFrameCount = useSettingsStore((s) => s.previewFrameCount);
    const setPreviewFrameCount = useSettingsStore((s) => s.setPreviewFrameCount);

    // カード表示設定（Phase 12-3）
    const cardSize = useSettingsStore((s) => s.cardSize);
    const setCardSize = useSettingsStore((s) => s.setCardSize);
    const showFileName = useSettingsStore((s) => s.showFileName);
    const setShowFileName = useSettingsStore((s) => s.setShowFileName);
    const showDuration = useSettingsStore((s) => s.showDuration);
    const setShowDuration = useSettingsStore((s) => s.setShowDuration);
    const showTags = useSettingsStore((s) => s.showTags);
    const setShowTags = useSettingsStore((s) => s.setShowTags);
    const showFileSize = useSettingsStore((s) => s.showFileSize);
    const setShowFileSize = useSettingsStore((s) => s.setShowFileSize);

    const [activeTab, setActiveTab] = useState<TabType>('general');
    const [logs, setLogs] = useState<string[]>([]);
    const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);

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
        if (isOpen && activeTab === 'logs') {
            loadLogs();
        }
    }, [isOpen, activeTab, loadLogs]);

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
                className="bg-surface-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col"
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
                <div className="flex border-b border-surface-700">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'general'
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
                        onClick={() => setActiveTab('logs')}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'logs'
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
                        className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'backup'
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
                            {/* Thumbnail Size */}
                            <div>
                                <label className="block text-sm font-medium text-surface-300 mb-2">
                                    サムネイルサイズ: {thumbnailSize}px
                                </label>
                                <input
                                    type="range"
                                    min="80"
                                    max="300"
                                    value={thumbnailSize}
                                    onChange={(e) => setThumbnailSize(Number(e.target.value))}
                                    className="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                />
                                <div className="flex justify-between text-xs text-surface-500 mt-1">
                                    <span>80px</span>
                                    <span>300px</span>
                                </div>
                            </div>

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

                            {/* Card Size */}
                            <div>
                                <label className="block text-sm font-medium text-surface-300 mb-2">
                                    カードサイズ
                                </label>
                                <div className="flex gap-2">
                                    {(['small', 'medium', 'large'] as const).map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => {
                                                // 連打防止: 同値更新ガード（仮想スクロール多重再計算防止）
                                                if (cardSize !== size) setCardSize(size);
                                            }}
                                            className={`px-4 py-2 rounded transition-colors ${cardSize === size
                                                ? 'bg-primary-600 text-white'
                                                : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
                                                }`}
                                        >
                                            {size === 'small' ? '小' : size === 'medium' ? '中' : '大'}
                                        </button>
                                    ))}
                                </div>
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
                        </div>
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

                            {/* サムネイル診断 */}
                            <div>
                                <h3 className="text-sm font-semibold text-white mb-3">ストレージ診断</h3>
                                <p className="text-sm text-surface-400 mb-3">
                                    データベースに存在しない孤立サムネイルを検出します。
                                </p>
                                <button
                                    onClick={async () => {
                                        try {
                                            const result = await window.electronAPI.diagnoseThumbnails();
                                            const sizeMB = (result.totalOrphanedSize / 1024 / 1024).toFixed(2);
                                            const message = `診断結果:\n\n` +
                                                `総サムネイル数: ${result.totalThumbnails} 個\n` +
                                                `孤立サムネイル: ${result.orphanedCount} 個\n` +
                                                `無駄な容量: ${sizeMB} MB\n\n` +
                                                (result.orphanedCount > 0
                                                    ? `削除機能は Phase 12-6 で実装予定です。`
                                                    : `孤立サムネイルは見つかりませんでした。`);
                                            alert(message);
                                        } catch (e: any) {
                                            alert(`診断エラー: ${e.message}`);
                                        }
                                    }}
                                    className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded transition-colors"
                                >
                                    診断を実行
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-surface-700 flex justify-end">
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
