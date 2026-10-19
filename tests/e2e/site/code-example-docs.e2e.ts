import assert from 'node:assert/strict';
import { chromium, type Locator, type Page } from 'playwright';
import { startServer } from '../server.ts';

/**
 * Why: CodeExample's contract is three-way sync - editing the code re-renders
 * the preview AND updates the State panel; a panel edit serializes into the
 * code; real keystrokes inside the sandbox flow to BOTH. Only plain Playwright
 * can drive trusted input into the opaque-origin srcdoc frame (Vitest browser
 * mode has no frame input), so this e2e pins what tests/code-example.test.ts
 * can only cover through the host-side API handle. Serves the real docs page.
 */
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

async function waitFor(cond: () => Promise<boolean>, msg: string, ms = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await cond()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  assert.ok(false, msg);
}

const mirrorOf = (card: Locator, key: string) =>
  card.evaluate(
    (el, k) => JSON.parse((el as HTMLElement).dataset.stateValues ?? '{}')[k] as unknown,
    key,
  );
// hidden panels are still assertable - property reads need no visibility
const editorVal = (card: Locator) =>
  card.evaluate((el) => (el.querySelector('.code-example-src') as HTMLTextAreaElement).value);
const stateVal = (card: Locator, name: string) =>
  card.evaluate(
    (el, n) => (el.querySelector(`[data-state-name="${n}"] .code-example-control`) as HTMLInputElement).value,
    name,
  );
const clickTab = (card: Locator, which: 'code' | 'state') =>
  card.locator(`.code-example-tab[data-tab="${which}"]`).click();

