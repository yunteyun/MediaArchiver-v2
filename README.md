# MediaArchiver v2

ローカルメディアファイル（動画・画像・書庫）を効率的に管理するためのデスクトップアプリケーション。

## 技術スタック

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Electron (Node.js)
- **Database**: SQLite (better-sqlite3)
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Virtual Scroll**: TanStack Virtual

## 開発の始め方

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# Lint チェック
npm run lint

# 本番ビルド確認
npm run build
```

> `npm run lint` は警告を表示する場合があります。まずはエラー 0 を維持し、警告は段階的に解消してください。

## ドキュメント

- [ARCHITECTURE.md](./ARCHITECTURE.md) - システム構成図
- [CONVENTIONS.md](./CONVENTIONS.md) - コーディング規約
- [Glossary.md](./Glossary.md) - 用語集
- [ROADMAP.md](./ROADMAP.md) - 開発ロードマップ
