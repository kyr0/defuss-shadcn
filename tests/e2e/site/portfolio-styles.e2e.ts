import { chromium, type Page } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from '../server.ts';
import { PORTFOLIO_STYLES } from '../../../src/documentation/lib/page-dirs.ts';
import { assertBothModes } from '../lib/site-mode.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';
import { chooseLanguage, translationGaps } from '../lib/translation.ts';

/**
 * Why: the ten portfolio styles (Resume & Portfolio) are one-page sites composed from the blocks, shapes.css,
 * Motion entrances, Parallax reveals, Text Rotate and Typewriter - each with a full-screen page built from its one
 * example fence and a palette set on its root. Per style: the docs page links the full-screen page, that page runs
 * without an error, holds the blocks its style is made of, its entrances come to rest visible, nothing pushes the
 * page sideways on a phone, and under reduced motion nothing keeps moving. A themed style's blocks take its palette
 * (a token set on the root reaches them), and every style has a light and a dark mode (its switch flips the page,
 * both keep the text readable). Where a style shows pictures and a contact form (Playful, Bento), a picture opens
 * the viewer on itself, its arrows step on, Escape closes it, and the form sends to a thank-you that closing resets.
 * Every style is a whole site (the maintainer 2026-11-09, "personal sites also project pages"): each kind of sub-page
 * it lists opens on its own address (defuss-dom-router, the pinned build served offline) with its own title.
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
const docs = (slug: string) => `${server.url}/dist/documentation/website/${slug}.html`;
const full = (slug: string) => `${server.url}/dist/documentation/website/full-${slug}.html`;

/** per style: its root and the selectors of what it is made of */
const STYLES: Record<string, { root: string; parts: string[] }> = {
  'portfolio-editorial': {
    root: '#pf-editorial',
    parts: [
      '.mk-resume-header[data-variant="split"] .mk-resume-header-photo.corner-arch',
      '.pf-quote.parallax-reveal',
      '.mk-portfolio-grid[data-variant="index"]',
      '.pf-dropcap',
      '.mk-resume-entries[data-variant="columns"]',
      '.mk-availability[data-variant="banner"]',
    ],
  },
  'portfolio-playful': {
    root: '#pf-playful',
    parts: [
      '.pattern-dots',
      '.text-rotate',
      '.shape-flower',
      '.shape-burst',
      '.mk-news-ticker[data-variant="pill"]',
      '.mk-portfolio-grid[data-variant="scatter"] .frame-tape',
      '.pf-shelf .shape-heart',
      '.mk-skill-matrix[data-variant="tags"]',
      '.mk-availability[data-variant="spotlight"].pattern-polka',
    ],
  },
  'portfolio-developer': {
    root: '#pf-developer',
    parts: [
      '.pf-hero .shader[data-effect="matrix"][data-variant="background"]',
      '.pf-boot .terminal#pf-dev-shell',
      '.mk-resume-header[data-variant="compact"] .shape-hexagon',
      '.mk-repository-item.parallax-reveal',
      '.pf-activity svg',
      '.mk-stats-grid[data-variant="cards"]',
      '.mk-skill-matrix[data-variant="dots"]',
      '.mk-resume-entries[data-variant="timeline"]',
    ],
  },
  'portfolio-bento': {
    root: '#pf-bento',
    parts: [
      '.pf-grid > .pf-tile',
      '.text-rotate',
      '.corner-squircle',
      '.mk-availability',
      '.pattern-grid',
      '.mk-portfolio-grid',
      '.mk-skill-matrix[data-variant="tags"]',
    ],
  },
  'portfolio-brutalist': {
    root: '#pf-brutalist',
    parts: [
      '.mk-news-ticker[data-variant="inverse"]',
      '.mk-resume-header[data-variant="poster"] .frame-thick',
      '.mk-portfolio-grid[data-variant="strip"] .shadow-hard',
      '.mk-process-steps[data-variant="horizontal"]',
      '.pf-rates',
      '.mk-skill-matrix[data-variant="dots"]',
      '.mk-availability[data-variant="spotlight"].cut-corners',
    ],
  },
  'portfolio-photographer': {
    root: '#pf-photographer',
    parts: [
      '.parallax.pf-opening > .parallax-layer[data-depth="far"] img',
      '.mk-resume-header-photo[data-df-entrance="iris"]',
      '.mk-portfolio-grid[data-variant="masonry"] .parallax-reveal[data-reveal="zoom"]',
      '.diff .diff-range',
      '.mk-portfolio-grid[data-variant="strip"]',
      '.pf-contact.edge-wave-top .mk-availability',
    ],
  },
  'portfolio-swiss': {
    root: '#pf-swiss',
    parts: [
      '.pf-name [data-df-entrance="wipe"]',
      '.pf-square',
      '.mk-portfolio-grid',
      '.mk-stats-grid',
      '.mk-resume-entries[data-variant="columns"]',
      '.mk-availability[data-variant="banner"]',
    ],
  },
  'portfolio-neon': {
    root: '#pf-neon',
    parts: [
      '.pf-aurora',
      '.typewriter[data-loop]',
      '.shape-circle.frame-conic',
      '.mk-portfolio-grid[data-variant="strip"]',
      '.mk-audio-player[data-variant="compact"]',
      '.mk-stats-band',
      '.mk-skill-matrix',
      '.mk-availability[data-variant="spotlight"]',
    ],
  },
  'portfolio-zine': {
    root: '#pf-zine',
    parts: [
      '.pf-ransom',
      '.frame-polaroid.frame-tape',
      '.stamp',
      '.shape-star',
      '.mk-portfolio-grid[data-variant="scatter"]',
      '.pf-band.edge-torn-top',
      '.ticket',
      '.mk-newsletter[data-variant="card"] .mk-newsletter-layout',
    ],
  },
  'portfolio-minimal': {
    root: '#pf-minimal',
    parts: [
      '.mk-resume-header[data-variant="compact"] .shape-circle',
      '.mk-resume-header-status',
      '.surface[data-pattern="ruled"]',
      '.pf-dropcap',
      '.pf-watermark',
      '.pf-list',
      '.mk-resume-entries',
    ],
  },
};

