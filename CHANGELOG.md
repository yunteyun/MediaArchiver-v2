# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

> 古い履歴（文字化けを含む旧版保管）は `CHANGELOG_legacy.md` を参照してください。

---

## [Unreleased]
### Changed
- (記録待ち)

---

## [1.1.3d5] - 2026-02-22
### Changed
- サムネイル保存管理の整理を進め、主要生成系（画像 / 動画 / 音声 / 書庫 / 動画プレビュー）を新しい保存構造へ統一。
- 書庫サムネイルを WebP 変換して保存するように変更（失敗時は元形式へフォールバック）。
- 書庫プレビューフレームを WebP 化し、`thumbnails/profiles/<profile>/archive-preview` 配下へ保存するように変更。
- 書庫プレビューフレームを固定キャッシュ化し、右サイドバー（4枚）/ Lightbox（12枚）で再利用するよう改善。
- WebP 品質値を内部プリセット化（`image / video / archive / previewFrame` を分離）。
- 書庫プレビューフレームの最終設定を `384px` / `previewFrame=40` に調整（Lightbox 表示と容量のバランス）。
- `AGENTS.md` を追加し、Windows + PowerShell の UTF-8 / 文字化け対策ルールを明文化。

### Fixed
- 書庫サムネイル生成の安定性改善（初回スキャン失敗、`EXDEV`、`ENOENT`、同名衝突、フォールバック経路）。
- 開発版で `7za.exe` を見つけられず書庫プレビュー/サムネイルが生成できない問題（パス解決の見直し）。
- 統計画面のサムネイル容量表示が新旧保存構造の切替中に `0` になりやすい問題（旧構造フォールバック）。
- サムネイル cleanup / 削除処理で `preview_frames` の形式差（JSON配列 / カンマ区切り）により取りこぼす問題。
- タグ管理モーダルで UI が消える問題（Portal 化 + Hook 順序エラー修正）。

---

## [1.1.3] - 2026-02-21
### Changed
- タグ UI の操作性を改善（TagSelector / TagManagerModal 周辺）。
- 各種リリース調整（並び順・表示まわり）。

### Fixed
- リリース版で `7za.exe` の参照に失敗する問題。
- `mode=install` 周辺の DB / 保存先まわりの不整合。
- パッケージング後の実行で発生する不具合の修正（`afterPack` 周辺）。

---

## [1.1.2] - 2026-02-19
### Note
- この版以前の詳細履歴は `CHANGELOG_legacy.md` を参照してください（旧ファイルに文字化けを含みます）。

---

## [1.1.0] - 2026-02-18
### Note
- 初期の詳細履歴は `CHANGELOG_legacy.md` を参照してください。