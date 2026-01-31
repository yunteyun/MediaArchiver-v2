# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- Phase 1: プロジェクト基盤構築
  - Zustand ストア (useFileStore, useUIStore, useSettingsStore)
  - SQLite データベースサービス (electron/services/database.ts)
  - IPC通信基盤 (electron/ipc/database.ts)
  - 型定義 (src/types/)
- Phase 2-1: フォルダスキャン機能
  - 基本スキャナー実装 (scanner.ts)
  - フォルダ管理機能 (database.ts, IPC)
  - ファイル登録・更新ロジック
- プロジェクトドキュメント整備
  - ARCHITECTURE.md: システム構成と設計方針
  - CONVENTIONS.md: コーディング規約
  - Glossary.md: 用語集
  - ROADMAP.md: 開発ロードマップ
- セッション管理ドキュメント（.agent/SESSION.md）
- 変更履歴管理（CHANGELOG.md）
- ADRテンプレート（.agent/decisions/）

### Changed
- なし

### Fixed
- なし

---

## バージョン管理方針

- v2開発中は `[Unreleased]` セクションに追記
- 各フェーズ完了時にバージョン番号を付与（例: v2.0.0-alpha.1）
