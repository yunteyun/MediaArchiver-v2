# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

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

### Fixed
- Preload script ESM→CJS ビルド問題
- thumbnail_path / thumbnailPath 命名不一致によるサムネイル非表示問題
- 既存ファイルのサムネイル再生成スキップ問題
- scanner.ts の isMedia 判定に archive タイプが含まれていなかった問題
- tsconfig.node.json の composite モード設定問題（noEmit → emitDeclarationOnly）


---

## バージョン管理方針

- v2開発中は `[Unreleased]` セクションに追記
- 各フェーズ完了時にバージョン番号を付与（例: v2.0.0-alpha.1）
