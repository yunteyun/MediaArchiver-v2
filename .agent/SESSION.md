# Current Session Status

**Last Updated**: 2026-04-21

- **Current Focus**: Issue #42 漫画ビューア MVP 実装完了
- **Current Status**: 漫画ビューア（単ページ表示・±2 先読み・キーボード操作）を実装し Issue #42 をクローズ。次フェーズ未確定。

## Recent Achievements

- **漫画ビューア MVP（Issue #42）**:
  - `archive:getImageByIndex` IPC を新設（7za 抽出 + WebP キャッシュ、漫画専用 pLimit(2)）
  - `useArchivePagePreload` フックで ±2 ページを非同期先読み
  - `CenterViewerManga.tsx` 新設：全画面単ページ表示、← / → / PageDown / PageUp でページ送り、ページ番号表示
  - `LightboxOpenMode` に `'archive-manga'` を追加し、画像を含む書庫のダブルクリックで自動起動

- **既存テスト失敗 7 件の解消**:
  - `duplicateNameCandidates.ts` — 末尾に数字がない場合の `numbered_series` キー誤生成バグを修正（タイトル中の数字を連番と誤判定する問題）
  - `useDuplicateStore.test.ts` — `findDuplicates` シグネチャ変更（`folderIds` 引数追加）に合わせてテストを更新
  - `profileLifecycle.test.ts` — `showCreatedDate` / `showFolderBadge` / `showDriveBadge` / `driveColors` / `infoBadgeOrder` フィールド追加に合わせてモックと期待値を更新

- **ファイルカード表示基盤 フェーズ D-4（archive 並列制御 + プレビューフレーム数 UI 改善）**:
  - `getArchivePreviewFrames` に in-flight coalesce を追加（同一ファイルの並行呼び出しを単一 Promise に束ねる）
  - `previewLimit = pLimit(1)` を新設し、7za 抽出ループ全体の同時実行数を制限
  - プレビューフレーム数の設定 UI をスライダ → ラジオ 4 択（オフ/低/中/高 = 0/5/10/20 枚）に変更
  - archive フレーム枚数は 8 枚固定のまま（設定化なし）

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
- ✅ **ファイルカード表示基盤 フェーズ A〜D-4** 完了

## Next Steps
- [ ] キーボードショートカット拡充・ヘルプモーダル追加
- [ ] 登録フォルダ削除時にサムネイルを残すオプション

## Known Issues
（なし）
