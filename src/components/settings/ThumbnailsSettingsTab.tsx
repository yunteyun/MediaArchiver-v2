import React from 'react';
import type {
    ArchiveThumbnailAction,
    AnimatedImagePreviewMode,
    FlipbookSpeed,
    PlayModeJumpInterval,
    PlayModeJumpType,
    RightPanelVideoPreviewMode,
    ThumbnailAction,
} from '../../stores/useSettingsStore';
import { SettingsSection } from './SettingsSection';

interface ThumbnailsSettingsTabProps {
    previewFrameCount: number;
    onProfilePreviewFrameCountChange: (count: number) => void;
    thumbnailResolution: number;
    onProfileThumbnailResolutionChange: (resolution: number) => void;
    thumbnailAction: ThumbnailAction;
    onThumbnailActionChange: (value: ThumbnailAction) => void;
    archiveThumbnailAction: ArchiveThumbnailAction;
    onArchiveThumbnailActionChange: (value: ArchiveThumbnailAction) => void;
    videoFlipbookSpeed: FlipbookSpeed;
    onVideoFlipbookSpeedChange: (value: FlipbookSpeed) => void;
    archiveFlipbookSpeed: FlipbookSpeed;
    onArchiveFlipbookSpeedChange: (value: FlipbookSpeed) => void;
    animatedImagePreviewMode: AnimatedImagePreviewMode;
    onAnimatedImagePreviewModeChange: (value: AnimatedImagePreviewMode) => void;
    playMode: {
        jumpType: PlayModeJumpType;
        jumpInterval: PlayModeJumpInterval;
    };
    onPlayModeJumpTypeChange: (value: PlayModeJumpType) => void;
    onPlayModeJumpIntervalChange: (value: PlayModeJumpInterval) => void;
    rightPanelVideoPreviewMode: RightPanelVideoPreviewMode;
    onRightPanelVideoPreviewModeChange: (value: RightPanelVideoPreviewMode) => void;
    rightPanelVideoJumpInterval: PlayModeJumpInterval;
    onRightPanelVideoJumpIntervalChange: (value: PlayModeJumpInterval) => void;
    onResetProfileThumbnailSettings: () => void;
    onResetThumbnailBehaviorSettings: () => void;
    onResetRightPanelPreviewSettings: () => void;
}

