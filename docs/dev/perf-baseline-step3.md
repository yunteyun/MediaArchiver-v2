# Perf Baseline Step 3

## 目的
- `ffmpeg Utility Process 再検証 Step 3` の比較用ベースラインを残す
- 対象は `getVideoDuration` と `getMediaMetadata` の再導入前後の差分確認

## 比較条件
- 基準バージョン: `Step 2 完了時点`
- 比較対象: `getVideoDuration` と `getMediaMetadata` のみ Utility Process 化した Step 3
- 比較操作:
  - 動画を含むフォルダのスキャン中
  - 動画ファイル右クリック
  - 手動サムネイル再生成
- 比較ログ:
  - Renderer: `FileCard contextMenu`, `FileGrid layout`
  - Main: `thumbnail.getVideoDuration`, `thumbnail.getMediaMetadata`, `scanner.scanDirectory`

## ベースライン記録
- 状態: 未計測
- 備考: Step 2 完了時点では `thumbnail.generateVideoThumbnail` と `thumbnail.generatePreviewFrames` が Worker 経由で安定動作している。Step 3 では duration / metadata 取得だけを追加し、`mode=worker` と体感差の有無を確認する。

## 記録テンプレート
- 日時:
- 対象フォルダ:
- 動画ファイル:
- Renderer ログ:
- Main ログ:
- 体感メモ:
