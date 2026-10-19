import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';
import { EXTRA_BUNDLES } from '../../../scripts/lib/bundles.ts';

/**
 * Why: E2E smoke test for the shipped HTML Preview Editor (code-example, the
 * wysiwyg bundle). The fixture carries every configuration the doc page
 * shows - a card with a schema, one without, one booting as a phone, one
 * driven from outside - as BARE markup (a .code-example around a textarea):
 * the runtime builds the card, and the default asset discovery (the page's
 * stylesheets + its all.js / wysiwyg.js) feeds the previews. Shiki is the
 * pinned esm.sh ESM; a deterministic stub stands in for it here (offline), so
 * the paint path is exercised exactly as on the CDN.
 */

const FIXTURE = '/tests/e2e/wysiwyg-editors/code-example.e2e-fixture.html';
const SHIKI = 'https://esm.sh/shiki@3.0.0';
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

/** a Shiki stand-in: every non-blank line one span, coloured through the prefix the component passes */
const SHIKI_STUB = `export async function codeToHtml(code, opts) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const p = opts.cssVariablePrefix || '--shiki-';
  const lines = code.split('\\n').map((l) => '<span class="line">' + (l ? '<span style="' + p + 'light:#d73a49;' + p + 'dark:#f97583">' + esc(l) + '</span>' : '') + '</span>');
  return '<pre class="shiki" data-lang="' + opts.lang + '" data-themes="' + opts.themes.light + ' ' + opts.themes.dark + '"><code>' + lines.join('\\n') + '</code></pre>';
}`;

const shikiRequests: string[] = [];
async function open(): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (e) => console.error('    pageerror:', e.message));
  await page.route(`${SHIKI}**`, (route) => {
    shikiRequests.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: SHIKI_STUB });
  });
  await page.goto(server.url + FIXTURE, { waitUntil: 'load' });
  await page.waitForFunction(() => [...document.querySelectorAll('.code-example')].every((el) => (el as HTMLElement).dataset.init !== undefined));
  return page;
}

const setState = (page: Page, id: string, name: string, config?: Record<string, unknown>) =>
  page.$eval(`#${id}`, (el, [n, c]) => (el as HTMLElement).api!.setState(n as string, c as Record<string, unknown> | undefined), [name, config] as const);
const stateOf = (page: Page, id: string) => page.$eval(`#${id}`, (el) => (el as HTMLElement).api!.getState() as { name: string; config: Record<string, unknown> });
/** the card's preview has reported ready (el.preview installed) */
const ready = (page: Page, id: string) => page.waitForFunction((sel) => !!(document.querySelector(sel) as HTMLElement & { preview?: unknown })?.preview, `#${id}`, { timeout: 15_000 });