export const ThumbnailsSettingsTab = React.memo(({
    previewFrameCount,
    onProfilePreviewFrameCountChange,
    thumbnailResolution,
    onProfileThumbnailResolutionChange,
    thumbnailAction,
    onThumbnailActionChange,
    archiveThumbnailAction,
    onArchiveThumbnailActionChange,
    videoFlipbookSpeed,
    onVideoFlipbookSpeedChange,
    archiveFlipbookSpeed,
    onArchiveFlipbookSpeedChange,
    animatedImagePreviewMode,
    onAnimatedImagePreviewModeChange,
    playMode,
    onPlayModeJumpTypeChange,
    onPlayModeJumpIntervalChange,
    rightPanelVideoPreviewMode,
    onRightPanelVideoPreviewModeChange,
    rightPanelVideoJumpInterval,
    onRightPanelVideoJumpIntervalChange,
    onResetProfileThumbnailSettings,
    onResetThumbnailBehaviorSettings,
    onResetRightPanelPreviewSettings,
}: ThumbnailsSettingsTabProps) => {
    const usesVideoFlipbook = thumbnailAction === 'flipbook';
    const usesArchiveFlipbook = archiveThumbnailAction === 'flipbook';

    return (
        <div className="px-4 py-4 space-y-6">
        <SettingsSection
            title="サムネイル生成"
            description="スキャン時に生成するプレビュー枚数とサムネイル解像度を、現在のプロファイル単位で管理します。"
            scope="profile"
            onReset={onResetProfileThumbnailSettings}
        >
            <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                    プレビューフレーム数（プロファイル別）: {previewFrameCount === 0 ? 'オフ' : `${previewFrameCount}枚`}
                </label>
                <input
                    type="range"
                    min="0"
                    max="30"
                    step="5"
                    value={previewFrameCount}
                    onChange={(e) => onProfilePreviewFrameCountChange(Number(e.target.value))}
                    className="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
                <div className="flex justify-between text-xs text-surface-500 mt-1">
                    <span>オフ</span>
                    <span>30枚</span>
                </div>
                <p className="text-xs text-surface-500 mt-1">
                    現在のプロファイルに保存されます。スキャン速度に影響します。0でプレビューフレーム生成をスキップ。
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                    サムネイル解像度（プロファイル別）: {thumbnailResolution}px
                </label>
                <input
                    type="range"
                    min="160"
                    max="480"
                    step="40"
                    value={thumbnailResolution}
                    onChange={(e) => onProfileThumbnailResolutionChange(Number(e.target.value))}
                    className="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
                <div className="flex justify-between text-xs text-surface-500 mt-1">
                    <span>160px</span>
                    <span>480px</span>
                </div>
                <p className="text-xs text-surface-500 mt-1">
                    現在のプロファイルに保存されます。次回スキャンから反映。拡大表示時や高DPI環境で効果が出ます。
                </p>
            </div>
        </SettingsSection>

        <SettingsSection
            title="一覧プレビュー動作"
            description="一覧カード上にマウスを乗せた時のプレビュー動作をアプリ全体の既定値として設定します。"
            scope="global"
            onReset={onResetThumbnailBehaviorSettings}
        >
                <div>
                    <label className="block text-sm font-medium text-surface-300 mb-2">
                        動画カードのホバー時動作
                    </label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="thumbnailAction"
                                value="scrub"
                                checked={thumbnailAction === 'scrub'}
                                onChange={() => onThumbnailActionChange('scrub')}
                                className="w-4 h-4 accent-primary-500"
                            />
                            <span className="text-surface-200">スクラブ</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="thumbnailAction"
                                value="flipbook"
                                checked={thumbnailAction === 'flipbook'}
                                onChange={() => onThumbnailActionChange('flipbook')}
                                className="w-4 h-4 accent-primary-500"
                            />
                            <span className="text-surface-200">自動パラパラ</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="thumbnailAction"
                                value="play"
                                checked={thumbnailAction === 'play'}
                                onChange={() => onThumbnailActionChange('play')}
                                className="w-4 h-4 accent-primary-500"
                            />
                            <span className="text-surface-200">再生</span>
                        </label>
                    </div>
                    <p className="text-xs text-surface-500 mt-1">
                        動画カードに対する既定動作です。書庫カードは下の設定で個別に切り替えます。
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-surface-300 mb-2">
                        書庫カードのホバー時動作
                    </label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="archiveThumbnailAction"
                                value="off"
                                checked={archiveThumbnailAction === 'off'}
                                onChange={() => onArchiveThumbnailActionChange('off')}
                                className="w-4 h-4 accent-primary-500"
                            />
                            <span className="text-surface-200">オフ</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="archiveThumbnailAction"
                                value="flipbook"
                                checked={archiveThumbnailAction === 'flipbook'}
                                onChange={() => onArchiveThumbnailActionChange('flipbook')}
                                className="w-4 h-4 accent-primary-500"
                            />
                            <span className="text-surface-200">自動パラパラ</span>
                        </label>
                    </div>
                    <p className="text-xs text-surface-500 mt-1">
                        画像を含む書庫カードだけに適用します。音声書庫は対象外です。
                    </p>
                </div>

                {usesVideoFlipbook && (
                    <div className="ml-6 mt-2">
                        <label className="block text-sm font-medium text-surface-300 mb-1">
                            動画の自動パラパラ速度
                        </label>
                        <select
                            value={videoFlipbookSpeed}
                            onChange={(e) => onVideoFlipbookSpeedChange(e.target.value as FlipbookSpeed)}
                            className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded text-sm text-surface-200 focus:outline-none focus:border-primary-500"
                        >
                            <option value="slow">遅い</option>
                            <option value="normal">標準</option>
                            <option value="fast">速い</option>
                        </select>
                        <p className="text-xs text-surface-500 mt-1">
                            プレビューフレーム枚数が少ないほど速く見えやすいです。
                        </p>
                    </div>
                )}

                {usesArchiveFlipbook && (
                    <div className="ml-6 mt-2">
                        <label className="block text-sm font-medium text-surface-300 mb-1">
                            書庫の自動パラパラ速度
                        </label>
                        <select
                            value={archiveFlipbookSpeed}
                            onChange={(e) => onArchiveFlipbookSpeedChange(e.target.value as FlipbookSpeed)}
                            className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded text-sm text-surface-200 focus:outline-none focus:border-primary-500"
                        >
                            <option value="slow">遅い</option>
                            <option value="normal">標準</option>
                            <option value="fast">速い</option>
                        </select>
                        <p className="text-xs text-surface-500 mt-1">
                            書庫は代表フレームを順送りで表示します。内容確認を優先するなら `遅い` が向いています。
                        </p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-surface-300 mb-1">
                        アニメ画像プレビュー
                    </label>
                    <select
                        value={animatedImagePreviewMode}
                        onChange={(e) => onAnimatedImagePreviewModeChange(e.target.value as AnimatedImagePreviewMode)}
                        className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded text-sm text-surface-200 focus:outline-none focus:border-primary-500"
                    >
                        <option value="off">オフ</option>
                        <option value="hover">ホバーで再生</option>
                        <option value="visible">表示中に自動再生</option>
                    </select>
                    <p className="text-xs text-surface-500 mt-1">
                        GIF / アニメーションWebP が対象。表示中自動再生は同時2件まで。パフォーマンスモード時は無効になります。
                    </p>
                </div>

                {thumbnailAction === 'play' && (
                    <div className="space-y-3 rounded-md border border-surface-700/80 bg-surface-950/40 p-3">
                        <div>
                            <label className="block text-sm font-medium text-surface-300 mb-1">
                                プレビュー動作
                            </label>
                            <select
                                value={playMode.jumpType}
                                onChange={(e) => onPlayModeJumpTypeChange(e.target.value as PlayModeJumpType)}
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

                        {playMode.jumpType !== 'light' && (
                            <div>
                                <label className="block text-sm font-medium text-surface-300 mb-1">
                                    ジャンプ間隔
                                </label>
                                <select
                                    value={playMode.jumpInterval}
                                    onChange={(e) => onPlayModeJumpIntervalChange(Number(e.target.value) as PlayModeJumpInterval)}
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
        </SettingsSection>

        <SettingsSection
            title="右サイドバー動画プレビュー"
            description="右パネル上部に表示される動画プレビューの既定動作をアプリ全体でそろえます。"
            scope="global"
            onReset={onResetRightPanelPreviewSettings}
        >
                <div>
                    <label className="block text-sm font-medium text-surface-300 mb-1">
                        プレビュー方式
                    </label>
                    <select
                        value={rightPanelVideoPreviewMode}
                        onChange={(e) => onRightPanelVideoPreviewModeChange(e.target.value as RightPanelVideoPreviewMode)}
                        className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded text-sm text-surface-200 focus:outline-none focus:border-primary-500"
                    >
                        <option value="off">停止</option>
                        <option value="loop">ループ再生</option>
                        <option value="long">固定間隔プレビュー</option>
                    </select>
                    <p className="text-xs text-surface-500 mt-1">
                        停止にすると静止サムネイルだけ表示します。固定間隔は内容を順送りで確認します。
                    </p>
                </div>

                {rightPanelVideoPreviewMode === 'long' && (
                    <div>
                        <label className="block text-sm font-medium text-surface-300 mb-1">
                            ジャンプ間隔
                        </label>
                        <select
                            value={rightPanelVideoJumpInterval}
                            onChange={(e) => onRightPanelVideoJumpIntervalChange(Number(e.target.value) as PlayModeJumpInterval)}
                            className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded text-sm text-surface-200 focus:outline-none focus:border-primary-500"
                        >
                            <option value={1000}>1秒（高速プレビュー）</option>
                            <option value={2000}>2秒（推奨）</option>
                            <option value={3000}>3秒</option>
                            <option value={5000}>5秒（じっくり確認）</option>
                        </select>
                    </div>
                )}
        </SettingsSection>
    </div>
    );
});

ThumbnailsSettingsTab.displayName = 'ThumbnailsSettingsTab';
