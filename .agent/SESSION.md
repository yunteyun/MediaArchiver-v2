# Current Session Status

**Last Updated**: 2026-02-21 19:00

- **Current Focus**: v1.1.4リリース完了。次の機能開発またはフェーズ選定待ち。
- **Current Status**: リリース版での書庫抽出におけるENOENT/EXDEVエラー、およびプレビュー削除時のパースエラーに対する追加安全対策を実装し、ビルドを完了。
- **Recent Achievements**:
  - **1.1.4 Hotfix: リリース版 書庫処理の安全対策・ファイル移動共通化**:
    - `fileOperationService.ts` に `safeMoveFileSync` を実装し、別ドライブ(EXDEV)間の移動を一時コピー＋アトミックrenameに安全化。
    - `archiveHandler.ts` において、UUIDを用いた一時サブディレクトリ抽出による抽出ファイル名競合の回避(ENOENT対策)を再適用するとともに、後処理を `safeMoveFileSync` に統一。
    - `database.ts` に `parsePreviewFrames` ユーティリティを追加し、カンマ区切りCSVによるパースエラー発生時は自動的にJSON配列に正規化(UPDATE)して完全収束する仕組みを構築。
    - `scanner.ts`、`thumbnailCleanupService.ts` にも共通のパースロジックを適用。
  - **Phase 28: タグUI改善 3パート**:
    - TagSelector: カテゴリ名横にカラードット表示、sortOrder順ソート、grid-cols-2の2列グリッド表示
    - RightPanel/TagSection: `<select>`（TagAddDropdown）を TagSelector に置換
    - TagManagerModal: 右ペインのタグリストを grid-cols-2 多列表示に変更
    - TagManagerModal: 左ペインにGripVerticalハンドル + HTML5 D&D でカテゴリ並び替え実装
    - useTagStore: updateCategory に sortOrder 型を追加
  - **1.1.3 Hotfix: リリース版書庫サムネイル取得障害**:
    - `package.json` に `asarUnpack` と `afterPack` 検証スクリプト追加
    - `archiveHandler.ts` を `process.resourcesPath` ベースに変更
    - `databaseManager.ts` に空ディレクトリ生成 (`ensureDbDirectory`) 追加

## Completed Phases
- ✅ Phase 0: 再構築準備
- ✅ Phase 1: プロジェクト基盤構築
- ✅ Phase 2: コア機能実装（スキャン・サムネイル・UI連携）
- ✅ Phase 3: UI 機能拡張（サイドバー・ソート・LightBox・コンテキストメニュー）
- ✅ Phase 4: アーカイブ対応
- ✅ Phase 5: 機能拡張（タグ管理・フィルタリング・検索・設定画面）
- ✅ Phase 6: プロファイル機能
- ✅ Phase 7: ブラッシュアップ（キーボードショートカット・パフォーマンス最適化）
- ✅ Phase 8: データ整合性強化（自動削除・トランザクション・ログシステム）
- ✅ Phase 9: コア機能拡張（音声対応・重複検出・全ファイルビュー・メモ）
- ✅ Phase 10: DB 基盤強化（マイグレーションシステム）
- ✅ Phase 11: 統計・ログ（円グラフ・棒グラフ・アクティビティログ）
- ✅ Phase 12: UI/UX 改善（トースト・カスタムプロトコル・タグ拡張・削除改善 他）
- ✅ Phase 13: FileCard 基礎設計（isAnimated・レイアウト刷新・デザイントークン）
- ✅ Phase 14: 表示モードシステム（Compact/Standard 切替・タグポップオーバー）
- ✅ Phase 15: バッジ修正 & UI 改善
- ✅ Phase 16: FileCard インタラクション修正
- ✅ Phase 17: アクセストラッキング
- ✅ Phase 18-A: 外部アプリ起動カウント
- ✅ Phase 18-B: 外部アプリ UX 強化
- ✅ Phase 18-C: ファイル操作機能（移動・クロスドライブ対応）
- ✅ **v1.0.0 リリース**（Phase 18-C まで）
- ✅ Phase 19.5: Critical Bug Fixes（メモリリーク・複数選択削除/移動・孤立サムネイル誤検出）
- ✅ Phase 20-A: Lightbox UI 再設計（2カラム固定レイアウト）
- ✅ Phase 20-B: 動画キーボード操作（Space/←→/↑↓）
- ✅ Phase 21: グループ表示改善（相対時間区分）
- ✅ Phase 22-C: フォルダツリーナビゲーション機能
- ✅ Phase 23: 右サイドパネル
- ✅ Phase 24: サムネイル軽量化（WebP変換・一括再生成）
- ✅ Phase 25: 保存場所カスタマイズ
- ✅ **v1.1.0 リリース**（Phase 25 まで、ZIP 形式）
- ✅ Phase 26 (Part 1): v1.1.2 バグ修正・UX改善（プレビュー・バッジ・バージョン）
- ✅ **v1.1.2 リリース**
- ✅ Phase 26 (Part 2): タグ・評価システム刷新（TagManagerModal刷新・評価軸・StarRating・詳細検索）
- ✅ Phase 27: 検索UI統合 & タググループ化（カテゴリ別折りたたみ）
- ✅ Phase 27.5: 詳細検索廃止・サイドバー評価フィルター統合
- ✅ Phase 28: タグUI改善（TagSelector多列化・RightPanel置換・TagManagerModal多列+D&D）

## Next Steps
- [ ] 追加表示モード（漫画モード・動画モード）
- [ ] タグカテゴリ表示優先順位付け強化（カテゴリ単位グループ化・均等表示）

## Known Issues
なし（現在確認されている重大な不具合はありません）

## Important Context
- v2 は v1（c:\\MediaArchiver）のリファクタリング版
- 状態管理: Zustand、仮想スクロール: TanStack Virtual
- Phase 25 で保存場所カスタマイズ機能実装済み（アップデート時のデータ退避に注意）
- リリース時は必ず `package.json` バージョン更新と `ROADMAP.md` 更新を行う（commit.md 参照）
