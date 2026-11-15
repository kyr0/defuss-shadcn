import { chromium, type Page } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from '../server.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';
import {
  INDUSTRY_SITES,
  pageRel,
  STANDALONE_APPS,
  standaloneAppId,
  PORTFOLIO_STYLES,
  SHOWCASE_SITES,
  WEBSITE_PAGE_TEMPLATES,
  WEBSITE_TEMPLATES,
} from '../../../src/documentation/lib/page-dirs.ts';

/**
 * Why: the maintainer (2026-11-09) - "every website that we have should have all its sub-pages/links correctly
 * working". A site that looks finished but whose headlines, projects or footer columns lead nowhere is the defect
 * this pins, on the full-screen page of every site: no link without a destination (href="#", empty, javascript:),
 * every in-page #id link has its target, and every #/route link changes what the page shows (a route the router
 * does not know falls back to the home view, so an unchanged page means a sub-page that does not exist). Whole
 * sites also carry the elementary blocks - a Site Header and a Site Footer; the page templates (an article, a
 * comments thread, the account screens, a search page) are parts of a site and owe only working links.
 *
 * Every picture a site or a full-screen app shows loads, on every route: the photos and avatars ship with the docs
 * (images/photos, images/avatars - scripts/lib/site-photos.ts). VERIFIED: (2026-11-15) while the old photo host was down
 * the published sites showed no picture, and nothing here noticed; a script-built name with no file fails here.
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
const full = (slug: string) => `${server.url}/dist/documentation/website/full-${slug}.html`;
const SITES = [...WEBSITE_TEMPLATES, ...PORTFOLIO_STYLES, ...SHOWCASE_SITES, ...INDUSTRY_SITES];

/**
 * the room between the last content a route shows (text, buttons, images, fields) and the top of the Site Footer -
 * a speaker page once ran its buttons into the footer (the maintainer 2026-11-10); 12px, since the Bento style's
 * footer is a tile one grid gap (14px) below the others; null without a footer in view
 */
const footerRoom = (p: Page) =>
  p.evaluate(() => {
    const footer = document.querySelector<HTMLElement>('.mk-footer');
    if (!footer?.checkVisibility()) return null;
    const top = footer.getBoundingClientRect().top;
    let last = -Infinity;
    for (const el of document.querySelectorAll('p, h1, h2, h3, h4, a, button, img, input, li, figure, dd, dt, td')) {
      if (footer.contains(el) || !el.checkVisibility()) continue;
      const b = el.getBoundingClientRect();
      if (b.width && b.height && b.bottom <= top + 1) last = Math.max(last, b.bottom);
    }
    return Math.round(top - last);
  });

/** follow every picture the page asks for: a failed request or an error status under /images/ */
function watchImages(p: Page): string[] {
  const broken: string[] = [];
  const name = (url: string) => url.replace(/^.*?\/images\//, 'images/');
  p.on('response', (r) => {
    if (r.url().includes('/images/') && r.status() >= 400) broken.push(`${name(r.url())} (${r.status()})`);
  });
  p.on('requestfailed', (r) => {
    if (r.url().includes('/images/')) broken.push(`${name(r.url())} (${r.failure()?.errorText})`);
  });
  return broken;
}

/** the pictures the page shows that loaded nothing (an img that finished without pixels) */
const emptyImages = (p: Page) =>
  p.evaluate(() =>
    [...document.querySelectorAll('img')]
      .filter((img) => img.checkVisibility() && img.complete && img.naturalWidth === 0 && img.getAttribute('src'))
      .map((img) => img.getAttribute('src')!),
  );

/** what the page shows: the visible text of the body, whitespace folded */
const shown = (p: Page) => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());

try {
  for (const slug of SITES) {
    const whole = !WEBSITE_PAGE_TEMPLATES.includes(slug);
    await check(`${slug}: every link leads somewhere${whole ? '; a Site Header and a Site Footer' : ''}`, async () => {
      const p = await browser.newPage({ viewport: { width: 1400, height: 900 }, reducedMotion: 'reduce' });
      const errors: string[] = [];
      p.on('pageerror', (e) => errors.push(String(e)));
      const broken = watchImages(p);
      const empty = new Set<string>();
      await offlineJsdelivr(p);
      await p.goto(full(slug), { waitUntil: 'load' });
      await p.waitForTimeout(400);
      const links = await p.$$eval('body a', (as) =>
        as.map((a) => ({
          href: a.getAttribute('href'),
          text: (a.textContent || a.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 50),
        })),
      );
      const dead = links.filter(
        (l) => l.href === null || l.href === '' || l.href === '#' || /^javascript:/i.test(l.href),
      );
      assert.deepEqual(
        dead.map((l) => l.text),
        [],
        'links without a destination',
      );
      const ids = new Set(await p.$$eval('[id]', (els) => els.map((e) => e.id)));
      const missing = [
        ...new Set(
          links
            .map((l) => l.href!)
            .filter((h) => h.startsWith('#') && !h.startsWith('#/') && !ids.has(decodeURIComponent(h.slice(1)))),
        ),
      ];
      assert.deepEqual(missing, [], 'in-page links without a target');
      if (whole) {
        assert.ok(await p.$('.mk-header'), 'a Site Header');
        assert.ok(await p.$('.mk-footer'), 'a Site Footer');
      }
      // every route a link names shows something of its own: from the home view at its top, the page changes - or,
      // for a section route (#/work on a one-page site), the page moves to that section
      const routes = [...new Set(links.map((l) => l.href!).filter((h) => h.startsWith('#/') && h !== '#/'))];
      const still: string[] = [];
      const cramped: string[] = [];
      const room = async (route: string) => {
        for (const src of await emptyImages(p)) empty.add(`${src} on ${route}`);
        const px = whole ? await footerRoom(p) : null;
        if (px !== null && px < 12) cramped.push(`${route} (${px}px)`);
      };
      await room('#/');
      for (const route of routes) {
        await p.evaluate(() => (location.hash = '/'));
        await p.waitForTimeout(120);
        await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
        const home = await shown(p);
        await p.evaluate((r) => (location.hash = r.slice(1)), route);
        await p.waitForTimeout(160);
        if ((await shown(p)) !== home) {
          await room(route);
          continue;
        }
        // a glide to the section takes a moment
        const moved = await p
          .waitForFunction(() => scrollY > 100, undefined, { timeout: 1500 })
          .then(() => true)
          .catch(() => false);
        if (!moved) still.push(route);
      }
      assert.deepEqual(still, [], 'routes that show nothing of their own');
      assert.deepEqual(cramped, [], 'routes whose content runs into the Site Footer');
      await p.waitForLoadState('networkidle');
      assert.deepEqual([...new Set(broken)], [], 'pictures that do not load');
      assert.deepEqual([...empty], [], 'pictures shown empty');
      assert.deepEqual(errors, []);
      await p.close();
    });
  }
  for (const app of STANDALONE_APPS) {
    await check(`${standaloneAppId(app)}: every picture loads`, async () => {
      const p = await browser.newPage({ viewport: { width: 1400, height: 900 }, reducedMotion: 'reduce' });
      const broken = watchImages(p);
      await offlineJsdelivr(p);
      await p.goto(`${server.url}/dist/documentation/${pageRel(standaloneAppId(app))}`, { waitUntil: 'load' });
      await p.waitForLoadState('networkidle');
      assert.deepEqual([...new Set(broken)], [], 'pictures that do not load');
      assert.deepEqual(await emptyImages(p), [], 'pictures shown empty');
      await p.close();
    });
  }
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`site-links.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
