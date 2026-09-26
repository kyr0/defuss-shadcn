import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: typography is CSS-only - the type scale is the contract. Every size is
 * hardcoded px so the whole scale asserts literally, including the base-layer
 * body defaults and the modern text-wrap/hanging-punctuation features.
 */
await cssSmoke('typography', [
  {
    label: 'base layer sets the body to 14px / 1.5',
    selector: 'body',
    css: { 'font-size': '14px', 'line-height': '21px' },
  },
  {
    label: 'heading scale h1→h4: 36/30/24/20 with descending weights',
    run: async (page) => {
      const scale = await page.evaluate(
        () =>
          ['#ty-h1', '#ty-h2', '#ty-h3', '#ty-h4'].map((s) => {
            const cs = getComputedStyle(document.querySelector(s)!);
            return `${cs.fontSize}/${cs.fontWeight}`;
          }),
      );
      assert.deepEqual(scale, ['36px/800', '30px/600', '24px/600', '20px/600']);
    },
  },
  {
    label: 'h2 carries the underline rule (1px border + 8px offset)',
    selector: '#ty-h2',
    css: { 'border-bottom-width': '1px', 'padding-bottom': '8px' },
  },
  {
    label: 'prose: p 14/1.75, lead 20, large 18/600, small 14/500',
    run: async (page) => {
      const prose = await page.evaluate(() => ({
        p: getComputedStyle(document.querySelector('#ty-p')!).fontSize,
        pHeight: getComputedStyle(document.querySelector('#ty-p')!).lineHeight,
        lead: getComputedStyle(document.querySelector('#ty-lead')!).fontSize,
        large: getComputedStyle(document.querySelector('#ty-large')!).fontSize,
        small: getComputedStyle(document.querySelector('#ty-small')!).fontWeight,
      }));
      assert.deepEqual(prose, { p: '14px', pHeight: '24.5px', lead: '20px', large: '18px', small: '500' });
    },
  },
  {
    label: 'modern text features: balance headings, pretty body, 2px quote rule',
    run: async (page) => {
      const feats = await page.evaluate(() => ({
        h1Wrap: getComputedStyle(document.querySelector('#ty-h1')!).textWrap,
        pWrap: getComputedStyle(document.querySelector('#ty-p')!).textWrap,
        quoteBorder: getComputedStyle(document.querySelector('#ty-quote')!).borderInlineStartWidth,
      }));
      assert.match(feats.h1Wrap, /balance/, 'headings balance-wrap');
      assert.match(feats.pWrap, /pretty/, 'body prevents orphans');
      assert.equal(feats.quoteBorder, '2px', 'blockquote rule');
      // hanging-punctuation is declared but Chromium has no computed support —
      // assert it ships in the stylesheet instead (Safari gets it optically)
      const css = await page.evaluate(() =>
        fetch('/dist/components/typography/typography.css').then((r) => r.text()),
      );
      assert.match(css, /hanging-punctuation:\s*first last/, 'quote hanging declared for supporting engines');
    },
  },
  {
    label: '.inline-code is a mono chip on the muted surface (--radius-sm = 6px)',
    selector: '#ty-code',
    css: { 'font-family': /mono/, 'border-radius': '6px', padding: '3.2px 4.8px' },
  },
]);
