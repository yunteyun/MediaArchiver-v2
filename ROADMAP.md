# Roadmap

MediaArchiver v2 の開発ロードマップです。

---

## ✅ 完了済み (Completed)

### Phase 0: 再構築準備
- [x] v1の問題点分析（点滅問題、設計の不透明さ）
- [x] 流用可能なロジック資産の特定
- [x] 再構築方針の決定

### Phase 1: プロジェクト基盤構築
- [x] ドキュメント整備 (ARCHITECTURE, CONVENTIONS, Glossary)
- [x] Vite + Electron + TypeScript プロジェクト初期化
- [x] Zustand ストア基本設計
- [x] SQLite データベーススキーマ設計
- [x] IPC通信基盤の構築

### Phase 2: コア機能実装
- [x] Phase 2-1: フォルダスキャン機能
- [x] Phase 2-2: ファイル操作系 (openExternal, showInExplorer)
- [x] Phase 2-3: UI連携 (Sidebar, FileGrid, FileCard, TanStack Virtual)
- [x] Phase 2-4: サムネイル生成 (FFmpeg/Sharp)

### Phase 3: UI機能拡張
- [x] Phase 3-1: サイドバー開閉機構
- [x] Phase 3-2: フォルダ右クリックメニュー（削除、再スキャン）
- [x] Phase 3-3: ファイルソート機能
- [x] Phase 3-4: LightBox（クイックプレビュー）
- [x] Phase 3-5: ファイルコンテキストメニュー

### Phase 4: アーカイブ対応
- [x] 書庫ファイル処理（v1からarchiveHandler移植）
- [x] 書庫内プレビュー

### Phase 5: 機能拡張
- [x] Phase 5-1: タグ管理システム（CRUD、フィルターパネル、管理モーダル）
- [x] Phase 5-2: タグフィルタリング（AND/OR モード）
- [x] Phase 5-3: 検索機能（ファイル名部分一致、デバウンス）
- [x] Phase 5-4: 設定画面（サムネイルサイズ、音量、ホバー動作）

### Phase 6: プロファイル・高度な機能
- [x] プロファイル切り替え（DB分割方式）
- [x] サムネイルホバー動作（scrub/play 実装）

---

## 🚧 進行中 (In Progress)

(なし)

---

## 📋 予定 (Planned)

### Phase 7: ブラッシュアップ
- [ ] アニメーション・マイクロインタラクション
- [ ] キーボードショートカット
- [ ] パフォーマンス最適化

---

## 🔮 将来構想 (Backlog)

### UI/UX 改善（Phase 8 以降）
- タグの省略表示とスライド展開
- ファイルカードのサイズ・レイアウト可変設定
- ファイルカード表示内容のカスタマイズ
- フォルダカード表示
- カテゴリ別統計表示
- アクティビティログ
- スクラブモード時のシークバー表示（現在位置の可視化）
- ダッシュボード（各種情報の集約表示）

### 高度な機能
- スマートプレイリスト（条件に基づく動的リスト）
- 自動整理（ルールベースのファイル移動・リネーム）
- プラグイン機構
