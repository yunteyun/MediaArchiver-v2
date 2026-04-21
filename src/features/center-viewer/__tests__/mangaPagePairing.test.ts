import { describe, expect, it } from 'vitest';
import {
    resolvePagePair,
    stepPage,
    type MangaViewerSettings,
} from '../mangaPagePairing';

const spreadRtlSingle: MangaViewerSettings = {
    pageMode: 'spread',
    bindingDirection: 'rtl',
    firstPageSingle: true,
};
const spreadRtlNoSingle: MangaViewerSettings = {
    pageMode: 'spread',
    bindingDirection: 'rtl',
    firstPageSingle: false,
};
const singleMode: MangaViewerSettings = {
    pageMode: 'single',
    bindingDirection: 'rtl',
    firstPageSingle: true,
};

// ─── resolvePagePair ──────────────────────────────────────────────────────────

describe('resolvePagePair / single モード', () => {
    it('常に secondary=null を返す', () => {
        expect(resolvePagePair(3, 10, singleMode)).toEqual({ primary: 3, secondary: null });
    });
    it('totalCount=0 でも secondary=null', () => {
        expect(resolvePagePair(0, 0, singleMode)).toEqual({ primary: 0, secondary: null });
    });
});

describe('resolvePagePair / spread + firstPageSingle=true', () => {
    it('index=0 は表紙単独', () => {
        expect(resolvePagePair(0, 10, spreadRtlSingle)).toEqual({ primary: 0, secondary: null });
    });
    it('index=1 → ペア [1,2]', () => {
        expect(resolvePagePair(1, 10, spreadRtlSingle)).toEqual({ primary: 1, secondary: 2 });
    });
    it('index=2 → 同じペア [1,2]（偶数は前のペアに丸める）', () => {
        expect(resolvePagePair(2, 10, spreadRtlSingle)).toEqual({ primary: 1, secondary: 2 });
    });
    it('index=3 → ペア [3,4]', () => {
        expect(resolvePagePair(3, 10, spreadRtlSingle)).toEqual({ primary: 3, secondary: 4 });
    });
    it('index=4 → ペア [3,4]', () => {
        expect(resolvePagePair(4, 10, spreadRtlSingle)).toEqual({ primary: 3, secondary: 4 });
    });
    it('最終ページが奇数: secondary=null（単独表示）', () => {
        // totalCount=4: ページ 0,1,2,3 → [0], [1,2], [3]
        expect(resolvePagePair(3, 4, spreadRtlSingle)).toEqual({ primary: 3, secondary: null });
    });
    it('最終ページが偶数: secondary あり', () => {
        // totalCount=5: ページ 0..4 → [0], [1,2], [3,4]
        expect(resolvePagePair(3, 5, spreadRtlSingle)).toEqual({ primary: 3, secondary: 4 });
    });
});

describe('resolvePagePair / spread + firstPageSingle=false', () => {
    it('index=0 → ペア [0,1]', () => {
        expect(resolvePagePair(0, 10, spreadRtlNoSingle)).toEqual({ primary: 0, secondary: 1 });
    });
    it('index=1 → 同じペア [0,1]', () => {
        expect(resolvePagePair(1, 10, spreadRtlNoSingle)).toEqual({ primary: 0, secondary: 1 });
    });
    it('index=2 → ペア [2,3]', () => {
        expect(resolvePagePair(2, 10, spreadRtlNoSingle)).toEqual({ primary: 2, secondary: 3 });
    });
    it('最終が奇数: secondary=null', () => {
        // totalCount=3: [0,1], [2]
        expect(resolvePagePair(2, 3, spreadRtlNoSingle)).toEqual({ primary: 2, secondary: null });
    });
});

// ─── stepPage ────────────────────────────────────────────────────────────────

describe('stepPage / single モード', () => {
    it('next: +1', () => {
        expect(stepPage(3, 'next', 10, singleMode)).toBe(4);
    });
    it('prev: -1', () => {
        expect(stepPage(3, 'prev', 10, singleMode)).toBe(2);
    });
    it('先頭で prev: 0 に留まる', () => {
        expect(stepPage(0, 'prev', 10, singleMode)).toBe(0);
    });
    it('末尾で next: 末尾に留まる', () => {
        expect(stepPage(9, 'next', 10, singleMode)).toBe(9);
    });
});

describe('stepPage / spread + firstPageSingle=true', () => {
    it('index=0(表紙) → next → 1', () => {
        expect(stepPage(0, 'next', 10, spreadRtlSingle)).toBe(1);
    });
    it('index=1 → next → 3', () => {
        expect(stepPage(1, 'next', 10, spreadRtlSingle)).toBe(3);
    });
    it('index=3 → next → 5', () => {
        expect(stepPage(3, 'next', 10, spreadRtlSingle)).toBe(5);
    });
    it('index=1 → prev → 0（表紙へ）', () => {
        expect(stepPage(1, 'prev', 10, spreadRtlSingle)).toBe(0);
    });
    it('index=3 → prev → 1', () => {
        expect(stepPage(3, 'prev', 10, spreadRtlSingle)).toBe(1);
    });
    it('index=0 → prev → 0（先頭に留まる）', () => {
        expect(stepPage(0, 'prev', 10, spreadRtlSingle)).toBe(0);
    });
    it('最終ペア: next → 移動しない', () => {
        // totalCount=5: ページ 0..4 → [0], [1,2], [3,4]。index=3が最終ペア
        expect(stepPage(3, 'next', 5, spreadRtlSingle)).toBe(3);
    });
    it('totalCount=2, index=0 → next → 1', () => {
        expect(stepPage(0, 'next', 2, spreadRtlSingle)).toBe(1);
    });
    it('totalCount=1, index=0 → next → 0（1ページのみ）', () => {
        expect(stepPage(0, 'next', 1, spreadRtlSingle)).toBe(0);
    });
});

describe('stepPage / spread + firstPageSingle=false', () => {
    it('index=0 → next → 2', () => {
        expect(stepPage(0, 'next', 10, spreadRtlNoSingle)).toBe(2);
    });
    it('index=2 → next → 4', () => {
        expect(stepPage(2, 'next', 10, spreadRtlNoSingle)).toBe(4);
    });
    it('index=0 → prev → 0（先頭に留まる）', () => {
        expect(stepPage(0, 'prev', 10, spreadRtlNoSingle)).toBe(0);
    });
    it('index=2 → prev → 0', () => {
        expect(stepPage(2, 'prev', 10, spreadRtlNoSingle)).toBe(0);
    });
    it('最終ペアで next → 移動しない（totalCount=5, index=4）', () => {
        // [0,1],[2,3],[4] → 最終 primary=4, 4+2=6>=5 → 留まる
        expect(stepPage(4, 'next', 5, spreadRtlNoSingle)).toBe(4);
    });
});
