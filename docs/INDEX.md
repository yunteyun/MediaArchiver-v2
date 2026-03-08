# Docs Index

どの情報をどこに書くかをまとめたドキュメント地図です。普段参照する文書と、履歴として保管する文書を分けて管理します。

## 入口

- `README.md`
  - 利用者向けの概要、起動方法、更新方法
  - 開発者向けの基本コマンド
- `ROADMAP.md`
  - 進行中と予定のみを管理
  - 完了項目は残さず `CHANGELOG.md` へ移す
- `CHANGELOG.md`
  - 完了した変更の記録
  - リリース単位で整理する

## docs/user

- `docs/user/アプリ使用メモ.md`
  - 利用者向けの使い方
  - `update.bat` を使った更新手順
  - 注意点と切り分け

## docs/project

- `docs/project/ARCHITECTURE.md`
  - 全体構成
  - ディレクトリ構成
  - 設計原則
- `docs/project/CONVENTIONS.md`
  - コーディング規約
  - UI 実装時の基準
  - コミット運用
- `docs/project/Glossary.md`
  - 用語の定義
  - ドキュメント内の呼称統一

## docs/dev/operations

- `docs/dev/operations/不具合・要望リスト.md`
  - 未解決の不具合と要望のみを置く
  - 解決済みは `CHANGELOG.md` へ移し、ここには残さない
- `docs/dev/operations/回帰確認チェックリスト.md`
  - UI 変更時の最低限の確認観点
  - リリース前のスモーク確認
- `docs/dev/operations/multi-agent-playbook.md`
  - マルチエージェント運用時の役割分担
  - 依頼テンプレートと競合防止ルール

## docs/dev/specs

- `docs/dev/specs/lightbox-redesign-v2.md`
  - Lightbox / Center Viewer の設計方針
- `docs/dev/specs/smart-folder-v1-spec.md`
  - スマートフォルダ v1 の仕様
- `docs/dev/specs/display-presets.md`
  - 表示プリセット JSON の仕様
- `docs/dev/specs/display-thumbnail-separation-v1.md`
  - 表示レイアウトとサムネイル表現の分離方針
- `docs/dev/specs/settings-redesign-v1.md`
  - 設定項目の棚卸しと保存スコープ、設定再編の方針

## docs/dev/investigations

- `docs/dev/investigations/auto-update-investigation-v1.md`
  - 更新導線の棚卸しと PoC 方針
- `docs/dev/investigations/perf-baseline-ffmpeg-worker.md`
  - ffmpeg Worker 化の比較記録

## docs/dev/notes

- `docs/dev/notes/思考メモ.md`
  - 未確定のアイデア
  - 比較案
  - 方針化前のメモ

## docs/archive

- `docs/archive/CHANGELOG_legacy.md`
  - 旧変更履歴の保管
- `docs/archive/ROADMAP_legacy.md`
  - 旧ロードマップの保管
- `docs/archive/DEV_LOG.md`
  - 過去の開発日誌
- `docs/archive/ui-ux-improvement-plan-v1.md`
  - 時限的だった UI/UX 計画の保管
- `docs/archive/file_card_表示設計に関する将来要望まとめ.md`
  - 旧検討メモの保管

## 参考扱い

- `.agent/devlog/YYYY-MM-DD.md`
  - セッション単位の内部作業ログ
  - 正式なプロジェクト文書というより運用メモ
- `個人的メモ（参照不要）.md`
  - 正式ドキュメントとして扱わない

## 更新ルール

1. 実装完了後に `CHANGELOG.md` と `ROADMAP.md` を更新する
2. `ROADMAP.md` には未完了の項目だけを書く
3. 不具合や要望は `docs/dev/operations/不具合・要望リスト.md` に集約する
4. 使い方変更は `docs/user/アプリ使用メモ.md` を更新する
5. 通常の開発作業は `main` を基準にし、大きい試作や隔離したい変更だけ `codex/*` ブランチを使う
6. 新規文書はまず `docs/` 配下のどこへ置くかを決めてから作成する

## 配置判断の目安

- 日常的に参照するルールや仕様は `docs/project` か `docs/dev/specs`
- 運用手順や確認手順は `docs/dev/operations`
- 調査結果やベースライン記録は `docs/dev/investigations`
- 未確定の検討は `docs/dev/notes`
- 参照頻度が低い履歴は `docs/archive`
