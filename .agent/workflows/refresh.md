---
description: セッション開始時にプロジェクト状態を把握する（コンテキストリフレッシュ）
---

# Context Refresh

新しいAIセッション開始時、または長い中断後に以下を順番に確認してください。

## 1. 現在のフェーズを確認
`ROADMAP.md` を読んで現在のフェーズと進捗状況を把握

## 2. 直前の作業内容を確認
`.agent/SESSION.md` を読んで：
- Just Completed: 直前のセッションで完了した内容
- Next Steps: 次にやるべきタスク
- Known Issues: 既知の問題
- Important Context: 重要な文脈情報

## 3. 最近の変更を確認
`CHANGELOG.md` の `[Unreleased]` セクションを確認

## 4. 設計判断の確認（必要に応じて）
`.agent/decisions/` 配下のADRを確認して、過去の設計判断を把握

// turbo
## 5. Gitログを確認
```
git log -10 --oneline
```

---

## セッション終了時

作業終了時は必ず `.agent/SESSION.md` を更新してください：
- Just Completed に今回の作業内容を記載
- Next Steps に次のタスクを記載
- Known Issues があれば記載
