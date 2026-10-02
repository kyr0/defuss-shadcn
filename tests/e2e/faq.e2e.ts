import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: faq is CSS-only - 3-up icon-card grid at wide width, 64px icon tile
 * with a 24px primary icon inside, and question answers visible (not hidden
 * behind a disclosure).
 */
await cssSmoke('faq', [
  {
    label: 'grid resolves to three columns at fixture width',
    run: async (page) => {
      const cols = await page.evaluate(
        () => getComputedStyle(document.querySelector('.mk-faq-grid')!).gridTemplateColumns,
      );
      const n = cols.trim().split(/\s+/).length;
      if (n !== 3) throw new Error(`expected 3 columns, got "${cols}"`);
    },
  },
  {
    label: 'icon tile is a 64px bordered muted square',
    selector: '.mk-faq-icon',
    css: { width: '64px', height: '64px', 'border-width': '1px', 'border-radius': '10px' },
  },
  {
    label: 'tile icon is 24px and colored by the primary token (≠ muted)',
    distinct: [
      { selector: '.mk-faq-icon svg', prop: 'color' },
      { selector: '.mk-faq-answer', prop: 'color' },
    ],
  },
  {
    label: 'answers are visible text (no disclosure hiding)',
    run: async (page) => {
      const n = await page.evaluate(
        () =>
          [...document.querySelector('.mk-faq-grid')!.querySelectorAll('.mk-faq-answer')].filter(
            (p) => getComputedStyle(p).display !== 'none' && (p.textContent ?? '').length > 10,
          ).length,
      );
      if (n !== 6) throw new Error(`expected 6 visible answers, got ${n}`);
    },
  },
  {
    label: 'every answer links to its detail page',
    run: async (page) => {
      const r = await page.evaluate(() => ({ items: document.querySelector('.mk-faq-grid')!.querySelectorAll('.mk-faq-item').length, links: document.querySelector('.mk-faq-grid')!.querySelectorAll('.mk-faq-item .mk-faq-link[href]').length, d: getComputedStyle(document.querySelector('.mk-faq-link')!).display }));
      if (r.items !== r.links || !r.d.endsWith('flex')) throw new Error(JSON.stringify(r));
    },
  },
  { label: 'accordion: centered head, one Accordion group', run: async (page) => {
    const r = await page.evaluate(() => { const f = document.querySelector('.mk-faq[data-variant="accordion"]')!; return { align: getComputedStyle(f.querySelector('.mk-faq-head')!).textAlign, items: f.querySelectorAll('details.accordion-item[name="faq-acc"]').length, contact: !!f.querySelector('.mk-faq-contact .avatar-group') }; });
    if (r.align !== 'center' || r.items !== 6 || !r.contact) throw new Error(JSON.stringify(r));
  } },
  { label: 'split: the head sticky beside the questions', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-faq-split')!; const a = s.children[0].getBoundingClientRect(); const b = s.children[1].getBoundingClientRect(); return { pos: getComputedStyle(s.children[0]).position, beside: b.left > a.right }; });
    if (r.pos !== 'sticky' || !r.beside) throw new Error(JSON.stringify(r));
  } },
  { label: 'cards: bordered card per pair', selector: '.mk-faq-grid[data-variant="cards"] .mk-faq-item', css: { 'border-top-width': '1px', 'padding-top': '24px' } },
  { label: 'numbered: a counter before each pair', run: async (page) => {
    const r = await page.evaluate(() => [...document.querySelectorAll('.mk-faq-grid[data-variant="numbered"] .mk-faq-item')].slice(0, 2).map((e) => getComputedStyle(e, '::before').content));
    if (r.join() !== 'counter(mk-faq, decimal-leading-zero),counter(mk-faq, decimal-leading-zero)') throw new Error(r.join());
  } },
  { label: 'search: an icon inside the field; topics mark the current link', run: async (page) => {
    const r = await page.evaluate(() => ({ pad: getComputedStyle(document.querySelector('.mk-faq-search .input')!).paddingLeft, cur: !!document.querySelector('.mk-faq-topics a[aria-current]') }));
    if (r.pad !== '40px' || !r.cur) throw new Error(JSON.stringify(r));
  } },
]);
