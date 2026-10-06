import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: the table's look is CSS - the container (overflow + inline-size container
 * for the @container query), collapsed borders, head/cell geometry, and the
 * documented <480px compact query. The data-table half (sorting,
 * selection, reordering, locked columns) is table.js - driven here too.
 */
await cssSmoke('table', [
  {
    label: 'container clips horizontally + is an inline-size container',
    selector: '#tb-wide',
    css: { 'overflow-x': 'auto', 'container-type': 'inline-size', 'border-top-width': '1px' },
  },
  {
    label: 'table collapses borders, aligns to the start (logical), caption sits at the bottom',
    selector: '.table',
    css: { 'border-collapse': 'collapse', 'font-size': '14px', 'text-align': 'start', 'caption-side': 'bottom' },
  },
  {
    label: 'head + cells share the 12px/16px padding; head is muted/500',
    run: async (page) => {
      const geo = await page.evaluate(() => ({
        headPad: getComputedStyle(document.querySelector('.table-head')!).padding,
        cellPad: getComputedStyle(document.querySelector('.table-cell')!).padding,
        headWeight: getComputedStyle(document.querySelector('.table-head')!).fontWeight,
      }));
      assert.equal(geo.headPad, '12px 16px');
      assert.equal(geo.cellPad, '12px 16px');
      assert.equal(geo.headWeight, '500');
    },
  },
  {
    label: '@container <480px swaps to 8px/12px padding + 13px text',
    run: async (page) => {
      const [wide, narrow] = await page.evaluate(() => [
        getComputedStyle(document.querySelector('#tb-wide .table-head')!).padding,
        getComputedStyle(document.querySelector('#tb-narrow .table-cell')!).padding,
      ]);
      assert.equal(wide, '12px 16px', 'wide table keeps default padding');
      assert.equal(narrow, '8px 12px', 'narrow table gets compact padding');
    },
  },
  {
    label: 'a row header (th.table-cell scope=row) is start-aligned and padded like a cell',
    selector: '#tb-rowhead',
    css: { 'text-align': 'start', 'padding-left': '16px', 'font-weight': '500' },
  },
  { label: 'table: density "compact" → padding-top 6px', selector: '#td-compact .table-cell', css: { 'padding-top': '6px' } },
  { label: 'table: density "compact" → padding-left 10px', selector: '#td-compact .table-cell', css: { 'padding-left': '10px' } },
  { label: 'table: density "comfortable" → padding-top 12px', selector: '#td-comfortable .table-cell', css: { 'padding-top': '12px' } },
  { label: 'table: density "comfortable" → padding-left 16px', selector: '#td-comfortable .table-cell', css: { 'padding-left': '16px' } },
  { label: 'table: density "spacious" → padding-top 16px', selector: '#td-spacious .table-cell', css: { 'padding-top': '16px' } },
  { label: 'table: density "spacious" → padding-left 20px', selector: '#td-spacious .table-cell', css: { 'padding-left': '20px' } },

  {
    label: 'headers align to the start (a th would center by default)',
    run: async (page) => {
      await page.waitForFunction(() => document.querySelectorAll('table.table[data-init]').length >= 6);
      const r = await page.evaluate(() => [getComputedStyle(document.getElementById('h-start')!).textAlign, getComputedStyle(document.getElementById('rtl-h')!).textAlign]);
      assert.deepEqual(r, ['start', 'start']);
      const rtl = await page.evaluate(() => { const h = document.getElementById('rtl-c')!; const s = document.createRange(); s.selectNodeContents(h); return Math.round(h.getBoundingClientRect().right - s.getBoundingClientRect().right); });
      assert.equal(rtl, 12, 'RTL: text hugs the right edge (12px: the <480px compact padding)');
    },
  },
  {
    label: 'sort: .table-sort cycles ascending → descending → authored; numbers by data-sort-value, text numeric-aware; aria-sort',
    run: async (page) => {
      const ids = () => page.$$eval('#t-sort tbody tr', (rs) => rs.map((r) => r.id));
      const sortOf = () => page.$$eval('#t-sort thead th', (hs) => hs.map((h) => h.getAttribute('aria-sort')));
      assert.deepEqual(await sortOf(), ['none', 'none', 'none', null], 'sortable headers start at none; plain header untouched');
      await page.click('#t-sort thead th:nth-child(3) .table-sort');
      assert.deepEqual(await ids(), ['r-j', 'r-i2', 'r-i', 'r-o']);
      assert.deepEqual(await sortOf(), ['none', 'none', 'ascending', null]);
      await page.click('#t-sort thead th:nth-child(3) .table-sort');
      assert.deepEqual(await ids(), ['r-o', 'r-i', 'r-i2', 'r-j']);
      await page.click('#t-sort thead th:nth-child(3) .table-sort');
      assert.deepEqual(await ids(), ['r-o', 'r-j', 'r-i', 'r-i2'], 'third click: authored order');
      await page.click('#t-sort thead th:nth-child(1) .table-sort');
      assert.deepEqual(await ids(), ['r-i2', 'r-i', 'r-j', 'r-o'], 'Item 2 before Item 10, case-insensitive');
      await page.click('#t-sort thead th:nth-child(2) .table-sort');
      assert.deepEqual(await ids(), ['r-i', 'r-i2', 'r-o', 'r-j'], 'dates by ISO data-sort-value');
    },
  },
  {
    label: 'sort arrow: muted while unsorted, full strength once sorted',
    run: async (page) => {
      const o = await page.$$eval('#t-sort thead .table-sort', (bs) => bs.map((b) => getComputedStyle(b, '::after').opacity));
      assert.deepEqual(o, ['0.35', '1', '0.35']);
    },
  },
  {
    label: 'select: row boxes set aria-selected; select-all is indeterminate for some, checks all; Shift+click selects a range',
    run: async (page) => {
      const state = () => page.evaluate(() => ({ all: [(document.getElementById('sel-all') as HTMLInputElement).checked, (document.getElementById('sel-all') as HTMLInputElement).indeterminate], rows: [...document.querySelectorAll('#t-sel tbody tr')].map((r) => r.getAttribute('aria-selected')) }));
      await page.click('#s-2 input');
      let s = await state();
      assert.deepEqual(s.all, [false, true]); assert.deepEqual(s.rows, ['false', 'true', 'false', 'false', 'false']);
      await page.click('#s-4 input', { modifiers: ['Shift'] });
      s = await state();
      assert.deepEqual(s.rows, ['false', 'true', 'true', 'true', 'false']);
      await page.click('#sel-all');
      s = await state();
      assert.deepEqual(s.all, [true, false]); assert.ok(s.rows.every((r) => r === 'true'));
      await page.click('#sel-all');
      s = await state();
      assert.ok(s.rows.every((r) => r === 'false'));
      const bg = await page.$eval('#s-1', (r) => { r.querySelector('input')!.click(); return getComputedStyle(r).backgroundColor; });
      assert.notEqual(bg, 'rgba(0, 0, 0, 0)', 'selected rows are tinted');
    },
  },
  {
    label: 'reorder: drag by the grip, Alt+Arrow keys; a manual order clears the sort',
    run: async (page) => {
      const ids = () => page.$$eval('#t-ord tbody tr', (rs) => rs.map((r) => r.id));
      await page.click('#t-ord thead .table-sort');
      await page.click('#t-ord thead .table-sort'); // descending
      assert.deepEqual(await ids(), ['o-D', 'o-C', 'o-B', 'o-A']);
      await page.locator('#o-A .table-handle button').dragTo(page.locator('#o-D'), { targetPosition: { x: 60, y: 4 } });
      assert.deepEqual(await ids(), ['o-A', 'o-D', 'o-C', 'o-B']);
      assert.equal(await page.getAttribute('#t-ord thead th:nth-child(2)', 'aria-sort'), 'none');
      await page.focus('#o-A .table-handle button');
      await page.keyboard.press('Alt+ArrowDown');
      assert.deepEqual(await ids(), ['o-D', 'o-A', 'o-C', 'o-B']);
      assert.equal(await page.evaluate(() => document.activeElement?.closest('tr')?.id), 'o-A');
      assert.equal(await page.$$eval('#t-ord [data-drop], #t-ord [data-dragging], #t-ord tr[draggable="true"]', (l) => l.length), 0);
    },
  },
  {
    label: 'locked columns + sticky header: first two + last stay put while the container scrolls both ways',
    run: async (page) => {
      const before = await page.evaluate(() => [...document.querySelectorAll('#t-lock tbody tr:first-child > *')].map((c) => Math.round(c.getBoundingClientRect().left)));
      await page.$eval('#lock-box', (b) => { b.scrollLeft = 200; b.scrollTop = 60; });
      const r = await page.evaluate(() => {
        const box = document.getElementById('lock-box')!.getBoundingClientRect();
        const cells = [...document.querySelectorAll('#t-lock tbody tr:first-child > *')].map((c) => c.getBoundingClientRect());
        const head = document.querySelector('#t-lock thead th')!.getBoundingClientRect();
        return { c0: Math.round(cells[0].left), c1: Math.round(cells[1].left), w0: Math.round(cells[0].width), last: Math.round(box.right - cells[cells.length - 1].right), head: Math.round(head.top - box.top), off: getComputedStyle(document.getElementById('t-lock')!).getPropertyValue('--table-lock-1') };
      });
      assert.equal(r.c0, before[0], 'checkbox column stays');
      assert.equal(r.c1, before[0] + r.w0, 'region column stays right after it');
      assert.ok(r.last <= 1, 'the last column sticks to the end');
      assert.ok(r.head <= 1, 'the header sticks to the top');
      assert.equal(parseFloat(r.off), r.w0, '--table-lock-1 = the first column width');
    },
  },
  {
    label: 'alignment attributes: center / end / numeric (tabular) / top',
    run: async (page) => {
      const r = await page.evaluate(() => { const cs = (id: string) => getComputedStyle(document.getElementById(id)!); return [cs('c-center').textAlign, cs('c-end').textAlign, cs('c-num').textAlign, cs('c-num').fontVariantNumeric, cs('c-top').verticalAlign]; });
      assert.deepEqual(r, ['center', 'end', 'end', 'tabular-nums', 'top']);
    },
  },
  {
    label: 'actions are always visible; data-actions="quiet" dims them (0.45) until the row is hovered',
    run: async (page) => {
      const op = () => page.$eval('#act-btn', (b) => getComputedStyle(b.closest('.table-actions > *') ?? b).opacity);
      await page.mouse.move(0, 0);
      await page.waitForTimeout(200);
      assert.equal(await op(), '0.45');
      await page.hover('#c-center');
      await page.waitForTimeout(250);
      assert.equal(await op(), '1');
      assert.equal(await page.$eval('#acts', (c) => getComputedStyle(c).textAlign), 'end');
    },
  },
  {
    label: 'mobile: a narrow table swaps the inline buttons for one "more" button + popover menu; a pick closes it',
    run: async (page) => {
      const d = (id: string) => page.$eval('#' + id, (e) => getComputedStyle(e).display);
      assert.equal(await d('n-inline'), 'none');
      assert.notEqual(await d('n-more-wrap'), 'none');
      assert.notEqual(await d('w-inline'), 'none', 'wide table: inline buttons');
      assert.equal(await d('w-more-wrap'), 'none');
      await page.click('#n-more');
      const open = await page.evaluate(() => { const m = document.getElementById('n-menu')!; const b = document.getElementById('n-more')!.getBoundingClientRect(); const r = m.getBoundingClientRect(); return { open: m.matches(':popover-open'), below: r.top >= b.bottom - 1, right: Math.round(r.right - b.right) }; });
      assert.deepEqual(open, { open: true, below: true, right: 0 }, 'anchored under its button, end-aligned');
      await page.click('#n-item');
      assert.equal(await page.$eval('#n-menu', (m) => m.matches(':popover-open')), false);
    },
  },
  {
    label: 'empty state: one cell spans every column, centered icon + text + action',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const c = document.getElementById('empty-cell') as HTMLTableCellElement;
        const tb = c.closest('table')!.getBoundingClientRect();
        const cr = c.getBoundingClientRect();
        const b = document.getElementById('empty-btn')!.getBoundingClientRect();
        return { span: c.colSpan, full: Math.round(tb.width - cr.width) <= 1, align: getComputedStyle(c).textAlign, pad: getComputedStyle(c).paddingTop, centered: Math.abs((b.left + b.right) / 2 - (cr.left + cr.right) / 2) < 1 };
      });
      assert.deepEqual(r, { span: 3, full: true, align: 'center', pad: '40px', centered: true });
    },
  },
  {
    label: 'a dropdown button straight in the actions cell anchors its menu under it; a pick closes it',
    run: async (page) => {
      await page.click('#dd-btn');
      const r = await page.evaluate(() => { const b = document.getElementById('dd-btn')!.getBoundingClientRect(); const m = document.getElementById('dd-menu')!; const mr = m.getBoundingClientRect(); return { open: m.matches(':popover-open'), below: mr.top >= b.bottom - 1, right: Math.round(mr.right - b.right) }; });
      assert.deepEqual(r, { open: true, below: true, right: 0 });
      await page.click('#dd-item');
      assert.equal(await page.$eval('#dd-menu', (m) => m.matches(':popover-open')), false);
    },
  },
  {
    label: 'text variants: truncate (one line, ellipsis), sub line, 2-line clamp, mono nowrap, muted',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const cs = (id: string) => getComputedStyle(document.getElementById(id)!);
        const tr = document.getElementById('trunc')!;
        const cl = document.getElementById('clamp')!;
        const lh = parseFloat(getComputedStyle(cl).lineHeight) || 20;
        return { trunc: [cs('trunc').textOverflow, tr.scrollWidth > tr.clientWidth], sub: cs('sub').display, clampLines: Math.round(cl.getBoundingClientRect().height / lh), mono: [cs('mono').whiteSpace, /mono/i.test(cs('mono').fontFamily)], muted: cs('muted').color !== getComputedStyle(document.body).color };
      });
      assert.deepEqual(r.trunc, ['ellipsis', true]);
      assert.equal(r.sub, 'block');
      assert.equal(r.clampLines, 2);
      assert.deepEqual(r.mono, ['nowrap', true]);
      assert.ok(r.muted);
    },
  },
  {
    label: 'a plain link in a cell takes the text colour with a soft underline - not the browser blue',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const a = getComputedStyle(document.getElementById('cell-link')!);
        const cell = getComputedStyle(document.getElementById('cell-link')!.closest('.table-cell')!);
        return { color: a.color === cell.color, line: a.textDecorationLine, weight: a.fontWeight, deco: a.textDecorationColor !== a.color };
      });
      assert.deepEqual(r, { color: true, line: 'underline', weight: '500', deco: true });
    },
  },
  {
    label: "state API: setState('sorted' | 'selected' | 'default'), getState, unknown throws, registry",
    run: async (page) => {
      const r = await page.evaluate(() => {
        const t = document.getElementById('t-sel') as HTMLElement & { api: { setState(n: string, c?: object): void; getState(): { name: string; config: { selected: number[]; sort: unknown } } } };
        t.api.setState('selected', { rows: [0, 2] });
        const sel = t.api.getState();
        t.api.setState('sorted', { column: 1, direction: 'descending' });
        const sorted = [t.api.getState(), [...document.querySelectorAll('#t-sel tbody tr')].map((r) => r.id)];
        t.api.setState('default');
        const def = [t.api.getState(), [...document.querySelectorAll('#t-sel tbody tr')].map((r) => r.id)];
        let err = '';
        try { t.api.setState('nope'); } catch (e) { err = String(e); }
        const g = globalThis as unknown as { df$: { shadcn: { tableStates?: string[]; tableApi?: object } } };
        return { sel, sorted, def, err, states: g.df$.shadcn.tableStates, api: !!g.df$.shadcn.tableApi };
      });
      assert.equal(r.sel.name, 'selected'); assert.deepEqual(r.sel.config.selected, [0, 2]);
      assert.deepEqual((r.sorted[0] as unknown as { config: { sort: unknown } }).config.sort, { column: 1, direction: 'descending' });
      assert.deepEqual(r.sorted[1], ['s-5', 's-4', 's-3', 's-2', 's-1']);
      assert.deepEqual((r.def[0] as unknown as { config: { selected: number[] } }).config.selected, []);
      assert.deepEqual(r.def[1], ['s-1', 's-2', 's-3', 's-4', 's-5']);
      assert.ok(r.err.includes('unknown state'));
      assert.deepEqual(r.states, ['default', 'sorted', 'selected']); assert.ok(r.api);
    },
  },
  {
    label: 'render(): reproduces the authored markup 1:1 and every state',
    run: async (page) => {
      await assertRenderContract(page, 'table.table[id]', ['default','sorted','selected']);
    },
  },
]);
