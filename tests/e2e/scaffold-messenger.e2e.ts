import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from './server.ts';

/**
 * Why: the messenger scaffold is a clickdummy - its promise is that the
 * clicks work. This drives the generated full-screen page
 * (dist/documentation/app-messenger.html, built from the scaffold page's own
 * example fence) through opening chats, the filters, sending (ticks, typing,
 * reply), emoji, contact info, a call, the tabs and the phone layout.
 */
const PAGE = '/dist/documentation/app-messenger.html';
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
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(`${server.url}${PAGE}`);
  await page.waitForFunction(() => !!(globalThis as any).df$?.shadcn?.session, undefined, { timeout: 10_000 });
  const shownThreads = () => page.evaluate(() => [...document.querySelectorAll('.wa-thread')].filter((t) => getComputedStyle(t).display !== 'none').map((t) => t.id));
  const visibleRows = () => page.evaluate(() => [...document.querySelectorAll('.wa-chats .wa-chat')].filter((a) => a.checkVisibility()).map((a) => (a as HTMLElement).dataset.chat));
  // visible on screen (a hidden ancestor counts), not just the element's own display
  const shown = (sel: string) => page.$eval(sel, (e) => e.checkVisibility());

  await check('opens on the default chat; list, rail and conversation side by side', async () => {
    assert.deepEqual(await shownThreads(), ['c-anna']);
    assert.equal(await page.getAttribute('.wa-chat[data-chat="anna"]', 'aria-current'), 'true');
    assert.deepEqual([await shown('.wa-rail'), await shown('.wa-side'), await shown('.wa-main')], [true, true, true]);
  });

  await check('the chat list resizes by its edge (a divider Resizer): drag, arrow keys, double-click resets', async () => {
    const side = () => page.$eval('.wa-side', (e) => Math.round(e.getBoundingClientRect().width));
    const w0 = await side();
    assert.equal(w0, 384);
    const h = page.locator('.wa-split > .resizer-handle[data-handle="e"]');
    const b = (await h.boundingBox())!;
    assert.ok(b.height > 600, 'the strip runs the full height');
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 80, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
    assert.ok(Math.abs((await side()) - (w0 + 80)) <= 2, String(await side()));
    const main = await page.$eval('.wa-main', (e) => Math.round(e.getBoundingClientRect().left));
    assert.ok(Math.abs(main - (64 + w0 + 80)) <= 2, 'the conversation starts where the list ends');
    await h.focus();
    await page.keyboard.press('ArrowLeft');
    assert.ok(Math.abs((await side()) - (w0 + 70)) <= 2);
    await h.dblclick();
    assert.equal(await side(), w0);
  });

  await check('a chat row opens its conversation through the URL and clears its unread badge', async () => {
    assert.equal(await page.$$eval('.wa-chat[data-chat="marco"] .wa-unread', (b) => b.length), 1);
    await page.click('.wa-chat[data-chat="marco"]');
    await page.waitForTimeout(150);
    assert.deepEqual(await shownThreads(), ['c-marco']);
    assert.equal(new URL(page.url()).hash, '#c-marco');
    assert.equal(await page.$$eval('.wa-chat[data-chat="marco"] .wa-unread', (b) => b.length), 0);
    assert.equal(await shown('.wa-side'), true, 'the list stays beside the conversation');
  });

  await check('the filter chips filter the list (CSS :has)', async () => {
    await page.click('.wa-filters label:has(input[value="group"])');
    assert.deepEqual(await visibleRows(), ['team']);
    await page.click('.wa-filters label:has(input[value="fav"])');
    assert.deepEqual((await visibleRows()).sort(), ['anna', 'mom']);
    await page.click('.wa-filters label:has(input[value="all"])');
    assert.equal((await visibleRows()).length, 6);
  });

  await check('the search filters the rows', async () => {
    await page.fill('#wa-q', 'priya');
    assert.deepEqual(await visibleRows(), ['priya']);
    await page.fill('#wa-q', '');
  });

  await check('the composer swaps mic for send while there is text', async () => {
    const f = '#c-marco .wa-composer';
    assert.deepEqual([await shown(`${f} .wa-mic`), await shown(`${f} .wa-send`)], [true, false]);
    await page.fill(`${f} .textarea`, 'Hi');
    assert.deepEqual([await shown(`${f} .wa-mic`), await shown(`${f} .wa-send`)], [false, true]);
  });

  await check('Enter sends: the bubble appears, ticks go sent → read, typing…, a reply; the list preview follows', async () => {
    const f = '#c-marco .wa-composer';
    await page.fill(`${f} .textarea`, 'Lunch at 1?');
    await page.press(`${f} .textarea`, 'Enter');
    const last = () => page.$eval('#c-marco .session-content', (c) => c.lastElementChild!.textContent!.trim());
    assert.ok((await last()).startsWith('Lunch at 1?'), await last());
    assert.equal(await page.inputValue(`${f} .textarea`), '');
    const ticks = '#c-marco .session-content .session-item:last-child .wa-ticks';
    assert.equal(await page.getAttribute(ticks, 'data-status'), 'sent');
    await page.waitForTimeout(1600);
    assert.equal(await page.getAttribute(ticks.replace(':last-child', ':nth-last-child(1)'), 'data-status'), 'read');
    await page.waitForTimeout(800);
    assert.equal(await page.textContent('#c-marco [data-wa-status]'), 'typing…');
    assert.equal(await page.$$eval('#c-marco .bubble-typing', (t) => t.length), 1);
    await page.waitForTimeout(2000);
    assert.equal(await page.$$eval('#c-marco .bubble-typing', (t) => t.length), 0);
    const reply = await page.$eval('#c-marco .session-content .session-item:last-child .bubble', (b) => [b.getAttribute('data-variant'), b.textContent!.trim()]);
    assert.equal(reply[0], 'secondary');
    assert.ok(['Agreed!', 'Let\'s celebrate 🍝', 'On it.'].some((r) => reply[1]!.startsWith(r)), reply[1]!);
    assert.equal(await page.textContent('#c-marco [data-wa-status]'), 'online');
    assert.equal(await page.$eval('.wa-chats li:first-child .wa-chat', (a) => (a as HTMLElement).dataset.chat), 'marco', 'the chat moves to the top');
  });

  await check('the emoji panel inserts into the composer', async () => {
    await page.click('#c-marco [popovertarget="wa-emoji"]');
    assert.equal(await page.$eval('#wa-emoji', (p) => p.matches(':popover-open')), true);
    await page.click('#wa-emoji [data-emoji="🔥"]');
    assert.equal(await page.inputValue('#c-marco .wa-composer .textarea'), '🔥');
    await page.keyboard.press('Escape');
    await page.fill('#c-marco .wa-composer .textarea', '');
  });

  await check('the voice note plays: the wave fills', async () => {
    await page.click('.wa-chat[data-chat="anna"]');
    await page.click('#c-anna .wa-voice-play');
    await page.waitForTimeout(700);
    const name = await page.$eval('#c-anna .wa-voice-wave i', (i) => getComputedStyle(i).animationName);
    assert.equal(name, 'wa-play');
  });

  await check('contact info opens as a column with the open chat\'s details; a group shows its initials', async () => {
    await page.click('.wa-chat[data-chat="team"]');
    await page.click('#c-team .wa-thread-actions label[for="wa-info-toggle"]');
    assert.equal(await shown('.wa-info'), true);
    assert.equal(await page.textContent('[data-wa-info-name]'), 'Design Team');
    assert.equal(await page.$eval('[data-wa-info-avatar] .avatar-fallback', (e) => [getComputedStyle(e).display !== 'none', e.textContent].join()), 'true,DT');
    await page.click('.wa-info label[for="wa-info-toggle"]');
    assert.equal(await shown('.wa-info'), false);
  });

  await check('a call rings, connects and counts; ending it shows a toast', async () => {
    await page.click('.wa-chat[data-chat="anna"]');
    await page.click('#c-anna [data-call="voice"]');
    assert.equal(await page.$eval('#wa-call', (d) => (d as HTMLDialogElement).open), true);
    assert.equal(await page.textContent('[data-wa-call-name]'), 'Anna Silva');
    await page.waitForTimeout(3600);
    assert.equal(await page.getAttribute('#wa-call', 'data-connected'), '');
    assert.match((await page.textContent('[data-wa-call-status]'))!, /^0:0[1-2]$/);
    await page.click('[data-wa-end]');
    assert.equal(await page.$eval('#wa-call', (d) => (d as HTMLDialogElement).open), false);
    assert.ok((await page.textContent('.toast-container .toast'))!.includes('Call ended'));
  });

  await check('the rail switches panels; the settings switch toggles dark mode', async () => {
    await page.click('.wa-tab:has(input[value="calls"])');
    assert.deepEqual([await shown('[data-panel="calls"]'), await shown('[data-panel="chats"]')], [true, false]);
    await page.click('.wa-tab:has(input[value="settings"])');
    const before = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    await page.click('label[for="wa-dark"]');
    assert.notEqual(await page.evaluate(() => document.documentElement.classList.contains('dark')), before);
    await page.click('.wa-tab:has(input[value="chats"])');
  });

  await check('phone width: the list OR the chat, a back link, the rail as a bottom tab bar', async () => {
    await page.setViewportSize({ width: 420, height: 860 });
    await page.goto(`${server.url}${PAGE}#chats`);
    await page.waitForTimeout(300);
    assert.deepEqual([await shown('.wa-side'), await shown('.wa-main')], [true, false]);
    assert.equal(await shown('.wa-split > .resizer-handle'), false, 'no divider on a phone');
    assert.equal(await page.$eval('.wa-side', (e) => Math.round(e.getBoundingClientRect().width)), 420);
    const bar = await page.$eval('.wa-rail', (r) => [getComputedStyle(r).flexDirection, Math.round(r.getBoundingClientRect().bottom)]);
    assert.deepEqual(bar, ['row', 860]);
    await page.click('.wa-chat[data-chat="hannah"]');
    await page.waitForTimeout(150);
    assert.deepEqual([await shown('.wa-side'), await shown('.wa-main'), await shown('.wa-rail')], [false, true, false]);
    await page.click('#c-hannah .wa-back');
    await page.waitForTimeout(150);
    assert.deepEqual([await shown('.wa-side'), await shown('.wa-main')], [true, false]);
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`scaffold-messenger.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('scaffold-messenger.e2e: all checks passed');
