# ADR-001: 状態管理にZustandを採用

**Status**: Accepted
**Date**: 2026-01-31

## Context
v1ではReactの組み込み状態管理(useState/useContext)を使用していたが、以下の問題が発生：
- Propsのバケツリレーによるコード複雑化
- 不要な再描画によるパフォーマンス低下（グリッドの点滅問題）
- 状態の分散による追跡困難

## Decision
状態管理ライブラリとしてZustandを採用する。

## Rationale
- **シンプルなAPI**: Reduxと比較してボイラープレートが少ない
- **セレクタによる再描画制御**: 必要な状態のみ購読可能
- **React外からもアクセス可能**: Electronメインプロセスとの連携に有利
- **TypeScript親和性**: 型推論が優秀

### 代替案との比較
| ライブラリ | Pros | Cons |
|-----------|------|------|
| Redux Toolkit | 実績豊富、DevTools | ボイラープレート多い |
| Jotai | アトミック、柔軟 | 大きい状態の管理が煩雑 |
| **Zustand** | シンプル、高速 | 採用 |

## Consequences
- ストアは機能別に分割（useFileStore, useUIStore, useSettingsStore）
- コンポーネントはセレクタ形式でのみ状態を取得
- React.memoとの組み合わせで再描画を最小化
