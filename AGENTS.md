# AGENTS

## 文字コードルール（Windows / PowerShell）

- Markdown / テキストファイルは `UTF-8` を前提に扱う
- `PowerShell` で読み書きする場合は、文字コードを明示する
- `Get-Content` / `Set-Content` / `Out-File` を使うときは `UTF-8` 指定を省略しない
- 文字化けしやすいファイル（`CHANGELOG.md`, `ROADMAP.md`, `docs/*.md`）は `apply_patch` を優先する

## PowerShell 実行時の実務ルール

- 読み込み: `Get-Content -Encoding UTF8`
- 書き込み: `Set-Content -Encoding utf8`
- .NET API で書く場合は `UTF8Encoding($false)` を使い、BOM有無を明示する

## 追記・置換の注意

- 文字化けした表示を見たまま置換しない（意図しない差分が出やすい）
- 大きいテキスト置換をする前に `git diff --stat` で差分量を確認する
- 不自然に差分が大きい場合は作業を止めて、エンコード起因を疑う

