# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]
### Added
- **ファイル削除の安全性向上（ゴミ箱機能）** (2026-02-09)
  - `fileOperationService` の実装（削除ロジックの一元化）
  - ファイル削除時にデフォルトでゴミ箱へ移動 (`shell.trashItem`)
  - 確認ダイアログの拡張（ゴミ箱に移動 / 完全に削除 / キャンセル）
  - 完全削除選択時の二重確認
  - 重複ファイル削除の安全性向上（強制的にゴミ箱移動）

- **Phase 12-6: ストレージクリーンアップ機能** (2026-02-09)
  - DBに存在しない孤立サムネイルの検出・削除
  - 設定画面「サムネイル」タブからの手動実行
  - 削除前の確認ダイアログと結果表示
  - 安全な削除の実装（ロック中ファイルのスキップ、ENOENTハンドリング）

- **Phase 12-16: 設定UI改善（サムネイルタブ化）** (2026-02-09)
  - 設定画面に独立した「サムネイル」タブを追加
  - サムネイルサイズ、ホバー動作、プレビュー枚数設定を集約
  - クリーンアップ機能を統合し「サムネイル管理」セクション化

- **Phase 12-17B: カスタム削除ダイアログ実装** (2026-02-09)
  - `DeleteConfirmDialog.tsx` コンポーネント実装
  - チェックボックス付きUI（ゴミ箱 / 完全削除の選択）
  - キーボード操作対応（Enter=削除 / Esc=キャンセル）
  - Phase 12-17A（方針決定）を経てB案（カスタム実装）を採用

- **Phase 12-18: サムネイル再作成最適化** (2026-02-09)
  - プレビューフレーム存在確認ロジックの追加
  - 不要な再生成をスキップ（CPU/ディスク負荷軽減）
  - 設定値0の場合のスキップ処理
  - コンソールログによる挙動確認対応

### Changed
- 設定画面（SettingsModal）の構造変更
  - 「一般」タブからサムネイル関連設定を削除
  - 「バックアップ」タブから診断機能を移動
  - タブ順序の変更（一般 → サムネイル → アプリ...）

### Fixed
- **緊急不具合修正（2026-02-06）**
  - Lightbox表示問題: 動画・画像・書庫内画像に `max-width: 90vw`, `max-height: 80vh`, `object-fit: contain` を適用し、画面はみ出しを修正
  - 書庫内音声の音量設定保存: `videoVolume` を書庫内音声プレイヤーに適用し、音量変更を永続化
  - `media://` プロトコルのRangeリクエスト対応: `fs.createReadStream` + 手動Range処理に切り替え、動画シーク機能を修正

### Added
- **Phase 12-8 フェーズ1: タグ管理機能の拡張** (2026-02-07)
  - タグにアイコンと説明文を追加
  - lucide-react アイコンの動的レンダリング
  - タグフィルターパネルに検索機能を実装（名前・説明文で検索）
  - ツールチップで説明文を表示
  - マイグレーション 003 でDB拡張（icon, description列追加）
  - TagBadge、TagFilterPanel、TagManagerModal、FileCard を更新

- **Phase 12-8 フェーズ2: 自動タグ割り当て機能 (MVP)** (2026-02-07)
  - ファイル名・フォルダ名に基づく自動タグ付与ルール作成機能
  - ルール管理UI（タグ管理モーダル内）の実装
  - ヘッダーへの「自動タグ適用」ボタン追加（選択/全ファイル一括適用）
  - トースト通知による適用結果表示
  - `auto_tag_rules` テーブル追加 (Migration 004)

- **Phase 12-11: 設定アイコンの視認性向上** (2026-02-07)
  - Header右上の古い設定ボタンを削除（サイドバーに移設済み）
  - UI整理による視認性向上

- **Phase 12-15: 音声書庫アイコン改善** (2026-02-07)
  - 音声書庫ファイルのアイコンを `FileMusic` に変更
  - 音声ファイルと書庫ファイルの両方が視認可能に

