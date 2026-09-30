import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';
import { assertLegibleDisabled } from './lib/disabled.ts';

/**
 * Why: textarea is CSS-only - verify the 80px min box with content-based
 * auto-grow (field-sizing), vertical-only resize, disabled dimming + resize
 * lock, and the aria-invalid border recolor.
 */
await cssSmoke('textarea', [
  {
    label: '.textarea is an 80px-min auto-growing box with 8px/12px padding',
    selector: '#ta-default',
    css: { 'min-height': '80px', padding: '8px 12px', 'font-size': '14px', resize: 'vertical', 'field-sizing': 'content' },
  },
  {
    label: ':disabled locks resize',
    selector: '#ta-disabled',
    css: { resize: 'none' },
  },
  {
    label: 'disabled textarea stays legible: full --input border, muted surface + text, not-allowed',
    run: (page) => assertLegibleDisabled(page, { control: '#ta-disabled', tokens: { 'border-top-color': '--input', 'background-color': '--muted', color: '--muted-foreground' } }),
  },
  {
    label: 'aria-invalid recolors the border to destructive',
    distinct: [
      { selector: '#ta-default', prop: 'border-top-color' },
      { selector: '#ta-invalid', prop: 'border-top-color' },
    ],
  },
  {
    label: ':focus swaps the border to the ring color (trusted click-focus)',
    run: async (page) => {
      await page.click('#ta-default');
      await page.waitForTimeout(200); // border-color transitions 150ms
      const [normal, focused] = await page.evaluate(() => {
        const el = document.querySelector<HTMLTextAreaElement>('#ta-default')!;
        const focusedBorder = getComputedStyle(el).borderTopColor;
        el.blur();
        return [getComputedStyle(el).borderTopColor, focusedBorder];
      });
      assert.notEqual(normal, focused, 'focused border uses --ring, distinct from --input');
    },
  },
  {
    label: 'data-rows / data-max-rows: starts two lines tall, grows with its text, stops at four and scrolls',
    run: async (page) => {
      const h = () => page.$eval('#ta-rows', (e) => e.getBoundingClientRect().height);
      const lh = await page.$eval('#ta-rows', (e) => parseFloat(getComputedStyle(e).lineHeight));
      const start = await h();
      assert.ok(Math.abs(start - (2 * lh + 16 + 2)) < 1, `starts at 2 lines: ${start}`);
      await page.fill('#ta-rows', 'a\nb\nc');
      const three = await h();
      assert.ok(three > start + lh * 0.9, `grew a line: ${three}`);
      await page.fill('#ta-rows', 'a\nb\nc\nd\ne\nf\ng\nh');
      const capped = await h();
      assert.ok(Math.abs(capped - (4 * lh + 16 + 2)) < 1, `capped at 4 lines: ${capped}`);
      assert.ok(await page.$eval('#ta-rows', (e) => e.scrollHeight > e.clientHeight), 'scrolls past the limit');
      assert.equal(await page.$eval('#ta-rows', (e) => getComputedStyle(e).resize), 'none');
    },
  },
  {
    label: 'composer: the group frames it, the textarea inside is frameless and grows, focus rings the group',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const g = getComputedStyle(document.getElementById('tg')!);
        const t = getComputedStyle(document.getElementById('tg-text')!);
        return { gBorder: g.borderTopWidth, tBorder: t.borderTopWidth, tBg: t.backgroundColor, resize: t.resize, dir: g.flexDirection };
      });
      assert.deepEqual(r, { gBorder: '1px', tBorder: '0px', tBg: 'rgba(0, 0, 0, 0)', resize: 'none', dir: 'column' });
      const idle = await page.$eval('#tg', (e) => getComputedStyle(e).borderTopColor);
      await page.click('#tg-text');
      await page.waitForTimeout(200);
      assert.notEqual(await page.$eval('#tg', (e) => getComputedStyle(e).borderTopColor), idle, 'the group takes the ring');
      const before = await page.$eval('#tg-text', (e) => e.getBoundingClientRect().height);
      await page.keyboard.type('one\ntwo\nthree');
      assert.ok(await page.$eval('#tg-text', (e) => e.getBoundingClientRect().height) > before, 'grows');
    },
  },
  {
    label: 'composer: chips are a wrapping row of file items; the spacer pushes send to the end; data-dragover marks the drop target',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const list = getComputedStyle(document.getElementById('tg-list')!);
        const send = document.getElementById('tg-send')!.getBoundingClientRect();
        const actions = document.getElementById('tg-actions')!.getBoundingClientRect();
        const g = document.getElementById('tg')!;
        const idle = getComputedStyle(g).borderTopStyle;
        g.setAttribute('data-dragover', '');
        const drag = getComputedStyle(g).borderTopStyle;
        g.removeAttribute('data-dragover');
        return { display: list.display, wrap: list.flexWrap, item: document.getElementById('tg-item')!.getBoundingClientRect().width, sendAtEnd: actions.right - send.right < 12, idle, drag };
      });
      assert.deepEqual([r.display, r.wrap, Math.round(r.item), r.sendAtEnd, r.idle, r.drag], ['flex', 'wrap', 208, true, 'solid', 'dashed']);
    },
  },
  {
    label: 'inline composer: attach, text and send share one bottom-aligned row',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const b = (id: string) => document.getElementById(id)!.getBoundingClientRect();
        return { order: b('tgi-attach').right <= b('tgi-text').left + 1 && b('tgi-text').right <= b('tgi-send').left + 1, bottom: Math.abs(b('tgi-attach').bottom - b('tgi-send').bottom) < 1 };
      });
      assert.deepEqual(r, { order: true, bottom: true });
    },
  },
  {
    label: 'disabled textarea keeps a (painted) corner grip so it still reads as a text field',
    run: async (page) => {
      const bg = await page.$eval('#ta-disabled', (el) => getComputedStyle(el).backgroundImage);
      assert.match(bg, /linear-gradient.*linear-gradient/);
    },
  },
]);
