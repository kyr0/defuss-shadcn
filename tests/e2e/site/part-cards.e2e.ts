import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { startServer } from '../server.ts';

/**
 * Why: a page's individual examples (```html example part - plans/2026-10-15_22-31_individual-examples.md, M2) render
 * as compact part cards with no HTML Preview Editor: the part in a shadow root on the card's view, styled by the docs
 * sheets the live examples get (runtime/code-example.ts), its label, Copy (the code window's) and Open in Studio. This
 * drives the built Typography page, whose h1 - h4 are part cards ahead of its first example: they render styled, lead
 * the page's examples, keep their markup out of the page (no light-DOM heading, no TOC or search entry), follow dark
 * mode, copy and open their source, and render again after an SPA navigation.
 */
const ROOT = join(import.meta.dirname, '..', '..', '..');
const { url, stop } = startServer();
const browser = await chromium.launch();
let failed = 0;

async function check(label: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${label}\n    ${err instanceof Error ? err.message : err}`);
  }
}

const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
const rendered = () =>
  page.waitForFunction(
    () => {
      const views = [...document.querySelectorAll('.part-card-view')];
      return views.length > 0 && views.every((v) => (v.shadowRoot?.adoptedStyleSheets.length ?? 0) > 0);
    },
    undefined,
    { timeout: 20_000 },
  );
/** each card: its label and the computed font of the part inside its shadow root */
const cards = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('.part-card')].map((card) => {
      const el = card.querySelector('.part-card-view')!.shadowRoot!.querySelector('.part-card-root > *') as HTMLElement;
      const cs = getComputedStyle(el);
      return { label: card.querySelector('.part-card-label')!.textContent!.trim(), tag: el.tagName, size: cs.fontSize, weight: cs.fontWeight, color: cs.color };
    }),
  );

try {
  await page.goto(`${url}/dist/documentation/primitives/typography.html`, { waitUntil: 'load' });
  await rendered();

  await check('the part cards render each part in a shadow root, styled by the system (all.css: .h1 2.25rem / 800 ...)', async () => {
    const r = await cards();
    assert.deepEqual(
      r.map(({ label, tag, size, weight }) => ({ label, tag, size, weight })),
      [
        { label: 'h1', tag: 'H1', size: '36px', weight: '800' },
        { label: 'h2', tag: 'H2', size: '30px', weight: '600' },
        { label: 'h3', tag: 'H3', size: '24px', weight: '600' },
        { label: 'h4', tag: 'H4', size: '20px', weight: '600' },
      ],
    );
  });

  // the maintainer (2026-10-16): with short cards side by side the Code row must sit in the footer, level across the cards
  await check('the label bar and the Code row are each card\'s footer, level across a row of cards', async () => {
    const rows = await page.evaluate(() => {
      const byRow = new Map<number, number[]>();
      for (const card of document.querySelectorAll('.part-card')) {
        const top = Math.round(card.getBoundingClientRect().top);
        const bar = Math.round(card.querySelector('.part-card-bar')!.getBoundingClientRect().top);
        const code = Math.round(card.querySelector('.part-card-code')!.getBoundingClientRect().bottom - card.getBoundingClientRect().bottom);
        byRow.set(top, [...(byRow.get(top) ?? []), bar * 1000 + code]);
      }
      return [...byRow.values()];
    });
    assert.ok(rows.some((r) => r.length > 1), 'cards side by side');
    for (const r of rows) assert.equal(new Set(r).size, 1, `bars level and Code at the foot: ${JSON.stringify(r)}`);
  });

  // the maintainer (2026-10-16): the cards stretch over the whole width - every row, the last one too
  await check('every row of part cards spans the whole width of the grid, the last row too', async () => {
    for (const width of [1280, 1000]) {
      await page.setViewportSize({ width, height: 1000 });
      const r = await page.evaluate(() => {
        const grid = document.querySelector('.part-cards')!.getBoundingClientRect();
        const rows = new Map<number, { left: number; right: number }>();
        for (const card of document.querySelectorAll('.part-card')) {
          const b = card.getBoundingClientRect();
          const row = rows.get(Math.round(b.top)) ?? { left: Infinity, right: -Infinity };
          rows.set(Math.round(b.top), { left: Math.min(row.left, b.left), right: Math.max(row.right, b.right) });
        }
        return { grid: [Math.round(grid.left), Math.round(grid.right)], rows: [...rows.values()].map((x) => [Math.round(x.left), Math.round(x.right)]) };
      });
      for (const row of r.rows) assert.deepEqual(row, r.grid, `at ${width}px: ${JSON.stringify(r)}`);
    }
    await page.setViewportSize({ width: 1280, height: 1000 });
  });

  await check('they lead the page\'s examples: every part card comes before the first full example card', async () => {
    const r = await page.evaluate(() => {
      const first = document.querySelector('.code-example')!;
      return [...document.querySelectorAll('.part-card')].every((c) => c.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    assert.equal(r, true);
  });

  await check('nothing of a part reaches the page: no light-DOM heading, no TOC entry, no search-index entry', async () => {
    const r = await page.evaluate(() => ({
      light: document.querySelectorAll('.part-card .h1, .part-card .h2, .part-card h2').length,
      toc: [...document.querySelectorAll('.site-toc a')].map((a) => a.textContent!.trim()).filter((t) => /The People of the Kingdom/.test(t)),
    }));
    assert.deepEqual(r, { light: 0, toc: [] });
    const index = readFileSync(join(ROOT, 'dist', 'documentation', 'js', 'search-index.js'), 'utf8');
    assert.ok(index.includes('Typesetting (Satz)') && !index.includes('The People of the Kingdom'), 'the page\'s own h2s are indexed, the part\'s is not');
  });

  await check('dark mode reaches the parts: the theme\'s tokens inherit into the shadow root', async () => {
    const light = (await cards())[0].color;
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    const dark = (await cards())[0].color;
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    assert.notEqual(light, dark);
  });

  await check('Copy (the code window\'s) copies the part\'s source; Open in Studio carries it in the address fragment', async () => {
    const card = page.locator('.part-card').first();
    await card.locator('.part-card-code > summary').click();
    await card.locator('.copy-btn').click();
    await page.waitForFunction(async () => (await navigator.clipboard.readText()).includes('Taxing Laughter'));
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), '<h1 class="h1">Taxing Laughter</h1>');
    const [tab] = await Promise.all([context.waitForEvent('page'), card.locator('[data-open-studio]').click()]);
    await tab.waitForURL(/#source=/, { timeout: 10_000 });
    assert.match(tab.url(), /full-studio\.html#source=[A-Za-z0-9_-]+$/);
    await tab.close();
  });

  await check('an SPA navigation away and back renders the cards again (the router swaps <main>)', async () => {
    await page.evaluate(() => (document.querySelector('.site-sidebar a[href$="separator.html"], a.nav-link[href$="separator.html"]') as HTMLElement).click());
    await page.waitForFunction(() => location.pathname.endsWith('/separator.html'), undefined, { timeout: 10_000 });
    await page.evaluate(() => (document.querySelector('.site-sidebar a[href$="typography.html"], a.nav-link[href$="typography.html"]') as HTMLElement).click());
    await page.waitForFunction(() => location.pathname.endsWith('/typography.html'), undefined, { timeout: 10_000 });
    await rendered();
    assert.equal((await cards()).length, 4);
  });

  // a part that IS a popover, a dialog, a sheet ... is hidden until something opens it - nothing runs in a part card,
  // so it shows in place, inside its card (runtime/code-example.ts inPlaceSheet); an overlay inside a part stays
  // closed, as in the live examples. VERIFIED: (tmp/probe-inplace.ts, 2026-10-16) the popover, command and
  // context-menu parts sat outside their cards without the reset; a Dialog part was 1,248 px wide in a 368 px card and
  // a Sheet sat past the card's right edge (its translateX(100%))
  await check('an overlay part (popover, tooltip, dialog, alert dialog, sheet, command, context menu) shows inside its card; an overlay inside a part stays closed', async () => {
    const pages = ['overlays/popover', 'overlays/tooltip', 'overlays/dialog', 'feedback-status/alert-dialog', 'overlays/sheet', 'overlays/command', 'overlays/context-menu', 'forms-inputs/combobox'];
    for (const path of pages) {
      await page.goto(`${url}/dist/documentation/${path}.html`, { waitUntil: 'load' });
      await rendered();
      const r = await page.evaluate(() =>
        [...document.querySelectorAll('.part-card')].flatMap((card) => {
          const view = card.querySelector('.part-card-view')!;
          const v = view.getBoundingClientRect();
          const root = view.shadowRoot!.querySelector('.part-card-root')!;
          return [...root.querySelectorAll('[popover], dialog')].map((el) => {
            const b = el.getBoundingClientRect();
            return {
              label: card.querySelector('.part-card-label')!.textContent!.trim(),
              part: el.parentElement === root,
              shown: el.checkVisibility() && b.height > 0,
              inside: b.left >= v.left - 1 && b.right <= v.right + 1 && b.top >= v.top - 1 && b.bottom <= v.bottom + 1,
            };
          });
        }),
      );
      assert.ok(r.length > 0, `${path}: a part card with an overlay`);
      for (const o of r)
        if (o.part) assert.ok(o.shown && o.inside, `${path}: "${o.label}" shows its overlay inside the card (${JSON.stringify(o)})`);
        else assert.equal(o.shown, false, `${path}: "${o.label}" keeps the overlay inside it closed`);
    }
  });

  await check('no page errors', async () => {
    assert.deepEqual(errors, []);
  });
} finally {
  await browser.close();
  stop();
}

if (failed) {
  console.error(`\npart-cards.e2e: ${failed} check(s) failed`);
  process.exit(1);
}
console.log('part-cards.e2e: all checks passed');
