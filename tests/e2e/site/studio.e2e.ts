import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { chromium, webkit, type BrowserContext, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';
import { componentDirs, partsFileName } from '../../../src/documentation/lib/component-dirs.ts';
import { isPartMeta } from '../../../src/documentation/lib/mdx-example.ts';

/**
 * Why: the Studio (pages/wysiwyg-editors/studio.mdx) is the docs' Rapid Agentic Development tool - a person composes
 * an app from the docs' own examples and hands it on. This drives the full-screen page the build generates
 * (full-studio.html: all.* + the extra bundles its markup uses) like a user: the Border Layout (a divider dragged, a
 * side folded from the toolbar, the sizes kept) and its side views as Panels (minimized, maximized, Escape), the
 * library (every docs example under its section and page, and ahead of them each component its examples show side by
 * side, alone) and the picked entry's static frame, a click
 * and mouse drags into the canvas - by the preview's grip and from a tree row, in Chromium and in WebKit - the
 * selection tree (the path to the selected element and everything inside it, 20-50% of the inspector), the Property
 * Grid and its class editor (a Combobox tag input of the element's, its component's and the system's classes), dense
 * panels and trees, the State panel - folded with no state, as high as its states with one -, the state of a component with a script (locked in the page, its schema's states in a Tree Grid, a value set →
 * its render()'s markup in the page: an Accordion opened, a Tree View branch closed and kept closed, a Slider's
 * value) and the card of one without, pages, the project - an example's <style>, a minimized panel - kept across a
 * reload, the preview running the page, the app exported as a ZIP and served on its own (two dialogs inserted from
 * one example, each trigger opening its own), the project file round trip, "Copy for an agent", and "Open in Studio"
 * from a docs card. GrapesJS is served offline from the devDependency; the exported pages' CDN links from dist/.
 */

const ROOT = join(import.meta.dirname, '..', '..', '..');
const OUT = join(ROOT, 'output', 'studio');
const server = startServer();
const browser = await chromium.launch();
const version = (JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { version: string }).version;
const STUDIO = `${server.url}/dist/documentation/wysiwyg-editors/full-studio.html`;
const CDN = `https://cdn.jsdelivr.net/gh/kyr0/defuss-shadcn@v${version}/dist/`;
type LibraryPage = { slug: string; title: string; type: string; examples: string[]; individual: number[]; pages: LibraryPage[] };
const DIST_DOCS = join(ROOT, 'dist', 'documentation');
const library = JSON.parse(readFileSync(join(DIST_DOCS, 'studio', 'library.json'), 'utf8')) as {
  sections: { heading: string; icon: string; pages: LibraryPage[] }[];
  utilities: { group: string; classes: string[] }[];
};
const PAGES: LibraryPage[] = [];
const index = (p: LibraryPage) => {
  PAGES.push(p);
  p.pages.forEach(index);
};
library.sections.forEach((s) => s.pages.forEach(index));
const EXAMPLES = PAGES.reduce((n, p) => n + p.examples.length, 0);
const INDIVIDUAL = PAGES.reduce((n, p) => n + p.individual.length, 0);
/** a page's file as the library serves it */
const pageFile = (slug: string) =>
  JSON.parse(readFileSync(join(DIST_DOCS, 'studio', 'examples', `${slug}.json`), 'utf8')) as { label: string; html: string; individual: boolean }[];
/** the example `label` of page `slug`, its markup as the library serves it */
const example = (slug: string, label: string) => {
  const i = PAGES.find((p) => p.slug === slug)!.examples.indexOf(label);
  assert.ok(i >= 0, `${slug} has no example "${label}"`);
  return { id: `${slug}#${i}`, html: pageFile(slug)[i].html };
};

let failures = 0;
async function check(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${label}\n    ${err instanceof Error ? err.message : err}`);
  }
}

/** a context whose pages get GrapesJS offline, the release's CDN files from dist/, and the clipboard */
async function context(): Promise<BrowserContext> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const first = await ctx.newPage();
  await offlineJsdelivr(first);
  await ctx.route(`${CDN}**`, (route) => {
    const file = join(ROOT, 'dist', route.request().url().slice(CDN.length));
    if (!existsSync(file)) return route.fulfill({ status: 404, body: 'not built' });
    return route.fulfill({ status: 200, contentType: extname(file) === '.css' ? 'text/css' : 'text/javascript', body: readFileSync(file) });
  });
  await first.close();
  return ctx;
}

const ve = (page: Page, fn: string) => page.evaluate(`(() => { const ve = df$.shadcn.visualEditor; return ${fn}; })()`);
const sizes = (page: Page) => page.evaluate(() => (globalThis as any).df$.shadcn.borderLayout.sizes('#studio') as Record<string, number>);
async function openStudio(page: Page, url = STUDIO): Promise<void> {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('#studio-canvas')?.hasAttribute('data-ready'), undefined, { timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll('#studio-library [data-example]').length > 1000, undefined, { timeout: 15000 });
}
/** pick an example in the library (found by the search) and wait for its frame */
async function pick(page: Page, slug: string, label: string): Promise<{ id: string; html: string }> {
  const ex = example(slug, label);
  await page.fill('#studio-search', label);
  await page.waitForSelector(`#studio-library [data-example="${ex.id}"] .tree-leaf`, { timeout: 5000 });
  await page.click(`#studio-library [data-example="${ex.id}"] .tree-leaf`);
  await page.waitForFunction(
    (lbl) => {
      const f = document.querySelector<HTMLIFrameElement>('#studio-samples .studio-sample-frame');
      return f?.title === lbl && !!f.style.height;
    },
    label,
    { timeout: 15000 },
  );
  return ex;
}
/** the selection tree's rows: label, path and whether it is the highlighted one */
const selectionRows = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('#studio-tree [role="treeitem"]')].map((li) => ({
      label: li.querySelector(':scope > .tree-leaf, :scope > details > summary')!.textContent!.trim(),
      path: (li as HTMLElement).dataset.path,
      selected: li.getAttribute('aria-selected') === 'true',
    })),
  );
