import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from './server.ts';

/**
 * Why: the documentation site IS the product's public face — if index.html
 * doesn't render, or the SPA router / sidebar filter break, every consumer
 * and agent reading the docs is misled. This exercises the real shipped
 * dist/documentation/ pages over HTTP: static chrome shell, token +
 * component CSS chain, SPA navigation (title/main/active-link/history), and
 * the nav filter ("search"), including the jsDelivr dogfooding note that
 * pairs the site with README's CDN quick start (AGENTS.md "README ↔ index
 * parity").
 */

const PAGE = '/dist/documentation/index.html';
/** Third-party CDNs the doc pages load (shiki via esm.sh, icons via unpkg);
 *  a sandboxed CI without egress may fail those — only first-party errors count. */
const VENDOR = /esm\.sh|unpkg\.com|cdnjs|api\.github\.com/;

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
  const page = await browser.newPage();
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => { if (!VENDOR.test(e.message)) pageErrors.push(e.message); });
  await page.goto(`${server.url}${PAGE}`);

  await check('page renders: static chrome shell rendered', async () => {
    await page.waitForSelector('.site-header .header-brand, .site-sidebar .nav-link', { timeout: 10_000 });
    const counts = await page.evaluate(() => ({
      header: !!document.querySelector('.site-header .header-brand'),
      links: document.querySelectorAll('.site-sidebar .nav-link').length,
      sections: document.querySelectorAll('.site-sidebar .nav-section').length,
    }));
    assert.ok(counts.header, 'site-header did not render the brand');
    // brand must read "defuss-shadcn" — the pre-fork "shadcn-html" regressed once
    assert.equal(
      await page.evaluate(() => document.querySelector('.header-brand-name')?.textContent?.trim()),
      'defuss-shadcn',
      'site header brand has the wrong name',
    );
    assert.ok(counts.links > 50, `expected the full sidebar (>50 links), got ${counts.links}`);
    assert.ok(counts.sections >= 8, `expected >8 nav sections, got ${counts.sections}`);
  });

  await check('CSS chain applied: tokens + component CSS render the intro', async () => {
    const facts = await page.evaluate(() => {
      const btn = document.querySelector('main a.btn') as HTMLElement | null;
      const cs = btn ? getComputedStyle(btn) : null;
      return {
        token: getComputedStyle(document.documentElement).getPropertyValue('--background').trim(),
        primary: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
        height: cs?.height ?? null,
        bg: cs?.backgroundColor ?? null,
        radius: cs?.borderRadius ?? null,
      };
    });
    assert.ok(facts.token.length > 0, '--background token not applied (theme CSS missing?)');
    // the CTA is a flex ITEM, so inline-flex is blockified to flex — assert
    // button.css side effects blockification cannot fake: its fixed height,
    // token-derived background, and non-zero radius (none apply to a bare <a>)
    assert.equal(facts.height, '36px', `button.css height not applied (${facts.height})`);
    assert.notEqual(facts.radius, '0px', 'radius token not resolving through component CSS');
    // bg must be the resolved --primary, proving the token chain end-to-end
    const probe = await page.evaluate(
      (p) => { const d = document.createElement('div'); d.style.color = p; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; },
      facts.primary,
    );
    assert.equal(facts.bg, probe, 'button background is not the resolved --primary token');
  });

  await check('CDN dogfooding note present (README ↔ index parity, runtime side)', async () => {
    const text = await page.evaluate(() => document.querySelector('main')?.textContent ?? '');
    assert.match(text, /jsDelivr CDN/, 'index.html lost the CDN dogfooding note');
  });

  await check('SPA navigation: nav click swaps title, main and active link', async () => {
    const titleBefore = await page.title();
    await page.click('.site-sidebar a.nav-link[href="badge.html"]');
    await page.waitForFunction(
      (t: string) => document.title !== t, titleBefore, { timeout: 5_000 },
    );
    const state = await page.evaluate(() => ({
      title: document.title,
      h1: document.querySelector('main h1')?.textContent?.trim() ?? '',
      active: document.querySelector('.nav-link.active')?.getAttribute('href') ?? '',
      url: location.pathname,
    }));
    assert.match(state.title, /Badge/, 'title not updated by the SPA router');
    assert.match(state.h1, /Badge/, 'main content not swapped');
    assert.equal(state.active, 'badge.html', 'active class did not move');
    assert.ok(state.url.endsWith('/badge.html'), `URL not pushed: ${state.url}`);
  });

  await check('Back button restores the previous page', async () => {
    await page.goBack();
    // popstate fires before the router's fetch+swap finishes — wait on the
    // swapped TITLE, not the pathname (which pops instantly and would race)
    await page.waitForFunction(() => !/Badge/.test(document.title), undefined, { timeout: 5_000 });
    const title = await page.title();
    assert.doesNotMatch(title, /Badge/, 'history back did not restore the intro');
  });

  await check('search: clicking the header input opens the command palette with the index', async () => {
    // header input is a trigger (readonly) that opens the docs-wide
    // <dialog class="command">; the palette's items come from the generated
    // search index (pages + every h2). Pin the whole contract.
    assert.ok(
      await page.evaluate(
        () =>
          !!document.querySelector('.site-header .header-search .header-search-input[readonly]') &&
          !document.querySelector('.site-sidebar .nav-filter-input'),
      ),
      'search trigger missing in header (or a stale sidebar filter exists)',
    );
    await page.click('.header-search-input');
    await page.waitForFunction(
      () => (document.getElementById('docs-palette') as HTMLDialogElement | null)?.open,
      undefined, { timeout: 5_000 },
    );
    const stats = await page.evaluate(() => {
      const items = document.querySelectorAll('#docs-palette-list .command-item');
      return {
        items: items.length,
        groups: document.querySelectorAll('#docs-palette-list .command-group').length,
        // generated index must carry pages AND h2 sections; 55 pages + 200 sections
        withHref: [...items].filter((i) => i.getAttribute('data-href')).length,
      };
    });
    assert.ok(stats.items > 250, `palette index too small: ${stats.items}`);
    assert.equal(stats.items, stats.withHref, 'some palette items have no data-href');
    assert.ok(stats.groups >= 10, `expected grouped entries, got ${stats.groups}`);
  });

  await check('search: query filters items; Enter navigates to the page', async () => {
    // 'combobox' matches exactly one entry — the page itself — so Enter's
    // click target is unambiguous ('accordion' would first hit the earlier
    // "Accordion animations" section entry)
    const cmdInput = page.locator('#docs-palette .command-input');
    await cmdInput.fill('combobox');
    const filtered = await page.evaluate(() => {
      const visible = [...document.querySelectorAll('#docs-palette-list .command-item')]
        .filter((i) => !i.hasAttribute('hidden'))
        .map((i) => ({ text: i.textContent?.trim() ?? '', href: i.getAttribute('data-href') }));
      const hl = document.querySelector('#docs-palette-list [data-highlighted]');
      return { visible, hlHref: hl?.getAttribute('data-href') };
    });
    assert.deepEqual(filtered.visible.map((v) => v.href), ['combobox.html'], 'filter should leave exactly the Combobox page entry');
    assert.equal(filtered.hlHref, 'combobox.html', 'first match must be auto-highlighted');
    await page.keyboard.press('Enter'); // command.js: Enter clicks the highlighted item
    await page.waitForFunction(() => /Combobox/.test(document.title), undefined, { timeout: 5_000 });
    assert.ok(
      await page.evaluate(() => !(document.getElementById('docs-palette') as HTMLDialogElement).open),
      'palette did not close on navigate',
    );
    assert.equal(
      await page.evaluate(() => document.querySelector('.nav-link.active')?.getAttribute('href')),
      'combobox.html', 'SPA nav did not mark the new page active',
    );
  });

  await check('search: section result navigates SPA + scrolls to the heading', async () => {
    // item-click already closed the palette; its focus-restore sets a short
    // suppress window — wait past it before re-opening via the trigger
    await page.waitForTimeout(300);
    await page.click('.header-search-input');
    await page.waitForFunction(() => (document.getElementById('docs-palette') as HTMLDialogElement).open, undefined, { timeout: 5_000 });
    const cmdInput = page.locator('#docs-palette .command-input');
    await cmdInput.fill('quick start'); // a section heading, not any page label
    const hit = page.locator('#docs-palette-list .command-item:not([hidden])').first();
    const href = await hit.getAttribute('data-href');
    assert.ok(href && href.startsWith('installation.html#'), `expected an installation section hit, got ${href}`);
    await hit.click();
    const id = href!.slice(href!.indexOf('#') + 1);
    // SPA swap is async (scrollToWhenReady polls up to 2s) — wait for the element
    await page.waitForFunction(
      (sectionId: string) => {
        const el = document.getElementById(sectionId);
        return !!el && Math.abs(el.getBoundingClientRect().top) < 300;
      },
      id, { timeout: 5_000 },
    );
  });

  await check('Ctrl/Cmd+K opens the palette anywhere on the page', async () => {
    await page.keyboard.press('Control+k');
    await page.waitForFunction(
      () => (document.getElementById('docs-palette') as HTMLDialogElement).open,
      undefined, { timeout: 5_000 },
    );
    const focused = await page.evaluate(() => document.activeElement?.classList.contains('command-input'));
    assert.ok(focused, 'Ctrl+K opened the palette but did not focus its input');
    // Escape closes without instantly reopening via the trigger-restore focus
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !(document.getElementById('docs-palette') as HTMLDialogElement).open, undefined, { timeout: 5_000 });
    await page.waitForTimeout(250); // past the trigger-restore suppress window
    assert.ok(
      await page.evaluate(() => !(document.getElementById('docs-palette') as HTMLDialogElement).open),
      'palette reopened itself after Escape (trigger-focus loop)',
    );
  });

  await check('active nav link stays readable under theme presets (computed contrast >= 4.5)', async () => {
    // regression: 15 dark + 7 light themes shipped an active nav link whose
    // text vanished into the pill. verify's token gate checks the raw hex
    // pairs; this checks what the browser ACTUALLY paints through the real
    // layout (correct token wiring in .nav-link.active, transitions settled).
    const REGRESSION_SET: Array<[string, 'light' | 'dark']> = [
      ['default', 'light'], ['catppuccin', 'light'], ['supabase', 'light'],
      ['tangerine', 'light'], ['retro-arcade', 'light'], ['midnight-bloom', 'light'],
      ['candyland', 'light'], ['modern-minimal', 'dark'], ['mono', 'dark'],
      ['kodama-grove', 'dark'], ['neo-brutalism', 'dark'], ['nature', 'dark'],
      ['mocha-mousse', 'dark'], ['supabase', 'dark'], ['catppuccin', 'dark'],
      ['northern-lights', 'dark'], ['sunset-horizon', 'dark'], ['midnight-bloom', 'dark'],
      ['candyland', 'dark'], ['retro-arcade', 'dark'], ['bold-tech', 'dark'],
      ['elegant-luxury', 'dark'],
    ];
    const bad: string[] = [];
    for (const [themeId, mode] of REGRESSION_SET) {
      await page.evaluate(
        ([t, m]) => {
          document.documentElement.classList.toggle('dark', m === 'dark');
          (globalThis as any)._defussShadcn.docs.applyTheme(t);
        },
        [themeId, mode],
      );
      await page.waitForTimeout(200); // past `transition: all 120ms`
      const ratio = await page.evaluate(() => {
        const link = document.querySelector('.nav-link.active') as HTMLElement;
        const cs = getComputedStyle(link);
        // canvas resolves any CSS color syntax (oklch/oklab/color()) to bytes
        const cv = document.createElement('canvas');
        cv.width = cv.height = 1;
        const ctx = cv.getContext('2d')!;
        const toRgba = (c: string): number[] => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = 'rgba(0,0,0,0)';
          ctx.fillStyle = c;
          ctx.fillRect(0, 0, 1, 1);
          const d = ctx.getImageData(0, 0, 1, 1).data;
          return [d[0], d[1], d[2], d[3] / 255];
        };
        const lum = (rgb: number[]) => {
          const f = (v: number) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
          return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
        };
        const [ar, ag, ab, a] = toRgba(cs.backgroundColor);
        const sb = toRgba(getComputedStyle(document.querySelector('.site-sidebar')!).backgroundColor);
        const blend = (ch: number, bg: number) => Math.round(ch * a + bg * (1 - a));
        const painted = [blend(ar, sb[0]), blend(ag, sb[1]), blend(ab, sb[2])];
        const fg = toRgba(cs.color);
        const [l1, l2] = [lum(fg), lum(painted)].sort((x, y) => y - x);
        return (l1 + 0.05) / (l2 + 0.05);
      });
      if (ratio < 4.5) bad.push(`${themeId}/${mode}=${ratio.toFixed(2)}`);
    }
    assert.deepEqual(bad, [], `active nav link contrast below WCAG AA: ${bad.join(', ')}`);
    await page.evaluate(() => {
      (globalThis as any)._defussShadcn.docs.applyTheme('default');
      document.documentElement.classList.remove('dark');
    });
  });

  await check('wide-mode toggle releases the main max-width (and persists)', async () => {
    const before = await page.evaluate(() => getComputedStyle(document.querySelector('main')!).maxWidth);
    assert.notEqual(before, 'none', 'main is unconstrained before toggling — the check proves nothing');

    await page.click('#wide-toggle');
    const wide = await page.evaluate(() => ({
      maxWidth: getComputedStyle(document.querySelector('main')!).maxWidth,
      pressed: document.getElementById('wide-toggle')!.getAttribute('aria-pressed'),
      stored: localStorage.getItem('defuss-shadcn-wide'),
      icon: getComputedStyle(document.getElementById('icon-wide-collapse')!).display,
    }));
    assert.equal(wide.maxWidth, 'none', 'wide mode did not release the max-width');
    assert.equal(wide.pressed, 'true', 'aria-pressed not synced');
    assert.equal(wide.stored, '1', 'state not persisted');
    assert.notEqual(wide.icon, 'none', 'collapse icon not shown');

    // toggle back so later checks (and reloads) see the default layout
    await page.click('#wide-toggle');
    const after = await page.evaluate(() => ({
      maxWidth: getComputedStyle(document.querySelector('main')!).maxWidth,
      stored: localStorage.getItem('defuss-shadcn-wide'),
    }));
    assert.equal(after.maxWidth, before, 'toggling off did not restore the width');
    assert.equal(after.stored, '0', 'off-state not persisted');
  });

  await check('architecture page renders from ARCH.md (h2s + proof-loop section)', async () => {
    await page.goto(`${server.url}/dist/documentation/architecture.html`);
    const state = await page.evaluate(() => ({
      h1: document.querySelector('main h1')?.textContent?.trim() ?? '',
      h2s: [...document.querySelectorAll('main h2')].map((h) => h.textContent?.trim() ?? ''),
      prose: !!document.querySelector('.arch-prose'),
    }));
    assert.match(state.h1, /Architecture/, 'h1 missing');
    assert.ok(state.prose, 'ARCH.md body not injected (.arch-prose missing)');
    // ARCH.md's five parts + the proof loop must all be present
    for (const want of ['AGENTS.MD', 'VERIFIER', 'PROOF LOOP', 'HUMAN EXPERT']) {
      assert.ok(
        state.h2s.some((t) => t.toUpperCase().includes(want)),
        `h2 for "${want}" missing — page drifted from ARCH.md? (found: ${state.h2s.join(' | ')})`,
      );
    }
  });

  await check('no first-party page errors during the whole run', async () => {
    assert.deepEqual(pageErrors, [], `uncaught page errors: ${pageErrors.join(' | ')}`);
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`documentation.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('documentation.e2e: all checks passed');
