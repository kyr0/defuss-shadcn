import assert from 'node:assert/strict';
import { chromium, type Locator, type Page } from 'playwright';
import { startServer } from './server.ts';

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
  await page.goto(`${url}/dist/documentation/input.html`, { waitUntil: 'load', timeout: 30000 });
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
    await rpage.goto(`${url}/dist/documentation/resizer.html`, { waitUntil: 'load', timeout: 30000 });
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
    await page.goto(`${url}/dist/documentation/comment-item.html`, { waitUntil: 'load', timeout: 30000 });
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
} finally {
  await browser.close();
  stop();
}

if (failed) {
  console.error(`code-example-docs.e2e: ${failed} check(s) failed`);
  process.exit(1);
}
console.log('code-example-docs.e2e: all checks passed');
