# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

> **バージョン体系**: `dev-XX` は開発マイルストーン（Phase番号ベース）。
> アプリのリリースバージョン（`v2.x.x`）とは別管理。

---

## [1.1.3] - 2026-02-21
### Phase 28〜: タグUI改善・バグ修正

#### Changed
- **TagSelector**: カテゴリカラードット表示・`sortOrder`順ソート・grid-cols-2の2列グリッド表示
- **RightPanel/TagSection**: `<select>` を `TagSelector` に置換（Lightboxと同一UIに統一）
- **TagManagerModal**: 右ペインのタグリストをgrid-cols-2多列表示、左ペインにカテゴリD&D実装
- **useTagStore**: `updateCategory` に `sortOrder` 型追加

#### Fixed
- **TagSelectorドロップダウン非表示バグ**: React Portalで `body` 直下に描画（`overflow:auto` 親コンテナでクリップされる問題を解消）
- **孤立サムネイル診断ロジック**: 「DBにあるが実ファイルなし」→「サムネイルDirにあるがDBに未登録」に修正。フォルダ登録解除後に孤立サムネイルを正しく検出できるよう修正
- **孤立サムネイル診断パス**: `app.getPath('userData')` ハードコード → `getBasePath()` 動的取得（Phase 25保存場所カスタマイズに対応）
- **リリース版書庫サムネイル取得エラー**: `package.json` に `asarUnpack` 指定を追加し、`7za.exe` 等のバイナリが実行可能に
- **DBディレクトリ未作成エラー**: `mode=install` 等で保存先にフォルダが存在しない場合、DB作成前に `ensureDbDirectory` で事前生成するように修正
- **ビルド安全性向上**: `afterPack` フックを追加し、`app.asar.unpacked` 内の必須バイナリ存在をビルド時に検証
- **別ドライブ保存時の書庫展開エラー (EXDEV)**: `fs.renameSync` がドライブ間のファイル移動時に `EXDEV` エラーを起す問題に対し、コピー＆削除のフォールバック (`safeRenameSync`) を実装
- **サムネイル削除時のJSONパースエラー**: `preview_frames` がJSON配列ではなくカンマ区切り（CSV）で保存された過去バージョンとの互換性を保つため、削除時のパース処理にフォールバックを追加

---

## [1.1.2] - 2026-02-19
### Phase 26: バグ修正・UX改善

#### Added
- **音声書庫バッジ**: FileCard に Music アイコンバッジを追加（音声書庫の視覚的区別）
- **書庫プレビューグリッド**: 右パネルの BASIC INFO 下に 2×2 グリッドプレビューを追加（画像書庫のみ）
- **バージョン表記**: ヘッダータイトル横と設定モーダルフッターにアプリバージョンを表示

#### Fixed
- **Bug 1**: 書庫プレビュー時のファイルロック問題（UUIDサブフォルダ展開で解決）
- **Bug 2**: 動画サムネイル生成エラー（絶対秒数シーク方式に変更）
- **Bug 3**: 音声書庫認識精度の改善（再帰的検索ロジック修正）
- **UI 配置**: 書庫プレビューグリッドを独立セクション化（ユーザーフィードバック対応）

---

## [1.1.0] - 2026-02-18
### Phase 19.5〜25 まとめリリース

#### Added
- **Phase 25**: 保存場所カスタマイズ（AppData / インストールフォルダ / 任意パス、原子的移行、旧データ削除）
- **Phase 24**: サムネイル WebP 変換（静止画 q:82、動画 q:75、フレーム q:70）、一括再生成
- **Phase 23**: 右サイドパネル（選択ファイルの詳細情報・プレビュー常時表示）
- **Phase 22-C**: フォルダツリーナビゲーション（ドライブ/親フォルダ選択、ファイル移動ダイアログ）
- **Phase 21**: グループ表示改善（今日・昨日・今週・先週・2週間前 の相対時間区分）
- **Phase 20-B**: 動画キーボード操作（Space/←→/↑↓）
- **Phase 20-A**: Lightbox UI 再設計（2カラム固定レイアウト）

