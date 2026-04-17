# Current Session Status

**Last Updated**: 2026-04-18

- **Current Focus**: 音声書庫の操作パネル表示不具合の修正
- **Current Status**: 修正完了・コミット済み。

## Recent Achievements

- **音声書庫の操作パネル表示不具合を修正**:
  - ファイルリストが多い時に再生コントロールが画面外に押し出される問題を解消
  - `CenterViewerStage.tsx` の flex レイアウトに `min-h-0` / `max-h-full` / `flex-shrink-0` を追加して高さ制約を末端まで伝搬

- **v1.16.3 リリース**（メインプロセス過負荷によるフリーズ・クラッシュ根本対策）:
  - ログ解析で根本原因を特定：音声のみ ZIP への `getArchiveMetadata`（7za spawn）が秒間 5〜6 回・30 分以上連続呼び出しされメインプロセスをブロック
  - `getArchiveMetadata` に stat ベース LRU キャッシュ（512 件）・in-flight coalesce・p-limit(2) を追加
  - 画像なしアーカイブの判定結果を 60 秒間負キャッシュ
  - `ArchivePreviewSection` の `isArchive` を `useMemo` 化して useEffect 不要再発火を抑制

- **v1.16.2 リリース**（存在しないパスへの外部アプリ起動ブロック・ダブルクリック多重実行防止）
- **v1.16.1 リリース**（ファイル名変更 UX 修正）
- **v1.16.0 リリース**（設定画面タブ再設計・バッジカスタマイズ・UI統一・複数バグ修正）

## Completed Phases
- ✅ Phase 0〜28 完了
- ✅ **v1.15.0 リリース**
- ✅ **v1.16.0 リリース**
- ✅ **v1.16.1 リリース**
- ✅ **v1.16.2 リリース**
- ✅ **v1.16.3 リリース**

## Next Steps
- [ ] 追加表示モード（漫画モード・動画モード）
- [ ] タグカテゴリ表示優先順位付け強化

## Known Issues
なし
