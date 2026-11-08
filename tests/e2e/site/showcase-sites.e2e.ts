import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from '../server.ts';
import { SHOWCASE_SITES } from '../../../src/documentation/lib/page-dirs.ts';
import { assertBothModes } from '../lib/site-mode.ts';

/**
 * Why: the Showcase sites (Website › Showcase) dress the same components as four brands - each with its own palette
 * on its root, a shader or a texture, irregular moves that carry content and three looks. Per site: the docs page
 * links its full-screen page, that page runs without an error and holds what the site is made of, every look sets
 * its own palette (the root's background and the --primary a component inside reads) in light and dark (the
 * switch flips the page, both modes keep their text readable), nothing pushes a phone page
 * sideways, and under reduced motion the turning parts stand still.
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
    parts: ['.shader[data-effect="starfield"]', '.shader[data-effect="clouds"]', '.ob-moon-disc', '.ob-up .ob-dot', '.ob-chart svg', '.ob-bubble', '.ob-ticket.ticket'],
    moving: [],
  },
  'showcase-bouldering': {
    root: '#sc-bouldering',
    parts: ['.shader[data-effect="topography"]', '.gr-hold.corner-blob', '.gr-problem .gr-tape', '.gr-bubble', '.gr-pass.ticket', '.gr-hours'],
    moving: [],
  },
  'showcase-records': {
    root: '#sc-records',
    parts: ['.shader[data-effect="plasma"]', '.lt-record', '.lt-tracks li', '.lt-sleeve .lt-price', '.lt-booth'],
    moving: ['.lt-record'],
  },
};

try {
  assert.deepEqual(Object.keys(SITES).sort(), [...SHOWCASE_SITES].sort(), 'every Showcase site has its checks');
  await check('the Showcase overview links every site', async () => {
    const p = await browser.newPage();
    await p.goto(docs('website-showcase'), { waitUntil: 'domcontentloaded' });
    for (const slug of SHOWCASE_SITES) assert.equal(await p.locator(`main a.card[href="${slug}.html"]`).count(), 1, slug);
    await p.close();
  });

  for (const slug of SHOWCASE_SITES) {
    const { root, parts, moving } = SITES[slug]!;
    console.log(slug);

    await check('the docs page links its full-screen page', async () => {
      const p = await browser.newPage();
      await p.goto(docs(slug), { waitUntil: 'domcontentloaded' });
      const link = p.locator(`main a.btn[href="full-${slug}.html"]`);
      assert.equal(await link.count(), 1, 'one "Open full screen" button');
      assert.equal(await link.getAttribute('target'), '_blank');
      await p.close();
    });

    await check('full screen: no error, every part of the site, three looks with their own palettes, each in light and dark', async () => {
      const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
      const errors: string[] = [];
      p.on('pageerror', (e) => errors.push(e.message));
      await p.goto(full(slug), { waitUntil: 'domcontentloaded' });
      await p.waitForSelector(root);
      const missing = await p.evaluate(([r, ps]) => ps.filter((s) => !document.querySelector(`${r} ${s}`)), [root, parts] as const);
      assert.deepEqual(missing, [], 'parts the site is made of');
      const looks = await p.$$eval(`${root} [data-site-look] option`, (o) => o.map((x) => (x as HTMLOptionElement).value));
      assert.equal(looks.length, 3, 'three looks');
      const seen = new Set<string>();
      for (const look of looks) {
        await p.selectOption(`${root} [data-site-look]`, look);
        const c = await p.$eval(
          root,
          (el) => {
            const probe = document.createElement('span');
            probe.style.background = 'var(--primary)';
            el.append(probe);
            const primary = getComputedStyle(probe).backgroundColor;
            probe.remove();
            return { look: (el as HTMLElement).dataset.look, palette: getComputedStyle(el).backgroundColor + ' / ' + primary };
          },
        );
        assert.equal(c.look, look);
        seen.add(c.palette);
        await assertBothModes(p, root, `${slug} ${look}`);
      }
      assert.equal(seen.size, 3, 'every look its own palette');
      assert.deepEqual(errors, []);
      await p.close();
    });

    await check('a phone: nothing pushes the page sideways', async () => {
      const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await p.goto(full(slug), { waitUntil: 'load' });
      await p.waitForSelector(root);
      await p.waitForTimeout(300);
      const { scroll, width } = await p.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
      assert.ok(scroll <= width, `page ${scroll}px wide in a ${width}px viewport`);
      await p.close();
    });

    if (moving.length)
      await check('reduced motion: the turning parts stand still', async () => {
        const p = await browser.newPage({ viewport: { width: 1400, height: 900 }, reducedMotion: 'reduce' });
        await p.goto(full(slug), { waitUntil: 'domcontentloaded' });
        await p.waitForSelector(root);
        const names = await p.evaluate(([r, ms]) => ms.map((m) => getComputedStyle(document.querySelector(`${r} ${m}`)!).animationName), [root, moving] as const);
        assert.deepEqual(names, moving.map(() => 'none'));
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
