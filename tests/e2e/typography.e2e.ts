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
    label: 'link: the primary colour, underlined 4px below the text - and a theme sets both through its tokens',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const cs = (id: string) => getComputedStyle(document.getElementById(id)!);
        const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
        const probe = document.createElement('span');
        probe.style.color = primary; document.body.append(probe);
        const want = getComputedStyle(probe).color; probe.remove();
        const a = cs('ty-link'), b = cs('ty-link-themed');
        return { color: a.color, want, line: a.textDecorationLine, offset: a.textUnderlineOffset, style: b.textDecorationStyle, offset2: b.textUnderlineOffset };
      });
      assert.equal(r.color, r.want);
      assert.deepEqual([r.line, r.offset, r.style, r.offset2], ['underline', '4px', 'dotted', '2px']);
    },
  },
  {
    // across the column break the heading's margin cannot collapse into the spanner's:
    // the left column started lower than the right (the paper's two-column trial)
    label: 'typeset: the columns below a .typeset-span start level - the first block keeps no top margin',
    selector: '#ty-span-h',
    css: { 'margin-block-start': '0px' },
  },
  {
    // a wrapping heading was justified like the text: wide gaps between its words
    label: 'typeset: Blocksatz never justifies a heading - flush start, unhyphenated',
    selector: '#ty-set-h',
    css: { 'text-align': 'start', 'hyphens': 'manual' },
  },
  {
    label: 'typeset: Einzug - no paragraph gap, the first line of each following paragraph indented 1em',
    run: async (page) => {
      const r = await page.evaluate(() => ['ty-set-p1', 'ty-set-p2', 'ty-set-p3'].map((id) => { const cs = getComputedStyle(document.getElementById(id)!); return [cs.textIndent, cs.marginBlockStart, cs.marginBlockEnd]; }));
      assert.deepEqual(r, [['0px', '0px', '0px'], ['14px', '0px', '0px'], ['14px', '0px', '0px']]);
    },
  },
  {
    label: 'typeset: a drop initial over three lines with its gap; beside it the small-caps lead sets capitals (the line top meets the initial); classic ligatures, old-style figures',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const p = document.getElementById('ty-set-p1')!;
        const letter = getComputedStyle(p, '::first-letter');
        const set = getComputedStyle(document.getElementById('ty-set')!);
        const line = getComputedStyle(p, '::first-line');
        return { initial: letter.getPropertyValue('initial-letter'), gap: letter.marginInlineEnd, caps: line.fontVariantCaps, upper: line.textTransform, lig: set.fontVariantLigatures, num: set.fontVariantNumeric };
      });
      assert.equal(r.initial, '3');
      assert.ok(parseFloat(r.gap) > 0, `the initial keeps a gap to the text: ${r.gap}`);
      assert.deepEqual([r.caps, r.upper], ['normal', 'uppercase']);
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
  {
    label: 'typeset: the lead without an initial - small capitals, or letterspaced capitals',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const line = (id: string) => getComputedStyle(document.getElementById(id)!, '::first-line');
        return [line('ty-lead-sc-p').fontVariantCaps, line('ty-lead-caps-p').textTransform, line('ty-lead-caps-p').letterSpacing];
      });
      assert.equal(r[0], 'all-small-caps');
      assert.equal(r[1], 'uppercase');
      assert.ok(parseFloat(r[2]) > 0, r[2]);
    },
  },
  {
    label: 'typeset: leading tight / normal / loose with matched tracking (-0.01em / 0 / +0.01em)',
    run: async (page) => {
      const r = await page.evaluate(() => ['ty-tight', 'ty-normal', 'ty-loose'].map((id) => { const cs = getComputedStyle(document.getElementById(id)!); return [Math.round(parseFloat(cs.lineHeight) * 100) / 100, cs.letterSpacing === 'normal' ? 0 : Math.round(parseFloat(cs.letterSpacing) * 1000) / 1000]; }));
      // 14px body: 1.45 / 1.65 / 1.9 line height, -0.14 / 0 / +0.14 px tracking
      assert.deepEqual(r, [[20.3, -0.14], [23.1, 0], [26.6, 0.14]]);
    },
  },
  {
    label: 'typeset: every block keeps --typeset-gap (1.5em) from the text, figures span the measure',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const cs = (id: string) => getComputedStyle(document.getElementById(id)!);
        return { fig: [cs('ty-cap-fig').marginTop, cs('ty-cap-fig').marginBottom, cs('ty-cap-fig').marginLeft], tbl: cs('ty-cap-tbl').marginTop, sep: cs('ty-sep-asterism').marginTop, group: cs('ty-group').marginTop };
      });
      assert.deepEqual(r, { fig: ['21px', '21px', '0px'], tbl: '21px', sep: '21px', group: '21px' });
    },
  },
  {
    label: 'captions: numbered in order, figures and tables apart, aligned start / centre / justify',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const before = (id: string) => getComputedStyle(document.getElementById(id)!, '::before').content;
        const align = (id: string) => getComputedStyle(document.getElementById(id)!).textAlign;
        return { labels: ['ty-cap-1', 'ty-cap-t1', 'ty-cap-2', 'ty-cap-3'].map(before), align: ['ty-cap-1', 'ty-cap-t1', 'ty-cap-2'].map(align) };
      });
      assert.deepEqual(r.labels, ['"Figure " counter(typeset-figure) ". "', '"Table " counter(typeset-table) ". "', '"Figure " counter(typeset-figure) ". "', '"Figure " counter(typeset-figure) ". "']);
      assert.deepEqual(r.align, ['start', 'center', 'justify']);
      // generated content is not in innerText: pin the counter wiring - one reset on the numbered container, one increment per caption
      const wiring = await page.evaluate(() => ({ reset: getComputedStyle(document.getElementById('ty-cap')!).counterReset, inc: ['ty-cap-1', 'ty-cap-t1', 'ty-cap-2', 'ty-cap-3'].map((id) => getComputedStyle(document.getElementById(id)!, '::before').counterIncrement) }));
      assert.deepEqual(wiring, { reset: 'typeset-figure 0 typeset-table 0', inc: ['typeset-figure 1', 'typeset-table 1', 'typeset-figure 1', 'typeset-figure 1'] });
    },
  },
  {
    label: 'figure groups: captions level across unequal media (subgrid), a divider that turns when stacked, cards',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const top = (id: string) => Math.round(document.getElementById(id)!.getBoundingClientRect().top);
        const cs = (id: string) => getComputedStyle(document.getElementById(id)!);
        const box = (id: string) => document.getElementById(id)!.getBoundingClientRect();
        const a = box('ty-gf-a'), b = box('ty-gf-b');
        const na = box('ty-group-narrow').top, nb = box('ty-gn-b');
        const first = document.querySelector('#ty-group-narrow > figure')!.getBoundingClientRect();
        return {
          captionsLevel: top('ty-sub-a') === top('ty-sub-b'),
          divided: [cs('ty-group').columnGap, cs('ty-group').backgroundColor === cs('ty-group').borderTopColor, Math.round(b.left - a.right)],
          stacked: [cs('ty-group-narrow').rowGap, Math.round(nb.top - first.bottom)],
          cards: [cs('ty-group-cards').borderTopWidth, cs('ty-gc-a').borderTopWidth],
          counters: [cs('ty-group').containerType, cs('ty-group').contain],
        };
      });
      assert.equal(r.captionsLevel, true, 'captions of a row sit at one height');
      assert.deepEqual(r.divided, ['1px', true, 1], 'wide: a 1px line (the gap over the border colour) between the columns');
      assert.deepEqual(r.stacked, ['1px', 1], 'stacked: the same 1px line between the rows');
      assert.deepEqual(r.cards, ['0px', '1px'], 'cards: no outer box, each figure framed');
      // no containment on the group: style containment would scope the caption counters to it
      assert.deepEqual(r.counters, ['normal', 'none']);
    },
  },
  {
    label: 'figure groups: lettered sub-captions (a), (b) in one bordered box',
    run: async (page) => {
      const r = await page.evaluate(() => ({ reset: getComputedStyle(document.getElementById('ty-group')!).counterReset, sub: getComputedStyle(document.getElementById('ty-sub-a')!, '::before').content }));
      assert.deepEqual(r, { reset: 'typeset-sub 0', sub: '"(" counter(typeset-sub, lower-alpha) ") "' });
      assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('ty-group')!).borderTopStyle), 'solid');
    },
  },
]);