- **Phase 12-4: フォルダビュー拡張**
  - FileGridにフォルダカードを表示する機能を追加
  - フォルダごとのファイル数と整合サムネイルを表示
  - フォルダクリックでナビゲーション可能に
  - データ取得の最適化（N+1問題対策済み）

- **Phase 12-5a: スクラブモードシークバー**
  - スクラブモード時に現在位置を示すシークバーを表示
  - マウス位置に応じてシークバーの幅が変化
  - 段階的実装戦略（視認性優先→デザイン調整）で成功
  - シアン色で視認性を確保

### Added
- **Phase 12-1: トースト通知システム** 🆕
  - `useToastStore` の作成（addToast, removeToast, success, error, info）
  - `App.tsx` への `ToastContainer` 統合
  - スキャン完了時のトースト通知
  - 画面右下に3秒間表示される通知システム

### Added
- **Phase 8: データ整合性の強化**
  - 8-1: サムネイル・プレビューフレームの自動削除
    - ファイル削除時にサムネイル画像も削除
    - フォルダ削除時に配下の全サムネイルを削除
    - プロファイル削除時にサムネイルディレクトリごと削除
  - 8-2: トランザクション処理の導入
    - スキャン処理をバッチトランザクション化（100件ごと）
    - データベース書き込みの高速化（10〜100倍）
    - クラッシュ時の自動ロールバック
  - 8-3: エラーログシステムの実装
    - `electron-log` ライブラリの導入
    - ログファイルへの永続化（`logs/app-YYYY-MM-DD.log`）
    - エラーレベル別のログ出力（error/warn/info/debug）
    - 設定画面にログビューアー追加

- **Phase 9-1: 音声ファイル対応**
  - 対応形式: mp3, wav, flac, m4a, ogg, aac, wma
  - アルバムアート抽出（FFmpeg）
  - メタデータ取得（アーティスト、アルバム、再生時間）
  - 書庫内音声ファイルの対応
  - 書庫内音声再生UIの改善（表示サイズ調整）
  - 書庫内音声の連続再生オプション

- **Phase 9-2: ファイルハッシュ計算と重複検出** 🆕
  - SHA256ハッシュ計算（ストリーム処理、EBUSY/ENOENT/EPERMエラーハンドリング）
  - サイズ衝突戦略による高速重複検出
  - 重複ファイル一覧表示UI（DuplicateView.tsx）
  - スマート選択（新しい/古い/パスが短いファイルを残す）
  - 重複ファイルの一括削除機能
  - IPC進捗イベント間引き（50-100ms）

- **Phase 9-3: 「すべてのファイル」ビュー**
  - 全フォルダ統合表示機能
  - サイドバーに「すべてのファイル」項目追加

- **Phase 9-4: メモ機能**
  - ファイルごとのメモ追加・編集
  - LightBox にメモ編集UI追加（自動保存機能付き）
  - データベースに `notes` カラム追加

- **Phase 10-1: DBスキーママイグレーション** 🆕
  - マイグレーションシステムの実装（migrations/index.ts）
  - Migration型の分離（循環参照解消）
  - 既存schema_versionテーブルとの互換性対応
  - 初期スキーマ定義（001_initial_schema.ts）

- **Phase 11-1: カテゴリ別統計表示** 🆕
  - ファイルタイプ別円グラフ（recharts、色分け：画像/動画/書庫/音声）
  - タグ別棒グラフ（上位20件、タグ色反映）
  - フォルダ別棒グラフ（ファイル数・サイズ表示）
  - 月別登録推移（折れ線グラフ、過去12ヶ月、strftime使用）
  - 未整理ファイル率（タグあり/なし、ドーナツチャート、パーセンテージ表示）
  - SQL GROUP BY によるパフォーマンス最適化
  - Recharts警告修正（min-w-0/min-h-0追加）

- **Phase 11-2: 追加統計機能** 🆕
  - 評価分布（★1-5）棒グラフ（cat_rating カテゴリのタグ集計）
  - 巨大ファイル Top 10（サイズ順、サムネイル付きリスト表示）
  - 拡張子ランキング（Top 20、ファイル名から抽出、グリッド表示）
  - 解像度分布（4K/FHD/HD/SD/不明、円グラフ、metadata JSON解析）
  - 動画・画像のみを対象とした解像度分類

