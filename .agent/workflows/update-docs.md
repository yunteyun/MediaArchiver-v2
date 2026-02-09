---
description: 開発状況に合わせてドキュメント（SESSION.md, ROADMAP.md, CHANGELOG.md, 開発日誌）を更新する
---

# ドキュメント更新ワークフロー

開発の節目でプロジェクトドキュメントを最新状態に更新するためのワークフローです。

## 対象ファイル

| ファイル | 目的 |
|---------|------|
| `.agent/SESSION.md` | 現在のセッション状態、完了済みタスク、次のステップ |
| `ROADMAP.md` | 開発ロードマップ、フェーズ進捗 |
| `CHANGELOG.md` | 変更履歴、追加機能、修正バグ |
| `.agent/devlog/YYYY-MM-DD.md` | 開発日誌（セッション終了時のみ） |

## 手順

### 1. 現在のファイル内容を確認
各ファイルを開いて現在の内容を確認する。

### 2. SESSION.md を更新
- **Last Updated**: 現在の日時に更新
- **Completed Phases**: 完了したフェーズを追記
- **Next Steps**: 次に予定しているタスクを更新
- **Known Issues**: 既知の問題があれば追記

### 3. ROADMAP.md を更新
- **完了済み (Completed)**: 完了したフェーズにチェックを入れる
- **進行中 (In Progress)**: 現在作業中のフェーズを移動
- **予定 (Planned)**: 今後の予定を整理

### 4. CHANGELOG.md を更新
- **Added**: 新しく追加した機能
- **Changed**: 変更した機能
- **Fixed**: 修正したバグ

### 5. 開発日誌を作成（セッション終了時のみ）
`.agent/devlog/YYYY-MM-DD.md`形式で本日の開発日誌を作成する。

**記載内容**:
- 本日の目標
- 実装した機能（実装時間、内容、課題と解決、コミット）
- 成果（完了フェーズ、コード統計）
- 学んだこと・気づき
- 次回の予定
- 備考

### 6. Gitコミット
// turbo
```powershell
git add -A; git commit -m "docs: 開発状況に合わせてドキュメント更新"; git push origin main
```

## 更新タイミング

- フェーズ完了時
- 大きな機能実装後
- セッション終了時
- ユーザーから `/update-docs` を実行されたとき
