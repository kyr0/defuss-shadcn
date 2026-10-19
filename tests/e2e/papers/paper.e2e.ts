import { inflateSync } from 'node:zlib';
import { cssSmoke } from '../lib/css-smoke.ts';

/**
 * Why: paper is a CSS-only page template (Papers) - the fixture is the docs
 * page's example fence (the technical report), so these checks pin what the
 * layout promises: the reading column and the wide track, the serif title,
 * the centered title block, numbered findings, right-aligned numbers, the
 * full-width footer - and that the parts it is built from render inside it.
 */
const box = (sel: string) => `(() => { const r = document.querySelector('${sel}').getBoundingClientRect(); return { l: Math.round(r.left), w: Math.round(r.width) }; })()`;

/**
 * What a printed PDF says about its pages, read from Chromium's (Skia's) output:
 * the page boxes, and per page content stream its `cm` operators - Skia writes
 * the device scale (72/300) first, then the CSS scale translated to the page's
 * content origin, whose x is the left page margin - and the [x, y] of every
 * text run (`Tm`, in CSS px inside the page). A page margin box (the page
 * number) is painted first, under a CSS scale at the page's own origin (0, 0):
 * its runs are `marginRuns`, in CSS px from the page's top left. VERIFIED:
 * (probes 2026-10-11, 2026-10-12) one stream per page, in page order.
 */
