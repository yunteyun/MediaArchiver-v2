# MediaArchiver v2

ローカルにある画像・動画・書庫・音声ファイルを整理・閲覧するためのデスクトップアプリです。
Electron + React で動作します。

## 利用者向け（まずここ）

### できること

- フォルダを登録してメディアを一覧表示
- サムネイル生成（画像 / 動画 / 書庫）
- タグ・評価・検索で整理
- ZIP配布版の更新（`update.bat`）

### 使い始め方（ZIP版）

1. ZIPを展開する
2. `MediaArchiver v2.exe` を起動する
3. フォルダを登録してスキャンする

### 更新方法（ZIP版）

1. 新しいZIPをダウンロードする
2. 既存フォルダ内の `update.bat` を実行する
3. ZIPを選択して更新する
4. アプリが再起動したら、ヘッダーのバージョン表示と通常操作を確認する

### 不具合・要望の連絡先

- 不具合、要望、気づきは [GitHub Issues](https://github.com/yunteyun/MediaArchiver-v2/issues) に集約します
- 迷った場合は Issue 作成画面のテンプレートから近いものを選べば大丈夫です

補足:
- `update.bat` はアプリ本体と同じフォルダで使う前提です
- `update.bat` は `MediaArchiver v2.exe` を自動終了して上書き更新します
- 詳細手順は `docs/user/アプリ使用メモ.md` を参照してください

### 保存場所・ログについて（要点）

- 保存先は設定で変更できます
- `install` モードでは、アプリフォルダ配下の `data` を使用します
- ログは保存モードに応じた場所に保存されます（例: `data/logs`）

## 開発者向け

### 開発環境の起動

```bash
npm install
npm run dev
```

### ビルド

```bash
# アプリ本体（renderer + electron）
npm run build

# Windows リリースZIP作成
npm run build:electron
```

### リリース作業（最小手順）

1. `package.json` の `version` を更新する
2. `CHANGELOG.md` を更新する（Unreleased を整理）
3. `release-notes/v<version>.md` を更新する
4. `npm run build`
5. `npm run build:electron`
6. 出力ZIPを展開して `update.bat` 更新が通るか確認する（可能なら既存版から更新テスト）

補足:
- `release-notes/v<version>.md` はリリースZIPへ同梱され、アプリの `設定 > 更新` から現在版の内容確認に使われます

### バージョン運用（命名規則）

- 通常リリースは `MAJOR.MINOR.PATCH`（例: `1.6.0`）
- 機能追加を含む場合は `MINOR` を上げる（例: `1.6.0` -> `1.7.0`）
- 不具合修正のみの場合も `PATCH` を上げる（例: `1.7.0` -> `1.7.1` -> `1.7.2`）
- `d` 付きの派生表記は今後の新規リリースでは使わない
- 過去の `d` 付きバージョン表記は履歴としてそのまま残る

## ドキュメント

### 入口

- `docs/INDEX.md` : ドキュメント地図（どこに何を書くか）

### 開発・運用

- `ROADMAP.md` : 今後の計画 / 進行中（未完了中心） / 直近リリース対象
- `CHANGELOG.md` : リリース単位の変更履歴（完了済み変更の詳細）
- `docs/archive/ROADMAP_legacy.md` : 旧ロードマップ（過去フェーズ詳細）
- `.agent/devlog/YYYY-MM-DD.md` : 日次作業記録

### メモ類

- `docs/user/アプリ使用メモ.md` : 利用者向けの使い方・更新手順
- `docs/dev/operations/github-issues-workflow.md` : GitHub Issues 中心の課題管理ルール
- `docs/dev/notes/思考メモ.md` : 検討中のアイデア・比較メモ
- `docs/project/ARCHITECTURE.md` / `docs/project/CONVENTIONS.md` : 開発時の基本設計と規約

## 注意

- `update.bat` は文字コードの都合で ASCII 中心にしています（仕様）
- Markdown ドキュメントは UTF-8 前提で運用しています