#### Fixed
- **Phase 19.5**: EventEmitter メモリリーク、複数選択削除/移動、孤立サムネイル誤検出

---

## [dev-25] - 2026-02-18
### Phase 25: 保存場所カスタマイズ

#### Added
- **`storageConfig.ts`**: 二段階ロード・原子的移行・権限チェック・旧データ削除・thumbnail_path 一括更新
- **`electron/ipc/storage.ts`**: IPC ハンドラ（getConfig / setConfig / browseFolder / deleteOldData）
- **`SettingsModal.tsx`**: サムネイルタブに「保存場所」セクション追加（ラジオ3択・参照・移行・旧データ削除ボタン）

#### Changed
- `thumbnail.ts`: `THUMBNAIL_DIR` 定数 → `getThumbnailDir()` 動的取得
- `archiveHandler.ts`: `THUMBNAIL_DIR`・`TEMP_DIR` 定数 → 動的取得関数
- `databaseManager.ts`: `userDataPath` → `getBasePath()` 動的取得、`walCheckpoint()`・`closeAll()`・`reopenMetaDb()` 追加
- `main.ts`: `initStorageConfig()` を DB 初期化前に呼び出し

---

## [dev-23] - 2026-02-18

### Phase 23: 右サイドパネル

#### Added
- **`RightPanel` コンポーネント群**: `PreviewSection`（動画autoplay/muted/loop、アニメーション対応）、`BasicInfoSection`（ファイル名・サイズ・解像度・再生時間・作成日）、`TagSection`（カラー表示・折り返しレイアウト）
- **`useUIStore`**: `isRightPanelOpen`（デフォルトtrue）、`toggleRightPanel`、`previewContext`、`setPreviewContext` を追加
- **ヘッダートグルボタン**: 右パネル開閉ボタンをヘッダー右上に追加（アクティブ時ハイライト）
- **グリッドホバーとの排他制御**: `previewContext` で `'grid-hover'` / `'right-panel'` を管理

#### Changed
- `App.tsx`: `<RightPanel />` を `isRightPanelOpen` 条件付きで組み込み

---

## [dev-24] - 2026-02-18
### Phase 24: サムネイル軽量化

#### Added
- **WebP変換**: 静止画サムネイル（quality:82）、動画サムネイル（quality:75）、プレビューフレーム（quality:70）をWebP出力に変更
- **プレビューフレーム最適化**: 320px×10枚 → 256px×6枚に削減（容量約75%削減）
- **一括再生成機能**: `thumbnail:regenerateAll` IPC ハンドラ追加（バッチ20件、進捗通知付き）
- **統計画面**: サムネイルキャッシュ容量表示カードと「WebP一括変換」ボタンを追加
- **容量計算**: `statisticsService.ts` に `getThumbnailDirSize()` 追加（統計画面表示時のみ計算）

#### Changed
- `thumbnail.ts`: `generateImageThumbnail` → sharp WebP出力、`generateVideoThumbnail` → ffmpeg libwebp方式
- `generatePreviewFrames`: フレーム数・解像度削減
- `regenerateAllThumbnails`: 安全なDB更新順序（生成→DB更新→旧ファイル削除）
- `preload.ts`: `regenerateAllThumbnails` / `onThumbnailRegenerateProgress` を expose
- `electron.d.ts`: `LibraryStats.thumbnailSize`、Phase 24 API 型定義追加
- `StatisticsView.tsx`: recharts 幅0警告対策（`visibility:hidden` + 遅延500ms）

---

## [dev-22c] - 2026-02-18
### Phase 22-C: フォルダツリーナビゲーション機能

#### Added
- **Phase 22-C-1**: ドライブ/親フォルダ選択機能
  - ドライブヘッダークリックで配下全ファイル表示
  - 親フォルダクリックで配下全ファイル表示（再帰）
  - `getFilesByDrive`, `getFilesByFolderRecursive` IPC追加
  - 特殊ID処理（`DRIVE_PREFIX`, `FOLDER_PREFIX`）
