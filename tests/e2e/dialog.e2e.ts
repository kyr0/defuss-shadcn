import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';
import { observedState } from './lib/observed-state.ts';

/**
 * Why: E2E smoke test for the shipped dialog component. Loads the fixture
 * (trigger + modal dialog, mirroring the doc page) over HTTP in a real
 * browser, then verifies component CSS was applied, the trigger/close wiring
 * works, and the named State API drives the dialog - the same files consumers
 * copy from dist/, unmodified.
 */

const FIXTURE = '/tests/e2e/dialog.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const isOpen = (page: Page) => page.$eval('#demo-dialog', (el) => (el as HTMLDialogElement).open);
const setState = (page: Page, state: string) =>
  page.$eval('#demo-dialog', (el, s) => (el as HTMLElement).api!.setState(s), state);

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
  await page.goto(`${server.url}${FIXTURE}`);

  await check('dialog.js initialized trigger + dialog (data-init)', async () => {
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-dialog-trigger]:not([data-init])').length === 0 &&
        document.querySelectorAll('dialog:not([data-init])').length === 0,
    );
  });

  await check('dialog.css applied (modal centering + footer layout)', async () => {
    const style = await page.$eval('#demo-dialog', (el) => {
      const cs = getComputedStyle(el);
      return { position: cs.position, margin: cs.marginBlockStart };
    });
    assert.equal(style.position, 'fixed');
    assert.notEqual(style.margin, '0px', 'expected margin: auto centering');
  });

  await check('trigger button opens the dialog modally', async () => {
    await page.click('[data-dialog-trigger="demo-dialog"]');
    assert.equal(await isOpen(page), true, 'dialog should be open after trigger click');
    // 0.9.7 regression: a dialog opened without setState kept reporting 'default'
    assert.equal(await observedState(page, '#demo-dialog'), 'open', 'a trigger-opened dialog reports open');
  });

  await check('data-dialog-close button closes it', async () => {
    await page.click('[data-dialog-close]');
    assert.equal(await isOpen(page), false, 'dialog should close via close button');
    assert.equal(await observedState(page, '#demo-dialog'), 'default', 'a closed dialog reports default');
  });

  await check('a native commandfor button opens it; getState() follows', async () => {
    // the platform's declarative opener (no component JS involved in opening)
    await page.evaluate(() => {
      const b = document.createElement('button');
      b.id = 'native-opener'; b.setAttribute('commandfor', 'demo-dialog'); b.setAttribute('command', 'show-modal'); b.textContent = 'Open';
      document.body.prepend(b);
    });
    await page.click('#native-opener');
    assert.equal(await isOpen(page), true, 'commandfor opens the dialog');
    assert.equal(await observedState(page, '#demo-dialog'), 'open', 'a commandfor-opened dialog reports open');
    await page.keyboard.press('Escape');
    assert.equal(await observedState(page, '#demo-dialog'), 'default', 'Escape: back to default');
    await page.evaluate(() => document.querySelector('#native-opener')?.remove());
  });

  await check('backdrop click closes the dialog', async () => {
    await page.click('[data-dialog-trigger="demo-dialog"]');
    // dialog is centered; a click at the very corner lands on ::backdrop
    await page.mouse.click(2, 2);
    assert.equal(await isOpen(page), false, 'dialog should close on backdrop click');
    assert.equal(await observedState(page, '#demo-dialog'), 'default', 'a backdrop click: getState() reports default');
  });

  await check('a dialog authored with open reports open', async () => {
    await page.evaluate(() => {
      const d = document.createElement('dialog');
      d.id = 'authored-open'; d.className = 'dialog'; d.setAttribute('open', ''); d.textContent = 'shown';
      document.body.append(d);
    });
    await page.waitForFunction(() => document.querySelector('#authored-open')?.hasAttribute('data-init'));
    assert.equal(await observedState(page, '#authored-open'), 'open', 'authored open markup is the open state');
    await page.evaluate(() => document.querySelector('#authored-open')?.remove());
  });

  // -- State API (AGENTS.md "State API") -------------------------------------
  await check('state API: default state reported for bound dialog', async () => {
    const state = await page.$eval('#demo-dialog', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'default');
    assert.equal(await isOpen(page), false, "'default' means closed");
  });

  await check("state API: setState('open') shows the dialog", async () => {
    await setState(page, 'open');
    assert.equal(await isOpen(page), true, 'open state must show the modal');
    const state = await page.$eval('#demo-dialog', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'open');
  });

  await check("state API: setState('default') closes it again", async () => {
    await setState(page, 'default');
    assert.equal(await isOpen(page), false, 'back to default state = closed');
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#demo-dialog') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.dialogApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.dialogStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#demo-dialog'),
    }));
    assert.ok(reg.hasApi, 'df$.dialogApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'open']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });

  await check('Escape closes (native dialog behavior preserved)', async () => {
    await setState(page, 'open');
    await page.keyboard.press('Escape');
    assert.equal(await isOpen(page), false, 'native Escape-to-close must still work');
  });

  // -- Scroll lock (documented in skill Notes: page behind stays put) --------
  await check('page behind the modal stays put; position restored on close', async () => {
    await page.evaluate(() => window.scrollTo(0, 400));
    const before = await page.evaluate(() => document.scrollingElement!.scrollTop);
    assert.ok(before > 0, 'fixture page is scrollable');
    await setState(page, 'open');
    // wheel over the backdrop corner and over the dialog box - neither may
    // move the page behind (the bug this guards: page scrolled ~600px here)
    await page.mouse.move(2, 2);
    await page.mouse.wheel(0, 500);
    await page.mouse.move(640, 360);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(100);
    const during = await page.evaluate(() => document.scrollingElement!.scrollTop);
    assert.equal(during, before, 'page must not scroll while the dialog is modal');
    await setState(page, 'default');
    const after = await page.evaluate(() => document.scrollingElement!.scrollTop);
    assert.equal(after, before, 'scroll position preserved after close');
    await page.mouse.move(640, 360);
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(100);
    const scrolled = await page.evaluate(() => document.scrollingElement!.scrollTop);
    assert.ok(scrolled > before, 'page is scrollable again after close');
  });

  // -- Sizes (documented in dialog.html + skill: sm/lg/xl/full) --------------
  // max-width from dialog.css; width is calc(100vw - 2rem) so the cap binds.
  const sizeExpect: Record<string, number> = { 'size-sm': 24, 'size-md': 28, 'size-lg': 32, 'size-xl': 40, 'size-full': 0 }; // rem; 0 = no cap below viewport
  await check('data-size variants apply documented max-widths', async () => {
    for (const [id, rem] of Object.entries(sizeExpect)) {
      const px = await page.$eval(`#${id}`, (el) => parseFloat(getComputedStyle(el).maxWidth));
      if (rem === 0) {
        // full = calc(100vw - 2rem); assert it exceeds every capped size
        assert.ok(px >= 32 * 16, `#full max-width ${px} should be viewport-wide`);
      } else {
        assert.equal(Math.round(px), rem * 16, `#${id} max-width expected ${rem}rem`);
      }
    }
  });

  // -- Density (skill: 0.75 / 1 / 1.25 of the 1.5rem content padding) --------
  await check('data-density scales .dialog-content padding to 16/24/32px', async () => {
    const pads = await page.evaluate(() =>
      ['den-compact', 'den-comfortable', 'den-spacious'].map((id) => {
        const d = document.getElementById(id) as HTMLDialogElement;
        d.showModal();
        const p = getComputedStyle(d.querySelector('.dialog-content')!).padding;
        d.close();
        return p;
      }),
    );
    assert.deepEqual(pads, ['16px', '24px', '32px'], `density paddings, got ${pads.join(' / ')}`);
  });
  // LAST (AGENTS.md "State API" → render): the contract reloads the page
  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await assertRenderContract(page, 'dialog.dialog[id]', ['default','open']);
  });

} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\ndialog.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('dialog.e2e: all checks passed');