const page = await open();
try {
  await check('init: every card is built around its textarea - stage, toolbar, panels', async () => {
    const r = await page.$$eval('.code-example', (els) =>
      els.map((el) => ({
        id: el.id,
        frame: !!el.querySelector(':scope > .code-example-stage .code-example-frame[sandbox="allow-scripts allow-forms"]'),
        toolbar: !!el.querySelector(':scope > .code-example-toolbar'),
        src: !!el.querySelector('.code-example-panel[data-panel="code"] .code-example-editor > textarea.code-example-src'),
        paint: el.querySelector('.code-example-paint')?.getAttribute('aria-hidden'),
        stateTab: !!el.querySelector('.code-example-tab[data-tab="state"]'),
        title: el.querySelector('iframe')!.getAttribute('title'),
      })),
    );
    assert.equal(r.length, 6);
    for (const c of r) {
      assert.ok(c.frame && c.toolbar && c.src, `#${c.id} shell`);
      assert.equal(c.paint, 'true', `#${c.id} paint layer is aria-hidden`);
    }
    assert.deepEqual(r.map((c) => c.stateTab), [true, false, false, false, false, false], 'only the schema card has a State tab');
    assert.equal(r[0].title, 'Switch preview', 'the frame title comes from aria-label');
  });

  await check('CSS: stage, toolbar and hidden panels are styled by wysiwyg.css', async () => {
    const r = await page.evaluate(() => {
      const cs = (s: string) => getComputedStyle(document.querySelector(s)!);
      return {
        stage: cs('#cx-buttons .code-example-stage').display,
        toolbar: cs('#cx-buttons .code-example-toolbar').display,
        panel: cs('#cx-buttons .code-example-panel[data-panel="code"]').display,
        exit: cs('#cx-buttons .code-example-full-exit').display,
      };
    });
    assert.deepEqual(r, { stage: 'flex', toolbar: 'flex', panel: 'none', exit: 'none' });
  });

  // reported (2026-10-16): the docs' "Studio" link in a card's toolbar rendered as a blue underlined page link
  await check('a link a page adds to the toolbar looks like its other tools, not like a page link', async () => {
    const r = await page.evaluate(() => {
      const bar = document.querySelector('#cx-buttons .code-example-toolbar')!;
      const a = Object.assign(document.createElement('a'), { href: '#studio', className: 'code-example-tab', textContent: 'Studio' });
      bar.append(a);
      const look = (e: Element) => {
        const c = getComputedStyle(e);
        return { color: c.color, decoration: c.textDecorationLine, size: c.fontSize, padding: c.padding, display: c.display };
      };
      const out = { link: look(a), button: look(bar.querySelector('.code-example-reset')!) };
      a.remove();
      return out;
    });
    assert.deepEqual(r.link, r.button);
    assert.equal(r.link.decoration, 'none');
  });

  await check('preview: the source runs in the sandbox with the page\'s runtime (data-state-values mirror)', async () => {
    await ready(page, 'cx-switch');
    await page.waitForFunction(() => (document.querySelector('#cx-switch') as HTMLElement).dataset.stateValues !== undefined);
    const frame = page.frameLocator('#cx-switch .code-example-frame');
    // all.css reached the preview: the switch is styled (appearance none)
    await frame.locator('.switch').waitFor();
    const appearance = await frame.locator('.switch').evaluate((el) => getComputedStyle(el).appearance);
    assert.equal(appearance, 'none');
    assert.deepEqual(JSON.parse((await page.$eval('#cx-switch', (el) => (el as HTMLElement).dataset.stateValues))!), { checked: false });
  });

  await check('el.preview drives the previewed component; the source follows (checked="")', async () => {
    await page.$eval('#cx-switch', (el) => (el as HTMLElement & { preview: { setState(n: string, v: unknown): void } }).preview.setState('checked', true));
    await page.waitForFunction(() => JSON.parse((document.querySelector('#cx-switch') as HTMLElement).dataset.stateValues || '{}').checked === true);
    await page.waitForFunction(() => (document.querySelector('#cx-switch textarea') as HTMLTextAreaElement).value.includes('checked=""'));
    // a click inside the preview flows back the same way
    await page.frameLocator('#cx-switch .code-example-frame').locator('.switch').click();
    await page.waitForFunction(() => JSON.parse((document.querySelector('#cx-switch') as HTMLElement).dataset.stateValues || '{}').checked === false);
  });

  await check('data-links: the preview uses the mapped link targets; the source keeps what was written, also after a write-back', async () => {
    await ready(page, 'cx-links');
    const frame = page.frameLocator('#cx-links .code-example-frame');
    assert.equal(await frame.locator('#cx-a').getAttribute('href'), 'links/target.html');
    assert.equal(await frame.locator('#cx-b').getAttribute('href'), 'other.html');
    // a change in the preview writes the markup back into the source (open="") - with the authored target
    await frame.locator('#cx-more summary').click();
    await page.waitForFunction(() => (document.querySelector('#cx-links textarea') as HTMLTextAreaElement).value.includes('open=""'));
    const source = await page.$eval('#cx-links textarea', (el) => (el as HTMLTextAreaElement).value);
    assert.ok(source.includes('href="target.html"') && !source.includes('links/target.html'), source);
  });

  await check('state "code": the source opens, the tab presses, Shiki paints it', async () => {
    await setState(page, 'cx-buttons', 'code');
    const r = await page.$eval('#cx-buttons', (el) => ({
      hidden: (el.querySelector('[data-panel="code"]') as HTMLElement).hidden,
      pressed: el.querySelector('.code-example-tab[data-tab="code"]')!.getAttribute('aria-pressed'),
      name: (el as HTMLElement).dataset.stateName,
    }));
    assert.deepEqual(r, { hidden: false, pressed: 'true', name: 'code' });
    await page.waitForFunction(() => document.querySelector('#cx-buttons .code-example-editor')!.hasAttribute('data-painted'));
    await page.waitForFunction(() => !!document.querySelector('#cx-buttons .code-example-paint span[style*="--code-example-light"]'));
    const colour = await page.$eval('#cx-buttons .code-example-paint span[style*="--code-example-light"]', (s) => getComputedStyle(s).color);
    assert.equal(colour, 'rgb(215, 58, 73)', 'the light colour through --code-example-light');
    assert.ok(shikiRequests.every((u) => u.startsWith(SHIKI)), 'Shiki comes from the pinned URL');
    const glyphs = await page.$eval('#cx-buttons .code-example-src', (t) => getComputedStyle(t).color);
    assert.equal(glyphs, 'rgba(0, 0, 0, 0)', 'the textarea glyphs turn transparent over the paint');
  });

  await check('state "state": the controls open (with a schema) - without one it lands in default', async () => {
    await setState(page, 'cx-switch', 'state');
    assert.equal(await page.$eval('#cx-switch [data-panel="state"]', (p) => (p as HTMLElement).hidden), false);
    assert.equal(await page.$eval('#cx-switch [data-panel="state"] .code-example-row', (r) => (r as HTMLElement).dataset.stateName), 'checked');
    await setState(page, 'cx-buttons', 'state');
    assert.equal((await stateOf(page, 'cx-buttons')).name, 'default');
    await setState(page, 'cx-switch', 'default');
  });

  await check('state "fullscreen": the card fills the screen; Escape returns', async () => {
    await setState(page, 'cx-buttons', 'fullscreen', { panel: 'code' });
    const r = await page.$eval('#cx-buttons', (el) => ({
      attr: el.hasAttribute('data-fullscreen'),
      pos: getComputedStyle(el).position,
      code: (el.querySelector('[data-panel="code"]') as HTMLElement).hidden,
      exit: getComputedStyle(el.querySelector('.code-example-full-exit')!).display,
      label: el.querySelector('.code-example-full span')!.textContent,
    }));
    assert.deepEqual(r, { attr: true, pos: 'fixed', code: false, exit: 'flex', label: 'Exit fullscreen' }); // inline-flex, blockified by position: absolute
    assert.deepEqual((await stateOf(page, 'cx-buttons')).config.panel, 'code');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#cx-buttons')!.hasAttribute('data-fullscreen'));
    assert.equal((await stateOf(page, 'cx-buttons')).name, 'code', 'the open panel stays');
    await setState(page, 'cx-buttons', 'default');
  });

  await check('typing reruns the preview, marks data-edited, fires code-example-change; Reset restores', async () => {
    await ready(page, 'cx-play');
    await page.$eval('#cx-play', (el) => {
      (globalThis as any).__changes = [];
      el.addEventListener('code-example-change', (e) => (globalThis as any).__changes.push((e as CustomEvent).detail));
    });
    await setState(page, 'cx-play', 'code');
    await page.click('#cx-play .code-example-src');
    await page.keyboard.press('End');
    await page.keyboard.type('<span class="badge" id="typed">typed</span>');
    await page.waitForFunction(() => (globalThis as any).__changes.length > 0);
    const change = await page.evaluate(() => (globalThis as any).__changes.at(-1));
    assert.equal(change.origin, 'input');
    assert.ok(change.source.includes('id="typed"'));
    assert.equal(await page.$eval('#cx-play', (el) => el.hasAttribute('data-edited')), true);
    await page.frameLocator('#cx-play .code-example-frame').locator('#typed').waitFor({ timeout: 10_000 });
    assert.ok(String((await stateOf(page, 'cx-play')).config.source).includes('id="typed"'), 'getState() reports the typed source');
    await page.click('#cx-play .code-example-reset');
    await page.waitForFunction(() => !document.querySelector('#cx-play')!.hasAttribute('data-edited'));
    assert.ok(!(await page.$eval('#cx-play .code-example-src', (t) => (t as HTMLTextAreaElement).value)).includes('typed'));
  });

  await check('Tab indents in the source, Escape then Tab leaves it', async () => {
    await page.click('#cx-play .code-example-src');
    await page.keyboard.press('Home');
    await page.keyboard.press('Tab');
    assert.ok((await page.$eval('#cx-play .code-example-src', (t) => (t as HTMLTextAreaElement).value)).includes('  '));
    await page.keyboard.press('Escape');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('code-example-src')), false);
    await page.$eval('#cx-play', (el) => (globalThis as any).df$.shadcn.codeExample.reset(el));
  });

  await check('the outside API: setSource / viewport / code-example-change (origin api)', async () => {
    await page.click('#cx-load');
    await page.waitForFunction(() => (globalThis as any).__changes.at(-1)?.origin === 'api');
    assert.ok((await page.$eval('#cx-play .code-example-src', (t) => (t as HTMLTextAreaElement).value)).includes('setSource()'));
    await page.frameLocator('#cx-play .code-example-frame').locator('.card-title').waitFor({ timeout: 10_000 });
    assert.match(await page.textContent('#cx-log') ?? '', /code-example-change \(api\)/);
    await page.click('#cx-tablet');
    const r = await page.$eval('#cx-play', (el) => ({ mode: (el as HTMLElement).dataset.vpMode, screen: (el.querySelector('.code-example-screen') as HTMLElement).dataset.mode, w: (el.querySelector('.code-example-vp-w') as HTMLInputElement).value }));
    assert.deepEqual(r, { mode: 'tablet', screen: 'tablet', w: '834' });
    await page.click('#cx-reset');
  });

  await check('bundlesFor: a source that names an extra bundle\'s component needs that bundle - the build\'s list (src/documentation/lib/extra-bundles.ts)', async () => {
    const r = await page.evaluate((bundles) => {
      const api = (globalThis as any).df$.shadcn.codeExample;
      const each = Object.fromEntries(Object.values(bundles).flat().map((m) => [m, api.bundlesFor(`<div class="${m}"></div>`)]));
      return { each, none: api.bundlesFor('<button class="btn">Save</button>'), both: api.bundlesFor('<figure class="math-renderer"></figure><figure class="mermaid-diagram"></figure>') };
    }, EXTRA_BUNDLES as Record<string, string[]>);
    for (const [b, members] of Object.entries(EXTRA_BUNDLES)) for (const m of members) assert.deepEqual(r.each[m], [b], m);
    assert.deepEqual(r.none, []);
    assert.deepEqual(r.both, ['mermaid', 'math'], 'in the list\'s order');
  });

  await check('default scripts: a preview whose source names a math component gets the page\'s math.js after all.js; any other gets all.js alone', async () => {
    /** the preview frame's df$.shadcn.mathRendererApi, once the rebuilt preview reported ready */
    const mathIn = async (source: string) => {
      await page.$eval('#cx-play', (el, s) => (globalThis as any).df$.shadcn.codeExample.setSource(el, s), source);
      await page.waitForFunction((s) => (document.querySelector('#cx-play .code-example-frame') as HTMLIFrameElement | null)?.srcdoc.includes(s.slice(0, 40)), source);
      await ready(page, 'cx-play');
      const frame = await (await page.$('#cx-play .code-example-frame'))!.contentFrame();
      await frame!.waitForFunction(() => document.readyState === 'complete' && !!(globalThis as any).df$?.shadcn);
      return frame!.evaluate(() => typeof (globalThis as any).df$.shadcn.mathRendererApi);
    };
    assert.equal(await mathIn('<figure class="math-renderer" id="m"><code class="math-renderer-source">x^2</code></figure>'), 'object');
    assert.equal(await mathIn('<button class="btn" id="b">No formula here</button>'), 'undefined');
    await page.$eval('#cx-play', (el) => (globalThis as any).df$.shadcn.codeExample.reset(el));
  });

  await check('devices: data-vp-mode="print" boots an A4 sheet whose preview applies its print rules (print and screen swap in every media query); Full restores the screen', async () => {
    const frame = page.frameLocator('#cx-print .code-example-frame');
    await frame.locator('html[data-ce-print]').waitFor({ state: 'attached', timeout: 10_000 });
    const read = () => frame.locator('html').evaluate(() => [getComputedStyle(document.querySelector('.cx-media')!).color, getComputedStyle(document.querySelector('.cx-screen-only')!).display, document.documentElement.hasAttribute('data-ce-print')]);
    assert.deepEqual(await read(), ['rgb(255, 0, 0)', 'none', true]);
    const card = await page.$eval('#cx-print', (el) => ({ mode: (el as HTMLElement).dataset.vpMode, w: (el.querySelector('.code-example-vp-w') as HTMLInputElement).value, pressed: el.querySelector('.code-example-vp[data-vp="print"]')!.getAttribute('aria-pressed') }));
    assert.deepEqual(card, { mode: 'print', w: '794', pressed: 'true' });
    await page.click('#cx-print .code-example-vp[data-vp="full"]');
    await frame.locator('html:not([data-ce-print])').waitFor({ state: 'attached', timeout: 5000 });
    assert.deepEqual(await read(), ['rgb(0, 0, 255)', 'block', false]);
    // and back: the swap is its own inverse
    await page.click('#cx-print .code-example-vp[data-vp="print"]');
    await frame.locator('html[data-ce-print]').waitFor({ state: 'attached', timeout: 5000 });
    assert.deepEqual(await read(), ['rgb(255, 0, 0)', 'none', true]);
  });

  await check('devices: the Print sheet has no pages - a forced page break shows as a dashed line with room above it; the mark stays out of the source', async () => {
    const frame = page.frameLocator('#cx-print .code-example-frame');
    const mark = () => frame.locator('.cx-page').evaluate((el) => [el.hasAttribute('data-ce-page-break'), getComputedStyle(el).borderTopStyle, parseFloat(getComputedStyle(el).marginTop) >= 16]);
    assert.deepEqual(await mark(), [true, 'dashed', true]);
    await page.click('#cx-print .code-example-vp[data-vp="full"]');
    await frame.locator('html:not([data-ce-print])').waitFor({ state: 'attached', timeout: 5000 });
    assert.deepEqual((await mark())[0], false, 'on screen: no mark');
    await page.click('#cx-print .code-example-vp[data-vp="print"]');
    await frame.locator('html[data-ce-print]').waitFor({ state: 'attached', timeout: 5000 });
    const source = await page.$eval('#cx-print', (el: any) => el.api.getState().config.source as string);
    assert.ok(source.includes('cx-page') && !source.includes('data-ce-page-break'), 'the source holds no mark');
  });

  await check('devices: data-vp-mode boots a phone; Rotate swaps; Full releases', async () => {
    const boot = await page.$eval('#cx-phone', (el) => ({ mode: (el as HTMLElement).dataset.vpMode, w: (el.querySelector('.code-example-vp-w') as HTMLInputElement).value, h: (el.querySelector('.code-example-vp-h') as HTMLInputElement).value, zoom: (el as HTMLElement).dataset.vpZoom }));
    assert.deepEqual({ mode: boot.mode, w: boot.w, h: boot.h }, { mode: 'phone', w: '390', h: '844' });
    assert.ok(Number(boot.zoom) <= 100);
    await page.click('#cx-phone .code-example-vp[data-vp="rotate"]');
    const rot = await page.$eval('#cx-phone', (el) => ({ w: (el.querySelector('.code-example-vp-w') as HTMLInputElement).value, land: (el.querySelector('.code-example-screen') as HTMLElement).dataset.landscape }));
    assert.deepEqual(rot, { w: '844', land: '1' });
    await page.click('#cx-phone .code-example-vp[data-vp="full"]');
    const full = await page.$eval('#cx-phone', (el) => ({ mode: (el as HTMLElement).dataset.vpMode, rotate: (el.querySelector('.code-example-vp[data-vp="rotate"]') as HTMLButtonElement).disabled, pressed: el.querySelector('.code-example-vp[data-vp="full"]')!.getAttribute('aria-pressed') }));
    assert.deepEqual(full, { mode: 'full', rotate: true, pressed: 'true' });
  });

  await check('dark mode follows the page without a rebuild', async () => {
    const before = await page.$eval('#cx-buttons .code-example-frame', (f) => f.getAttribute('srcdoc')!.length);
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.frameLocator('#cx-buttons .code-example-frame').locator('html.dark').waitFor({ state: 'attached', timeout: 5000 });
    assert.equal(await page.$eval('#cx-buttons .code-example-frame', (f) => f.getAttribute('srcdoc')!.length), before, 'same srcdoc');
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
  });

  // VERIFIED (tmp/probe-ce-roloop.ts): Chromium dispatches "ResizeObserver loop completed with undelivered
  // notifications" as a window error - a callback that resizes its box once showed it as the example's error for good
  await check('a ResizeObserver loop: a one-off notice is no error; a loop still running after 5 s is reported', async () => {
    const box = '<div id="ro-box" style="height:20px;background:#ccc"></div>';
    const once = `${box}<script>const b = document.getElementById('ro-box'); let n = 0; new ResizeObserver(() => { if (n++ < 1) b.style.height = '40px'; }).observe(b);</script>`;
    const forever = `${box}<script>const b = document.getElementById('ro-box'); new ResizeObserver(() => { b.style.height = b.style.height === '40px' ? '20px' : '40px'; }).observe(b);</script>`;
    const shown = () => page.$eval('#cx-buttons .code-example-error', (e) => ((e as HTMLElement).hidden ? '' : e.textContent ?? ''));
    // in view - VERIFIED (2026-10-15): with the card scrolled away by earlier checks the frame's observer never fired
    await page.locator('#cx-buttons').scrollIntoViewIfNeeded();
    const run = async (src: string) => {
      await page.$eval('#cx-buttons', (el, s) => (globalThis as any).df$.shadcn.codeExample.setSource(el, s), src);
      await page.frameLocator('#cx-buttons .code-example-frame').locator('#ro-box').waitFor({ state: 'attached', timeout: 10_000 });
    };
    await run(once);
    // the box grew: the callback ran and changed the layout inside the delivery
    await page.frameLocator('#cx-buttons .code-example-frame').locator('#ro-box[style*="40px"]').waitFor({ state: 'attached', timeout: 5000 });
    await page.waitForTimeout(1500);
    assert.equal(await shown(), '', 'a one-off loop notice is not shown');
    await run(forever);
    await page.waitForFunction(
      () => !(document.querySelector('#cx-buttons .code-example-error') as HTMLElement).hidden,
      undefined,
      { timeout: 12_000 },
    );
    assert.match(await shown(), /ResizeObserver loop has not settled for 5 s/);
    await page.$eval('#cx-buttons', (el) => (globalThis as any).df$.shadcn.codeExample.reset(el));
  });

  await check('unknown states throw', async () => {
    const msg = await page.evaluate(() => {
      try {
        (document.querySelector('#cx-buttons') as HTMLElement).api!.setState('nope');
        return '';
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.match(msg, /nope/);
  });

  // LAST (AGENTS.md "State API" → render): the contract reloads the page
  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    const n = await assertRenderContract(page, '.code-example', ['default', 'code', 'state', 'fullscreen'], {
      // the preview, its device box and the paint are the runtime's, as are the mirrored values and the device readouts
      runtimeAttrs: ['data-state-values', 'data-vp-mode', 'data-vp-zoom', 'data-painted'],
      runtimeOwned: '.code-example-stage, .code-example-paint, .code-example-panel[data-panel="state"] > *',
    });
    assert.equal(n, 6, 'every card in the fixture');
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\ncode-example.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('code-example.e2e: all checks passed');
