import { chromium, type Download, type Frame, type Page } from 'playwright';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { startServer } from '../server.ts';
import { offlineJsdelivr, waitEditorsSettled } from '../lib/vendor-offline.ts';

/**
 * Why: the document editor scaffold is a clickdummy - its promise is that
 * the clicks work on the lean app bundle. This drives the generated
 * full-screen page (dist/documentation/app-document-editor.html, built from
 * the scaffold page's example fence) with the Editor.js builds served
 * offline: the document renders with deterministic block ids, the comments
 * mark their spans, mark ↔ card selection, ↑ ↓, a quote flash, a reply, the
 * toolbar, a new comment on a selection through the dialog, switching
 * documents (edits kept), the menus (File, Edit, Insert, Format, View),
 * opening a Markdown file and its annotations through the browser's file
 * picker (a review pipeline's run anchored to the quoted source, its layers
 * and references; a comments model), saving in the browser - a reload keeps
 * the saved document, the replies and the replies still being typed - Save as
 * and Export as downloads, the status bar and the narrow layout; and the docs
 * card, whose sandbox keeps nothing but may download.
 */
const PAGE = '/dist/documentation/application/app-document-editor.html';
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
    assert.equal(await page.$eval('#de-saved span', (s) => s.textContent!), 'Unsaved changes', 'an edit waits for File > Save');
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

  const anchored = () => page.$$eval('#de-editor mark.doc-comments-mark', (ms) => new Set(ms.map((m) => (m as HTMLElement).dataset.comment)).size);

  await check('the built-in review run: Importprüfung opens with its 3 findings and 14 summary entries as comments, every one anchored - "# Einschränkung" on the heading text; the findings say rule, severity, confidence, action; the layer toggles count', async () => {
    await page.click('[data-de-doc="pruefung"]');
    await page.waitForFunction(() => document.querySelector('#de-editor h1.ce-header')?.textContent === 'Importprüfung', undefined, { timeout: 5000 });
    await page.waitForFunction(() => document.querySelector('#de-comments [data-count]')?.textContent === '17');
    const r = await page.evaluate(() => {
      const marks = [...document.querySelectorAll<HTMLElement>('#de-editor mark.doc-comments-mark')];
      const text = (id: string) => marks.filter((m) => m.dataset.comment === id).map((m) => m.textContent).join('');
      return {
        heading: text('f1'),
        inHeading: !!marks.find((m) => m.dataset.comment === 'f1')?.closest('.ce-header'),
        sentence: text('f3'),
        body: document.querySelector('#de-comments .doc-comments-card[data-id="f3"] > .doc-comments-body')!.textContent,
        color: document.querySelector('#de-comments .doc-comments-card[data-id="f3"]')!.getAttribute('data-color'),
        layers: [...document.querySelectorAll('[data-de-layer-count]')].map((s) => s.textContent),
        bar: !(document.getElementById('de-layers') as HTMLElement).hidden,
      };
    });
    assert.equal(await anchored(), 17);
    assert.equal(r.heading, 'Einschränkung');
    assert.equal(r.inHeading, true);
    assert.equal(r.sentence, 'Die tägliche Prüfung beweist die einzigartige Zuverlässigkeit des Verfahren.');
    assert.match(r.body!, /L01 · wesentlich · Sicherheit hoch · pruefen/);
    assert.match(r.body!, /T03 · gering · Sicherheit hoch · umformulieren/);
    assert.equal(r.color, 'chart-4', 'the worst severity (wesentlich) colours the card');
    assert.deepEqual(r.layers, ['3', '14']);
    assert.equal(r.bar, true);
  });

  await check('references: a summary entry links the entry it refers to - the link selects that comment; a finding\'s evidence quote flashes its sentence', async () => {
    const notes = await page.$$eval('#de-comments .doc-comments-card[data-id="M000001"] > .doc-comments-link', (ls) => ls.map((l) => l.querySelector('.doc-comments-quote-note')?.textContent));
    assert.deepEqual(notes, ['Bezug: M000002 · aussage']);
    await page.click('#de-comments .doc-comments-card[data-id="M000001"] > .doc-comments-link');
    assert.equal(await currentCard(), 'M000002');
    await page.click('#de-comments .doc-comments-card[data-id="f2"] > .doc-comments-quote');
    assert.equal(await page.$$eval('#de-editor mark.doc-comments-flash', (ms) => ms.map((m) => m.textContent).join('')), 'Alle Importvorgänge werden automatisch geprüft.');
    await page.waitForFunction(() => !document.querySelector('mark.doc-comments-flash'), undefined, { timeout: 4000 });
  });

  await check('layers: Summary off leaves the 3 findings and their marks, on brings the 14 entries back', async () => {
    await page.click('[data-de-layer="summary"]');
    await page.waitForFunction(() => document.querySelector('#de-comments [data-count]')?.textContent === '3');
    assert.equal(await anchored(), 3);
    assert.equal(await page.$eval('[data-de-layer="summary"]', (b) => b.getAttribute('aria-pressed')), 'false');
    await page.click('[data-de-layer="summary"]');
    await page.waitForFunction(() => document.querySelector('#de-comments [data-count]')?.textContent === '17');
    assert.equal(await anchored(), 17);
  });

  await check('View: the document list is checked while open; Summary unchecked hides that layer like the status-bar toggle; Edit > Next comment walks the column', async () => {
    await page.click('[data-dropdown-trigger="de-m-view"]');
    const r = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>('#de-m-view [data-de-view]')].map((i) => [i.dataset.deView, `${i.getAttribute('aria-checked')}${i.getAttribute('aria-disabled') ? ' disabled' : ''}`])));
    assert.deepEqual(r, { sidebar: 'true', findings: 'true', summary: 'true' });
    await page.click('#de-m-view [data-de-view="summary"]');
    await page.waitForFunction(() => document.querySelector('#de-comments [data-count]')?.textContent === '3');
    assert.equal(await page.$eval('[data-de-layer="summary"]', (b) => b.getAttribute('aria-pressed')), 'false');
    await page.keyboard.press('Escape');
    await page.click('[data-de-layer="summary"]');
    await page.waitForFunction(() => document.querySelector('#de-comments [data-count]')?.textContent === '17');
    await page.click('[data-dropdown-trigger="de-m-edit"]');
    await page.click('#de-m-edit [data-de-action="next-comment"]');
    assert.ok(await currentCard(), 'a comment became current');
  });

  /** a menu command: open the menu (and the submenu), click the item */
  const menu = async (name: string, item: string, sub?: string) => {
    await page.click(`[data-dropdown-trigger="de-m-${name}"]`);
    if (sub) await page.click(`#de-m-${name} .dropdown-sub-trigger:has-text("${sub}")`);
    await page.click(`#de-m-${name} ${item}`);
  };
  /** File > Open > Markdown or Comment annotations: the browser's picker, given a file from "disk" */
  const open = async (files: { md?: [string, string]; json?: [string, string] }) => {
    for (const [kind, file] of [['markdown', files.md], ['annotations', files.json]] as const) {
      if (!file) continue;
      const [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 3000 }), menu('file', `[data-de-action="open-${kind}"]`, 'Open')]);
      await chooser.setFiles({ name: file[0], mimeType: kind === 'markdown' ? 'text/markdown' : 'application/json', buffer: Buffer.from(file[1]) });
    }
  };
  const toasts = () => page.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent?.replace(/\s+/g, ' ').trim()).join(' | '));

  await check('File > Open: a Markdown file from the picker becomes a document, its review run from the picker anchors every annotation; a run made for another file says so and stays unanchored; a comments model lands on the open document', async () => {
    const sample = await page.evaluate(() => JSON.parse(document.getElementById('de-docs')!.textContent!).pruefung as { markdown: string; annotations: unknown });
    const run = JSON.stringify(sample.annotations);

    await open({ md: ['example.md', sample.markdown] });
    await page.waitForFunction(() => document.querySelector('[data-de-doc="doc-1"][aria-current="page"]') !== null, undefined, { timeout: 5000 });
    await page.waitForFunction(() => document.querySelector('#de-comments .doc-comments-empty') !== null);
    await open({ json: ['example.json', run] });
    await page.waitForFunction(() => document.querySelector('#de-comments [data-count]')?.textContent === '17');
    assert.equal(await page.$eval('[data-de-doc="doc-1"] span', (s) => s.textContent), 'Importprüfung', 'the title is the first heading');
    assert.equal(await anchored(), 17);
    assert.match(await toasts(), /17 annotations\s*Every one is anchored in the text\./);

    await open({ md: ['other.md', '# Other {#other}\n\nNothing here is quoted.\n'] });
    await page.waitForFunction(() => document.getElementById('de-title')!.textContent === 'Other', undefined, { timeout: 5000 });
    await open({ json: ['bericht.json', run] });
    await page.waitForFunction(() => document.querySelector('#de-comments [data-count]')?.textContent === '17');
    assert.equal(await anchored(), 0);
    assert.match(await page.$eval('#de-comments .doc-comments-card[data-id="f1"] > .doc-comments-body', (b) => b.textContent!), /^Nicht im Dokument: „## Einschränkung“/);
    assert.match(await toasts(), /0 anchored, 17 not found in this document\. They were made for example\.md\./);
    // a link to an entry without a mark is labelled with that entry's text, not its Markdown
    assert.match(await page.$eval('#de-comments .doc-comments-card[data-id="M000001"] > .doc-comments-link span', (s) => s.textContent!), /^Nicht im Dokument: „Dieses Dokument/);

    const model = { version: 1, comments: [{ id: 'x1', author: 'Reviewer', color: 'chart-3', anchor: { block: 'b2', text: 'Nothing here' }, body: 'Quoted now.' }] };
    await open({ json: ['comments.json', JSON.stringify(model)] });
    await page.waitForFunction(() => document.querySelector('#de-comments [data-count]')?.textContent === '1');
    assert.deepEqual(await page.$$eval('#de-editor mark.doc-comments-mark', (ms) => ms.map((m) => m.textContent)), ['Nothing here']);
    assert.equal(await page.$eval('#de-layers', (b) => (b as HTMLElement).hidden), true, 'a comments model has no layers');
  });

  await check('a pipeline quote counts in its part: the same sentence in parts 1 and 2, seite 2 anchors the second; a broken file is refused with a message', async () => {
    const md = '# First\n\nThe same sentence.\n\n## Second\n\nThe same sentence.\n';
    const entry = { id: 'M000001', typ: 'aussage', inhalt: 'In part 2.', woertlich: [], belege: [{ seite: 2, zitat: 'The same sentence.', vorkommen: 1 }], bezug_ids: [] };
    await open({ md: ['twice.md', md] });
    await page.waitForFunction(() => document.getElementById('de-title')!.textContent === 'First', undefined, { timeout: 5000 });
    await open({ json: ['twice.json', JSON.stringify({ source: 'twice.md', steps: 2, summary: { eintraege: [entry] }, custom: [] })] });
    await page.waitForFunction(() => document.querySelector('#de-comments [data-count]')?.textContent === '1');
    // a search of the whole document would take the first sentence (b2)
    assert.equal(await page.$eval('#de-editor mark.doc-comments-mark', (m) => (m.closest('.ce-block') as HTMLElement).dataset.id), 'b4');
    await open({ json: ['broken.json', JSON.stringify({ summary: { eintraege: [{ id: 'M000009', belege: 5 }] } })] });
    await page.waitForFunction(() => [...document.querySelectorAll('.toast')].some((t) => t.textContent?.includes('Unknown annotation format')), undefined, { timeout: 3000 });
    assert.equal(await page.$eval('#de-comments [data-count]', (b) => b.textContent), '1', 'the comments stay');
    assert.equal(await anchored(), 1, 'and keep their mark: a refused file does not re-render the document');
  });

  await check('File > New document: an empty document joins the list; Format > Paragraph styles > Heading 2, Insert > Divider and Edit > Comment act on the editor\'s selection although the menu took the focus', async () => {
    await menu('file', '[data-de-action="new"]');
    await page.waitForFunction(() => document.getElementById('de-title')!.textContent === 'Untitled document', undefined, { timeout: 5000 });
    assert.equal(await page.$eval('[data-de-doc][aria-current="page"] span', (s) => s.textContent), 'Untitled document');
    await page.waitForFunction(() => document.querySelector('#de-comments .doc-comments-empty') !== null);
    await page.click('#de-editor .ce-block [contenteditable="true"]');
    await page.keyboard.type('Made from the menu');
    assert.equal(await select(page, '#de-editor', 'Made from the menu'), true);
    await menu('format', '[data-de-command="header:2"]', 'Paragraph styles');
    await page.waitForFunction(() => document.querySelector('#de-editor h2.ce-header')?.textContent === 'Made from the menu', undefined, { timeout: 3000 });
    assert.equal(await select(page, '#de-editor', 'from the'), true);
    await menu('insert', '[data-de-command="delimiter"]');
    await page.waitForFunction(() => document.querySelector('#de-editor .ce-delimiter') !== null, undefined, { timeout: 3000 });
    assert.equal(await select(page, '#de-editor h2', 'Made'), true);
    await menu('edit', '[data-de-action="comment"]');
    await page.waitForFunction(() => (document.getElementById('de-new-comment') as HTMLDialogElement).open);
    assert.equal(await page.$eval('#de-new-comment-quote', (q) => q.textContent), 'Made');
    await page.click('#de-new-comment [data-dialog-close]');
    await page.waitForFunction(() => document.getElementById('de-saved')!.dataset.state === 'editing');
  });

  await check('share: the dialog opens with the link', async () => {
    await page.click('[data-dialog-trigger="de-share"]');
    await page.waitForFunction(() => (document.getElementById('de-share') as HTMLDialogElement).open);
    assert.equal(await page.$eval('#de-share-url', (i) => (i as HTMLInputElement).value), 'https://margin.example/d/q4-launch-plan');
    await page.click('#de-share [data-dialog-close]');
    await page.waitForFunction(() => !(document.getElementById('de-share') as HTMLDialogElement).open);
    await menu('file', '[data-de-action="share"]');
    await page.waitForFunction(() => (document.getElementById('de-share') as HTMLDialogElement).open);
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

  const reply = (id: string) => `#de-comments .doc-comments-card[data-id="${id}"] > .doc-comments-actions [data-doc-comments-action="reply"]`;
  const composer = (id: string) => `#de-comments .doc-comments-card[data-id="${id}"] > .doc-comments-reply textarea`;
  const composers = () => page.$$eval('#de-comments .doc-comments-reply:not([hidden])', (fs) => fs.map((f) => `${(f.closest('.doc-comments-card') as HTMLElement).dataset.id}:${f.querySelector('textarea')!.value}`).sort());
  const ready = async () => {
    await waitEditorsSettled(page);
    await page.waitForFunction(() => !!document.querySelector('#de-comments .doc-comments-card, #de-comments .doc-comments-empty'));
  };

  await check('File > Save (⌘S) keeps the document in this browser; a reply is kept without Save; three replies being typed, the opened files and the open document all come back after a reload', async () => {
    await page.click('[data-de-doc="launch"]');
    await page.waitForFunction(() => document.querySelector('#de-editor h1.ce-header')?.textContent === 'Q4 launch plan', undefined, { timeout: 5000 });
    await page.waitForFunction(() => document.getElementById('de-saved')!.dataset.state === 'editing', undefined, { timeout: 3000 });
    await page.keyboard.press('ControlOrMeta+s');
    await page.waitForFunction(() => /^Saved \d/.test(document.querySelector('#de-saved span')!.textContent!), undefined, { timeout: 3000 });
    assert.match(await toasts(), /Saved Q4 launch plan\s*In this browser - it is still here after a reload\./);
    // a reply is kept the moment it is sent; three composers are left open, typed in
    await page.click(reply('c4'));
    await page.fill(composer('c4'), 'Kept without Save.');
    await page.click(`#de-comments .doc-comments-card[data-id="c4"] > .doc-comments-reply button[type="submit"]`);
    await page.waitForFunction(() => document.querySelector('#de-comments [data-count]')?.textContent === '8');
    for (const [id, text] of [['c1', 'first unsent'], ['c3', 'second unsent'], ['c5', 'third unsent']]) {
      await page.click(reply(id));
      await page.fill(composer(id), text);
    }
    assert.deepEqual(await composers(), ['c1:first unsent', 'c3:second unsent', 'c5:third unsent']);
    const docsBefore = await page.$$eval('#de-doc-nav [data-de-doc]', (as) => as.map((a) => `${(a as HTMLElement).dataset.deDoc}:${a.querySelector('span')!.textContent}`));
    // Save as and Export are downloads where the browser has no Save dialog - as after this reload
    await page.addInitScript(() => delete (globalThis as { showSaveFilePicker?: unknown }).showSaveFilePicker);
    await page.reload();
    await ready();
    await page.waitForFunction(() => document.querySelector('#de-comments [data-count]')?.textContent === '8', undefined, { timeout: 5000 });
    const r = await page.evaluate(() => ({
      title: document.getElementById('de-title')!.textContent,
      bold: /<b>October 28<\/b>/.test(document.querySelector('#de-editor [data-id="b2"] .ce-paragraph')!.innerHTML),
      reply: [...document.querySelectorAll('#de-comments .doc-comments-card[data-id="c4"] .doc-comments-replies .doc-comments-body')].map((b) => b.textContent),
      status: document.querySelector('#de-saved span')!.textContent,
      docs: [...document.querySelectorAll('#de-doc-nav [data-de-doc]')].map((a) => `${(a as HTMLElement).dataset.deDoc}:${a.querySelector('span')!.textContent}`),
    }));
    assert.equal(r.title, 'Q4 launch plan');
    assert.equal(r.bold, true, 'the saved edit');
    assert.deepEqual(r.reply, ['Kept without Save.']);
    assert.match(r.status!, /^Saved \d/);
    assert.deepEqual(r.docs, docsBefore, 'the opened files and the new document are in the list again');
    assert.deepEqual(await composers(), ['c1:first unsent', 'c3:second unsent', 'c5:third unsent'], 'every unsent reply is back in its composer');
  });

  /** a download's file name and text */
  const downloaded = async (d: Download) => ({ name: d.suggestedFilename(), text: await readFile((await d.path())!, 'utf8') });

  await check('File > Save as downloads the Markdown, Export the comments model - replies and layers included; Open > Comment annotations reads the export back', async () => {
    const [md] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), menu('file', '[data-de-action="save-as"]')]);
    const file = await downloaded(md);
    assert.equal(file.name, 'Q4 launch plan.md');
    assert.match(file.text, /^# Q4 launch plan\n/);
    assert.match(file.text, /\*\*October 28\*\*/);
    const [json] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), menu('file', '[data-de-action="export-annotations"]', 'Export')]);
    const exported = await downloaded(json);
    assert.equal(exported.name, 'Q4 launch plan.comments.json');
    const model = JSON.parse(exported.text) as { version: number; source: string; layers: object; comments: { id: string; parent?: string; body: string }[] };
    assert.equal(model.version, 1);
    assert.equal(model.source, 'Q4 launch plan.md');
    assert.equal(model.comments.length, 8);
    assert.deepEqual(model.comments.filter((c) => c.parent).map((c) => `${c.parent}:${c.body}`).sort(), ['c1:Moving it into the first paragraph in the next revision.', 'c3:Confirmed on the lean bundle.', 'c4:Kept without Save.']);
    // the export of a run keeps its layers: on the review document, read back through Open
    await page.click('.sidebar-trigger[data-sidebar-trigger="de-sidebar"]'); // the list starts closed after the reload
    await page.click('[data-de-doc="doc-1"]');
    await page.waitForFunction(() => document.querySelector('#de-comments [data-count]')?.textContent === '17', undefined, { timeout: 5000 });
    const [run] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), menu('file', '[data-de-action="export-annotations"]', 'Export')]);
    const back = await downloaded(run);
    assert.equal(back.name, 'example.comments.json');
    await open({ json: [back.name, back.text] });
    await page.waitForFunction(() => [...document.querySelectorAll('.toast')].some((t) => /17 annotations\s*Every one is anchored/.test(t.textContent ?? '')), undefined, { timeout: 3000 });
    assert.deepEqual(await page.$$eval('[data-de-layer-count]', (ss) => ss.map((s) => s.textContent)), ['3', '14'], 'the layers came back with the comments');
  });

  /** a drag event with files ([name, type, text]) on an element; false = the page took it (preventDefault) */
  const drag = (type: string, selector: string, files: [string, string, string][], related: string | null = null) =>
    page.evaluate(({ type, selector, files, related }) => {
      const dataTransfer = new DataTransfer();
      for (const [name, mime, text] of files) dataTransfer.items.add(new File([text], name, { type: mime }));
      const relatedTarget = related ? document.querySelector(related) : null;
      return document.querySelector(selector)!.dispatchEvent(new DragEvent(type, { dataTransfer, relatedTarget, bubbles: true, cancelable: true }));
    }, { type, selector, files, related });
  const dropTarget = () => page.evaluate(() => {
    const app = document.getElementById('de')!;
    const after = getComputedStyle(app, '::after');
    return { active: app.hasAttribute('data-drop-active'), content: after.content, border: after.borderTopStyle };
  });

  await check('drag and drop: files over the editor show the drop target, its label says what a drop does, leaving the app hides it; a Markdown file and its run dropped together open annotated; comments dropped alone land on the open document; any other file is refused', async () => {
    const sample = await page.evaluate(() => JSON.parse(document.getElementById('de-docs')!.textContent!).pruefung as { markdown: string; annotations: unknown });
    const md: [string, string, string] = ['example.md', 'text/markdown', sample.markdown];
    const run: [string, string, string] = ['example.json', 'application/json', JSON.stringify(sample.annotations)];
    const blocks = await page.$$eval('#de-editor .ce-block', (bs) => bs.length); // doc-1 is this Markdown

    assert.equal(await drag('dragenter', '#de-editor .ce-paragraph', [md, run]), false, 'the app takes the drag');
    assert.deepEqual(await dropTarget(), { active: true, content: '"Drop to open the document with its comments"', border: 'dashed' });
    assert.equal(await drag('dragover', '#de-editor .ce-paragraph', [md, run]), false, 'a drop is allowed');
    await drag('dragleave', '#de-editor .ce-paragraph', [md, run], '#de-comments');
    assert.equal((await dropTarget()).active, true, 'moving inside the app keeps it');
    await drag('dragleave', '#de-comments', [md, run]);
    assert.deepEqual(await dropTarget(), { active: false, content: 'none', border: 'none' });
    await drag('dragenter', '#de-comments', [run]);
    assert.equal((await dropTarget()).content, '"Drop to put these comments on Importprüfung"');
    await drag('dragenter', '#de-title', [md]);
    assert.equal((await dropTarget()).content, '"Drop a Markdown file to open it - or its comments (JSON) to put them on this document"');

    // doc-1 shows the same 17 comments: its marks are tagged, the dropped document's are new elements
    await page.$$eval('#de-editor mark.doc-comments-mark', (ms) => ms.forEach((m) => m.setAttribute('data-before-drop', '')));
    assert.equal(await drag('drop', '#de-editor .ce-paragraph', [md, run]), false);
    assert.equal((await dropTarget()).active, false, 'a drop ends it');
    await page.waitForFunction(() => document.querySelector('[data-de-doc="doc-5"][aria-current="page"]') !== null, undefined, { timeout: 5000 });
    await page.waitForFunction(() => new Set([...document.querySelectorAll('#de-editor mark.doc-comments-mark:not([data-before-drop])')].map((m) => (m as HTMLElement).dataset.comment)).size === 17, undefined, { timeout: 5000 });
    assert.equal(await page.$eval('#de-comments [data-count]', (b) => b.textContent), '17');
    assert.equal(await page.$eval('[data-de-doc="doc-5"] span', (s) => s.textContent), 'Importprüfung');
    assert.equal(await page.$$eval('#de-editor .ce-block', (bs) => bs.length), blocks, 'Editor.js took nothing from the drop');

    const model = { version: 1, comments: [{ id: 'd1', author: 'Reviewer', color: 'chart-2', anchor: { block: 'b1', text: 'Importprüfung' }, body: 'Dropped.' }] };
    await drag('drop', '#de-comments', [['dropped.json', '', JSON.stringify(model)]]);
    await page.waitForFunction(() => document.querySelector('#de-comments [data-count]')?.textContent === '1', undefined, { timeout: 5000 });
    assert.deepEqual(await page.$$eval('#de-editor mark.doc-comments-mark', (ms) => ms.map((m) => m.textContent)), ['Importprüfung']);

    await drag('drop', '#de-editor .ce-paragraph', [['photo.png', 'image/png', 'png']]);
    await page.waitForFunction(() => [...document.querySelectorAll('.toast')].some((t) => /Not opened\s*photo\.png - not a Markdown or JSON file\./.test(t.textContent ?? '')), undefined, { timeout: 3000 });
    assert.equal(await page.$eval('[data-de-doc][aria-current="page"]', (a) => (a as HTMLElement).dataset.deDoc), 'doc-5', 'the open document stays');
  });

  await check('the docs card: its sandbox refuses storage - Save says it keeps the document for this visit; sandbox="downloads" lets Save as download', async () => {
    const docs = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await docs.route('https://unpkg.com/**', (r) => r.fulfill({ contentType: 'text/javascript', body: '' }));
    await offlineJsdelivr(docs);
    await docs.goto(`${server.url}/dist/documentation/application/scaffold-document-editor.html`);
    const iframe = await docs.waitForSelector('.code-example iframe', { timeout: 15_000 });
    assert.equal(await iframe.getAttribute('sandbox'), 'allow-scripts allow-forms allow-downloads');
    await iframe.scrollIntoViewIfNeeded();
    const frame = (await iframe.contentFrame()) as Frame;
    await frame.waitForSelector('#de-editor[data-ready]', { timeout: 20_000 });
    // the menu items, clicked through the menus' own click handling (the card's zoomed preview defeats pointer maths)
    const item = (sel: string) => frame.evaluate((s) => (document.querySelector(s) as HTMLElement).click(), sel);
    await item('[data-de-action="save"]');
    await frame.waitForFunction(() => [...document.querySelectorAll('.toast')].some((t) => /For this visit only/.test(t.textContent ?? '')), undefined, { timeout: 3000 });
    const [d] = await Promise.all([docs.waitForEvent('download', { timeout: 5000 }), item('[data-de-action="save-as"]')]);
    assert.equal(d.suggestedFilename(), 'Q4 launch plan.md');
    await docs.close();
  });

  await check('a full storage: Save says the document was not saved instead of claiming it', async () => {
    const full = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await full.route('https://unpkg.com/**', (r) => r.fulfill({ contentType: 'text/javascript', body: '' }));
    await offlineJsdelivr(full);
    await full.goto(`${server.url}${PAGE}`);
    await waitEditorsSettled(full);
    await full.evaluate(() => {
      try {
        for (let i = 0; i < 400; i++) localStorage.setItem(`junk-${i}`, 'x'.repeat(256 * 1024));
      } catch {
        for (let j = 0; j < 4000; j++) {
          try {
            localStorage.setItem(`junk-s-${j}`, 'y'.repeat(1024));
          } catch {
            break;
          }
        }
      }
    });
    await full.keyboard.press('ControlOrMeta+s');
    await full.waitForFunction(() => [...document.querySelectorAll('.toast')].some((t) => /Not saved\s*The browser refused to store the document/.test(t.textContent ?? '')), undefined, { timeout: 3000 });
    await full.close();
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
