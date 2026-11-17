import { chromium, type Page } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { brotliDecompressSync } from 'node:zlib';
import { startServer } from '../server.ts';
import { offlineJsdelivr, offlineModels } from '../lib/vendor-offline.ts';
import { chooseLanguage, renderedLanguage, translationGaps } from '../lib/translation.ts';

/**
 * Why: the notes scaffold is a clickdummy - its promise is that the clicks
 * (and the typing) work. This drives the generated full-screen page
 * (dist/documentation/app-notes.html, built from the scaffold page's own
 * example fence): the page tree, the block editor (Enter, Backspace,
 * markdown shortcuts, the slash menu, the format bar, toggles, the block
 * menu, drag to move), titles and icons everywhere, new pages, favorites,
 * trash, page options, the roadmap database in all three views with its
 * peek, ⌘K, sharing and the narrow layout. And what makes it usable: every edit
 * is kept (defuss-storage, OPFS) and comes back on a reload; ⌘K ranks every
 * section with defuss-search - by keywords, and by meaning once Winzling-embed
 * and the ColBERT reranker are loaded (served offline from .cache/models); a
 * backup holds the pages and the search index, imports into a fresh browser
 * without embedding again, and a hostile one runs nothing.
 */
const PAGE = '/dist/documentation/application/app-notes.html';
const server = startServer();
/** the stored workspace is in place (the pages are hidden until then) */
const ready = (p: Page) => p.waitForFunction(() => document.querySelector('[data-nt]')?.getAttribute('data-nt-store') !== 'loading', undefined, { timeout: 15_000 });
const OUT = join(import.meta.dirname, '..', '..', '..', 'output', 'e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
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

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await offlineJsdelivr(page);
  await page.route(/huggingface\.co/, (r) => r.abort());
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${server.url}${PAGE}`);
  await ready(page);
  await page.waitForFunction(() => !!(globalThis as any).df$?.shadcn?.contextMenuApi, undefined, { timeout: 10_000 });
  const shown = (sel: string) => page.$eval(sel, (e) => e.checkVisibility());
  const current = () => page.evaluate(() => [...document.querySelectorAll('.nt-page')].filter((p) => getComputedStyle(p).display !== 'none').map((p) => (p as HTMLElement).dataset.page));
  const blocks = (slug: string) => page.$$eval(`#p-${slug} .nt-blocks > .nt-block`, (b) => b.map((x) => (x as HTMLElement).dataset.type + ':' + (x.querySelector(':scope > .nt-text')?.textContent ?? '')));
  const focusedType = () => page.evaluate(() => (document.activeElement!.closest('.nt-block') as HTMLElement)?.dataset.type);
  const GS = '#p-getting-started';
  // a pointer drag in small steps, like a hand: press, move a little (the
  // drag starts), travel, release
  const drag = async (from: string, to: string) => {
    const a = (await page.locator(from).boundingBox())!, b = (await page.locator(to).boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + 12);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 8, a.y + 20, { steps: 4 });
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
    await page.mouse.up();
  };

  await check('opens on Getting started; the tree marks it', async () => {
    assert.deepEqual(await current(), ['getting-started']);
    assert.equal(await page.getAttribute('[data-nt-private] .tree-item[data-page="getting-started"]', 'aria-selected'), 'true');
    assert.equal(await page.$$eval('.nt-page', (p) => p.length), 7);
  });

  await check('a branch in the tree opens its page and shows the sub-pages', async () => {
    await page.click('#nt-sidebar [data-nt-private] .tree-item[data-page="wiki"] > details > summary');
    await page.waitForTimeout(150);
    assert.deepEqual(await current(), ['wiki']);
    assert.equal(await shown('#nt-sidebar [data-nt-private] .tree-item[data-page="onboarding"]'), true);
    await page.click('#p-wiki .nt-pagelink[href="#/pages/onboarding"]');
    await page.waitForTimeout(150);
    assert.deepEqual(await current(), ['onboarding']);
    assert.equal((await page.textContent('#p-onboarding .breadcrumb'))!.replace(/\s+/g, ' ').trim(), '📚 Engineering Wiki/🚀 Onboarding');
  });

  await check('Enter continues a list; Enter on an empty item leaves it', async () => {
    await page.goto(`${server.url}${PAGE}#/pages/getting-started`);
    await ready(page);
    await page.click(`${GS} .nt-blocks > .nt-block[data-type="bullet"]:last-child > .nt-text`);
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    assert.equal(await focusedType(), 'bullet');
    await page.keyboard.press('Enter');
    assert.equal(await focusedType(), 'p');
  });

  await check('markdown shortcuts: "# " "[] " "- " turn the line into a heading, a to-do, a bullet', async () => {
    await page.keyboard.type('# Plans');
    assert.equal(await focusedType(), 'h1');
    assert.equal(await page.evaluate(() => document.activeElement!.getAttribute('aria-level')), '2');
    await page.keyboard.press('Enter');
    await page.keyboard.type('[] Buy milk');
    assert.equal(await focusedType(), 'todo');
    await page.keyboard.press('Enter');
    assert.equal(await focusedType(), 'todo', 'a to-do continues');
    await page.keyboard.press('Backspace');
    assert.equal(await focusedType(), 'p', 'Backspace at the start turns it back into text');
    await page.keyboard.type('- One');
    assert.equal(await focusedType(), 'bullet');
    const b = await blocks('getting-started');
    assert.ok(b.includes('h1:Plans') && b.includes('todo:Buy milk') && b.includes('bullet:One'), b.slice(-4).join(' | '));
  });

  await check('the slash menu: "/" opens it, typing filters, Enter turns the block', async () => {
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    assert.equal(await focusedType(), 'p');
    await page.keyboard.type('/');
    await page.waitForTimeout(200);
    assert.equal(await page.$eval('#nt-slash', (m) => m.matches(':popover-open')), true);
    await page.keyboard.type('quo');
    const visible = await page.$$eval('#nt-slash .nt-slash-item', (i) => i.filter((x) => !(x as HTMLElement).hidden).map((x) => (x as HTMLElement).dataset.block));
    assert.deepEqual(visible, ['quote']);
    await page.keyboard.press('Enter');
    assert.equal(await focusedType(), 'quote');
    assert.equal(await page.evaluate(() => document.activeElement!.textContent), '');
    assert.equal(await page.$eval('#nt-slash', (m) => m.matches(':popover-open')), false);
  });

  await check('Backspace on an empty block removes it and lands in the one before', async () => {
    await page.keyboard.press('Backspace');
    assert.equal(await focusedType(), 'p');
    const n = (await blocks('getting-started')).length;
    await page.keyboard.press('Backspace');
    assert.equal((await blocks('getting-started')).length, n - 1);
    assert.equal(await focusedType(), 'bullet');
  });

  await check('selecting text shows the format bar; Bold wraps it', async () => {
    await page.evaluate(() => {
      const t = document.querySelector('#p-getting-started .nt-blocks > .nt-block[data-type="p"] > .nt-text')!;
      const r = document.createRange();
      r.setStart(t.lastChild!, 1); r.setEnd(t.lastChild!, 8);
      (t as HTMLElement).focus();
      getSelection()!.removeAllRanges(); getSelection()!.addRange(r);
    });
    await page.waitForTimeout(250);
    assert.equal(await page.$eval('#nt-format', (m) => m.matches(':popover-open')), true);
    await page.click('#nt-format [data-cmd="bold"]');
    assert.equal(await page.$$eval(`${GS} .nt-blocks > .nt-block[data-type="p"]:first-child b`, (b) => b.length), 1);
    await page.click('#nt-format [data-cmd="mark"]');
    assert.equal(await page.$$eval(`${GS} .nt-blocks > .nt-block[data-type="p"]:first-child mark`, (b) => b.length), 1);
  });

  await check('a toggle opens and shows its children', async () => {
    const t = `${GS} .nt-block[data-type="toggle"]`;
    assert.equal(await shown(`${t} > .nt-children`), false);
    await page.click(`${t} > .nt-arrow`);
    assert.equal(await page.getAttribute(`${t} > .nt-arrow`, 'aria-expanded'), 'true');
    assert.equal(await shown(`${t} > .nt-children`), true);
  });

  await check('the ⋮⋮ handle opens the block menu: Turn into, Delete', async () => {
    const callout = `${GS} .nt-blocks > .nt-block[data-type="callout"]`;
    await page.hover(callout);
    await page.click(`${callout} > .nt-gutter .nt-grip`);
    await page.waitForTimeout(200);
    assert.equal(await page.$eval('#nt-block-menu', (m) => m.matches(':popover-open')), true);
    await page.click('#nt-block-menu [data-turn="quote"]');
    assert.equal(await page.$$eval(`${GS} .nt-blocks > .nt-block[data-type="callout"]`, (b) => b.length), 0);
    const quote = `${GS} .nt-blocks > .nt-block[data-type="quote"]`;
    assert.equal(await page.$$eval(`${quote} > .nt-emoji`, (e) => e.length), 0);
    const n = (await blocks('getting-started')).length;
    await page.hover(quote);
    await page.click(`${quote} > .nt-gutter .nt-grip`);
    await page.waitForTimeout(200);
    await page.click('#nt-block-menu [data-act="del"]');
    assert.equal((await blocks('getting-started')).length, n - 1);
  });

  await check('drag a block by its handle below another', async () => {
    const before = await blocks('onboarding');
    await page.goto(`${server.url}${PAGE}#/pages/onboarding`);
    await ready(page);
    await page.waitForTimeout(150);
    const first = '#p-onboarding .nt-blocks > .nt-block:nth-child(1)';
    await page.hover(first);
    const box = (await page.locator('#p-onboarding .nt-blocks > .nt-block:nth-child(3)').boundingBox())!;
    await page.dragAndDrop(`${first} > .nt-gutter .nt-grip`, '#p-onboarding .nt-blocks > .nt-block:nth-child(3)', { targetPosition: { x: 40, y: box.height - 3 } });
    const after = await blocks('onboarding');
    assert.deepEqual(after.slice(0, 3), [before[1], before[2], before[0]], after.slice(0, 3).join(' | '));
  });

  await check('the title and the icon follow the page into the tree, the breadcrumb and ⌘K', async () => {
    await page.goto(`${server.url}${PAGE}#/pages/journal`);
    await ready(page);
    await page.waitForTimeout(150);
    await page.click('#t-journal');
    await page.keyboard.press('End');
    await page.keyboard.type(' 2026');
    assert.equal(await page.textContent('#nt-sidebar [data-nt-private] [data-title-of="journal"]'), 'Journal 2026');
    assert.equal(await page.textContent('#p-journal .breadcrumb [data-title-of="journal"]'), 'Journal 2026');
    assert.equal(await page.textContent('#nt-cmd [data-title-of="journal"]'), 'Journal 2026');
    await page.click('#p-journal [data-nt-icon]');
    await page.click('#nt-emoji [data-emoji="🎯"]');
    assert.equal(await page.textContent('#nt-sidebar [data-nt-private] [data-icon-of="journal"]'), '🎯');
  });

  await check('favorite: the star adds the page to Favorites and takes it out again', async () => {
    await page.click('#p-journal [data-nt-fav]');
    assert.equal(await page.$$eval('#nt-sidebar [data-nt-favs] [data-page="journal"]', (x) => x.length), 1);
    assert.equal(await page.textContent('#nt-sidebar [data-nt-favs] [data-page="journal"] [data-title-of]'), 'Journal 2026');
    await page.click('#p-journal [data-nt-fav]');
    assert.equal(await page.$$eval('#nt-sidebar [data-nt-favs] [data-page="journal"]', (x) => x.length), 0);
  });

  await check('page options: full width, serif font; move to trash and restore', async () => {
    await page.click('#p-journal [data-dropdown-trigger="nt-more-journal"]');
    await page.click('#nt-more-journal [data-nt-opt="full"]');
    assert.equal(await page.$eval('#p-journal', (p) => p.hasAttribute('data-full')), true);
    await page.click('#nt-more-journal [data-nt-font][data-value="serif"]');
    assert.equal(await page.getAttribute('#p-journal', 'data-font'), 'serif');
    await page.click('#nt-more-journal [data-nt-trash]');
    await page.waitForTimeout(150);
    assert.notDeepEqual(await current(), ['journal']);
    assert.equal(await page.$eval('#nt-sidebar [data-nt-private] [data-page="journal"]', (x) => (x as HTMLElement).hidden), true);
    assert.equal(await page.$$eval('[data-nt-trash-list] li', (x) => x.length), 1);
    await page.goto(`${server.url}${PAGE}#/pages/journal`);
    await ready(page);
    assert.equal(await shown('#p-journal .nt-trashed'), true);
    await page.click('#p-journal .nt-trashed [data-nt-restore]');
    assert.equal(await shown('#p-journal .nt-trashed'), false);
    assert.equal(await page.$eval('#nt-sidebar [data-nt-private] [data-page="journal"]', (x) => (x as HTMLElement).hidden), false);
  });

  await check('a new page: stamped from the template, a starter, the title names it in the tree', async () => {
    await page.click('#nt-sidebar .nt-add-page');
    await page.waitForTimeout(200);
    assert.deepEqual(await current(), ['untitled-1']);
    assert.equal(await page.evaluate(() => document.activeElement!.id), 't-untitled-1');
    await page.keyboard.type('Groceries');
    assert.equal(await page.textContent('#nt-sidebar [data-nt-private] [data-title-of="untitled-1"]'), 'Groceries');
    await page.click('#p-untitled-1 [data-starter="todo"]');
    assert.deepEqual(await blocks('untitled-1'), ['todo:', 'todo:', 'todo:']);
    await page.keyboard.type('Apples');
    assert.equal(await page.textContent('#p-untitled-1 .nt-block:first-child .nt-text'), 'Apples');
  });

  await check('the roadmap: a status select moves the board card and the gallery pill', async () => {
    await page.goto(`${server.url}${PAGE}#/pages/roadmap`);
    await ready(page);
    await page.waitForTimeout(150);
    assert.equal(await page.$$eval('#p-roadmap tbody tr', (r) => r.length), 7);
    await page.selectOption('#p-roadmap tr[data-item="r3"] select[data-field="status"]', 'done');
    assert.equal(await page.$eval('.nt-card[data-item="r3"]', (c) => (c.closest('.nt-col') as HTMLElement).dataset.status), 'done');
    assert.equal(await page.textContent('.nt-gcard[data-item="r3"] [data-f="status"]'), 'Done');
    assert.equal(await page.textContent('.nt-col[data-status="done"] .nt-count'), '3');
  });

  await check('the board: drag a card to another column; the table follows', async () => {
    await page.click('#p-roadmap .nt-db-views label:has(input[value="board"])');
    assert.deepEqual([await shown('.nt-db-board'), await shown('.nt-db-table')], [true, false]);
    // the toasts of the earlier steps would sit over the Done column
    await page.evaluate(() => (globalThis as any).df$.shadcn.toast.dismiss());
    await page.waitForTimeout(400);
    await drag('.nt-card[data-item="r1"]', '.nt-col[data-status="done"] .nt-cards');
    assert.equal(await page.$eval('.nt-card[data-item="r1"]', (c) => (c.closest('.nt-col') as HTMLElement).dataset.status), 'done');
    assert.equal(await page.$eval('tr[data-item="r1"] select[data-field="status"]', (s) => (s as HTMLSelectElement).value), 'done');
  });

  await check('the peek: open an item, edit its name and owner - every view follows', async () => {
    await page.click('#p-roadmap .nt-db-views label:has(input[value="gallery"])');
    await page.click('.nt-gcard[data-item="r2"]');
    await page.waitForTimeout(200);
    assert.equal(await page.$eval('#nt-peek', (d) => (d as HTMLDialogElement).open), true);
    assert.equal(await page.textContent('#nt-peek [data-peek="name"]'), 'Offline sync');
    await page.click('#nt-peek [data-peek="name"]');
    await page.keyboard.press('End');
    await page.keyboard.type(' v2');
    assert.equal(await page.textContent('tr[data-item="r2"] [data-f="name"]'), 'Offline sync v2');
    assert.equal(await page.textContent('.nt-gcard[data-item="r2"] [data-f="name"]'), 'Offline sync v2');
    await page.selectOption('#nt-peek [data-peek="owner"]', 'sophie');
    assert.equal(await page.textContent('tr[data-item="r2"] [data-f="owner"]'), 'Sophie Tan');
    await page.keyboard.press('Escape');
  });

  await check('New adds an item to all three views and opens it', async () => {
    await page.waitForTimeout(200);
    await page.click('#p-roadmap .nt-db-bar [data-nt-db-new]');
    await page.waitForTimeout(200);
    assert.equal(await page.$$eval('#p-roadmap tbody tr', (r) => r.length), 8);
    assert.equal(await page.$$eval('.nt-card[data-item="r8"], .nt-gcard[data-item="r8"]', (r) => r.length), 2);
    await page.keyboard.type('Comments in the margin');
    assert.equal(await page.textContent('tr[data-item="r8"] [data-f="name"]'), 'Comments in the margin');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await page.fill('[data-nt-db-filter]', 'sync');
    const vis = await page.$$eval('.nt-gcard', (c) => c.filter((x) => x.checkVisibility()).map((x) => (x as HTMLElement).dataset.item));
    assert.deepEqual(vis, ['r2']);
    await page.fill('[data-nt-db-filter]', '');
  });

  await check('⌘K jumps to a page; Share invites with a toast', async () => {
    await page.keyboard.press('Meta+k');
    assert.equal(await page.$eval('#nt-cmd', (d) => (d as HTMLDialogElement).open), true);
    await page.click('#nt-cmd .command-item[data-go="/pages/meetings"]');
    await page.waitForTimeout(150);
    assert.deepEqual(await current(), ['meetings']);
    await page.click('#p-meetings [popovertarget="nt-share"]');
    await page.fill('#nt-invite', 'sam@example.com');
    await page.click('#nt-share button[type="submit"]');
    assert.ok((await page.textContent('.toast-container .toast'))!.includes('Invitation sent'));
  });

  await check('narrow: the sidebar becomes a drawer', async () => {
    await page.setViewportSize({ width: 420, height: 860 });
    await page.waitForTimeout(150);
    assert.deepEqual([await shown('#nt-sidebar'), await shown('#p-meetings .nt-mobile-trigger')], [false, true]);
    await page.click('#p-meetings .nt-mobile-trigger');
    assert.equal(await page.$eval('#nt-mobile-nav', (d) => (d as HTMLDialogElement).open), true);
  });

  await check('no script errors along the way', async () => {
    assert.deepEqual(errors, []);
  });
  await check('routing: a page is #/pages/:slug - a deep link opens it, the tree follows, Back returns; translation: German, every target in both languages', async () => {
    const hash = '#/pages/roadmap';
    const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await offlineJsdelivr(p);
    await p.route(/huggingface\.co/, (r) => r.abort());
    await p.goto(`${server.url}${PAGE}${hash}`);
    await ready(p);
    await p.waitForFunction((r) => document.querySelector(r)?.hasAttribute('lang'), '[data-nt]', { timeout: 15_000 });
    const visible = (sel: string) => p.$eval(sel, (e) => e.checkVisibility());
    assert.equal(await visible('#p-roadmap'), true);
    assert.equal(await p.getAttribute('#nt-sidebar .tree-item[data-page="roadmap"]', 'aria-selected'), 'true');
    await p.click('#nt-sidebar .tree-leaf[href="#/pages/journal"]');
    await p.waitForFunction(() => location.hash === '#/pages/journal' && !document.getElementById('p-journal')!.hidden);
    await p.goBack();
    await p.waitForFunction(() => location.hash === '#/pages/roadmap' && !document.getElementById('p-roadmap')!.hidden);
    assert.deepEqual(await translationGaps(p, '[data-nt]'), [], 'every target and attribute in English and German');
    assert.equal(await renderedLanguage(p, '[data-nt]'), 'en');
    await chooseLanguage(p, 'de');
    assert.equal(await renderedLanguage(p, '[data-nt]'), 'de');
    assert.equal(await p.textContent('#nt-sidebar [data-i18n-target="nav-favorites-d"]'), 'Favoriten');
    assert.equal(await p.textContent('[data-i18n-target="cmd-pages"]'), 'Seiten');
    await p.close();
  });

  // -- storage, search and backups: a browser of its own, with the models served offline
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  // the native save dialog has no one to answer it here: the backup takes the download path
  await ctx.addInitScript(() => {
    delete (globalThis as { showSaveFilePicker?: unknown }).showSaveFilePicker;
  });
  const app = await ctx.newPage();
  await offlineJsdelivr(app);
  const modelRequests = await offlineModels(app);
  const appErrors: string[] = [];
  app.on('pageerror', (e) => appErrors.push(String(e)));
  await app.goto(`${server.url}${PAGE}`);
  await ready(app);
  const saved = () => app.waitForFunction(() => document.querySelector('#nt-sidebar [data-nt-saved]')?.getAttribute('data-state') === 'saved', undefined, { timeout: 5000 });
  /** the palette open or closed - ⌘K toggles it, so a check left open by another must not turn it off */
  const palette = async (open: boolean) => {
    if ((await app.$eval('#nt-cmd', (d) => (d as HTMLDialogElement).open)) !== open) await app.keyboard.press('Meta+k');
  };
  const search = async (q: string) => {
    // the keyword index is built after the stored workspace is in place - under load that takes a while
    await app.waitForFunction(() => /ready/.test(document.querySelector('[data-nt-set="lexical"]')?.textContent ?? ''), undefined, { timeout: 30_000 });
    await palette(true);
    await app.fill('#nt-cmd .command-input', q);
    await app
      .waitForFunction((q) => document.querySelector('[data-nt-find-status]')?.textContent?.includes(' ms') && (document.querySelector('#nt-cmd .command-input') as HTMLInputElement).value === q, q, { timeout: 15_000 })
      .catch(async () => {
        const seen = await app.evaluate(() => ({
          open: (document.getElementById('nt-cmd') as HTMLDialogElement).open,
          value: (document.querySelector('#nt-cmd .command-input') as HTMLInputElement).value,
          status: document.querySelector('[data-nt-find-status]')?.textContent,
          lexical: document.querySelector('[data-nt-set="lexical"]')?.textContent,
          semantic: document.querySelector('[data-nt-set="semantic"]')?.textContent,
        }));
        throw new Error(`no ranked result for "${q}": ${JSON.stringify(seen)}`);
      });
    await app.waitForTimeout(150);
    return app.$$eval('#nt-cmd [data-nt-hit]', (h) => h.map((x) => ({ id: (x as HTMLElement).dataset.ntHit!, via: (x as HTMLElement).dataset.via! })));
  };
  const readIndex = (p: Page) =>
    p.evaluate(async () => {
      const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('folio');
      const file = await (await dir.getFileHandle('search-index.json')).getFile();
      const index = JSON.parse(await file.text());
      return { documents: index.documents.length, vectors: Object.keys(index.vectors).length, model: index.model as string | null };
    });

  await check('storage: an edit is saved in the origin private file system and comes back on a reload', async () => {
    assert.equal(await app.getAttribute('[data-nt]', 'data-nt-store'), 'opfs');
    await app.click('#p-getting-started .nt-title');
    await app.keyboard.press('End');
    await app.keyboard.type(' - kept');
    await saved();
    assert.equal(await app.textContent('#nt-sidebar [data-nt-saved]'), 'Saved in this browser');
    await app.reload();
    await ready(app);
    assert.equal(await app.textContent('#p-getting-started .nt-title'), 'Getting started - kept');
    assert.equal(await app.textContent('#nt-sidebar [data-nt-private] [data-title-of="getting-started"]'), 'Getting started - kept');
  });

  await check('search by keywords: ⌘K ranks sections and items; a hit opens its page at the section', async () => {
    const hits = await search('reviewer');
    assert.ok(hits.length > 0, 'a keyword finds something');
    assert.ok(hits[0]!.id.startsWith('code-review~'), `the review guidelines first, got ${hits[0]?.id}`);
    assert.ok(hits[0]!.via.split(' ').includes('lexical'));
    // the palette's own highlight is no edit: an open palette once saved, re-ranked and saved again in a loop
    await app.waitForTimeout(1500);
    assert.equal(await app.getAttribute('#nt-sidebar [data-nt-saved]', 'data-state'), 'saved', 'nothing to save while searching');
    assert.equal(await app.$eval('#nt-cmd [data-nt-cmd-pages]', (g) => g.checkVisibility()), false, 'the hits replace the page list');
    await app.click(`#nt-cmd [data-nt-hit="${hits[0]!.id}"]`);
    await app.waitForFunction(() => location.hash === '#/pages/code-review' && !document.getElementById('p-code-review')!.hidden);
    assert.equal(await app.$eval('#nt-cmd', (d) => (d as HTMLDialogElement).open), false);
    const item = await search('widgets');
    assert.ok(item.some((h) => h.id === 'roadmap~item~r5'), 'a roadmap item is a document of its own');
    await app.click('#nt-cmd [data-nt-hit="roadmap~item~r5"]');
    await app.waitForFunction(() => (document.getElementById('nt-peek') as HTMLDialogElement).open);
    assert.equal(await app.textContent('#nt-peek [data-peek="name"]'), 'Home screen widgets');
    await app.keyboard.press('Escape');
  });

  await check('search by meaning: on a click both models load from their pinned files, a German query finds the meeting notes, nonsense finds nothing', async () => {
    // nobody gets them unasked: the palette offers them
    await palette(false);
    await palette(true);
    assert.equal(await app.textContent('#nt-cmd [data-nt-semantic]'), 'Also search by meaning');
    assert.equal(modelRequests.length, 0, 'no model file before the click');
    await app.click('#nt-cmd [data-nt-semantic]');
    await palette(false);
    await app.waitForFunction(() => /ready/.test(document.querySelector('[data-nt-set="semantic"]')?.textContent ?? ''), undefined, { timeout: 120_000 });
    const files = modelRequests.map((u) => u.split('/').pop());
    for (const f of ['model_uint4.onnx.br', 'model_q8.onnx.br']) assert.ok(files.includes(f), `${f} was downloaded`);
    const de = await search('Besprechung');
    assert.ok(de[0]?.id.startsWith('meetings~'), `the meeting notes first, got ${de.map((h) => h.id)}`);
    assert.ok(!de[0]!.via.includes('lexical'), 'no keyword of the page is in the query - meaning found it');
    assert.ok((await app.textContent('[data-nt-find-status]'))!.includes('keywords and meaning'));
    assert.deepEqual(await search('zzqx qqv'), [], 'below the threshold nothing is a hit');
    await palette(false);
    const index = await readIndex(app);
    assert.equal(index.vectors, index.documents, 'a vector per document, kept in the index file');
    assert.ok(index.model?.startsWith('winzling:'));
  });

  await check('a reload loads the kept models by itself, from storage, not from the network', async () => {
    const before = modelRequests.length;
    await app.reload();
    await ready(app);
    await app.waitForFunction(() => /ready/.test(document.querySelector('[data-nt-set="semantic"]')?.textContent ?? ''), undefined, { timeout: 60_000 });
    assert.equal(modelRequests.length, before, 'no model file downloaded again');
    assert.ok((await search('Besprechung'))[0]?.id.startsWith('meetings~'));
    await palette(false);
  });

  let backupFile = '';
  await check('backup: the workspace menu saves the pages and the search index in one Brotli-compressed file', async () => {
    await palette(false);
    await app.click('.nt-ws');
    const download = app.waitForEvent('download');
    await app.click('#nt-ws-menu [data-nt-backup]');
    const d = await download;
    assert.match(d.suggestedFilename(), /^folio-backup-\d{4}-\d{2}-\d{2}\.json\.br$/);
    backupFile = join(OUT, 'notes-backup.json.br');
    await d.saveAs(backupFile);
    const packed = readFileSync(backupFile);
    assert.notEqual(packed[0], '{'.charCodeAt(0), 'not plain JSON');
    const json = brotliDecompressSync(packed).toString('utf8');
    assert.ok(packed.length * 4 < json.length, `Brotli shrinks it: ${packed.length} of ${json.length} bytes`);
    const backup = JSON.parse(json);
    assert.equal(backup.format, 'folio-backup');
    assert.equal(backup.workspace.regions['.nt-pages'].length, 1);
    assert.ok(backup.workspace.regions['.nt-pages'][0].includes('Getting started - kept'));
    assert.equal(backup.index.format, 'folio-index');
    assert.equal(Object.keys(backup.index.vectors).length, backup.index.documents.length);
    assert.ok(backup.index.lexical, 'the lexical index too');
  });

  await check('import: a fresh browser asks, then holds the pages and the index - nothing embedded again', async () => {
    const fresh = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await fresh.newPage();
    await offlineJsdelivr(p);
    await p.route(/huggingface\.co/, (r) => r.abort());
    await p.goto(`${server.url}${PAGE}`);
    await ready(p);
    assert.equal(await p.textContent('#p-getting-started .nt-title'), 'Getting started');
    await p.setInputFiles('[data-nt-import-file]', backupFile);
    await p.waitForSelector('#nt-confirm[open]');
    assert.match((await p.textContent('#nt-confirm-desc'))!, /holds 7 pages/);
    await p.click('#nt-confirm [data-nt-confirm-ok]');
    await p.waitForFunction(() => document.querySelector('#p-getting-started .nt-title')?.textContent === 'Getting started - kept');
    await p.waitForFunction(() => document.querySelector('#nt-sidebar [data-nt-saved]')?.getAttribute('data-state') === 'saved');
    // the index file is written once the restored workspace is indexed
    let index = await readIndex(p).catch(() => null);
    for (let i = 0; i < 50 && !index?.vectors; i++) {
      await p.waitForTimeout(100);
      index = await readIndex(p).catch(() => null);
    }
    assert.ok(index && index.vectors > 0 && index.vectors === index.documents, 'the vectors came with the backup');
    await p.reload();
    await ready(p);
    assert.equal(await p.textContent('#p-getting-started .nt-title'), 'Getting started - kept');
    await fresh.close();
  });

  await check('a hostile backup (plain JSON): its scripts, event attributes and script URLs do not run', async () => {
    // an uncompressed .json imports too
    const backup = JSON.parse(brotliDecompressSync(readFileSync(backupFile)).toString('utf8'));
    backup.workspace.regions['.nt-pages'][0] = backup.workspace.regions['.nt-pages'][0].replace(
      '<div class="nt-blocks">',
      '<div class="nt-blocks"><img src="x" onerror="globalThis.__pwned = 1"><script>globalThis.__pwned = 2</script><a href=" javascript:globalThis.__pwned=3" id="nt-evil">x</a><iframe srcdoc="<script>parent.__pwned=4</script>"></iframe>',
    );
    const evil = join(OUT, 'notes-backup-hostile.json');
    writeFileSync(evil, JSON.stringify(backup));
    await app.setInputFiles('[data-nt-import-file]', evil);
    await app.waitForSelector('#nt-confirm[open]');
    await app.click('#nt-confirm [data-nt-confirm-ok]');
    await app.waitForTimeout(800);
    assert.equal(await app.evaluate(() => (globalThis as { __pwned?: number }).__pwned), undefined);
    assert.equal(await app.$$eval('.nt-pages :is(script, iframe, [onerror])', (x) => x.length), 0);
    assert.equal(await app.$eval('#nt-evil', (a) => a.hasAttribute('href')), false);
  });

  await check('Settings: Remove the models takes their files out of storage; the palette offers them again', async () => {
    await palette(false);
    const modelFiles = () =>
      app.evaluate(async () => {
        const names: string[] = [];
        for await (const name of ((await (await navigator.storage.getDirectory()).getDirectoryHandle('folio')) as unknown as { keys(): AsyncIterable<string> }).keys()) names.push(name);
        return names.filter((n) => n.startsWith('model-')).length;
      });
    assert.equal(await modelFiles(), 7, 'the seven pinned files of both models');
    await app.click('.nt-ws');
    await app.click('#nt-ws-menu [data-nt-settings]');
    await app.click('#nt-settings [data-nt-forget]');
    await app.waitForFunction(() => (document.querySelector('#nt-settings [data-nt-forget]') as HTMLElement).hidden);
    assert.equal(await modelFiles(), 0);
    assert.equal(await app.isVisible('#nt-settings [data-nt-semantic]'), true, 'Settings offers them again');
    await app.click('#nt-settings [data-dialog-close]');
  });

  await check('reset: Settings asks, then brings back the sample workspace', async () => {
    await app.click('.nt-ws');
    await app.click('#nt-ws-menu [data-nt-settings]');
    assert.equal(await app.$eval('#nt-settings', (d) => (d as HTMLDialogElement).open), true);
    assert.match((await app.textContent('[data-nt-set="storage"]'))!, /origin private file system/);
    assert.match((await app.textContent('[data-nt-set="lexical"]'))!, /Keyword search over \d+ sections/);
    await app.click('#nt-settings [data-nt-reset]');
    await app.waitForSelector('#nt-confirm[open]');
    await app.click('#nt-confirm [data-nt-confirm-ok]');
    await app.waitForFunction(() => document.querySelector('#p-getting-started .nt-title')?.textContent === 'Getting started');
    await saved();
    await app.reload();
    await ready(app);
    assert.equal(await app.textContent('#p-getting-started .nt-title'), 'Getting started');
  });

  await check('storage, search and backups: no script errors', async () => {
    assert.deepEqual(appErrors, []);
  });
  await ctx.close();

  await check('the docs card: a sandboxed frame without storage keeps the workspace in memory, says so, and searches by keywords', async () => {
    const docs = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
    await offlineJsdelivr(docs);
    await docs.context().route(/huggingface\.co/, (r) => r.abort());
    const cardErrors: string[] = [];
    docs.on('pageerror', (e) => cardErrors.push(String(e)));
    await docs.goto(`${server.url}/dist/documentation/application/scaffold-notes.html`);
    const card = docs.frameLocator('.code-example iframe').first();
    await card.locator('[data-nt][data-nt-store="memory"]').waitFor({ state: 'attached', timeout: 30_000 });
    assert.equal(await card.locator('#nt-sidebar [data-nt-saved]').textContent(), 'Not kept - this preview has no storage');
    await card.locator('[data-command-trigger="nt-cmd"]').first().evaluate((b) => (b as HTMLElement).click());
    await card.locator('#nt-cmd .command-input').fill('roadmap');
    await card.locator('#nt-cmd [data-nt-hit]').first().waitFor({ timeout: 15_000 });
    assert.match((await card.locator('[data-nt-find-status]').textContent())!, /results in \d+ ms - keywords$/);
    assert.equal(await card.locator('#nt-cmd [data-nt-semantic]').isVisible(), true, 'the models are offered, never loaded unasked');
    assert.deepEqual(cardErrors, []);
    await docs.close();
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`scaffold-notes.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('scaffold-notes.e2e: all checks passed');
