# ADR-002: ファイルカード既存 4 モードの再調整と WhiteBrowser 体験の再解釈

**Status**: Proposed
**Date**: 2026-04-20

## Context

フェーズ A〜C で `LayoutPreset` 軸の除去・`cardDirection` 分岐解消・`FileCard.tsx` の責務分割が完了し、表示プリセットは **DisplayMode × ThumbnailPresentation** の 2 軸に正規化された。

[docs/archive/file_card_表示設計に関する将来要望まとめ.md](../../docs/archive/file_card_表示設計に関する将来要望まとめ.md) には「一覧上で内容が分かる UI」の設計思想が記録されており、**表示モード（カード構造）とサムネイル表現（アスペクト比・ホバー挙動）を独立した軸として設計する**ことが中核である。

既存 4 モードの現状は以下の通り：

| モード | label | direction | thumbnailPresentation | cardWidth × totalHeight |
|---|---|---|---|---|
| manga | 縦型カード（旧: 縦型） | vertical | modeDefault (2/3) | 220 × 406 |
| video | 動画（ワイド） | vertical | modeDefault (25/16) | 265 × 246 |
| whiteBrowser | 詳細表示 | horizontal | square (1/1) | 420 × 360 |
| mangaDetailed | 縦サムネ + 詳細パネル（旧: 詳細表示（縦）） | horizontal | square (2/3 既定) | 360 × 360 |

archive 要望との突き合わせにより、以下のギャップが明確になった：

- **論点 1**: サムネイル表現と表示モードの独立性は 2 軸構成として確立されているが、ユーザーがモード毎のアスペクト比をオーバーライドする UI 導線がない
- **論点 2**: WhiteBrowser 要望の中核「ホバー時マウス位置連動のコマ送り」が未実装（現状は動画・GIF・archive フリップブックが主対象）
- **論点 3**: `manga` と `mangaDetailed` のラベルが不明瞭（「縦型」「詳細表示（縦）」は初見で区別しにくい）
- **論点 4**: `video` モードの duration バッジはサムネ右下に実装済みだが、背景 `bg-black/70` × `text-xs` で視認性がやや弱い。解像度・codec 等の追加メタ情報は未実装
- **論点 5**: ホバー挙動（scrub / flipbook / video 再生）は全モード共通であり、WhiteBrowser のコマ送りを実装する際にモード毎挙動の設計判断が必要

## Decision

各論点に対して以下の方針を採用する：

- **[論点 1]** サムネイル表現オーバーライドの UI は今回スコープ外とする。ただし、2 軸構成（DisplayMode × ThumbnailPresentation）の独立性を壊す変更は禁止し、将来的なオーバーライド UI 追加を妨げないよう留意する。
- **[論点 2]** WhiteBrowser モードのコマ送り体験は **PoC（技術的実現性検証）を先行**させる。実装アプローチの候補は「archive プレビューフレームをホバー時のマウス X 座標に連動させてフレーム index を決定する」方式。PoC 結果を受けて別計画（フェーズ D-2 以降）で詳細設計を行う。
- **[論点 3]** 4 モードのラベル・アイコン・menuOrder を見直す。ラベル変更は小さなプリセット修正のみであり、フェーズ D-1 としてまず着手する。
- **[論点 4]** 既存の duration バッジ（サムネ右下）の視認性を強化（背景 `bg-black/70`→`bg-black/85` + `font-semibold` 追加）する。解像度・codec 等の新規メタバッジ追加は保留。
- **[論点 5]** ホバー挙動のモード毎プリセット化は保留する。WhiteBrowser コマ送りの PoC 結果を見てから設計判断を行う（フェーズ D-2 以降）。

## Rationale

- archive 要望を一気に追うより、**既存 UX を壊さず体験品質を段階的に底上げする**アプローチを優先する
- WhiteBrowser コマ送りは技術的に未検証な部分が残るため、PoC 先行によりリスクを早期に評価する
- ラベル改善と duration バッジ視認性調整は変更コストが低く効果が大きいため、最初の実装フェーズ（D-1）に着手する
- 論点 1・5 を保留にすることで、誤った設計をプロダクトコードに焼き付けるリスクを回避する

## Consequences

- フェーズ D の作業は以下のサブフェーズに分割される：
  - **フェーズ D-1**: ラベル整理 + video duration バッジ（低コスト・高効果）
  - **フェーズ D-2**: WhiteBrowser コマ送り PoC → 結果に応じて実装計画を策定
  - **フェーズ D-3 以降**: ホバー挙動のモード別プリセット化 / サムネイル表現オーバーライド UI（優先度未確定）
- `manga`/`mangaDetailed` のラベル変更は persistされたユーザー設定に影響しない（displayMode 文字列自体は変更しない）
- duration バッジ追加は `FileCardInfoDetailed.tsx` と `video.ts` プリセットへの小変更で済む想定

## Alternatives Considered

- **新規モード追加による差別化**: ROADMAP に記載されていたが、ユーザー合意により「既存モードの調整・改善」にスコープを変更した。新モードを追加するより現行モードの品質を高める方が優先度が高い。
- **モード毎の完全カスタマイズ UI（アスペクト比・ホバー挙動を設定画面で個別選択）**: ユーザー体験の複雑化につながるため、まず固定プリセットの改善を行い、需要が明確になった段階で検討する。
- **WhiteBrowser コマ送りをフェーズ D-1 で一気に実装**: マウス位置連動のフレーム切替は `useFileCardHover.ts` への非自明な拡張であり、パフォーマンス・フレーム取得元（archive フレーム vs 動画キャプチャ等）の不確定要素が残る。PoC 先行を採用する。
