import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: mockup-code is CSS-only - verify the dark terminal window with its
 * chrome, prompts that are generated (never selected, never in innerText -
 * the docs' copy buttons rely on that), tones, tinted / solid highlights,
 * the shared horizontal scroll vs data-wrap, line numbers, continuation
 * lines, the cursor, variants, sizes and LTR isolation in RTL pages - on
 * the real dist/ files.
 */
type Page = import('playwright').Page;
const cs = (page: Page, sel: string, prop: string, pseudo?: string) => page.$eval(sel, (e, [p, ps]) => getComputedStyle(e, ps || null).getPropertyValue(p as string), [prop, pseudo] as const);

await cssSmoke('mockup-code', [
  {
    label: 'a dark monospace window with three chrome dots; lines have no own box',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const m = getComputedStyle(document.getElementById('m-basic')!);
        const b = getComputedStyle(document.getElementById('m-basic')!, '::before');
        const l = getComputedStyle(document.getElementById('l-cmd')!);
        return { font: /mono/i.test(m.fontFamily), dark: m.backgroundColor, dots: b.boxShadow.split('px 0px 0px').length - 1, lineBg: l.backgroundColor, lineBorder: l.borderTopWidth, ws: l.whiteSpace };
      });
      assert.equal(r.font, true);
      assert.notEqual(r.dark, 'rgba(0, 0, 0, 0)');
      assert.equal(r.dots, 2, 'two shadow dots beside the first');
      assert.deepEqual([r.lineBg, r.lineBorder, r.ws], ['rgba(0, 0, 0, 0)', '0px', 'pre']);
    },
  },
  {
    label: 'prompts are generated: shown, not selectable, and absent from innerText (copying yields the commands)',
    run: async (page) => {
      const r = await page.evaluate(() => ({
        prefix: getComputedStyle(document.getElementById('l-cmd')!, '::before').content,
        select: getComputedStyle(document.getElementById('l-cmd')!, '::before').userSelect,
        text: (document.getElementById('m-cont') as HTMLElement).innerText,
        plainBefore: getComputedStyle(document.getElementById('l-plain')!, '::before').content,
      }));
      assert.equal(r.prefix, '"$"');
      assert.equal(r.select, 'none');
      assert.equal(r.text.trim(), 'npx skills add kyr0/defuss-shadcn \\\n  --skill defuss-shadcn', 'a pasteable command, no $');
      assert.equal(r.plainBefore, 'none', 'no prefix, no prompt');
    },
  },
  {
    label: 'tones: five distinct line colours; data-highlight tints, "solid" fills with the tone',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const g = (id: string) => getComputedStyle(document.getElementById(id)!);
        return { tones: ['l-warn', 'l-ok', 'l-info', 'l-bad', 'l-muted'].map((id) => g(id).color), plain: g('l-cmd').color, tint: g('l-hl').backgroundColor, solid: g('l-solid').backgroundColor, solidFg: g('l-solid').color, warn: g('l-warn').color, bg: g('m-basic').backgroundColor };
      });
      assert.equal(new Set(r.tones).size, 5);
      assert.ok(!r.tones.includes(r.plain));
      assert.notEqual(r.tint, 'rgba(0, 0, 0, 0)');
      assert.equal(r.solid, r.warn, 'solid band in the warning tone');
      assert.equal(r.solidFg, r.bg, 'dark text on it');
    },
  },
  {
    label: 'long lines: the window scrolls sideways and every line shares the width; data-wrap wraps instead',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const m = document.getElementById('m-long')!, w = document.getElementById('m-wrap')!;
        return { scrolls: m.scrollWidth > m.clientWidth, same: document.getElementById('l-long')!.getBoundingClientRect().width === document.getElementById('l-short')!.getBoundingClientRect().width, wrapScroll: w.scrollWidth > w.clientWidth, wrapLines: Math.round(document.getElementById('l-wrap')!.getBoundingClientRect().height / parseFloat(getComputedStyle(w).lineHeight)) };
      });
      assert.deepEqual([r.scrolls, r.same, r.wrapScroll], [true, true, false]);
      assert.ok(r.wrapLines >= 2, `wrapped onto ${r.wrapLines} lines`);
    },
  },
  {
    label: 'data-numbers numbers the lines without a prefix; a prefixed line keeps its prompt (the counter still counts it)',
    run: async (page) => {
      const r = await page.evaluate(() => ['n1', 'n2', 'n3', 'n4'].map((id) => getComputedStyle(document.getElementById(id)!, '::before').content));
      assert.ok([r[0], r[1], r[3]].every((c) => /counter\(mockup-line/.test(c)), `numbered lines: ${r.join(' | ')}`);
      assert.equal(r[2], '"$"', 'a prefixed line keeps its prompt');
    },
  },
  {
    label: 'continuation lines (data-prefix="") keep an empty prompt column, aligned with the command',
    run: async (page) => {
      const r = await page.evaluate(() => [document.querySelector('#c1 code')!.getBoundingClientRect().left, document.querySelector('#c2 code')!.getBoundingClientRect().left].map(Math.round));
      assert.equal(r[0], r[1]);
    },
  },
  {
    label: 'cursor: a blinking block after the line',
    run: async (page) => {
      const r = await page.evaluate(() => { const s = getComputedStyle(document.querySelector('#cur > code')!, '::after'); return [s.animationName, s.display]; });
      assert.deepEqual(r, ['mockup-code-cursor', 'inline-block']);
    },
  },
  {
    label: 'chrome: mac colours the dots, a title sits in the bar, none drops it',
    run: async (page) => {
      const r = await page.evaluate(() => ({
        mac: getComputedStyle(document.getElementById('m-mac')!, '::before').backgroundColor,
        plain: getComputedStyle(document.getElementById('m-basic')!, '::before').backgroundColor,
        title: getComputedStyle(document.getElementById('m-mac')!, '::after').content,
        none: getComputedStyle(document.getElementById('m-none')!, '::before').display,
      }));
      assert.notEqual(r.mac, r.plain);
      assert.equal(r.title, '"zsh - project"');
      assert.equal(r.none, 'none');
    },
  },
  {
    label: 'variants: primary / muted / outline surfaces differ from the terminal; tones retune on light surfaces; outline has a border',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const g = (id: string) => getComputedStyle(document.getElementById(id)!);
        return { bgs: ['m-basic', 'm-primary', 'm-muted', 'm-outline'].map((id) => g(id).backgroundColor), okDark: g('l-ok').color, okLight: g('l-muted-ok').color, border: g('m-outline').borderTopWidth };
      });
      assert.equal(new Set(r.bgs).size, 4);
      assert.notEqual(r.okDark, r.okLight);
      assert.equal(r.border, '1px');
    },
  },
  {
    label: 'sizes 12 / 14 / 16px; RTL pages keep the window left to right',
    run: async (page) => {
      assert.deepEqual([await cs(page, '#s-sm', 'font-size'), await cs(page, '#m-basic', 'font-size'), await cs(page, '#s-lg', 'font-size')], ['12px', '14px', '16px']);
      assert.equal(await cs(page, '#m-rtl', 'direction'), 'ltr');
      const r = await page.evaluate(() => { const m = document.getElementById('m-rtl')!.getBoundingClientRect(); const c = document.querySelector('#rtl-l code')!.getBoundingClientRect(); return c.left - m.left < 80; });
      assert.ok(r, 'the command starts at the left');
    },
  },
]);
