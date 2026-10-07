import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: paper is a CSS-only page template (Papers) - the fixture is the docs
 * page's example fence (the technical report), so these checks pin what the
 * layout promises: the reading column and the wide track, the serif title,
 * the centered title block, numbered findings, right-aligned numbers, the
 * full-width footer - and that the parts it is built from render inside it.
 */
const box = (sel: string) => `(() => { const r = document.querySelector('${sel}').getBoundingClientRect(); return { l: Math.round(r.left), w: Math.round(r.width) }; })()`;

await cssSmoke('paper', [
  { label: 'the title is the theme serif, centered in the title block', selector: '.paper-title', css: { textAlign: 'center', fontWeight: '500' } },
  { label: 'the title font is --font-serif', run: async (page) => {
    const r = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.fontFamily = 'var(--font-serif)';
      document.querySelector('.paper')!.append(probe);
      const want = getComputedStyle(probe).fontFamily;
      probe.remove();
      return { want, got: getComputedStyle(document.querySelector('.paper-title')!).fontFamily };
    });
    if (r.want !== r.got) throw new Error(JSON.stringify(r));
  } },
  { label: 'prose sits in the reading column (≤ 46rem), centered on the page', run: async (page) => {
    const r = await page.evaluate(`({ a: ${box('.paper-abstract')}, p: ${box('.paper')} })`) as { a: { l: number; w: number }; p: { l: number; w: number } };
    if (r.a.w > 46 * 16 + 1) throw new Error(`abstract ${r.a.w}px wide`);
    const left = r.a.l - r.p.l, right = r.p.l + r.p.w - (r.a.l + r.a.w);
    if (Math.abs(left - right) > 2) throw new Error(`not centered: ${left} / ${right}`);
  } },
  { label: 'the teaser and .paper-wide use the wider track', run: async (page) => {
    const r = await page.evaluate(`({ a: ${box('.paper-abstract')}, t: ${box('.paper-teaser')}, w: ${box('.paper-wide')} })`) as Record<string, { w: number }>;
    if (!(r.t.w > r.a.w && r.w.w > r.a.w)) throw new Error(JSON.stringify(r));
  } },
  { label: 'the footer spans the page', run: async (page) => {
    const r = await page.evaluate(`({ f: ${box('.paper-footer')}, p: ${box('.paper')} })`) as Record<string, { w: number }>;
    if (r.f.w !== r.p.w) throw new Error(JSON.stringify(r));
  } },
  { label: 'authors and resource buttons line up in centered rows', selector: '.paper-links', css: { display: 'flex', justifyContent: 'center' } },
  { label: 'resource buttons are pills', run: async (page) => {
    const r = await page.$eval('.paper-links .btn', (b) => parseFloat(getComputedStyle(b).borderTopLeftRadius) >= b.getBoundingClientRect().height / 2 - 1);
    if (!r) throw new Error('not a pill');
  } },
  { label: 'findings number themselves ("Finding 1")', run: async (page) => {
    const r = await page.$eval('.paper-findings:not(.paper-tags) > li', (li) => getComputedStyle(li, '::before').content);
    if (!/Finding/.test(r)) throw new Error(r);
  } },
  { label: 'number cells are right-aligned, tabular', selector: '.paper-table td[data-num]', css: { textAlign: 'end' } },
  { label: 'the abstract is a tinted panel with an accent rule', distinct: [{ selector: '.paper-abstract', prop: 'backgroundColor' }, { selector: '.paper', prop: 'backgroundColor' }] },
  { label: 'the citation is the BibTeX component (tabs + copy), its code scrolls sideways', selector: '.paper-bibtex .bibtex .bibtex-code', css: { overflowX: 'auto' } },
  { label: 'the table of contents links every numbered section, in two columns', run: async (page) => {
    const r = await page.evaluate(() => {
      const toc = document.querySelector('.paper-toc')!;
      const hrefs = [...toc.querySelectorAll('a')].map((a) => a.getAttribute('href')!);
      return { missing: hrefs.filter((h) => !document.querySelector(h)), sections: document.querySelectorAll('.paper-section > h2[id]').length, linked: hrefs.length, cols: getComputedStyle(toc.querySelector(':scope > ol')!).columnCount };
    });
    if (r.missing.length || r.linked < r.sections || r.cols !== '2') throw new Error(JSON.stringify(r));
  } },
  { label: 'epistemic tags are solid chips in three distinct chart colors', distinct: [{ selector: '.paper-tag[data-tag="verified"]', prop: 'backgroundColor' }, { selector: '.paper-tag[data-tag="hypothesis"]', prop: 'backgroundColor' }, { selector: '.paper-tag[data-tag="unknown"]', prop: 'backgroundColor' }] },
  { label: 'VERIFIED is white text at >= 4.5:1, also on a theme whose chart-2 is light', run: async (page) => {
    const r = await page.evaluate(() => {
      const tag = document.querySelector<HTMLElement>('.paper-tag[data-tag="verified"]')!;
      const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
      const rgb = (css: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      const lum = (c: number[]) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const read = () => { const s = getComputedStyle(tag); const fg = rgb(s.color), bg = rgb(s.backgroundColor); const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x); return { fg: fg.join(','), ratio: +((a + 0.05) / (b + 0.05)).toFixed(2) }; };
      const base = read();
      tag.style.setProperty('--chart-2', 'oklch(0.85 0.12 150)');
      const light = read();
      tag.style.removeProperty('--chart-2');
      return { base, light };
    });
    for (const k of ['base', 'light'] as const) if (r[k].fg !== '255,255,255' || r[k].ratio < 4.5) throw new Error(JSON.stringify(r));
  } },
  { label: 'the figures mount their charts (echarts, SVG)', run: async (page) => {
    await page.waitForFunction(() => document.querySelectorAll('.paper-chart svg').length === document.querySelectorAll('.paper-chart').length && document.querySelectorAll('.paper-chart').length >= 3, undefined, { timeout: 15000 });
  } },
  { label: 'the teaser diagram draws its wires inside the paper', run: async (page) => {
    await page.waitForFunction(() => document.querySelectorAll('#paper-loop .diagram-wire').length >= 6, undefined, { timeout: 8000 });
  } },
  { label: 'narrow page: the abstract stops justifying (container query)', run: async (page) => {
    await page.setViewportSize({ width: 480, height: 900 });
    const align = await page.$eval('.paper-abstract > p', (p) => getComputedStyle(p).textAlign);
    if (align !== 'start') throw new Error(align);
  } },
]);