- **Phase 22-C-2**: ファイル移動ダイアログ
  - `MoveFolderDialog.tsx` 実装（フォルダツリー表示で移動先選択）
  - 右クリックメニューに「移動」オプション追加
  - `useUIStore` に移動ダイアログstate追加

#### Changed
- DBマイグレーション（008_add_folder_hierarchy）: `folders`テーブルに`parent_id`, `drive`カラム追加
- `addFolder`関数で`parent_id`, `drive`を自動設定
- 循環移動防止（自分自身と子孫フォルダを除外）

#### Fixed
- Bug 3: ファイル移動後に古いパスで404エラーが発生する問題（移動後にファイルストアから削除）

#### Performance
- parentIdベースの再帰検索（O(n)パフォーマンス）
- `path.startsWith()`を使わず、parentMapで子孫検索

---

## [dev-21] - 2026-02-17
### Phase 21: グループ表示改善

#### Added
- 相対時間区分追加（今日、昨日、今週、先週、2週間前）
- グループキー仕様実装（`relative:today`など）
- 表示順序実装（今日→昨日→今週→先週→2週間前→それ以降）

#### Changed
- 日付グループ化ロジックを拡張（相対時間区分を優先）
- 日付境界は1回だけ計算（パフォーマンス最適化）

#### Performance
- ループ外で日付境界を計算（O(n)を維持）
- 既存のメモ化、React.memo、TanStack Virtualを活用

---

## [dev-20b] - 2026-02-17
### Phase 20-B: 動画キーボード操作

#### Added
- 動画再生時のキーボード操作（Space: 再生/停止、←→: 5秒シーク、↑↓: 音量調整）
- 日本語入力対応（`e.code`使用）

#### Changed
- 動画ファイル時はLightboxの矢印キーファイル移動を無効化（シーク操作優先）

#### Fixed
- 日本語入力時にSpaceキーが機能しない問題
- 矢印キーが既存のLightboxショートカットと競合する問題

---

## [dev-20a] - 2026-02-17
### Phase 20-A: Lightbox UI再設計

#### Added
- Lightbox コンポーネント分離（MediaViewer, ControlOverlay, InfoPanel, MetaSection, TagSection, StatsSection, MemoSection）
- 常に2カラム固定レイアウト（情報エリア左384px・メディア右可変）
- 動画・音声音量分離機能（audioVolume設定追加）
- 設定画面に音声音量スライダー追加

#### Changed
- メディアサイズを情報エリアを考慮した値に調整（`calc(100vw - 450px)`）
- ナビゲーション矢印を下部中央に移動（横並び配置）
- 音声プレイヤーの幅を拡大（320px → 最大672px）
- React.memo全適用、Zustand最小購読でパフォーマンス最適化

#### Fixed
- 音声ファイルで`audioRef`を使用するように修正（`videoRef`使用によるバグ）
- 書庫内音声も`audioVolume`設定を使用するように修正

---

## [dev-19.5] - 2026-02-17
### Phase 19.5: Critical Bug Fixes

#### Fixed
- **EventEmitter メモリリーク警告**: FileCardでの重複イベントリスナー登録をFileGridに集約
- **ファイル移動後の再スキャン問題**: ファイル移動後に即座にstoreから削除、404エラーとUI更新遅延を解決
- **複数選択時の削除/移動の不具合**: コンテキストメニューで複数ファイルIDを渡すように修正、選択した全ファイルの削除/移動に対応
- **重複ファイル検索の再実行不可**: finallyブロックで確実に検索状態をリセット、複数回の検索実行が可能に
- **孤立サムネイル誤検出**: 孤立判定をDB基準に変更、他のプロファイルのサムネイル誤検出を解決

---

## [dev-28] - 2026-02-21
### Phase 28: タグUI改善 3パート

