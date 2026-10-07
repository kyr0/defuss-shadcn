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
  {
    label: 'CJK paragraphs: justified between characters, strict breaks, hanging sentence ends, 1.9 leading; Latin untouched',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const cs = (id: string) => getComputedStyle(document.getElementById(id)!);
        const zh = cs('ty-zh-p'), en = cs('ty-en');
        return {
          zh: [zh.textAlign, zh.textJustify, zh.lineBreak, (zh as unknown as { textSpacingTrim?: string }).textSpacingTrim ?? 'normal', (parseFloat(zh.lineHeight) / parseFloat(zh.fontSize)).toFixed(1)],
          en: [en.textAlign, en.lineBreak],
          autospace: (zh as unknown as { textAutospace?: string }).textAutospace ?? 'unsupported',
        };
      });
      assert.deepEqual(r.zh, ['justify', 'inter-character', 'strict', 'normal', '1.9']);
      // hanging-punctuation is Safari-only - where it exists it must be allow-end
      const hang = await page.$eval('#ty-zh-p', (e) => (getComputedStyle(e) as unknown as { hangingPunctuation?: string }).hangingPunctuation);
      assert.ok(hang === undefined || hang === 'allow-end', String(hang));
      assert.deepEqual(r.en.slice(0, 2), ['start', 'auto']);
      assert.ok(['normal', 'unsupported'].includes(r.autospace), r.autospace);
    },
  },
  {
    label: 'CJK headings drop the Latin tracking; Japanese headings break by phrase; blockquote is upright',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const cs = (id: string) => getComputedStyle(document.getElementById(id)!);
        return { zhH: cs('ty-zh-h').letterSpacing, jaH: cs('ty-ja-h').wordBreak, q: cs('ty-zh-q').fontStyle };
      });
      assert.equal(r.zhH, 'normal');
      assert.equal(r.jaH, 'auto-phrase');
      assert.equal(r.q, 'normal');
    },
  },
  {
    label: 'vertical text: vertical-rl + mixed; logical spacing turns (paragraph gap runs along the x axis)',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const cs = (id: string) => getComputedStyle(document.getElementById(id)!);
        const p1 = document.getElementById('ty-ja-p')!.getBoundingClientRect();
        const p2 = document.getElementById('ty-ja-p2')!.getBoundingClientRect();
        return { wm: cs('ty-ja').writingMode, to: cs('ty-ja').textOrientation, ml: cs('ty-ja-p2').marginRight, mt: cs('ty-ja-p2').marginTop, leftOf: p2.right <= p1.left + 1 };
      });
      assert.equal(r.wm, 'vertical-rl'); assert.equal(r.to, 'mixed');
      assert.equal(r.ml, '24px', 'margin-block-start is the right margin in vertical-rl');
      assert.equal(r.mt, '0px');
      assert.ok(r.leftOf, 'the second paragraph is the next column to the left');
    },
  },
  {
    label: 'tate-chu-yoko, emphasis marks (sesame in ja, dots under in zh), muted half-size ruby',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const cs = (id: string) => getComputedStyle(document.getElementById(id)!);
        const rt = cs('ty-rt'), h = cs('ty-ja-h');
        return { tcy: cs('ty-tcy').textCombineUpright, ja: [cs('ty-ja-em').textEmphasisStyle, cs('ty-ja-em').fontStyle], zh: [cs('ty-zh-em').textEmphasisStyle, cs('ty-zh-em').textEmphasisPosition], rt: parseFloat(rt.fontSize) / parseFloat(h.fontSize) };
      });
      assert.equal(r.tcy, 'all');
      assert.ok(/sesame/.test(r.ja[0]) && r.ja[1] === 'normal', r.ja.join());
      assert.ok(/dot/.test(r.zh[0]) && r.zh[1].startsWith('under'), r.zh.join());
      assert.equal(r.rt, 0.5);
    },
  },
  {
    label: 'typeset: two ruled columns of at least 18rem, Blocksatz with hyphenation',
    selector: '#ty-set',
    css: { 'column-count': '2', 'column-width': '288px', 'column-rule-style': 'solid', 'text-align': 'justify', 'hyphens': 'auto', 'text-align-last': 'start' },
  },
  {
    label: 'typeset: Einzug - no paragraph gap, the first line of each following paragraph indented 1em',
    run: async (page) => {
      const r = await page.evaluate(() => ['ty-set-p1', 'ty-set-p2', 'ty-set-p3'].map((id) => { const cs = getComputedStyle(document.getElementById(id)!); return [cs.textIndent, cs.marginBlockStart, cs.marginBlockEnd]; }));
      assert.deepEqual(r, [['0px', '0px', '0px'], ['14px', '0px', '0px'], ['14px', '0px', '0px']]);
    },
  },
  {
    label: 'typeset: a drop initial over three lines, the opening line in small capitals, classic ligatures and old-style figures',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const p = document.getElementById('ty-set-p1')!;
        const letter = getComputedStyle(p, '::first-letter');
        const set = getComputedStyle(document.getElementById('ty-set')!);
        return { initial: letter.getPropertyValue('initial-letter'), caps: getComputedStyle(p, '::first-line').fontVariantCaps, lig: set.fontVariantLigatures, num: set.fontVariantNumeric };
      });
      assert.equal(r.initial, '3');
      assert.equal(r.caps, 'all-small-caps');
      assert.ok(/discretionary-ligatures/.test(r.lig) && /historical-ligatures/.test(r.lig), r.lig);
      assert.ok(/oldstyle-nums/.test(r.num), r.num);
    },
  },
  {
    label: 'typeset: columns are responsive - 44rem sets two side by side, 20rem one (no media query)',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const x = (id: string) => document.getElementById(id)!.getBoundingClientRect().left;
        return { wide: x('ty-set-p3') - x('ty-set-p1'), narrow: x('ty-set-n2') - x('ty-set-n1') };
      });
      assert.ok(r.wide > 200, `the wide block should set a second column: ${JSON.stringify(r)}`);
      assert.equal(r.narrow, 0);
    },
  },
]);
