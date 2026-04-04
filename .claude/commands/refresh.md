コンテキストリフレッシュを実行してください。

.agent/workflows/refresh.md の内容に従い、以下を順番に実施してください：

1. ROADMAP.md を読んで現在のフェーズと進捗を確認する
2. .agent/SESSION.md を読んで直前の作業内容・次のタスク・既知の問題を確認する
3. CHANGELOG.md の [Unreleased] セクションを確認する
4. git log -10 --oneline と git status を実行する
5. `gh issue list --limit 20 --state open` で Open Issues を取得する
6. 確認結果を日本語で簡潔に要約して報告する（Issues は優先度別に整理して一覧表示する）
