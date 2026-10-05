import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from './server.ts';

/**
 * Why: the Theme Designer (docs runtime theme-designer.ts + the switcher's
 * custom-theme support in theme-switcher.ts + the theme menu in layout.ts)
 * promises that what you design is what the whole site shows, that a saved
 * theme survives navigation and reloads, and that leaving the page without
 * saving gives you your theme back. This drives the built docs page in a
 * fresh browser (empty storage). Fonts are checked through their tokens, so
 * the test does not depend on reaching Google Fonts.
 */
const DOCS = '/dist/documentation/';
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
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  /** a persisted store's value (defuss-store envelope), null when unset */
  const storedValue = (key: string) =>
    page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      if (raw == null) return null;
      const parsed = JSON.parse(raw);
      return parsed && parsed.format === 'defuss-store' ? parsed.value : parsed;
    }, key);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // Google Fonts answers with an empty stylesheet: loads succeed offline,
  // and the tokens - not the glyphs - are what is asserted
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const open = async (p: string) => {
    await page.goto(`${server.url}${DOCS}${p}`);
    await page.waitForFunction(() => !!(globalThis as any).df$?.shadcn?.docs?.applyTheme, undefined, { timeout: 10_000 });
  };
  const token = (k: string) => page.evaluate((k) => getComputedStyle(document.documentElement).getPropertyValue('--' + k).trim(), k);
  const slot = () => page.evaluate(() => { const s = document.getElementById('theme-css'); return s ? `${s.tagName}:${s.dataset.themeId}` : null; });
  const field = (k: string) => `.td-token[data-token="${k}"] .input`;
  const settle = () => page.waitForTimeout(120);

  await open('theme-designer.html');
  await page.waitForFunction(() => !!document.querySelector('[data-td-colors] .td-token'), undefined, { timeout: 10_000 });

  await check('the designer builds every colour token and previews on the whole page', async () => {
    assert.equal(await page.$$eval('[data-td-colors] .td-token', (r) => r.length), 32);
    assert.equal(await page.$$eval('[data-td-palette] .td-chip', (r) => r.length), 16);
    assert.equal(await slot(), 'STYLE:__preview');
  });

  await check('starting from a preset loads its palette', async () => {
    await page.selectOption('[data-td-from]', 'claude');
    await settle();
    assert.equal(await token('primary'), '#c96442');
    assert.equal(await page.inputValue(field('primary')), '#c96442');
  });

  await check('typing a colour applies it; an invalid one is flagged and ignored', async () => {
    await page.fill(field('primary'), 'oklch(0.55 0.2 260)');
    await settle();
    assert.equal(await token('primary'), 'oklch(0.55 0.2 260)');
    await page.fill(field('primary'), 'not-a-colour');
    await settle();
    assert.equal(await page.getAttribute(field('primary'), 'aria-invalid'), 'true');
    assert.equal(await token('primary'), 'oklch(0.55 0.2 260)');
  });

  await check('the swatch writes OKLCH, or HEX when chosen', async () => {
    const pick = (v: string) => page.$eval('.td-token[data-token="accent"] input[type="color"]', (i, v) => { (i as HTMLInputElement).value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }, v);
    await pick('#ff0000');
    await settle();
    assert.match(await token('accent'), /^oklch\(0\.628 0\.258 29\.2\)$/);
    await page.selectOption('[data-td-notation]', 'hex');
    await pick('#00ff00');
    await settle();
    assert.equal(await token('accent'), '#00ff00');
  });

  await check('contrast badges follow: a text colour on its own surface fails', async () => {
    await page.fill(field('primary-foreground'), 'oklch(0.55 0.2 260)');
    await settle();
    const badge = '.td-token[data-token="primary-foreground"] [data-contrast]';
    assert.equal(await page.getAttribute(badge, 'data-level'), 'fail');
    assert.match((await page.textContent(badge))!, /^Low 1\.0$/);
  });

  await check('undo and redo step through the edits', async () => {
    await page.waitForTimeout(450); // the history records an edit once you pause
    await page.click('[data-td-undo]');
    await settle();
    assert.notEqual(await token('primary-foreground'), 'oklch(0.55 0.2 260)');
    await page.click('[data-td-redo]');
    await settle();
    assert.equal(await token('primary-foreground'), 'oklch(0.55 0.2 260)');
    await page.fill(field('primary-foreground'), '#ffffff');
    await settle();
  });

  await check('a palette chip edits its colour in a popover, in sync with the panel', async () => {
    await page.click('.td-chip[data-chip="secondary"]');
    await page.waitForSelector('#td-chip-pop:popover-open');
    assert.equal(await page.textContent('#td-chip-pop .popover-title'), '--secondary');
    assert.equal(await page.evaluate(() => document.activeElement?.closest('#td-chip-pop') !== null), true, 'the colour field has focus');
    await page.fill('#td-chip-pop .td-token .input', '#336699');
    await settle();
    assert.equal(await token('secondary'), '#336699');
    assert.equal(await page.inputValue('[data-td-colors] .td-token[data-token="secondary"] .input'), '#336699');
    assert.equal(await page.$eval('.td-chip[data-chip="secondary"]', (c) => (c as HTMLElement).style.getPropertyValue('--c')), '#336699');
    await page.keyboard.press('Escape');
    assert.equal(await page.$$eval('.td-chip[data-editing]', (n) => n.length), 0);
  });

  await check('roundness, letter spacing and a derived shadow scale - in the Forms & Inputs card', async () => {
    assert.equal(await page.$$eval('.td-form-card [data-td-range]', (n) => n.length), 7);
    assert.equal(await page.$eval('[data-td-shadow-box]', (b) => (b as HTMLFieldSetElement).disabled), true, 'shadow controls wait for the switch');
    const slide = (k: string, v: string) => page.$eval(`[data-td-range="${k}"]`, (s, v) => { (s as HTMLInputElement).value = v; s.dispatchEvent(new Event('input', { bubbles: true })); }, v);
    await slide('radius', '1.25');
    await settle();
    assert.equal(await token('radius'), '1.25rem');
    const before = await token('shadow-md');
    await page.click('label[for="td-shadow-on"]');
    assert.equal(await page.$eval('[data-td-shadow-box]', (b) => (b as HTMLFieldSetElement).disabled), false);
    await slide('blur', '24');
    await settle();
    const md = await token('shadow-md');
    assert.notEqual(md, before);
    assert.match(md, /24px/);
    await page.click('label[for="td-shadow-on"]');
    await settle();
    assert.equal(await token('shadow-md'), before, 'off: the token file\'s scale again');
    await slide('tracking', '0.02');
    await settle();
    assert.equal(await token('tracking-normal'), '0.02em');
  });

  await check('a font from the list applies at once; Theme default removes it', async () => {
    await page.click('[data-font-slot="serif"] .combobox-trigger');
    await page.click('[data-font-slot="serif"] .combobox-item[data-value="Lora"]');
    await settle();
    assert.match(await token('font-serif'), /^'Lora', /);
    assert.equal(await page.textContent('[data-font-slot="serif"] .combobox-value'), 'Lora');
    await page.click('[data-font-slot="mono"] .combobox-trigger');
    await page.click('[data-font-slot="mono"] .combobox-item[data-value="Fira Code"]');
    await page.click('[data-font-slot="mono"] .combobox-trigger');
    await page.click('[data-font-slot="mono"] .combobox-item[data-value=""]');
    await settle();
    assert.doesNotMatch(await token('font-mono'), /Fira Code/);
  });

  await check('typing a name the list does not have offers it from Google Fonts', async () => {
    await page.click('[data-font-slot="sans"] .combobox-trigger');
    await page.waitForSelector('#td-fp-sans:popover-open');
    await page.fill('[data-font-slot="sans"] .combobox-search-input', 'Bungee');
    const any = '[data-font-slot="sans"] .td-any-font';
    assert.equal(await page.textContent(any), 'Use “Bungee” from Google Fonts');
    await page.click(any);
    await settle();
    assert.match(await token('font-sans'), /^'Bungee', /);
    assert.equal(await page.textContent('[data-font-slot="sans"] .combobox-value'), 'Bungee');
    await page.click('[data-font-slot="sans"] .combobox-trigger');
    await page.waitForSelector('#td-fp-sans:popover-open');
    await page.fill('[data-font-slot="sans"] .combobox-search-input', 'inter');
    assert.equal(await page.textContent(any), '', 'a listed name needs no extra row');
    await page.fill('[data-font-slot="sans"] .combobox-search-input', '');
    await page.click('[data-font-slot="sans"] .combobox-item[data-value=""]');
    await settle();
  });

  await check('the scaffold tabs show each app in the theme, live', async () => {
    await page.click('#td-vt-messenger');
    const frame = await (await page.waitForSelector('#td-v-messenger iframe', { timeout: 10_000 })).contentFrame();
    await frame!.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--radius').trim() === '1.25rem', undefined, { timeout: 10_000 });
    await page.click('.td-chip[data-chip="primary"]');
    await page.fill('#td-chip-pop .td-token .input', '#aa3300');
    await page.keyboard.press('Escape');
    await frame!.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() === '#aa3300', undefined, { timeout: 5_000 });
    await page.click('[data-td-mode] .toggle[value="dark"]');
    await frame!.waitForFunction(() => document.documentElement.classList.contains('dark'), undefined, { timeout: 5_000 });
    await page.click('[data-td-mode] .toggle[value="light"]');
    // full screen opens the app in a window that follows the edits too
    const [popup] = await Promise.all([page.context().waitForEvent('page'), page.click('#td-v-messenger .td-app > a')]);
    await popup.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() === '#aa3300', undefined, { timeout: 10_000 });
    await page.fill(field('primary'), 'oklch(0.55 0.2 260)');
    await popup.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() === 'oklch(0.55 0.2 260)', undefined, { timeout: 5_000 });
    await popup.close();
    await page.click('#td-vt-components');
  });

  await check('Light / Dark switches the site and the palette being edited', async () => {
    await page.click('#td-t-colors');
    await page.click('[data-td-mode] .toggle[value="dark"]');
    await settle();
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), true);
    assert.equal(await page.inputValue(field('background')), '#262624');
    await page.fill(field('background'), '#101418');
    await settle();
    assert.equal(await token('background'), '#101418');
    await page.click('[data-td-mode] .toggle[value="light"]');
    await settle();
    assert.equal(await page.inputValue(field('background')), '#faf9f5');
  });

  await check('saving by name: stored, applied, on top of the theme menu', async () => {
    await page.fill('#td-name', 'Ocean Test');
    await page.click('[data-td-save] button[type="submit"]');
    await settle();
    const stored = [await storedValue('defuss-shadcn-color-theme'), ((await storedValue('defuss-shadcn-custom-themes')) ?? []).map((t: any) => t.label)];
    assert.deepEqual(stored, ['custom-ocean-test', ['Ocean Test']]);
    assert.equal(await slot(), 'STYLE:custom-ocean-test');
    await page.click('#theme-selector-btn');
    const grid = await page.$$eval('#theme-grid > *', (n) => n.slice(0, 3).map((x) => x.textContent!.trim()));
    assert.deepEqual(grid, ['Your themes', 'Ocean Test', 'Presets']);
    assert.equal(await page.$eval('#theme-grid [data-theme-id="custom-ocean-test"]', (b) => b.classList.contains('active')), true);
    await page.keyboard.press('Escape');
  });

  await check('the saved theme applies before first paint on any page', async () => {
    await open('button.html');
    assert.equal(await slot(), 'STYLE:custom-ocean-test');
    assert.equal(await token('primary'), 'oklch(0.55 0.2 260)');
    assert.equal(await token('radius'), '1.25rem');
    assert.match(await page.evaluate(() => document.documentElement.style.getPropertyValue('--font-serif')), /^'Lora', /);
  });

  const draftFlag = () => page.evaluate(() => document.documentElement.hasAttribute('data-theme-draft'));
  const menu = async () => {
    await page.click('#theme-selector-btn');
    const items = await page.$$eval('#theme-grid > *', (n) => n.slice(0, 5).map((x) => (x.textContent || '').trim()));
    return items;
  };
  const closeMenu = () => page.evaluate(() => document.getElementById('theme-popover')?.hidePopover());

  await check('opening the designer without editing leaves no draft', async () => {
    await open('theme-designer.html');
    await page.waitForFunction(() => !!document.querySelector('[data-td-colors] .td-token'));
    await page.waitForTimeout(600);
    assert.equal(await draftFlag(), false);
    assert.equal(await storedValue('defuss-shadcn-theme-draft'), null);
  });

  await check('an unsaved draft stays on while you browse: SPA, reload, any page', async () => {
    await page.fill(field('primary'), '#ff00aa');
    await page.waitForTimeout(500); // the draft is kept once you pause
    assert.equal(await draftFlag(), true);
    await page.$eval('.site-sidebar a.nav-link[href="dark-mode.html"]', (a) => (a as HTMLElement).click());
    await page.waitForFunction(() => location.pathname.endsWith('dark-mode.html'));
    await settle();
    assert.equal(await slot(), 'STYLE:__preview');
    assert.equal(await token('primary'), '#ff00aa');
    assert.equal(await token('radius'), '1.25rem', 'the rest of the saved design is in the draft too');
    await open('badge.html');
    assert.equal(await slot(), 'STYLE:__preview');
    assert.equal(await token('primary'), '#ff00aa');
    assert.equal(await draftFlag(), true);
    assert.equal(await page.getAttribute('#theme-selector-btn', 'aria-label'), 'Change color theme (unsaved draft on)');
  });

  await check('the menu: picking a theme pauses the draft, its swatch resumes it', async () => {
    const items = await menu();
    assert.deepEqual(items.slice(0, 3), ['Theme Designer', 'Unsaved draft', 'Continue designingDiscard']);
    assert.equal(await page.$eval('#theme-grid [data-theme-id="__draft"]', (b) => b.classList.contains('active')), true);
    await page.click('#theme-grid [data-theme-id="custom-ocean-test"]');
    await settle();
    assert.equal(await slot(), 'STYLE:custom-ocean-test');
    assert.equal(await token('primary'), 'oklch(0.55 0.2 260)');
    assert.equal(await draftFlag(), false);
    await page.click('#theme-selector-btn');
    assert.equal(await page.textContent('#theme-grid [data-theme-id="__draft"] .theme-swatch-label'), 'Unsaved draft · paused');
    await page.click('#theme-grid [data-theme-id="__draft"]');
    await settle();
    assert.equal(await slot(), 'STYLE:__preview');
    assert.equal(await token('primary'), '#ff00aa');
    assert.equal(await draftFlag(), true);
    await closeMenu();
  });

  await check('code examples follow the draft', async () => {
    await open('button.html');
    const frame = await (await page.waitForSelector('.code-example iframe', { timeout: 10_000 })).contentFrame();
    await frame!.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() === '#ff00aa', undefined, { timeout: 10_000 });
  });

  await check('Continue designing brings the draft back into the designer', async () => {
    await page.click('#theme-selector-btn');
    await page.click('#theme-grid .theme-draft-actions a');
    await page.waitForFunction(() => location.pathname.endsWith('theme-designer.html'));
    await page.waitForSelector('[data-td-colors] .td-token');
    await settle();
    assert.equal(await page.inputValue(field('primary')), '#ff00aa');
  });

  await check('Discard throws the draft away and the saved theme returns', async () => {
    await page.$eval('.site-sidebar a.nav-link[href="dark-mode.html"]', (a) => (a as HTMLElement).click());
    await page.waitForFunction(() => location.pathname.endsWith('dark-mode.html'));
    await page.click('#theme-selector-btn');
    await page.click('#theme-grid .theme-draft-actions button');
    await settle();
    assert.equal(await draftFlag(), false);
    assert.equal(await slot(), 'STYLE:custom-ocean-test');
    assert.equal(await token('primary'), 'oklch(0.55 0.2 260)');
    assert.equal(await page.$$eval('#theme-grid [data-theme-id="__draft"]', (n) => n.length), 0);
    await closeMenu();
    await open('theme-designer.html');
    await page.waitForSelector('[data-td-colors] .td-token');
    assert.equal(await page.inputValue(field('primary')), 'oklch(0.55 0.2 260)', 'the designer starts from the saved theme');
    await page.fill(field('primary'), '#ff00aa'); // the import check below edits on from here
    await page.waitForTimeout(500);
  });

  await check('export writes :root and .dark; import reads them back', async () => {
    await page.click('[data-td-export]');
    const css = await page.inputValue('[data-td-css]');
    assert.match(css, /:root \{[\s\S]*--primary: #ff00aa;[\s\S]*\}/);
    assert.match(css, /\.dark \{[\s\S]*--background: #101418;[\s\S]*\}/);
    await page.click('#td-export [data-dialog-close]');
    await page.click('[data-td-import]');
    await page.fill('#td-import textarea', ':root { --primary: #123456; --radius: 0.25rem; --shadow-md: 0px 2px 6px 0px rgb(1 2 3 / 0.5); --made-up: red; }\n.dark { --primary: #abcdef; }');
    await page.click('#td-import button[type="submit"]');
    await settle();
    assert.equal(await token('primary'), '#123456');
    assert.equal(await token('radius'), '0.25rem');
    assert.equal(await token('shadow-md'), '0px 2px 6px 0px rgb(1 2 3 / 0.5)', 'shadow and spacing tokens are kept');
    const bad = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--made-up').trim());
    assert.equal(bad, '', 'only theme tokens are taken');
  });

  await check('Saved: delete asks twice, then the theme leaves the menu and the default returns', async () => {
    await page.click('#td-t-saved');
    const del = '.td-saved-item[data-id="custom-ocean-test"] [data-td-delete]';
    await page.click(del);
    assert.equal(await page.textContent(del), 'Really?');
    await page.click(del);
    await settle();
    assert.equal(await page.$$eval('.td-saved-item', (n) => n.length), 0);
    assert.equal(await storedValue('defuss-shadcn-color-theme'), 'default', 'deleting the active theme goes back to default');
    const headings = await page.$$eval('#theme-grid .theme-grid-heading', (n) => n.map((x) => x.textContent));
    assert.equal(headings.includes('Your themes'), false);
    // the imported design is still a live draft on top of the default
    assert.equal(await slot(), 'STYLE:__preview');
    assert.equal(await token('primary'), '#123456');
  });

  await check('saving clears the draft', async () => {
    await page.fill('#td-name', 'Imported');
    await page.click('[data-td-save] button[type="submit"]');
    await page.waitForTimeout(600);
    assert.equal(await draftFlag(), false);
    assert.equal(await slot(), 'STYLE:custom-imported');
    assert.equal(await storedValue('defuss-shadcn-theme-draft'), null);
    await open('theme-designer.html');
    await page.waitForSelector('[data-td-colors] .td-token');
    await page.waitForTimeout(600);
    assert.equal(await draftFlag(), false, 'reopening a saved theme is no draft');
  });

  await check('no script errors along the way', async () => {
    assert.deepEqual(errors, []);
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`theme-designer.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('theme-designer.e2e: all checks passed');