/** the styles whose pictures open a viewer and whose contact opens a form: the opener of a picture (data-slide n), the
 * viewer, a contact opener and its dialog */
const MODALS: Record<string, { viewer: string; hello: string; dialog: string }> = {
  'portfolio-playful': {
    viewer: '#pf-play-viewer',
    hello: '#pf-playful [data-hello-kind="mascot"]',
    dialog: '#pf-play-hello',
  },
  'portfolio-bento': {
    viewer: '#pf-bento-viewer',
    hello: '#pf-bento .pf-avail [command="show-modal"]',
    dialog: '#pf-bento-hire-dialog',
  },
};
/** per style: one address of each kind of sub-page and the title it shows (selector, text) */
const DEEP: Record<string, [string, string, string][]> = {
  'portfolio-editorial': [['#/work/the-quiet-atlas', '#pf-ed-case-title', 'The Quiet Atlas']],
  'portfolio-playful': [['#/work/walrus-wally', '#pf-play-story-title', 'Walrus Wally']],
  'portfolio-developer': [
    ['#/repos/sqlite-cdc', '#pf-dev-repo-title', 'samlq/sqlite-cdc'],
    ['#/writing/your-queue-needs-a-no', '#pf-dev-post-title', 'Your queue needs a no'],
  ],
  'portfolio-bento': [
    ['#/work/fleet-dashboard', '#pf-bento-case-title', 'Fleet dashboard'],
    ['#/writing/one-thumb', '#pf-bento-note-title', 'Designing for one thumb on a train'],
  ],
  'portfolio-brutalist': [
    ['#/work/synth-in-a-tab', '#pf-br-p-title', 'Synth in a Tab'],
    ['#/cv', '[data-pf-view="cv"] h1', 'Knut Berg'],
  ],
  'portfolio-photographer': [
    ['#/photo/before-the-tide', '#pf-photo-work-title', 'Before the tide'],
    ['#/series/red-earth', '#pf-photo-work-title', 'Red Earth'],
  ],
  'portfolio-swiss': [['#/work/rietpark', '#pf-sw-case-title', 'Museum Rietpark wayfinding']],
  'portfolio-neon': [['#/work/fiesta-engine', '#pf-neon-case-title', 'Fiesta Engine']],
  'portfolio-zine': [['#/work/stripes', '#pf-zine-case-title', 'Stripes']],
  'portfolio-minimal': [
    ['#/projects/quill', '#pf-min-project-title', 'Quill'],
    ['#/writing/right-to-left', '#pf-min-essay-title', 'Right to left is not a mirror'],
  ],
};

