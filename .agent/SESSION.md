# Current Session Status

**Last Updated**: 2026-04-22

- **Current Focus**: 漫画ビューア改善（NeeView 参照）
- **Current Status**: 見開き表示・右綴じ/左綴じ・表紙単独表示・設定パネルを実装してコミット済み。次は画像クリックでビューアが閉じてしまうバグを修正予定。

## Recent Achievements

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

## Next Steps
- [ ] 漫画ビューア: 画像クリックでビューアが閉じてしまうバグを修正（`pointer-events` の伝播問題）
- [ ] キーボードショートカット拡充・ヘルプモーダル追加
- [ ] 登録フォルダ削除時にサムネイルを残すオプション

## Known Issues
- 漫画ビューアで画像をクリックすると `CenterViewerRoot` の backdrop ハンドラに伝播してビューアが閉じる（`pointer-events-none` 継承が原因、次タスクで修正）