#### Changed
- **`TagSelector`**: カテゴリ名横にカラードット表示、カテゴリ/タグを `sortOrder` 昇順ソート、タグ一覧を `grid-cols-2` の2列グリッド表示に変更
- **`RightPanel/TagSection`**: `<select>`（TagAddDropdown）を `TagSelector` に置換（Lightbox と同一UIに統一）
- **`TagManagerModal`**: 右ペインのタグリストを `grid-cols-2` 多列表示に変更（一覧性向上）
- **`TagManagerModal`**: 左ペインにカテゴリD&D機能を実装（`GripVertical` ハンドル + HTML5 D&D、`sortOrder` 一括再採番）
- **`useTagStore`**: `updateCategory` の引数型に `sortOrder?: number` を追加

---

## [dev-27.5] - 2026-02-20
### Phase 27.5: 詳細検索廃止・サイドバー評価フィルター統合

#### Removed
- **AdvancedSearchPanel.tsx** 削除（左サイドバーと機能重複のため廃止）
- `App.tsx` から詳細検索ボタン・`searchPanelOpen` state・JSX を除去

#### Added
- **`RatingFilterPanel.tsx`** 新規作成（`src/components/ratings/`）
  - blue系（`#2563eb`）の星で「★N以上」フィルターをクリック選択
  - 同じ星を再クリックで解除（トグル）、評価軸が0件なら非表示
  - 「全解除」ボタン
- **Sidebar.tsx**: `TagFilterPanel` 直下に `RatingFilterPanel` を追加（折りたたみ時は非表示）

#### Changed
- **`useRatingStore`**: `ratingFilter` state・`setRatingFilter`・`clearRatingFilters` を追加
- **`useFileStore`**: `getFilteredFiles` を純粋関数化（引数でtagFilter・ratingFilter・fileRatingsを受け取る形式に変更）
- **`FileGrid.tsx`**: `useMemo` 内のフィルタリングに評価フィルターを統合（未評価ファイルは評価フィルター適用時に除外）

---

## [dev-27] - 2026-02-20
### Phase 27: 検索UI統合・タググループ化

#### Changed
- `AdvancedSearchPanel` をカテゴリ別折りたたみ対応に刷新
- `useUIStore` による開閉状態一元管理を整備

---

## [dev-26b] - 2026-02-20
### Phase 26 (Part 2): タグ・評価システム刷新

#### Added
- **26-A**: `TagManagerModal` を左右ペイン構造に刷新（タグ一覧と詳細編集の分離）
- **26-B**: 評価軸 DB マイグレーション・`ratingService.ts`・IPC ハンドラ・`electron.d.ts` 型定義追加
- **26-B3**: `useRatingStore`（Zustand）と評価軸管理UIを実装
- **26-C1**: `StarRatingInput` コンポーネント・RightPanel 評価セクション実装
- **26-C2**: Lightbox 評価セクション実装
- **26-D1**: `searchService.ts`（SQL クエリビルダー）実装
- **26-D2**: `AdvancedSearchPanel`（詳細検索UI）実装

---

## [Unreleased]

### Docs
- README に `lint` / `build` の実行手順を追記
- ARCHITECTURE のサービス構成例を現行実装寄りに更新
- CONVENTIONS に lint/build 運用ルールを追加
- ROADMAP の In Progress を更新

---

## [v1.0.0] - 2026-02-14
### Release: 初回リリースビルド 🚀

#### Added
- **electron-builder セットアップ**: Windows向けビルド環境構築
- **リリースビルド**: `MediaArchiver v2.exe` (180MB) 生成成功
- **ネイティブモジュール対応**: `better-sqlite3`, `sharp`, `ffmpeg-static` の自動リビルド

#### Changed
- TypeScript厳格モード無効化（個人利用のため`strict: false`）
- ビルドスクリプト簡略化（TypeScriptチェックをスキップ）

#### Fixed
- `electron-squirrel-startup`エラー修正（main.tsから削除）
- シンボリックリンクエラー対処（管理者権限で実行）

---

## [dev-18c] - 2026-02-14
### Phase 18-C: ファイル操作機能（移動）

