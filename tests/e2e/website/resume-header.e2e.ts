import { cssSmoke } from '../lib/css-smoke.ts';

/**
 * Why: resume-header is a CSS-only website block (Resume & Portfolio) - the fixture instantiates every documented
 * example; these checks pin the layout each variant promises: the text beside the portrait and under it when
 * narrow, the name scaled by the header's width, centered and compact, and the actions leaving a printed page.
 */
await cssSmoke('resume-header', [
  { label: 'default: the text beside the portrait, on one row', run: async (page) => {
    const r = await page.evaluate(() => { const h = document.querySelector('.mk-resume-header:not([data-variant])')!; const p = h.querySelector('.mk-resume-header-photo')!.getBoundingClientRect(); const b = h.querySelector('.mk-resume-header-body')!.getBoundingClientRect(); return { beside: b.left > p.right, overlap: b.top < p.bottom && b.bottom > p.top }; });
    if (!r.beside || !r.overlap) throw new Error(JSON.stringify(r));
  } },
  { label: 'the name scales with the header: 3.25rem wide, near 2rem narrow', run: async (page) => {
    const r = await page.evaluate(() => {
      const h = document.querySelector('.mk-resume-header:not([data-variant])') as HTMLElement;
      const size = () => parseFloat(getComputedStyle(h.querySelector('.mk-resume-header-name')!).fontSize);
      const wide = size();
      h.style.width = '360px';
      const narrow = size();
      const p = h.querySelector('.mk-resume-header-photo')!.getBoundingClientRect();
      const under = h.querySelector('.mk-resume-header-body')!.getBoundingClientRect().top >= p.bottom;
      h.style.width = '';
      return { wide, narrow, under };
    });
    if (r.wide !== 52 || r.narrow > 34 || r.narrow < 32 || !r.under) throw new Error(JSON.stringify(r));
  } },
  { label: 'the availability line is a pill that hugs its sentence', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-resume-header-status')!; const cs = getComputedStyle(s); return { border: cs.borderTopWidth, radius: parseFloat(cs.borderTopLeftRadius) >= 999, hugs: s.getBoundingClientRect().width < s.parentElement!.getBoundingClientRect().width / 2 }; });
    if (r.border !== '1px' || !r.radius || !r.hugs) throw new Error(JSON.stringify(r));
  } },
  { label: 'the status dot keeps its success colour', distinct: [ { selector: '.mk-resume-header-status .indicator-dot[data-variant="success"]', prop: 'background-color' }, { selector: '.mk-resume-header-status .indicator-dot[data-variant="warning"]', prop: 'background-color' } ] },
  { label: 'the profiles are a labelled list of icon links, each named', run: async (page) => {
    const r = await page.evaluate(() => [...document.querySelectorAll('.mk-resume-header-links a')].map((a) => a.getAttribute('aria-label')));
    if (r.join() !== 'GitHub,LinkedIn,Website') throw new Error(JSON.stringify(r));
  } },
  { label: 'centered: the portrait above, round, on the axis', run: async (page) => {
    const r = await page.evaluate(() => { const h = document.querySelector('.mk-resume-header[data-variant="centered"]')!; const hb = h.getBoundingClientRect(); const p = h.querySelector('.mk-resume-header-photo')!; const pb = p.getBoundingClientRect(); const b = h.querySelector('.mk-resume-header-body')!.getBoundingClientRect(); return { axis: Math.abs((pb.left + pb.right) / 2 - (hb.left + hb.right) / 2), above: b.top >= pb.bottom, radius: getComputedStyle(p).borderTopLeftRadius, align: getComputedStyle(h).textAlign }; });
    if (r.axis > 2 || !r.above || r.radius !== '50%' || r.align !== 'center') throw new Error(JSON.stringify(r));
  } },
  { label: 'compact: a small portrait, a rule below', selector: '.mk-resume-header[data-variant="compact"]', css: { 'border-bottom-width': '1px' } },
  { label: 'compact: the portrait is 5rem', selector: '.mk-resume-header[data-variant="compact"] .mk-resume-header-photo', css: { width: '80px', height: '80px' } },
  { label: 'poster: a huge uppercase name beside a tilted portrait, the role a primary label', run: async (page) => {
    const r = await page.evaluate(() => { const h = document.querySelector('.mk-resume-header[data-variant="poster"]')!; const n = getComputedStyle(h.querySelector('.mk-resume-header-name')!); const p = h.querySelector('.mk-resume-header-photo')!; const role = getComputedStyle(h.querySelector('.mk-resume-header-role')!); const b = h.querySelector('.mk-resume-header-body')!.getBoundingClientRect(); return { size: parseFloat(n.fontSize), upper: n.textTransform, tilt: getComputedStyle(p).rotate, beside: p.getBoundingClientRect().left >= b.right, label: role.backgroundColor !== 'rgba(0, 0, 0, 0)' && role.rotate !== 'none' }; });
    if (r.size < 100 || r.upper !== 'uppercase' || r.tilt !== '4deg' || !r.beside || !r.label) throw new Error(JSON.stringify(r));
  } },
  { label: 'poster: a shape utility reshapes the portrait (corner-blob beats the block radius)', selector: '.mk-resume-header[data-variant="poster"] .mk-resume-header-photo', css: { 'border-top-left-radius': '63% 55%' } },
  { label: 'split: text and a 4:5 portrait side by side, the portrait filling its column', run: async (page) => {
    const r = await page.evaluate(() => { const h = document.querySelector('.mk-resume-header[data-variant="split"]')!; const p = h.querySelector('.mk-resume-header-photo')!.getBoundingClientRect(); const b = h.querySelector('.mk-resume-header-body')!.getBoundingClientRect(); return { beside: p.left >= b.right, ratio: Math.round((p.height / p.width) * 100) / 100, arch: getComputedStyle(h.querySelector('.mk-resume-header-photo')!).borderBottomLeftRadius }; });
    if (!r.beside || r.ratio !== 1.25 || r.arch !== '0px') throw new Error(JSON.stringify(r));
  } },
  { label: 'poster and split stack when narrow - the portrait first, the split one across the row in landscape', run: async (page) => {
    const r = await page.evaluate(() => [...document.querySelectorAll('.mk-resume-header:is([data-variant="poster"], [data-variant="split"])')].map((h) => {
      (h as HTMLElement).style.width = '360px';
      const photo = h.querySelector('.mk-resume-header-photo')!;
      const p = photo.getBoundingClientRect();
      const b = h.querySelector('.mk-resume-header-body')!.getBoundingClientRect();
      const out = { v: h.getAttribute('data-variant'), above: b.top >= p.bottom - 8, overflow: h.scrollWidth > h.clientWidth, full: Math.abs(p.width - h.clientWidth) < 1, ratio: getComputedStyle(photo).aspectRatio };
      (h as HTMLElement).style.width = '';
      return out;
    }));
    const split = r.find((x) => x.v === 'split');
    if (r.some((x) => !x.above || x.overflow) || !split?.full || split.ratio !== '4 / 3') throw new Error(JSON.stringify(r));
  } },
  { label: 'print: the actions leave the page, the facts stay', run: async (page) => {
    await page.emulateMedia({ media: 'print' });
    const r = await page.evaluate(() => ({ actions: getComputedStyle(document.querySelector('.mk-resume-header-actions')!).display, facts: getComputedStyle(document.querySelector('.mk-resume-header-facts')!).display }));
    await page.emulateMedia({ media: 'screen' });
    if (r.actions !== 'none' || r.facts === 'none') throw new Error(JSON.stringify(r));
  } },
]);
