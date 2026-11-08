import { chromium, type Frame, type Page } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from '../server.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';
import { chooseLanguage, renderedLanguage, translationGaps } from '../lib/translation.ts';
import { assertBothModes } from '../lib/site-mode.ts';
import { PORTFOLIO_STYLES, SHOWCASE_SITES, WEBSITE_TEMPLATES } from '../../../src/documentation/lib/page-dirs.ts';

/**
 * Why: every Website template routes with defuss-dom-router and translates its frame with defuss-i18n (the
 * Client-side Routing and Translation guides) - and only its full-screen page gives the router an address to own.
 * Per template: a deep link shows what its route names, a link or control moves on and Back returns, every target
 * and attribute has English and German, and German shows. Every template is designed in three looks (a palette, the
 * textures or shaders under it and how its moves are drawn): its Look select switches all of them - each look its own
 * background, its own [data-for] layers and only those - and each look in light and dark (the switch flips the page, both
 * modes keep their text readable). The Blog card checks the docs preview's hash fallback.
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
/** the page scroll that puts a point of a frame (its top + y) 40 px under the top of the view */
const scrollY0 = (box: { y: number } | null, y: number) => (box?.y ?? 0) + y - 40;
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
  'website-resume-portfolio': {
    root: '#site-resume',
    deep: '#/work/museo-digital',
    run: async (p) => {
      // a project route fills the project page from the data block, its next link moves on, Back returns
      assert.deepEqual(await shown(p, '#site-resume [data-resume-view]', 'data-resume-view'), ['project']);
      assert.equal(await text(p, '.mk-project-details-title'), 'Museo Digital');
      await follow(p, '.mk-project-details-next');
      await p.waitForFunction(() => location.hash === '#/work/quiet-tokens');
      assert.equal(await text(p, '.mk-project-details-title'), 'quiet-tokens');
      assert.deepEqual(await p.$$eval('[data-project-deliverables] li', (l) => l.map((x) => x.textContent)), ['Token files CSS', 'Checker CLI', 'Theme gallery Web']);
      await p.goBack();
      await p.waitForFunction(() => document.querySelector('.mk-project-details-title')!.textContent === 'Museo Digital');
      // a discipline filters the work, the filter marks itself
      await follow(p, '[data-resume-nav] a[href="#/work"]');
      await follow(p, '[data-resume-filter] a[href="#/work?discipline=design"]');
      await p.waitForFunction(() => location.hash === '#/work?discipline=design');
      assert.deepEqual(await shown(p, '#site-resume [data-discipline]', 'data-discipline'), ['design']);
      assert.deepEqual(await current(p, '[data-resume-filter] a'), ['#/work?discipline=design']);
      // the CV prints without the site's chrome
      await follow(p, '[data-resume-nav] a[href="#/resume"]');
      await p.waitForFunction(() => location.hash === '#/resume');
      assert.deepEqual(await shown(p, '#site-resume [data-resume-view]', 'data-resume-view'), ['resume']);
      assert.deepEqual(await current(p, '[data-resume-nav] a'), ['#/resume']);
      await p.emulateMedia({ media: 'print' });
      assert.deepEqual(await p.$$eval('[data-resume-noprint]', (e) => e.map((x) => getComputedStyle(x).display)), ['none', 'none']);
      await p.emulateMedia({ media: 'screen' });
      // About is the root route
      await follow(p, '[data-resume-nav] a[href="#/"]');
      await p.waitForFunction(() => location.hash === '#/');
      assert.deepEqual(await shown(p, '#site-resume [data-resume-view]', 'data-resume-view'), ['about']);
      assert.deepEqual(await current(p, '[data-resume-nav] a'), ['#/']);
    },
    german: ['[data-i18n-target="av-start-date"]', '1. Dezember 2026'],
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
    deep: '#/sign-up',
    run: async (p) => {
      assert.deepEqual(await shown(p, '#site-account [data-account-view]', 'data-account-view'), ['sign-up']);
      await follow(p, '[data-account-view="sign-up"] a[href="#/"]');
      await p.waitForFunction(() => location.hash === '#/');
      assert.deepEqual(await shown(p, '#site-account [data-account-view]', 'data-account-view'), ['sign-in']);
      // a valid sign-in (the form's fields are required) lands on the signed-in state
      await p.fill('#lf2-email', 'anna@example.com');
      await p.fill('#lf2-pass', 'correct horse');
      await p.$eval('[data-account-sign-in]', (f) => (f as HTMLFormElement).requestSubmit());
      await p.waitForFunction(() => location.hash === '#/welcome');
      assert.deepEqual(await shown(p, '#site-account [data-account-view]', 'data-account-view'), ['welcome']);
    },
    german: ['#ss-0', 'Du bist angemeldet'],
  },
  'website-docs-help': {
    root: '#site-docs',
    deep: '#/docs/roles',
    run: async (p) => {
      assert.deepEqual([await text(p, '[data-docs-title]'), await text(p, '[data-docs-crumb-section]')], ['Roles', 'Guides']);
      assert.equal(await p.$eval('[data-docs-stub]', (s) => (s as HTMLElement).hidden), false);
      // the bar's section link follows the page's section
      assert.deepEqual(await current(p, '.docs-top a'), ['#/docs/offline-sync']);
      await follow(p, '.mk-docs-navigation a[href="#/docs/authentication"]');
      await p.waitForFunction(() => location.hash === '#/docs/authentication');
      assert.deepEqual(await current(p, '.docs-top a'), ['#/docs/authentication']);
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
    await check(`${slug}: ${t.deep} - the route shows what it names, a link moves on; three looks; every target in English and German; German`, async () => {
      const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
      const errors: string[] = [];
      p.on('pageerror', (e) => errors.push(String(e)));
      await offlineJsdelivr(p);
      await p.goto(full(slug) + t.deep);
      await p.waitForFunction((r) => document.querySelector(r)?.hasAttribute('lang'), t.root, { timeout: 15_000 });
      await p.waitForTimeout(150);
      await t.run(p);
      // a deep link may have opened a modal (the Media viewer): Escape closes it, so the mode switch is in reach
      for (let i = 0; i < 3 && (await p.$('dialog[open]:modal')); i++) await p.keyboard.press('Escape');
      // the looks: each sets data-look, paints its own background and shows exactly its own layers
      const looks = await p.$$eval(`${t.root} [data-site-look] option`, (o) => o.map((x) => (x as HTMLOptionElement).value));
      assert.equal(looks.length, 3, 'three looks');
      const backgrounds = new Set<string>();
      for (const look of looks) {
        await p.selectOption(`${t.root} [data-site-look]`, look);
        const seen = await p.$eval(
          t.root,
          (root) => ({
            look: (root as HTMLElement).dataset.look,
            background: getComputedStyle(root).backgroundColor,
            layers: [...root.querySelectorAll('[data-for]')].filter((el) => !el.closest('[hidden]')).map((el) => [(el as HTMLElement).dataset.for, getComputedStyle(el).display !== 'none']),
          }),
        );
        assert.equal(seen.look, look);
        backgrounds.add(seen.background);
        // a look's textures reach past the content - never past the page (two once made it 1,856 px wide)
        const wide = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        assert.ok(wide <= 0, `${look}: the page scrolls sideways by ${wide}px`);
        for (const [owner, visible] of seen.layers) assert.equal(visible, owner === look, `${look}: the ${owner} layer`);
        await assertBothModes(p, t.root, `${slug} ${look}`);
      }
      assert.equal(backgrounds.size, 3, 'every look its own background');
      await p.selectOption(`${t.root} [data-site-look]`, looks[0]);
      // on a phone too: a grid track sized by a row of tabs once made the Search page 785 px wide at 390
      await p.setViewportSize({ width: 390, height: 844 });
      const phone = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(phone <= 0, `at 390 px the page scrolls sideways by ${phone}px`);
      await p.setViewportSize({ width: 1400, height: 900 });
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

  await check('the index Websites gallery opens every template, portfolio style and showcase site full screen', async () => {
    const p = await browser.newPage();
    await p.goto(`${server.url}/dist/documentation/index.html`, { waitUntil: 'domcontentloaded' });
    const links = await p.$$eval('#websites ~ div a.card[target="_blank"]', (as) => as.map((a) => a.getAttribute('href')));
    const want = [...WEBSITE_TEMPLATES, ...PORTFOLIO_STYLES, ...SHOWCASE_SITES].map((slug) => `website/full-${slug}.html`);
    assert.deepEqual([...links].sort(), want.sort());
    await p.close();
  });

  await check('Account settings: the section list follows the page - a click marks its link, scrolling marks the section in view', async () => {
    const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await offlineJsdelivr(p);
    await p.goto(`${server.url}/dist/documentation/website/website-account-states.html`);
    await p.locator('#screens').scrollIntoViewIfNeeded();
    let f: Frame | undefined;
    for (let i = 0; i < 100 && !f; i++) {
      for (const fr of p.frames()) if (await fr.$('#acc-settings .acc-settings-nav').catch(() => null)) f = fr;
      if (!f) await p.waitForTimeout(150);
    }
    assert.ok(f, 'the Account settings preview');
    const nav = '#acc-settings .acc-settings-nav a';
    await f.waitForFunction(() => 'df$' in globalThis, undefined, { timeout: 15_000 });
    await f.waitForTimeout(300);
    await follow(f, '#acc-settings a[href="#acc-s-security"]');
    assert.deepEqual(await current(f, nav), ['#acc-s-security']);
    // scroll the docs page until the notifications fill the view: the observer marks them
    await p.waitForTimeout(1100);
    const frame = (await f.frameElement()).boundingBox();
    const panel = await f.$eval('#acc-s-notify', (e) => e.getBoundingClientRect().top);
    await p.evaluate((y) => scrollTo({ top: scrollY + y, behavior: 'instant' }), scrollY0(await frame, panel));
    await f.waitForFunction((sel) => document.querySelector(sel + '[href="#acc-s-notify"]')?.hasAttribute('aria-current'), nav, { timeout: 5000 });
    assert.deepEqual(await current(f, nav), ['#acc-s-notify']);
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
