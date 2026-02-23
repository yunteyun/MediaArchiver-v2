# Coding Conventions

MediaArchiver v2 のコーディング規約です。全ての開発者（人間・AI問わず）はこの規約に従ってください。

## ファイル・ディレクトリ命名

| 種類 | 規則 | 例 |
|------|------|-----|
| コンポーネント | PascalCase | `FileCard.tsx`, `SidebarTagTree.tsx` |
| フック | camelCase, `use`プレフィックス | `useFileStore.ts`, `useHover.ts` |
| ユーティリティ | camelCase | `formatDate.ts`, `hashCalculator.ts` |
| 型定義 | camelCase または PascalCase | `types/file.ts`, `types/Profile.ts` |
| 定数 | SCREAMING_SNAKE_CASE | `const MAX_THUMBNAIL_SIZE = 300` |

## コンポーネント設計

### 構造
```tsx
// 1. インポート (外部 → 内部 → 型)
import { useState } from 'react';
import { useFileStore } from '@/stores/useFileStore';
import type { MediaFile } from '@/types/file';

// 2. Props型定義
interface FileCardProps {
  file: MediaFile;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

// 3. コンポーネント本体 (React.memo推奨)
export const FileCard = React.memo<FileCardProps>(({ file, isSelected, onSelect }) => {
  // 3a. Zustandからの状態取得
  const thumbnailAction = useUIStore((s) => s.thumbnailAction);
  
  // 3b. ローカル状態
  const [isHovered, setIsHovered] = useState(false);
  
  // 3c. イベントハンドラ
  const handleClick = useCallback(() => {
    onSelect(file.id);
  }, [file.id, onSelect]);
  
  // 3d. レンダリング
  return (
    <div onClick={handleClick}>
      {/* ... */}
    </div>
  );
});

FileCard.displayName = 'FileCard';
```

### 再描画の最適化
- **必須**: 頻繁に更新されるリストアイテムは `React.memo` を使用
- **必須**: Zustandからの取得は**セレクタ形式**で最小限に
  - ❌ `const store = useFileStore()` 
  - ✅ `const files = useFileStore((s) => s.files)`
- **推奨**: イベントハンドラは `useCallback` でメモ化

## Zustand ストア設計

```typescript
// stores/useFileStore.ts
import { create } from 'zustand';

interface FileState {
  files: MediaFile[];
  selectedId: string | null;
  // アクション
  setFiles: (files: MediaFile[]) => void;
  selectFile: (id: string) => void;
}

export const useFileStore = create<FileState>((set) => ({
  files: [],
  selectedId: null,
  setFiles: (files) => set({ files }),
  selectFile: (id) => set({ selectedId: id }),
}));
```

## IPC通信

### チャンネル命名規則
- リクエスト: `{domain}:{action}` (例: `db:getFiles`, `scanner:start`)
- イベント: `{domain}:{event}-{past-tense}` (例: `scanner:file-added`)

### 型定義
```typescript
// electron/ipc/types.ts
export interface IpcChannels {
  'db:getFiles': { request: { folderId: string }; response: MediaFile[] };
  'scanner:start': { request: { path: string }; response: void };
}
```

## CSS / Tailwind

- ユーティリティクラスは Tailwind を使用
- 共通パターンは `@apply` でコンポーネント化
- カラーパレットは `tailwind.config.js` で一元管理
- ダークモード対応: `dark:` プレフィックスを使用

## UIデザインルール（運用メモ）

### 目的
- UIの見た目を「好み」ではなくルールで揃え、画面ごとの統一感を維持する
- まずは左サイドバーを基準にし、他画面へ段階的に適用する

### タイポグラフィ階層（左サイドバー基準）
- ナビ項目（`すべてのファイル` / ドライブ / フォルダ / `重複チェック` / `統計` / `設定`）
  - `text-sm`、必要に応じて `font-medium`
  - 通常色 `text-surface-300`、選択時 `text-white`
