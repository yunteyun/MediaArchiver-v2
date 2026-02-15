# Architecture

MediaArchiver v2 のシステム構成と設計方針を定義します。

## 全体構成

```
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process (React)                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Zustand   │  │  Components │  │   TanStack Virtual  │  │
│  │   (Store)   │◄─┤    (UI)     │──┤   (Virtual Scroll)  │  │
│  └──────┬──────┘  └─────────────┘  └─────────────────────┘  │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              IPC Bridge (contextBridge)                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Main Process (Electron)                  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Database   │  │   Scanner    │  │   Thumbnail  │       │
│  │   (SQLite)   │  │   Service    │  │   Generator  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Archive    │  │   Tag/Rule   │  │   External   │       │
│  │   Handler    │  │   Services   │  │   App Opener │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## ディレクトリ構成

```
MediaArchiver-v2/
├── electron/           # Electronメインプロセス
│   ├── main.ts         # エントリーポイント
│   ├── preload.ts      # プリロードスクリプト (IPC定義)
│   ├── ipc/            # IPCハンドラー群
│   │   ├── database.ts
│   │   ├── scanner.ts
│   │   └── thumbnail.ts
│   └── services/       # ビジネスロジック
│       ├── archiveHandler.ts
│       ├── scanner.ts
│       ├── thumbnail.ts
│       ├── tagService.ts
│       ├── autoTagService.ts
│       ├── duplicateService.ts
│       ├── statisticsService.ts
│       └── fileOperationService.ts
├── src/                # Reactフロントエンド
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── stores/         # Zustand ストア
│   │   ├── useFileStore.ts
│   │   ├── useUIStore.ts
│   │   └── useSettingsStore.ts
│   ├── components/     # UIコンポーネント
│   │   ├── layout/
│   │   ├── sidebar/
│   │   ├── grid/
│   │   └── modals/
│   ├── hooks/          # カスタムフック
│   └── types/          # TypeScript型定義
├── ARCHITECTURE.md
├── CONVENTIONS.md
├── Glossary.md
└── ROADMAP.md
```

## 設計原則

### 1. 状態管理の一元化 (Zustand)
- グローバルな状態は全て Zustand ストアで管理
- コンポーネント間の Props のバケツリレーを排除
- 再描画の範囲を最小限に制御

### 2. IPC通信の明確化
- 全てのIPC通信は `electron/ipc/` 配下で定義
- リクエスト/レスポンス形式で統一
- 型安全性を `@types/ipc.d.ts` で保証

### 3. サービス層による責務分離
- `electron/services/` に純粋なビジネスロジックを配置
- UIに依存しない、テスト可能な設計
- v1からの資産（archiveHandler等）はここに移植

### 4. 仮想スクロールの安定化
- TanStack Virtual を採用し、再描画を完全制御
- グリッドアイテムは `React.memo` で最適化
- マウス操作に関わる状態は UIStore で分離管理
