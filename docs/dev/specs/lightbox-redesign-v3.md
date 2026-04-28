# Lightbox Redesign v3

## ステータス
- **採用中**（v2 は deprecated）
- このドキュメントは中央ビューア（旧 `CenterViewer*` 系・新 `Viewer*` 系）の設計方針を定める
- 矛盾する記述があれば本ドキュメントが優先

## 基本方針（v2 から継承）
- 全画面オーバーレイにしない
- 情報表示と編集は右サイドバーへ寄せる
- メディア表示は中央カラム内だけで完結させる

## v3 で新たに加わる原則
- **ViewerShell はメディア種別を知らない**：種別固有の UI は ViewerStage の配下のみで完結させる
- **モード固有のコントロールはスロット契約で Shell に登録する**：Shell に直接 `if (isVideo)` のような分岐を書かない
- **すべての操作 UI（ボタン・バー・ナビ・ポップオーバー）は共通トークンと共通プリミティブを使う**：色・余白・サイズ・z-index のハード値禁止
- **キーボードハンドラは単一の `useViewerKeyboard()` に集約する**：複数箇所で `window.addEventListener('keydown', ...)` を持たない

## レイアウト
- 左：サイドバー
- 中央：一覧 + 中央カラム内ビューア（`absolute inset-0` で本文エリア全面）
- 右：情報パネル

## 中央カラム内ビューア（`ViewerShell`）

### 構成要素

```
ViewerShell
├── ViewerBackdrop        半透明背景。クリックで閉じる
├── ViewerTopBar          ファイル名 + ✕（モード非依存）
├── ViewerStage           モード dispatch コンテナ
│    └── <Mode>Content    画像 / 音声 / 動画 / 書庫 / 漫画
├── ViewerNavButtons      左右の前後ボタン（モード非依存）
├── ViewerBottomBar       共通アクション（リネーム/移動/ゴミ箱）+ slot 領域
└── ViewerOverlayLayer    ポップオーバーとサイドパネルの絶対配置領域
```

### 禁則
- ViewerShell に `file.type === 'video'` のような分岐を書かない
- ビューア内部に常設の情報パネル / カード / 枠を置かない
- 中央カラム外にはみ出さない（フルスクリーンが必要なケースは OS のフルスクリーン or mpv 独立ウィンドウへ）

## ViewerStage の責務

- `lightboxFile` のメディア種別と `lightboxOpenMode` から表示する `<Mode>Content` を決定する
- `resolveLightboxMediaKind(file)` を再利用して種別解決する
- 旧 `useUIStore.openLightbox()` 内の自動 `archive-manga` 判定は ViewerStage 側へ移譲する

## モードコンテンツ（`<Mode>Content`）

各モードはメディア本体の表示のみを担う。コントロール、ナビ、トップ／ボトムバーは ViewerShell が一括管理する。

モード固有のコントロール（mpv のシークバー、漫画の設定パネル、見どころポップオーバー等）は `useViewerSlots()` 経由で Shell の slot 領域に登録する。

## スロット契約

ViewerShell は以下 3 種類の slot を提供する。各モードは必要な slot だけ宣言的に登録する。

| slot | 用途 | 配置 |
|------|------|------|
| `bottom-action` | ボトムバー右側に追加するアクションボタン | `ViewerBottomBar` の `pointer-events-auto` 領域 |
| `popover` | ボトムバーから生えるポップオーバー（例：見どころ、漫画設定） | `ViewerOverlayLayer` の `bottom-full` ガイド |
| `media-controls` | メディア本体に重ねる薄いコントロールバー（mpv シークバー等） | ステージ最下端に張り付く帯 |

slot は **モード切替時に必ず破棄**される（ファイル ID が変わったら useEffect cleanup で確実に解除する）。

## キーボード仕様

すべてのキー入力は `useViewerKeyboard()` の単一 capture-phase ハンドラで処理する。`window.addEventListener('keydown')` を他の場所で書かない。

### 全モード共通

| キー | アクション | 備考 |
|------|----------|------|
| `Escape` | 閉じる | フォーカスがフォーム要素にある場合は無視 |
| `←` | 前のファイル | モード固有ハンドラに横取りされない場合の既定 |
| `→` | 次のファイル | 同上 |

### モード固有（既定キーを上書きする）

| モード | キー | アクション |
|-------|------|----------|
| 動画 (mpv / HTML5) | `Space` | 再生 / 一時停止 |
| 動画 | `←` / `→` | -10s / +10s シーク |
| 動画 | `↑` / `↓` | ボリューム ±0.05 |
| 動画 | `m` / `M` | ミュート切替 |
| 動画 | `f` / `F` | フルスクリーン切替 |
| 漫画 | `←` / `→` | ページ前後（綴じ方向で意味反転） |
| 漫画 | `PageUp` / `PageDown` | ページ前後（綴じ方向に依存しない常時固定） |
| 書庫詳細 | `←` / `→` | フレーム前後 |
| 書庫詳細 | `Escape` | グリッドへ戻る（`Escape` をモード側でハンドルし、`closeLightbox` には伝播させない） |