- **Phase 11-3: アクティビティログ** 🆕
  - マイグレーション 002_activity_logs.ts（activity_logsテーブル追加）
  - activityLogService.ts: Fire-and-Forget方式のログ記録（メイン処理を阻害しない）
  - database.ts: ファイル削除時にログ記録
  - tagService.ts: タグ追加・削除時にログ記録
  - ActivityLogView.tsx: タイムライン形式表示、日付グルーピング
  - フィルタ機能（すべて/ファイル/タグ/スキャン）
  - クライアント側フィルタリング実装
  - 30日以上前のログ自動削除（起動時Pruning）
  - ページネーション対応（50件ずつ）

- **Phase 12-1.5: 技術的負債の解消** 🆕
  - Z-Index階層のCSS変数化（`--z-toast`, `--z-lightbox`, `--z-modal`, `--z-dropdown`）
  - 8コンポーネント更新（Toast, LightBox, SettingsModal, ProfileModal, TagManagerModal, ProfileSwitcher, ScanProgressBar, TagSelector）
  - webSecurity警告にコメント追加（セキュリティリスク明記、将来対応をBacklogに追加）
  - 孤立サムネイル診断機能実装
    - thumbnailCleanupService.ts: パス正規化対応、IPCペイロード軽量化（サンプル最大10件）
    - 設定画面「バックアップ」タブに診断ボタン追加
  - ROADMAP更新（SQLite FTS5、カスタムプロトコル `media://` を将来構想に追加）

- **Phase 12-2: タグ表示の改善** 🆕
  - TagBadge.tsx: categoryColor props追加、動的ボーダースタイル対応
  - FileCard.tsx: useMemoでタグソートをメモ化（パフォーマンス最適化）
  - FileCard.tsx: 絶対配置Pop-over方式でタグ展開（グリッドレイアウト保護）

- **Phase 12-2.5: 基盤の健全化（セキュリティ）** 🆕
  - カスタムプロトコル `media://` 導入（file://からの移行）
  - electron/protocol.ts: プロトコルハンドラ実装
  - src/utils/mediaPath.ts: toMediaUrl()ユーティリティ
  - webSecurity: true に変更（セキュリティ有効化）
  - index.html: Content-Security-Policy設定追加
  - StatisticsView: PieChart固定サイズ化、BarChart/LineChart遅延レンダリング
  - tagService.ts: カテゴリ色を含めてタグ取得（LEFT JOIN tag_categories）
  - 型定義: Tag、TagDefinitionにcategoryColor追加
  - セカンドオピニオンAIの技術要件を反映（絶対配置展開、動的スタイル、useMemoメモ化）

- **Phase 12-3: ファイルカード表示のカスタマイズ** 🆕
  - useSettingsStore: cardSize, cardLayout, show* 設定追加（6項目）
  - FileCard.tsx: CARD_SIZES定数（UIレンダリング専用）、動的サイズ、表示項目ON/OFF
  - FileGrid.tsx: CARD_SIZES定数、useMemoメモ化、カードラッパーサイズ修正
  - Header.tsx: サイズ切替ボタン（S/M/L）追加
  - セカンドオピニオン反映（UI定数責務境界、再レンダリング抑制、仮想スクロール相互作用、将来拡張余地）

- **Phase 12-14a: スキャン進捗表示の挙動修正** 🆕
  - UIStoreでの表示状態管理（`isScanProgressVisible`）
  - 最小化ボタンの実装（スキャン継続したまま非表示）
  - サイドバーへのスキャンインジケーター追加
  - 完了後の自動非表示ロジック改善

- **Phase 12-14b: スキャン進捗表示のアニメーション改善** 🆕
  - シマーアニメーション追加（進捗バーの光沢エフェクト）
  - スライドイン/アウトアニメーション（左サイドバー付近）
  - 等幅フォント適用による数値表示の安定化
  - 位置調整と×ボタンのアニメーション実装


