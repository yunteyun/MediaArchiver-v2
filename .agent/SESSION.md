# Current Session Status

**Last Updated**: 2026-04-16

- **Current Focus**: ファイル名変更ダイアログの UX 改善
- **Current Status**: 修正完了・コミット待ち。

## Recent Achievements

- **ファイル名変更ダイアログの UX 改善**:
  - 起動時の自動フォーカス・全選択を削除（フォーカスなし状態で開くように変更）。
  - `closeOnOverlayClick={false}` を追加し、ウィンドウ外クリックで誤って閉じる問題を解消。

- **v1.16.0 リリース**:
  - 設定画面タブ再設計（4カテゴリ＋サブタブ）・バッジカスタマイズ機能・UI統一・複数バグ修正。
  - リリースビルド・GitHub Release 作成・タグ付け完了。

- **リリース前精査（バグ修正・デッドコード削除）**:
  - `setFolderScanFileTypeOverride` / `clearFolderScanFileTypeOverrides` のスキャン設定消失バグを修正。
  - SettingsModal 未使用 subscription 削除、colors.ts 未使用定数削除、noop replace 削除。

## Completed Phases
- ✅ Phase 0〜28: 詳細は過去の SESSION.md を参照
- ✅ **v1.15.0 リリース**
- ✅ **v1.16.0 リリース**

## Next Steps
- [ ] v1.16.1 リリース（ファイル名変更 UX 修正）
- [ ] 追加表示モード（漫画モード・動画モード）
- [ ] タグカテゴリ表示優先順位付け強化

## Known Issues
なし
