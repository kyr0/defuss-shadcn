import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: kbd is CSS-only — the shipped contract is kbd.css itself. Three things
 * are worth pinning: the thicker bottom border, which is the entire reason a
 * rectangle reads as a key; the outer <kbd> of a combination staying unstyled,
 * since it is the chord rather than a key; and a key inside a button borrowing
 * that button's colour instead of keeping its own surface.
 */
await cssSmoke('kbd', [
  {
    label: 'kbd.css applies the key geometry',
    selector: '#k-default',
    css: {
      display: 'inline-grid',
      'font-size': '12px',
      'border-top-width': '1px',
      'line-height': '12px',
    },
  },
  {
    label: 'the bottom edge is thicker — that is what reads as a key',
    run: async (page) => {
      const b = await page.evaluate(() => {
        const cs = getComputedStyle(document.querySelector('#k-default')!);
        return { top: cs.borderTopWidth, bottom: cs.borderBottomWidth };
      });
      assert.equal(b.top, '1px');
      assert.equal(b.bottom, '2px', 'the bottom border must be heavier than the others');
    },
  },
  {
    label: 'sizes map to distinct key heights',
    distinct: [
      { selector: '#k-sm', prop: 'height' },
      { selector: '#k-default', prop: 'height' },
      { selector: '#k-lg', prop: 'height' },
    ],
  },
  {
    label: 'a combination nests <kbd> in <kbd>, and the outer one is not a key',
    run: async (page) => {
      const g = await page.evaluate(() => {
        const outer = document.querySelector('#k-group')!;
        const cs = getComputedStyle(outer);
        const key = getComputedStyle(document.querySelector('#k-group-1')!);
        return {
          tag: outer.tagName.toLowerCase(),
          innerTags: Array.from(outer.children).map((c) => c.tagName.toLowerCase()),
          outerBorder: cs.borderTopWidth,
          outerBg: cs.backgroundColor,
          keyBorder: key.borderTopWidth,
        };
      });
      assert.equal(g.tag, 'kbd', 'the chord itself is a <kbd>, per the HTML spec');
      assert.deepEqual(g.innerTags, ['kbd', 'kbd'], 'each key is a nested <kbd>');
      assert.equal(g.outerBorder, '0px', 'the chord must not be drawn as a key');
      assert.equal(g.outerBg, 'rgba(0, 0, 0, 0)', 'the chord must have no key surface');
      assert.equal(g.keyBorder, '1px', 'the nested keys keep the key styling');
    },
  },
  {
    label: 'data-separator draws a "+" between keys, and only between them',
    run: async (page) => {
      const s = await page.evaluate(() => {
        const content = (sel: string) => getComputedStyle(document.querySelector(sel)!, '::before').content;
        return { first: content('#k-sep-1'), second: content('#k-sep-2'), third: content('#k-sep-3') };
      });
      assert.ok(!s.first.includes('+'), 'the first key must not be preceded by a separator');
      assert.ok(s.second.includes('+'), `expected a "+" before the second key, got ${s.second}`);
      assert.ok(s.third.includes('+'), `expected a "+" before the third key, got ${s.third}`);
    },
  },
  {
    label: 'the separator sits in the gap, outside the key box',
    run: async (page) => {
      const outside = await page.evaluate(() => {
        const key = document.querySelector('#k-sep-2')!.getBoundingClientRect();
        // ::before is placed with a negative inline offset, so it starts left of the key
        const cs = getComputedStyle(document.querySelector('#k-sep-2')!, '::before');
        return { inset: cs.insetInlineStart, keyLeft: key.left };
      });
      assert.ok(
        outside.inset.startsWith('-'),
        `the separator must be offset out of the key box, got ${outside.inset}`,
      );
    },
  },
  {
    label: 'a group without data-separator draws no "+"',
    run: async (page) => {
      const content = await page.evaluate(
        () => getComputedStyle(document.querySelector('#k-group-2')!, '::before').content,
      );
      assert.ok(!content.includes('+'), `a plain group must have no separator, got ${content}`);
    },
  },
  {
    label: 'a key inside a button borrows the button colour instead of its own surface',
    run: async (page) => {
      const s = await page.evaluate(() => {
        const inBtn = getComputedStyle(document.querySelector('#k-in-btn')!);
        const standalone = getComputedStyle(document.querySelector('#k-default')!);
        const btn = getComputedStyle(document.querySelector('#k-btn')!);
        return {
          inBtnBg: inBtn.backgroundColor,
          inBtnColor: inBtn.color,
          standaloneBg: standalone.backgroundColor,
          btnColor: btn.color,
        };
      });
      assert.equal(s.inBtnBg, 'rgba(0, 0, 0, 0)', 'a key in a button drops its own background');
      assert.notEqual(s.standaloneBg, 'rgba(0, 0, 0, 0)', 'a standalone key keeps its surface');
      assert.equal(s.inBtnColor, s.btnColor, "the key must inherit the button's text colour");
    },
  },
]);
