import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: swap is CSS-only — the shipped contract is swap.css itself, and every
 * state axis (checked / indeterminate / data-active / disabled) is expressed
 * purely as a selector. This asserts the base geometry, that each axis really
 * selects the face it claims, that both animated variants apply their
 * rotation, and that a real click through the label flips the faces. The
 * component declares only the 'default' State API state (no .js).
 */
await cssSmoke('swap', [
  {
    label: "swap.css applies base geometry (inline-grid stack, medium size) — 'default' state",
    selector: '#sw-default',
    css: {
      display: 'inline-grid',
      'min-width': '36px',
      'min-height': '36px',
      'font-size': '14px',
      cursor: 'pointer',
    },
  },
  {
    label: 'the checkbox is visually hidden but stretched over the whole control',
    selector: '#sw-default-input',
    css: { opacity: '0', appearance: 'none' },
  },
  {
    label: 'faces share one grid cell and are click-through',
    selector: '#sw-default .swap-on',
    css: { 'grid-area': '1 / 1', 'pointer-events': 'none' },
  },
  {
    label: 'unchecked shows .swap-off, hides .swap-on',
    run: async (page) => {
      assert.equal(await opacity(page, '#sw-default .swap-off'), '1');
      assert.equal(await opacity(page, '#sw-default .swap-on'), '0');
    },
  },
  {
    label: ':checked shows .swap-on, hides .swap-off',
    run: async (page) => {
      assert.equal(await opacity(page, '#sw-checked .swap-on'), '1');
      assert.equal(await opacity(page, '#sw-checked .swap-off'), '0');
    },
  },
  {
    label: ':indeterminate shows .swap-indeterminate only',
    run: async (page) => {
      assert.equal(await opacity(page, '#sw-indeterminate .swap-indeterminate'), '1');
      assert.equal(await opacity(page, '#sw-indeterminate .swap-off'), '0');
      assert.equal(await opacity(page, '#sw-indeterminate .swap-on'), '0');
    },
  },
  {
    label: 'data-active forces the on face without a checked checkbox',
    run: async (page) => {
      assert.equal(await page.$eval('#sw-active input', (el: HTMLInputElement) => el.checked), false);
      assert.equal(await opacity(page, '#sw-active .swap-on'), '1');
      assert.equal(await opacity(page, '#sw-active .swap-off'), '0');
    },
  },
  {
    label: 'data-variant="rotate" parks the on face at -45deg and swings it to 0 when checked',
    run: async (page) => {
      assert.match(await prop(page, '#sw-rotate .swap-on', 'rotate'), /-45deg/);
      assert.equal(await prop(page, '#sw-rotate .swap-off', 'rotate'), 'none');
      assert.equal(await prop(page, '#sw-rotate-on .swap-on', 'rotate'), '0deg');
      assert.match(await prop(page, '#sw-rotate-on .swap-off', 'rotate'), /45deg/);
    },
  },
  {
    label: 'data-variant="flip" rotates the faces around the Y axis',
    run: async (page) => {
      assert.match(await prop(page, '#sw-flip .swap-on', 'rotate'), /180deg/);
      assert.match(await prop(page, '#sw-flip-on .swap-off', 'rotate'), /180deg/);
      assert.equal(await prop(page, '#sw-flip .swap-on', 'backface-visibility'), 'hidden');
      assert.equal(await prop(page, '#sw-flip', 'perspective'), '640px');
    },
  },
  {
    label: 'icon faces get the default 20px icon sizing',
    selector: '#sw-icon .swap-off svg',
    css: { width: '20px', height: '20px' },
  },
  {
    label: 'the three sizes have distinct minimum boxes and type scales',
    distinct: [
      { selector: '#sw-sm', prop: 'min-width' },
      { selector: '#sw-md', prop: 'min-width' },
      { selector: '#sw-lg', prop: 'min-width' },
    ],
  },
  {
    label: 'data-size="sm" / "lg" set their documented floors',
    run: async (page) => {
      assert.equal(await prop(page, '#sw-sm', 'min-width'), '32px');
      assert.equal(await prop(page, '#sw-sm', 'font-size'), '12px');
      assert.equal(await prop(page, '#sw-lg', 'min-width'), '44px');
      assert.equal(await prop(page, '#sw-lg', 'font-size'), '18px');
    },
  },
  {
    label: 'a disabled checkbox dims the label and blocks pointer events',
    selector: '#sw-disabled',
    css: { opacity: '0.5', 'pointer-events': 'none' },
  },
  {
    label: 'hovering tints the control with the accent token',
    run: async (page) => {
      const idle = await prop(page, '#sw-md', 'background-color');
      await page.hover('#sw-md');
      const hovered = await prop(page, '#sw-md', 'background-color');
      assert.notEqual(hovered, idle, `hover background did not change (${idle})`);
      await page.mouse.move(0, 0);
    },
  },
  {
    label: 'keyboard focus on the checkbox draws the ring on the label',
    run: async (page) => {
      await page.focus('#sw-default-input');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await prop(page, '#sw-default', 'outline-width'), '2px');
      await page.$eval('#sw-default-input', (el: HTMLInputElement) => el.blur());
    },
  },
  {
    label: 'clicking the label toggles the checkbox and swaps the visible face',
    run: async (page) => {
      await page.click('#sw-icon');
      assert.equal(await page.$eval('#sw-icon input', (el: HTMLInputElement) => el.checked), true);
      // the faces cross-fade over 300ms
      await page.waitForFunction(
        () => getComputedStyle(document.querySelector('#sw-icon .swap-on')!).opacity === '1',
        undefined,
        { timeout: 2000 },
      );
      assert.ok(Number(await opacity(page, '#sw-icon .swap-off')) < 0.05, 'off face did not fade out');
    },
  },
]);

type PageLike = { $eval: (s: string, f: (el: Element, a: string) => string, arg: string) => Promise<string> };

function prop(page: PageLike, selector: string, name: string): Promise<string> {
  return page.$eval(selector, (el, p) => getComputedStyle(el).getPropertyValue(p).trim(), name);
}

function opacity(page: PageLike, selector: string): Promise<string> {
  return prop(page, selector, 'opacity');
}
