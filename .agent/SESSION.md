# Current Session Status

**Last Updated**: 2026-04-21

- **Current Focus**: ファイルカード表示基盤 フェーズ D-1 コミット完了
- **Current Status**: フェーズ D-1 完了・コミット済み。次はフェーズ D-2（WhiteBrowser コマ送り PoC）。

## Recent Achievements

- **ファイルカード表示基盤 フェーズ D-1（ラベル整理 + duration バッジ視認性調整）**:
  - `manga` ラベル: 「縦型」→「縦型カード」
  - `mangaDetailed` ラベル: 「詳細表示（縦）」→「縦サムネ + 詳細パネル」
  - duration バッジ（サムネ右下）を `bg-black/70 text-xs` → `bg-black/85 text-xs font-semibold` に強化
  - docs（`アプリ使用メモ` / `Glossary` / `回帰確認チェックリスト`）のラベル参照更新
  - ADR-002 を実態反映で更新（duration バッジは既に実装済みであり、今回は視認性調整のみ）

- **ファイルカード表示基盤 フェーズ D 要件整理（ADR-002 作成）**:
  - `docs/archive/file_card_表示設計に関する将来要望まとめ.md` と現状実装を突き合わせ、5 つの論点を整理
  - `.agent/decisions/002-file-card-display-modes-refinement.md` を新設
  - フェーズ D-1（ラベル整理 + video duration バッジ）、D-2（WhiteBrowser PoC）へのサブフェーズ分割を決定

- **ファイルカード表示基盤 フェーズ C（FileCard.tsx 責務分割）**:
  - `FileCard.tsx` を 1439 行 → 442 行に削減（骨格＋ストア接続のみ）

## Completed Phases
- ✅ Phase 0〜28 完了
- ✅ **v1.15.0 〜 v1.16.4 リリース**
- ✅ **ファイルカード表示基盤 フェーズ A〜D-1** 完了

## Next Steps
- [ ] ファイルカード表示基盤 フェーズ D-2: WhiteBrowser コマ送り PoC（マウス位置連動フレーム切替）
- [ ] キーボードショートカット拡充・ヘルプモーダル追加

## Known Issues
- `duplicateNameCandidates.test.ts` / `profileLifecycle.test.ts` / `useDuplicateStore.test.ts` が 7 件失敗しているが、フェーズ B 以前からのプレエグジスティング失敗（今回の変更とは無関係）
