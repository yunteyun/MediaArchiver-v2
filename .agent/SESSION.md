# Current Session Status

**Last Updated**: 2026-04-21

- **Current Focus**: ファイルカード表示基盤 フェーズ D-2 完了（WhiteBrowser コマ送り PoC）
- **Current Status**: PoC 実装完了・lint クリア。手動動作確認待ち。

## Recent Achievements

- **ファイルカード表示基盤 フェーズ D-2（WhiteBrowser コマ送り PoC）**:
  - `useFileCardHover.ts` に `displayMode` 引数を追加
  - `canMouseScrubArchive` フラグ導入（WhiteBrowser + archive 条件）
  - `shouldFetchArchiveFrames` で flipbook 設定に依らずフレーム取得を発火
  - `handleMouseMove` を archive でもマウス X 座標連動 scrub に対応
  - flipbook interval を `canMouseScrubArchive` のとき停止（競合回避）
  - `FileCard.tsx` から `displayMode` を hook に渡すよう修正

- **ファイルカード表示基盤 フェーズ D-1（ラベル整理 + duration バッジ視認性調整）**:
  - `manga` / `mangaDetailed` ラベル変更、duration バッジ強化、docs 更新

- **ファイルカード表示基盤 フェーズ C（FileCard.tsx 責務分割）**:
  - `FileCard.tsx` を 1439 行 → 442 行に削減

## Completed Phases
- ✅ Phase 0〜28 完了
- ✅ **v1.15.0 〜 v1.16.4 リリース**
- ✅ **ファイルカード表示基盤 フェーズ A〜D-2** 完了

## Next Steps
- [ ] WhiteBrowser コマ送り PoC の手動動作確認（回帰チェック含む）
- [ ] PoC 結果を評価してフレーム数拡張や設定 UI 追加の要否を判断（フェーズ D-3 候補）
- [ ] キーボードショートカット拡充・ヘルプモーダル追加

## Known Issues
- `duplicateNameCandidates.test.ts` / `profileLifecycle.test.ts` / `useDuplicateStore.test.ts` が 7 件失敗しているが、フェーズ B 以前からのプレエグジスティング失敗（今回の変更とは無関係）