const pdfPages = (pdf: Buffer) => {
  const s = pdf.toString('latin1');
  const boxes = [...s.matchAll(/\/MediaBox\s*\[([^\]]+)\]/g)].map((m) => m[1].trim().split(/\s+/).map(Number));
  const pages: { marginLeftMm: number; runs: number[][]; marginRuns: number[][] }[] = [];
  for (const m of s.matchAll(/<<([^>]*?\/FlateDecode[^>]*?)>>\s*stream\r?\n/g)) {
    const start = m.index! + m[0].length;
    let ops: string;
    try {
      ops = inflateSync(pdf.subarray(start, start + Number(/\/Length\s+(\d+)/.exec(m[1])?.[1]))).toString('latin1');
    } catch {
      continue;
    }
    const cms = [...ops.matchAll(/([-\d.]+)\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+([-\d.]+)\s+([-\d.]+)\s+cm/g)];
    if (!/\bBT\b/.test(ops) || cms.length < 2) continue; // fonts, CMaps
    // each text run belongs to the last transform before it: the page's origin (a margin box) or the content's
    const origin = (at: number) => cms.filter((c) => c.index! < at).pop()!;
    const atPageOrigin = (c: RegExpMatchArray) => +c[2] === 0 && +c[3] === 0;
    const content = cms.slice(1).find((c) => !atPageOrigin(c)) ?? cms[1];
    const runs = [...ops.matchAll(/([-\d.]+)\s+([-\d.]+)\s+Tm/g)];
    pages.push({
      marginLeftMm: Math.round(((+content[2] * +cms[0][1]) / 72) * 25.4 * 10) / 10,
      runs: runs.filter((t) => !atPageOrigin(origin(t.index!))).map((t) => [+t[1], +t[2]]),
      marginRuns: runs.filter((t) => atPageOrigin(origin(t.index!))).map((t) => [+t[1], +t[2]]),
    });
  }
  return { boxes, pages };
};

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
  { label: 'classic variant: serif body, untinted abstract, small-caps section heads without a rule', run: async (page) => {
    const r = await page.evaluate(() => {
      const cs = (id: string) => getComputedStyle(document.getElementById(id)!);
      const probe = document.createElement('span');
      probe.style.fontFamily = 'var(--font-serif)';
      document.getElementById('pv-classic')!.append(probe);
      const serif = getComputedStyle(probe).fontFamily;
      probe.remove();
      return { body: cs('pv-classic').fontFamily === serif, abstract: getComputedStyle(document.getElementById('pv-classic-ap')!.parentElement!).backgroundColor, caps: cs('pv-classic-s').fontVariantCaps, rule: cs('pv-classic-s').borderBottomStyle, align: cs('pv-classic-ap').textAlign };
    });
    if (!r.body || r.abstract !== 'rgba(0, 0, 0, 0)' || r.caps !== 'small-caps' || r.rule !== 'none' || r.align !== 'justify') throw new Error(JSON.stringify(r));
  } },
  { label: 'minimal variant: the title block flush start, the abstract under a hairline', run: async (page) => {
    const r = await page.evaluate(() => {
      const cs = (id: string) => getComputedStyle(document.getElementById(id)!);
      return { hero: cs('pv-minimal-hero').textAlign, authors: cs('pv-minimal-authors').justifyContent, top: cs('pv-minimal-abs').borderTopStyle, bg: cs('pv-minimal-abs').backgroundColor };
    });
    if (r.hero !== 'start' || r.authors !== 'flex-start' || r.top !== 'solid' || r.bg !== 'rgba(0, 0, 0, 0)') throw new Error(JSON.stringify(r));
  } },
  { label: 'two-column composition: a typeset block in the wide track sets two columns wide, one on a phone', run: async (page) => {
    const offset = () => page.evaluate(() => document.getElementById('pv-cols-p3')!.getBoundingClientRect().left - document.getElementById('pv-cols-p1')!.getBoundingClientRect().left);
    const wide = await offset();
    const pad = () => page.evaluate(() => getComputedStyle(document.getElementById('pv-classic-ap')!.parentElement!).paddingLeft);
    const widePad = await pad();
    await page.setViewportSize({ width: 390, height: 844 });
    const phone = await offset();
    // the classic abstract drops its side padding on a narrow paper (container query)
    const phonePad = await pad();
    await page.setViewportSize({ width: 1280, height: 900 });
    if (!(wide > 200) || phone !== 0 || widePad !== '40px' || phonePad !== '0px') throw new Error(JSON.stringify({ wide, phone, widePad, phonePad }));
  } },
  { label: 'a tag inside an indented paragraph is not indented itself (text-indent does not leak into the inline-block)', run: async (page) => {
    const r = await page.$eval('#pv-tag-indent', (t) => { const range = document.createRange(); range.selectNodeContents(t); return { text: range.getBoundingClientRect().left - t.getBoundingClientRect().left, pad: parseFloat(getComputedStyle(t).paddingLeft), indent: getComputedStyle(t).textIndent }; });
    if (Math.abs(r.text - r.pad) > 1 || r.indent !== '0px') throw new Error(JSON.stringify(r));
  } },
  { label: 'a wrapping caption inside a justified setting keeps every line centered (text-align-last does not leak)', run: async (page) => {
    const r = await page.$eval('#pv-cap-wrap', (c) => { const range = document.createRange(); range.selectNodeContents(c); const lines = [...range.getClientRects()].filter((x) => x.width > 40); const box = c.getBoundingClientRect(); const last = lines[lines.length - 1]; return { lines: lines.length, off: Math.abs((last.left + last.right) / 2 - (box.left + box.right) / 2), lastAlign: getComputedStyle(c).textAlignLast }; });
    if (r.lines < 2 || r.off > 2) throw new Error(JSON.stringify(r));
  } },
  { label: 'print: data-print sizes the PDF (A4 / Letter) without a format argument, the 0.8 scale keeps two columns, a column break and a page break land, inner binding mirrors the margins', run: async (page) => {
    // the print article alone, printed on the CSS page size (preferCSSPageSize - Letter otherwise)
    const p = await page.context().browser()!.newPage();
    try {
      await p.goto(page.url());
      await p.evaluate(() => document.body.replaceChildren(document.getElementById('pv-print')!));
      const print = async (attrs: Record<string, string | null>) => {
        await p.evaluate((a) => { const el = document.getElementById('pv-print')!; for (const [k, v] of Object.entries(a)) { if (v === null) el.removeAttribute(k); else el.setAttribute(k, v); } }, attrs);
        return pdfPages(await p.pdf({ preferCSSPageSize: true }));
      };
      const near = (got: number[], want: number[], tol: number) => got.length === want.length && got.every((v, i) => Math.abs(v - want[i]) <= tol);
      const a4 = await print({});
      const sizes = a4.boxes.map((b) => [b[2], b[3]]);
      if (!sizes.every((b) => near(b, [595.28, 841.89], 1.5))) throw new Error(`not A4: ${JSON.stringify(sizes)}`);
      if (a4.pages.length !== 2) throw new Error(`the page break: ${a4.pages.length} pages`);
      // page 1 paints the heading, then the three paragraphs: balanced columns alone would set the
      // first two in the left column - the break starts the right column with the second
      const [, p1, p2, p3] = a4.pages[0].runs;
      if (!(p3 && Math.abs(p1[1] - p2[1]) < 1 && p2[0] - p1[0] > 200 && p3[0] === p2[0] && p3[1] > p2[1])) throw new Error(`the column break: ${JSON.stringify(a4.pages[0].runs)}`);
      if (!near(a4.pages.map((pg) => pg.marginLeftMm), [20, 20], 1)) throw new Error(`A4 margins: ${JSON.stringify(a4.pages.map((pg) => pg.marginLeftMm))}`);
      // the page number: none on the first page, one run on the second - centered (210mm = 794px), in the 20mm bottom margin
      const [n1, n2] = a4.pages.map((pg) => pg.marginRuns);
      if (!(n1.length === 0 && n2.length === 1 && Math.abs(n2[0][0] - 397) < 12 && n2[0][1] > 1123 - 76 && n2[0][1] < 1123)) throw new Error(`page numbers: ${JSON.stringify([n1, n2])}`);
      // bound: page 1 is a right page (inner margin left, 25mm), page 2 a left page (outer margin left, 15mm)
      const bound = await print({ 'data-binding': 'inner' });
      if (!near(bound.pages.map((pg) => pg.marginLeftMm), [25, 15], 1)) throw new Error(`inner binding: ${JSON.stringify(bound.pages.map((pg) => pg.marginLeftMm))}`);
      const letter = await print({ 'data-print': 'letter', 'data-binding': null });
      if (!letter.boxes.every((b) => near([b[2], b[3]], [612, 792], 1))) throw new Error(`not Letter: ${JSON.stringify(letter.boxes)}`);
    } finally {
      await p.close();
    }
  } },
  { label: 'a record that may split runs over the two columns, each piece framed and wrapping (a scroll container never splits); its caption stays with the last piece - on screen and in print', run: async (page) => {
    for (const media of ['screen', 'print'] as const) {
      await page.emulateMedia({ media });
      const r = await page.evaluate(() => {
        const el = (id: string) => document.getElementById(id)!;
        const pre = getComputedStyle(el('pv-split-pre'));
        const pieces = [...el('pv-split-pre').getClientRects()];
        const last = pieces[pieces.length - 1];
        const cap = el('pv-split-cap').getBoundingClientRect();
        return {
          figure: getComputedStyle(el('pv-split-fig')).display,
          pre: [pre.overflowX, pre.whiteSpace, pre.boxDecorationBreak, pre.textAlign],
          pieces: pieces.length,
          withLast: Math.abs(cap.left - last.left) < 2 && cap.top >= last.bottom - 1,
        };
      });
      await page.emulateMedia({ media: null });
      const want = { figure: 'block', pre: ['visible', 'pre-wrap', 'clone', 'start'], pieces: 2, withLast: true };
      if (JSON.stringify(r) !== JSON.stringify(want)) throw new Error(`${media}: ${JSON.stringify(r)}`);
    }
  } },
  { label: 'print: every figure prints whole unless it may split; the contents list stays on screen; the A4 page numbers its pages from the second (a margin box)', run: async (page) => {
    await page.emulateMedia({ media: 'print' });
    const r = await page.evaluate(() => ({
      kept: [...new Set([...document.querySelectorAll('.paper figure:not([data-break-inside="allow"], .bibtex)')].map((f) => getComputedStyle(f).breakInside))],
      toc: getComputedStyle(document.getElementById('pv-print-toc')!).display,
      // the @page rules: a number at the foot of every page, none on the first
      foot: [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules]; } catch { return []; } })
        .flatMap((r) => (r instanceof CSSLayerBlockRule ? [...r.cssRules] : [r]))
        .filter((r): r is CSSPageRule => r instanceof CSSPageRule && /^paper-a4(:first)?$/.test(r.selectorText))
        .map((r) => `${r.selectorText} ${[...r.cssRules].map((m) => (m as CSSStyleRule & { name: string }).name + ' ' + (m as CSSStyleRule).style.getPropertyValue('content')).join(' ')}`),
    }));
    await page.emulateMedia({ media: null });
    if (JSON.stringify(r) !== JSON.stringify({ kept: ['avoid'], toc: 'none', foot: ['paper-a4 bottom-center counter(page)', 'paper-a4:first bottom-center none'] })) throw new Error(JSON.stringify(r));
  } },
  { label: 'narrow page: the abstract stops justifying (container query)', run: async (page) => {
    await page.setViewportSize({ width: 480, height: 900 });
    const align = await page.$eval('.paper-abstract > p', (p) => getComputedStyle(p).textAlign);
    if (align !== 'start') throw new Error(align);
  } },
]);
