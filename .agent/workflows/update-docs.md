---
description: 開発状況に合わせてドキュメント（SESSION.md, ROADMAP.md, CHANGELOG.md, 開発日誌）を更新する
---

# ドキュメント更新ワークフロー

開発の節目でプロジェクトドキュメントを最新状態に更新するためのワークフローです。

## 対象ファイル

| ファイル | 目的 |
|---------|------|
| `.agent/SESSION.md` | 現在のセッション状態、完了済みタスク、次のステップ |
| `ROADMAP.md` | 今後の開発予定（完了済みは即削除して CHANGELOG へ） |
| `CHANGELOG.md` | 変更履歴（ユーザー視点で「何が変わったか」を記述） |
| `.agent/devlog/YYYY-MM-DD.md` | 開発日誌（セッション終了時のみ） |

## 手順

### 1. 現在のファイル内容を確認

各ファイルを読んで現在の内容を把握する。

### 2. SESSION.md を更新

- **Last Updated**: 現在の日時に更新
- **Current Focus / Status**: 現在のフェーズと状況
- **Recent Achievements**: 直近の達成内容
- **Next Steps / Known Issues**: 更新

### 3. ROADMAP.md を更新

AGENTS.md の ROADMAP 運用ルールに従う：
- 完了したタスクは「進行中」から**即削除**して CHANGELOG に移す
- 新たに判明した課題は「予定」または Backlog に追加
- 各セクションの項目数上限を守る（進行中: 5, 直近予定: 5, 将来候補: 10）

### 4. CHANGELOG.md を更新

AGENTS.md の CHANGELOG 運用ルールに従う。ユーザー視点で「何が変わったか」を記述する。

```markdown
## [Unreleased]
### Added
- 新機能の説明（ユーザーへの影響）

### Changed
- 変更内容（なぜ変えたか・どう変わったか）

### Fixed
- 修正内容（どんな問題が解決されたか）
```

**ルール:**
- 実装の手段（変数名・関数名・IPC名・内部パス）は書かない
- 純粋なリファクタリングで動作変更なしの場合は「（表示への変更なし）」と添えるか省略
- バージョン昇格時は `[Unreleased]` を整理・圧縮してからバージョン番号セクションへ

### 5. 開発日誌を作成（セッション終了時のみ）

`.agent/devlog/YYYY-MM-DD.md` 形式で当日の開発日誌を作成する。

**記載内容:**
- 本日の目標
- 実装した機能（内容・課題と解決・コミット）
- 成果（完了フェーズ・コード統計）
- 学んだこと・気づき
- 次回の予定

### 6. コミット

変更したドキュメントをステージングしてコミットする。
コミット形式は AGENTS.md および `.agent/workflows/commit.md` に従う。

```bash
git add ROADMAP.md CHANGELOG.md .agent/SESSION.md
git commit -m "[整理] 開発状況に合わせてドキュメントを更新"
git push origin main
```

---

## 更新タイミング

- 機能実装完了時
- セッション終了時
- ユーザーから明示的に更新を求められたとき

## 毎回必須の最低限更新

実装を伴う作業が完了したら、以下は必須:

1. `ROADMAP.md`（完了タスクの削除と CHANGELOG への移動）
2. `CHANGELOG.md`（変更履歴の追記）

その日の作業終了時は必須:

3. `.agent/devlog/YYYY-MM-DD.md`（当日の開発日誌）
