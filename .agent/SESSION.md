# Current Session Status

**Last Updated**: 2026-04-16

- **Current Focus**: v1.16.0 リリース作業
- **Current Status**: ドキュメント更新完了、ビルド・タグ付け待ち。

## Recent Achievements

- **v1.16.0 リリース準備**:
  - CHANGELOG [Unreleased] → [1.16.0] へ昇格・整理。
  - package.json バージョンを 1.15.0 → 1.16.0 へ更新。
  - release-notes/v1.16.0.md を新規作成。

- **リリース前精査（バグ修正・デッドコード削除）**:
  - `setFolderScanFileTypeOverride` でファイルタイプオーバーライド変更時に `excludedSubdirectories` / `shallowScan` が消失するバグを修正。
  - `clearFolderScanFileTypeOverrides` でオーバーライドクリア時に `shallowScan` が消失するバグを修正。
  - `SettingsModal.tsx` の未使用 `displayMode` store subscription を削除。
  - `colors.ts` の未使用定数を削除、`FileCardInfoDetailed.tsx` の noop replace 処理を削除。

- **設定画面タブ再設計・サブタブ分割**:
  - 10個のフラットタブを4カテゴリ＋サブタブ構成に再設計。
  - 「カード表示」「外部アプリ」「検索先」の各サブタブを追加分割。

- **バッジカスタマイズ機能**:
  - 作成日・フォルダ名・ドライブ名バッジの個別ON/OFF、ドライブ名バッジ新規追加、バッジ表示順変更。

- **Issue #32 UI統一（Phase 1〜5）完了**:
  - 共通UIコンポーネント基盤、色トークン集約、全ダイアログ統一、インライン style 削減。

## Completed Phases
- ✅ Phase 0〜28: 詳細は過去の SESSION.md を参照
- ✅ **v1.15.0 リリース**
- ✅ **v1.16.0 リリース**（設定画面再設計・バッジカスタマイズ・UI統一）

## Next Steps
- [ ] 追加表示モード（漫画モード・動画モード）
- [ ] タグカテゴリ表示優先順位付け強化

## Known Issues
なし
