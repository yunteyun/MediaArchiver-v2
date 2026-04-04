リリース作業を実施してください。

AGENTS.md のコミット規約と commit.md のリリース手順に従い、以下を順番に実施すること。
各ステップでユーザーの確認を取りながら進め、承認なしに次のステップへ進まないこと。

## 1. 現状確認

```bash
git status
git log origin/main..HEAD --oneline
```

- 未コミットの変更がある場合は先に `/commit` を実行するようユーザーに促す
- CHANGELOG.md の `[Unreleased]` セクションの内容を確認する

## 2. バージョン番号の決定

現在の `package.json` バージョンを確認し、以下の規則でバージョン案をユーザーに提示して承認を得る：

- 機能追加を含む場合 → `MINOR` を上げる（例: 1.11.0 → 1.12.0）
- 修正のみの場合 → `PATCH` を上げる（例: 1.11.0 → 1.11.1）

## 3. ドキュメント更新

承認を得たバージョンで以下を更新する：

### package.json
`version` フィールドを新しいバージョン番号に変更する。

### CHANGELOG.md
`[Unreleased]` セクションを新しいバージョンセクションに昇格させる。
- 形式: `## [1.x.x] - YYYY-MM-DD`
- 粒度の細かい項目を統合・圧縮する
- 実装詳細のみの記述は削除または簡潔に書き直す
- `[Unreleased]` セクションは空にして残す

### ROADMAP.md
完了済みタスクがあれば削除し、必要に応じて更新する。

### SESSION.md
`Last Updated` と `Recent Achievements` を更新する。

### release-notes/v{バージョン}.md
`release-notes/` フォルダに `v{バージョン}.md` を新規作成する。
- ファイル名例: `v1.13.0.md`
- 内容は CHANGELOG の該当バージョンセクションをそのまま転記する
- このファイルがないとリリース版の設定画面で「リリースノートが見つかりません」と表示される

## 4. 型チェック・lint の実行

```bash
npx tsc --noEmit
npx eslint src/ electron/ --max-warnings=0
```

エラーがある場合は修正してからビルドに進む。

## 5. コミット

```bash
git add package.json CHANGELOG.md ROADMAP.md .agent/SESSION.md release-notes/v{バージョン}.md
git commit -m "[機能追加] x.x.x をリリースする"
```

## 6. リリースビルド

ユーザーの承認を得てからビルドを実行する。

```bash
npm run build
npm run build:electron
```

出力先: `release/` フォルダ内に ZIP が生成される。

## 7. プッシュ・タグ付け

```bash
git push origin main
git tag vx.x.x
git push origin vx.x.x
```

## 8. 完了報告

- バージョン番号
- CHANGELOG の主な変更点サマリー
- `release/` フォルダのビルド成果物ファイル名
