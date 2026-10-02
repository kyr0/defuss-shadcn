import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from './server.ts';

/**
 * Why: the notes scaffold is a clickdummy - its promise is that the clicks
 * (and the typing) work. This drives the generated full-screen page
 * (dist/documentation/app-notes.html, built from the scaffold page's own
 * example fence): the page tree, the block editor (Enter, Backspace,
 * markdown shortcuts, the slash menu, the format bar, toggles, the block
 * menu, drag to move), titles and icons everywhere, new pages, favorites,
 * trash, page options, the roadmap database in all three views with its
 * peek, ⌘K, sharing and the narrow layout.
 */
const PAGE = '/dist/documentation/app-notes.html';
const server = startServer();
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
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${server.url}${PAGE}`);
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
    await page.click('#p-wiki .nt-pagelink[href="#p-onboarding"]');
    await page.waitForTimeout(150);
    assert.deepEqual(await current(), ['onboarding']);
    assert.equal((await page.textContent('#p-onboarding .breadcrumb'))!.replace(/\s+/g, ' ').trim(), '📚 Engineering Wiki/🚀 Onboarding');
  });

  await check('Enter continues a list; Enter on an empty item leaves it', async () => {
    await page.goto(`${server.url}${PAGE}#p-getting-started`);
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
    await page.goto(`${server.url}${PAGE}#p-onboarding`);
    await page.waitForTimeout(150);
    const first = '#p-onboarding .nt-blocks > .nt-block:nth-child(1)';
    await page.hover(first);
    const box = (await page.locator('#p-onboarding .nt-blocks > .nt-block:nth-child(3)').boundingBox())!;
    await page.dragAndDrop(`${first} > .nt-gutter .nt-grip`, '#p-onboarding .nt-blocks > .nt-block:nth-child(3)', { targetPosition: { x: 40, y: box.height - 3 } });
    const after = await blocks('onboarding');
    assert.deepEqual(after.slice(0, 3), [before[1], before[2], before[0]], after.slice(0, 3).join(' | '));
  });

  await check('the title and the icon follow the page into the tree, the breadcrumb and ⌘K', async () => {
    await page.goto(`${server.url}${PAGE}#p-journal`);
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
    await page.goto(`${server.url}${PAGE}#p-journal`);
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
    await page.goto(`${server.url}${PAGE}#p-roadmap`);
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
    await page.click('#nt-cmd .command-item[data-go="p-meetings"]');
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
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`scaffold-notes.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('scaffold-notes.e2e: all checks passed');