- **スキャン設定の改善**
  - プレビューフレーム数設定（0-30枚、スライダーUI）
  - 設定値のメインプロセス同期
  - アプリ起動時の設定同期

- **スキャン進捗表示の改善**
  - 現在処理中のファイル名表示
  - メッセージとファイル名の両方表示
  - 固定高さでガタつき防止

- **サムネイル再作成機能**
  - ファイルコンテキストメニューに「サムネイル再作成」追加
  - 動画のプレビューフレームも再生成
  - 再作成後の即時UI更新

- **トースト通知システム**
  - Toast コンポーネント作成
  - success/error/info タイプ対応
  - サムネイル再作成完了時の通知
  - useUIStore にトースト管理機能追加

### Changed
- スキャンキャンセル機能の改善
  - forループ内でのキャンセルチェック追加
  - サムネイル生成後のキャンセルチェック追加
  - プレビューフレーム生成後のキャンセルチェック追加

### Fixed
- ソート設定の永続化問題を修正
- 書庫内音声ファイルのUI表示問題を修正

---


## [0.9.8] - 2026-02-02

### Added
- **Phase 1: プロジェクト基盤構築**
  - Zustand ストア (useFileStore, useUIStore, useSettingsStore)
  - SQLite データベースサービス
  - IPC通信基盤
  - 型定義 (src/types/)

- **Phase 2-1: フォルダスキャン機能**
  - 基本スキャナー実装
  - フォルダ管理機能
  - ファイル登録・更新ロジック

- **Phase 2-2: ファイル操作系**
  - 外部アプリで開く (openExternal)
  - エクスプローラーで表示 (showInExplorer)

- **Phase 2-3: UI連携**
  - Preload CJS ビルド問題修正 (vite-plugin-electron/simple)
  - Sidebar / FileGrid / FileCard コンポーネント
  - TanStack Virtual 仮想スクロール
  - ネイティブフォルダ選択ダイアログ

- **Phase 2-4: サムネイル生成**
  - 動画サムネイル (FFmpeg)
  - 画像サムネイル (Sharp)
  - アニメーションGIF/WebP判定
  - 動画再生時間取得
  - DB snake_case ↔ Frontend camelCase マッピング

- **プロジェクトドキュメント**
  - ARCHITECTURE.md, CONVENTIONS.md, Glossary.md, ROADMAP.md
  - SESSION.md（セッション管理）
  - ADRテンプレート（.agent/decisions/）

- **Phase 3-1: サイドバー開閉機構**
  - 折りたたみ機能 (useUIStore / Sidebar)
  - スムーズな開閉アニメーション
  - 状態に応じたレイアウト切り替え
  - UI改善: 開閉ボタンをサイドバー境界配置に変更、常時表示

- **Phase 3-2: フォルダ右クリックメニュー**
  - ネイティブコンテキストメニュー実装
  - 機能: 再スキャン、フォルダー削除、エクスプローラーで表示
  - 削除/再スキャン時のUI自動更新

- **Phase 3-3: ファイルソート機能**
  - ソート条件選択UI (名前/日付/サイズ/種類)
  - 昇順/降順切り替え
  - `useUIStore` / `useFileStore` 統合

- **Phase 3-4: LightBox（クイックプレビュー）**
  - フルスクリーンオーバーレイ実装
  - キーボードナビゲーション（←→で前後移動、ESCで閉じる）
  - 画像/動画プレビュー表示
  - ファイル情報表示（名前、サイズ、再生時間）

- **Phase 3-5: ファイルコンテキストメニュー**
  - ネイティブコンテキストメニュー実装
  - 機能: 外部アプリで開く、エクスプローラーで表示、ファイル削除
  - 削除時のUI自動更新

- **Phase 4: アーカイブ対応**
  - 書庫ファイル処理サービス (`archiveHandler.ts`)
    - 7zip-bin を使用した書庫メタデータ取得
    - サムネイル生成（書庫内最初の画像を抽出）
    - プレビューフレーム取得（均等分散で最大12枚）
  - 書庫IPC通信 (`archive.ts`)
  - 書庫サムネイル生成対応 (`thumbnail.ts`)
  - LightBox 書庫プレビュー機能
    - 書庫内画像のグリッド表示
    - クリックで拡大表示
    - ローディング状態表示
  - 対応形式: ZIP, RAR, 7Z, CBZ, CBR

