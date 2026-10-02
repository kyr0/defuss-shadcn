import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: section-header is a CSS-only website block (Landing Page) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('section-header', [
  { label: 'default title is 36px once the section is 48rem wide (container query)', selector: '.mk-section-header:not([data-size]) .mk-section-header-title', css: { 'font-size': '36px', 'margin-top': '0px' } },
  { label: 'sizes: sm 28px, lg 48px at that width', run: async (page) => {
    const s = await page.evaluate(() => ['sm', 'lg'].map((v) => getComputedStyle(document.querySelector(`.mk-section-header[data-size="${v}"] .mk-section-header-title`)!).fontSize));
    if (s.join() !== '28px,48px') throw new Error(`got ${s}`);
  } },
  { label: 'centered: text and copy on the axis', selector: '.mk-section-header[data-align="center"] .mk-section-header-copy', css: { 'align-items': 'center', 'text-align': 'center' } },
  { label: 'split: copy and actions share a row (actions end beside the copy)', run: async (page) => {
    const r = await page.evaluate(() => { const h = document.querySelector('.mk-section-header[data-variant="split"]')!; const c = h.querySelector('.mk-section-header-copy')!.getBoundingClientRect(); const a = h.querySelector('.mk-section-header-actions')!.getBoundingClientRect(); return { dir: getComputedStyle(h).flexDirection, beside: a.left >= c.right - 1, bottom: Math.abs(a.bottom - c.bottom) < 2 }; });
    if (r.dir !== 'row' || !r.beside || !r.bottom) throw new Error(JSON.stringify(r));
  } },
  { label: 'eyebrow uses the primary color, description the muted one', distinct: [ { selector: '.mk-section-header-eyebrow', prop: 'color' }, { selector: '.mk-section-header-desc', prop: 'color' }, { selector: '.mk-section-header-title', prop: 'color' } ] },

  { label: 'numbered: the index from data-index leads the copy', run: async (page) => {
    const r = await page.evaluate(() => { const h = document.querySelector('.mk-section-header[data-variant="numbered"]')!; return { c: getComputedStyle(h, '::before').content, dir: getComputedStyle(h).flexDirection }; });
    if (r.c !== '"01"' || r.dir !== 'row') throw new Error(JSON.stringify(r));
  } },
  { label: 'divider: a rule grows from the title to the edge', run: async (page) => {
    const w = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.mk-section-header[data-variant="divider"] .mk-section-header-title')!, '::after').width));
    if (!(w > 200)) throw new Error(`rule width ${w}`);
  } },
  { label: 'banner: a dotted surface; the proof line is a row', run: async (page) => {
    const r = await page.evaluate(() => { const b = document.querySelector('.mk-section-header[data-variant="banner"]')!; return { bg: getComputedStyle(b).backgroundImage.includes('radial-gradient'), proof: getComputedStyle(b.querySelector('.mk-section-header-proof')!).display }; });
    if (!r.bg || r.proof !== 'flex') throw new Error(JSON.stringify(r));
  } },

]);
