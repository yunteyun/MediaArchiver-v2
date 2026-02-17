# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

> **バージョン体系**: `dev-XX` は開発マイルストーン（Phase番号ベース）。
> アプリのリリースバージョン（`v2.x.x`）とは別管理。

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
