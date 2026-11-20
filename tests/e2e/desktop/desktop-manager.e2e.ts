import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

/**
 * Why: the desktop's icons select like a classic desktop - the maintainer asked for it (2026-11-20: "click and move
 * the mouse to draw a rectangle to select many"). These checks drive the real dist/ files with a real mouse, keys
 * and touch: click, Ctrl and Shift clicks, the rubber band (mouse and touch, Ctrl keeps the earlier selection),
 * dragging the selection to grid cells, arrows by place, Ctrl+A, Enter / double click (desktop-open), Delete, F2
 * rename (Enter keeps, Escape restores), Escape clears; both states and the render() contract.
 */

const server = startServer();
const browser = await chromium.launch();
let failures = 0;
const check = async (label: string, fn: () => Promise<void>): Promise<void> => {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${label}\n    ${err instanceof Error ? err.message : err}`);
  }
};

const selected = (page: Page, sel = '#dm') =>
  page.$$eval(`${sel} .desktop-icon[aria-selected="true"]`, (i) => i.map((x) => (x as HTMLElement).dataset.value));
const center = async (page: Page, sel: string) => {
  const b = (await page.locator(sel).boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

try {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  page.on('pageerror', (e) => {
    failures++;
    console.error(`  ✗ page error: ${e.message}`);
  });
  await page.goto(`${server.url}/tests/e2e/desktop/desktop-manager.e2e-fixture.html`);
  await page.waitForSelector('#dm[data-init]');
  await page.evaluate(() => {
    (globalThis as any).events = [];
    for (const t of ['desktop-open', 'desktop-select', 'desktop-delete', 'desktop-rename'])
      document.querySelector('#dm')!.addEventListener(t, (e) => (globalThis as any).events.push([t, (e as CustomEvent).detail]));
  });
  const events = (type: string) =>
    page.evaluate((t) => (globalThis as any).events.filter((e: any) => e[0] === t).map((e: any) => e[1]), type);

  await check('icons fill a column top to bottom, then the next', async () => {
    const pos = await page.$$eval('#dm .desktop-icon', (i) => i.map((x) => [(x as HTMLElement).offsetLeft, (x as HTMLElement).offsetTop]));
    assert.equal(pos[0][0], pos[3][0], 'four in the first column');
    assert.ok(pos[4][0] > pos[0][0] && pos[4][1] === pos[0][1], 'the fifth starts the second column');
  });

  await check('click selects one; Ctrl adds and removes; Shift takes the range', async () => {
    await page.click('#i-computer');
    assert.deepEqual(await selected(page), ['computer']);
    await page.click('#i-pictures', { modifiers: ['ControlOrMeta'] });
    assert.deepEqual(await selected(page), ['computer', 'pictures']);
    await page.click('#i-computer', { modifiers: ['ControlOrMeta'] });
    assert.deepEqual(await selected(page), ['pictures']);
    // the range starts at the last clicked icon - Computer, even though that click removed it
    await page.click('#i-notes', { modifiers: ['Shift'] });
    assert.deepEqual(await selected(page), ['computer', 'documents', 'pictures', 'trash', 'notes']);
    assert.ok((await events('desktop-select')).length >= 4);
  });

  await check('a click on an empty spot clears the selection', async () => {
    const box = (await page.locator('#dm').boundingBox())!;
    await page.mouse.click(box.x + box.width - 20, box.y + box.height - 20);
    assert.deepEqual(await selected(page), []);
  });

  await check('the rubber band: drawn from an empty spot, every icon it touches is selected - live', async () => {
    const box = (await page.locator('#dm').boundingBox())!;
    const docs = await center(page, '#i-documents');
    await page.mouse.move(box.x + 4, box.y + 4);
    await page.mouse.down();
    await page.mouse.move(box.x + 40, box.y + 40, { steps: 3 });
    assert.equal(await page.$$eval('#dm .desktop-manager-band', (b) => b.length), 1, 'the band shows');
    await page.mouse.move(docs.x, docs.y, { steps: 6 });
    assert.deepEqual(await selected(page), ['computer', 'documents'], 'while it is drawn');
    await page.mouse.up();
    assert.equal(await page.$$eval('#dm .desktop-manager-band', (b) => b.length), 0, 'gone after');
    assert.deepEqual(await selected(page), ['computer', 'documents']);
  });

  await check('Ctrl + band keeps the earlier selection', async () => {
    const notes = await center(page, '#i-notes');
    const box = (await page.locator('#dm').boundingBox())!;
    await page.keyboard.down('ControlOrMeta');
    await page.mouse.move(box.x + box.width - 10, box.y + 4);
    await page.mouse.down();
    await page.mouse.move(notes.x, notes.y + 10, { steps: 8 });
    await page.mouse.up();
    await page.keyboard.up('ControlOrMeta');
    assert.deepEqual(await selected(page), ['computer', 'documents', 'notes']);
  });

  await check('touch draws the band too', async () => {
    const tp = await browser.newPage({ viewport: { width: 900, height: 900 }, hasTouch: true });
    await tp.goto(`${server.url}/tests/e2e/desktop/desktop-manager.e2e-fixture.html`);
    await tp.waitForSelector('#dm[data-init]');
    const box = (await tp.locator('#dm').boundingBox())!;
    const pics = await center(tp, '#i-pictures');
    const cdp = await tp.context().newCDPSession(tp);
    const touch = (type: string, x: number, y: number) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] } as any);
    // well away from every icon: Chromium's touch adjustment moves a press near an icon onto it
    const x0 = box.x + box.width - 20,
      y0 = box.y + 10;
    await touch('touchStart', x0, y0);
    for (let i = 1; i <= 8; i++) await touch('touchMove', x0 + ((pics.x - x0) * i) / 8, y0 + ((pics.y - y0) * i) / 8);
    await touch('touchEnd', pics.x, pics.y);
    // the band spans rows 1-3 of both columns
    assert.deepEqual(await selected(tp), ['computer', 'documents', 'pictures', 'notes', 'terminal']);
    await tp.close();
  });

  await check('dragging a selected icon moves the whole selection to free grid cells', async () => {
    await page.click('#i-computer');
    await page.click('#i-documents', { modifiers: ['ControlOrMeta'] });
    const from = await center(page, '#i-computer');
    const box = (await page.locator('#dm').boundingBox())!;
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 20, from.y + 5, { steps: 3 });
    await page.mouse.move(box.x + 400, from.y, { steps: 8 });
    await page.mouse.up();
    const areas = await page.$$eval('#i-computer, #i-documents', (i) => i.map((x) => (x as HTMLElement).style.gridArea));
    assert.ok(areas.every((a) => /^\d+ \/ \d+/.test(a)), 'grid cells: ' + areas.join(', '));
    const xs = await page.$$eval('#i-computer, #i-documents', (i) => i.map((x) => (x as HTMLElement).offsetLeft));
    assert.ok(xs.every((x) => x > 300), 'moved right: ' + xs.join(' '));
    assert.deepEqual(await selected(page), ['computer', 'documents'], 'the drag keeps the selection');
    await page.evaluate(() => (globalThis as any).df$.shadcn.desktopManager.arrange('#dm'));
    assert.equal(await page.$eval('#i-computer', (x) => (x as HTMLElement).style.gridArea), '');
  });

  await check('arrows go to the nearest icon by place; Shift extends; Ctrl+A selects all', async () => {
    await page.click('#i-computer');
    await page.keyboard.press('ArrowDown');
    assert.deepEqual(await selected(page), ['documents']);
    await page.keyboard.press('ArrowRight');
    assert.deepEqual(await selected(page), ['terminal'], 'beside Documents in the next column');
    await page.keyboard.press('Shift+ArrowUp');
    assert.deepEqual(await selected(page), ['notes', 'terminal']);
    await page.keyboard.press('ControlOrMeta+a');
    assert.equal((await selected(page)).length, 6);
    await page.keyboard.press('Escape');
    assert.deepEqual(await selected(page), []);
  });

  await check('Enter and double click open (desktop-open); Delete asks the page (desktop-delete)', async () => {
    await page.click('#i-trash');
    await page.click('#i-notes', { modifiers: ['ControlOrMeta'] });
    await page.keyboard.press('Enter');
    await page.dblclick('#i-pictures');
    await page.click('#i-trash');
    await page.keyboard.press('Delete');
    assert.deepEqual(await events('desktop-open'), [{ values: ['trash', 'notes'] }, { values: ['pictures'] }]);
    assert.deepEqual(await events('desktop-delete'), [{ values: ['trash'] }]);
    assert.equal(await page.$$eval('#i-trash', (x) => x.length), 1, 'the page decides - nothing removed');
  });

  await check('F2 renames: Enter keeps it (desktop-rename), Escape puts the old label back', async () => {
    await page.click('#i-notes');
    await page.keyboard.press('F2');
    assert.equal(await page.getAttribute('#i-notes .desktop-icon-label', 'contenteditable'), 'true');
    await page.keyboard.type('Ideas');
    await page.keyboard.press('Enter');
    assert.equal(await page.textContent('#i-notes .desktop-icon-label'), 'Ideas');
    assert.deepEqual((await events('desktop-rename')).at(-1), { value: 'notes', label: 'Ideas' });
    await page.keyboard.press('F2');
    await page.keyboard.type('Scratch');
    await page.keyboard.press('Escape');
    assert.equal(await page.textContent('#i-notes .desktop-icon-label'), 'Ideas');
    assert.equal(await page.getAttribute('#i-notes .desktop-icon-label', 'contenteditable'), null);
  });

  await check('setState selected / default; getState reads clicks back', async () => {
    await page.evaluate(() => (document.querySelector('#dm') as any).api.setState('selected', { values: ['terminal', 'computer'] }));
    assert.deepEqual(await selected(page), ['computer', 'terminal']);
    await page.click('#i-pictures');
    await page.waitForTimeout(30);
    const st = await page.evaluate(() => (document.querySelector('#dm') as any).api.getState());
    assert.deepEqual({ name: st.name, config: st.config }, { name: 'selected', config: { values: ['pictures'] } });
    await page.evaluate(() => (document.querySelector('#dm') as any).api.setState('default'));
    assert.deepEqual(await selected(page), []);
    assert.deepEqual(await page.evaluate(() => (globalThis as any).df$.shadcn.desktopManager.select('#dm', ['documents'])), ['documents']);
  });

  await check('sizes and the wallpaper variant', async () => {
    const w = (sel: string) => page.$eval(sel, (e) => e.getBoundingClientRect().width);
    const sm = await w('#dm-sm .desktop-icon-image'),
      md = await w('#dm .desktop-icon-image'),
      lg = await w('#dm-lg .desktop-icon-image');
    assert.ok(sm < md && md < lg, `${sm} < ${md} < ${lg}`);
    assert.equal(await page.$eval('#dm-lg .desktop-icon-label', (e) => getComputedStyle(e).color), 'rgb(255, 255, 255)');
    assert.deepEqual(await selected(page, '#dm-sm'), ['a'], 'authored selection kept');
  });

  await check('render() contract: both states', async () => {
    await assertRenderContract(page, '.desktop-manager[id]', ['default', 'selected'], {
      runtimeAttrs: ['tabindex', 'style'],
    });
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`desktop-manager.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('desktop-manager.e2e: all checks passed');
