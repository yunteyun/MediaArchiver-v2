---
description: 現在の変更をGitにコミットする
---

# コミット手順

// turbo-all

1. 変更内容を確認
```bash
git status
```

2. 全ての変更をステージング
```bash
git add .
```

3. コミットメッセージを入力（規約に従う）
```bash
git commit -m "<type>: <subject>"
```

## コミットタイプ
- `feat`: 新機能
- `fix`: バグ修正
- `refactor`: リファクタリング
- `docs`: ドキュメント
- `style`: コードスタイル変更
- `chore`: 雑務

---

## ⚠️ リリース時に必ずやること（忘れずに！）

新しいリリースを行う場合は以下を **必ず** 更新すること：

1. **`package.json` の `version` フィールド** を新しいバージョン番号に変更する
   - アプリのヘッダーと設定モーダルに `app.getVersion()` 経由で表示されているため、ここを変えないとバージョン表記が古いまま
   - 例: `"version": "1.1.2"` → `"version": "1.1.3"`

2. **`ROADMAP.md`** の完了済みテーブルにバージョンを追記する

3. **リリースビルドコマンド**（順番通りに実行）:
   ```bash
   npm run build
   npm run build:electron
   ```
   - 出力先: `release/` フォルダ内に ZIP が生成される
