import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';
import { assertLegibleDisabled } from './lib/disabled.ts';

/**
 * Why: switch is CSS-only - appearance:none track + a translated ::after
 * thumb is the entire control. Verify the 36x20 pill, the thumb geometry,
 * the checked fill/translate, sm sizing, disabled, and invalid colors.
 */
await cssSmoke('switch', [
  {
    label: '.switch is a 36x20 appearance-none pill',
    selector: '#sw-off',
    css: { appearance: 'none', width: '36px', height: '20px', 'border-radius': '9999px', 'border-top-width': '0px' },
  },
  {
    label: '::after thumb is a 16px circle inset 2px',
    run: async (page) => {
      const t = await page.evaluate(() => {
        const s = getComputedStyle(document.querySelector('#sw-off')!, '::after');
        return { w: s.width, h: s.height, left: s.left, top: s.top };
      });
      assert.equal(t.w, '16px');
      assert.equal(t.h, '16px');
      assert.equal(t.left, '2px');
      assert.equal(t.top, '2px');
    },
  },
  {
    label: 'checked fills primary and slides the thumb 16px right',
    run: async (page) => {
      const [off, on] = await page.evaluate(() => [
        { bg: getComputedStyle(document.querySelector('#sw-off')!).backgroundColor, tx: getComputedStyle(document.querySelector('#sw-off')!, '::after').transform },
        { bg: getComputedStyle(document.querySelector('#sw-on')!).backgroundColor, tx: getComputedStyle(document.querySelector('#sw-on')!, '::after').transform },
      ]);
      assert.notEqual(off.bg, on.bg, 'checked uses --primary');
      assert.ok(off.tx === 'none' || off.tx === 'matrix(1, 0, 0, 1, 0, 0)', `unchecked thumb untransformed, got ${off.tx}`);
      assert.equal(on.tx, 'matrix(1, 0, 0, 1, 16, 0)', 'checked thumb translateX(1rem)');
    },
  },
  {
    label: 'sm size is a 28x16 track with a 12px thumb',
    run: async (page) => {
      const box = await page.evaluate(() => {
        const el = document.querySelector('#sw-sm')!;
        return {
          w: el.getBoundingClientRect().width,
          h: el.getBoundingClientRect().height,
          thumb: getComputedStyle(el, '::after').width,
        };
      });
      assert.equal(box.w, 28);
      assert.equal(box.h, 16);
      assert.equal(box.thumb, '12px');
    },
  },
  {
    // thumb = height − 4px, checked translate = width − height (switch.css rule)
    label: 'full scale tracks xs 24x14 … xl 52x28, xl thumb travels 24px',
    run: async (page) => {
      const boxes = await page.evaluate(() =>
        ['xs', 'sm', 'md', 'lg', 'xl'].map((s) => {
          const el = document.querySelector(`#sw-${s}`)!;
          const r = el.getBoundingClientRect();
          return `${Math.round(r.width)}x${Math.round(r.height)}`;
        }),
      );
      assert.deepEqual(boxes, ['24x14', '28x16', '36x20', '44x24', '52x28']);
      const xlThumb = await page.$eval('#sw-xl-on', (el) =>
        getComputedStyle(el, '::after').transform,
      );
      // translateX(1.5rem) computes to matrix(1, 0, 0, 1, 24, 0) - e is the 5th value
      assert.equal(xlThumb, 'matrix(1, 0, 0, 1, 24, 0)', 'checked xl thumb offset = width − height');
    },
  },
  {
    label: 'disabled switch stays legible: full --input track, no fade, muted label, no hand pointer',
    run: (page) => assertLegibleDisabled(page, { control: '#sw-disabled', label: 'label[for="sw-disabled"]', tokens: { 'background-color': '--input' } }),
  },
  {
    label: 'disabled ON switch keeps a visible (softened primary) track, distinct from off and from the page',
    distinct: [
      { selector: '#sw-disabled-on', prop: 'background-color' },
      { selector: '#sw-disabled', prop: 'background-color' },
      { selector: 'body', prop: 'background-color' },
    ],
  },
  {
    label: 'disabled ON switch: no fade, muted label',
    run: (page) => assertLegibleDisabled(page, { control: '#sw-disabled-on', label: 'label[for="sw-disabled-on"]' }),
  },
  {
    label: 'aria-invalid track uses destructive (distinct from off)',
    distinct: [
      { selector: '#sw-off', prop: 'background-color' },
      { selector: '#sw-invalid', prop: 'background-color' },
    ],
  },
  {
    label: 'clicking the gap between control and label toggles (.switch-item)',
    run: async (page) => {
      // the midpoint of the whitespace between the control and its label text
      const at = await page.evaluate(() => {
        const input = document.querySelector('#sw-gap')!;
        const label = document.querySelector('label[for="sw-gap"]')!;
        const a = input.getBoundingClientRect();
        const b = label.getBoundingClientRect();
        return { x: (a.right + b.left) / 2, y: a.top + a.height / 2, gap: b.left - a.right };
      });
      assert.ok(at.gap > 2, 'fixture has a real gap between control and label');
      await page.mouse.click(at.x, at.y);
      assert.equal(await page.evaluate(() => (document.querySelector('#sw-gap') as HTMLInputElement).checked), true);
    },
  },
  {
    label: 'clicking the gap between control and label toggles (.switch-item-block)',
    run: async (page) => {
      // the midpoint of the whitespace between the control and its label text
      const at = await page.evaluate(() => {
        const input = document.querySelector('#sw-gap-block')!;
        const label = document.querySelector('label[for="sw-gap-block"]')!;
        const a = input.getBoundingClientRect();
        const b = label.getBoundingClientRect();
        return { x: (a.right + b.left) / 2, y: a.top + a.height / 2, gap: b.left - a.right };
      });
      assert.ok(at.gap > 2, 'fixture has a real gap between control and label');
      await page.mouse.click(at.x, at.y);
      assert.equal(await page.evaluate(() => (document.querySelector('#sw-gap-block') as HTMLInputElement).checked), true);
    },
  },
]);
