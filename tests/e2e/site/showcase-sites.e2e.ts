import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from '../server.ts';
import { INDUSTRY_SITES, SHOWCASE_SITES } from '../../../src/documentation/lib/page-dirs.ts';
import { assertBothModes } from '../lib/site-mode.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';

/**
 * Why: the Showcase sites (Website › Showcase) dress the same components as four brands - each with its own palette
 * on its root, a shader or a texture, irregular moves that carry content and three looks. Per site: the docs page
 * links its full-screen page, that page runs without an error and holds what the site is made of, every look sets
 * its own palette (the root's background and the --primary a component inside reads) in light and dark (the
 * switch flips the page, both modes keep their text readable), nothing pushes a phone page
 * sideways, and under reduced motion the turning parts stand still. A Showcase site is a whole site (the maintainer
 * 2026-11-09): its call to action opens a form in a dialog, the browser's own validation holds an empty form back,
 * a filled one thanks.
 */
const server = startServer();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
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
const docs = (slug: string) => `${server.url}/dist/documentation/website/${slug}.html`;
const full = (slug: string) => `${server.url}/dist/documentation/website/full-${slug}.html`;

/** per site: its root, what it is made of, the parts that move on their own */
const SITES: Record<string, { root: string; parts: string[]; moving: string[] }> = {
  'showcase-roastery': {
    root: '#sc-roastery',
    parts: ['.shader[data-effect="smoke"]', '.kb-stamp textPath', '.kb-coffee.ticket', '.kb-bubble', '.kb-plan meter'],
    moving: ['.kb-stamp'],
  },
  'showcase-observatory': {
    root: '#sc-observatory',
    parts: [
      '.shader[data-effect="starfield"]',
      '.shader[data-effect="clouds"]',
      '.ob-moon-disc',
      '.ob-up .ob-dot',
      '.ob-chart svg',
      '.ob-bubble',
      '.ob-ticket.ticket',
    ],
    moving: [],
  },
  'showcase-bouldering': {
    root: '#sc-bouldering',
    parts: [
      '.shader[data-effect="topography"]',
      '.gr-hold.corner-blob',
      '.gr-problem .gr-tape',
      '.gr-bubble',
      '.gr-pass.ticket',
      '.gr-hours',
    ],
    moving: [],
  },
  'showcase-records': {
    root: '#sc-records',
    parts: ['.shader[data-effect="plasma"]', '.lt-record', '.lt-tracks li', '.lt-sleeve .lt-price', '.lt-booth'],
    moving: ['.lt-record'],
  },
  'showcase-framework': {
    root: '#sc-weft',
    parts: [
      '.shader[data-effect="warp"]',
      '.shader[data-effect="dot-orbit"]',
      '.wf-thread path',
      '.text-rotate',
      '.wf-note.corner-sketch',
      '.wf-burst.clip-burst',
      '.terminal#wf-shell',
      '.tabs .mockup-code',
      '.wf-bars [data-ours] i',
      '.mk-integration-item',
      '.mk-logos-roll-track',
    ],
    moving: ['.wf-thread path'],
  },
  'industry-restaurant': {
    root: '#in-restaurant',
    parts: [
      '.tl-mark path',
      '.tl-board',
      '.tl-allergens input[value="A"]',
      '.mk-booking-form-slot input[value="19:30"]',
      '.tl-ticket',
      '#tl-viewer .mk-media-gallery-track',
      '.mk-opening-hours [data-tl-status]',
    ],
    moving: ['.tl-mark path'],
  },
  'industry-salon': {
    root: '#in-salon',
    parts: [
      '.hs-circled path',
      '.hs-note[data-hs-next]',
      '.hs-item[data-prices] .hs-price',
      '[data-hs-days] .mk-booking-form-slot',
      '.diff .diff-range',
      '.hs-clock',
      '.hs-giftcard',
    ],
    moving: [],
  },
  'industry-hotel': {
    root: '#in-hotel',
    parts: [
      '.shader[data-effect="water"]',
      '.ht-search output[data-ht-summary]',
      '.ht-room[data-room] [data-ht-total]',
      '.ht-keytag',
      '.ht-note',
      '.ht-stamp',
      'dialog.ht-room-dialog .mk-media-gallery-track',
    ],
    moving: [],
  },
  'industry-practice': {
    root: '#in-practice',
    parts: [
      '.mk-announcement[open]',
      '.dr-today [data-dr-status]',
      '.mk-opening-hours [data-dr-week] [data-day]',
      '.dr-note',
      '.mk-booking-form .alert[data-variant="destructive"]',
      'form[data-dr-form="prescription"]',
      '.dr-bring li',
    ],
    moving: [],
  },
  'industry-spa': {
    root: '#in-spa',
    parts: [
      '.shader[data-effect="caustics"]',
      '.sp-sign dl',
      '.sp-treat .sp-dur',
      '.mk-booking-form-slots',
      '.sp-voucher.ticket',
      '.sp-scale-marks li',
      '.sp-note',
    ],
    moving: ['.sp-sign'],
  },
  'industry-law': {
    root: '#in-law',
    parts: [
      '.lk-check .lk-stamp',
      '[data-lk-deadline]',
      '.lk-area .lk-deadline',
      '.lk-team .mk-team-member',
      '#lk-p-0',
      '.lk-fees .table',
      '.lk-note',
    ],
    moving: [],
  },
  'industry-agency': {
    root: '#in-agency',
    parts: [
      '.shader[data-effect="mesh-gradient"]',
      '.ag-statement .ag-circled svg',
      '.ag-sticker',
      '.mk-case-study',
      '.ag-gantt-bar',
      '.ag-note',
      '.ag-estimate [data-ag-weeks]',
    ],
    moving: ['.ag-badge', '.mk-logos-roll-track'],
  },
  'industry-ai': {
    root: '#in-ai',
    parts: [
      '.shader[data-effect="neuro-noise"]',
      '.session .session-item[data-step]',
      '.ai-res .ai-ts',
      '.tabs .mockup-code',
      '.mk-plan[data-featured]',
      '.ai-receipt.ticket',
      '.ai-stamp',
    ],
    moving: ['.ai-cursor'],
  },
};

