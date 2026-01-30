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
