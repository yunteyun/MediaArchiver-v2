# 自動整理 v1 仕様ドラフト

## 目的
- ファイル一覧で後から手作業している「移動先の振り分け」を、条件ルールで再現しやすくする。
- いきなり完全自動実行には進まず、`Dry Run -> 実行確認 -> 適用` の順で安全に導入する。
- 既存のスマートフォルダ条件、ファイル移動処理、プロファイル分離を再利用し、v1 を最小構成で成立させる。

## このテーマがマルチエージェント向きな理由
- `renderer / preload / main / service / database / docs` をまたぐ。
- 条件モデル、実行モデル、誤操作防止、回帰確認の4軸を並行で詰める必要がある。
- 仕様未確定のまま実装を始めると、UI と IPC 契約が先にぶれやすい。

## 既存資産で再利用するもの
- スマートフォルダの条件モデル
  - `folderSelection`
  - `textConditions`
  - `tags`
  - `ratings`
  - `types`
- ファイル移動
  - `electron/services/fileOperationService.ts`
  - `electron/ipc/file.ts`
- フォルダ一覧 / フォルダ選択 UI
  - `src/components/MoveFolderDialog.tsx`
  - `src/components/FolderTree.tsx`
- プロファイル単位の保存
  - `profile_settings`
  - `electron/services/smartFolderService.ts`
- 実行履歴の土台
  - `electron/services/activityLogService.ts`

## v1 スコープ

### 追加すること
- プロファイル単位で「整理ルール」を保存する。
- ルール条件に一致したファイルを、登録済みフォルダへ一括移動する。
- 実行前に `Dry Run` で対象件数と対象ファイル一覧を確認する。
- 実行時は確認ダイアログを必須にする。
- 実行結果を活動ログまたは専用履歴として残す。

### v1 で入れないこと
- 常時監視やスキャン完了後の自動実行
- 複数アクション連鎖
- 条件グループのネスト（`(A OR B) AND C`）
- 元に戻す完全ロールバック
- 登録外フォルダへの出力

## 方針
- v1 の「自動」はルール判定を指し、実行トリガーは手動に限定する。
- まずは `移動のみ` を成立させ、その後のリネーム追加も同じ確認フローへ載せる。
- 条件モデルはスマートフォルダと寄せ、別々の判定ロジックを増やさない。

## v1.1 追記
- `手動実行 + Dry Run 必須` は維持したまま、アクションに `リネーム` を追加する。
- リネームは拡張子を維持し、テンプレートはベース名だけを組み替える。
- v1.1 の使用可能トークンは `"{name}"` `"{folder}"` `"{type}"` に限定する。
- `移動のみ` `リネームのみ` `移動 + リネーム` を同じ Dry Run / Apply で扱う。
- rename 実処理は既存の手動リネームと同じ妥当性検証・同名衝突判定を使う。
- `連番` `日付フォーマット` `任意拡張子変更` は入れない。

## ルールモデル案

```ts
type AutoOrganizeConditionV1 = {
  folderSelection: string | null;
  textConditions: Array<{
    text: string;
    target: 'fileName' | 'folderName';
  }>;
  tags: {
    ids: string[];
    mode: 'AND' | 'OR';
  };
  ratings: Record<string, { min?: number; max?: number }>;
  types: Array<'video' | 'image' | 'archive' | 'audio'>;
};

type AutoOrganizeActionV1 = {
  move: {
    enabled: boolean;
    targetFolderId: string;
  };
  rename: {
    enabled: boolean;
    template: string;
  };
};

type AutoOrganizeRuleV1 = {
  id: string;
  name: string;
  enabled: boolean;
  condition: AutoOrganizeConditionV1;
  action: AutoOrganizeActionV1;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};
```

## 保存モデル案
- 保存先は `profile_settings`
- key: `auto_organize_rules_v1`

```ts
type AutoOrganizeRuleStoreV1 = {
  version: 1;
  items: AutoOrganizeRuleV1[];
};
```

## 実行モデル案

### Dry Run
- 対象ルールを1件または複数選択して実行できる。
- 出力内容
  - 対象件数
  - ルールごとのヒット件数
  - 各ファイルの `現在パス -> 移動先パス`
  - 競合件数（同名ファイルあり、移動先不正、対象0件）

### Apply
- `Dry Run` 結果を見た後だけ実行可能にする。
- 実行中は対象ファイルを順次移動し、DB の `path` と `root_folder_id` を更新する。
- 失敗はファイル単位で集計し、成功件数 / 失敗件数 / スキップ件数を返す。

## 衝突ルール
- v1 では「同名ファイルが移動先にある場合は失敗」で統一する。
- 1ファイルが複数ルールに一致した場合は、`sortOrder` が小さいものを優先する。
- 実行対象に現在の移動先フォルダ配下ファイルが含まれていても、結果パスが同じならスキップ扱いにする。

## UI 方針
- 管理導線は設定画面の `管理` 系タブに追加する。
- ルール一覧で以下を扱う
  - 有効 / 無効
  - 名前
  - 対象条件の要約
  - 移動先フォルダ
  - `Dry Run`
  - 編集 / 複製 / 削除
- `Dry Run` ダイアログでは対象件数と競合を先に見せ、ファイル一覧は必要時に展開する。

## 実装ステップ
1. 条件モデルをスマートフォルダと共有できる形に整理する
2. `autoOrganizeService` を追加し、ルール CRUD / Dry Run / Apply を実装する
3. preload / IPC / renderer 型を追加する
4. 設定画面にルール一覧とエディタを追加する
5. `Dry Run` ダイアログと実行確認を追加する
6. 活動ログまたは専用履歴に結果記録を追加する

## 受け入れ条件
- ルールを保存すると再起動後も残る
- `Dry Run` の件数と `Apply` の実行件数が一致する
- 同名ファイル衝突がある場合、適用前に件数を把握できる
- ルール未一致ファイルは変更されない
- プロファイル A のルールがプロファイル B に出ない

## マルチエージェント分担案

### 調査役
- スマートフォルダ条件モデルと自動整理条件モデルの共有案を整理する
- 既存の移動・リネーム・活動ログの再利用範囲を確認する
- UI 配置候補と既存設定画面への影響を整理する

### 実装役A
- `main / service / IPC` を担当する
- ルール保存、Dry Run、Apply、競合判定、結果集計を実装する

### 実装役B
- `renderer` を担当する
- ルール一覧、エディタ、Dry Run ダイアログ、確認導線を実装する

### 検証役
- `Dry Run -> Apply` の一致確認
- 同名衝突、対象0件、複数ルール一致、プロファイル切替を重点確認する
- `docs/dev/operations/回帰確認チェックリスト.md` の既存導線影響も点検する

## 着手順
1. 調査役が関連ファイルと共有可能な条件モデルを確定する
2. 親エージェントが `v1 = 手動実行 + Dry Run + 移動のみ` を完了条件として固定する
3. 実装役Aが IPC 契約と service を作る
4. 契約確定後に実装役Bが UI を載せる
5. 検証役が競合ケースを review 形式で洗う

## 将来拡張
- ファイル名リネーム
- スキャン完了後の自動実行
- 除外ルール、停止条件、時間帯制御
- 実行履歴からの部分再実行
- 元に戻す補助
