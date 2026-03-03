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
- 状態: 未計測
- 備考: この環境では GUI の手動操作を実行できないため、数値記録は実機で取得する

### 記録テンプレート
- 日時:
- 対象フォルダ:
- 動画ファイル:
- `previewFrameCount`:
- Renderer ログ:
- Main ログ:
- 体感メモ:
