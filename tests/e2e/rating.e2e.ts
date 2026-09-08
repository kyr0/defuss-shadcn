import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: rating is CSS-only — the shipped contract is rating.css itself. The
 * interesting part is the fill logic, which has no JS to drive it: `:has()`
 * decides which stars are filled from the checked radio, and the read-only
 * form clips a second layer of stars to `--rating-value`. These checks drive
 * the radios and read the resulting colours, so a regression in either
 * selector fails here rather than silently rendering five empty stars.
 */

await cssSmoke('rating', [
  {
    label: 'rating.css applies base layout (inline row, star glyph sized)',
    selector: '#r-default',
    css: { display: 'inline-flex', 'align-items': 'center' },
  },
  {
    label: 'sizes map to distinct star sizes',
    run: async (page) => {
      // the glyph is the ::before layer, so the size lives there, not on the item
      const sizes = await page.evaluate(() =>
        ['#r-sm-1', '#r-md-1', '#r-lg-1'].map(
          (s) => getComputedStyle(document.querySelector(s)!, '::before').fontSize,
        ),
      );
      assert.equal(new Set(sizes).size, 3, `sm/default/lg should differ, got ${sizes.join(', ')}`);
    },
  },
  {
    label: 'nothing chosen → every star is empty',
    run: async (page) => {
      const colors = await page.evaluate(
        (sel: string) =>
          [1, 2, 3, 4, 5].map((i) => getComputedStyle(document.querySelector(`${sel}-${i}`)!, '::before').color),
        '#r-star',
      );
      assert.equal(new Set(colors).size, 1, `all five stars should share the empty colour, got ${colors.join(', ')}`);
    },
  },
  {
    label: 'checked value 3 → stars 1-3 filled, 4-5 empty',
    run: async (page) => {
      const colors = await page.evaluate(
        (sel: string) =>
          [1, 2, 3, 4, 5].map((i) => getComputedStyle(document.querySelector(`${sel}-${i}`)!, '::before').color),
        '#r-checked',
      );
      const [c1, c2, c3, c4, c5] = colors;
      assert.equal(c1, c3, 'star 1 and star 3 should both be filled');
      assert.equal(c2, c3, 'star 2 and star 3 should both be filled');
      assert.equal(c4, c5, 'stars 4 and 5 should both be empty');
      assert.notEqual(c3, c4, 'the filled colour must differ from the empty colour');
    },
  },
  {
    label: 'choosing a star fills up to it and empties the ones after',
    run: async (page) => {
      await page.click('#r-star-4 .rating-input');
      const colors = await page.evaluate(
        (sel: string) =>
          [1, 2, 3, 4, 5].map((i) => getComputedStyle(document.querySelector(`${sel}-${i}`)!, '::before').color),
        '#r-star',
      );
      assert.equal(colors[0], colors[3], 'stars 1-4 should be filled after choosing star 4');
      assert.notEqual(colors[3], colors[4], 'star 5 should stay empty');
      const checked = await page.evaluate(
        () => (document.querySelector('#r-default input:checked') as HTMLInputElement | null)?.value,
      );
      assert.equal(checked, '4', 'the underlying radio should hold the value');
    },
  },
  {
    label: 'the radio keeps keyboard support (arrow key moves the value)',
    run: async (page) => {
      await page.click('#r-star-2 .rating-input');
      await page.keyboard.press('ArrowRight');
      const checked = await page.evaluate(
        () => (document.querySelector('#r-default input:checked') as HTMLInputElement).value,
      );
      assert.equal(checked, '3', 'ArrowRight should advance the radio group to the next star');
    },
  },
  {
    label: 'read-only form clips the filled layer to --rating-value',
    run: async (page) => {
      const widths = await page.evaluate(() =>
        ['#r-readonly-zero', '#r-readonly-half', '#r-readonly'].map((s) => {
          const el = document.querySelector(s)!;
          return parseFloat(getComputedStyle(el, '::after').width);
        }),
      );
      const [zero, half, four] = widths;
      assert.equal(zero, 0, `value 0 should clip the fill to nothing, got ${zero}px`);
      assert.ok(half > zero && four > half, `fill width should grow with the value, got ${widths.join(', ')}`);
    },
  },
  {
    label: 'read-only 3.5 fills exactly seven tenths of the row',
    run: async (page) => {
      const ratio = await page.evaluate(() => {
        const el = document.querySelector('#r-readonly-half')!;
        return parseFloat(getComputedStyle(el, '::after').width) / el.getBoundingClientRect().width;
      });
      assert.ok(Math.abs(ratio - 0.7) < 0.02, `3.5 of 5 should fill ~70% of the row, got ${(ratio * 100).toFixed(1)}%`);
    },
  },
  {
    label: '--rating-color override changes the fill',
    run: async (page) => {
      const [amber, custom] = await page.evaluate(() =>
        ['#r-readonly', '#r-readonly-custom'].map((s) => getComputedStyle(document.querySelector(s)!, '::after').color),
      );
      assert.notEqual(amber, custom, 'overriding --rating-color should change the filled star colour');
    },
  },
  {
    label: 'disabled fieldset dims the group and disables every radio',
    run: async (page) => {
      const state = await page.evaluate(() => {
        const group = document.querySelector('#r-disabled') as HTMLElement;
        const inputs = Array.from(group.querySelectorAll('input')) as HTMLInputElement[];
        return { opacity: getComputedStyle(group).opacity, allDisabled: inputs.every((i) => i.disabled) };
      });
      assert.ok(state.allDisabled, 'every radio in a disabled fieldset should be disabled');
      assert.ok(parseFloat(state.opacity) < 1, `disabled group should be dimmed, got opacity ${state.opacity}`);
    },
  },
  {
    label: 'a disabled group does not preview on hover',
    run: async (page) => {
      const read = () =>
        page.evaluate(() =>
          [1, 2].map((i) => {
            const cs = getComputedStyle(document.querySelector(`#r-disabled-${i}`)!, '::before');
            return { color: cs.color, scale: cs.scale };
          }),
        );
      const before = await read();
      await page.hover('#r-disabled-2');
      await page.waitForTimeout(250);
      const after = await read();
      assert.deepEqual(
        after.map((s) => s.color),
        before.map((s) => s.color),
        'hovering a disabled rating must not fill its stars',
      );
      assert.ok(
        after.every((s) => s.scale === 'none' || s.scale === '1'),
        `hovering a disabled rating must not scale its stars, got ${after.map((s) => s.scale).join(', ')}`,
      );
    },
  },
  {
    label: 'a disabled group shows the "not-allowed" pointer on star and radio alike',
    run: async (page) => {
      const cursors = await page.evaluate(() => ({
        item: getComputedStyle(document.querySelector('#r-disabled-1')!).cursor,
        input: getComputedStyle(document.querySelector('#r-disabled-1 .rating-input')!).cursor,
      }));
      assert.equal(cursors.item, 'not-allowed', `star cursor was ${cursors.item}`);
      assert.equal(cursors.input, 'not-allowed', `radio cursor was ${cursors.input}`);
    },
  },
  {
    label: 'an enabled group still previews on hover',
    run: async (page) => {
      // earlier checks leave a value chosen in this group, which would already
      // fill star 2 — clear it so the hover preview is what we actually measure
      await page.evaluate(() => {
        document
          .querySelectorAll<HTMLInputElement>('#r-default .rating-input')
          .forEach((i) => { i.checked = false; });
      });
      await page.mouse.move(0, 0);
      await page.waitForTimeout(150);
      const before = await page.evaluate(
        () => getComputedStyle(document.querySelector('#r-star-2')!, '::before').color,
      );
      await page.hover('#r-star-3');
      await page.waitForTimeout(250);
      const after = await page.evaluate(
        () => getComputedStyle(document.querySelector('#r-star-2')!, '::before').color,
      );
      assert.notEqual(after, before, 'hovering star 3 should fill the stars before it');
    },
  },
  {
    label: 'the star glyph is painted by CSS, not markup',
    run: async (page) => {
      const content = await page.evaluate(() => getComputedStyle(document.querySelector('#r-star-1')!, '::before').content);
      assert.ok(content.includes('★'), `expected the star to come from CSS content, got ${content}`);
    },
  },
]);
