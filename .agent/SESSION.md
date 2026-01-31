# Current Session Status

**Last Updated**: 2026-01-31

## Just Completed
- Phase 1: プロジェクト基盤構築
- Phase 2-1: フォルダスキャン機能
- Phase 2-2: ファイル操作系 (openExternal, showInExplorer)
- Phase 2-3: UI連携
  - Preload CJS ビルド問題を修正（vite-plugin-electron/simple形式に変更）
  - Sidebar / FileGrid / FileCard コンポーネント作成
  - TanStack Virtual による仮想スクロール実装
  - ネイティブフォルダ選択ダイアログ (dialog IPC)

## Next Steps
- [ ] Phase 2-4: サムネイル生成（Sharp/FFmpeg）
- [ ] 詳細なUI機能（フォルダ右クリック削除、ソート等）
- [ ] LightBox プレビュー

## Known Issues
- なし

## Important Context
- v2はv1（c:\MediaArchiver）のリファクタリング版
- 状態管理はZustand、仮想スクロールはTanStack Virtualを採用
- v1のarchiveHandler等のロジックは流用予定
