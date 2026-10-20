import { chromium, type Frame, type Page } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from '../server.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';
import { chooseLanguage, renderedLanguage, translationGaps } from '../lib/translation.ts';
import { WEBSITE_TEMPLATES } from '../../../src/documentation/lib/page-dirs.ts';

/**
 * Why: every Website template routes with defuss-dom-router and translates its frame with defuss-i18n (the
 * Client-side Routing and Translation guides) - and only its full-screen page gives the router an address to own.
 * Per template: a deep link shows what its route names, a link or control moves on and Back returns, every target
 * and attribute has English and German, and German shows. The Blog card checks the docs preview's hash fallback.
 */
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
const full = (slug: string) => `${server.url}/dist/documentation/website/full-${slug}.html`;
const text = (p: Page | Frame, sel: string) => p.$eval(sel, (e) => e.textContent!.replace(/\s+/g, ' ').trim());
const shown = (p: Page | Frame, sel: string, attr: string) =>
  p.$$eval(sel, (els, a) => [...new Set(els.filter((e) => !(e as HTMLElement).hidden).map((e) => (e as HTMLElement).getAttribute(a)))], attr);
const current = (p: Page | Frame, sel: string) => p.$$eval(sel, (els) => els.filter((e) => e.hasAttribute('aria-current')).map((e) => e.getAttribute('href')));
/** a link's own click (the router takes it) - some sit in folded or scrolled-away parts */
const follow = (p: Page | Frame, sel: string) => p.$eval(sel, (a) => (a as HTMLElement).click());