/** click the selection tree's row whose label starts with `label` */
async function clickRow(page: Page, label: string): Promise<void> {
  await page.evaluate((l) => {
    const rows = [...document.querySelectorAll('#studio-tree .tree-leaf, #studio-tree summary')] as HTMLElement[];
    rows.find((r) => r.textContent!.trim().startsWith(l))!.click();
  }, label);
}
/** the path of the first element of the page whose outline label starts with `label` */
const pathOf = (page: Page, label: string) =>
  page.evaluate((l) => {
    const find = (nodes: { path: string; label: string; children: unknown[] }[]): string | null => {
      for (const n of nodes) {
        if (n.label.startsWith(l)) return n.path;
        const k = find(n.children as typeof nodes);
        if (k) return k;
      }
      return null;
    };
    return find((globalThis as any).df$.shadcn.visualEditor.outline('#studio-canvas'));
  }, label);
const buttons = (html: string) => [...html.matchAll(/class="([^"]*)"/g)].filter((m) => m[1].split(/\s+/).includes('btn')).length;
/**
 * A mouse drag (HTML Drag and Drop, as a person does it): press, move in steps, settle, release - page coordinates.
 * The pointer settles over the target before the release, as a hand does: in WebKit a release right after the pointer
 * reached a new element in the canvas dropped nothing, settled it lands (likely: WebKit sends dragover - which GrapesJS
 * cancels, unlike dragenter - only while the target stays the same)
 */
async function mouseDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) await page.mouse.move(from.x + ((to.x - from.x) * i) / 20, from.y + ((to.y - from.y) * i) / 20);
  for (const dx of [1, 0]) {
    await page.waitForTimeout(60);
    await page.mouse.move(to.x + dx, to.y);
  }
  await page.waitForTimeout(100);
  await page.mouse.up();
  await page.waitForTimeout(300);
}
/**
 * A point near the top left of an element (or just above its bottom: a drop there goes after it) - of the Studio, or of
 * the page in the canvas - in page coordinates, the element scrolled into its pane's view first; it throws when
 * something else is on top there
 */
const pointOf = (page: Page, selector: string, inCanvas = false, edge: 'top' | 'bottom' = 'top') =>
  page.evaluate(
    ([sel, canvas, at]) => {
      const editor = (globalThis as any).df$.shadcn.visualEditor.editor('#studio-canvas');
      const doc: Document = canvas ? editor.Canvas.getDocument() : document;
      const frame: HTMLIFrameElement = editor.Canvas.getFrameEl();
      const el = doc.querySelector(sel as string)!;
      el.scrollIntoView({ block: 'nearest' });
      const offset = canvas ? frame.getBoundingClientRect() : { left: 0, top: 0 };
      const r = el.getBoundingClientRect();
      const x = offset.left + r.left + Math.min(r.width / 2, 20);
      const y = offset.top + (at === 'bottom' ? r.bottom - 3 : r.top + Math.min(r.height / 2, 12));
      const hit = document.elementFromPoint(x, y);
      if (canvas ? hit !== frame : !el.contains(hit)) throw new Error(`${sel}: ${hit?.tagName}.${hit?.className} is on top`);
      return { x, y };
    },
    [selector, inCanvas, edge] as const,
  );
/**
 * Drags two examples into the canvas as a person does, with the mouse: Alert "Destructive" by the grip laid over its
 * preview (WebKit cancels the drag of an element that holds an iframe - the preview's), then Kbd "Combination" straight
 * from its row in the tree (its page's examples load as the pointer comes over the row). Both land in the page, and no
 * row stays a block after its drag.
 */
async function dragsIn(page: Page): Promise<boolean> {
  await pick(page, 'alert', 'Destructive');
  await mouseDrag(page, await pointOf(page, '#studio-samples .studio-sample-grip'), await pointOf(page, 'h1', true, 'bottom'));
  const html = (await ve(page, `ve.html('#studio-canvas')`)) as string;
  assert.ok(/class="alert"[^>]*data-variant="destructive"|data-variant="destructive"[^>]*class="alert"/.test(html), `the grip: ${html.slice(0, 400)}`);
  const kbd = example('kbd', 'Combination');
  await page.fill('#studio-search', 'Combination');
  const row = `#studio-library [data-example="${kbd.id}"] .tree-leaf`;
  await page.waitForSelector(row);
  const file = page.waitForResponse((r) => r.url().endsWith('/studio/examples/kbd.json'));
  await page.hover(row);
  await file;
  const keys = (h: string) => (h.match(/class="kbd"/g) ?? []).length;
  await mouseDrag(page, await pointOf(page, row), await pointOf(page, 'h1', true, 'bottom'));
  const after = (await ve(page, `ve.html('#studio-canvas')`)) as string;
  assert.ok(keys(after) > keys(html), `the tree row: ${keys(after)} kbd in the page, ${keys(html)} before`);
  assert.equal(await page.evaluate(() => document.querySelectorAll('#studio-library [data-visual-editor-block]').length), 0, 'no row stays a block');
  return true;
}
/** the share of the inspector the selection region takes */
const selectionShare = (page: Page) =>
  page.evaluate(
    () =>
      document.getElementById('studio-selection-panel')!.getBoundingClientRect().height /
      document.querySelector('#studio > .border-layout-east > .border-layout')!.getBoundingClientRect().height,
  );

