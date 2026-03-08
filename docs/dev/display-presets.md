# Display Presets

一覧カードの表示プリセットは、設定画面の「表示プリセットフォルダを開く」から開けるフォルダ内の JSON で追加できる。

## 基本仕様

- 配置先: アプリの `display-presets` フォルダ
- 形式: `*.json`
- built-in の `id` と同名の preset は読み込まれない
- `extends` には built-in preset を指定する
- 追加後は設定画面の「再読込」で反映できる
- 初回作成時に `sample-whitebrowser-contain.json` と `whitebrowser-balanced.json` を自動生成する
- 初回作成時に `compact-dense.json` も自動生成する
- 未編集の `compact-dense.json` はアプリ更新時に最新サンプルへ自動調整される
- 無効な値は警告付きで読み飛ばし、設定画面の「表示プリセット」欄に一覧表示する

## `extends` に指定できる built-in

- `compact`
- `standard`
- `standardLarge`
- `video`
- `whiteBrowser`
- `mangaDetailed`
- `manga`

## サンプル

```json
{
  "id": "my-whitebrowser-contain",
  "extends": "whiteBrowser",
  "label": "My WhiteBrowser Contain",
  "menuOrder": 47,
  "thumbnailPresentation": "contain",
  "layout": {
    "cardWidth": 500,
    "thumbnailHeight": 210,
    "infoAreaHeight": 210,
    "totalHeight": 380
  },
  "tagSummaryUi": {
    "visibleCount": 12,
    "chipMaxWidthClass": "max-w-[120px]"
  },
  "detailedInfoUi": {
    "folderBadgeMaxWidthClass": "max-w-[160px]",
    "tagSummaryVisibleCount": 12
  }
}
```

## 主な上書き項目

- ルート
  - `id`
  - `extends`
  - `label`
  - `menuOrder`
  - `thumbnailPresentation`
  - `iconKey`
  - `cardGrowMax`
  - `infoVariant`
  - `cardDirection`
  - `horizontalThumbnailAspectRatio`
  - `hideThumbnailBadges`
- `layout`
  - `aspectRatio`
  - `cardWidth`
  - `thumbnailHeight`
  - `infoAreaHeight`
  - `totalHeight`
- `tagSummaryUi`
  - `visibleCount`
  - `chipPaddingClass`
  - `chipTextClass`
  - `chipFontWeightClass`
  - `chipRadiusClass`
  - `chipMaxWidthClass`
  - `rowGapClass`
  - `rowLayoutClass`
- `compactInfoUi`
  - `containerClass`
  - `titleClass`
  - `metaRowClass`
  - `fileSizeClass`
- `detailedInfoUi`
  - `detailedPanelBadgeKeys`
  - `isBadgeMetaMode`
  - `containerClass`
  - `titleClass`
  - `metaLineClass`
  - `bottomRowClass`
  - `standaloneFileSizeClass`
  - `fallbackTagSummaryVisibleCount`
  - `folderBadgeMaxWidthClass`
  - `tagSummaryVisibleCount`

## 主な数値制限

- `menuOrder`: `0`〜`999`
- `cardGrowMax`: `0`〜`240`
- `layout.cardWidth`: `140`〜`720`
- `layout.thumbnailHeight`: `96`〜`720`
- `layout.infoAreaHeight`: `40`〜`480`
- `layout.totalHeight`: `140`〜`1200`
- `tagSummaryUi.visibleCount`: `1`〜`30`
- `detailedInfoUi.fallbackTagSummaryVisibleCount`: `1`〜`30`
- `detailedInfoUi.tagSummaryVisibleCount`: `1`〜`30`
