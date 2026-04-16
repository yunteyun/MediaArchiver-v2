# Current Session Status

**Last Updated**: 2026-04-16

- **Current Focus**: リリース前精査・バグ修正
- **Current Status**: 精査完了・修正適用済み。リリース作業中。

## Recent Achievements

- **リリース前精査（v1.15.0 → v1.16.0）**:
  - `setFolderScanFileTypeOverride` でファイルタイプオーバーライド変更時に `excludedSubdirectories` / `shallowScan` が消失するバグを修正。
  - `clearFolderScanFileTypeOverrides` でオーバーライドクリア時に `shallowScan` が消失するバグを修正。
  - `SettingsModal.tsx` の未使用 `displayMode` store subscription を削除（不要な再レンダリング防止）。
  - `colors.ts` の未使用 `CHART_AXIS_COLOR` / `CHART_GRID_COLOR` を削除。
  - `FileCardInfoDetailed.tsx` の noop `.replace(/\//g, '/')` を削除。

- **設定画面サブタブの追加分割**:
  - 「表示 > 一覧表示」から「カード表示」（ファイルカード項目・バッジ設定）を独立サブタブに分離。
  - 「連携」カテゴリに「外部アプリ」「検索先」の2サブタブを追加（旧：サブタブなしの1画面）。
  - `ExternalAppsTab` に `mode` prop を追加し、外部アプリ管理と検索先管理を分割表示。
  - `GeneralSettingsTab` の `mode` に `'card-display'` を追加してカード表示専用の早期返却ブロックを実装。

- **設定画面タブ再設計**:
  - 10個のフラットタブを4カテゴリ（表示・データ・連携・メンテナンス）＋サブタブに再編。
  - `SettingsSubTabNav.tsx` を新規作成（サブタブバーコンポーネント）。
  - `SettingsTabMeta.ts` をカテゴリ＋サブタブ構造に全面書き換え。
  - `useUIStore.ts` に `SettingsModalCategory` / `SettingsSubTab` 型を追加し、`openSettingsModal` の第2引数にサブタブ指定を追加。
  - `GeneralSettingsTab.tsx` に `mode` prop を追加し、「一覧表示」と「再生と見た目」をサブタブで分離。
  - `RatingFilterPanel.tsx` の「管理」リンクを `openSettingsModal('display', 'ratings')` に更新。

- **細部の統一（Issue #32 Phase 5）**:
  - `TagManagerModal.tsx` の `style={{ minHeight: '400px' }}` を `min-h-[400px]` に置き換え。
  - Issue #32「UIの統一感を高める」をクローズ。

- **インライン style 削減・ダイアログ統一・色トークン集約（Issue #32 Phase 2〜4）**:
  - 共通 `Dialog.tsx`（Compound Component）で全ダイアログを統一。
  - `src/lib/colors.ts` でタグ色・ファイルタイプ色・チャート色を一元管理。
  - z-index 変数体系を完成（`--z-scan-progress` 追加）。

- **バッジ表示カスタマイズ**:
  - 作成日・フォルダ名・ドライブ名バッジの個別ON/OFF設定を追加。
  - ドライブ名バッジ（`C:` 等）を情報エリアに新規追加。
  - 情報エリアのバッジ表示順を上下ボタンで変更可能に。

## Completed Phases
- ✅ Phase 0〜28: 詳細は SESSION.md の過去記録を参照
- ✅ **v1.15.0 リリース**（Phase 28 まで）
- ✅ リリース前精査・バグ修正（v1.16.0 向け）

## Next Steps
- [ ] v1.16.0 リリース
- [ ] 追加表示モード（漫画モード・動画モード）
- [ ] タグカテゴリ表示優先順位付け強化

## Known Issues
なし