/** the first slide whose left edge sits at the track's */
const slideShown = (p: Page, viewer: string) =>
  p.$eval(`${viewer} .mk-media-gallery-track`, (t) => {
    const left = t.getBoundingClientRect().left;
    return [...t.children].findIndex((li) => Math.abs(li.getBoundingClientRect().left - left) < 4);
  });

/** the entrances that have not come to rest visible (Motion's keyframes end where the element stands) */
const restless = (p: Page) =>
  p.$$eval('[data-df-entrance]', (els) =>
    els
      .filter(
        (e) =>
          getComputedStyle(e).opacity !== '1' ||
          e.getAnimations().some((a) => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity),
      )
      .map(
        (e) =>
          `${e.tagName.toLowerCase()}[${e.getAttribute('data-df-entrance')}] opacity=${getComputedStyle(e).opacity}`,
      ),
  );

try {
  assert.deepEqual(Object.keys(STYLES).sort(), [...PORTFOLIO_STYLES].sort(), 'every portfolio style has its checks');
  assert.deepEqual(Object.keys(DEEP).sort(), [...PORTFOLIO_STYLES].sort(), 'every portfolio style has its sub-pages');

  for (const slug of PORTFOLIO_STYLES) {
    const { root, parts } = STYLES[slug]!;
    console.log(slug);

    await check('the docs page links its full-screen page', async () => {
      const p = await browser.newPage();
      await p.goto(docs(slug), { waitUntil: 'domcontentloaded' });
      const link = p.locator(`main a.btn[href="full-${slug}.html"]`);
      assert.equal(await link.count(), 1, 'one "Open full screen" button');
      assert.equal(await link.getAttribute('target'), '_blank');
      await p.close();
    });

    await check('full screen: no error, every block of the style, the entrances at rest and visible', async () => {
      const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
      const errors: string[] = [];
      p.on('pageerror', (e) => errors.push(e.message));
      await p.goto(full(slug), { waitUntil: 'domcontentloaded' });
      await p.waitForSelector(root);
      const missing = await p.evaluate(([r, ps]) => ps.filter((s) => !document.querySelector(`${r} ${s}, ${r}${s}`)), [
        root,
        parts,
      ] as const);
      assert.deepEqual(missing, [], 'blocks the style is made of');
      if (slug !== 'portfolio-minimal') {
        // the palette set on the root reaches the blocks: --primary inside is the style's, a plain .btn wears it
        const c = await p.evaluate((r) => {
          const paint = (host: Element) => {
            const probe = document.createElement('span');
            probe.style.background = 'var(--primary)';
            host.append(probe);
            const color = getComputedStyle(probe).backgroundColor;
            probe.remove();
            return color;
          };
          const el = document.querySelector(r)!;
          const btn = el.querySelector('.btn:not([data-variant]):not(.pf-cta)');
          return {
            own: paint(el),
            site: paint(document.body),
            btn: btn ? getComputedStyle(btn).backgroundColor : null,
            bg: getComputedStyle(el).backgroundColor,
          };
        }, root);
        assert.notEqual(c.own, c.site, 'the style sets its own --primary');
        if (c.btn && slug !== 'portfolio-neon') assert.equal(c.btn, c.own, "a button inside wears the style's primary");
      }
      // the longest entrance ends near 1.5 s (delay + stagger + duration)
      await p.waitForFunction(() => document.querySelectorAll('[data-df-entrance]').length > 0);
      let left: string[] = [];
      for (let i = 0; i < 20; i++) {
        left = await restless(p);
        if (!left.length) break;
        await p.waitForTimeout(250);
      }
      assert.deepEqual(left, [], 'entrances still moving or hidden after 5 s');
      await assertBothModes(p, root, slug);
      if (slug === 'portfolio-developer') {
        // the hero's Terminal replays its session, then takes a command: open follows a route
        const shell = () => p.evaluate(() => (globalThis as any).df$.shadcn.terminal.text('pf-dev-shell') as string);
        await p.waitForFunction(
          () => /Type help/.test((globalThis as any).df$?.shadcn?.terminal?.text('pf-dev-shell') ?? ''),
          null,
          { timeout: 15000 },
        );
        assert.match(await shell(), /^~ % whoami\nSam Lindqvist - infrastructure engineer, Stockholm$/m);
        assert.match(await shell(), /^9 years, 0 pages at 3 a\.m\. this quarter$/m);
        await p.focus('#pf-dev-shell .xterm-helper-textarea');
        await p.keyboard.type('open sqlite-cdc', { delay: 5 });
        await p.keyboard.press('Enter');
        await p.waitForFunction(() => document.querySelector('#pf-dev-repo-title')?.textContent?.replace(/\s+/g, ' ').trim() === 'samlq/sqlite-cdc', null, { timeout: 5000 });
        await p.evaluate(() => (location.hash = '#/'));
      }
      assert.deepEqual(errors, []);
      await p.close();
    });

    await check('every kind of sub-page opens on its address, with its own title', async () => {
      const p = await browser.newPage({ viewport: { width: 1400, height: 900 }, reducedMotion: 'reduce' });
      const errors: string[] = [];
      p.on('pageerror', (e) => errors.push(e.message));
      await offlineJsdelivr(p);
      for (const [hash, title, text] of DEEP[slug]!) {
        await p.goto(full(slug) + hash, { waitUntil: 'load' });
        await p
          .waitForFunction(
            ([t, x]) => {
              const el = document.querySelector(t) as HTMLElement | null;
              return !!el && el.checkVisibility() && el.textContent!.replace(/\s+/g, ' ').trim() === x;
            },
            [title, text] as const,
            { timeout: 5000 },
          )
          .catch(async () => {
            const got = await p.$eval(title, (el) => el.textContent?.trim()).catch(() => 'no element');
            throw new Error(`${hash}: ${title} shows "${got}", expected "${text}"`);
          });
      }
      assert.deepEqual(errors, []);
      await p.close();
    });

    if (slug === 'portfolio-developer') {
      await check('English and German: every text in both, the switcher turns the page and its sub-pages', async () => {
        const p = await browser.newPage({ viewport: { width: 1400, height: 900 }, reducedMotion: 'reduce' });
        const errors: string[] = [];
        p.on('pageerror', (e) => errors.push(e.message));
        await offlineJsdelivr(p);
        await p.goto(full(slug), { waitUntil: 'load' });
        await p.waitForFunction(() => document.querySelector('#pf-developer')?.getAttribute('lang') === 'en');
        assert.deepEqual(await translationGaps(p, root), [], 'every target and attribute has English and German');
        await chooseLanguage(p, 'de');
        await p.waitForFunction(() => document.querySelector('#pf-dev-repos-title')?.textContent === 'angepinnt');
        await p.goto(full(slug) + '#/writing/your-queue-needs-a-no', { waitUntil: 'load' });
        await chooseLanguage(p, 'de');
        await p.waitForFunction(
          () => document.querySelector('#pf-dev-post-title')?.textContent === 'Deine Queue braucht ein Nein',
        );
        assert.match(await p.$eval('[data-post-date]', (e) => e.textContent!), /September 2026/, 'the date in German');
        await chooseLanguage(p, 'en');
        await p.waitForFunction(
          () => document.querySelector('#pf-dev-post-title')?.textContent === 'Your queue needs a no',
        );
        assert.deepEqual(errors, []);
        await p.close();
      });
    }

    if (MODALS[slug]) {
      const m = MODALS[slug]!;
      await check(
        'a picture opens the viewer on itself, the arrow steps on, Escape closes; the contact form thanks',
        async () => {
          const p = await browser.newPage({ viewport: { width: 1400, height: 900 }, reducedMotion: 'reduce' });
          const errors: string[] = [];
          p.on('pageerror', (e) => errors.push(e.message));
          await p.goto(full(slug), { waitUntil: 'domcontentloaded' });
          await p.waitForSelector(root);
          await p.click(`${root} [data-slide="1"]`);
          await p.waitForFunction((v) => (document.querySelector(v) as HTMLDialogElement).open, m.viewer);
          await p.waitForFunction(
            ([v]) => {
              const t = document.querySelector(`${v} .mk-media-gallery-track`)!;
              return Math.abs(t.children[1]!.getBoundingClientRect().left - t.getBoundingClientRect().left) < 4;
            },
            [m.viewer],
          );
          await p.click(`${m.viewer} [data-viewer-step="1"]`);
          await p.waitForFunction(
            ([v]) => {
              const t = document.querySelector(`${v} .mk-media-gallery-track`)!;
              return Math.abs(t.children[2]!.getBoundingClientRect().left - t.getBoundingClientRect().left) < 4;
            },
            [m.viewer],
          );
          assert.equal(await slideShown(p, m.viewer), 2, 'the next picture');
          await p.keyboard.press('Escape');
          await p.waitForFunction((v) => !(document.querySelector(v) as HTMLDialogElement).open, m.viewer);
          await p.click(m.hello);
          await p.waitForFunction((d) => (document.querySelector(d) as HTMLDialogElement).open, m.dialog);
          await p.fill(`${m.dialog} input[name="name"]`, 'Sam Lee');
          await p.fill(`${m.dialog} input[name="email"]`, 'sam@example.com');
          await p.fill(`${m.dialog} textarea`, 'A mascot for a bakery.');
          await p.click(`${m.dialog} button[type="submit"]`);
          await p.waitForFunction((d) => document.querySelector(d)!.hasAttribute('data-sent'), m.dialog);
          await p.keyboard.press('Escape');
          // the dialog's close event comes a task after it closes
          await p.waitForFunction(
            (d) =>
              !(document.querySelector(d) as HTMLDialogElement).open &&
              !document.querySelector(d)!.hasAttribute('data-sent'),
            m.dialog,
          );
          const after = await p.$eval(m.dialog, (d) => ({
            sent: d.hasAttribute('data-sent'),
            name: (d.querySelector('input[name="name"]') as HTMLInputElement).value,
          }));
          assert.deepEqual(after, { sent: false, name: '' }, 'closing resets the form');
          assert.deepEqual(errors, []);
          await p.close();
        },
      );
    }

    await check('a phone: nothing pushes the page sideways', async () => {
      const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await p.goto(full(slug), { waitUntil: 'domcontentloaded' });
      await p.waitForSelector(root);
      await p.waitForTimeout(300);
      const r = await p.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
      assert.ok(r.scroll <= r.width, `page ${r.scroll}px wide in a ${r.width}px viewport`);
      await p.close();
    });

    await check('reduced motion: the entrances end at once, no endless animation runs', async () => {
      const p = await browser.newPage({ viewport: { width: 1400, height: 900 }, reducedMotion: 'reduce' });
      await p.goto(full(slug), { waitUntil: 'domcontentloaded' });
      await p.waitForSelector(root);
      await p.waitForTimeout(200);
      const r = await p.evaluate(() => ({
        // a scroll-driven reveal follows the scroll, not the clock - it is no motion of its own
        endless: document
          .getAnimations()
          .filter(
            (a) =>
              a.playState === 'running' &&
              a.effect?.getTiming().iterations === Infinity &&
              !(a.timeline && 'source' in a.timeline),
          )
          .map((a) => (a as CSSAnimation).animationName ?? 'script'),
      }));
      assert.deepEqual(r.endless, []);
      assert.deepEqual(await restless(p), []);
      await p.close();
    });
  }
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`portfolio-styles.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
