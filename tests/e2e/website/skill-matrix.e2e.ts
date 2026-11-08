import { cssSmoke } from '../lib/css-smoke.ts';

/**
 * Why: skill-matrix is a CSS-only website block (Resume & Portfolio) - the fixture instantiates every documented
 * example; these checks pin what each variant promises: every level a meter named by its label, the rows of a
 * group on shared columns, bars that fill the whole meter (VERIFIED: Chromium resolved a percentage height of its
 * meter bar to half the meter - tmp/probe-meter, 2026-11-07), five dots, pills without levels, and levels that
 * survive printing.
 */
const matrix = (v: string) => (v ? `.mk-skill-matrix[data-variant="${v}"]` : '.mk-skill-matrix:not([data-variant])');

await cssSmoke('skill-matrix', [
  { label: 'every level is a meter named by its label', run: async (page) => {
    const r = await page.$$eval('meter.mk-skill-matrix-level', (ms) => ms.filter((m) => (m as HTMLMeterElement).labels?.[0]?.textContent?.trim() !== m.closest('li')!.querySelector('.mk-skill-matrix-name')!.textContent!.trim()).map((m) => m.id));
    if (r.length) throw new Error(`unlabelled: ${r.join(', ')}`);
  } },
  { label: 'bars: a 0.375rem bar', selector: `${matrix('')} .mk-skill-matrix-level`, css: { height: '6px', 'border-top-left-radius': /^(999px|9\.99e\+0?2px)$/ } },
  { label: 'bars: the levels of a group start on one line (subgrid)', run: async (page) => {
    const r = await page.$$eval(`${matrix('')} .mk-skill-matrix-group:first-child .mk-skill-matrix-level`, (ms) => [...new Set(ms.map((m) => Math.round(m.getBoundingClientRect().left)))]);
    if (r.length !== 1) throw new Error(JSON.stringify(r));
  } },
  { label: 'bars: track and fill as high as the meter in Chromium (a length, not a percentage)', run: async (page) => {
    const s = await page.context().newCDPSession(page);
    await s.send('DOM.enable');
    await s.send('CSS.enable');
    const { root } = (await s.send('DOM.getDocument', { depth: -1, pierce: true })) as { root: { nodeName: string; nodeId: number; pseudo?: string; children?: unknown[]; shadowRoots?: unknown[] } };
    type N = { nodeName: string; nodeId: number; children?: N[]; shadowRoots?: N[] };
    const all: N[] = [];
    const walk = (n: N) => { all.push(n); for (const c of [...(n.shadowRoots ?? []), ...(n.children ?? [])]) walk(c); };
    walk(root as N);
    const meter = all.findIndex((n) => n.nodeName === 'METER');
    const heights: number[] = [];
    for (const n of all.slice(meter, meter + 5).filter((x) => x.nodeName === 'METER' || x.nodeName === 'DIV')) {
      const box = (await s.send('DOM.getBoxModel', { nodeId: n.nodeId })) as { model: { height: number } };
      heights.push(box.model.height);
    }
    if (heights.length < 4 || heights.some((h) => h !== heights[0])) throw new Error(`meter, inner, bar, fill heights: ${heights.join(', ')}`);
  } },
  { label: 'dots: a 5rem row of five 0.75rem dots (a mask over the meter)', selector: `${matrix('dots')} .mk-skill-matrix-level`, css: { width: '80px', height: '12px', 'mask-image': /radial-gradient/, 'mask-size': '20% 100%' } },
  { label: 'dots: the note keeps its column', selector: `${matrix('dots')} .mk-skill-matrix-note`, css: { 'text-align': 'end', 'white-space': 'nowrap' } },
  { label: 'stars: a 6.25rem row of five 1.25rem stars (a star mask over the meter)', selector: `${matrix('stars')} .mk-skill-matrix-level`, css: { width: '100px', height: '20px', 'mask-image': /svg/, 'mask-size': '20% 100%' } },
  { label: 'stars: the filled part is amber, half a step fills half a star', run: async (page) => {
    const r = await page.$$eval(`${matrix('stars')} meter`, (ms) => ms.map((m) => (m as HTMLMeterElement).value));
    if (!r.includes(4.5)) throw new Error(JSON.stringify(r));
    const shot = await page.locator(`${matrix('stars')} meter[value="4.5"]`).screenshot();
    const { PNG } = await import('pngjs');
    const png = PNG.sync.read(shot);
    const at = (x: number) => { const i = (Math.round(png.height / 2) * png.width + x) * 4; return [png.data[i]!, png.data[i + 1]!, png.data[i + 2]!]; };
    const fifth = png.width / 5;
    const amber = (c: number[]) => c[0]! > 200 && c[1]! > 120 && c[1]! < 190 && c[2]! < 80;
    // the middle of star 4 is amber, the left half of star 5 too, its right half not
    if (!amber(at(Math.round(fifth * 3.5))) || !amber(at(Math.round(fifth * 4.35))) || amber(at(Math.round(fifth * 4.65)))) throw new Error(JSON.stringify([at(Math.round(fifth * 3.5)), at(Math.round(fifth * 4.35)), at(Math.round(fifth * 4.65))]));
  } },
  { label: 'tags: the skills are pills that wrap, no levels', run: async (page) => {
    const r = await page.$$eval(`${matrix('tags')} .mk-skill-matrix-skill`, (ss) => ({ display: [...new Set(ss.map((s) => getComputedStyle(s).display))], border: getComputedStyle(ss[0]).borderTopWidth, list: getComputedStyle(ss[0].parentElement!).flexWrap, meters: ss.filter((s) => s.querySelector('meter')).length }));
    if (r.display.join() !== 'flex' || r.border !== '1px' || r.list !== 'wrap' || r.meters) throw new Error(JSON.stringify(r));
  } },
  { label: 'print: a group stays whole, the levels print', run: async (page) => {
    await page.emulateMedia({ media: 'print' });
    const r = await page.evaluate(() => ({ group: getComputedStyle(document.querySelector('.mk-skill-matrix-group')!).breakInside, level: getComputedStyle(document.querySelector('.mk-skill-matrix-level')!).printColorAdjust }));
    await page.emulateMedia({ media: 'screen' });
    if (r.group !== 'avoid' || r.level !== 'exact') throw new Error(JSON.stringify(r));
  } },
]);
