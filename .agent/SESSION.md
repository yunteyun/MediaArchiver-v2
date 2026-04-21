# Current Session Status

**Last Updated**: 2026-04-22

- **Current Focus**: 漫画ビューア改善（NeeView 参照）
- **Current Status**: マウス操作 + シークバー（フェーズ2）を実装してコミット済み。

## Recent Achievements

- **漫画ビューア マウス操作 + シークバー（フェーズ2）**:
  - `MangaPageSlider.tsx` 新設：ページシークバー（RTL/LTR 対応、range input 反転・ページ番号統合）
  - `CenterViewerManga.tsx` 更新：クリックゾーン（左右 1/3）・ホバーナビボタン（ChevronLeft/Right）・シークバー統合

- **漫画ビューア コア体験改善（NeeView 参照）**:
  - `mangaPagePairing.ts` 新設：見開きペア計算（`resolvePagePair`）とステップ移動（`stepPage`）の純関数。単体テスト 31 件全グリーン
  - `useMangaViewerSettingsStore.ts` 新設：Zustand + persist で設定永続化（ページモード / 綴じ方向 / 表紙単独）
  - `MangaViewerSettingsPanel.tsx` 新設：NeeView 互換の設定パネル UI（歯車アイコン → スライドイン）
  - `CenterViewerManga.tsx` 更新：見開きレイアウト・右綴じ時の左右反転・設定パネル統合
  - `useArchivePagePreload.ts` 更新：spread 時はペア単位（次 2 ペア + 前 1 ペア）の先読みに変更

- **漫画ビューア MVP（Issue #42）**:
  - `archive:getImageByIndex` IPC を新設（7za 抽出 + WebP キャッシュ、漫画専用 pLimit(2)）
  - `useArchivePagePreload` フックで ±2 ページを非同期先読み
  - `CenterViewerManga.tsx` 新設：全画面単ページ表示、← / → / PageDown / PageUp でページ送り、ページ番号表示
  - `LightboxOpenMode` に `'archive-manga'` を追加し、画像を含む書庫のダブルクリックで自動起動

## Completed Phases
- ✅ Phase 0〜28 完了
- ✅ **v1.15.0 〜 v1.16.4 リリース**
- ✅ **ファイルカード表示基盤 フェーズ A〜D-4** 完了
- ✅ **漫画ビューア MVP（Issue #42）**
- ✅ **漫画ビューア コア体験改善（見開き・綴じ方向・設定パネル）**
- ✅ **漫画ビューア マウス操作 + シークバー（フェーズ2）**

## Next Steps
- [ ] キーボードショートカット拡充・ヘルプモーダル追加
- [ ] 登録フォルダ削除時にサムネイルを残すオプション

## Known Issues
(なし)
