import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: select is CSS-only — the appearance:none + inline-SVG chevron restyle
 * is the whole control. Verify the 40px box with chevron padding, the custom
 * chevron background, sm/lg sizes, disabled, and the invalid border.
 */
await cssSmoke('select', [
  {
    label: '.select is a 40px appearance-none control with chevron room',
    selector: '#se-default',
    css: { appearance: 'none', height: '40px', padding: '0px 32px 0px 12px', cursor: 'pointer' },
  },
  {
    label: 'custom chevron drawn via inline-SVG background (right-aligned, 1rem)',
    run: async (page) => {
      const bg = await page.$eval('#se-default', (el) => {
        const cs = getComputedStyle(el);
        return { image: cs.backgroundImage, repeat: cs.backgroundRepeat, size: cs.backgroundSize };
      });
      assert.match(bg.image, /url\("data:image\/svg\+xml/, 'SVG data-URI chevron');
      assert.equal(bg.repeat, 'no-repeat');
      // author set `background-size: 1rem` (single value → height auto)
      assert.match(bg.size, /^16px (auto|16px)$/);
    },
  },
  {
    label: 'data-size xs/sm/md/lg/xl heights 28 / 32 / 36 / 44 / 52',
    run: async (page) => {
      const [xs, sm, md, lg, xl] = await page.evaluate(() =>
        ['xs', 'sm', 'md', 'lg', 'xl'].map(
          (s) => document.querySelector(`#se-${s}`)!.getBoundingClientRect().height,
        ),
      );
      assert.deepEqual([xs, sm, md, lg, xl], [28, 32, 36, 44, 52]);
    },
  },
  {
    label: ':disabled dims to 0.5 / not-allowed',
    selector: '#se-disabled',
    css: { opacity: '0.5', cursor: 'not-allowed' },
  },
  {
    label: 'aria-invalid recolors the border',
    distinct: [
      { selector: '#se-default', prop: 'border-top-color' },
      { selector: '#se-invalid', prop: 'border-top-color' },
    ],
  },
  {
    // issue #32: the empty option must stay selectable so it doubles as the
    // clear/reset entry — select a value, then select the placeholder again
    label: 'placeholder is selectable and clears a made selection (issue #32)',
    run: async (page) => {
      const disabled = await page.$eval('#se-default option[value=""]', (el) => (el as HTMLOptionElement).disabled);
      assert.equal(disabled, false, 'placeholder option must not be disabled');
      // value color != placeholder color (the :has(> option[value=""]:checked) rule)
      const colorOf = (value: string) =>
        page.evaluate((v) => {
          const s = document.querySelector('#se-default') as HTMLSelectElement;
          s.value = v;
          return getComputedStyle(s).color;
        }, value);
      const placeholderColor = await colorOf('');
      const valueColor = await colorOf('one');
      assert.notEqual(placeholderColor, valueColor, 'placeholder renders muted, value in foreground');
      // and the box really clears: value back to '' after re-choosing it
      await page.selectOption('#se-default', 'one');
      await page.selectOption('#se-default', '');
      const cleared = await page.$eval('#se-default', (el) => (el as HTMLSelectElement).value);
      assert.equal(cleared, '', 're-choosing the empty option empties the select');
    },
  },
]);
