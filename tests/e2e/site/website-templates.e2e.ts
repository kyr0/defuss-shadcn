import { chromium, type Frame, type Page } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from '../server.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';
import { chooseLanguage, renderedLanguage, translationGaps } from '../lib/translation.ts';
import { assertBothModes } from '../lib/site-mode.ts';
import {
  INDUSTRY_SITES,
  PORTFOLIO_STYLES,
  SHOWCASE_SITES,
  STANDALONE_APPS,
  WEBSITE_PAGE_TEMPLATES,
  WEBSITE_TEMPLATES,
  standaloneAppId,
} from '../../../src/documentation/lib/page-dirs.ts';

/**
 * Why: every Website template routes with defuss-dom-router and translates its frame with defuss-i18n (the
 * Client-side Routing and Translation guides) - and only its full-screen page gives the router an address to own.
 * Per template: a deep link shows what its route names, a link or control moves on and Back returns, every target
 * and attribute has English and German, and German shows. Every template is designed in three looks (a palette, the
 * textures or shaders under it and how its moves are drawn): its Look select switches all of them - each look its own
 * background, its own [data-for] layers and only those - and each look in light and dark (the switch flips the page, both
 * modes keep their text readable). The Blog card checks the docs preview's hash fallback. Every template is a working
 * site (the maintainer 2026-11-09, "every website ... should have all its sub-pages/links correctly working"): each
 * kind of sub-page it lists - a story, a post, a job, a case, a session, an article - opens on its own address with
 * its own title, in English and German.
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
  p.$$eval(
    sel,
    (els, a) => [
      ...new Set(els.filter((e) => !(e as HTMLElement).hidden).map((e) => (e as HTMLElement).getAttribute(a))),
    ],
    attr,
  );
const current = (p: Page | Frame, sel: string) =>
  p.$$eval(sel, (els) => els.filter((e) => e.hasAttribute('aria-current')).map((e) => e.getAttribute('href')));
/** the page scroll that puts a point of a frame (its top + y) 40 px under the top of the view */
const scrollY0 = (box: { y: number } | null, y: number) => (box?.y ?? 0) + y - 40;
/** a link's own click (the router takes it) - some sit in folded or scrolled-away parts */
const follow = (p: Page | Frame, sel: string) => p.$eval(sel, (a) => (a as HTMLElement).click());

/** per template: its root, a deep link, what it shows, a move and Back, a German string */
const TEMPLATES: Record<
  string,
  { root: string; deep: string; run: (p: Page) => Promise<void>; german: [string, string] }
