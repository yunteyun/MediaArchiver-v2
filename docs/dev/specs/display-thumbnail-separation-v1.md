# 表示モードとサムネイル表現の分離設計 v1

作成日: 2026-03-06

## 目的
- 表示モード（カード寸法や情報欄）とサムネイル表現（見せ方）を分離し、組み合わせ選択を可能にする。
- 既存ユーザーの見た目を壊さない互換移行を先に定義し、実装時の手戻りを減らす。

## Step 1 棚卸し結果

### すでに分離済み
- `src/components/fileCard/displayModes.ts`
  - モード定義（`aspectRatio / cardWidth / thumbnailHeight / infoAreaHeight`）の集約済み。
- `src/components/fileCard/FileCardInfoArea.tsx`
  - `FileCardInfoCompact` / `FileCardInfoDetailed` への分割済み。
- `src/components/fileCard/FileCardInfoDetailed.tsx`
  - モード別詳細情報UIの分岐整理済み。

### まだ混在している領域
- `src/components/FileCard.tsx`
  - `displayMode`（レイアウト）と、ホバー挙動/アニメ再生/プレイモード（サムネイル挙動）が同一コンポーネント内で結合している。
- `src/components/FileGrid.tsx`
  - `displayMode` によってカード幅成長や `whiteBrowser` 固有処理（余白再配分、高さ計算）が直結している。
- `src/components/SortMenu.tsx`
  - 表示切替UIが `displayMode` 単体で、サムネイル表現を独立選択できない。

## 2軸の境界定義

### 軸A: レイアウト軸（Layout Axis）
- 担当: グリッド列数、カード幅、情報欄高さ、カード構造（標準/漫画/動画/詳細など）。
- 代表値（仮）: `compact / standard / standardLarge / manga / video / detailed`.

### 軸B: サムネイル表現軸（Thumbnail Presentation Axis）
- 担当: サムネイルの見せ方（例: 比率維持・トリミング方針・詳細表示時の正方形化など）。
- 代表値（仮）: `modeDefault / contain / cover / square`.

### 軸外（今回の2軸に含めない設定）
- サムネイル挙動（ホバー時の再生方式）:
  - `thumbnailAction` (`scrub / flipbook / play`)
  - `flipbookSpeed`
  - `animatedImagePreviewMode`
  - `playMode.jumpType / jumpInterval`
- 生成・スキャン品質（プロファイル別）:
  - `previewFrameCount`
  - `thumbnailResolution`
  - `scanThrottleMs`
  - `fileTypeFilters`

上記は「サムネイル関連」ではあるが、役割が「挙動/生成」であり、今回の「見せ方」軸とは分離する。

## 保存単位とDB影響範囲

### 現状
- `displayMode` は `settings-storage`（renderer側 persist）で保持。
- `profile_settings` テーブル（`profile_scoped_settings_v1`）は以下のみ保持:
  - `fileTypeFilters`
  - `previewFrameCount`
  - `scanThrottleMs`
  - `thumbnailResolution`

### v1方針（今回）
- 新2軸（`layoutPreset` / `thumbnailPresentation`）は `settings-storage` 側に追加し、まずはグローバル設定として扱う。
- `profile_settings` テーブルは v1のまま据え置き（スキーマ変更なし）。
- したがって、今回の互換マッピングは renderer 側設定移行のみで完結する。

## 互換マッピング仕様（旧 `displayMode` -> 新2軸）

移行トリガー:
- `layoutPreset` または `thumbnailPresentation` が未定義で、`displayMode` が存在する場合に1回だけ実行。

初期マッピング:

| 旧 displayMode | 新 layoutPreset | 新 thumbnailPresentation |
|---|---|---|
| `compact` | `compact` | `modeDefault` |
| `standard` | `standard` | `modeDefault` |
| `standardLarge` | `standardLarge` | `modeDefault` |
| `manga` | `manga` | `modeDefault` |
| `video` | `video` | `modeDefault` |
| `whiteBrowser` | `detailed` | `square` |

補足:
- `modeDefault` は「現行モードと同じ見え方」を維持する互換モードとして扱う。
- `whiteBrowser` は現行仕様で正方形サムネイル化しているため `square` を割り当てる。

## 実装スライス方針（半壊防止）

- スライス単位で「ロジック + UI + 回帰確認」を同時に通す。
- UI先行・ロジック未接続の状態は作らない。

1. スライス1: 内部モデル追加 + 互換マッピング（UIは既存維持）
2. スライス2: レイアウト軸を `FileGrid` / `FileCard` に接続
3. スライス3: サムネイル表現軸を `FileCard` に接続 + UI追加
4. スライス4: 旧 `displayMode` 参照の縮退整理

## 受け入れ条件（Step 2完了判定）
- 2軸の境界が文書化され、軸内/軸外の設定が曖昧でない。
- `profile_settings` への影響範囲（今回対象外）が明示されている。
- 旧 `displayMode` からの移行仕様が1回実行で再現可能な形で定義されている。

## 実施済み（2026-03-06）
- `useSettingsStore` に `layoutPreset` / `thumbnailPresentation` を追加した。
- `setDisplayMode` 実行時に2軸へ同期する互換マッピングを実装した。
- persist `merge` で新キー未保存時に旧 `displayMode` から補完する移行処理を追加した。

## 現行実装メモ（2026-03-06）
- `thumbnailPresentation` の描画反映は現時点で `contain` のみ専用分岐。
- `cover` / `square` / `modeDefault` は同じ描画（`object-cover`）として扱っている。
- `square` は将来拡張用の予約値で、現状は互換性維持を主目的としている。