/** per template: its root, a deep link, what it shows, a move and Back, a German string */
const TEMPLATES: Record<string, { root: string; deep: string; run: (p: Page) => Promise<void>; german: [string, string] }> = {
  'website-blog': {
    root: '#site-blog',
    deep: '#/category/engineering',
    run: async (p) => {
      assert.deepEqual(await shown(p, '#site-blog [data-category]', 'data-category'), ['engineering']);
      await follow(p, '#site-blog a[href="#/archive/2026/09"]');
      await p.waitForFunction(() => location.hash === '#/archive/2026/09');
      assert.deepEqual(await shown(p, '#site-blog [data-category]', 'data-category'), ['design']);
      assert.equal(await p.$eval('[data-blog-archive] a[aria-current]', (a) => a.closest('details')!.open), true);
      await p.goBack();
      await p.waitForFunction(() => location.hash === '#/category/engineering');
    },
    german: ['#site-blog .mk-blog-header-title', 'Notizen über ruhige Software'],
  },
  'website-news': {
    root: '#site-news',
    deep: '#/section/company',
    run: async (p) => {
      assert.deepEqual(await shown(p, '#site-news [data-topic]', 'data-topic'), ['company']);
      assert.deepEqual(await current(p, '#site-news nav a'), ['#/section/company']);
      await follow(p, '#site-news nav a[href="#/"]');
      await p.waitForFunction(() => location.hash === '#/');
      assert.equal((await shown(p, '#site-news [data-topic]', 'data-topic')).length, 4);
    },
    german: ['.mk-news-header-date', 'Donnerstag, 1. Oktober 2026'],
  },
  'website-article': {
    root: '#site-article',
    deep: '#/articles/testing-sync',
    run: async (p) => {
      assert.equal(await text(p, '.mk-article-header-title'), 'Testing sync with a lossy network');
      assert.equal(await text(p, '.mk-article-header-meta'), 'September 12, 202611 min read');
      await follow(p, '.mk-article-nav-link[rel="next"]');
      await p.waitForFunction(() => location.hash === '#/articles/designing-for-calm');
      assert.equal(await text(p, '.mk-article-header-author'), 'Hannah Lee');
      await p.goBack();
      await p.waitForFunction(() => document.querySelector('.mk-article-header-title')!.textContent === 'Testing sync with a lossy network');
    },
    german: ['.mk-article-header-meta', '12. September 202611 Min. Lesezeit'],
  },
  'website-comments': {
    root: '#site-comments',
    deep: '#/comments/d-3?sort=oldest',
    run: async (p) => {
      assert.deepEqual(await p.$$eval('[data-comments-thread] > .mk-comment-item', (c) => c.map((x) => x.id)), ['d-4', 'd-1']);
      assert.deepEqual(await p.$$eval('[data-highlighted]', (c) => c.map((x) => x.id)), ['d-3']);
      await p.selectOption('[data-comments-sort]', 'top');
      await p.waitForFunction(() => location.hash === '#/?sort=top');
      assert.deepEqual(await p.$$eval('[data-comments-thread] > .mk-comment-item', (c) => c.map((x) => x.id)), ['d-1', 'd-4']);
    },
    german: ['#d-1 time', 'vor 2 Stunden'],
  },
  'website-company': {
    root: '#site-company',
    deep: '#/jobs/design',
    run: async (p) => {
      assert.deepEqual(await shown(p, '#site-company [data-company-view]', 'data-company-view'), ['jobs']);
      assert.deepEqual(await shown(p, '#site-company [data-department]', 'data-department'), ['design']);
      assert.deepEqual(await current(p, '[data-company-nav] a'), ['#/jobs', '#/jobs/design']);
      await follow(p, '[data-company-nav="site"] a[href="#/team"]');
      await p.waitForFunction(() => location.hash === '#/team');
      assert.deepEqual(await shown(p, '#site-company [data-company-view]', 'data-company-view'), ['team']);
    },
    german: ['#about-title', 'Wir bauen ruhige Software für Teams, die liefern'],
  },
  'website-events-promotions': {
    root: '#site-events',
    deep: '#/track/engineering',
    run: async (p) => {
      assert.deepEqual(await shown(p, '#site-events [data-track]', 'data-track'), ['engineering']);
      await follow(p, '.mk-speaker-item-talk[href="#/sessions/ss-3"]');
      await p.waitForFunction(() => location.hash === '#/sessions/ss-3');
      assert.deepEqual(await shown(p, '#site-events [data-track]', 'data-track'), ['design']);
      await p.goBack();
      await p.waitForFunction(() => location.hash === '#/track/engineering');
    },
    german: ['#ec-3', 'Frühbucherpreis endet in'],
  },
  'website-media': {
    root: '#site-media',
    deep: '#/photos/3',
    run: async (p) => {
      assert.equal(await p.$eval('#mg-viewer', (d) => (d as HTMLDialogElement).open), true);
      await p.keyboard.press('Escape');
      await p.waitForFunction(() => location.hash === '#/' && !(document.getElementById('mg-viewer') as HTMLDialogElement).open);
      await follow(p, '.mk-media-gallery-grid a[href="#/photos/5"]');
      await p.waitForFunction(() => (document.getElementById('mg-viewer') as HTMLDialogElement).open);
    },
    german: ['#tm-1', 'Deine Arbeit reist mit'],
  },
  'website-shop': {
    root: '#site-shop',
    deep: '#/checkout',
    run: async (p) => {
      assert.deepEqual(await shown(p, '#site-shop [data-shop-view]', 'data-shop-view'), ['checkout']);
      await p.$eval('[data-shop-pay]', (f) => (f as HTMLFormElement).requestSubmit());
      await p.waitForFunction(() => location.hash === '#/order/A-20481');
      assert.deepEqual(await shown(p, '#site-shop [data-shop-view]', 'data-shop-view'), ['order']);
      await p.goBack();
      await p.waitForFunction(() => location.hash === '#/checkout');
    },
    german: ['[data-shop-pay] button[type="submit"]', '88,90 € bezahlen'],
  },
  'website-account-states': {
    root: '#site-account',
    deep: '#/settings',
    run: async (p) => {
      assert.deepEqual(await shown(p, '#site-account [data-account-view]', 'data-account-view'), ['settings']);
      assert.deepEqual(await current(p, '#site-account nav a'), ['#/settings']);
      await follow(p, '#site-account nav a[href="#/"]');
      await p.waitForFunction(() => location.hash === '#/');
      // a valid sign-in (the form's fields are required)
      await p.fill('#lf2-email', 'anna@example.com');
      await p.fill('#lf2-pass', 'correct horse');
      await p.$eval('[data-account-sign-in]', (f) => (f as HTMLFormElement).requestSubmit());
      await p.waitForFunction(() => location.hash === '#/profile');
    },
    german: ['#sec-sign', 'Anmeldung'],
  },
  'website-docs-help': {
    root: '#site-docs',
    deep: '#/docs/roles',
    run: async (p) => {
      assert.deepEqual([await text(p, '[data-docs-title]'), await text(p, '[data-docs-crumb-section]')], ['Roles', 'Guides']);
      assert.equal(await p.$eval('[data-docs-stub]', (s) => (s as HTMLElement).hidden), false);
      await follow(p, '.mk-docs-navigation a[href="#/docs/offline-sync"]');
      await p.waitForFunction(() => location.hash === '#/docs/offline-sync');
      assert.equal(await p.$eval('[data-docs-stub]', (s) => (s as HTMLElement).hidden), true);
    },
    german: ['[data-docs-crumb-section]', 'Anleitungen'],
  },
  'website-search-navigation': {
    root: '#site-search',
    deep: '#/?category=design&page=3&sort=newest',
    run: async (p) => {
      assert.deepEqual(await current(p, '.mk-category-menu a'), ['#/?category=design&sort=newest']);
      assert.equal(await text(p, '.mk-collection-pagination-range'), 'Showing 25–36 of 248');
      // the Pagination component shows the route's page and owns its clicks; the page it lands on is the address
      assert.equal(await text(p, '.pagination-link[aria-current]'), '3');
      await follow(p, '.pagination-next');
      await p.waitForFunction(() => location.hash === '#/?category=design&page=4&sort=newest');
      assert.equal(await text(p, '.mk-collection-pagination-range'), 'Showing 37–48 of 248');
      await p.goBack();
      await p.waitForFunction(() => location.hash === '#/?category=design&page=3&sort=newest');
    },
    german: ['.mk-collection-pagination-range', '25–36 von 248'],
  },
  'website-landing-page': {
    root: '#top',
    deep: '#/pricing',
    run: async (p) => {
      assert.deepEqual(await current(p, '.mk-header-nav a'), ['#/pricing']);
      // the deep link scrolls once the page is laid out (its images loaded)
      await p.waitForLoadState('load');
      await p.waitForTimeout(200);
      const top = await p.$eval('#lp-pricing', (s) => Math.round(s.getBoundingClientRect().top));
      assert.ok(Math.abs(top) < 120, `the pricing section opens at the top (${top})`);
      await follow(p, '.mk-header-nav a[href="#/faq"]');
      await p.waitForFunction(() => location.hash === '#/faq');
      assert.deepEqual(await current(p, '.mk-header-nav a'), ['#/faq']);
      // it glides there - the router's own scroll to the top (scroll: 'manual') does not stop it
      await p.waitForFunction(() => Math.abs(document.getElementById('lp-faq')!.getBoundingClientRect().top) < 120, undefined, { timeout: 5000 });
    },
    german: ['.mk-hero-title', 'Bessere Entscheidungen, ganz leicht'],
  },
};

