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

---

## 🚧 進行中 (In Progress)

### Phase 3: UI機能拡張
- [x] Phase 3-1: サイドバー開閉機構
- [x] Phase 3-2: フォルダ右クリックメニュー（削除、再スキャン）
- [ ] ファイルソート機能
- [ ] LightBox（クイックプレビュー）
- [ ] コンテキストメニュー

---

## 📋 予定 (Planned)

### Phase 4: アーカイブ対応
- [ ] 書庫ファイル処理（v1からarchiveHandler移植）
- [ ] 書庫内プレビュー

### Phase 5: 機能拡張
- [ ] タグ管理システム
- [ ] 検索・フィルター機能
- [ ] 設定画面
- [ ] プロファイル切り替え

### Phase 6: ブラッシュアップ
- [ ] アニメーション・マイクロインタラクション
- [ ] キーボードショートカット
- [ ] パフォーマンス最適化

---

## 🔮 将来構想 (Backlog)

- スマートプレイリスト（条件に基づく動的リスト）
- 自動整理（ルールベースのファイル移動・リネーム）
- プラグイン機構
