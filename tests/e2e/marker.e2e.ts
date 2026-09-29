import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: marker is CSS-only - verify the muted inline row (icon + words, fit
 * content), the border row, the separator's two pseudo-element rules around
 * a centered label, a spinner sized by the icon slot, the shimmer, the
 * stacked layout, icon-only tones, link / button markers, sizes and RTL - on
 * the real dist/ files.
 */
type Page = import('playwright').Page;
const box = (page: Page, id: string) => page.$eval(`#${id}`, (e) => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; });

await cssSmoke('marker', [
  {
    label: 'default: a muted 13px row sized to its content, icon (16px) before the words; <code> in the foreground',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const s = getComputedStyle(document.getElementById('m-default')!);
        const root = getComputedStyle(document.documentElement);
        return { display: s.display, fs: s.fontSize, color: s.color, muted: root.getPropertyValue('--muted-foreground').trim(), code: getComputedStyle(document.getElementById('m-code')!).color, fg: getComputedStyle(document.body).color };
      });
      assert.deepEqual([r.display, r.fs], ['flex', '13px']);
      assert.notEqual(r.code, r.color, 'code stands out from the muted words');
      const m = await box(page, 'm-default'), col = await box(page, 'col'), i = await box(page, 'm-default-i'), c = await box(page, 'm-default-c');
      assert.ok(m.w < col.w, 'fits its content');
      assert.deepEqual([i.w, i.h], [16, 16]);
      assert.ok(i.r <= c.l, 'icon first');
    },
  },
  {
    label: 'explicit data-variant="default" renders like the default',
    run: async (page) => {
      const r = await page.evaluate(() => ['m-default', 'm-default-explicit'].map((id) => { const s = getComputedStyle(document.getElementById(id)!); return [s.display, s.fontSize, s.color, s.width === 'auto' ? 'x' : 'fit']; }));
      assert.deepEqual(r[0].slice(0, 3), r[1].slice(0, 3));
    },
  },
  {
    label: 'border: full width with a 1px rule under it',
    run: async (page) => {
      const m = await box(page, 'm-border'), col = await box(page, 'col');
      assert.equal(m.w, col.w);
      assert.equal(await page.$eval('#m-border', (e) => getComputedStyle(e).borderBottomWidth), '1px');
    },
  },
  {
    label: 'separator: two 1px pseudo-element rules, the label centered between them',
    run: async (page) => {
      const r = await page.$eval('#m-sep', (e) => [getComputedStyle(e, '::before').height, getComputedStyle(e, '::after').height, getComputedStyle(e, '::before').flexGrow]);
      assert.deepEqual(r, ['1px', '1px', '1']);
      const m = await box(page, 'm-sep'), c = await box(page, 'm-sep-c');
      assert.ok(Math.abs((c.l + c.r) / 2 - (m.l + m.r) / 2) <= 1, 'centered');
    },
  },
  {
    label: 'status: a spinner in the icon slot takes the 1em icon size and keeps spinning',
    run: async (page) => {
      const r = await page.$eval('#m-spin', (e) => { const s = getComputedStyle(e); return [s.width, s.height, s.animationName !== 'none']; });
      assert.deepEqual(r, ['16px', '16px', true]);
    },
  },
  {
    label: 'shimmer: transparent text painted by a clipped, moving gradient',
    run: async (page) => {
      const r = await page.$eval('#m-shimmer-c', (e) => { const s = getComputedStyle(e); return [s.color, s.backgroundClip, s.animationName, /linear-gradient/.test(s.backgroundImage)]; });
      assert.deepEqual(r, ['rgba(0, 0, 0, 0)', 'text', 'marker-shimmer', true]);
    },
  },
  {
    label: 'stacked: icon above the words, centered in the column',
    run: async (page) => {
      const i = await box(page, 'm-stack-i'), c = await box(page, 'm-stack-c'), m = await box(page, 'm-stack'), col = await box(page, 'col');
      assert.ok(i.t < c.t, 'icon above');
      assert.ok(Math.abs((m.l + m.r) / 2 - (col.l + col.r) / 2) <= 1, 'centered');
    },
  },
  {
    label: 'tones color the icon only (five distinct), the words stay muted',
    run: async (page) => {
      const r = await page.evaluate(() => ['success', 'warning', 'info', 'destructive', 'primary'].map((t) => {
        const m = document.getElementById(`t-${t}`)!;
        return [getComputedStyle(m.querySelector('.marker-icon')!).color, getComputedStyle(m.querySelector('.marker-content')!).color];
      }));
      assert.equal(new Set(r.map((x) => x[0])).size, 5);
      assert.equal(new Set(r.map((x) => x[1])).size, 1, 'words share the muted color');
    },
  },
  {
    label: 'link / button markers: no chrome, pointer, underline on hover, focus ring',
    run: async (page) => {
      const r = await page.evaluate(() => ['m-link', 'm-button'].map((id) => { const s = getComputedStyle(document.getElementById(id)!); return [s.cursor, s.borderTopWidth, s.backgroundColor, s.textDecorationLine]; }));
      assert.deepEqual(r, [['pointer', '0px', 'rgba(0, 0, 0, 0)', 'none'], ['pointer', '0px', 'rgba(0, 0, 0, 0)', 'none']]);
      await page.hover('#m-link');
      assert.equal(await page.$eval('#m-link-c', (e) => getComputedStyle(e).textDecorationLine), 'underline');
      await page.focus('#m-link');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.$eval('#m-link', (e) => getComputedStyle(e).outlineStyle), 'solid');
    },
  },
  {
    label: 'sizes: 12 / 13 / 14px',
    run: async (page) => {
      const r = await page.evaluate(() => ['s-sm', 'm-default', 's-lg'].map((id) => getComputedStyle(document.getElementById(id)!).fontSize));
      assert.deepEqual(r, ['12px', '13px', '14px']);
    },
  },
  {
    label: 'RTL: the icon leads on the right',
    run: async (page) => {
      const i = await box(page, 'm-rtl-i'), c = await box(page, 'm-rtl-c');
      assert.ok(i.l >= c.r);
    },
  },
]);