try {
  await check('every Website template is covered here and has a full-screen page linked from its docs page', async () => {
    assert.deepEqual(Object.keys(TEMPLATES).sort(), [...WEBSITE_TEMPLATES].sort());
    const page = await browser.newPage();
    for (const slug of WEBSITE_TEMPLATES) {
      await page.goto(`${server.url}/dist/documentation/website/${slug}.html`, { waitUntil: 'domcontentloaded' });
      assert.equal(await page.getAttribute(`a[href="full-${slug}.html"]`, 'target'), '_blank', slug);
    }
    await page.close();
  });

  for (const [slug, t] of Object.entries(TEMPLATES)) {
    await check(`${slug}: ${t.deep} - the route shows what it names, a link moves on; every target in English and German; German`, async () => {
      const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
      const errors: string[] = [];
      p.on('pageerror', (e) => errors.push(String(e)));
      await offlineJsdelivr(p);
      await p.goto(full(slug) + t.deep);
      await p.waitForFunction((r) => document.querySelector(r)?.hasAttribute('lang'), t.root, { timeout: 15_000 });
      await p.waitForTimeout(150);
      await t.run(p);
      assert.deepEqual(await translationGaps(p, t.root), []);
      await chooseLanguage(p, 'de');
      assert.equal(await renderedLanguage(p, t.root), 'de');
      assert.equal(await text(p, t.german[0]), t.german[1]);
      assert.deepEqual(errors, []);
      await p.close();
    });
  }

  await check('the docs card: the router cannot own about:srcdoc - the preview follows its hash with the same routes', async () => {
    const p = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
    await offlineJsdelivr(p);
    await p.goto(`${server.url}/dist/documentation/website/website-blog.html`);
    const iframe = await p.waitForSelector('.code-example iframe', { timeout: 15_000 });
    const f = (await iframe.contentFrame()) as Frame;
    await f.waitForFunction(() => document.querySelector('#site-blog')?.hasAttribute('lang'), undefined, { timeout: 15_000 });
    await follow(f, '#site-blog a[href="#/category/design"]');
    await f.waitForFunction(() => location.href === 'about:srcdoc#/category/design');
    assert.deepEqual(await shown(f, '#site-blog [data-category]', 'data-category'), ['design']);
    await p.close();
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`website-templates.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('website-templates.e2e: all checks passed');
