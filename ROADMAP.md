# ROADMAP

このファイルは「今後の計画」と「進行中の計画」を最優先で確認するための運用用ロードマップです。
詳細な過去履歴は `CHANGELOG.md` と `ROADMAP_legacy.md` を参照してください。

---

## 1. 進行中の計画 (In Progress)

- サムネイル保存管理の再設計（Step 1 完了）: 共通パス解決 `thumbnailPaths.ts` を導入。次は生成処理の全面切替と cleanup / 移行系の追従を進める
- サムネイル保存管理の再設計（Step 2 進捗）: 主要な生成系（画像/動画/音声/書庫サムネイル/動画プレビュー）を新保存構造へ切替済み。次は消費系（cleanup / 統計 / 移行）の整合確認を進める

- 現在進行中の項目はここに記載（最優先で更新）
- 実装開始時に追加、完了時に `CHANGELOG.md` と本ファイルの完了欄へ反映

現在:
- なし（次の着手内容を決めたら追記）

---

## 2. 今後の計画 (Planned)

優先度の高い順に記載します。

### 直近（優先）
- ドキュメント整理の仕上げ（文字コード統一 / 重複整理 / 役割の最終固定）
- 書庫サムネイル不具合の再検証（`v1.1.3d3` の確認）
- 必要ならビルド識別ログ（build marker）追加
- サムネイル保存管理の再設計（保存構造の統一 / クリーンアップ整合 / 統計・移行の整備）

### サムネイル保存管理（工程）
- Phase A: 現状仕様の棚卸し（生成 / 保存 / DB保持 / クリーンアップ / 統計 / 移行）
- Phase B: 保存構造の決定（プロファイル単位・種別単位・パス表現）
- Phase C: パス解決の共通化（thumbnail path resolver 追加）
- Phase D: 生成系の切替（`thumbnail.ts` / `archiveHandler.ts` / preview frames）
- Phase E: 消費系の切替（cleanup / statistics / delete / storage migration）
- Phase F: 互換・再生成方針の確認（今回はデータ損失許容を活かして簡略化可）
- Phase G: 検証（初回スキャン / 再スキャン / プロファイル切替 / 保存場所切替 / cleanup）

### 次点
- リリース運用の改善（更新手順の簡素化・説明整備）
- ログ/エラー表示の分かりやすさ改善（非エンジニア向け）
- 回帰確認チェックリストの整備

---

## 3. 直近リリース対象（Short-term Release Scope）

次回リリースに含める候補を管理します。

- [ ] 書庫サムネイル初回スキャン不具合の修正確認（`1.1.3d3`）
- [ ] ドキュメント整理（README / ROADMAP / メモ類）
- [ ] 必要な changelog 追記と devlog 記録

---

## 4. 保留・バックログ (Backlog)

- UI/UX 改善案（詳細は `docs/dev/思考メモ.md`）
- 未解決不具合・要望（詳細は `docs/dev/不具合・要望リスト.md`）
- 中長期の配布改善（インストーラー化 / 自動更新の検討）

---

## 5. 最近完了した主な項目（要約）

- サムネイル保存管理 Step 1: `electron/services/thumbnailPaths.ts` を追加し、`thumbnail.ts` / `archiveHandler.ts` / `thumbnailCleanupService.ts` / `statisticsService.ts` / `databaseManager.ts` の主要パス解決を共通化（将来のデータ保持移行に向けた準備）
- サムネイル保存管理 Step 2（主要生成系）: 画像 / 動画 / 音声 / 書庫サムネイル / 動画プレビューフレームの保存先を新ルール（プロファイル + 種別）へ切替
- サムネイル保存管理 Step 3（一部）: `preview_frames` の形式差（JSON配列 / カンマ区切り）を cleanup / 削除処理で両対応化
- サムネイル保存管理 Step 3（一部）: cleanup診断で旧保存構造（`thumbnails` 直下）へのフォールバックを追加（移行途中の運用向け）

- dev/release の保存先・プロファイル分離
- ログ保存先の整理（保存モード追従）
- `update.bat` 同梱による ZIP 更新フロー追加
- 書庫サムネイル（`EXDEV` / `ENOENT` / 初回スキャン失敗）の修正対応
- README.md と docs/INDEX.md の再構成（利用者向け入口 + ドキュメント地図の明確化）
- Markdown ドキュメントの UTF-8 統一（node_modules/release除外）とメモ類の `docs/user` / `docs/dev` への整理
- `docs/dev/思考メモ.md` に最小Git運用ルール（通常は `codex/...` 継続 / 大規模変更のみ分岐）を追記
- `docs/dev/思考メモ.md` に作業コード番号ルール（`C001` 形式）と命名規約（`codex/c###-short-name`）を追記
- タグフィルタの「タグ管理」ボタン押下時に UI が消える問題に対して `TagManagerModal` の Portal 化で表示安定化
- タグ管理モーダルの Hook 順序不整合（開閉時の `Rendered more hooks...`）を修正し、背景だけ残る状態を解消
- 開発版での `7za` 実行ファイル解決失敗（`spawn ... ENOENT`）を修正し、書庫サムネイル生成が止まる問題に対応
- 統計のサムネイル容量表示で旧保存構造へのフォールバックを追加し、移行途中の `0` 表示を緩和
- `media://` パス解釈の安定化対応

詳細は `CHANGELOG.md` を参照。

---

## 6. ドキュメントの使い分け

- `ROADMAP.md`: 今後の計画 / 進行中 / 直近リリース対象
- `CHANGELOG.md`: リリース単位の変更履歴
- `docs/INDEX.md`: ドキュメント地図（何をどこに書くか）
- `docs/user/アプリ使用メモ.md`: ユーザー向け操作・更新手順
- `docs/dev/不具合・要望リスト.md`: 未解決の不具合・要望
- `docs/dev/思考メモ.md`: 検討中アイデア（未確定）
- `.agent/devlog/YYYY-MM-DD.md`: 日次作業記録
- `ROADMAP_legacy.md`: 過去の詳細フェーズ表（退避）

---

## 7. 運用ルール（簡易）

1. 実装完了後に `CHANGELOG.md` と `ROADMAP.md` を更新する
2. 不具合は `docs/dev/不具合・要望リスト.md`、検討中は `docs/dev/思考メモ.md` に分ける
3. セッション終わりに `.agent/devlog/YYYY-MM-DD.md` を記録する
