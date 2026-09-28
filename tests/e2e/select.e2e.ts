import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';
import { assertLegibleDisabled } from './lib/disabled.ts';

/**
 * Why: select is CSS-only - the appearance:none + inline-SVG chevron restyle
 * is the whole control. Verify the 36px md-step box with chevron padding, the custom
 * chevron background, sm/lg sizes, disabled, and the invalid border.
 */
await cssSmoke('select', [
  {
    label: '.select is a 36px appearance-none control (md default) with chevron room',
    selector: '#se-default',
    css: { appearance: 'none', height: '36px', padding: '0px 32px 0px 12px', cursor: 'pointer' },
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
    label: 'disabled select stays legible: full --input border, muted surface + text, not-allowed',
    run: (page) => assertLegibleDisabled(page, { control: '#se-disabled', tokens: { 'border-top-color': '--input', 'background-color': '--muted', color: '--muted-foreground' } }),
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
    // clear/reset entry - select a value, then select the placeholder again
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
  {
    label: 'select[multiple] is a list box: auto height (no 36px lock), no chevron, tinted chosen rows',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const sel = document.getElementById('sel-multi')!;
        const chosen = sel.querySelector('option[value="at"]')!;
        const plain = sel.querySelector('option[value="be"]')!;
        return {
          height: sel.getBoundingClientRect().height,
          chevron: getComputedStyle(sel).backgroundImage,
          chosenBg: getComputedStyle(chosen).backgroundImage,
          plainBg: getComputedStyle(plain).backgroundImage,
        };
      });
      assert.ok(r.height > 100, 'shows its rows (got ' + r.height + 'px)');
      assert.equal(r.chevron, 'none');
      assert.match(r.chosenBg, /gradient/);
      assert.equal(r.plainBg, 'none');
    },
  },
  {
    label: 'select[multiple] submits every chosen value; Ctrl/⌘-click adds one',
    run: async (page) => {
      const values = () => page.evaluate(() => new FormData(document.getElementById('sel-multi-form') as HTMLFormElement).getAll('ship'));
      assert.deepEqual(await values(), ['at', 'de']);
      await page.click('#sel-multi option[value="fr"]', { modifiers: [process.platform === 'darwin' ? 'Meta' : 'Control'] });
      assert.deepEqual(await values(), ['at', 'de', 'fr']);
    },
  },
  {
    label: 'an unavailable option (disabled) cannot be chosen while the rest of the list works',
    run: async (page) => {
      const value = () => page.$eval('#sel-size', (el) => (el as HTMLSelectElement).value);
      await page.selectOption('#sel-size', 'm');
      assert.equal(await value(), 'm', 'the list stays usable');
      // Playwright refuses disabled options exactly like a user would be refused
      const refused = await page.selectOption('#sel-size', 'l', { timeout: 1000 }).then(() => false, () => true);
      assert.ok(refused, 'the disabled option is not selectable');
      const inGroup = await page.selectOption('#sel-size', 'old', { timeout: 1000 }).then(() => false, () => true);
      assert.ok(inGroup, 'options of a disabled optgroup are not selectable');
      assert.equal(await value(), 'm');
    },
  },
  {
    label: 'list box: a disabled option is muted and a click does not select it',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const cs = (v: string) => getComputedStyle(document.querySelector('#sel-size-list option[value="' + v + '"]')!);
        return { off: cs('l').color, on: cs('m').color };
      });
      assert.notEqual(r.off, r.on, 'muted colour');
      await page.click('#sel-size-list option[value="l"]', { force: true });
      const chosen = await page.evaluate(() => new FormData(document.getElementById('sel-size-form') as HTMLFormElement).getAll('sizes'));
      assert.ok(!chosen.includes('l'), 'not submitted');
    },
  },
]);
