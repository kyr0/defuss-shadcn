import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from './server.ts';

/**
 * Why: the Theme Designer (docs runtime theme-designer.ts + the switcher's
 * custom-theme support in theme-switcher.ts + the theme menu in layout.ts)
 * promises that the select box picks what the whole site shows, that an edit
 * goes to a custom theme which saves as you go - the first edit of a built-in
 * theme starts "Untitled custom theme", a custom theme changes in place - and
 * that Duplicate, Rename and Delete keep the theme menu in step. This drives
 * the built docs page in a fresh browser (empty storage). Fonts are checked
 * through their tokens, so the test does not depend on reaching Google Fonts.
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
  const customs = async () => ((await storedValue('defuss-shadcn-custom-themes')) ?? []) as { id: string; label: string; styles: { light: Record<string, string> } }[];
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // Google Fonts answers with an empty stylesheet: loads succeed offline,
  // and the tokens - not the glyphs - are what is asserted
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const open = async (p: string) => {
    await page.goto(`${server.url}${DOCS}${p}`);
    await page.waitForFunction(() => !!(globalThis as any).df$?.shadcn?.docs?.applyTheme, undefined, { timeout: 10_000 });
  };
  const ready = () => page.waitForFunction(() => !!document.querySelector('[data-td-palette] .td-chip'), undefined, { timeout: 10_000 });
  const token = (k: string) => page.evaluate((k) => getComputedStyle(document.documentElement).getPropertyValue('--' + k).trim(), k);
  const slot = () => page.evaluate(() => { const s = document.getElementById('theme-css'); return s ? `${s.tagName}:${s.dataset.themeId}` : null; });
  const selected = () => page.$eval('[data-td-from]', (s) => { const sel = s as HTMLSelectElement; return `${sel.value}|${sel.selectedOptions[0]?.textContent}`; });
  const settle = () => page.waitForTimeout(120);
  const saved = () => page.waitForTimeout(650); // past the save-as-you-go pause
  /** open a chip's popover and type a colour into its field */
  const setColor = async (k: string, v: string) => {
    await page.click(`#td-t-colors`);
    await page.click(`.td-chip[data-chip="${k}"]`);
    await page.waitForSelector('#td-chip-pop:popover-open');
    await page.fill('#td-chip-pop .td-token .input', v);
  };
  const closePop = () => page.evaluate(() => document.getElementById('td-chip-pop')?.hidePopover());

  await open('theme-designer.html');
  await ready();

  await check('no side panel: one bar, the settings tabs and the preview tabs', async () => {
    assert.equal(await page.$$eval('.td-panel, [data-td-colors], [data-td-save], [data-td-mode]', (n) => n.length), 0);
    assert.deepEqual(await page.$$eval('.td-settings .tab-trigger', (n) => n.map((x) => x.textContent)), ['Colors', 'Fonts', 'Shape', 'Shadows', 'Typography']);
    const views = await page.$$eval('.td-views > .tab-list .tab-trigger', (n) => n.map((x) => x.textContent));
    assert.equal(views[0], 'All Components');
    assert.equal(views.includes('Document Editor'), true);
    assert.equal(views.length, 8);
  });

  await check('the Colors tab holds every colour token as a chip; opening the page edits nothing', async () => {
    assert.equal(await page.$$eval('[data-td-palette] .td-chip', (r) => r.length), 32);
    assert.equal(await page.$$eval('[data-td-palette] .td-chip-group', (r) => r.length), 11);
    assert.notEqual(await slot(), 'STYLE:__preview');
    assert.equal(await selected(), 'default|Default');
    assert.equal(await page.$eval('[data-td-rename]', (b) => (b as HTMLButtonElement).disabled), true, 'a built-in theme has no name to change');
    assert.equal(await page.$eval('[data-td-delete]', (b) => (b as HTMLButtonElement).disabled), true);
  });

  await check('the select box applies a theme to the whole site', async () => {
    await page.selectOption('[data-td-from]', 'claude');
    await settle();
    assert.equal(await slot(), 'LINK:claude');
    assert.equal(await token('primary'), '#c96442');
    assert.equal(await storedValue('defuss-shadcn-color-theme'), 'claude');
    assert.deepEqual(await customs(), [], 'selecting is no edit');
  });

  await check('the first edit of a built-in theme starts "Untitled custom theme" - selected, saved as you go', async () => {
    await setColor('primary', '#336699');
    await settle();
    assert.equal(await token('primary'), '#336699', 'the edit shows at once');
    assert.equal(await selected(), 'custom-untitled-custom-theme|Untitled custom theme');
    await saved();
    assert.equal(await slot(), 'STYLE:custom-untitled-custom-theme');
    const list = await customs();
    assert.deepEqual(list.map((t) => [t.id, t.label, t.styles.light.primary]), [['custom-untitled-custom-theme', 'Untitled custom theme', '#336699']]);
    assert.equal(list[0].styles.light['card'] !== undefined, true, 'the copy carries the whole palette of the theme it started from');
    assert.equal(await storedValue('defuss-shadcn-color-theme'), 'custom-untitled-custom-theme');
    assert.equal(await page.$eval('[data-td-rename]', (b) => (b as HTMLButtonElement).disabled), false);
  });

  await check('a custom theme changes in place; an invalid colour is flagged and ignored', async () => {
    await page.fill('#td-chip-pop .td-token .input', 'oklch(0.55 0.2 260)');
    await saved();
    let list = await customs();
    assert.deepEqual(list.map((t) => [t.id, t.styles.light.primary]), [['custom-untitled-custom-theme', 'oklch(0.55 0.2 260)']]);
    await page.fill('#td-chip-pop .td-token .input', 'not-a-colour');
    await settle();
    assert.equal(await page.getAttribute('#td-chip-pop .td-token .input', 'aria-invalid'), 'true');
    assert.equal(await token('primary'), 'oklch(0.55 0.2 260)');
    await closePop();
    assert.equal(await page.$$eval('.td-chip[data-editing]', (n) => n.length), 0);
    list = await customs();
    assert.equal(list.length, 1);
  });

  await check('the popover\'s swap: the picker writes OKLCH, or HEX', async () => {
    await page.click('.td-chip[data-chip="accent"]');
    await page.waitForSelector('#td-chip-pop:popover-open');
    const pick = (v: string) => page.$eval('#td-chip-pop input[type="color"]', (i, v) => { (i as HTMLInputElement).value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }, v);
    await pick('#ff0000');
    await settle();
    assert.match(await token('accent'), /^oklch\(0\.628 0\.258 29\.2\)$/);
    await page.click('#td-chip-pop .td-notation .swap');
    assert.equal(await page.$eval('[data-td-notation]', (i) => (i as HTMLInputElement).checked), true);
    await pick('#00ff00');
    await settle();
    assert.equal(await token('accent'), '#00ff00');
    await closePop();
  });

  await check('contrast badges: a text colour on its own surface fails', async () => {
    await setColor('primary-foreground', 'oklch(0.55 0.2 260)');
    await settle();
    const badge = '#td-chip-pop [data-contrast]';
    assert.equal(await page.getAttribute(badge, 'data-level'), 'fail');
    assert.match((await page.textContent(badge))!, /^Low 1\.0$/);
    await closePop();
  });

  await check('Back and Next step through the edits', async () => {
    await page.waitForTimeout(450); // the history records an edit once you pause
    await page.click('[data-td-undo]');
    await settle();
    assert.notEqual(await token('primary-foreground'), 'oklch(0.55 0.2 260)');
    assert.equal(await selected(), 'custom-untitled-custom-theme|Untitled custom theme', 'Back keeps the custom theme');
    await page.click('[data-td-redo]');
    await settle();
    assert.equal(await token('primary-foreground'), 'oklch(0.55 0.2 260)');
    await setColor('primary-foreground', '#ffffff');
    await closePop();
  });

  await check('Fonts: a font from the list applies at once; Theme default removes it; any Google Font by name', async () => {
    await page.click('#td-t-fonts');
    await page.click('[data-font-slot="serif"] .combobox-trigger');
    await page.click('[data-font-slot="serif"] .combobox-item[data-value="Lora"]');
    await settle();
    assert.match(await token('font-serif'), /^'Lora', /);
    await page.click('[data-font-slot="mono"] .combobox-trigger');
    await page.click('[data-font-slot="mono"] .combobox-item[data-value="Fira Code"]');
    await page.click('[data-font-slot="mono"] .combobox-trigger');
    await page.click('[data-font-slot="mono"] .combobox-item[data-value=""]');
    await settle();
    assert.doesNotMatch(await token('font-mono'), /Fira Code/);
    await page.click('[data-font-slot="sans"] .combobox-trigger');
    await page.waitForSelector('#td-fp-sans:popover-open');
    await page.fill('[data-font-slot="sans"] .combobox-search-input', 'Bungee');
    const any = '[data-font-slot="sans"] .td-any-font';
    assert.equal(await page.textContent(any), 'Use “Bungee” from Google Fonts');
    await page.click(any);
    await settle();
    assert.match(await token('font-sans'), /^'Bungee', /);
    await page.click('[data-font-slot="sans"] .combobox-trigger');
    await page.waitForSelector('#td-fp-sans:popover-open');
    await page.fill('[data-font-slot="sans"] .combobox-search-input', 'inter');
    assert.equal(await page.textContent(any), '', 'a listed name needs no extra row');
    await page.fill('[data-font-slot="sans"] .combobox-search-input', '');
    await page.click('[data-font-slot="sans"] .combobox-item[data-value=""]');
    await settle();
  });

  const slide = (k: string, v: string) => page.$eval(`[data-td-range="${k}"]`, (s, v) => { (s as HTMLInputElement).value = v; s.dispatchEvent(new Event('input', { bubbles: true })); }, v);

  await check('Shape: the roundness', async () => {
    await page.click('#td-t-shape');
    await slide('radius', '1.25');
    await settle();
    assert.equal(await token('radius'), '1.25rem');
  });

  await check('Shadows: one shadow derives the whole scale; off is the theme\'s own', async () => {
    await page.click('#td-t-shadows');
    assert.equal(await page.$eval('[data-td-shadow-box]', (b) => (b as HTMLFieldSetElement).disabled), true, 'shadow controls wait for the switch');
    const before = await token('shadow-md');
    await page.click('label[for="td-shadow-on"]');
    await slide('blur', '24');
    await settle();
    const md = await token('shadow-md');
    assert.notEqual(md, before);
    assert.match(md, /24px/);
    await page.click('label[for="td-shadow-on"]');
    await settle();
    assert.equal(await token('shadow-md'), before);
  });

  await check('Typography: letter spacing and the link tokens - a .link follows them', async () => {
    await page.click('#td-t-type');
    await slide('tracking', '0.02');
    await page.selectOption('[data-td-link-line]', 'underline dotted');
    await slide('link-offset', '8');
    await settle();
    assert.equal(await token('tracking-normal'), '0.02em');
    assert.equal(await token('link-text-decoration'), 'underline dotted');
    assert.equal(await token('link-underline-offset'), '8px');
    const link = await page.$eval('#td-p-type a.link', (a) => { const cs = getComputedStyle(a); return [cs.textDecorationStyle, cs.textUnderlineOffset]; });
    assert.deepEqual(link, ['dotted', '8px']);
    await saved();
    const t = (await customs())[0];
    assert.deepEqual([t.styles.light['link-text-decoration'], t.styles.light['link-underline-offset']], ['underline dotted', '8px']);
  });

  await check('Duplicate copies the theme 1:1 and selects the copy', async () => {
    await page.click('[data-td-duplicate]');
    await saved();
    assert.equal(await selected(), 'custom-untitled-custom-theme-copy|Untitled custom theme copy');
    const list = await customs();
    assert.equal(list.length, 2);
    const [copy, orig] = [list.find((t) => t.id.endsWith('-copy'))!, list.find((t) => !t.id.endsWith('-copy'))!];
    assert.deepEqual(copy.styles, orig.styles);
    assert.equal(await slot(), 'STYLE:custom-untitled-custom-theme-copy');
  });

  await check('Rename names the selected custom theme - the menu and the select follow', async () => {
    await page.click('[data-td-rename]');
    await page.waitForSelector('#td-rename[open]');
    await page.fill('#td-rename-name', 'Ocean Test');
    await page.click('#td-rename button[type="submit"]');
    await saved();
    assert.equal(await selected(), 'custom-ocean-test|Ocean Test');
    assert.deepEqual((await customs()).map((t) => t.label).sort(), ['Ocean Test', 'Untitled custom theme']);
    assert.equal(await storedValue('defuss-shadcn-color-theme'), 'custom-ocean-test');
    await page.click('#theme-selector-btn');
    const grid = await page.$$eval('#theme-grid > *', (n) => n.slice(0, 2).map((x) => x.textContent!.trim()));
    assert.equal(grid.includes('Your themes'), true);
    assert.equal(await page.$eval('#theme-grid [data-theme-id="custom-ocean-test"]', (b) => b.classList.contains('active')), true);
    await page.evaluate(() => document.getElementById('theme-popover')?.hidePopover());
  });

  await check('the scaffold tabs show each app in the theme, live - Document Editor too', async () => {
    await page.click('#td-vt-document-editor');
    await page.waitForSelector('#td-v-document-editor iframe', { timeout: 10_000 });
    await page.click('#td-vt-messenger');
    const frame = await (await page.waitForSelector('#td-v-messenger iframe', { timeout: 10_000 })).contentFrame();
    await frame!.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--radius').trim() === '1.25rem', undefined, { timeout: 10_000 });
    await setColor('primary', '#aa3300');
    await closePop();
    await frame!.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() === '#aa3300', undefined, { timeout: 5_000 });
    // full screen opens the app in a window that follows the edits too
    const [popup] = await Promise.all([page.context().waitForEvent('page'), page.click('#td-v-messenger .td-app > a')]);
    await popup.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() === '#aa3300', undefined, { timeout: 10_000 });
    await setColor('primary', 'oklch(0.55 0.2 260)');
    await closePop();
    await popup.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() === 'oklch(0.55 0.2 260)', undefined, { timeout: 5_000 });
    await popup.close();
    await page.click('#td-vt-components');
  });

  await check('the header\'s light / dark switch picks the palette being edited', async () => {
    await page.click('#theme-toggle');
    await settle();
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), true);
    await setColor('background', '#101418');
    await settle();
    assert.equal(await token('background'), '#101418');
    assert.match((await page.textContent('#td-chip-pop .popover-description'))!, /dark palette/);
    await closePop();
    await page.click('#theme-toggle');
    await settle();
    await page.click('.td-chip[data-chip="background"]');
    assert.notEqual(await page.inputValue('#td-chip-pop .td-token .input'), '#101418', 'light keeps its own background');
    await closePop();
    await saved();
    assert.equal((await customs()).find((t) => t.id === 'custom-ocean-test')!.styles.light.background !== '#101418', true);
  });

  await check('the saved theme applies before first paint on any page', async () => {
    await open('button.html');
    assert.equal(await slot(), 'STYLE:custom-ocean-test');
    assert.equal(await token('primary'), 'oklch(0.55 0.2 260)');
    assert.equal(await token('radius'), '1.25rem');
    assert.match(await page.evaluate(() => document.documentElement.style.getPropertyValue('--font-serif')), /^'Lora', /);
  });

  await check('reopening the designer holds the applied theme; a header pick is held too', async () => {
    await open('theme-designer.html');
    await ready();
    assert.equal(await selected(), 'custom-ocean-test|Ocean Test');
    await page.click('#theme-selector-btn');
    await page.click('#theme-grid [data-theme-id="custom-untitled-custom-theme"]');
    await settle();
    assert.equal(await selected(), 'custom-untitled-custom-theme|Untitled custom theme');
    await page.evaluate(() => document.getElementById('theme-popover')?.hidePopover());
    await page.selectOption('[data-td-from]', 'custom-ocean-test');
    await settle();
  });

  await check('export writes :root and .dark; import reads them into the selected theme', async () => {
    await page.click('[data-td-export]');
    const css = await page.inputValue('[data-td-css]');
    assert.match(css, /^\/\* Ocean Test - designed with/);
    assert.match(css, /:root \{[\s\S]*--link-underline-offset: 8px;[\s\S]*\}/);
    assert.match(css, /\.dark \{[\s\S]*--background: #101418;[\s\S]*\}/);
    await page.click('#td-export [data-dialog-close]');
    await page.click('[data-td-import]');
    await page.fill('#td-import textarea', ':root { --primary: #123456; --radius: 0.25rem; --shadow-md: 0px 2px 6px 0px rgb(1 2 3 / 0.5); --made-up: red; }\n.dark { --primary: #abcdef; }');
    await page.click('#td-import button[type="submit"]');
    await saved();
    assert.equal(await token('primary'), '#123456');
    assert.equal(await token('radius'), '0.25rem');
    assert.equal(await token('shadow-md'), '0px 2px 6px 0px rgb(1 2 3 / 0.5)', 'shadow and spacing tokens are kept');
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--made-up').trim()), '', 'only theme tokens are taken');
    assert.equal((await customs()).find((t) => t.id === 'custom-ocean-test')!.styles.light.primary, '#123456');
  });

  await check('Delete asks twice, then the theme leaves the menu and the default returns', async () => {
    await page.click('[data-td-delete]');
    assert.equal(await page.textContent('[data-td-delete]'), 'Really delete?');
    await page.click('[data-td-delete]');
    await settle();
    assert.deepEqual((await customs()).map((t) => t.id), ['custom-untitled-custom-theme']);
    assert.equal(await storedValue('defuss-shadcn-color-theme'), 'default');
    assert.equal(await selected(), 'default|Default');
  });

  await check('an unsaved draft of the earlier designer becomes a custom theme', async () => {
    await page.evaluate(() => {
      const docs = (globalThis as any).df$.shadcn.docs;
      const st = docs.themeDesignerState();
      st.light.primary = '#0a0b0c';
      docs.themeDraft.set(st, { styles: { light: { primary: '#0a0b0c' }, dark: {} }, links: [] });
    });
    await open('theme-designer.html');
    await ready();
    await saved();
    assert.equal(await storedValue('defuss-shadcn-theme-draft'), null);
    const fromDraft = (await customs()).find((t) => t.styles.light.primary === '#0a0b0c');
    assert.equal(fromDraft?.label, 'Untitled custom theme 2');
    assert.equal(await selected(), `${fromDraft!.id}|Untitled custom theme 2`);
  });

  await check('a settings tab switch keeps the block\'s height - the preview below does not move', async () => {
    const at = () => page.evaluate(() => [document.querySelector('.td-settings')!.getBoundingClientRect().height, document.querySelector('.td-preview')!.getBoundingClientRect().top].map(Math.round));
    const start = await at();
    for (const id of ['#td-t-fonts', '#td-t-shape', '#td-t-shadows', '#td-t-type', '#td-t-colors']) {
      await page.click(id);
      assert.deepEqual(await at(), start, `${id} moved the preview`);
    }
    assert.equal(await page.$eval('#td-p-shape', (p) => getComputedStyle(p).visibility), 'hidden', 'an inactive panel is not shown');
  });

  await check('Fullscreen: the designer alone fills the screen, with its own light / dark toggle', async () => {
    assert.equal(await page.isVisible('[data-td-mode-toggle]'), false, 'outside fullscreen the header switch serves');
    await page.click('[data-td-fullscreen]');
    await page.waitForFunction(() => document.fullscreenElement?.matches('[data-theme-designer]'), undefined, { timeout: 5_000 });
    assert.equal(await page.textContent('[data-td-fullscreen] span'), 'Exit fullscreen');
    const dark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    await page.click('[data-td-mode-toggle]');
    await settle();
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), !dark);
    await page.click('[data-td-mode-toggle]');
    await page.click('[data-td-fullscreen]');
    await page.waitForFunction(() => !document.fullscreenElement, undefined, { timeout: 5_000 });
    assert.equal(await page.textContent('[data-td-fullscreen] span'), 'Fullscreen');
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