- **Phase 5-1: タグ管理システム基盤**
  - データベーススキーマ拡張
    - `tag_categories` テーブル（カテゴリ管理）
    - `tag_definitions` テーブル（タグマスター）
    - `file_tags` テーブル（ファイル-タグ関連）
  - バックエンド実装
    - `tagService.ts`（CRUD操作）
    - `tag.ts` IPCハンドラー
  - Zustand ストア (`useTagStore.ts`)
  - UIコンポーネント
    - `TagBadge.tsx`（タグバッジ表示）
    - `TagSelector.tsx`（タグ選択ドロップダウン）
    - `TagFilterPanel.tsx`（サイドバーフィルター）
    - `TagManagerModal.tsx`（タグ/カテゴリ管理モーダル）
  - FileCard ホバー時タグ表示
  - LightBox タグ付け機能

- **Phase 5-2: タグフィルタリング**
  - `fileTagsCache` によるリアルタイムフィルタリング
  - AND/OR モード対応
  - タグ選択時に即座にファイルグリッドをフィルタリング

- **Phase 5-3: 検索機能**
  - `SearchBar.tsx` コンポーネント作成
  - ファイル名での部分一致検索（大文字小文字を区別しない）
  - デバウンス（300ms）でパフォーマンス最適化
  - タグフィルターとの組み合わせ対応
  - `SortMenu.tsx` を `Header.tsx` に拡張して検索バーを統合

- **Phase 5-4: 設定画面**
  - `SettingsModal.tsx` コンポーネント作成
  - サムネイルサイズ変更（80-300px）
  - 動画再生時の音量設定
  - サムネイルホバー動作設定（scrub/play）
  - ヘッダーに設定ボタン追加

- **Phase 6: プロファイル機能**
  - プロファイルごとのDB分離（`databaseManager.ts`）
    - メタDB（`profiles.db`）でプロファイル一覧管理
    - プロファイルごとのDB（`media_xxx.db`）
  - プロファイル管理UI（`ProfileModal.tsx`）
    - プロファイル作成・削除・切り替え
    - アクティブプロファイル表示
  - サムネイルホバー時のプレビュー機能
    - スクラブモード（マウス位置でフレーム切り替え）
    - 再生モード（自動ループ再生）
  - プレビューフレーム生成（`generatePreviewFrames`）
    - 動画から均等分散で9フレーム抽出
    - フレーム命名の柔軟な対応

- **Phase 7-1: キーボードショートカット**
  - グローバルショートカットフック（`useKeyboardShortcuts.ts`）
  - グリッド操作
    - 矢印キーでファイル選択・移動
    - スクロール追従（仮想スクロール連携）
    - Space/Enterでプレビュー表示
    - Ctrl+Aで全選択、Escapeで選択解除
  - グローバルショートカット
    - Ctrl+Fで検索バーフォーカス
    - Ctrl+,で設定モーダル
  - LightBoxクイックタグ（1-9キーでタグ付け/解除）
  - フォーカスインジケータ（amber枠）
  - 入力フォームガード（INPUT/TEXTAREA内では無効化）

### Fixed
- Preload script ESM→CJS ビルド問題
- thumbnail_path / thumbnailPath 命名不一致によるサムネイル非表示問題
- 既存ファイルのサムネイル再生成スキップ問題
- scanner.ts の isMedia 判定に archive タイプが含まれていなかった問題
- tsconfig.node.json の composite モード設定問題（noEmit → emitDeclarationOnly）
- `tagService.ts` がプロファイルDBではなく古い `media.db` を参照していた問題（FOREIGN KEY制約エラー）
  - `dbManager.getDb()` を使用してプロファイルごとのDBを正しく参照するように修正


---

## バージョン管理方針

- v2開発中は `[Unreleased]` セクションに追記
- 各フェーズ完了時にバージョン番号を付与（例: v2.0.0-alpha.1）
