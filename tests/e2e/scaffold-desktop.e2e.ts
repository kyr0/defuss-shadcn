import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from './server.ts';

/**
 * Why: the desktop scaffold is a clickdummy - its promise is that the clicks
 * work. This drives the generated full-screen page
 * (dist/documentation/app-desktop.html, built from the scaffold page's own
 * example fence): the taskbar and its windows, the start menu and its
 * search, the calculator, the editor (save, save as, unsaved changes), the
 * desktop and icon context menus, settings that stay in step everywhere,
 * the browser, quick settings, the clock, the recycle bin, lock, and the
 * narrow layout.
 */
const PAGE = '/dist/documentation/app-desktop.html';
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
  await page.waitForFunction(() => !!(globalThis as any).df$?.shadcn?.win, undefined, { timeout: 10_000 });
  await page.waitForTimeout(300);
  // the taskbar follows the windows on the next frame
  const frame = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(0))));
  const bar = async (app: string) => (await frame(), page.$eval(`[data-app-btn="${app}"]`, (b) => [b.hasAttribute('data-running'), b.hasAttribute('data-active')]));
  const shown = (sel: string) => page.$eval(sel, (e) => e.checkVisibility());
  const os = (attr: string) => page.getAttribute('[data-os]', attr);
  const value = () => page.textContent('#os-calc [data-calc-value]');
  const icon = (name: string) => `.os-icon[data-name="${name}"]`;
  const toasts = () => page.evaluate(() => (globalThis as any).df$.shadcn.toast.dismiss());
  // an empty spot of the desktop - no window there, no toast in the way
  const desktopRightClick = async () => { await toasts(); await page.waitForTimeout(250); await page.mouse.click(1000, 720, { button: 'right' }); await page.waitForTimeout(150); };

  await check('boots with the editor open on Welcome.txt; the taskbar shows it running and in front', async () => {
    assert.equal(await page.$eval('#os-ed-1', (w) => (w as HTMLDialogElement).open), true);
    assert.equal(await page.textContent('#os-ed-1 [data-ed-name]'), 'Welcome.txt');
    assert.deepEqual(await bar('editor'), [true, true]);
    assert.deepEqual(await bar('calc'), [false, false]);
    assert.equal(await shown('[data-app-btn="bin"]'), false, 'an unpinned app shows only while it runs');
    assert.match((await page.textContent('[data-os-time]'))!, /\d{1,2}:\d{2}/);
  });

  await check('the start menu searches; Enter opens the best match', async () => {
    await page.click('.os-start-btn');
    assert.equal(await page.$eval('#os-start', (m) => m.matches(':popover-open')), true);
    await page.keyboard.type('calc');
    assert.equal(await shown('[data-os-results]'), true);
    assert.equal(await page.textContent('[data-os-result-list] [data-first] strong'), 'Calculator');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    assert.equal(await page.$eval('#os-start', (m) => m.matches(':popover-open')), false);
    assert.equal(await page.$eval('#os-calc', (w) => (w as HTMLDialogElement).open), true);
    assert.deepEqual(await bar('calc'), [true, true]);
    assert.deepEqual(await bar('editor'), [true, false]);
  });

  await check('the calculator: clicks, the keyboard, unary keys and division by zero', async () => {
    for (const k of ['1', '2', '+', '3', '0', '=']) await page.click(`#os-calc [data-k="${k}"]`);
    assert.equal(await value(), '42');
    assert.equal(await page.textContent('#os-calc [data-calc-expr]'), '12 + 30 =');
    await page.click('#os-calc .os-calc-display');
    for (const k of ['9', '*', '9', 'Enter']) await page.keyboard.press(k);
    assert.equal(await value(), '81');
    await page.click('#os-calc [data-k="sqrt"]');
    assert.equal(await value(), '9');
    for (const k of ['/', '0', 'Enter']) await page.keyboard.press(k);
    assert.equal(await value(), 'Cannot divide by zero');
    await page.keyboard.press('Escape');
    assert.equal(await value(), '0');
    for (const k of ['0', '.', '1', '+', '0', '.', '2', '=']) await page.click(`#os-calc [data-k="${k}"]`);
    assert.equal(await value(), '0.3');
  });

  await check('the taskbar button minimizes the front window and brings it back', async () => {
    await page.click('[data-app-btn="calc"]');
    assert.equal(await shown('#os-calc'), false);
    assert.deepEqual(await bar('calc'), [true, false]);
    await page.click('[data-app-btn="calc"]');
    assert.equal(await shown('#os-calc'), true);
    assert.deepEqual(await bar('calc'), [true, true]);
  });

  await check('a maximized window comes back maximized', async () => {
    await page.click('[data-app-btn="editor"]');
    await page.click('#os-ed-1 .window-maximize');
    assert.equal(await page.$eval('#os-ed-1', (w) => w.hasAttribute('data-maximized')), true);
    await page.click('[data-app-btn="editor"]');
    assert.equal(await shown('#os-ed-1'), false);
    await page.click('[data-app-btn="editor"]');
    assert.equal(await page.$eval('#os-ed-1', (w) => w.hasAttribute('data-maximized')), true);
    await page.click('#os-ed-1 .window-maximize');
  });

  await check('the editor: typing marks it unsaved, Ctrl+S saves', async () => {
    await toasts();
    await page.click('#os-ed-1 .os-ed-text');
    await page.$eval('#os-ed-1 .os-ed-text', (t) => { const a = t as HTMLTextAreaElement; a.setSelectionRange(a.value.length, a.value.length); });
    await page.keyboard.type('Added a line.');
    assert.equal(await page.$eval('#os-ed-1', (w) => w.hasAttribute('data-dirty')), true);
    assert.match((await page.textContent('#os-ed-1 [data-ed-pos]'))!, /^Ln \d+, Col 14$/);
    await page.keyboard.press('Control+s');
    assert.equal(await page.$eval('#os-ed-1', (w) => w.hasAttribute('data-dirty')), false);
    assert.ok((await page.textContent('.toast-container'))!.includes('Saved'));
  });

  await check('closing with unsaved changes asks; Don\'t save discards', async () => {
    await page.click('#os-ed-1 .os-ed-text');
    await page.keyboard.type(' throwaway');
    await page.click('#os-ed-1 .window-close');
    assert.equal(await page.$eval('#os-unsaved', (d) => (d as HTMLDialogElement).open), true);
    assert.equal(await page.textContent('[data-os-unsaved-name]'), 'Welcome.txt');
    await page.click('#os-unsaved [data-unsaved="discard"]');
    assert.equal(await page.$eval('#os-ed-1', (w) => (w as HTMLDialogElement).open), false);
    await page.dblclick(icon('Welcome.txt'));
    await page.waitForTimeout(150);
    const text = await page.$eval('#os-ed-1 .os-ed-text', (t) => (t as HTMLTextAreaElement).value);
    assert.ok(text.endsWith('Added a line.'), 'the saved text, without the discarded edit');
  });

  await check('File > New, then Save as names the file and puts it on the desktop', async () => {
    await page.click('#os-ed-1 .os-ed-text');
    await page.keyboard.press('Control+n');
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => (document.activeElement!.closest('.os-editor') as HTMLElement).dataset.file), '');
    await page.keyboard.type('Plan for Q4');
    await page.keyboard.press('Control+s');
    assert.equal(await page.$eval('#os-saveas', (d) => (d as HTMLDialogElement).open), true);
    await page.fill('#os-saveas-name', 'Plan');
    await page.click('#os-saveas button[type="submit"]');
    assert.equal(await page.$$eval(icon('Plan.txt'), (i) => i.length), 1);
    assert.equal(await page.textContent('#os-ed-2 [data-ed-name]'), 'Plan.txt');
  });

  await check('the desktop context menu: icon size, background, dark theme - every control agrees', async () => {
    await desktopRightClick();
    assert.equal(await page.$eval('#os-ctx', (m) => m.matches(':popover-open')), true);
    await page.click('#os-ctx [data-set="icons"][data-value="large"]');
    assert.equal(await os('data-icons'), 'large');
    assert.equal(await page.$eval('#os-settings select[data-set="icons"]', (s) => (s as HTMLSelectElement).value), 'large');
    await desktopRightClick();
    await page.click('#os-ctx [data-os="nextwall"]');
    assert.equal(await os('data-wallpaper'), 'aurora');
    assert.equal(await page.$eval('input[name="os-s-wallpaper"][value="aurora"]', (r) => (r as HTMLInputElement).checked), true);
    await desktopRightClick();
    await page.click('#os-ctx [data-set="mode"]');
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), true);
    assert.equal(await page.getAttribute('.os-qs[data-set="mode"]', 'aria-pressed'), 'true');
    assert.equal(await page.$eval('#os-s-mode-dark', (r) => (r as HTMLInputElement).checked), true);
    await desktopRightClick();
    await page.click('#os-ctx [data-set="mode"]');
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), false);
  });

  await check('New text document from the desktop menu opens it in the editor', async () => {
    await desktopRightClick();
    await page.click('#os-ctx [data-os="newfile"]');
    await page.waitForTimeout(200);
    assert.equal(await page.$$eval(icon('New text document.txt'), (i) => i.length), 1);
    const names = await page.$$eval('.os-editor[open] [data-ed-name]', (n) => n.map((x) => x.textContent));
    assert.ok(names.includes('New text document.txt'), names.join());
  });

  await check('icons: click selects, Delete recycles a file, the bin restores it', async () => {
    await page.click(icon('Notes.txt'));
    assert.equal(await page.getAttribute(icon('Notes.txt'), 'aria-selected'), 'true');
    await page.keyboard.press('Delete');
    assert.equal(await page.$$eval(icon('Notes.txt'), (i) => i.length), 0);
    await page.dblclick(icon('Recycle Bin'));
    await page.waitForTimeout(150);
    assert.equal(await shown('[data-app-btn="bin"]'), true);
    assert.deepEqual(await page.$$eval('[data-bin-list] li', (l) => l.map((x) => (x as HTMLElement).dataset.file)), ['Notes.txt', 'Old ideas.txt']);
    await page.click('[data-bin-restore]');
    assert.equal(await page.$$eval(icon('Notes.txt'), (i) => i.length), 1);
    assert.equal(await page.textContent('[data-bin-count]'), '0 items');
  });

  await check('an icon\'s own context menu opens it', async () => {
    await page.click(icon('Calculator'), { button: 'right' });
    await page.waitForTimeout(150);
    assert.equal(await page.$eval('#os-icon-ctx', (m) => m.matches(':popover-open')), true);
    assert.equal(await page.$eval('#os-icon-ctx [data-icon-act="delete"]', (b) => (b as HTMLButtonElement).disabled), false, "an app icon can be deleted? no - but it is not a system icon");
    await page.click('#os-icon-ctx [data-icon-act="open"]');
    assert.deepEqual(await bar('calc'), [true, true]);
  });

  await check('the browser: a real frame, demo sites, search, history, and sites that refuse frames', async () => {
    await page.dblclick(icon('Browser'));
    await page.waitForTimeout(150);
    assert.equal(await page.getAttribute('#os-browser .os-br-view', 'data-mode'), 'internal', 'the start page');
    await page.fill('#os-br-url', 'news.example');
    await page.press('#os-br-url', 'Enter');
    assert.equal(await page.getAttribute('#os-browser .os-br-view', 'data-mode'), 'web');
    assert.equal(await page.textContent('#os-browser [data-br-title]'), 'Daily News');
    await page.waitForFunction(() => !!(document.querySelector('[data-br-frame]') as HTMLIFrameElement).contentDocument?.querySelector('[class*="mk-news"]'), undefined, { timeout: 5000 });
    await page.fill('#os-br-url', 'Lisbon');
    await page.press('#os-br-url', 'Enter');
    assert.equal(await page.getAttribute('[data-br-frame]', 'src'), 'https://en.m.wikipedia.org/w/index.php?search=Lisbon');
    assert.equal(await page.getAttribute('#os-browser [data-br-out]', 'href'), 'https://en.m.wikipedia.org/w/index.php?search=Lisbon');
    await page.fill('#os-br-url', 'example.com');
    await page.press('#os-br-url', 'Enter');
    assert.equal(await page.getAttribute('[data-br-frame]', 'src'), 'https://example.com');
    await page.fill('#os-br-url', 'https://www.google.com/');
    await page.press('#os-br-url', 'Enter');
    assert.equal(await page.getAttribute('#os-browser .os-br-view', 'data-mode'), 'internal');
    assert.equal(await page.textContent('#os-browser [data-br-host]'), 'www.google.com');
    await page.click('#os-browser [data-br="back"]');
    assert.equal(await page.getAttribute('[data-br-frame]', 'src'), 'https://example.com');
    await page.click('#os-browser [data-br="forward"]');
    assert.equal(await page.getAttribute('#os-browser .os-br-view', 'data-mode'), 'internal');
    await page.click('#os-browser [data-br="home"]');
    await page.click('#os-browser .os-speed-item[href*="wikipedia"]');
    assert.equal(await page.getAttribute('[data-br-frame]', 'src'), 'https://en.m.wikipedia.org/wiki/Main_Page');
  });

  await check('quick settings: brightness and night light reach the desktop and Settings', async () => {
    await page.click('.os-tray-icons');
    await page.$eval('#os-quick input[data-set="brightness"]', (s) => { (s as HTMLInputElement).value = '60'; s.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.equal(await page.$eval('[data-os]', (o) => (o as HTMLElement).style.getPropertyValue('--os-bright')), '0.6');
    assert.equal(await page.$eval('#os-settings input[data-set="brightness"]', (s) => (s as HTMLInputElement).value), '60');
    await page.click('.os-qs[data-set="night"]');
    assert.equal(await os('data-night'), '');
    assert.equal(await page.$eval('#os-s-night', (s) => (s as HTMLInputElement).checked), true);
    await page.click('.os-qs[data-set="night"]');
    await page.keyboard.press('Escape');
  });

  await check('the clock opens the calendar', async () => {
    await page.click('.os-clock');
    assert.equal(await page.$eval('#os-cal', (m) => m.matches(':popover-open')), true);
    assert.ok((await page.$$eval('#os-cal .calendar-grid td', (d) => d.length)) >= 28);
    await page.keyboard.press('Escape');
  });

  await check('Settings: taskbar alignment and accent colour', async () => {
    await page.click('[data-app-btn="settings"]');
    await page.click('#os-st-task');
    await page.click('label[for="os-s-taskbar-left"]');
    assert.equal(await os('data-taskbar'), 'left');
    await page.click('#os-st-pers');
    await page.click('.os-accent:has(input[value="green"])');
    assert.equal(await os('data-accent'), 'green');
  });

  await check('show desktop hides every window, a second click brings them back', async () => {
    const before = await page.$$eval('.os .window', (w) => w.filter((x) => x.checkVisibility()).length);
    assert.ok(before > 1);
    await page.click('[data-os-showdesk]');
    assert.equal(await page.$$eval('.os .window', (w) => w.filter((x) => x.checkVisibility()).length), 0);
    await page.click('[data-os-showdesk]');
    assert.equal(await page.$$eval('.os .window', (w) => w.filter((x) => x.checkVisibility()).length), before);
  });

  await check('power > Lock shows the lock screen; a click and Sign in unlock', async () => {
    await page.click('.os-start-btn');
    await page.click('#os-start [data-dropdown-trigger="os-power"]');
    await page.click('#os-power [data-power="lock"]');
    assert.equal(await shown('[data-os-lock]'), true);
    await page.click('[data-os-lock]');
    assert.equal(await shown('[data-os-unlock]'), true);
    await page.click('[data-os-unlock]');
    assert.equal(await shown('[data-os-lock]'), false);
  });

  await check('narrow: windows fill the screen', async () => {
    await page.setViewportSize({ width: 420, height: 860 });
    await page.waitForTimeout(300);
    const r = await page.$eval('#os-settings', (w) => [Math.round(w.getBoundingClientRect().width), Math.round(document.querySelector('.os-desktop')!.getBoundingClientRect().width)]);
    assert.equal(r[0], r[1]);
  });

  await check('no script errors along the way', async () => {
    assert.deepEqual(errors, []);
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`scaffold-desktop.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('scaffold-desktop.e2e: all checks passed');
