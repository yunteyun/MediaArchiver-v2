# スマートフォルダ v1 仕様ドラフト

## 目的
- よく使う絞り込み条件を「名前付きで保存」して、ワンクリックで再適用できるようにする。
- v1 は学習コストを抑えるため、`ルールビルダー型 + 保存検索型` の最小構成で開始する。

## 採用方式
- 方式1: ルールビルダー型（条件をGUIで設定）
- 方式2: 保存検索型（現在の検索/フィルター状態を保存）

## v1 スコープ
- 追加すること
  - 現在の絞り込み条件をスマートフォルダとして保存
  - 左サイドバーに「スマートフォルダ」セクションを追加
  - スマートフォルダクリックで条件を一括適用
  - 作成/名前変更/削除
- v1 で入れないこと
  - 条件グループ（`(A OR B) AND C`）
  - 階層スマートフォルダ
  - 自動アクション連動（自動タグ付け/移動）
  - スナップショット固定

## 条件モデル（v1）
v1 は既存UIで実際に使っている条件に合わせる。

- `folderSelection`
  - 現在のフォルダ選択（`__all__` / ドライブ / 登録フォルダ / 仮想フォルダ）
- `text`
  - ファイル名検索文字列（`searchQuery`）
- `tags`
  - 選択タグID一覧
  - タグ条件モード（`AND` / `OR`）
- `ratings`
  - 評価軸ごとの `min/max`

内部表現（案）:

```ts
type SmartFolderConditionV1 = {
  folderSelection: string | null;
  text: string;
  tags: {
    ids: string[];
    mode: 'AND' | 'OR';
  };
  ratings: Record<string, { min?: number; max?: number }>;
};
```

## 保存モデル（案）
`profile_settings` に JSON で保存し、プロファイルごとに分離する。

- key: `smart_folders_v1`
- value(JSON):

```ts
type SmartFolderV1 = {
  id: string;
  name: string;
  condition: SmartFolderConditionV1;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

type SmartFolderStoreV1 = {
  version: 1;
  items: SmartFolderV1[];
};
```

## UI 仕様（v1）
- 左サイドバー
  - 新セクション: `スマートフォルダ`
  - 各行: 名前、選択状態、右クリックメニュー（名前変更/削除）
  - 上部に `+ 保存` ボタン（現在条件を保存）
- 保存フロー
  - ボタン押下 → 名前入力ダイアログ → 保存
  - 初期名例: `条件 2026-03-07 10:30`
- 適用フロー
  - クリック時に以下を順に反映
    - `currentFolderId`
    - `searchQuery`
    - `selectedTagIds` / `filterMode`
    - `ratingFilter`

## 実装ステップ（v1）
1. Electron側サービス追加
- `smartFolderService.ts` を追加し、`profile_settings` へ CRUD 実装

2. IPC追加
- `smartFolder:getAll/create/update/delete/apply` を追加

3. Rendererストア追加
- `useSmartFolderStore.ts` を追加
- 一覧管理、作成/更新/削除、適用を保持

4. Sidebar統合
- 「スマートフォルダ」セクションを追加
- 保存ボタンと一覧描画を実装

5. 回帰確認
- 既存のフォルダ選択/タグ/評価/検索が壊れないこと
- プロファイル切替時にスマートフォルダが分離されること

## 受け入れ条件（v1）
- 条件保存後、再起動してもスマートフォルダ一覧が残る
- クリックで保存時と同じ絞り込み結果になる
- 名前変更/削除が即時反映される
- プロファイルAで作成したスマートフォルダがプロファイルBに出ない

## 将来拡張（v2以降）
- 条件グループ（AND/ORネスト）
- 条件項目追加（拡張子、サイズ、更新日、メタデータ）
- テンプレート（未評価、最近追加、重複候補）
- スナップショット保存