- セクション見出し（`タグフィルター` / `評価フィルター`）
  - `text-xs font-semibold text-surface-400`
  - 日本語見出しに `uppercase` / 強い `tracking` は基本使わない
- カテゴリ見出し（`ジャンル` / `評価` / `状態` など）
  - `text-xs font-medium text-surface-400`
- 補助操作（`クリア` / `全解除` / `軸管理` など）
  - `text-[11px]` ～ `text-xs`
  - 通常色 `text-surface-500`、hover で `text-surface-300` 以上
- 補助説明 / 空状態
  - `text-xs text-surface-500`

### アイコン階層（左サイドバー基準）
- ナビ項目アイコン（トップレベル項目）
  - `18px` 前後で統一
  - 色は原則 `text-current`（行の文字色に追従）
- セクション見出しアイコン
  - `14px` で統一
- 補助操作アイコン（クリア、設定、フィルター種別など）
  - `11px` ～ `12px`
- 展開用Chevron
  - `12px` ～ `14px`（ツリー/カテゴリで一貫させる）

### 色の役割（左サイドバー）
- 選択状態（フォルダ / ドライブ / すべてのファイル / 統計 / 重複ビューなど）
  - 背景色は原則共通（例: `bg-blue-600`）
  - 文字/アイコンは `text-white`
- 通常状態
  - 文字/アイコンは `text-surface-300` 系
- 補助情報・補助操作
  - `text-surface-400` ～ `text-surface-500`

### 実装時の注意
- 「全部同じサイズ/色」にしない。情報の優先度を示すために 2～3 段階の階層を維持する
- 新しい見出しを追加する場合は、基本的に見出しアイコンを付ける（既存ルールに合わせる）
- 例外が必要な場合は、理由をコメントまたは `CONVENTIONS.md` に短く追記する

## Lint / Build 運用

- PR 前に最低限 `npm run lint` と `npm run build` を実行する
- `lint` は **error 0** を必須とする（warning は段階的に解消）
- 既存コードに警告が残っている場合でも、新規差分で警告を増やさない
- 設定ファイルや生成物（`dist`, `dist-electron`, `*.d.ts`）の変更は意図を PR に明記する

## コミットメッセージ

```
<type>: <subject>

[optional body]
```

| type | 用途 |
|------|------|
| feat | 新機能 |
| fix | バグ修正 |
| refactor | リファクタリング |
| docs | ドキュメント |
| style | コードスタイル変更 |
| chore | 雑務（依存関係更新など）|

## 既知の技術的制約と対策

### ffmpeg プレビューフレーム生成時のコイル鳴き

**現象:**
- プレビューフレーム生成時にPCから異音（コイル鳴き）が発生することがある
- ファイルによって鳴ったり鳴らなかったりする

**原因:**
- ffmpeg の初期デコード時の瞬間的なCPU負荷スパイク（0% → 60%超への瞬間ジャンプ）
- VRMやコイルは平均値ではなく瞬間最大電流に反応する
- 動画特性（コーデック、解像度、GOP構造、カラーフォーマット）によって負荷が異なる
  - H.265/HEVC、VP9、AV1 は特に重い
  - 4K/5K、高ビットレート、HDR なども影響

**現在の対策:**
- `electron/services/thumbnail.ts` の `generatePreviewFrames` で `-threads 1` を指定
- スレッド数を制限することで多くの動画で軽減
- 一部の重い動画（HEVC、4K等）では依然として発生する可能性あり

**完全解決策（将来対応）:**
- ffmpeg を Worker または Utility Process として常駐化
- 連続デコードにより瞬間負荷スパイクを回避
- Phase 13 以降で実装予定

**注意:**
- これはバグではなく、ffmpeg の初期デコード特性 + 動画依存で発生する CPU/VRM 共振の問題
- ハードウェア破損のリスクはほぼなし
- ユーザーによっては不快に感じる可能性があるため、将来的な改善価値は高い
