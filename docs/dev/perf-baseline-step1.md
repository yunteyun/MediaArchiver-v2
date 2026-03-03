# Perf Baseline Step 1

## 目的
- `ffmpeg Utility Process 再検証 Step 1` の比較用ベースラインを残す
- 対象は `generatePreviewFrames` 再導入前後の差分確認

## 比較条件
- 基準バージョン: `1.5.0d2` 相当
- 比較対象: `generatePreviewFrames` のみ Utility Process 化した Step 1
- 比較操作:
  - フォルダ選択直後
  - 動画を含むフォルダのスキャン中
  - 動画ファイル右クリック
  - 手動サムネイル再生成
- 比較ログ:
  - Renderer: `FileGrid layout`, `FileGrid sortAndFilter`, `FileCard contextMenu`
  - Main: `scanner.scanDirectory`, `thumbnail.generatePreviewFrames`

## ベースライン記録
- 状態: 暫定計測済み
- 備考: この環境では GUI の手動操作を実行できないため、以下は実機で取得した途中確認メモ。main 側ログは未取得。

## 暫定記録
- 日時: 2026-03-03
- 対象フォルダ: 703件のファイルを含むフォルダ
- 動画ファイル: 未記録
- `previewFrameCount`: 未記録
- Renderer ログ:
  - `Sidebar.handleSelectFolder`: `fileCount=703`, `elapsedMs=33.3`
  - `FileGrid.sortAndFilter`: `rawFileCount=703`, `resultCount=703`, `elapsedMs=0.4`
  - `FileGrid.layout`: `containerWidth=1230`, `columns=5`, `cardHeight=332`
- Main ログ:
  - 未取得
- 体感メモ:
  - `Sidebar.loadFolders` が `230ms` と `391.9ms` で複数回走っていた段階では、若干のもたつきあり
  - `Sidebar` の不要な再読込抑制後は、体感上改善したとの報告あり

## 残確認
- `thumbnail.generatePreviewFrames` の main ログ取得
- 手動サムネイル再生成時の Worker 経由ログ確認
- ウィンドウ拡大時の最終体感確認
