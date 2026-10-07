import { chromium, type Page } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from './server.ts';
import { offlineJsdelivr, waitEditorsSettled } from './lib/vendor-offline.ts';

/**
 * Why: the document editor scaffold is a clickdummy - its promise is that
 * the clicks work on the lean app bundle. This drives the generated
 * full-screen page (dist/documentation/app-document-editor.html, built from
 * the scaffold page's example fence) with the Editor.js builds served
 * offline: the document renders with deterministic block ids, the comments
 * mark their spans, mark ↔ card selection, ↑ ↓, a quote flash, a reply, the
 * toolbar, a new comment on a selection through the dialog, switching
 * documents (edits kept), the status bar and the narrow layout.
 */
const PAGE = '/dist/documentation/app-document-editor.html';
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

/** select `text` inside the first element matching `sel` and focus it */
const select = (page: Page, sel: string, text: string) => page.evaluate(({ sel, text }) => {
  const el = document.querySelector<HTMLElement>(sel)!;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node: Text | null = null;
  while ((node = walker.nextNode() as Text | null)) {
    const i = node.data.indexOf(text);
    if (i < 0) continue;
    const range = document.createRange();
    range.setStart(node, i);
    range.setEnd(node, i + text.length);
    (node.parentElement!.closest('[contenteditable]') as HTMLElement | null)?.focus();
    const s = getSelection()!;
    s.removeAllRanges();
    s.addRange(range);
    return true;
  }
  return false;
}, { sel, text });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route('https://unpkg.com/**', (r) => r.fulfill({ contentType: 'text/javascript', body: '' }));
  await offlineJsdelivr(page);
  await page.goto(`${server.url}${PAGE}`);
  await page.waitForFunction(() => !!(globalThis as any).df$?.shadcn?.editorjsApi && !!(globalThis as any).df$?.shadcn?.docCommentsApi, undefined, { timeout: 10_000 });
  await waitEditorsSettled(page);
  const currentCard = () => page.$eval('#de-comments', (el) => el.querySelector('.doc-comments-card[aria-current]')?.getAttribute('data-id') ?? null);
  const count = () => page.$eval('#de-comments [data-count]', (b) => b.textContent);

  await check('the launch plan renders in Editor.js with deterministic block ids; its 5 comments mark their spans', async () => {
    const r = await page.evaluate(() => ({
      ids: [...document.querySelectorAll('#de-editor .ce-block')].map((b) => (b as HTMLElement).dataset.id),
      h1: document.querySelector('#de-editor h1.ce-header')?.textContent,
      marks: [...document.querySelectorAll('#de-editor mark.doc-comments-mark')].map((m) => `${(m as HTMLElement).dataset.comment}:${m.textContent}`),
      cards: document.querySelectorAll('#de-comments .doc-comments-card').length,
      reply: !!document.querySelector('#de-comments .doc-comments-card[data-id="c1"] .doc-comments-replies .doc-comments-card[data-id="c2"]'),
      title: document.getElementById('de-title')!.textContent,
    }));
    assert.deepEqual(r.ids, ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10', 'b11', 'b12']);
    assert.equal(r.h1, 'Q4 launch plan');
    assert.deepEqual([...r.marks].sort(), ['c1:living document', 'c3:scroll independently', 'c4:Marks must survive edits around them', 'c5:smallest thing']);
    assert.equal(r.cards, 5);
    assert.equal(r.reply, true);
    assert.equal(await count(), '5');
    assert.equal(r.title, 'Q4 launch plan');
  });

  await check('a mark click selects its card; ↓ walks on; the card excerpt scrolls the document to the mark', async () => {
    await page.click('#de-editor mark[data-comment="c3"]');
    assert.equal(await currentCard(), 'c3');
    await page.click('#de-comments [data-doc-comments-action="next"]');
    assert.equal(await currentCard(), 'c4');
    await page.evaluate(() => { document.getElementById('de-page')!.scrollTop = 0; });
    await page.click('#de-comments .doc-comments-card[data-id="c5"] > .doc-comments-anchor');
    assert.equal(await currentCard(), 'c5');
    await page.waitForFunction(() => document.getElementById('de-page')!.scrollTop > 0, undefined, { timeout: 3000 });
  });

  await check('a quote flashes its span - in a table cell too - and the flash goes away', async () => {
    await page.click('#de-comments .doc-comments-card[data-id="c5"] > .doc-comments-quote');
    assert.equal(await page.$eval('#de-editor .tc-cell mark.doc-comments-flash', (m) => m.textContent), 'Beta to design partners');
    await page.waitForFunction(() => !document.querySelector('mark.doc-comments-flash'), undefined, { timeout: 4000 });
    await page.click('#de-comments .doc-comments-card[data-id="c1"] > .doc-comments-quote');
    assert.equal(await page.$eval('#de-editor [data-id="b12"] mark.doc-comments-flash', (m) => m.textContent), 'Owner: the platform team');
  });

  await check('Reply under a card adds a nested comment by You; the sidebar count follows', async () => {
    await page.click('#de-comments .doc-comments-card[data-id="c3"] [data-doc-comments-action="reply"]');
    await page.fill('#de-comments .doc-comments-card[data-id="c3"] > .doc-comments-reply textarea', 'Confirmed on the lean bundle.');
    await page.click('#de-comments .doc-comments-card[data-id="c3"] > .doc-comments-reply button[type="submit"]');
    assert.equal(await page.$eval('#de-comments .doc-comments-card[data-id="c3"] .doc-comments-replies .doc-comments-author', (a) => a.textContent), 'You');
    assert.equal(await count(), '6');
    assert.equal(await page.$eval('[data-de-count="launch"]', (b) => b.textContent), '6');
  });

  await check('the toolbar formats the selection: Bold wraps it and the toggle reports it', async () => {
    assert.equal(await select(page, '#de-editor [data-id="b2"]', 'October 28'), true);
    await page.click('#de-bar [data-editor-command="bold"]');
    await page.waitForFunction(() => /<b>October 28<\/b>/.test(document.querySelector('#de-editor [data-id="b2"] .ce-paragraph')!.innerHTML));
    await page.waitForFunction(() => document.querySelector('#de-bar [data-editor-command="bold"]')!.getAttribute('aria-pressed') === 'true');
    await page.waitForFunction(() => document.getElementById('de-saved')!.dataset.state === 'editing');
    await page.waitForFunction(() => document.getElementById('de-saved')!.dataset.state === 'saved', undefined, { timeout: 4000 });
    assert.match(await page.$eval('#de-saved span', (s) => s.textContent!), /^Saved /);
  });

  await check('Comment on a selection: the dialog shows the quote, the colour is picked, the comment lands with its mark and becomes current', async () => {
    assert.equal(await select(page, '#de-editor [data-id="b12"]', 'Questions go to the thread'), true);
    await page.click('#de-comment');
    await page.waitForFunction(() => (document.getElementById('de-new-comment') as HTMLDialogElement).open);
    assert.equal(await page.$eval('#de-new-comment-quote', (q) => q.textContent), 'Questions go to the thread');
    await page.click('#de-new-comment-colors [data-color="chart-3"]');
    await page.fill('#de-new-comment-body', 'Which thread? Link it.');
    await page.click('#de-new-comment button[type="submit"]');
    await page.waitForFunction(() => !(document.getElementById('de-new-comment') as HTMLDialogElement).open);
    const r = await page.evaluate(() => {
      const mark = document.querySelector<HTMLElement>('#de-editor [data-id="b12"] mark.doc-comments-mark')!;
      const card = document.querySelector<HTMLElement>(`#de-comments .doc-comments-card[data-id="${mark.dataset.comment}"]`)!;
      return { text: mark.textContent, color: mark.dataset.color, current: card.hasAttribute('aria-current'), author: card.querySelector('.doc-comments-author')!.textContent, body: card.querySelector('.doc-comments-body')!.textContent };
    });
    assert.deepEqual(r, { text: 'Questions go to the thread', color: 'chart-3', current: true, author: 'You', body: 'Which thread? Link it.' });
    assert.equal(await count(), '7');
  });

  await check('Comment without a selection asks for one instead of opening the dialog', async () => {
    await page.evaluate(() => getSelection()!.removeAllRanges());
    await page.click('#de-comment');
    assert.equal(await page.$eval('#de-new-comment', (d) => (d as HTMLDialogElement).open), false);
    assert.equal(await page.$eval('#de-words', (s) => s.textContent), 'Select some text to comment on it');
  });

  await check('the sidebar opens another document: title, blocks and comments change; the notes have none', async () => {
    await page.click('.sidebar-trigger[data-sidebar-trigger="de-sidebar"]');
    await page.click('[data-de-doc="brief"]');
    await page.waitForFunction(() => document.querySelector('#de-editor h1.ce-header')?.textContent === 'Design brief: the comment column', undefined, { timeout: 5000 });
    await page.waitForFunction(() => document.querySelector('#de-comments [data-count]')?.textContent === '2');
    const r = await page.evaluate(() => ({
      title: document.getElementById('de-title')!.textContent,
      current: document.querySelector('[data-de-doc][aria-current="page"]')!.getAttribute('data-de-doc'),
      marks: [...document.querySelectorAll('#de-editor mark.doc-comments-mark')].map((m) => m.textContent),
      words: document.getElementById('de-words')!.textContent,
    }));
    assert.equal(r.title, 'Design brief');
    assert.equal(r.current, 'brief');
    assert.deepEqual(r.marks.sort(), ['scrolls independently', 'the legend says which']);
    assert.match(r.words!, /^\d+ words$/);
    await page.click('[data-de-doc="notes"]');
    await page.waitForFunction(() => document.querySelector('#de-editor h1.ce-header')?.textContent === 'Meeting notes - October 6', undefined, { timeout: 5000 });
    // the column loads after the editor rendered the blocks (setMarkdown resolves, then load)
    await page.waitForFunction(() => document.querySelector('#de-comments .doc-comments-empty')?.textContent === 'No comments yet.', undefined, { timeout: 5000 });
    assert.equal(await page.$eval('[data-de-count="notes"]', (b) => (b as HTMLElement).hidden), true);
  });

  await check('back to the launch plan: the bold edit and the 7 comments were kept', async () => {
    await page.click('[data-de-doc="launch"]');
    await page.waitForFunction(() => document.querySelector('#de-editor h1.ce-header')?.textContent === 'Q4 launch plan', undefined, { timeout: 5000 });
    await page.waitForFunction(() => document.querySelector('#de-comments [data-count]')?.textContent === '7');
    assert.match(await page.$eval('#de-editor [data-id="b2"] .ce-paragraph', (p) => p.innerHTML), /<b>October 28<\/b>/);
    assert.equal(await page.$$eval('#de-editor mark.doc-comments-mark', (ms) => new Set(ms.map((m) => (m as HTMLElement).dataset.comment)).size), 5);
  });

  await check('share: the dialog opens with the link', async () => {
    await page.click('[data-dialog-trigger="de-share"]');
    await page.waitForFunction(() => (document.getElementById('de-share') as HTMLDialogElement).open);
    assert.equal(await page.$eval('#de-share-url', (i) => (i as HTMLInputElement).value), 'https://margin.example/d/q4-launch-plan');
    await page.click('#de-share [data-dialog-close]');
    await page.waitForFunction(() => !(document.getElementById('de-share') as HTMLDialogElement).open);
  });

  await check('narrow: the comment column hides and the header toggle shows it as an overlay', async () => {
    await page.setViewportSize({ width: 720, height: 900 });
    await page.waitForFunction(() => getComputedStyle(document.getElementById('de-comments')!).display === 'none');
    await page.click('#de-comments-toggle');
    await page.waitForFunction(() => getComputedStyle(document.getElementById('de-comments')!).display === 'flex');
    assert.equal(await page.$eval('#de-comments', (el) => getComputedStyle(el).position), 'absolute');
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  await check('no page errors', async () => {
    assert.deepEqual(errors, []);
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nscaffold-document-editor.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('scaffold-document-editor.e2e: all checks passed');