try {
  const ctx = await context();
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let westAfterDrag = 0;

  await check('full-studio.html: the whole system + the Visual Editor and HTML Preview Editor bundles, no docs chrome; the library is every docs example by section and page, each page\'s components alone first; dense, the sections with their sidebar icons', async () => {
    await openStudio(page);
    const r = await page.evaluate(() => ({
      sheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => (l as HTMLLinkElement).getAttribute('href')!.replace(/^(\.\.\/)+/, '')),
      chrome: !!document.querySelector('.site-header, .app-sidebar.site-sidebar'),
      examples: document.querySelectorAll('#studio-library [data-example]').length,
      sections: [...document.querySelectorAll('#studio-library .tree > .tree-item > details > summary')].map((s) => s.textContent!.trim()),
      typography: [...document.querySelectorAll('#studio-library [data-page="typography"] > details > .tree-group > [data-example]')].map((l) => l.textContent!.trim()),
      marked: [...document.querySelectorAll('#studio-library [data-page="typography"] > details > .tree-group > [data-example][data-individual]')].map((l) => l.textContent!.trim()),
      individualRows: document.querySelectorAll('#studio-library [data-example][data-individual]').length,
      diagramTypes: document.querySelectorAll('#studio-library [data-page="diagram"] > details > .tree-group > [data-page]').length,
      icons: [...document.querySelectorAll('#studio-library .tree > .tree-item > details > summary')].map((s) => s.querySelectorAll('svg').length),
      title: document.getElementById('studio-library-title')!.textContent,
      search: (document.getElementById('studio-search') as HTMLInputElement).placeholder,
      dense: [...document.querySelectorAll('#studio .tree')].map((t) => t.getAttribute('data-density')),
      bars: [...document.querySelectorAll('#studio .panel > .panel-header')].map((h) => Math.round(h.getBoundingClientRect().height)),
    }));
    for (const s of ['components/all.css', 'components/visual-editor.css', 'components/wysiwyg.css']) assert.ok(r.sheets.includes(s), `${s} in ${r.sheets.join(', ')}`);
    assert.equal(r.chrome, false);
    assert.ok(EXAMPLES > 1500, `${EXAMPLES} examples`);
    assert.ok(INDIVIDUAL > 1000, `${INDIVIDUAL} individual examples`);
    assert.equal(r.examples, EXAMPLES);
    assert.equal(r.individualRows, INDIVIDUAL, 'every individual example is marked in the tree');
    assert.deepEqual(r.sections, library.sections.map((s) => s.heading));
    // a component page's entries: its parts (each kind of the component alone, from its parts file), then its examples
    // in page order - the individual ones first, marked; sub-pages nest under their page
    const typography = PAGES.find((p) => p.slug === 'typography')!;
    assert.deepEqual(r.typography, typography.examples);
    assert.deepEqual(typography.examples.slice(0, 4), ['h1', 'h2', 'h3', 'h4']);
    assert.deepEqual(r.marked.slice(0, 4), ['h1', 'h2', 'h3', 'h4']);
    for (const p of PAGES) {
      const first = p.examples.findIndex((_l, i) => !p.individual.includes(i));
      assert.ok(first < 0 || p.individual.every((i) => i < first), `${p.slug}: an individual example after a composite`);
    }
    // every part of a component's parts file leads its page, marked individual (verify's `parts show their component`)
    let partPages = 0;
    for (const c of componentDirs(join(ROOT, 'src', 'components'))) {
      const file = join(c.dir, partsFileName(c.name));
      const p = PAGES.find((x) => x.slug === c.name);
      if (!existsSync(file) || !p) continue;
      partPages++;
      const parts = [...readFileSync(file, 'utf8').matchAll(/^`{3,}(html example[^\n]*)$/gm)].filter((m) => isPartMeta(m[1])).length;
      assert.ok(parts > 0 && [...Array(parts).keys()].every((i) => p.individual.includes(i)), `${p.slug}: ${parts} parts, individual ${p.individual.slice(0, 5)}`);
    }
    assert.ok(partPages > 90, `${partPages} pages lead with their parts`);
    // every section row: the chevron and its sidebar icon
    assert.ok(library.sections.every((x) => x.icon.length > 0), 'every section carries an icon');
    assert.deepEqual(r.icons, library.sections.map(() => 2));
    assert.deepEqual([r.title, r.search], ['Components', 'Search components']);
    assert.deepEqual(r.dense, ['compact', 'compact'], 'both trees dense');
    assert.ok(r.bars.every((h) => h <= 33), `dense title bars (2rem): ${r.bars.join(', ')}`);
    assert.ok(r.typography.includes('Japanese, top to bottom'));
    assert.ok(r.diagramTypes > 20, `${r.diagramTypes} diagram type pages under Illustrative Diagrams`);
  });

  await check('layout: a Border Layout - west the library over the example, east the selection over the properties and the state; a divider drags, the toolbar folds a side', async () => {
    const r = await page.evaluate(() => ({
      library: !!document.querySelector('#studio > .border-layout-west > .border-layout > .border-layout-center #studio-library'),
      example: !!document.querySelector('#studio > .border-layout-west > .border-layout > .border-layout-south #studio-samples'),
      canvas: !!document.querySelector('#studio > .border-layout-center #studio-canvas'),
      selection: !!document.querySelector('#studio > .border-layout-east > .border-layout > .border-layout-north #studio-tree'),
      properties: !!document.querySelector('#studio > .border-layout-east > .border-layout > .border-layout.border-layout-center > .border-layout-center #studio-props'),
      state: !!document.querySelector('#studio > .border-layout-east > .border-layout > .border-layout.border-layout-center > .border-layout-south[data-fit] #studio-state'),
      dividers: document.querySelectorAll('#studio > .resizer > .resizer-handle, #studio .border-layout > .resizer > .resizer-handle').length,
      bar: document.querySelector('.studio-bar')!.getBoundingClientRect().height,
      preview: getComputedStyle(document.getElementById('studio-preview')!).display,
    }));
    // at 1440px the toolbar is one row (a .select fills its line unless the glue sizes it), and the hidden preview
    // card takes no room under the canvas (its own display beat [hidden])
    assert.ok(r.bar < 56, `toolbar ${r.bar}px high`);
    assert.deepEqual({ ...r, bar: 0 }, { library: true, example: true, canvas: true, selection: true, properties: true, state: true, dividers: 3, bar: 0, preview: 'none' });
    // drag the west divider 80px to the east
    const before = await sizes(page);
    const box = (await (await page.$('#studio > .border-layout-west > .resizer-handle'))!.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    westAfterDrag = (await sizes(page)).west;
    assert.ok(Math.abs(westAfterDrag - before.west - 80) <= 2, `west ${before.west} -> ${westAfterDrag}`);
    // fold the inspector from the toolbar: the canvas takes its room; unfold it again
    const canvasWidth = () => page.evaluate(() => document.getElementById('studio-canvas')!.getBoundingClientRect().width);
    const wide = await canvasWidth();
    await page.click('[data-studio-fold="east"]');
    assert.equal((await sizes(page)).east, 0);
    assert.equal(await page.getAttribute('[data-studio-fold="east"]', 'aria-pressed'), 'false');
    assert.ok((await canvasWidth()) > wide + 150, 'the canvas grew');
    await page.click('[data-studio-fold="east"]');
    assert.ok((await sizes(page)).east >= 200);
    assert.equal(await page.getAttribute('[data-studio-fold="east"]', 'aria-pressed'), 'true');
  });

  await check('panels: every side view is a Panel - a side one minimizes to its title bar (its neighbour takes the room) and maximizes over its part of the column; a column\'s center one only maximizes; Escape restores', async () => {
    const tools = await page.evaluate(() =>
      Object.fromEntries(
        [...document.querySelectorAll('#studio .panel')].map((p) => [
          p.id,
          [...p.querySelectorAll('.panel-tools .swap')].map((s) => (s.classList.contains('panel-minimize') ? 'min' : 'max')),
        ]),
      ),
    );
    assert.deepEqual(tools, {
      'studio-library-panel': ['max'],
      'studio-example-panel': ['max', 'min'],
      'studio-selection-panel': ['max', 'min'],
      'studio-props-panel': ['max'],
      'studio-state-panel': ['max', 'min'],
    });
    const box = (sel: string) => page.evaluate((s) => document.querySelector(s)!.getBoundingClientRect().toJSON() as DOMRect, sel);
    const flag = (id: string, name: string) => page.evaluate(([i, n]) => document.getElementById(i)!.hasAttribute(n), [id, name]);
    // the example folds to its bar at the foot of the column, and the tree takes the room
    const tree = (await box('#studio-library-panel')).height;
    await page.click('#studio-example-panel .panel-minimize');
    assert.equal(await flag('studio-example-panel', 'data-minimized'), true);
    assert.ok((await box('#studio-example-panel')).height < 48, 'the example is its title bar');
    assert.ok((await box('#studio-library-panel')).height > tree + 100, 'the tree took the room');
    await page.click('#studio-example-panel .panel-minimize');
    assert.equal(await flag('studio-example-panel', 'data-minimized'), false);
    // the selection folds below the fifth of the inspector it keeps otherwise
    await page.click('#studio-selection-panel .panel-minimize');
    assert.ok((await box('#studio-selection-panel')).height < 48, 'the selection is its title bar');
    await page.click('#studio-selection-panel .panel-minimize');
    assert.ok((await selectionShare(page)) >= 0.199);
    // nothing selected, no state: State is folded to its title bar - the Studio's own fold, not remembered
    assert.equal(await flag('studio-state-panel', 'data-minimized'), true);
    assert.equal(await page.textContent('#studio-state-title'), 'State: none');
    assert.ok((await box('#studio-state-panel')).height < 40, 'the state is its title bar');
    assert.ok(!(await page.evaluate(() => JSON.stringify(Object.entries(localStorage).filter(([k]) => k.includes('studio:panels'))))).includes('studio-state-panel'));
    // the state maximizes over the properties and itself; Escape brings it back
    await page.click('#studio-state-panel .panel-maximize');
    const state = await box('#studio-state-panel');
    const host = await box('#studio > .border-layout-east > .border-layout > .border-layout.border-layout-center');
    assert.ok(Math.abs(state.top - host.top) < 2 && Math.abs(state.height - host.height) < 2, `${JSON.stringify(state)} over ${JSON.stringify(host)}`);
    await page.focus('#studio-state-panel .panel-maximize input');
    await page.keyboard.press('Escape');
    assert.equal(await flag('studio-state-panel', 'data-maximized'), false);
  });

  await check('library: the search narrows the tree; a picked example shows below as a static frame of its markup (styled by the page\'s sheets, no script); one on a block\'s page laid out at desktop width and scaled down', async () => {
    await page.fill('#studio-search', 'japanese');
    await page.waitForFunction(() => document.querySelectorAll('#studio-library [data-example]').length < 20);
    const shown = await page.evaluate(() => [...document.querySelectorAll('#studio-library [data-example]')].map((l) => l.textContent!.trim()));
    assert.ok(shown.includes('Japanese, top to bottom'), shown.join(' | '));
    await pick(page, 'button', 'Variants');
    const r = await page.evaluate(() => {
      const frame = document.querySelector('#studio-samples .studio-sample-frame') as HTMLIFrameElement;
      const btn = frame.contentDocument!.querySelector('.btn')!;
      return {
        title: document.getElementById('studio-sample-title')!.textContent,
        label: document.querySelector('#studio-samples .studio-sample > .btn')!.textContent!.trim(),
        picked: (document.querySelector('#studio-library [aria-selected="true"]') as HTMLElement | null)?.dataset.example,
        sandbox: frame.getAttribute('sandbox'),
        radius: frame.contentWindow!.getComputedStyle(btn).borderTopLeftRadius,
        script: typeof (frame.contentWindow as any).df$,
        height: frame.parentElement!.getBoundingClientRect().height,
      };
    });
    assert.equal(r.title, 'Button: Variants');
    assert.equal(r.label, 'Variants');
    assert.equal(r.picked, example('button', 'Variants').id);
    assert.equal(r.sandbox, 'allow-same-origin');
    assert.notEqual(r.radius, '0px');
    assert.equal(r.script, 'undefined');
    assert.ok(r.height > 20, `view height ${r.height}`);
    await pick(page, 'hero', 'Glow');
    const hero = await page.evaluate(() => {
      const frame = document.querySelector('#studio-samples .studio-sample-frame') as HTMLIFrameElement;
      return { width: parseFloat(frame.style.width), scale: parseFloat(frame.style.scale), view: frame.parentElement!.clientWidth };
    });
    assert.equal(hero.width, 1024);
    assert.ok(Math.abs(hero.scale - hero.view / 1024) < 0.01, JSON.stringify(hero));
  });

  await check('individual examples: Typography\'s h1 - a part of its parts file - shows as itself and a click puts exactly its markup into the page', async () => {
    const h1 = example('typography', 'h1');
    assert.equal(h1.html, '<h1 class="h1">Taxing Laughter</h1>\n');
    await page.fill('#studio-search', 'typography h1');
    await page.waitForSelector(`#studio-library [data-example="${h1.id}"] .tree-leaf`);
    await page.click(`#studio-library [data-example="${h1.id}"] .tree-leaf`);
    await page.waitForFunction(() => !!document.querySelector<HTMLIFrameElement>('#studio-samples .studio-sample-frame')?.style.height);
    assert.equal(await page.textContent('#studio-sample-title'), 'Typography: h1');
    const count = async () => ((await ve(page, `ve.html('#studio-canvas')`)) as string).split('Taxing Laughter').length - 1;
    const before = await count();
    await ve(page, `ve.select('#studio-canvas', null)`);
    await page.click('#studio-samples .studio-sample .btn');
    assert.equal(await count(), before + 1);
    assert.ok(((await ve(page, `ve.html('#studio-canvas')`)) as string).includes('<h1 class="h1">Taxing Laughter</h1>'));
  });

  await check('examples: a click inserts into the selected element; a mouse drag drops the example into the canvas - by the grip over its preview, or straight from its row in the tree', async () => {
    await pick(page, 'button', 'Variants');
    await ve(page, `ve.select('#studio-canvas', '0.0')`);
    const before = buttons((await ve(page, `ve.html('#studio-canvas')`)) as string);
    await page.click('#studio-samples .studio-sample .btn');
    const afterClick = (await ve(page, `ve.html('#studio-canvas')`)) as string;
    assert.ok(buttons(afterClick) > before, afterClick.slice(0, 300));
    assert.ok(await dragsIn(page), 'the grip and a tree row drop their examples');
  });

  await check('selection: the path from the page to the selected element (highlighted) and everything inside it, in a fifth to half of the inspector; a row (click or Enter) selects its element; the Property Grid edits it', async () => {
    await page.waitForTimeout(400); // the drop's change event (debounced) settles first
    await ve(page, `ve.select('#studio-canvas', null)`);
    await page.waitForFunction(() => document.querySelector('#studio-tree [data-path=""]')?.getAttribute('aria-selected') === 'true');
    const page0 = await selectionRows(page);
    assert.ok(page0.some((r) => r.label === 'h1.h1') && page0.some((r) => r.label === 'div.flex'), 'nothing selected: the whole page');
    const whole = await selectionShare(page);
    await clickRow(page, 'h1');
    await page.waitForFunction(() => /<h1>/.test(document.getElementById('studio-inspect-hint')!.textContent!));
    const path = await selectionRows(page);
    assert.deepEqual(path.map((r) => r.label), ['Page', 'main.container', 'section.stack', 'h1.h1']);
    assert.deepEqual(path.filter((r) => r.selected).map((r) => r.label), ['h1.h1']);
    // the region follows the tree: four rows take a fifth at least, the whole page more, never over half
    const four = await selectionShare(page);
    assert.ok(four >= 0.199, `four rows: ${four.toFixed(3)} of the inspector - a fifth at least`);
    assert.ok(whole > four && whole <= 0.501, `the whole page: ${whole.toFixed(3)} of the inspector - more, half at most`);
    // the section: its whole subtree, down to the buttons in its row of buttons
    await clickRow(page, 'section');
    await page.waitForFunction(() => /<section>/.test(document.getElementById('studio-inspect-hint')!.textContent!));
    const deep = await selectionRows(page);
    assert.deepEqual(deep.filter((r) => r.selected).map((r) => r.label), ['section.stack']);
    const buttonsIn = (f: { path?: string }) => deep.filter((r) => r.path!.startsWith(`${f.path}.`) && r.label.startsWith('button')).length;
    assert.ok(deep.some((r) => r.label === 'div.flex' && buttonsIn(r) >= 2), deep.map((r) => r.label).join(' '));
    // keyboard: the first row inside the section, Enter - its element is selected and the focus stays on its row
    await page.focus('#studio-tree [aria-selected="true"] > details > summary');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => /<span>/.test(document.getElementById('studio-inspect-hint')!.textContent!));
    const focus = await page.evaluate(() => document.activeElement?.closest('[role="treeitem"]')?.getAttribute('aria-selected'));
    assert.equal(focus, 'true');
    // the badge's tree holds only its path - the page row brings the whole page back
    assert.ok(!(await selectionRows(page)).some((r) => r.label === 'h1.h1'), 'a sibling of the selection is not in the tree');
    await clickRow(page, 'Page');
    await page.waitForFunction(() => document.getElementById('studio-inspect-hint')!.textContent === 'Select an element in the page.');
    await clickRow(page, 'h1');
    await page.waitForFunction(() => /<h1>/.test(document.getElementById('studio-inspect-hint')!.textContent!));
    const before = await page.evaluate(() => (globalThis as any).df$.shadcn.propertyGrid.getSource('#studio-props'));
    assert.equal(before.element, 'h1');
    await page.evaluate(() => (globalThis as any).df$.shadcn.propertyGrid.setProperty('#studio-props', 'text', 'Built in the Studio'));
    assert.ok(((await ve(page, `ve.html('#studio-canvas')`)) as string).includes('Built in the Studio'));
  });

  await check('the class property edits in a Combobox tag input: the element\'s classes as tags, then its component\'s, then the system\'s by module; a pick and a typed class are written when the editor is left', async () => {
    await clickRow(page, 'Page');
    await clickRow(page, 'h1');
    await page.waitForFunction(() => /<h1>/.test(document.getElementById('studio-inspect-hint')!.textContent!));
    await page.evaluate(() => (globalThis as any).df$.shadcn.propertyGrid.edit('#studio-props', 'class'));
    await page.waitForSelector('#studio-classes .combobox-tag');
    const r = await page.evaluate(() => ({
      tags: [...document.querySelectorAll('#studio-classes .combobox-tag')].map((t) => t.textContent!.trim()),
      groups: [...document.querySelectorAll('#studio-classes .combobox-group-label')].map((l) => l.textContent),
      options: document.querySelectorAll('#studio-classes [role="option"]:not(.combobox-create)').length,
      fits: (() => {
        const grid = document.querySelector('#studio-props .property-grid-table, #studio-props table')!;
        return grid.scrollWidth <= grid.parentElement!.clientWidth + 1;
      })(),
    }));
    assert.deepEqual(r.tags, ['h1']);
    assert.deepEqual(r.groups, ['On this element', 'Typography', ...library.utilities.map((u) => u.group)]);
    assert.ok(r.options > 1400, `${r.options} classes`);
    assert.equal(r.fits, true, 'the editor fits its cell');
    await page.click('#studio-classes .combobox-field');
    await page.keyboard.type('gap-4');
    await page.keyboard.press('Enter'); // the exact match
    await page.keyboard.type('my-own');
    await page.keyboard.press('Enter'); // created
    // the first Escape closes the list, the editor stays; Tab writes the classes
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => !!document.getElementById('studio-classes')), true, 'still editing');
    await page.keyboard.press('Tab');
    await page.waitForFunction(() => !document.getElementById('studio-classes'));
    const classes = (await ve(page, `ve.selection('#studio-canvas').classes`)) as string[];
    assert.deepEqual([...classes].sort(), ['gap-4', 'h1', 'my-own']);
    await page.evaluate(() => (globalThis as any).df$.shadcn.propertyGrid.setProperty('#studio-props', 'class', 'h1'));
  });

  await check('no state: markup without a script (a Badge) shows the card that says so, and its elements stay editable', async () => {
    await clickRow(page, 'Page');
    await clickRow(page, 'span.badge');
    await page.waitForFunction(() => /<span>/.test(document.getElementById('studio-inspect-hint')!.textContent!));
    const r = await page.evaluate(() => ({
      card: !document.getElementById('studio-stateless')!.hidden,
      grid: !document.getElementById('studio-state')!.hidden,
      text: document.getElementById('studio-stateless-text')!.textContent,
      unit: (globalThis as any).df$.shadcn.visualEditor.selection('#studio-canvas').unit,
    }));
    assert.deepEqual(r, { card: true, grid: false, text: 'Badge has no state: its markup is edited directly, element by element, in the properties above.', unit: null });
    assert.equal(await page.evaluate(() => document.getElementById('studio-state-panel')!.hasAttribute('data-minimized')), true, 'State folds');
    await page.evaluate(() => (globalThis as any).df$.shadcn.propertyGrid.setProperty('#studio-props', 'data-variant', 'outline'));
    const variant = await page.evaluate(() =>
      new DOMParser()
        .parseFromString((globalThis as any).df$.shadcn.visualEditor.html('#studio-canvas'), 'text/html')
        .querySelector('section span.badge')
        ?.getAttribute('data-variant'),
    );
    assert.equal(variant, 'outline');
  });

  await check('state: a component with a script (an Accordion example) is one locked unit - read only in the Property Grid, its parts not removed; its schema\'s states in the Tree Grid; a value set → the page gets its render()\'s markup, still locked', async () => {
    await pick(page, 'accordion', 'Multi-open');
    await ve(page, `ve.select('#studio-canvas', null)`);
    await page.click('#studio-samples .studio-sample .btn');
    await page.waitForTimeout(400);
    const acc = (await pathOf(page, 'div.accordion'))!;
    assert.ok(acc, 'the accordion is in the page');
    await ve(page, `ve.select('#studio-canvas', '${acc}.0.0')`); // a summary inside it
    await page.waitForFunction(() => document.querySelectorAll('#studio-state [data-state-key]').length > 0, undefined, { timeout: 25000 });
    const r = await page.evaluate(() => {
      const ve = (globalThis as any).df$.shadcn.visualEditor;
      const s = ve.selection('#studio-canvas');
      let apply = 'applied';
      try {
        ve.apply('#studio-canvas', { text: 'Changed' });
      } catch (e) {
        apply = (e as Error).message;
      }
      return {
        unit: s.unit,
        hint: document.getElementById('studio-inspect-hint')!.textContent,
        title: document.getElementById('studio-state-title')!.textContent,
        card: !document.getElementById('studio-stateless')!.hidden,
        keys: [...document.querySelectorAll('#studio-state [data-state-key]')].map((c) => (c as HTMLElement).dataset.stateKey),
        apply,
        remove: (document.querySelector('[data-visual-editor-for="studio-canvas"][data-visual-editor-action="remove"]') as HTMLButtonElement).disabled,
      };
    });
    assert.equal(r.unit, acc);
    const fit = await page.evaluate(() => {
      const panel = document.getElementById('studio-state-panel')!;
      const body = panel.querySelector('.panel-body')!;
      return {
        folded: panel.hasAttribute('data-minimized'),
        share: panel.getBoundingClientRect().height / panel.parentElement!.getBoundingClientRect().height,
        scrolls: body.scrollHeight > body.clientHeight + 1,
      };
    });
    assert.deepEqual({ ...fit, share: 0 }, { folded: false, share: 0, scrolls: false }, 'unfolded, its states fit');
    assert.ok(fit.share > 0.1 && fit.share <= 0.501, `as high as its states, half the column at most: ${fit.share.toFixed(3)}`);
    assert.match(r.hint!, /its component has state/);
    assert.equal(r.title, 'State: Accordion');
    assert.equal(r.card, false);
    assert.deepEqual(r.keys, ['all-open', 'all-closed']);
    assert.match(r.apply, /locked/);
    assert.equal(r.remove, true, 'a part of the unit is not removed');
    await page.click('#studio-state [data-state-key="all-open"]');
    await page.waitForFunction((p) => {
      const ve = (globalThis as any).df$.shadcn.visualEditor;
      const doc = new DOMParser().parseFromString(ve.html('#studio-canvas'), 'text/html');
      const items = [...doc.querySelectorAll('.accordion details')];
      return items.length > 1 && items.every((d) => d.hasAttribute('open')) && ve.selection('#studio-canvas')?.path === p;
    }, acc, { timeout: 15000 });
    const after = await page.evaluate(() => {
      const ve = (globalThis as any).df$.shadcn.visualEditor;
      const doc = new DOMParser().parseFromString(ve.html('#studio-canvas'), 'text/html');
      return { markup: doc.querySelector('.accordion')!.outerHTML, unit: ve.selection('#studio-canvas').unit };
    });
    assert.equal(after.unit, acc, 'the unit stays locked');
    assert.doesNotMatch(after.markup, /data-init|data-api|data-state-name|data-studio-n/, 'render()\'s markup, nothing the runtime adds');
  });

  // reported: unchecking "expanded" on a dropped Tree View re-rendered and flipped back - Tree View's 'default' restored
  // the authored open flag, so a branch written open could not close
  await check('state: unchecking a Tree View\'s "expanded" closes its first branch in the page - one replace, and it stays closed', async () => {
    await pick(page, 'tree-view', 'File Explorer');
    await ve(page, `ve.select('#studio-canvas', null)`);
    await page.click('#studio-samples .studio-sample .btn');
    await page.waitForTimeout(400);
    const tree = (await pathOf(page, 'ul.tree'))!;
    await ve(page, `ve.select('#studio-canvas', '${tree}')`);
    await page.waitForSelector('#studio-state [data-state-key="expanded"]', { timeout: 25000 });
    assert.equal(await page.isChecked('#studio-state [data-state-key="expanded"]'), true, 'the first branch is written open');
    await page.evaluate(() => {
      const editor = (globalThis as any).df$.shadcn.visualEditor;
      const replace = editor.replace;
      (globalThis as any).__replaced = 0;
      editor.replace = (...args: unknown[]) => ((globalThis as any).__replaced++, replace(...args));
    });
    const firstBranch = (p: string) =>
      page.evaluate((path) => {
        const ve = (globalThis as any).df$.shadcn.visualEditor;
        const body = new DOMParser().parseFromString(`<body>${ve.html('#studio-canvas')}</body>`, 'text/html').body;
        const ul = path.split('.').reduce((el: Element | undefined, i: string) => el?.children[Number(i)], body);
        return ul?.querySelector('details.tree-branch')?.hasAttribute('open') ?? null;
      }, p);
    await page.click('#studio-state [data-state-key="expanded"]');
    await page.waitForFunction(() => (globalThis as any).__replaced > 0, undefined, { timeout: 5000 });
    await page.waitForTimeout(1000); // anything that would flip it back has run
    assert.equal(await firstBranch(tree), false, 'the page\'s first branch is closed');
    assert.equal(await page.isChecked('#studio-state [data-state-key="expanded"]'), false, 'the box stays unchecked');
    assert.equal(await page.evaluate(() => (globalThis as any).__replaced), 1, 'one replace');
  });

  // a form field's value is a property: render() keeps the authored attribute, so the page kept value="50" while the
  // grid showed 80 (tmp/probe-studio-slider.ts) - the Studio writes the live value as the State tab does
  await check('state: a Slider\'s value set in the state grid reaches the page', async () => {
    await pick(page, 'slider', 'Default');
    await ve(page, `ve.select('#studio-canvas', null)`);
    await page.click('#studio-samples .studio-sample .btn');
    await page.waitForTimeout(400);
    const slider = (await pathOf(page, 'input.slider'))!;
    await ve(page, `ve.select('#studio-canvas', '${slider}')`);
    await page.waitForSelector('#studio-state [data-state-key="value"]', { timeout: 25000 });
    await page.fill('#studio-state [data-state-key="value"]', '80');
    await page.press('#studio-state [data-state-key="value"]', 'Tab');
    await page.waitForFunction(
      (p) => {
        const ve = (globalThis as any).df$.shadcn.visualEditor;
        const body = new DOMParser().parseFromString(`<body>${ve.html('#studio-canvas')}</body>`, 'text/html').body;
        return p.split('.').reduce((el: Element | undefined, i: string) => el?.children[Number(i)], body)?.getAttribute('value') === '80';
      },
      slider,
      { timeout: 5000 },
    );
  });

  await check('pages: a page is added from the toolbar and opened; going back shows the first page as it was left', async () => {
    await page.click('[popovertarget="studio-add-page-pop"]');
    await page.fill('#studio-add-page input[name="name"]', 'About us');
    await page.click('#studio-add-page button[type="submit"]');
    await page.waitForFunction(() => document.querySelectorAll('#studio-pages option').length === 2);
    assert.equal(await page.evaluate(() => document.querySelector('#studio-add-page-pop')!.matches(':popover-open')), false);
    assert.equal(await page.inputValue('#studio-pages'), 'about-us');
    assert.ok(((await ve(page, `ve.html('#studio-canvas')`)) as string).includes('About us'));
    await page.selectOption('#studio-pages', 'index');
    assert.ok(((await ve(page, `ve.html('#studio-canvas')`)) as string).includes('Built in the Studio'));
  });

  await check('kept in this browser: after a reload the project opens with both pages, the edits and a page\'s <style>; the dragged divider keeps its place, a minimized panel stays minimized', async () => {
    // an example's <style>: the canvas moves it into rules; the page keeps it beside its markup
    await ve(page, `(ve.select('#studio-canvas', null), ve.insert('#studio-canvas', '<style>.kept-style { color: rgb(1, 2, 3); }</style><p class="kept-style">styled</p>'))`);
    await page.click('#studio-example-panel .panel-minimize');
    await page.waitForTimeout(900);
    await openStudio(page);
    const r = await page.evaluate(() => {
      const ve = (globalThis as any).df$.shadcn.visualEditor;
      const p = ve.editor('#studio-canvas').Canvas.getDocument().querySelector('p.kept-style');
      return {
        pages: [...document.querySelectorAll('#studio-pages option')].map((o) => (o as HTMLOptionElement).value),
        html: ve.html('#studio-canvas'),
        color: p && getComputedStyle(p).color,
        minimized: [...document.querySelectorAll('#studio .panel[data-minimized]')].map((el) => el.id),
      };
    });
    assert.deepEqual(r.pages, ['index', 'about-us']);
    assert.ok(r.html.includes('Built in the Studio'), r.html.slice(0, 200));
    assert.equal(r.color, 'rgb(1, 2, 3)');
    assert.equal((await sizes(page)).west, westAfterDrag);
    // the example stays minimized; State is folded again - nothing is selected, so there is no state to show
    assert.deepEqual(r.minimized.sort(), ['studio-example-panel', 'studio-state-panel']);
    await page.click('#studio-example-panel .panel-minimize');
  });

  await check('preview: the page runs in the HTML Preview Editor with the system (a .btn styled by all.css in the frame)', async () => {
    await page.click('#studio-preview-toggle');
    const frame = (await (await page.waitForSelector('#studio-preview iframe.code-example-frame')).contentFrame())!;
    await frame.waitForSelector('h1', { timeout: 20000 });
    // the h1 is parsed before the module bundle runs - wait for the runtime the check is about
    await frame.waitForFunction(() => typeof (globalThis as any).df$?.shadcn === 'object', undefined, { timeout: 20000 });
    const r = await frame.evaluate(() => ({
      h1: document.querySelector('h1')?.textContent,
      radius: getComputedStyle(document.querySelector('.btn')!).borderTopLeftRadius,
      runtime: typeof (globalThis as any).df$?.shadcn,
    }));
    assert.equal(r.h1, 'Built in the Studio');
    assert.notEqual(r.radius, '0px');
    assert.equal(r.runtime, 'object');
    await page.click('#studio-preview-toggle');
  });

  await check('export: the app as a ZIP - every page with the release\'s CDN files, project.json, AGENTS.md - served alone, two dialogs from one example each open their own', async () => {
    // the dialog example twice: the ids it carries get free names, the triggers follow
    await pick(page, 'dialog', 'Confirmation');
    await ve(page, `ve.select('#studio-canvas', null)`);
    await page.click('#studio-samples .studio-sample .btn');
    await ve(page, `ve.select('#studio-canvas', null)`);
    await page.click('#studio-samples .studio-sample .btn');
    await page.waitForTimeout(800);
    const download = page.waitForEvent('download');
    await page.click('[data-dropdown-trigger="studio-export"]');
    await page.click('[data-export="zip"]');
    const file = await download;
    rmSync(OUT, { recursive: true, force: true });
    mkdirSync(OUT, { recursive: true });
    const zip = join(OUT, 'app.zip');
    await file.saveAs(zip);
    const test = Bun.spawnSync(['unzip', '-t', zip]);
    assert.equal(test.exitCode, 0, test.stdout.toString());
    Bun.spawnSync(['unzip', '-q', '-o', zip, '-d', join(OUT, 'app')]);
    for (const f of ['index.html', 'about-us.html', 'project.json', 'AGENTS.md']) assert.ok(existsSync(join(OUT, 'app', f)), f);
    const index = readFileSync(join(OUT, 'app', 'index.html'), 'utf8');
    assert.ok(index.includes(`${CDN}components/all.min.js`), 'the page loads the release-pinned bundle');
    // serve the unzipped app on its own origin and use it
    const app = Bun.serve({ port: 0, fetch: (req) => new Response(Bun.file(join(OUT, 'app', new URL(req.url).pathname.slice(1) || 'index.html')), { headers: { 'content-type': 'text/html' } }) });
    try {
      const p = await ctx.newPage();
      const appErrors: string[] = [];
      p.on('pageerror', (e) => appErrors.push(e.message));
      await p.goto(`http://localhost:${app.port}/index.html`, { waitUntil: 'load' });
      await p.waitForFunction(() => !!(globalThis as any).df$?.shadcn?.dialogApi);
      const triggers = await p.evaluate(() => [...document.querySelectorAll('[data-dialog-trigger]')].map((b) => (b as HTMLElement).dataset.dialogTrigger));
      assert.deepEqual(triggers, ['confirm-dialog', 'confirm-dialog-2']);
      for (const id of triggers) {
        await p.click(`[data-dialog-trigger="${id}"]`);
        const open = await p.evaluate(() => [...document.querySelectorAll('dialog[open]')].map((d) => d.id));
        assert.deepEqual(open, [id]);
        await p.keyboard.press('Escape');
        await p.waitForFunction(() => !document.querySelector('dialog[open]'));
      }
      assert.deepEqual(appErrors, []);
      await p.close();
    } finally {
      app.stop();
    }
  });

  await check('project file: exported as JSON and opened again - as a copy with a new id, both pages', async () => {
    const download = page.waitForEvent('download');
    await page.click('[data-dropdown-trigger="studio-export"]');
    await page.click('[data-export="json"]');
    const file = join(OUT, 'project.json');
    await (await download).saveAs(file);
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    assert.equal(saved.format, 'defuss-shadcn-studio/1');
    await page.setInputFiles('#studio-file', file);
    await page.waitForFunction(() => document.getElementById('studio-status')!.textContent!.startsWith('Opened '));
    const r = await page.evaluate(() => ({
      projects: document.querySelectorAll('#studio-projects option').length,
      pages: document.querySelectorAll('#studio-pages option').length,
    }));
    assert.equal(r.projects, 2);
    assert.equal(r.pages, 2);
  });

  await check('Copy for an agent: Markdown with every used component\'s skill (release-pinned) and each page\'s markup', async () => {
    await page.click('[data-dropdown-trigger="studio-export"]');
    await page.click('[data-export="agent"]');
    await page.waitForFunction(() => document.getElementById('studio-status')!.textContent === 'Copied for an agent');
    const text = await page.evaluate(() => navigator.clipboard.readText());
    assert.ok(text.includes(`- Button (\`button\`): ${CDN}components/button/component-skill.md`), text.slice(0, 600));
    assert.ok(text.includes('## Page: Home (`index.html`)'), text.slice(0, 600));
    assert.ok(text.includes('```html'), 'the markup');
    writeFileSync(join(OUT, 'agent.md'), text);
  });

  await check('Open in Studio: hidden on the docs cards while the Studio is alpha; an example in the address fragment still opens (cleared after)', async () => {
    const docs = await ctx.newPage();
    await docs.goto(`${server.url}/dist/documentation/actions/button.html`, { waitUntil: 'load' });
    await docs.waitForSelector('.code-example[data-init]');
    assert.equal(await docs.$$eval('.code-example a[data-open-studio]', (els) => els.length), 0, 'no card offers the Studio');
    const source = await docs.evaluate(() => (globalThis as any).df$.shadcn.codeExample.source(document.querySelector('.code-example')));
    await docs.close();
    // the route the link took: the source deflate-raw + base64url in #source=
    const hash = deflateRawSync(Buffer.from(source)).toString('base64url');
    const studio = await ctx.newPage();
    await studio.goto(`${STUDIO}#source=${hash}`, { waitUntil: 'load' });
    await studio.waitForFunction(() => (document.getElementById('studio-status')?.textContent ?? '').startsWith('Opened from the docs'), undefined, { timeout: 30000 });
    const r = await studio.evaluate(() => ({ html: (globalThis as any).df$.shadcn.visualEditor.html('#studio-canvas'), hash: location.hash }));
    assert.equal(r.hash, '');
    const firstClass = /class="([^"]+)"/.exec(source)![1];
    assert.ok(r.html.includes(firstClass), `${firstClass} in ${r.html.slice(0, 300)}`);
    await studio.close();
  });

  await check('no page errors', async () => {
    assert.deepEqual(errors, []);
  });
  await ctx.close();

  // WebKit (Safari's engine) cancels the drag of an element that holds an iframe - the example preview's - so the
  // Studio drags by a grip laid over it (tmp/probe-webkit-dnd.ts). Chromium carried the old drag too: only WebKit
  // tells them apart
  await check('WebKit: the grip and a tree row drag their examples into the canvas', async () => {
    const wk = await webkit.launch();
    try {
      const p = await wk.newPage({ viewport: { width: 1440, height: 900 } });
      await offlineJsdelivr(p);
      await openStudio(p);
      assert.ok(await dragsIn(p));
    } finally {
      await wk.close();
    }
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`studio.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('studio.e2e: all checks passed');
