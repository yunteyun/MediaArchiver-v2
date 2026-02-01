/**
 * SettingsModal - アプリケーション設定モーダル
 */

import React from 'react';
import { X, Settings } from 'lucide-react';
import { useUIStore } from '../stores/useUIStore';
import { useSettingsStore } from '../stores/useSettingsStore';

export const SettingsModal = React.memo(() => {
    const isOpen = useUIStore((s) => s.settingsModalOpen);
    const closeModal = useUIStore((s) => s.closeSettingsModal);
    const thumbnailSize = useUIStore((s) => s.thumbnailSize);
    const setThumbnailSize = useUIStore((s) => s.setThumbnailSize);

    const videoVolume = useSettingsStore((s) => s.videoVolume);
    const setVideoVolume = useSettingsStore((s) => s.setVideoVolume);
    const thumbnailAction = useSettingsStore((s) => s.thumbnailAction);
    const setThumbnailAction = useSettingsStore((s) => s.setThumbnailAction);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div
                className="bg-surface-900 rounded-lg shadow-xl w-full max-w-md mx-4"
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

                {/* Content */}
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