> = {
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
      // a section is a page of its own: its title and its stories, the front page hidden
      assert.equal(await text(p, '#news-section-title'), 'Company');
      assert.equal(await p.$eval('#site-news [data-news-view="front"]', (e) => (e as HTMLElement).hidden), true);
      assert.deepEqual(await p.$$eval('#site-news [data-section-row] [data-row-section]', (els) => [...new Set(els.map((e) => e.textContent!.trim()))]), ['Company']);
      assert.deepEqual(await current(p, '#site-news nav a'), ['#/section/company']);
      await follow(p, '#site-news nav a[href="#/"]');
      await p.waitForFunction(() => location.hash === '#/');
      assert.equal(await p.$eval('#site-news [data-news-view="section"]', (e) => (e as HTMLElement).hidden), true);
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
      await p.waitForFunction(
        () => document.querySelector('.mk-article-header-title')!.textContent === 'Testing sync with a lossy network',
      );
    },
    german: ['.mk-article-header-meta', '12. September 202611 Min. Lesezeit'],
  },
  'website-comments': {
    root: '#site-comments',
    deep: '#/comments/d-3?sort=oldest',
    run: async (p) => {
      assert.deepEqual(await p.$$eval('[data-comments-thread] > .mk-comment-item', (c) => c.map((x) => x.id)), [
        'd-4',
        'd-1',
      ]);
      assert.deepEqual(await p.$$eval('[data-highlighted]', (c) => c.map((x) => x.id)), ['d-3']);
      await p.selectOption('[data-comments-sort]', 'top');
      await p.waitForFunction(() => location.hash === '#/?sort=top');
      assert.deepEqual(await p.$$eval('[data-comments-thread] > .mk-comment-item', (c) => c.map((x) => x.id)), [
        'd-1',
        'd-4',
      ]);
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
      assert.deepEqual(await p.$$eval('[data-project-deliverables] li', (l) => l.map((x) => x.textContent)), [
        'Token files CSS',
        'Checker CLI',
        'Theme gallery Web',
      ]);
      await p.goBack();
      await p.waitForFunction(
        () => document.querySelector('.mk-project-details-title')!.textContent === 'Museo Digital',
      );
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
      assert.deepEqual(await p.$$eval('[data-resume-noprint]', (e) => e.map((x) => getComputedStyle(x).display)), [
        'none',
        'none',
      ]);
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
      await p.waitForFunction(
        () => location.hash === '#/' && !(document.getElementById('mg-viewer') as HTMLDialogElement).open,
      );
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
      assert.deepEqual(
        [await text(p, '[data-docs-title]'), await text(p, '[data-docs-crumb-section]')],
        ['Roles', 'Guides'],
      );
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
      assert.equal(await text(p, '.mk-collection-pagination-range'), 'Showing 25–36 of 56');
      // the Pagination component shows the route's page and owns its clicks; the page it lands on is the address
      assert.equal(await text(p, '.pagination-link[aria-current]'), '3');
      await follow(p, '.pagination-next');
      await p.waitForFunction(() => location.hash === '#/?category=design&page=4&sort=newest');
      assert.equal(await text(p, '.mk-collection-pagination-range'), 'Showing 37–48 of 56');
      await p.goBack();
      await p.waitForFunction(() => location.hash === '#/?category=design&page=3&sort=newest');
      // the search runs on its index: every term matches a word, one edit away counts - and offers the spelling
      await p.evaluate(() => (location.hash = '/?q=calm+sofware'));
      await p.waitForFunction(() =>
        document.querySelector('[data-search-summary="q"]')?.textContent?.includes('8 results'),
      );
      assert.equal(await p.getAttribute('[data-search-suggestion]', 'href'), '#/?q=calm+software');
      assert.deepEqual(await p.$$eval('.sr-list .mk-search-result', (r) => r.length), 8);
      assert.ok(
        (await p.$$eval('.sr-list mark', (m) => m.map((x) => x.textContent!.toLowerCase()))).every(
          (w) => w === 'calm' || w === 'software',
        ),
      );
      // a filter narrows it, the counts beside the others follow
      await p.evaluate(() => (location.hash = '/?q=offline&type=help'));
      await p.waitForFunction(() =>
        document.querySelector('.mk-collection-pagination-range')?.textContent?.replace(/\s+/g, ' ').includes('of 4'),
      );
      assert.equal(await text(p, '[data-search-filters] label:has(input[value="video"]) small'), '4');
      // the sidebar's button counts what its ticked filters would show, before they apply
      await p.check('[data-search-filters] input[value="video"]');
      await p.waitForFunction(() => document.querySelector('.mk-filter-sidebar-apply')?.textContent?.includes('8'));
      // nothing found says so
      await p.evaluate(() => (location.hash = '/?q=zzzz'));
      await p.waitForSelector('.sr-list .sr-empty');
      await p.evaluate(() => (location.hash = '/?category=design&page=3&sort=newest'));
      await p.waitForFunction(() =>
        document.querySelector('.mk-collection-pagination-range')?.textContent?.replace(/\s+/g, ' ').includes('25–36'),
      );
    },
    german: ['.mk-collection-pagination-range', '25–36 von 56'],
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
      await p.waitForFunction(
        () => Math.abs(document.getElementById('lp-faq')!.getBoundingClientRect().top) < 120,
        undefined,
        { timeout: 5000 },
      );
    },
    german: ['.mk-hero-title', 'Bessere Entscheidungen, ganz leicht'],
  },
};

/** per template: one address of each kind of sub-page, the title it shows (selector, English) and, where its data
 * is translated, the German title */
