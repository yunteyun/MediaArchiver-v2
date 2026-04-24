# Current Session Status

**Last Updated**: 2026-04-24

- **Current Focus**: 動画再生のガクガク改善・ビューア周りの調査
- **Current Status**: Range リクエスト 8MB キャップを実装・コミット済み。次はビューア全体の調査を予定。

## Recent Achievements

- **動画再生ガクガク改善**:
  - `electron/protocol.ts`: open-ended Range リクエスト（`bytes=N-`）を 8MB にキャップし、大容量ファイルの過剰バッファリングを防止

- **HDD 大容量ファイル問題の修正（Issue #43）**:
  - `electron/protocol.ts`: `getMimeType` に `.mkv` / `.avi` / `.m4v` / `.ts` / `.m2ts` / `.wmv` / `.aac` / `.opus` / `.avif` / `.bmp` / `.tif` / `.tiff` を追加
  - `electron/protocol.ts`: 100MB 超の画像ファイルは `readFile` バッファではなく `createReadStream` ストリーミングで返却するよう変更（OOM 防止）

- **画像段階描写の解消**:
  - `electron/protocol.ts`: 画像ファイルは `fs.promises.readFile` でバッファ一括返却（ネットワーク層の段階配信を排除）
  - `CenterViewerStage.tsx`: `HTMLImageElement.decode()` で完全デコード待ち後に `<img>` をレンダリング、フォールバック URL を廃止、`key={src}` で DOM 再生成により GPU タイル描写を防止

- **ビューアのもたつき改善（Issue #40 + #41）**:
  - `useFileStore.incrementAccessCount` の全件 `map()` 走査を `findIndex` + `slice` スポット差し替えに変更
  - アクセストラッキング IPC を `requestIdleCallback`（fallback: `setTimeout 200ms`）で遅延化
  - `CenterViewerPreloader.tsx` 新設：前後 ±2 件の画像を非表示 `<img>` で先読み

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
- ✅ **ビューアのもたつき改善（Issue #40 + #41）**

## Next Steps
- [ ] キーボードショートカット拡充・ヘルプモーダル追加
- [ ] 登録フォルダ削除時にサムネイルを残すオプション

## Known Issues
(なし)
