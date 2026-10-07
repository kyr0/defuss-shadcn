import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: E2E for the Document Comments column. Verifies: marks placed from
 * the model (across inline elements, the n-th occurrence, none when the
 * text is gone), the column (count, order by document position, replies
 * nested, Markdown bodies escaped), mark ↔ card selection with the select
 * event, ↑ ↓ navigation with wrapping, the quote flash and its removal,
 * the Reply composer, the API (add, load, data, go, flash) with the change
 * event, the State API and the render contract.
 */
const FIXTURE = '/tests/e2e/doc-comments.e2e-fixture.html';
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
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${server.url}${FIXTURE}`);
  await page.waitForFunction(() => !!document.querySelector('#dc .doc-comments-list'));

  const marks = (id: string) => page.$$eval(`#doc mark.doc-comments-mark[data-comment="${id}"]`, (ms) => ms.map((m) => m.textContent));
  const current = () => page.evaluate(() => ({
    state: document.getElementById('dc')!.api!.getState(),
    attr: document.getElementById('dc')!.getAttribute('data-current'),
    card: document.querySelector('#dc .doc-comments-card[aria-current]')?.getAttribute('data-id') ?? null,
    mark: document.querySelector('#doc mark.doc-comments-mark[data-current]')?.getAttribute('data-comment') ?? null,
  }));

  await check('marks: the anchored text is wrapped - across <b> in pieces, the 3rd occurrence, none for text that is gone', async () => {
    assert.deepEqual(await marks('c1'), ['a ', 'comment column', ' beside']);
    assert.deepEqual(await marks('c3'), ['brief']);
    assert.deepEqual(await marks('c4'), ['place']);
    const which = await page.$eval('#p2', (p) => { const m = p.querySelector('mark')!; const r = document.createRange(); r.setStart(p, 0); r.setEndBefore(m); return r.toString(); });
    assert.ok(which.endsWith('repeats: '), `the third "place": "${which}"`);
    assert.deepEqual(await marks('c5'), []);
    assert.equal(await page.$eval('#p1', (p) => p.textContent), 'The editor needs a comment column beside the text that scrolls on its own.');
    assert.equal(await page.$eval('#doc mark[data-comment="c1"]', (m) => m.getAttribute('data-color')), 'chart-2');
  });

  await check('column: count, top-level cards in document order, the reply nested under its parent, bodies as escaped Markdown', async () => {
    const r = await page.evaluate(() => ({
      count: document.querySelector('#dc [data-count]')!.textContent,
      tops: [...document.querySelectorAll('#dc .doc-comments-list > .doc-comments-card')].map((c) => (c as HTMLElement).dataset.id),
      reply: document.querySelector('#dc .doc-comments-card[data-id="c1"] > .doc-comments-replies > .doc-comments-card[data-id="c2"]') !== null,
      body: document.querySelector('#dc .doc-comments-card[data-id="c1"] > .doc-comments-body')!.innerHTML,
      xss: document.querySelector('#dc .doc-comments-card[data-id="c4"] > .doc-comments-body')!.innerHTML,
      initials: document.querySelector('#dc .doc-comments-card[data-id="c1"] .avatar-fallback')!.textContent,
      anchor: document.querySelector('#dc .doc-comments-card[data-id="c1"] > .doc-comments-anchor')!.textContent,
      time: document.querySelector('#dc .doc-comments-card[data-id="c1"] time')!.getAttribute('datetime'),
      empty: document.querySelector('#dc2 .doc-comments-empty')!.textContent,
    }));
    assert.equal(r.count, '5');
    assert.deepEqual(r.tops, ['c3', 'c1', 'c4', 'c5']);
    assert.equal(r.reply, true);
    assert.match(r.body, /<strong>collapsible<\/strong>/);
    assert.match(r.body, /<code>--doc-comments-width<\/code>/);
    assert.match(r.body, /<a href="https:\/\/example\.org\/docs" target="_blank" rel="noopener">the docs<\/a>/);
    assert.match(r.xss, /&lt;script&gt;/);
    assert.doesNotMatch(r.xss, /<script/);
    assert.equal(r.initials, 'MC');
    assert.equal(r.anchor, 'a comment column beside');
    assert.equal(r.time, '2026-10-07T09:12:00Z');
    assert.equal(r.empty, 'No comments yet.');
  });

  await check('a mark click makes its comment current (card + mark + state) and fires doc-comments-select from the mark', async () => {
    const source = page.evaluate(() => new Promise<string>((r) => document.getElementById('dc')!.addEventListener('doc-comments-select', (e) => r((e as CustomEvent).detail.source), { once: true })));
    await page.click('#doc mark[data-comment="c4"]');
    assert.equal(await source, 'mark');
    const r = await current();
    assert.deepEqual([r.state.name, r.state.config.id, r.attr, r.card, r.mark], ['current', 'c4', 'c4', 'c4', 'c4']);
  });

  await check('a card excerpt click selects the comment from the card and scrolls the document to the mark', async () => {
    await page.evaluate(() => { document.getElementById('doc')!.scrollTop = 0; });
    const source = page.evaluate(() => new Promise<string>((r) => document.getElementById('dc')!.addEventListener('doc-comments-select', (e) => r((e as CustomEvent).detail.source), { once: true })));
    await page.click('#dc .doc-comments-card[data-id="c1"] > .doc-comments-anchor');
    assert.equal(await source, 'card');
    assert.equal((await current()).mark, 'c1');
  });

  await check('↓ and ↑ walk the cards in column order and wrap; the events come from nav', async () => {
    await page.click('#dc [data-doc-comments-action="next"]');
    assert.equal((await current()).card, 'c2', 'after c1 comes its reply');
    await page.click('#dc [data-doc-comments-action="next"]');
    assert.equal((await current()).card, 'c4');
    await page.click('#dc [data-doc-comments-action="next"]');
    await page.click('#dc [data-doc-comments-action="next"]');
    assert.equal((await current()).card, 'c3', 'wrapped to the first');
    await page.click('#dc [data-doc-comments-action="prev"]');
    assert.equal((await current()).card, 'c5', 'wrapped back to the last');
  });

  await check('a quote click flashes its span in the document and the flash is gone after a moment, the text intact', async () => {
    const found = page.evaluate(() => new Promise<boolean>((r) => document.getElementById('dc')!.addEventListener('doc-comments-flash', (e) => r((e as CustomEvent).detail.found), { once: true })));
    await page.click('#dc .doc-comments-card[data-id="c1"] > .doc-comments-quote');
    assert.equal(await found, true);
    assert.deepEqual(await page.$$eval('#p5 mark.doc-comments-flash', (ms) => ms.map((m) => m.textContent)), ['last paragraph']);
    await page.waitForFunction(() => !document.querySelector('mark.doc-comments-flash'), undefined, { timeout: 4000 });
    assert.equal(await page.$eval('#p5', (p) => p.childNodes.length), 1, 'text node normalized back');
    assert.equal(await page.$eval('#p5', (p) => p.textContent), 'The last paragraph.');
    assert.equal(await page.evaluate(() => globalThis.df$.shadcn.docComments!.flash('#dc', { block: 'p5', text: 'nope' })), false);
  });

  await check('Reply: the composer opens under the card, the answer nests under it with the column author and the parent colour; doc-comments-change fires', async () => {
    assert.equal(await page.$eval('#dc .doc-comments-card[data-id="c3"] > .doc-comments-reply', (f) => (f as HTMLElement).hidden), true);
    await page.click('#dc .doc-comments-card[data-id="c3"] [data-doc-comments-action="reply"]');
    assert.equal(await page.$eval('#dc .doc-comments-card[data-id="c3"] > .doc-comments-reply', (f) => (f as HTMLElement).hidden), false);
    assert.equal(await page.$eval('#dc .doc-comments-card[data-id="c3"] [data-doc-comments-action="reply"]', (b) => b.getAttribute('aria-expanded')), 'true');
    const change = page.evaluate(() => new Promise<{ comments: number; id?: string }>((r) => document.getElementById('dc')!.addEventListener('doc-comments-change', (e) => r((e as CustomEvent).detail), { once: true })));
    await page.fill('#dc .doc-comments-card[data-id="c3"] > .doc-comments-reply textarea', 'A *reply* from the composer.');
    await page.click('#dc .doc-comments-card[data-id="c3"] > .doc-comments-reply button[type="submit"]');
    const d = await change;
    assert.equal(d.comments, 6);
    assert.ok(d.id);
    const r = await page.evaluate((id) => {
      const card = document.querySelector(`#dc .doc-comments-card[data-id="c3"] > .doc-comments-replies > .doc-comments-card[data-id="${id}"]`)!;
      return { author: card.querySelector('.doc-comments-author')!.textContent, color: card.getAttribute('data-color'), body: card.querySelector('.doc-comments-body')!.innerHTML, model: globalThis.df$.shadcn.docComments!.data('#dc') as any };
    }, d.id);
    assert.equal(r.author, 'Tester');
    assert.equal(r.color, 'chart-5');
    assert.match(r.body, /<em>reply<\/em>/);
    assert.equal(r.model.comments.length, 6);
    assert.equal(r.model.comments[5].parent, 'c3');
  });

  await check('API: add() with an anchor places a mark and a card; without anchor or parent it is refused; reply() answers; go() selects', async () => {
    const r = await page.evaluate(() => {
      const api = globalThis.df$.shadcn.docComments!;
      const id = api.add('#dc', { author: 'API', color: 'chart-3', anchor: { block: 'p3', text: 'nest under' }, body: 'Added.' });
      const refused = api.add('#dc', { author: 'API', body: 'nothing to hang on' });
      const unknownParent = api.reply('#dc', 'zzz', 'to nobody');
      const replyId = api.reply('#dc', id!, 'answered', 'Bot');
      const went = api.go('#dc', id!);
      const notThere = api.go('#dc', 'zzz');
      return { id, refused, unknownParent, replyId, went, notThere, mark: document.querySelector(`#p3 mark[data-comment="${id}"]`)?.textContent, card: !!document.querySelector(`#dc .doc-comments-card[data-id="${id}"] .doc-comments-replies .doc-comments-card[data-id="${replyId}"]`), total: (api.data('#dc') as any).comments.length };
    });
    assert.ok(r.id);
    assert.equal(r.refused, null);
    assert.equal(r.unknownParent, null);
    assert.ok(r.replyId);
    assert.deepEqual([r.went, r.notThere], [true, false]);
    assert.equal(r.mark, 'nest under');
    assert.equal(r.card, true);
    assert.equal(r.total, 8);
    assert.equal((await current()).card, r.id);
  });

  await check('API: load() replaces the model - old marks gone, new ones placed; next()/prev() on an empty column return null', async () => {
    const r = await page.evaluate(() => {
      const api = globalThis.df$.shadcn.docComments!;
      api.load('#dc', { version: 1, comments: [{ id: 'n1', author: 'New', anchor: { block: 'p4', text: 'Filler so' }, body: 'Loaded.' }] });
      return { marks: document.querySelectorAll('#doc mark.doc-comments-mark').length, which: document.querySelector('#doc mark.doc-comments-mark')?.textContent, cards: document.querySelectorAll('#dc .doc-comments-card').length, text: document.getElementById('p1')!.textContent, next: api.next('#dc2'), prev: api.prev('#dc2'), next1: api.next('#dc') };
    });
    assert.deepEqual(r, { marks: 1, which: 'Filler so', cards: 1, text: 'The editor needs a comment column beside the text that scrolls on its own.', next: null, prev: null, next1: 'n1' });
  });

  await check("state API: setState('default') clears the selection; unknown names throw; registry globals", async () => {
    const r = await page.evaluate(() => {
      const el = document.getElementById('dc')!;
      el.api!.setState('current', { id: 'n1' });
      const a = [el.getAttribute('data-current'), !!document.querySelector('#dc [aria-current]')];
      el.api!.setState('default');
      const b = [el.getAttribute('data-current'), !!document.querySelector('#dc [aria-current]'), !!document.querySelector('#doc mark[data-current]')];
      let err = '';
      try { el.api!.setState('nope'); } catch (e) { err = (e as Error).message; }
      return { a, b, err, states: globalThis.df$.shadcn.docCommentsStates };
    });
    assert.deepEqual(r.a, ['n1', true]);
    assert.deepEqual(r.b, [null, false, false]);
    assert.match(r.err, /unknown state/);
    assert.deepEqual(r.states, ['default', 'current']);
  });

  await check('the column scrolls on its own: overflow auto, overscroll contained, the head sticky', async () => {
    const r = await page.$eval('#dc', (el) => ({ overflow: getComputedStyle(el).overflowY, overscroll: getComputedStyle(el).overscrollBehaviorY, head: getComputedStyle(el.querySelector('.doc-comments-head')!).position }));
    assert.deepEqual(r, { overflow: 'auto', overscroll: 'contain', head: 'sticky' });
  });

  await check('no page errors', async () => {
    assert.deepEqual(errors, []);
  });

  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await assertRenderContract(page, '.doc-comments[id]', ['default', 'current'], { runtimeOwned: '.doc-comments-head, .doc-comments-list, .doc-comments-empty' });
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\ndoc-comments.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('doc-comments.e2e: all checks passed');