const SUBPAGES: Record<string, [string, string, string, string?][]> = {
  'website-news': [
    [
      '#/story/passkeys',
      '#news-story-title',
      'Passkeys are now the default sign-in',
      'Passkeys sind jetzt die Standard-Anmeldung',
    ],
    ['#/section/engineering', '#news-section-title', 'Engineering', 'Technik'],
  ],
  'website-blog': [
    [
      '#/post/ten-years',
      '#blog-post-title',
      'Ten years of Acme: what we got right',
      'Zehn Jahre Acme: was wir richtig gemacht haben',
    ],
  ],
  'website-article': [['#/articles/designing-for-calm', '[data-article-bio-name]', 'Hannah Lee']],
  'website-comments': [['#/comments/d-3', '[data-comments-permalink-author]', 'Aron Homberg']],
  'website-company': [
    ['#/work', '#work-title', 'Teams that got calmer', 'Teams, die ruhiger wurden'],
    [
      '#/work/globex',
      '#cs-title',
      'Globex brings 400 researchers onto one wiki',
      'Globex bringt 400 Forschende in ein Wiki',
    ],
    ['#/job/sync-engineer', '.mk-job-details-title', 'Senior Sync Engineer'],
    ['#/press/ledger', '#st-title', 'The 40-person company quietly taking on the giants'],
  ],
  'website-events-promotions': [
    ['#/sessions/ss-4', '#se-title', 'Async teams at 400 people'],
    ['#/events/workshops', '#ee-title', 'Workshop day', 'Workshop-Tag'],
    ['#/speakers/hannah-lee', '#sk-name', 'Hannah Lee'],
    ['#/register', '#reg-title', 'Register for Acme Summit 2026'],
  ],
  'website-media': [['#/stories/lisbon', '#sp-title', 'Lisbon in eight pictures', 'Lissabon in acht Bildern']],
  'website-account-states': [['#/sso/github', '#sso-title', 'Continue with GitHub', 'Weiter mit GitHub']],
  'website-search-navigation': [
    ['#/articles/sync-stuck', '#ar-title', 'Sync is stuck on one device', 'Sync hängt auf einem Gerät'],
    ['#/help', '#hp-title', 'Popular articles', 'Beliebte Artikel'],
  ],
  'website-landing-page': [
    [
      '#/blog/context',
      '.lp-post .mk-article-header-title',
      'The End of Context Switching',
      'Das Ende des Kontextwechsels',
    ],
    ['#/product/analytics', '#lp-product-title', 'See what moves your work'],
    ['#/legal/privacy', '#lp-legal-title', 'Privacy Policy'],
  ],
  'website-shop': [['#/product/glass-teapot', '.shop-product-name', 'Glass teapot']],
  'website-docs-help': [
    ['#/docs/roles', '[data-docs-title]', 'Roles'],
    ['#/changelog/4.0.0', '[data-rl-list] .mk-release-header-title', 'Acme 4.0: offline sync for everyone'],
    ['#/help', '#site-docs .hc-hero h1', 'How can we help?'],
    ['#/help/topic/billing', '[data-help-results-title]', 'Billing & plans'],
    ['#/help/two-factor', '#ha-title', 'Turn on two-factor', 'Zwei-Faktor einschalten'],
  ],
  'website-resume-portfolio': [
    ['#/writing/eleven-date-pickers', '#rs-post-title', 'Eleven date pickers'],
    [
      '#/writing/one-hand-in-the-rain',
      '#rs-post-title',
      'Designing for one hand in the rain',
      'Gestalten für eine Hand im Regen',
    ],
  ],
};
/** waits until a selector shows a text (visible), or fails naming what it shows */
async function showsText(p: Page, sel: string, want: string, where: string): Promise<void> {
  await p
    .waitForFunction(
      ([s, w]) => {
        const el = document.querySelector(s) as HTMLElement | null;
        return !!el && el.checkVisibility() && el.textContent!.replace(/\s+/g, ' ').trim() === w;
      },
      [sel, want] as const,
      { timeout: 5000 },
    )
    .catch(async () => {
      const got = await p.$eval(sel, (e) => e.textContent!.replace(/\s+/g, ' ').trim()).catch(() => 'no element');
      throw new Error(`${where}: ${sel} shows "${got}", expected "${want}"`);
    });
}

