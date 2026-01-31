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

### Fixed
- Preload script ESM→CJS ビルド問題
- thumbnail_path / thumbnailPath 命名不一致によるサムネイル非表示問題
- 既存ファイルのサムネイル再生成スキップ問題

---

## バージョン管理方針

- v2開発中は `[Unreleased]` セクションに追記
- 各フェーズ完了時にバージョン番号を付与（例: v2.0.0-alpha.1）