#### Added
- **ファイル移動機能**: 右クリックメニューから登録済みフォルダへファイルを移動可能に
- **クロスドライブ対応**: 異なるドライブ間の移動（D: → C: など）を自動サポート（copy + delete）
- **トースト通知**: 移動成功/失敗時のフィードバックを追加

---

## [dev-18b] - 2026-02-14
### Phase 18-B: 外部アプリ連携UX強化

#### Added
- **デフォルトアプリ設定機能**: 拡張子ごとに特定の外部アプリをデフォルトとして指定可能に
- **フォールバック機能**: 指定アプリでの起動失敗時やデフォルト未設定時に自動でOS標準アプリを使用
- **エラーハンドリング**: 外部アプリ起動失敗時にトースト通知で理由を表示
- `useSettingsStore`: `defaultExternalApps` 状態と正規化ロジックを追加

#### Changed
- `app:openWithApp` IPC: 例外の代わりに `{ success, error }` を返す安全な設計に変更
- `FileCard`: デフォルト設定がある場合のみ外部アプリを使用（なければ即OS標準）

---

## [dev-18a] - 2026-02-14
### Phase 18-A: 外部アプリ起動カウント（最小構成）

#### Added
- **外部アプリ起動カウント機能**: 外部アプリ起動時に `external_open_count` をインクリメント
- Database: Migration 007 で `external_open_count` と `last_external_opened_at` カラム追加
- FileCard: 起動回数表示（2行目に `↗N回` 表示）
- `incrementExternalOpenCount` 関数追加（`database.ts`）
- `useFileStore` に `updateFileExternalOpenCount` アクション追加

#### Changed
- `app:openWithApp` IPC ハンドラに `fileId` 引数追加、カウント統合
- `electron.d.ts` の `openWithApp` 型定義更新

#### Fixed
- `ipc/database.ts` の手動マッピング漏れ問題（前回の失敗原因）を解消

---

## [dev-17] - 2026-02-12
### Phase 17: アクセストラッキング機能

#### Added
- **アクセス回数カウント機能**: Lightbox でファイルを開いた際に自動カウント（全ファイルタイプ対応）
- **直近アクセス日時記録**: `last_accessed_at` カラム追加（タイムスタンプ）
- **ソート機能拡張**: 「アクセス回数」「直近アクセス」の2つのソートオプション追加
- Database: Migration 006 で `access_count` と `last_accessed_at` カラム追加、インデックス作成
- FileCard: アクセス回数表示（2行目に統合、Eye アイコン）

#### Changed
- 「再生回数」から「アクセス回数」に変更（より汎用的な機能に）
- 3秒ルール削除: Lightbox 表示時に即座にカウント
- 全ファイルタイプ対応: 画像・動画・音声・書庫すべてでカウント

---

## [dev-16] - 2026-02-12
### Phase 16: FileCard インタラクション修正

#### Fixed
- FileCard のクリック挙動改善: サムネイルクリック時のみ Lightbox 起動
- 複数選択機能の修復: Ctrl/Shift クリックでの複数選択が動作するように修正

---

## [dev-15] - 2026-02-11
### Phase 15: アニメーションバッジ修正 & UI改善

#### Added
- FileCard: 作成日時表示の追加（Standardモード、YY/MM/DD形式）
- FileCard: `getTagBackgroundColor` ヘルパー関数（色名→CSS hex値マッピング）
- **タグ表示スタイル切替オプション**（塗りつぶし/左端ライン）: 設定画面で選択可能に

#### Changed
- アニメーションバッジを「GIF」ラベルから Clapperboard アイコン（「ANIM」）に変更
- ファイルサイズ表示を `formatFileSize` に統一（1MB未満の 0.0MB 問題を解消）
- バッジ配色を半透明ダーク系に統一（`bg-xxx-800/80`）
- タグ配色の視認性改善:
  - 黄色系タグ（amber/yellow/lime/orange）の文字色を黒に変更
  - TagManagerModal のカラーピッカーを Tailwind クラスに修正（CSS変数未定義問題を解消）