### 横取り規約
- モード固有ハンドラが処理したキーは `event.preventDefault()` + `event.stopPropagation()` で確実に停止する
- 共通ハンドラはモード固有ハンドラより**後**に呼ばれるよう capture phase で登録順を保証する
- 入力フォーカスが `INPUT` / `TEXTAREA` / `SELECT` / `contentEditable` にある間はすべてのキーを無視する

## マウス仕様

| 場所 | 動作 | 共通 / 固有 |
|------|------|------------|
| 背景（`ViewerBackdrop`） | クリックで閉じる | 共通 |
| `ViewerNavButtons` | 左右の前後ボタンクリック | 共通（モード問わず常時表示） |
| メディア本体上の左 1/3 | 「前」へ送る | 漫画モード固有 |
| メディア本体上の右 1/3 | 「次」へ送る | 漫画モード固有 |
| ホイール | ページ前後 | 漫画モード固有（180ms スロットル） |

漫画のクリックゾーンは `data-viewer-control="true"` 属性を持つ要素を除外する（`closest()` で判定）。

### 「ホバーで現れるナビボタン」は禁止

旧 Manga の `opacity-0 group-hover:opacity-60` 方式は **v3 で禁止**。前後ナビは Shell の `ViewerNavButtons` に統一し、漫画でも常時表示にする。クリックゾーンは「補助操作」として残してよい。

## デザイントークン

`tailwind.config.cjs` に以下を追加する。すべての viewer コンポーネントは**これらのトークンのみ**を使う。

```js
colors: {
    viewer: {
        backdrop: 'rgba(0, 0, 0, 0.55)',  // ViewerBackdrop の半透明
        surface: '#0b0b0b',               // ボタン・バーの不透明背景
        'surface-soft': 'rgba(0, 0, 0, 0.7)',  // ボトムバーの薄い背景
    },
},
zIndex: {
    'viewer-base': 20,        // ViewerShell ルート
    'viewer-overlay': 30,     // ViewerOverlayLayer
    'viewer-popover': 40,     // bottom-action から生えるポップオーバー
},
```

### 禁則
- `bg-black/55`, `bg-black/40`, `bg-black/60`, `bg-black/80` のようなハード透過値の直書きを禁止
- `z-10`, `z-20`, `z-50` のような直接の z-index 値を禁止（`z-viewer-*` トークンを使う）
- ボタンサイズは `h-9 w-9`（小・✕用）、`h-11 w-11`（中・前後ナビ用）、`px-3 py-1.5 text-xs`（ボトムバー）の 3 種に固定

## ポップオーバーとサイドパネルの位置ルール

- **ポップオーバー**：ボトムバーから生える形のみ許可。`absolute bottom-full mb-2 right-{n}` を使い、Shell の `ViewerOverlayLayer` 内に配置
- **同時に開けるポップオーバーは 1 つだけ**。新しい slot 登録元が現れたら他のポップオーバーは閉じる
- **常設サイドパネル禁止**（旧 Manga 設定パネル方式は撤廃）。設定 UI は `popover` slot で歯車ボタン → ポップオーバーの形に統一

## 責務一覧

| コンポーネント／フック | 責務 |
|----------------------|------|
| `ViewerShell` | レイアウト枠の組み立て。ファイル / モード状態は context 経由で配布 |
| `ViewerStage` | メディア種別の dispatch のみ |
| `<Mode>Content` | メディア本体の表示。固有 UI は slot 経由で Shell に渡す |
| `useViewerContext()` | `lightboxFile` / `currentIndex` / `goToPrevious` / `goToNext` / `closeLightbox` の提供 |
| `useViewerKeyboard()` | 全キー入力の単一エントリ。モードからの追加ハンドラを deps で管理 |
| `useViewerSlots()` | Shell ↔ モードの slot 登録 API |
| `useVideoPlayer()` | mpv / HTML5 の差を吸収する単一 API |
| `useElectronViewerApi()` | viewer 関連の `electronAPI` を集約。テストでの差し替え点 |
| `usePlaybackBookmarks()` | 見どころ機能の `useReducer` ベース状態管理 |

## 後続タスク

- 中央ビューア再設計後は、右サイドバーの再整理（情報・編集導線の統合）を検討する
- 必要に応じてモード非依存のテスト基盤（`@testing-library/react` + viewer harness）を整備する
