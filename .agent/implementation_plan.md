# implementation_plan.md

## 対象
- 対象機能: サムネイル保存管理（thumbnail / preview frames / archive thumbnail）
- 対象範囲: Electron main 側の生成・保存・削除・クリーンアップ・統計・保存先移行
- 目的:
  - 保存構造を一貫させる
  - プロファイル単位で管理しやすくする
  - cleanup / 統計 / 移行の整合性を上げる

---

## 背景（現状の問題）

- サムネイル保存先は主に `getBasePath()/thumbnails` 直下だが、サービスごとに前提が揺れている
- `databaseManager.ts` ではプロファイル削除時に `thumbnails/<profileId>` を削除しようとしている（将来構造前提）
- `statisticsService.ts` に `userData/thumbnails` 固定参照が残っており、保存モードとズレる可能性がある
- `thumbnailCleanupService.ts` は「現在DB」と「ディスク上サムネイルDir」を突き合わせるため、共有構造だとプロファイル間で誤検出の余地がある
- `storageConfig.ts` は DB 内の `thumbnail_path` / `preview_frames` 文字列置換で移行しており、絶対パス保存前提のコストが高い

---

## 設計案（比較）

### 案1: プロファイル単位ディレクトリ（推奨）
- 構造例:
  - `<basePath>/thumbnails/<profileId>/thumbs/...`
  - `<basePath>/thumbnails/<profileId>/previews/...`
- 長所:
  - プロファイル削除・cleanup・切り分けが簡単
  - 現在の `databaseManager.ts` の削除方針と整合しやすい
  - 実装コストが比較的低い
- 短所:
  - プロファイルをまたいだ重複サムネイルは共有しない

### 案2: 種別 + プロファイル単位（整理強化）
- 構造例:
  - `<basePath>/thumbnails/<profileId>/image/`
  - `<basePath>/thumbnails/<profileId>/video/`
  - `<basePath>/thumbnails/<profileId>/archive/`
  - `<basePath>/thumbnails/<profileId>/preview_frames/`
- 長所:
  - 診断・削除・将来の容量管理がさらにやりやすい
  - 不具合切り分け時に「どの生成系が作ったか」が見えやすい
- 短所:
  - 実装箇所が案1より増える

### 案3: グローバル共有キャッシュ（ハッシュベース）
- 長所:
  - 重複削減の余地
- 短所:
  - 参照カウント/整合性管理が必要
  - 今回の安定化目的に対して過剰

### 推奨結論
- 今回は **案2（種別 + プロファイル単位）** を推奨
- ただし実装は段階化して、まずは案1相当の「プロファイル単位」を先に成立させる

---

## パス表現（DB保存形式）方針

### 方式A: 絶対パスのまま（短期）
- 既存コードに合わせやすい
- 実装が速い
- ただし保存場所変更時の文字列置換コストは継続

### 方式B: 相対パス保存（中期推奨）
- DBには `thumbnails/<profileId>/...` など相対パスを保存
- 表示/FSアクセス時に `getBasePath()` で解決
- 保存場所変更時のDB書換え負担を減らせる

### 今回の提案
- **段階1:** 絶対パスのまま保存構造だけ統一（安全・速い）
- **段階2:** 相対パス化を別タスクで実施（必要なら）

---

## 実装ステップ（提案）

### Step 1: 共通パス解決の導入
- 新規サービス（例: `electron/services/thumbnailPaths.ts`）を追加
- 提供関数（案）
  - `getThumbnailsRoot()`
  - `getProfileThumbnailRoot(profileId?: string)`
  - `getThumbnailOutputDir(kind: 'image' | 'video' | 'archive' | 'preview')`
  - `ensureThumbnailDirs(profileId?: string)`

### Step 2: 生成系の切替
- `electron/services/thumbnail.ts`
- `electron/services/archiveHandler.ts`
- preview frame 生成処理
- 生成先を共通 resolver 経由に統一

### Step 3: 消費系の切替
- `electron/services/thumbnailCleanupService.ts`
- `electron/services/statisticsService.ts`
- `electron/services/database.ts`（削除時のファイル削除）
- `electron/services/databaseManager.ts`（プロファイル削除時のサムネイルDir削除）

### Step 4: 保存先移行/切替との整合
- `electron/services/storageConfig.ts`
- 保存場所切替時のコピー/移行対象ディレクトリを新構造に対応
- `thumbnail_path` / `preview_frames` 更新ロジックの影響確認

### Step 5: cleanup / 再生成 / 検証
- 既存クリーンアップが誤検出しないか確認
- 再生成（単体 / 全件）が新構造に保存されるか確認
- 初回スキャン/再スキャン/プロファイル切替/保存場所切替を確認

---

## 今回の非機能方針（ユーザー前提）

- データ損失許容: あり（実用運用前）
- そのため互換処理は最小化できる
- 必要なら「再生成前提」で旧サムネイルを整理してもよい

---

## リスクと対策

### リスク
- 生成先変更後、cleanup が他プロファイル分を誤検出する
- 統計のサムネイル容量表示がズレる
- 保存場所切替時の移行ロジックが新構造を取りこぼす

### 対策
- resolver 導入後に「生成系→消費系」の順で切替
- 各Stepごとにビルド確認 + 手動確認
- `CHANGELOG.md` / `ROADMAP.md` / devlog を毎Stepで更新

---

## 提出物（この計画で作るもの）

- 実装コード（thumbnail path resolver + 既存サービス修正）
- `CHANGELOG.md` 更新
- `ROADMAP.md` 更新
- `.agent/devlog/YYYY-MM-DD.md` 更新（セッション終了時）

---

## 推奨の進め方（今回）

1. 設計確定（この計画の承認）
2. Step 1-2 を実装（生成系先行）
3. 小さく確認
4. Step 3-4 を実装（cleanup / 統計 / 移行）
5. 総合確認
6. リリース版ビルド