#### Fixed
- IPC層（`ipc/database.ts`）で `isAnimated` フィールドが欠落していた問題
- FileCard インラインタグで色名文字列（`"amber"` 等）が無効なCSS値として適用されていた問題
- ポップオーバー内のタグ色が表示されない問題（Tailwindクラス修正、型安全性向上）

---

## [dev-14] - 2026-02-10
### Phase 14: 表示モードシステムとレイアウト改善

#### Added
- Compact / Standard 表示モード切り替え機能
- タグポップオーバー表示（`+N` ボタンで全タグ展開、クリック/ホバー切り替え対応）
- `DISPLAY_MODE_CONFIGS` 定数と Zustand 拡張

#### Changed
- FileCard レイアウト刷新: 3行レイアウト（ファイル名 + フォルダ名 + サイズ＆タグ）
- Compact モード: 2行レイアウト（ファイル名 + サイズ＆タグ）、タグ最大2個表示
- カード幅拡大（Standard: 300px）
- グリッドレイアウトの高さ固定化（TanStack Virtual 対応）
- フォント最適化、レスポンシブレイアウト（カード幅自動調整、余白最小化）

---

## [dev-13] - 2026-02-09 ~ 2026-02-10
### Phase 13 & 13.5: FileCard 基礎設計 & タグ視認性改善

#### Added
- Database: `files` テーブルに `is_animated` カラム追加（Migration 005）
- Scanner: GIF/WebP のアニメーション判定ロジック
- FileCard: フォルダ名表示（`utils/path.ts`）、タグ省略表記（`utils/tag.ts`）

#### Changed
- FileCard: 情報エリアを下寄せ・縦積み構造に刷新（Virtual Scroll 対応）
- タグ表示をサムネイル上から下段情報エリアへ移動し、常時表示・完全不透明化
- タグ・バッジの配色を CSS 変数（デザイントークン）化

---

## [dev-12c] - 2026-02-09
### Phase 12 後半: UI/UX改善（削除・サムネイル・進捗表示）

#### Added
- ファイル削除の安全性向上: ゴミ箱移動（`shell.trashItem`）をデフォルト化、二重確認
- `DeleteConfirmDialog.tsx`: チェックボックス付きカスタム削除ダイアログ（キーボード対応）
- ストレージクリーンアップ: 孤立サムネイルの検出・削除機能
- 設定 UI 改善: 独立した「サムネイル」タブを追加
- サムネイル再生成時の進捗表示・トースト通知

#### Changed
- サムネイル再作成最適化: プレビューフレーム存在確認、不要な再生成スキップ
- ffmpeg に `-threads 1` 指定（コイル鳴き軽減）
- 重複ファイル削除は強制的にゴミ箱移動

#### Fixed
- サムネイル再作成時にプレビューフレームが再生成されない問題
- プレビューフレーム設定 0 の場合にスキャナーが再スキャンし続ける問題
- DB にフレーム記録があるが実ファイルが削除されている場合の検出・再生成

---

## [dev-12b] - 2026-02-07
### Phase 12 中盤: タグ拡張・設定改善

#### Added
- タグにアイコン・説明文を追加（Migration 003: icon, description 列）
- タグフィルターパネルに検索機能（名前・説明文で検索）、ツールチップ表示
- 自動タグ割り当て機能 MVP: ファイル名/フォルダ名ベースのルール、一括適用ボタン
- `auto_tag_rules` テーブル追加（Migration 004）
- lucide-react アイコンの動的レンダリング

#### Changed
- Header 右上の設定ボタン削除（サイドバーに移設済み）
- 音声書庫ファイルのアイコンを `FileMusic` に変更

---

## [dev-12a] - 2026-02-02 ~ 2026-02-06
### Phase 12 前半: UI/UX改善と機能強化

#### Added
- トースト通知システム（`useToastStore`: success/error/info）
- フォルダビュー拡張: FileGrid にフォルダカード表示、代表サムネイル
- スクラブモードシークバー（マウス位置連動、シアン色）
- ファイルカード表示カスタマイズ: サイズ切替（S/M/L）、表示項目 ON/OFF
- スキャン進捗表示改善: 最小化ボタン、サイドバーインジケーター、シマーアニメーション

