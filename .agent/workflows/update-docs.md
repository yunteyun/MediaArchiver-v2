---
description: 開発状況に合わせてドキュメント（SESSION.md, ROADMAP.md, CHANGELOG.md, 開発日誌）を更新する
---

# ドキュメント更新ワークフロー

開発の節目でプロジェクトドキュメントを最新状態に更新するためのワークフローです。

## 対象ファイル

| ファイル | 目的 |
|---------|------|
| `.agent/SESSION.md` | 現在のセッション状態、完了済みタスク、次のステップ |
| `ROADMAP.md` | 今後の開発予定（完了済みは一覧テーブルのみ） |
| `CHANGELOG.md` | 変更履歴（`dev-XX` 形式、Phase 単位の詳細記録） |
| `.agent/devlog/YYYY-MM-DD.md` | 開発日誌（セッション終了時のみ） |

## 手順

### 1. 現在のファイル内容を確認
各ファイルを開いて現在の内容を確認する。

### 2. SESSION.md を更新
- **Last Updated**: 現在の日時に更新
- **Current Focus / Status**: 現在のフェーズと状況
- **Recent Achievements**: 直近の達成内容
- **Completed Phases**: 完了したフェーズを追記
- **Next Steps / Known Issues**: 更新

### 3. ROADMAP.md を更新
- **完了済み Phase 一覧テーブル**: 行を追加（Phase番号、名称、主な内容、完了時期）
- **進行中 / 予定**: 現在の状況を反映
- ※ 完了済み Phase の詳細は CHANGELOG に記載（ROADMAP には書かない）

### 4. CHANGELOG.md を更新
`dev-XX` 形式で記載する。

```markdown
## [dev-XX] - YYYY-MM-DD
### Phase XX: フェーズ名

#### Added
- 新機能の説明

#### Changed
- 変更内容

#### Fixed
- 修正内容
```

**ルール**:
- `dev-XX` の XX は Phase 番号に対応
- 大きな Phase はサブバージョンで分割: `dev-12a`, `dev-12b` 等
- 複数 Phase をまとめる場合は範囲表記: `dev-1~7`
- カテゴリは Keep a Changelog 準拠: Added / Changed / Fixed / Removed
- 各項目は簡潔に1行で記述（詳細はコードコメントやコミットログを参照）

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

## 最低限の必須更新（毎回）

実装を伴う作業が完了したら、以下は必須:

1. `ROADMAP.md`（完了済みフェーズ表の更新）
2. `CHANGELOG.md`（変更履歴の追記）

その日の作業終了時は必須:

3. `.agent/devlog/YYYY-MM-DD.md`（当日の開発日誌）