try {
  const page: Page = await browser.newPage();
  await page.goto(`${url}/dist/documentation/forms-inputs/input.html`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2500); // fonts + first sandbox boot
  const card = page.locator('.code-example').first();
  await clickTab(card, 'state');

  await check('A: code edit → rendering + state panel update', async () => {
    await clickTab(card, 'code');
    await card.locator('.code-example-src').fill('<input data-example-root class="input" type="email" value="from-code" />');
    await waitFor(async () => (await mirrorOf(card, 'value')) === 'from-code', 'mirror shows from-code');
    assert.equal(await stateVal(card, 'value'), 'from-code', 'State panel shows the edited value');
  });

  await check('B: panel edit → code update (mutation serialized into source)', async () => {
    await clickTab(card, 'state');
    await card.locator('[data-state-name="type"] .code-example-control').selectOption('search');
    await waitFor(async () => (await editorVal(card)).includes('type="search"'), 'editor shows type="search"');
    assert.equal(await mirrorOf(card, 'type'), 'search', 'rendered DOM re-read as search');
  });

  await check('C: real keystrokes in the preview → state + code update', async () => {
    const sb = card.locator('iframe').contentFrame();
    await sb.locator('input.input').fill(''); // clear first (fill fires input/change too)
    await sb.locator('input.input').click();
    await page.keyboard.type('hello-preview', { delay: 25 });
    await waitFor(async () => (await mirrorOf(card, 'value')) === 'hello-preview', 'mirror shows typed value');
    assert.equal(await stateVal(card, 'value'), 'hello-preview', 'State panel follows the typing');
    await waitFor(async () => (await editorVal(card)).includes('hello-preview'), 'editor reflects the typed value');
  });

  await check('D: un-run editor edit is never clobbered by a state post', async () => {
    await clickTab(card, 'code');
    await card.locator('.code-example-src').fill('<input data-example-root class="input" value="pending-edit" />');
    const held = await editorVal(card);
    await page.waitForTimeout(150); // mid-debounce: a source post must NOT overwrite
    assert.equal(await editorVal(card), held, 'editor keeps the un-run bytes');
  });

  // Cross-document drag safety: a resizer drag started INSIDE the sandbox and
  // released over the host page produces no pointerup in the sandbox document
  // (capture is document-scoped). The host relays the release; the bridge
  // dispatches a synthetic pointercancel; the drag must end and must NOT
  // resume on re-entry (the "stuck resizing until a click" bug).
  {
    const rpage = await browser.newPage();
    await rpage.goto(`${url}/dist/documentation/application/resizer.html`, { waitUntil: 'load', timeout: 30000 });
    await rpage.waitForTimeout(2500);
    const rcard = rpage.locator('.code-example').first(); // "Pixel-perfect"
    const sb = rcard.locator('iframe').contentFrame();
    await waitFor(async () => (await sb.locator('.resizer[data-init]').count()) === 1, 'sandbox resizer booted');
    await rcard.scrollIntoViewIfNeeded();
    await rpage.waitForTimeout(400);

    await check('E: release over the HOST ends the sandbox drag (host→bridge relay)', async () => {
      const handle = sb.locator('.resizer-handle[data-handle="se"]');
      const hb = (await handle.boundingBox())!;
      const sizeOf = () =>
        sb.locator('.resizer > .card').evaluate((el) => Math.round(el.getBoundingClientRect().width));
      const w0 = await sizeOf();
      await rpage.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
      await rpage.mouse.down();
      await rpage.mouse.move(hb.x + hb.width / 2 + 40, hb.y + hb.height / 2 + 40, { steps: 4 });
      assert.ok((await sizeOf()) > w0, 'drag grew the sandbox card');
      assert.ok(
        await sb.locator('.resizer[data-resizing]').count(),
        'drag live while held',
      );
      // release OVER THE HOST (outside the iframe) - the sandbox sees no up:
      const ofr = (await rcard.locator('iframe').boundingBox())!;
      await rpage.mouse.move(ofr.x + ofr.width - 8, ofr.y - 40, { steps: 4 }); // over host chrome
      await rpage.mouse.up();
      await waitFor(
        async () => (await sb.locator('.resizer[data-resizing]').count()) === 0,
        'host-relayed release ended the drag',
        3000,
      );
      // re-enter and move: a STUCK drag would resize here - the box must hold
      const w1 = await sizeOf();
      await rpage.mouse.move(hb.x + hb.width / 2 + 120, hb.y + hb.height / 2 + 120, { steps: 6 });
      await rpage.waitForTimeout(120);
      assert.equal(await sizeOf(), w1, 'no stuck resize after re-entry');
    });
    await rpage.close();
  }

  await check('G: the card is the shipped HTML Preview Editor - its paint layer mirrors the source through every edit (typing, Reset)', async () => {
    // the tab toggles — open it only if an earlier check left it closed
    if (await card.locator('[data-panel="code"]').evaluate((p) => (p as HTMLElement).hidden)) await clickTab(card, 'code');
    const layer = () =>
      card.evaluate((el) => {
        const ed = el.querySelector('.code-example-editor')!;
        const spans = [...ed.querySelectorAll('.code-example-paint span[style]')];
        return {
          painted: ed.hasAttribute('data-painted'),
          // Shiki (esm.sh) colours through the component's own variables; offline the paint stays plain
          prefixed: spans.every((s) => s.getAttribute('style')!.includes('--code-example-')),
          same: ed.querySelector('.code-example-paint')!.textContent!.replace(/\n$/, '') === (el.querySelector('.code-example-src') as HTMLTextAreaElement).value,
        };
      });
    await waitFor(async () => (await layer()).painted, 'paint layer lands');
    const before = await layer();
    assert.ok(before.same && before.prefixed, 'the paint mirrors the source');
    assert.equal(await card.evaluate((el) => (el as HTMLElement & { api?: { getState(): { name: string } } }).api?.getState().name), 'code', 'the card runs the component State API');
    await card.locator('.code-example-src').click();
    await page.keyboard.press('End');
    await page.keyboard.type(' <b>hl</b>');
    await waitFor(async () => (await layer()).same, 'layer follows typing');
    await card.locator('.code-example-reset').click();
    await waitFor(async () => (await layer()).same, 'layer follows Reset (programmatic write)');
  });

  await check('F: first zoom step starts from 100 %, not min=25 (Auto seeds 100)', async () => {
    const z = card.locator('.code-example-vp-z');
    const zval = () => z.evaluate((el) => (el as HTMLInputElement).value);
    assert.equal(await zval(), '', 'zoom starts on Auto');
    await z.focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(await zval(), '95', 'ArrowDown from Auto steps from 100');
    await waitFor(async () => (await card.evaluate((el) => (el as HTMLElement).dataset.vpZoom)) === '95', 'zoom applied');
    // back to Auto; a click-in without a change reverts to Auto on blur
    await z.fill('');
    await z.dispatchEvent('input');
    await z.blur();
    await z.click();
    assert.equal(await zval(), '100', 'click-in seeds 100');
    await page.keyboard.type('60');
    assert.equal(await zval(), '60', 'typing replaces the selected seed');
    await z.fill('');
    await z.dispatchEvent('input');
    await z.blur();
    await z.click();
    await z.blur();
    assert.equal(await zval(), '', 'untouched seed reverts to Auto');
  });

  await check('H: links never leave the example - "#" stays, a fragment jumps in-document (:target), other URLs are cancelled', async () => {
    // srcdoc resolves URLs against the PARENT page: unguarded, href="#" would
    // load comment-item.html#… inside the frame
    await page.goto(`${url}/dist/documentation/website/comment-item.html`, { waitUntil: 'load', timeout: 30000 });
    const thread = page.locator('.code-example').first();
    await thread.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2500);
    const frame = (await (await thread.locator('.code-example-frame').elementHandle())!.contentFrame())!;
    const stillThere = () => frame.evaluate(() => location.href.startsWith('about:srcdoc') && !!document.querySelector('.mk-comment-item'));
    await frame.click('#c-1 .mk-comment-item-author'); // href="#"
    await page.waitForTimeout(300);
    assert.ok(await stillThere(), 'href="#" kept the example document');
    await frame.click('#c-3 .mk-comment-item-time'); // href="#c-3"
    await page.waitForTimeout(300);
    assert.ok(await stillThere(), 'fragment link kept the example document');
    assert.equal(await frame.evaluate(() => document.querySelector(':target')?.id), 'c-3', 'the fragment target is :target');
    await frame.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<a id="ce-away" href="news-item.html">away</a>'));
    await frame.click('#ce-away');
    await page.waitForTimeout(300);
    assert.ok(await stillThere(), 'a page URL is cancelled');
  });

  // Why: a preview resolves against the docs root, where a page id (`paper.html`) names no file - the
  // flagship deck card's links to the report, the architecture and the apps all answered 404
  await check('J: page ids in a card reach their pages (data-links) - the source keeps the ids', async () => {
    const cases = [
      ['presentations/system-in-numbers.html', 'paper.html', 'papers/paper.html', 'a[href$="paper.html"]', 'href'],
      ['data-display/teaser.html', 'deck-system-in-numbers.html', 'presentations/deck-system-in-numbers.html', 'template.teaser-content', 'src'],
    ] as const;
    for (const [rel, id, path, sel, attr] of cases) {
      await page.goto(`${url}/dist/documentation/${rel}`, { waitUntil: 'load', timeout: 30000 });
      const card = page.locator(`.code-example[data-links*='"${id}"']`).first();
      await card.scrollIntoViewIfNeeded();
      const frame = (await (await card.locator('.code-example-frame').elementHandle())!.contentFrame())!;
      await frame.waitForSelector(sel, { state: 'attached', timeout: 20000 });
      // a link's href, or the src of the iframe a teaser's template holds until it plays
      const target = await frame.evaluate(
        ([s, a]) => {
          const el = document.querySelector(s)!;
          const node = el instanceof HTMLTemplateElement ? el.content.querySelector(`[${a}]`)! : el;
          return new URL(node.getAttribute(a)!, document.baseURI).href;
        },
        [sel, attr] as const,
      );
      assert.ok(target.endsWith(`/dist/documentation/${path}`), `${rel}: ${id} resolved to ${target}`);
      assert.equal((await page.request.get(target)).status(), 200, `${rel}: ${target}`);
      assert.ok((await editorVal(card)).includes(`${attr}="${id}"`), `${rel}: the source keeps ${id}`);
    }
  });

  // Why: the SPA router keeps the <head> while the address moves to another folder depth - a relative
  // stylesheet href read again named /documentation/theme/... (404), and every card on the page said
  // "Preview could not be built" until a reload (reported from the docs index -> a section page)
  await check('K: after an in-page navigation from the index into a section, the cards preview and a theme switch loads its sheet', async () => {
    await page.goto(`${url}/dist/documentation/index.html`, { waitUntil: 'load', timeout: 30000 });
    await page.evaluate(() => (document.querySelector('a.nav-link[data-page="questionnaire/questionnaire.html"]') as HTMLElement).click());
    await page.waitForFunction(() => document.documentElement.dataset.page === 'questionnaire/questionnaire.html', null, { timeout: 15000 });
    const card = page.locator('.code-example').first();
    await card.scrollIntoViewIfNeeded();
    const frame = (await (await card.locator('.code-example-frame').elementHandle())!.contentFrame())!;
    await frame.waitForSelector('form.questionnaire[data-init]', { state: 'attached', timeout: 20000 });
    assert.ok(!(await card.textContent())!.includes('Preview could not be built'), 'the first card previews');
    const sheet = await page.evaluate(() => {
      (globalThis as any).df$.shadcn.docs.applyTheme('claude');
      return (document.getElementById('theme-css') as HTMLLinkElement).href;
    });
    assert.ok(sheet.endsWith('/dist/theme/claude.css'), `the theme sheet: ${sheet}`);
    assert.equal((await page.request.get(sheet)).status(), 200);
    await page.evaluate(() => (globalThis as any).df$.shadcn.docs.applyTheme('default'));
  });

  // Why: Mermaid ships in the extra bundle mermaid.* (kept out of all.*); a page loads it only where its own markup
  // has a diagram (lib/plugins.ts extraBundlesPlugin), and the SPA router keeps the <head> - without adopting the
  // new page's bundle tags, an in-page navigation to such a page leaves its diagram as source text
  await check('L: the index loads no mermaid.*; an in-page navigation to the Mermaid page adopts its bundle and binds the page\'s own diagram', async () => {
    await page.goto(`${url}/dist/documentation/index.html`, { waitUntil: 'load', timeout: 30000 });
    assert.equal(await page.evaluate(() => typeof (globalThis as any).df$.shadcn.mermaidApi), 'undefined', 'all.js carries no Mermaid');
    assert.equal(await page.locator('[data-extra-bundle]').count(), 0, 'the index uses no extra bundle in its own markup');
    await page.evaluate(() => (document.querySelector('a.nav-link[data-page="diagrams/mermaid.html"]') as HTMLElement).click());
    await page.waitForFunction(() => document.documentElement.dataset.page === 'diagrams/mermaid.html', null, { timeout: 15000 });
    await page.waitForFunction(() => !!(globalThis as any).df$.shadcn.mermaidApi, null, { timeout: 15000 });
    const adopted = await page.evaluate(() =>
      [...document.querySelectorAll('[data-extra-bundle]')].map((el) => `${el.tagName} ${(el as HTMLLinkElement).href || (el as HTMLScriptElement).src}`),
    );
    assert.deepEqual(adopted.map((a) => a.replace(/^(\w+) .*\/dist\//, '$1 ')), ['LINK components/mermaid.css', 'SCRIPT components/mermaid.js']);
    for (const a of adopted) assert.equal((await page.request.get(a.split(' ')[1])).status(), 200, a);
    await page.waitForSelector('main figure.mermaid-diagram[aria-label="From fence to SVG"][data-init]', { state: 'attached', timeout: 15000 });
  });

  // Why: the cards' viewport fit (code-example) and the resizer's authored-size snapshot each
  // read layout right after writing styles - once PER CARD, every read forced a style recalc of
  // the whole page: ~6 s before load on diagram.html (12 cards), which timed out a unit test.
  // Batched (reads, then writes, over every card) the forced recalcs no longer grow with the
  // card count. The trace names the script that forced each one.
  await check('M: a state set from the State tab goes into the source without the runtime\'s attributes - the source runs again with its component alive (a Dialog)', async () => {
    const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await p.goto(`${url}/dist/documentation/overlays/dialog.html`, { waitUntil: 'load', timeout: 30000 });
    const c = p.locator('.code-example[data-schema]').first();
    await c.scrollIntoViewIfNeeded();
    const alive = async () => {
      const frame = (await (await c.locator('iframe.code-example-frame').elementHandle())!.contentFrame())!;
      await frame.waitForFunction(() => typeof (document.querySelector('dialog.dialog') as any)?.api?.getState === 'function', undefined, { timeout: 15000 });
    };
    await alive();
    await p.evaluate(() => (globalThis as any).df$.shadcn.codeExample.setPreviewState(document.querySelector('.code-example[data-schema]'), 'open', true));
    await waitFor(async () => / open[ =>]/.test(await editorVal(c)), 'the source shows the dialog open');
    assert.doesNotMatch(await editorVal(c), /data-init|data-api|data-state-name/);
    await p.evaluate(() => (globalThis as any).df$.shadcn.codeExample.run(document.querySelector('.code-example[data-schema]')));
    await alive();
    await p.close();
  });

  await check('I: a page of cards loads without per-card forced style recalcs (batched fit)', async () => {
    const tp = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    try {
      // the trace is browser-wide: count the traced page's own frame only. VERIFIED: (tmp/probe-recalc2.ts) with
      // check L's page still rendering mermaid.html, 39 recalcs were counted browser-wide and 7 in diagram.html
      const frameId = ((await (await tp.context().newCDPSession(tp)).send('Page.getFrameTree')) as { frameTree: { frame: { id: string } } }).frameTree.frame.id;
      await browser.startTracing(tp, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline.stack'] });
      await tp.goto(`${url}/dist/documentation/diagrams/diagram.html`, { waitUntil: 'load', timeout: 30000 });
      const trace = JSON.parse((await browser.stopTracing()).toString()) as { traceEvents: { name: string; args?: { beginData?: { frame?: string; stackTrace?: { url: string; functionName: string }[] } } }[] };
      const cards = await tp.evaluate(() => document.querySelectorAll('.code-example').length);
      const forced = trace.traceEvents
        .filter((e) => e.name === 'UpdateLayoutTree' && e.args?.beginData?.frame === frameId)
        .map((e) => e.args?.beginData?.stackTrace?.[0])
        .filter((top) => top && /\/components\/(all|wysiwyg)\.js/.test(top.url));
      assert.ok(cards >= 10, `diagram.html should hold many cards, found ${cards}`);
      assert.ok(
        forced.length < cards,
        `${forced.length} forced style recalcs from the component bundles for ${cards} cards: ${[...new Set(forced.map((f) => f!.functionName))].join(', ')}`,
      );
    } finally {
      await tp.close();
    }
  });
} finally {
  await browser.close();
  stop();
}

if (failed) {
  console.error(`code-example-docs.e2e: ${failed} check(s) failed`);
  process.exit(1);
}
console.log('code-example-docs.e2e: all checks passed');
