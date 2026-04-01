---
description: セッション開始時のオンボーディング
---

# セッション開始手順

新しいセッション（会話）を開始する際に、最初に確認すべきドキュメントと手順です。

## 1. 必読ドキュメント

以下のファイルを**必ず順番に**確認してください：

1. **AGENTS.md** - 🚨 **最優先** AI実装者向け行動規範（禁止事項・停止条件・コミット形式）
2. **docs/project/ARCHITECTURE.md** - プロジェクト構成の理解
3. **docs/project/CONVENTIONS.md** - コーディング規約の確認
4. **ROADMAP.md** - 現在の開発状況と次のタスク

> **AGENTS.md は全ドキュメントより優先されます。**
> 他のドキュメントと矛盾する場合は AGENTS.md の内容に従ってください。

## 2. 現在の状態確認

```bash
git status
git branch --show-current
git log -n 5 --oneline
```

- 通常作業では `main` で作業し、大きい試作・隔離したい変更だけ `codex/*` ブランチを使う

## 3. 作業開始前の確認事項

- [ ] AGENTS.md の禁止事項・コミット形式を理解したか？
- [ ] 現在取り組むべきタスクは何か？（ROADMAP.md 参照）
- [ ] 関連するコードはどこにあるか？（docs/project/ARCHITECTURE.md 参照）
- [ ] 命名規則やコード構造は正しいか？（docs/project/CONVENTIONS.md 参照）
- [ ] ファイルの記述とユーザーへの応答は日本語で行うことを確認したか？

## 4. 作業開始

非自明な変更を行う前は、実装方針をユーザーに提示してレビューを受けてから実装を開始してください。

## 5. セッション終了時の必須対応

- [ ] `ROADMAP.md` を更新したか？（完了タスクを削除 → CHANGELOG に移す）
- [ ] `CHANGELOG.md` を更新したか？
- [ ] その日の作業終了時に `.agent/devlog/YYYY-MM-DD.md` を作成・更新したか？

> ドキュメント更新の詳細は `.agent/workflows/update-docs.md` を参照。