/** per Showcase site: the button whose form opens in a dialog */
const BOOKING: Record<string, string> = {
  'showcase-roastery': '.kb-plan .btn',
  'showcase-observatory': '.ob-ticket .btn',
  'showcase-bouldering': '.gr-pass .btn',
  'showcase-records': '.lt-actions .btn',
  'showcase-framework': '.wf-hero .wf-cta button[commandfor="wf-start"]',
};

try {
  assert.deepEqual(
    Object.keys(SITES).sort(),
    [...SHOWCASE_SITES, ...INDUSTRY_SITES].sort(),
    'every Showcase and Industry site has its checks',
  );
  await check('the Showcase overview links every site', async () => {
    const p = await browser.newPage();
    await offlineJsdelivr(p);
    await p.goto(docs('website-showcase'), { waitUntil: 'domcontentloaded' });
    for (const slug of SHOWCASE_SITES)
      assert.equal(await p.locator(`main a.card[href="${slug}.html"]`).count(), 1, slug);
    await p.close();
  });

  for (const slug of [...SHOWCASE_SITES, ...INDUSTRY_SITES]) {
    if (BOOKING[slug]) {
      await check(
        `${slug}: the call to action opens its form; an empty one is held back, a filled one thanks`,
        async () => {
          const p = await browser.newPage({ viewport: { width: 1400, height: 900 }, reducedMotion: 'reduce' });
          await offlineJsdelivr(p);
          const errors: string[] = [];
          p.on('pageerror', (e) => errors.push(String(e)));
          await p.goto(full(slug), { waitUntil: 'load' });
          await p.locator(BOOKING[slug]!).first().click();
          const dialog = p.locator('dialog[open]');
          await dialog.waitFor();
          await dialog.locator('button[type="submit"]').first().click();
          assert.equal(await dialog.evaluate((d) => d.hasAttribute('data-sent')), false, 'an empty form is held back');
          // fill what the form requires, by kind
          await dialog.evaluate((d) => {
            for (const el of d.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
              '[required]',
            )) {
              if (el instanceof HTMLSelectElement) el.value = [...el.options].find((o) => o.value)!.value;
              else if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio'))
                el.checked = true;
              else if (el.type === 'email') el.value = 'sam@example.com';
              else if (el.type === 'tel') el.value = '+49 30 1234567';
              else if (el instanceof HTMLInputElement && el.type === 'number') el.value = el.min || '1';
              else if (el instanceof HTMLInputElement && el.type === 'date')
                el.value = el.min || new Date(Date.now() + 864e5 * 7).toISOString().slice(0, 10);
              else el.value = 'Sam Lee';
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });
          await dialog.locator('button[type="submit"]').first().click();
          await p.locator('dialog[data-sent] .sc-done').waitFor({ state: 'visible', timeout: 3000 });
          assert.deepEqual(errors, []);
          await p.close();
        },
      );
    }
    const { root, parts, moving } = SITES[slug]!;
    console.log(slug);

    await check('the docs page links its full-screen page', async () => {
      const p = await browser.newPage();
      await offlineJsdelivr(p);
      await p.goto(docs(slug), { waitUntil: 'domcontentloaded' });
      const link = p.locator(`main a.btn[href="full-${slug}.html"]`);
      assert.equal(await link.count(), 1, 'one "Open full screen" button');
      assert.equal(await link.getAttribute('target'), '_blank');
      await p.close();
    });

    await check(
      'full screen: no error, every part of the site, three looks with their own palettes, each in light and dark',
      async () => {
        const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
        await offlineJsdelivr(p);
        const errors: string[] = [];
        p.on('pageerror', (e) => errors.push(e.message));
        await p.goto(full(slug), { waitUntil: 'domcontentloaded' });
        await p.waitForSelector(root);
        const missing = await p.evaluate(([r, ps]) => ps.filter((s) => !document.querySelector(`${r} ${s}`)), [
          root,
          parts,
        ] as const);
        assert.deepEqual(missing, [], 'parts the site is made of');
        const looks = await p.$$eval(`${root} [data-site-look] option`, (o) =>
          o.map((x) => (x as HTMLOptionElement).value),
        );
        assert.equal(looks.length, 3, 'three looks');
        const seen = new Set<string>();
        for (const look of looks) {
          await p.selectOption(`${root} [data-site-look]`, look);
          const c = await p.$eval(root, (el) => {
            const probe = document.createElement('span');
            probe.style.background = 'var(--primary)';
            el.append(probe);
            const primary = getComputedStyle(probe).backgroundColor;
            probe.remove();
            return {
              look: (el as HTMLElement).dataset.look,
              palette: getComputedStyle(el).backgroundColor + ' / ' + primary,
            };
          });
          assert.equal(c.look, look);
          seen.add(c.palette);
          await assertBothModes(p, root, `${slug} ${look}`);
        }
        assert.equal(seen.size, 3, 'every look its own palette');
        assert.deepEqual(errors, []);
        await p.close();
      },
    );

    await check('a phone: nothing pushes the page sideways', async () => {
      const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await offlineJsdelivr(p);
      await p.goto(full(slug), { waitUntil: 'load' });
      await p.waitForSelector(root);
      await p.waitForTimeout(300);
      const { scroll, width } = await p.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        width: innerWidth,
      }));
      assert.ok(scroll <= width, `page ${scroll}px wide in a ${width}px viewport`);
      await p.close();
    });

    if (moving.length)
      await check('reduced motion: the turning parts stand still', async () => {
        const p = await browser.newPage({ viewport: { width: 1400, height: 900 }, reducedMotion: 'reduce' });
        await offlineJsdelivr(p);
        await p.goto(full(slug), { waitUntil: 'domcontentloaded' });
        await p.waitForSelector(root);
        const names = await p.evaluate(
          ([r, ms]) => ms.map((m) => getComputedStyle(document.querySelector(`${r} ${m}`)!).animationName),
          [root, moving] as const,
        );
        assert.deepEqual(
          names,
          moving.map(() => 'none'),
        );
        await p.close();
      });
  }
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`showcase-sites.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('showcase-sites.e2e: all checks passed');
