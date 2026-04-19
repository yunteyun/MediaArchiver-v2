# Current Session Status

**Last Updated**: 2026-04-19

- **Current Focus**: ファイルカード表示基盤 フェーズ C 完了
- **Current Status**: FileCard.tsx 責務分割完了（1439行 → 442行）。lint・型チェック全通過。コミット前。

## Recent Achievements

- **ファイルカード表示基盤 フェーズ C（FileCard.tsx 責務分割）**:
  - `FileCardTagSummary.tsx` を新設（タグサマリー UI コンポーネント 2 本 + `FileCardTagSummaryRow`）
  - `tagSummaryUtils.ts` を新設（`getTagSummaryUiConfig` / `getBalancedSummaryTags` ヘルパ）
  - `useAnimatedPreviewSlots.ts` を新設（グローバルスロット管理 + `useAnimatedPreviewSlots` hook）
  - `useFileCardHover.ts` を新設（ホバー/フリップブック/スクラブ/video 再生の state・effects・handlers 全て）
  - `FileCardThumbnail.tsx` を新設（サムネイルエリア全体 + ズームプレビューポータル）
  - `FileCardTagPopover.tsx` を新設（タグポップオーバーポータル）
  - `FileCard.tsx` を 1439 行 → 442 行に削減（骨格＋ストア接続のみ）

- **ファイルカード表示基盤 フェーズ B（`cardDirection` 分岐解消・プリセット型正規化・layoutPreset 完全撤去）**:
  - `cardDirection === 'horizontal'` の直接比較 4 箇所を `isHorizontalDisplayMode(baseDisplayMode)` ヘルパ呼び出しへ置換
  - `FileCardDisplayModeDefinition` から `cardDirection` / `horizontalThumbnailAspectRatio` フィールドを削除

- **ファイルカード表示基盤 フェーズ A（LayoutPreset 軸の除去）**:
  - `LayoutPreset` 型・`setLayoutPreset`・双方向マップを除去し、DisplayMode × ThumbnailPresentation の 2 軸に正規化

- **v1.16.4 リリース**

## Completed Phases
- ✅ Phase 0〜28 完了
- ✅ **v1.15.0 リリース**
- ✅ **v1.16.0 リリース**
- ✅ **v1.16.1 リリース**
- ✅ **v1.16.2 リリース**
- ✅ **v1.16.3 リリース**
- ✅ **v1.16.4 リリース**
- ✅ **ファイルカード表示基盤 フェーズ A**（LayoutPreset 軸の除去）
- ✅ **ファイルカード表示基盤 フェーズ B**（cardDirection 分岐解消・プリセット型正規化・layoutPreset 完全撤去）
- ✅ **ファイルカード表示基盤 フェーズ C**（FileCard.tsx 責務分割）

## Next Steps
- [ ] ファイルカード表示基盤 フェーズ D: 漫画モード・動画モード・WhiteBrowser 風の新規追加
- [ ] キーボードショートカット拡充・ヘルプモーダル追加

## Known Issues
- `duplicateNameCandidates.test.ts` / `profileLifecycle.test.ts` / `useDuplicateStore.test.ts` が 7 件失敗しているが、フェーズ B 以前からのプレエグジスティング失敗（今回の変更とは無関係）
