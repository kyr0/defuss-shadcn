import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: E2E test for the shipped teaser. Loads the fixture (every documented
 * configuration: plain, in an aura with a ratio, with a poster, content without
 * a control, a link inside) over HTTP in a real browser, then verifies that the
 * template's content does not exist until the teaser plays, that a click on the
 * card or its play button (or Enter) morphs it into place, where focus goes,
 * that another control inside does not play it, the aura stopping, the State
 * API both ways and the render() contract - the same files consumers copy.
 */
const FIXTURE = '/tests/e2e/teaser.e2e-fixture.html';
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
const exists = (page: Page, sel: string) => page.evaluate((s) => !!document.querySelector(s), sel);
const played = (page: Page, id: string) => page.$eval(`#${id}`, (el) => el.hasAttribute('data-played'));

try {
  const page = await browser.newPage();
  await page.goto(`${server.url}${FIXTURE}`);

  await check('teaser.js initialized every teaser (data-init)', async () => {
    await page.waitForFunction(() => document.querySelectorAll('.teaser').length === 5 && document.querySelectorAll('.teaser:not([data-init])').length === 0);
  });

  await check('before it plays, the content does not exist - it waits inert in the template', async () => {
    assert.equal(await exists(page, '#c-basic'), false);
    assert.equal(await page.$eval('#t-basic template.teaser-content', (t) => !!(t as HTMLTemplateElement).content.querySelector('#c-basic')), true);
    const cs = await page.$eval('#t-basic', (el) => { const s = getComputedStyle(el); return [s.display, s.cursor, s.textAlign]; });
    assert.deepEqual(cs, ['grid', 'pointer', 'center']);
  });

  await check('a click on the card plays it: the content morphs in, the teaser\'s own parts go, focus moves to the content', async () => {
    await page.click('#t-basic-text');
    assert.equal(await played(page, 't-basic'), true);
    assert.equal(await exists(page, '#t-basic #c-basic'), true);
    assert.equal(await exists(page, '#t-basic .play-button, #t-basic template'), false);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'c-basic-btn', 'the content\'s first control has focus');
    const cs = await page.$eval('#t-basic', (el) => { const s = getComputedStyle(el); return [s.display, s.paddingTop, s.borderTopWidth, s.cursor]; });
    assert.deepEqual(cs, ['block', '0px', '0px', 'auto'], 'played: the content takes the whole card');
    // Why: a teaser named by aria-labelledby lost its name here - the title it pointed at is gone
    assert.equal(await page.$eval('#t-basic', (el) => el.getAttribute('aria-label')), 'The quarterly report', 'the region keeps its name');
  });

  await check('in an aura: the ratio holds the shape, the light turns - and goes once played, the frame keeping its size', async () => {
    const before = await page.evaluate(() => {
      const t = document.getElementById('t-aura')!.getBoundingClientRect();
      return { ratio: Math.round((t.width / t.height) * 100) / 100, anim: getComputedStyle(document.getElementById('t-aura-frame')!).animationName };
    });
    assert.deepEqual(before, { ratio: 1.78, anim: 'shape-aura-spin' });
    await page.click('#t-aura .play-button');
    assert.equal(await played(page, 't-aura'), true);
    const after = await page.$eval('#t-aura-frame', (a) => [getComputedStyle(a).animationName, getComputedStyle(a).paddingTop]);
    assert.deepEqual(after, ['none', '3px']);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'c-aura-link');
  });

  await check('a poster sits behind the text under a scrim; the text turns white', async () => {
    const r = await page.evaluate(() => {
      const t = document.getElementById('t-poster')!;
      return { scrim: getComputedStyle(t, '::after').content, color: getComputedStyle(document.getElementById('t-poster-title')!).color, media: getComputedStyle(t.querySelector('.teaser-media')!).position };
    });
    assert.deepEqual(r, { scrim: '""', color: 'oklch(1 0 0)', media: 'absolute' });
  });

  await check('the keyboard plays it: Enter on the play button; with no control in the content the teaser takes focus', async () => {
    await page.focus('#t-plain .play-button');
    await page.keyboard.press('Enter');
    assert.equal(await played(page, 't-plain'), true);
    const f = await page.evaluate(() => [document.activeElement?.id, document.getElementById('t-plain')!.getAttribute('tabindex')]);
    assert.deepEqual(f, ['t-plain', '-1']);
  });

  await check('another control inside does not play it (a link keeps its own job)', async () => {
    await page.click('#t-link-a');
    assert.equal(await played(page, 't-link'), false);
    assert.equal(await exists(page, '#c-link'), false);
  });

  // -- State API (AGENTS.md "State API") -------------------------------------
  await check("state API: setState('default') brings the teaser back, setState('played') plays it again", async () => {
    await page.$eval('#t-basic', (el) => (el as HTMLElement).api!.setState('default'));
    assert.equal(await played(page, 't-basic'), false);
    assert.equal(await exists(page, '#t-basic .play-button'), true);
    assert.equal(await exists(page, '#t-basic template.teaser-content'), true, 'the template is back too');
    assert.equal(await exists(page, '#c-basic'), false);
    await page.$eval('#t-basic', (el) => (el as HTMLElement).api!.setState('played'));
    assert.equal(await exists(page, '#t-basic #c-basic'), true);
    const state = await page.$eval('#t-basic', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'played');
  });

  await check('state API: re-entering the current state changes nothing', async () => {
    const before = await page.$eval('#t-basic', (el) => el.outerHTML);
    await page.$eval('#t-basic', (el) => (el as HTMLElement).api!.setState('played'));
    assert.equal(await page.$eval('#t-basic', (el) => el.outerHTML), before);
  });

  await check('state API: getState follows a click (no setState involved)', async () => {
    assert.equal((await page.$eval('#t-link', (el) => (el as HTMLElement).api!.getState())).name, 'default');
    await page.click('#t-link .play-button');
    assert.equal((await page.$eval('#t-link', (el) => (el as HTMLElement).api!.getState())).name, 'played');
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try { (document.querySelector('#t-basic') as HTMLElement).api!.setState('nope'); return null; } catch (e) { return (e as Error).message; }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.teaserApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.teaserStates,
    }));
    assert.ok(reg.hasApi, 'df$.shadcn.teaserApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'played']);
  });

  // LAST (AGENTS.md "State API" → render): the contract reloads the page
  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    const n = await assertRenderContract(page, '.teaser[id]', ['default', 'played']);
    assert.equal(n, 5, 'every teaser in the fixture');
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`teaser.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('teaser.e2e: all checks passed');
