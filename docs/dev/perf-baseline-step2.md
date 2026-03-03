# Perf Baseline Step 2

## 目的
- `ffmpeg Utility Process 再検証 Step 2` の比較用ベースラインを残す
- 対象は `generateVideoThumbnail` 再導入前後の差分確認

## 比較条件
- 基準バージョン: `Step 1 完了時点`
- 比較対象: `generateVideoThumbnail` のみ Utility Process 化した Step 2
- 比較操作:
  - 動画ファイル右クリック
  - 手動サムネイル再生成
  - 動画を含むフォルダのスキャン中
- 比較ログ:
  - Renderer: `FileCard contextMenu`, `FileGrid layout`
  - Main: `thumbnail.generateVideoThumbnail`, `thumbnail.generatePreviewFrames`, `scanner.scanDirectory`

## ベースライン記録
- 状態: 未計測
- 備考: Step 1 では `thumbnail.generateVideoThumbnail` が inline で `102.8ms - 114.8ms` 程度だった。Step 2 では `mode=worker` に切り替わるかを確認する。

## 記録テンプレート
- 日時:
- 対象フォルダ:
- 動画ファイル:
- `previewFrameCount`:
- Renderer ログ:
- Main ログ:
- 体感メモ:
