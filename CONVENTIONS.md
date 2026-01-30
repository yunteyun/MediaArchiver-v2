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
