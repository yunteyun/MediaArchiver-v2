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
- 状態: 確認済み
- 備考: Step 2 完了時点では `thumbnail.generateVideoThumbnail` と `thumbnail.generatePreviewFrames` が Worker 経由で安定動作していた。Step 3 では duration / metadata 取得も Worker 経由で安定動作を確認した。

## 確認記録
- 日時: 2026-03-03
- 対象フォルダ: `C:\Users\ut\Downloads\aimg`
- 動画ファイル: `videoplayback (6).mp4`
- Renderer ログ:
  - 体感上の問題なし
- Main ログ:
  - `scanner.countFiles`: `1.4ms`, `folder=aimg`, `total=705`
  - `thumbnail.generateVideoThumbnail`: `103.5ms`, `resolution=320`, `ok=true`, `mode=worker`
  - `thumbnail.getVideoDuration`: `30.9ms`, `ok=true`, `durationSec=10.4`, `mode=worker`
  - `thumbnail.generatePreviewFrames`: `224ms`, `frameCount=5`, `generated=5`, `ok=true`, `mode=worker`
  - `thumbnail.getMediaMetadata`: `38.8ms`, `ok=true`, `mode=worker`
  - `scanner.scanDirectory`: `825.3ms`, `phase=complete`, `newCount=1`, `skipCount=704`
- 体感メモ:
  - 新規動画の追加スキャンで Worker 経由の duration / metadata / thumbnail / preview frame がすべて成功
  - 動作に問題は無さそうとの報告あり

## 次段候補
- スキャン段階反映の再設計へ進む
