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
- 状態: 確認済み
- 備考: Step 1 では `thumbnail.generateVideoThumbnail` が inline で `102.8ms - 114.8ms` 程度だった。Step 2 では Worker 経由で安定動作を確認した。

## 確認記録
- 日時: 2026-03-03
- 対象フォルダ: `C:\Users\ut\Downloads\aimg`
- 動画ファイル: `1771772974.8216f671b8be.mp4`
- `previewFrameCount`: `5`
- Renderer ログ:
  - 体感上の問題なし
- Main ログ:
  - `thumbnail.generateVideoThumbnail`: `247.8ms`, `resolution=320`, `ok=true`, `mode=worker`
  - `thumbnail.generatePreviewFrames`: `499.3ms`, `frameCount=5`, `generated=5`, `ok=true`, `mode=worker`
- 体感メモ:
  - 手動サムネイル再生成で Worker 経由の動画サムネイル生成とプレビューフレーム生成の両方が成功
  - 動作に問題は感じないとの報告あり

## 次段候補
- `duration / metadata` の Worker 化比較へ進む
