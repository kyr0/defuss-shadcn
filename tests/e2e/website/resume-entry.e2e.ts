import { cssSmoke } from '../lib/css-smoke.ts';

/**
 * Why: resume-entry is a CSS-only website block (Resume & Portfolio) - the fixture instantiates every documented
 * example; these checks pin what each variant promises: a logo column and rules (default), the head's two sides,
 * the promotion path, one line through the logos (timeline), the dates in a column of their own (columns), the
 * narrow fold of the container query and whole entries on paper.
 */
const list = (v: string) => (v ? `.mk-resume-entries[data-variant="${v}"]` : '.mk-resume-entries:not([data-variant])');

await cssSmoke('resume-entry', [
  { label: 'default: a 2.75rem logo column', selector: `${list('')} .mk-resume-entry-mark`, css: { width: '44px', height: '44px' } },
  { label: 'default: a rule between entries, none above the first', run: async (page) => {
    const r = await page.$$eval(`${list('')} > .mk-resume-entry`, (es) => es.map((e) => getComputedStyle(e).borderTopWidth));
    if (r.join() !== '0px,1px,1px') throw new Error(JSON.stringify(r));
  } },
  { label: 'head: title and organisation start, when and where on the end side of the same rows', run: async (page) => {
    const r = await page.evaluate(() => { const h = document.querySelector('.mk-resume-entries:not([data-variant]) .mk-resume-entry-head')!; const b = (s: string) => h.querySelector(s)!.getBoundingClientRect(); const t = b('.mk-resume-entry-title'), w = b('.mk-resume-entry-when'), o = b('.mk-resume-entry-org'), wh = b('.mk-resume-entry-where'); return { whenEnd: w.left > t.right, row1: Math.abs(w.top - t.top) < 6, whereEnd: wh.left > o.right, row2: wh.top >= t.bottom - 1 }; });
    if (!r.whenEnd || !r.row1 || !r.whereEnd || !r.row2) throw new Error(JSON.stringify(r));
  } },
  { label: 'roles: a dot per role (the newest in another colour) and a line from the first to the next', run: async (page) => {
    const r = await page.evaluate(() => { const li = [...document.querySelectorAll('.mk-resume-entry-roles > li')]; const pe = (e: Element, p: string) => getComputedStyle(e, p); return { dots: li.map((e) => pe(e, '::before').width), first: pe(li[0], '::before').backgroundColor, second: pe(li[1], '::before').backgroundColor, line: pe(li[0], '::after').width, lastLine: pe(li[1], '::after').content }; });
    if (r.dots.join() !== '8px,8px' || r.first === r.second || r.line !== '2px' || r.lastLine !== 'none') throw new Error(JSON.stringify(r));
  } },
  { label: 'timeline: no rules - a line under each logo but the last', run: async (page) => {
    const r = await page.$eval(list('timeline'), (l) => [...l.querySelectorAll(':scope > .mk-resume-entry')].map((e) => [getComputedStyle(e).borderTopWidth, getComputedStyle(e, '::before').content, getComputedStyle(e, '::before').width]));
    if (JSON.stringify(r) !== JSON.stringify([['0px', '""', '2px'], ['0px', '""', '2px'], ['0px', 'none', 'auto']])) throw new Error(JSON.stringify(r));
  } },
  { label: 'timeline: an empty mark is a round dot', selector: `${list('timeline')} .mk-resume-entry-mark`, css: { width: '14px', height: '14px', 'border-top-left-radius': '50%' } },
  { label: 'columns: when in a column of its own on the start side, no logos', run: async (page) => {
    const r = await page.evaluate(() => { const e = document.querySelector('.mk-resume-entries[data-variant="columns"] .mk-resume-entry')!; const w = e.querySelector('.mk-resume-entry-when')!.getBoundingClientRect(); const t = e.querySelector('.mk-resume-entry-title')!.getBoundingClientRect(); return { start: w.right <= t.left, top: Math.abs(w.top - t.top) < 6, width: Math.round(w.width) }; });
    if (!r.start || !r.top || r.width !== 128) throw new Error(JSON.stringify(r));
  } },
  { label: 'narrow: when moves under the title, the date column folds in', run: async (page) => {
    const r = await page.evaluate(() => {
      const out: Record<string, unknown> = {};
      for (const v of ['default', 'columns']) {
        const l = document.querySelector(v === 'default' ? '.mk-resume-entries:not([data-variant])' : '.mk-resume-entries[data-variant="columns"]') as HTMLElement;
        l.style.width = '320px';
        const t = l.querySelector('.mk-resume-entry-title')!.getBoundingClientRect();
        const w = l.querySelector('.mk-resume-entry-when')!;
        out[v] = { under: w.getBoundingClientRect().top >= t.bottom - 1, position: getComputedStyle(w).position, overflow: l.scrollWidth <= l.clientWidth };
        l.style.width = '';
      }
      return out;
    });
    const s = JSON.stringify(r);
    if (s !== JSON.stringify({ default: { under: true, position: 'static', overflow: true }, columns: { under: true, position: 'static', overflow: true } })) throw new Error(s);
  } },
  { label: 'horizontal: the entries side by side, a line from each mark to the next, the date first', run: async (page) => {
    const r = await page.evaluate(() => {
      const l = document.querySelector('.mk-resume-entries[data-variant="horizontal"]') as HTMLElement;
      const es = [...l.querySelectorAll(':scope > .mk-resume-entry')];
      const marks = es.map((e) => e.querySelector('.mk-resume-entry-mark')!.getBoundingClientRect());
      const line = getComputedStyle(es[0]!, '::before');
      const head = es[0]!.querySelector('.mk-resume-entry-head')!;
      return { row: marks.every((m) => Math.abs(m.top - marks[0]!.top) < 1), ltr: marks.every((m, i) => i === 0 || m.left > marks[i - 1]!.left), line: line.height, last: getComputedStyle(es.at(-1)!, '::before').content, first: head.querySelector('.mk-resume-entry-when')!.getBoundingClientRect().top < head.querySelector('.mk-resume-entry-title')!.getBoundingClientRect().top, scroll: getComputedStyle(l).overflowX };
    });
    if (!r.row || !r.ltr || r.line !== '2px' || r.last !== 'none' || !r.first || r.scroll !== 'auto') throw new Error(JSON.stringify(r));
  } },
  { label: 'horizontal: narrow, it scrolls inside itself; printed, it stacks', run: async (page) => {
    const r = await page.evaluate(() => { const l = document.querySelector('.mk-resume-entries[data-variant="horizontal"]') as HTMLElement; l.style.width = '320px'; const out = { scrolls: l.scrollWidth > l.clientWidth, page: document.documentElement.scrollWidth <= innerWidth }; l.style.width = ''; return out; });
    await page.emulateMedia({ media: 'print' });
    const p = await page.$eval('.mk-resume-entries[data-variant="horizontal"]', (l) => ({ flow: getComputedStyle(l).gridAutoFlow, overflow: getComputedStyle(l).overflowX }));
    await page.emulateMedia({ media: 'screen' });
    if (!r.scrolls || !r.page || p.flow !== 'row' || p.overflow !== 'visible') throw new Error(JSON.stringify({ r, p }));
  } },
  { label: 'projects: Project Items in a grid under the entry', run: async (page) => {
    const r = await page.$eval('.mk-resume-entry-projects', (g) => ({ display: getComputedStyle(g).display, items: g.querySelectorAll(':scope > li > .mk-project-item').length, cols: getComputedStyle(g).gridTemplateColumns.split(' ').length, heading: g.querySelector('.mk-project-item-title')!.tagName }));
    if (r.display !== 'grid' || r.items !== 3 || r.cols < 2 || r.heading !== 'H4') throw new Error(JSON.stringify(r));
  } },
  { label: 'print: an entry never splits across pages', run: async (page) => {
    await page.emulateMedia({ media: 'print' });
    const r = await page.$eval('.mk-resume-entry', (e) => getComputedStyle(e).breakInside);
    await page.emulateMedia({ media: 'screen' });
    if (r !== 'avoid') throw new Error(r);
  } },
]);