try {
  await check(
    'every Website template is covered here and has a full-screen page linked from its docs page',
    async () => {
      assert.deepEqual(Object.keys(TEMPLATES).sort(), [...WEBSITE_TEMPLATES].sort());
      assert.deepEqual(
        Object.keys(SUBPAGES).sort(),
        [...WEBSITE_TEMPLATES].sort(),
        'every template lists its sub-pages',
      );
      const page = await browser.newPage();
      for (const slug of WEBSITE_TEMPLATES) {
        await page.goto(`${server.url}/dist/documentation/website/${slug}.html`, { waitUntil: 'domcontentloaded' });
        assert.equal(await page.getAttribute(`a[href="full-${slug}.html"]`, 'target'), '_blank', slug);
      }
      await page.close();
    },
  );

  for (const [slug, t] of Object.entries(TEMPLATES)) {
    await check(
      `${slug}: ${t.deep} - the route shows what it names, a link moves on; three looks; every target in English and German; German`,
      async () => {
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
        const looks = await p.$$eval(`${t.root} [data-site-look] option`, (o) =>
          o.map((x) => (x as HTMLOptionElement).value),
        );
        assert.equal(looks.length, 3, 'three looks');
        const backgrounds = new Set<string>();
        for (const look of looks) {
          await p.selectOption(`${t.root} [data-site-look]`, look);
          const seen = await p.$eval(t.root, (root) => ({
            look: (root as HTMLElement).dataset.look,
            background: getComputedStyle(root).backgroundColor,
            layers: [...root.querySelectorAll('[data-for]')]
              .filter((el) => !el.closest('[hidden]'))
              .map((el) => [(el as HTMLElement).dataset.for, getComputedStyle(el).display !== 'none']),
          }));
          assert.equal(seen.look, look);
          backgrounds.add(seen.background);
          // a look's textures reach past the content - never past the page (two once made it 1,856 px wide)
          const wide = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
          assert.ok(wide <= 0, `${look}: the page scrolls sideways by ${wide}px`);
          for (const [owner, visible] of seen.layers)
            assert.equal(visible, owner === look, `${look}: the ${owner} layer`);
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
      },
    );
  }

  for (const [slug, pages] of Object.entries(SUBPAGES)) {
    await check(
      `${slug}: every kind of sub-page opens on its address with its own title, in English and German`,
      async () => {
        const p = await browser.newPage({ viewport: { width: 1400, height: 900 }, reducedMotion: 'reduce' });
        const errors: string[] = [];
        p.on('pageerror', (e) => errors.push(String(e)));
        await offlineJsdelivr(p);
        const root = TEMPLATES[slug]!.root;
        for (const [hash, sel, en, de] of pages) {
          await p.goto(full(slug) + hash);
          await p.waitForFunction((r) => document.querySelector(r)?.hasAttribute('lang'), root, { timeout: 15_000 });
          await showsText(p, sel, en, hash);
          if (de) {
            await chooseLanguage(p, 'de');
            await showsText(p, sel, de, `${hash} (de)`);
            // the next address is a hash change on the same document, which keeps the language: back to English
            await chooseLanguage(p, 'en');
          }
        }
        if (slug === 'website-events-promotions') {
          // the registration adds up its prices in the page's language
          await p.goto(full(slug) + '#/register');
          await p.waitForFunction((r) => document.querySelector(r)?.hasAttribute('lang'), root, { timeout: 15_000 });
          await p.click('#rg-workshop');
          await showsText(p, '[data-events-total]', '€440', 'the total with the workshop');
        }
        assert.deepEqual(errors, []);
        await p.close();
      },
    );
  }

  await check(
    'the docs card: the router cannot own about:srcdoc - the preview follows its hash with the same routes',
    async () => {
      const p = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
      await offlineJsdelivr(p);
      await p.goto(`${server.url}/dist/documentation/website/website-blog.html`);
      const iframe = await p.waitForSelector('.code-example iframe', { timeout: 15_000 });
      const f = (await iframe.contentFrame()) as Frame;
      await f.waitForFunction(() => document.querySelector('#site-blog')?.hasAttribute('lang'), undefined, {
        timeout: 15_000,
      });
      await follow(f, '#site-blog a[href="#/category/design"]');
      await f.waitForFunction(() => location.href === 'about:srcdoc#/category/design');
      assert.deepEqual(await shown(f, '#site-blog [data-category]', 'data-category'), ['design']);
      await p.close();
    },
  );

  await check(
    'the front page: three views behind tabs on the left; the Websites gallery opens every whole site full screen, the scaffolds every app',
    async () => {
      const p = await browser.newPage();
      await p.goto(`${server.url}/dist/documentation/index.html`, { waitUntil: 'domcontentloaded' });
      const links = await p.$$eval('#websites ~ div a.card[target="_blank"]', (as) =>
        as.map((a) => a.getAttribute('href')),
      );
      // whole sites only: the page templates (an article, comments ...) stay off the gallery
      const want = [
        ...WEBSITE_TEMPLATES.filter((t) => !WEBSITE_PAGE_TEMPLATES.includes(t)),
        ...PORTFOLIO_STYLES,
        ...SHOWCASE_SITES,
        ...INDUSTRY_SITES,
      ].map((slug) => `website/full-${slug}.html`);
      assert.deepEqual([...links].sort(), want.sort());
      // three views behind tabs on the left: Features shows first; Application Scaffolds opens every app full screen;
      // Website Templates shows this gallery
      assert.equal(await p.getAttribute('#views', 'data-side'), 'left');
      assert.deepEqual(await p.$$eval('#views [role="tab"]', (t) => t.map((x) => x.textContent!.trim())), [
        'Features',
        'Application Scaffolds',
        'Website Templates',
      ]);
      assert.ok(
        !(await p.$eval('#view-features', (e) => (e as HTMLElement).hidden)) &&
          (await p.$eval('#view-websites', (e) => (e as HTMLElement).hidden)),
      );
      await p.click('#tab-scaffolds');
      assert.ok(!(await p.$eval('#view-scaffolds', (e) => (e as HTMLElement).hidden)));
      const apps = await p.$$eval('#view-scaffolds a.card', (as) => as.map((a) => a.getAttribute('href')));
      assert.deepEqual(apps.sort(), STANDALONE_APPS.map((slug) => `application/${standaloneAppId(slug)}.html`).sort());
      await p.click('#tab-websites');
      assert.ok(
        !(await p.$eval('#view-websites', (e) => (e as HTMLElement).hidden)) &&
          (await p.$eval('#view-features', (e) => (e as HTMLElement).hidden)),
      );
      await p.close();
    },
  );

  await check(
    'Account settings: the section list follows the page - a click marks its link, scrolling marks the section in view',
    async () => {
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
      await f.waitForFunction(
        (sel) => document.querySelector(sel + '[href="#acc-s-notify"]')?.hasAttribute('aria-current'),
        nav,
        { timeout: 5000 },
      );
      assert.deepEqual(await current(f, nav), ['#acc-s-notify']);
      await p.close();
    },
  );

  // a docs card's preview follows the hash with a router that scrolls nothing: a story picked under the one shown
  // changed out of sight (the maintainer 2026-11-09, "More stories" in the News card) - a new page opens at its start
  await check('docs card: a story picked from More stories opens at its start', async () => {
    const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await offlineJsdelivr(p);
    await p.goto(`${server.url}/dist/documentation/website/website-news.html`, { waitUntil: 'domcontentloaded' });
    const iframe = await p.waitForSelector('.code-example iframe', { timeout: 15_000 });
    await iframe.scrollIntoViewIfNeeded();
    const f = (await iframe.contentFrame())!;
    await f.waitForFunction(() => 'df$' in globalThis && !!document.querySelector('#site-news'), undefined, {
      timeout: 15_000,
    });
    await f.evaluate(() => (location.hash = '/story/acme-4'));
    await f.waitForFunction(() => !(document.querySelector('[data-news-view="story"]') as HTMLElement).hidden);
    // the first related story, at the foot of the story: scroll to it as a reader would, then follow it
    const link = await f.$('[data-related-link]');
    await link!.scrollIntoViewIfNeeded();
    const picked = await link!.getAttribute('href');
    await link!.click();
    await f.waitForFunction((h) => location.hash === h, picked);
    await f.waitForFunction(
      () => {
        const top = document.querySelector('#news-story-title')!.getBoundingClientRect().top;
        return top >= -1 && top < innerHeight / 2;
      },
      undefined,
      { timeout: 5000 },
    );
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
