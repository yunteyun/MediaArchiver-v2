# Perf Baseline: ffmpeg Worker 化

## 目的
- `ffmpeg Utility Process` 再検証の比較用ベースラインを 1 本にまとめて残す
- `preview frame` `video thumbnail` `duration` `metadata` の Worker 化を段階ごとに追えるようにする

## Step 1

### 対象
- `generatePreviewFrames` のみ Utility Process 化

### 比較条件
- 基準バージョン: `1.5.0d2` 相当
- 比較操作:
  - フォルダ選択直後
  - 動画を含むフォルダのスキャン中
  - 動画ファイル右クリック
  - 手動サムネイル再生成
- 比較ログ:
  - Renderer: `FileGrid layout`, `FileGrid sortAndFilter`, `FileCard contextMenu`
  - Main: `scanner.scanDirectory`, `thumbnail.generatePreviewFrames`

### 記録
- 状態: 確認済み
- 日時: 2026-03-03
- 対象フォルダ: 703 件のファイルを含むフォルダ
- 動画ファイル: 未記録
- `previewFrameCount`: 未記録
- Renderer ログ:
  - `Sidebar.handleSelectFolder`: `fileCount=703`, `elapsedMs=33.3`
  - `FileGrid.sortAndFilter`: `rawFileCount=703`, `resultCount=703`, `elapsedMs=0.4`
  - `FileGrid.layout`: `containerWidth=1230`, `columns=5`, `cardHeight=332`
- Main ログ:
  - `thumbnail.generatePreviewFrames`: `493.2ms - 498.2ms`, `frameCount=5`, `generated=5`, `ok=true`, `mode=worker`
- 体感メモ:
  - `Sidebar.loadFolders` が `230ms` と `391.9ms` で複数回走っていた段階では、若干のもたつきあり
  - `Sidebar` の不要な再読込抑制後は、体感上改善したとの報告あり
  - `FileCard.contextMenu`: `9.8ms`
  - `PreviewFrameWorkerService` は起動成功し、`worker-fallback` は観測されていない

## Step 2

### 対象
- `generateVideoThumbnail` のみ Utility Process 化

### 比較条件
- 基準バージョン: `Step 1` 完了時点
- 比較操作:
  - 動画ファイル右クリック
  - 手動サムネイル再生成
  - 動画を含むフォルダのスキャン中
- 比較ログ:
  - Renderer: `FileCard contextMenu`, `FileGrid layout`
  - Main: `thumbnail.generateVideoThumbnail`, `thumbnail.generatePreviewFrames`, `scanner.scanDirectory`

### 記録
- 状態: 確認済み
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

## Step 3

### 対象
- `getVideoDuration` と `getMediaMetadata` の Utility Process 化

### 比較条件
- 基準バージョン: `Step 2` 完了時点
- 比較操作:
  - 動画を含むフォルダのスキャン中
  - 動画ファイル右クリック
  - 手動サムネイル再生成
- 比較ログ:
  - Renderer: `FileCard contextMenu`, `FileGrid layout`
  - Main: `thumbnail.getVideoDuration`, `thumbnail.getMediaMetadata`, `scanner.scanDirectory`

### 記録
- 状態: 確認済み
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
- `duration / metadata` を含む Worker 化の実運用監視を継続する
- スキャン段階反映の再設計へ進む
