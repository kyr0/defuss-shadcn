import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: site-footer is CSS-only - 4-column link grid at wide width, the
 * semantic <hr class="separator"> rule, bottom row split, and labeled
 * social links (icon-only anchors must carry aria-labels).
 */
await cssSmoke('site-footer', [
  {
    label: 'nav resolves to four columns at fixture width',
    run: async (page) => {
      const cols = await page.evaluate(
        () => getComputedStyle(document.querySelector('.mk-footer-nav')!).gridTemplateColumns,
      );
      const n = cols.trim().split(/\s+/).length;
      if (n !== 4) throw new Error(`expected 4 columns, got "${cols}"`);
    },
  },
  {
    label: 'rule is the separator component (1px hr spanning the inner row)',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const hr = document.querySelector('hr.mk-footer-rule')!;
        const cs = getComputedStyle(hr);
        const hrBox = hr.getBoundingClientRect();
        const inner = document.querySelector('.mk-footer-inner')!.getBoundingClientRect();
        return { h: cs.height, bw: cs.borderTopWidth, hrW: hrBox.width, innerW: inner.width };
      });
      if (r.h !== '1px' || r.bw !== '0px') throw new Error(`height ${r.h}, border ${r.bw}`);
      // full width = container width minus its 2rem inline padding (~32px)
      if (r.hrW < r.innerW - 80) throw new Error(`hr ${r.hrW}px vs inner ${r.innerW}px - not full width`);
    },
  },
  {
    label: 'bottom row splits brand | meta at wide width',
    selector: '.mk-footer-bottom',
    css: { 'flex-direction': 'row', 'justify-content': 'space-between' },
  },
  {
    label: 'link lists have no bullets, links underline on hover only',
    selector: '.mk-footer-list',
    css: { 'list-style-type': 'none', padding: '0px' },
  },
  {
    label: 'icon-only social links are labeled; column headings are h3',
    run: async (page) => {
      const r = await page.evaluate(() => {
        // the default example (the first footer); variants below carry their own
        const first = document.querySelector('.mk-footer')!;
        const social = [...first.querySelectorAll('.mk-footer-social a')];
        const headings = first.querySelectorAll('.mk-footer-heading').length;
        return {
          unlabeled: social.filter((a) => !a.getAttribute('aria-label')).length,
          social: social.length,
          headings,
        };
      });
      if (r.social !== 2 || r.unlabeled > 0) throw new Error(`social links: ${r.social}, unlabeled: ${r.unlabeled}`);
      if (r.headings !== 4) throw new Error(`expected 4 column headings, got ${r.headings}`);
    },
  },
  { label: 'simple: one wrapping row', selector: '.mk-footer[data-variant="simple"] .mk-footer-inner', css: { 'flex-direction': 'row', 'flex-wrap': 'wrap' } },
  { label: 'top: the about column beside the link columns', run: async (page) => {
    const r = await page.evaluate(() => { const t = document.querySelector('.mk-footer-top')!; const a = t.querySelector('.mk-footer-about')!.getBoundingClientRect(); const n = t.querySelector('.mk-footer-nav')!.getBoundingClientRect(); return { beside: n.left > a.right, cols: getComputedStyle(t.querySelector('.mk-footer-nav')!).gridTemplateColumns.split(' ').filter((v) => v !== '0px').length, locale: !!document.querySelector('.mk-footer-locale .select') }; });
    if (!r.beside || r.cols !== 3 || !r.locale) throw new Error(JSON.stringify(r));
  } },
  { label: 'dark: inverted colors; the CTA band on top', run: async (page) => {
    const r = await page.evaluate(() => { const f = document.querySelector('.mk-footer[data-variant="dark"]')!; const cs = getComputedStyle(f); return { inverted: cs.backgroundColor !== getComputedStyle(document.body).backgroundColor, cta: getComputedStyle(f.querySelector('.mk-footer-cta')!).backgroundImage.includes('radial-gradient') }; });
    if (!r.inverted || !r.cta) throw new Error(JSON.stringify(r));
  } },
  { label: 'wordmark: huge, one line, scaled to the footer', run: async (page) => {
    const r = await page.evaluate(() => { const w = document.querySelector('.mk-footer-wordmark')!; const fs = parseFloat(getComputedStyle(w).fontSize); const width = w.closest('.mk-footer')!.getBoundingClientRect().width; return { ratio: Math.round((fs / width) * 100), ws: getComputedStyle(w).whiteSpace }; });
    if (r.ratio !== 26 || r.ws !== 'nowrap') throw new Error(JSON.stringify(r));
  } },
]);