#### Changed
- Z-Index 階層を CSS 変数化（8 コンポーネント更新）
- カスタムプロトコル `media://` 導入（`file://` からの移行、webSecurity 有効化）
- CSP 設定追加、PieChart 固定サイズ化、遅延レンダリング
- タグ表示を Pop-over 展開方式に変更、`categoryColor` による動的ボーダー
- 孤立サムネイル診断機能追加（設定画面）

#### Fixed
- Lightbox 表示問題: `object-fit: contain` + `max-width/max-height` 適用
- 書庫内音声の音量設定が反映されない問題
- `media://` プロトコルの Range リクエスト対応（動画シーク修正）

---

## [dev-11] - 2026-02-02
### Phase 11: 統計・ログ機能

#### Added
- カテゴリ別統計: ファイルタイプ別円グラフ、タグ別棒グラフ、フォルダ別棒グラフ、月別推移
- 追加統計: 評価分布、巨大ファイル Top 10、拡張子ランキング、解像度分布
- アクティビティログ: タイムライン表示、フィルタ機能、30日自動削除

---

## [dev-10] - 2026-02-02
### Phase 10: データベース基盤強化

#### Added
- DB スキーママイグレーションシステム（`migrations/index.ts`）
- 初期スキーマ定義、バージョン管理

---

## [dev-9] - 2026-02-02
### Phase 9: コア機能の拡張

#### Added
- 音声ファイル対応（mp3, wav, flac, m4a, ogg, aac, wma）、アルバムアート抽出
- ファイルハッシュ計算（SHA256）と重複検出（サイズ衝突戦略）
- 「すべてのファイル」ビュー
- メモ機能（LightBox 内自動保存 UI）

---

## [dev-8] - 2026-02-02
### Phase 8: データ整合性の強化

#### Added
- サムネイル・プレビューフレームの自動削除（ファイル/フォルダ/プロファイル削除時）
- トランザクション処理（100件ごとバッチ、10〜100倍高速化）
- エラーログシステム（`electron-log`、ログビューアー）

---

## [dev-1~7] - 2026-01-30 ~ 2026-02-02
### Phase 1-7: コア実装・UI機能・ブラッシュアップ

#### Added
- **Phase 1**: Vite + Electron + TypeScript 基盤、Zustand ストア、SQLite DB、IPC 通信
- **Phase 2**: フォルダスキャン、ファイル操作、UI連携（Sidebar/FileGrid/FileCard/TanStack Virtual）、サムネイル生成（FFmpeg/Sharp）
- **Phase 3**: サイドバー開閉、フォルダ右クリックメニュー、ファイルソート、LightBox、ファイルコンテキストメニュー
- **Phase 4**: 書庫ファイル対応（ZIP/RAR/7Z/CBZ/CBR）、書庫内プレビュー
- **Phase 5**: タグ管理システム（CRUD/フィルタ/AND・OR モード）、検索機能、設定画面
- **Phase 6**: プロファイル切り替え（DB 分割）、サムネイルホバー（scrub/play）
- **Phase 7**: キーボードショートカット、パフォーマンス最適化、アニメーション

#### Fixed
- Preload script ESM→CJS ビルド問題
- `thumbnail_path` / `thumbnailPath` 命名不一致
- `tagService.ts` が古い `media.db` を参照していた問題
- ソート設定の永続化問題

---

## バージョン管理方針

- **`dev-XX`**: 開発マイルストーン（Phase 番号ベース）。CHANGELOGの管理単位。
- **`v2.x.x`**: アプリのリリースバージョン。正式リリース時に `dev-XX` をまとめて付与。
- 複数 Phase を同日にまとめた場合は `dev-1~7` のように範囲表記。
- Phase 12 のように大きなフェーズはサブバージョン（`dev-12a`, `dev-12b`, `dev-12c`）で分割。
