# Current Session Status

**Last Updated**: 2026-04-21

- **Current Focus**: ファイルカード表示基盤 フェーズ D-3 完了（ホバー挙動のプリセット駆動化）
- **Current Status**: D-1〜D-3 すべて完了。次フェーズ未確定。

## Recent Achievements

- **ファイルカード表示基盤 フェーズ D-3（ホバー挙動のプリセット駆動化）**:
  - `displayModeTypes.ts` に `HoverBehavior` 型と `hoverBehavior?` フィールドを追加
  - `ExternalDisplayPresetManifest` にも `hoverBehavior?` を追加（外部プリセット対応）
  - `whiteBrowser.ts` に `hoverBehavior: 'mousePositionScrub'` を明記
  - `resolveExternalDisplayPresets` でマニフェストマージ時に `hoverBehavior` を継承
  - `useFileCardHover` の `displayMode: string` 引数を `hoverBehavior: HoverBehavior` に置換
  - `canMouseScrubArchive` 判定を `displayMode === 'whiteBrowser'` から `hoverBehavior === 'mousePositionScrub'` に正規化

- **ファイルカード表示基盤 フェーズ D-2（WhiteBrowser コマ送り PoC）**:
  - マウス位置連動フレーム切替を archive ファイルに対して実装

- **ファイルカード表示基盤 フェーズ D-1（ラベル整理 + duration バッジ視認性調整）**:
  - ラベル変更・duration バッジ強化・docs 更新

## Completed Phases
- ✅ Phase 0〜28 完了
- ✅ **v1.15.0 〜 v1.16.4 リリース**
- ✅ **ファイルカード表示基盤 フェーズ A〜D-3** 完了

## Next Steps
- [ ] キーボードショートカット拡充・ヘルプモーダル追加
- [ ] 登録フォルダ削除時にサムネイルを残すオプション
- [ ] フェーズ D-4 候補: フレーム数拡張（8枚→16枚）・設定 UI 追加（PoC 結果評価後）

## Known Issues
- `duplicateNameCandidates.test.ts` / `profileLifecycle.test.ts` / `useDuplicateStore.test.ts` が 7 件失敗しているが、フェーズ B 以前からのプレエグジスティング失敗（今回の変更とは無関係）
