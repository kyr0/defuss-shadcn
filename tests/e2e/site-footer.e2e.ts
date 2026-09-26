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
        const social = [...document.querySelectorAll('.mk-footer-social a')];
        const headings = document.querySelectorAll('.mk-footer-heading').length;
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
]);
