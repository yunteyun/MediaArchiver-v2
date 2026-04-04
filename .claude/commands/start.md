セッション開始手順を実行してください。

.agent/workflows/start.md の内容に従い、以下を順番に実施してください：

1. AGENTS.md を読む
2. ROADMAP.md を読む
3. .agent/SESSION.md を読む
4. git status / git branch --show-current / git log -n 5 --oneline を実行して現在の状態を確認する
5. `gh issue list --limit 20 --state open` で Open Issues を取得する
6. 確認結果を日本語で要約して報告する（Issues は優先度別に整理して一覧表示する）
7. 作業種別に応じた推奨モデルを案内する：
   - 単純な修正・整理・リネーム → `/model haiku`（高速・低コスト）
   - 通常の機能追加・バグ修正 → Sonnet（デフォルト、変更不要）
   - 設計・複雑なデバッグ・大規模リファクタ → `/model opusplan`（計画はOpus、実行はSonnet）
8. コミット前のワークフローを案内する：
   - 実装完了後 → `/simplify`（コードの品質・効率・再利用性を精査・修正）
   - 精査完了後 → `/commit`
