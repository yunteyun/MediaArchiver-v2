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

補足:
- `update.bat` はアプリ本体と同じフォルダで使う前提です
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

### バージョン運用（修正版）

- 修正版は `d + 数字` を付けて管理（例: `1.1.3d3`）
- 出力ZIP名は electron-builder の都合で `1.1.3-d3` 形式になります

## ドキュメント

### 入口

- `docs/INDEX.md` : ドキュメント地図（どこに何を書くか）

### 開発・運用

- `ROADMAP.md` : 今後の計画 / 進行中（未完了中心） / 直近リリース対象
- `CHANGELOG.md` : リリース単位の変更履歴（完了済み変更の詳細）
- `ROADMAP_legacy.md` : 旧ロードマップ（過去フェーズ詳細）
- `.agent/devlog/YYYY-MM-DD.md` : 日次作業記録

### メモ類

- `docs/user/アプリ使用メモ.md` : 利用者向けの使い方・更新手順
- `docs/dev/不具合・要望リスト.md` : 未解決の不具合・要望
- `docs/dev/思考メモ.md` : 検討中のアイデア・比較メモ

## 注意

- `update.bat` は文字コードの都合で ASCII 中心にしています（仕様）
- Markdown ドキュメントは UTF-8 前提で運用しています
