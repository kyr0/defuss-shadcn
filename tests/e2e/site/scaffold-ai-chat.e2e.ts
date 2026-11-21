import { chromium, type Page } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from '../server.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';
import { chooseLanguage, renderedLanguage, translationGaps } from '../lib/translation.ts';

/**
 * Why: the AI Chat scaffold ("Lumen", an Open WebUI-style chat adapted from
 * defuss's examples/ai-chat) promises a working chat. This drives the
 * generated full-screen page (application/app-ai-chat.html, built from the
 * scaffold page's own example fence) through the welcome, streamed Markdown
 * answers (a Table, a Code mockup, folded thinking), stopping, every message
 * action, the chat list (open, search, pin, rename, delete), the model
 * picker, Controls, an OpenAI-compatible API (a local Server-Sent Events
 * server - the real protocol, not a mock of the page), the sign-in,
 * settings, German, the narrow layout and the stores across a reload.
 */
const PAGE = '/dist/documentation/application/app-ai-chat.html';
const server = startServer();
const browser = await chromium.launch();
// the demo media of the docs: a 640 x 400 photo, the 24 s harbour clip as MP3 and WebM
const file = async (name: string, mimeType: string, path: string) => ({
  name,
  mimeType,
  buffer: Buffer.from(await Bun.file(path).bytes()),
});
const PHOTO = await file('valley.webp', 'image/webp', 'dist/documentation/images/photos/1015-640x400.webp');
const MP3 = await file('harbour.mp3', 'audio/mpeg', 'dist/documentation/videos/harbour.mp3');
const WEBM = await file('harbour.webm', 'video/webm', 'dist/documentation/videos/harbour.webm');
let attachHash = '';
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

// an OpenAI-compatible endpoint: streams a reply as Server-Sent Events, with CORS like a local model server
const requests: { auth: string | null; body: any }[] = [];
const api = Bun.serve({
  port: 0,
  async fetch(req) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'content-type, authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    if (url.pathname === '/broken/v1/chat/completions') return new Response('nope', { status: 500, headers: cors });
    if (url.pathname !== '/v1/chat/completions') return new Response('not found', { status: 404, headers: cors });
    const body = await req.json();
    requests.push({ auth: req.headers.get('authorization'), body });
    const last = String(body.messages.at(-1)?.content ?? '');
    const card = {
      version: 1,
      id: 'seats',
      title: 'Seats',
      body: [{ type: 'number', name: 'seats', label: 'Seats', min: 1, required: true }],
      actions: [{ id: 'ok', label: 'Order', submit: true }],
    };
    const args = JSON.stringify(card);
    const scripted = /card please/.test(last)
      ? [
          { content: 'One question:' },
          { tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'show_', arguments: '' } }] },
          { tool_calls: [{ index: 0, function: { name: 'components', arguments: args.slice(0, 30) } }] },
          { tool_calls: [{ index: 0, function: { arguments: args.slice(30) } }] },
        ]
      : /fence please/.test(last)
        ? [
            { content: 'Pick one:\n\n```ui::component-schema\n' },
            { content: args.slice(0, 40) },
            { content: args.slice(40) + '\n```\n' },
          ]
        : /```json/.test(last)
          ? [{ content: 'Got your answer.' }]
          : null;
    const parts = scripted ?? [
      { reasoning_content: 'The user greets; ' },
      { reasoning_content: 'answer briefly.' },
      { content: 'Hello from ' },
      { content: '**stub-model**' },
      { content: ' over SSE.' },
    ];
    const stream = new ReadableStream({
      async start(ctrl) {
        const enc = new TextEncoder();
        for (const delta of parts) {
          ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`));
          await Bun.sleep(30);
        }
        ctrl.enqueue(enc.encode('data: [DONE]\n\n'));
        ctrl.close();
      },
    });
    return new Response(stream, { headers: { ...cors, 'Content-Type': 'text/event-stream' } });
  },
});

const idle = (p: Page) =>
  p.waitForFunction(() => !document.querySelector('[data-ac-send][data-streaming]'), undefined, { timeout: 20_000 });
const turns = (p: Page) =>
  p.$$eval('.ac-session .session-item', (rows) =>
    rows.map((r) => ((r.querySelector('.message') as HTMLElement).dataset.align === 'end' ? 'user' : 'assistant')),
  );
const lastAnswer = (p: Page) =>
  p.$eval('.ac-session .session-item:last-child .bubble-content', (e) => (e.textContent || '').trim());
const chatTitles = (p: Page) =>
  p.$$eval('.ac-nav .ac-chat .sidebar-link', (rows) =>
    rows.filter((r) => (r as HTMLElement).checkVisibility()).map((r) => (r.textContent || '').trim()),
  );
const toasted = (p: Page, text: string) =>
  p.waitForFunction(
    (t) => [...document.querySelectorAll('.toast')].some((e) => (e.textContent || '').includes(t)),
    text,
    { timeout: 5000 },
  );
const ask = async (p: Page, text: string) => {
  await p.fill('[data-ac-composer] .textarea', text);
  await p.keyboard.press('Enter');
  await p.waitForSelector('[data-ac-send][data-streaming]');
  await idle(p);
};

async function open(width = 1400, height = 900): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: server.url });
  const p = await ctx.newPage();
  await offlineJsdelivr(p);
  await p.goto(`${server.url}${PAGE}`);
  await p.waitForFunction(
    () => !!(globalThis as any).df$?.shadcn?.session && !!document.querySelector('.ac-nav .ac-chat'),
    undefined,
    {
      timeout: 10_000,
    },
  );
  return p;
}

try {
  const page = await open();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await check(
    'opens on a new chat: the greeting, four suggestions, the chats grouped by day with the pinned one first',
    async () => {
      assert.equal(await page.$eval('#ac-session', (e) => e.hasAttribute('data-empty')), true);
      assert.equal((await page.textContent('[data-i18n-target="greeting"]'))?.trim(), 'How can I help you today?');
      assert.equal(
        await page.$$eval('.ac-suggestion', (b) => b.filter((x) => (x as HTMLElement).checkVisibility()).length),
        4,
      );
      assert.equal(
        (await page.textContent('[data-ac-group="pinned"] .ac-chat .sidebar-link'))?.trim(),
        'What can Lumen do?',
      );
      assert.equal(await page.$eval('[data-ac-group="older"]', (g) => (g as HTMLElement).hidden), false);
      assert.equal(await page.$eval('.ac-nav', (e) => e.getAttribute('data-state')), 'expanded');
    },
  );

  await check(
    'a suggestion sends: the question anchors, the answer streams as Markdown into a Table, the chat gets a route and a row',
    async () => {
      await page.click('[data-ac-prompt^="Compare"]');
      await page.waitForSelector('[data-ac-send][data-streaming]');
      assert.equal(await page.getAttribute('#ac-session', 'data-state-name'), 'streaming');
      assert.equal(await page.getAttribute('[data-ac-send]', 'aria-label'), 'Stop generating');
      await idle(page);
      assert.match(new URL(page.url()).hash, /^#\/c\/c[a-z0-9]+$/);
      assert.deepEqual(await turns(page), ['user', 'assistant']);
      assert.equal(
        await page.$eval('.ac-session .session-item:first-child', (e) => e.hasAttribute('data-anchor')),
        true,
      );
      assert.deepEqual(
        await page.$$eval('.ac-md .table-container .table .table-head', (h) =>
          h.map((x) => (x.textContent || '').trim()),
        ),
        ['', 'SQLite', 'Postgres', 'DuckDB'],
      );
      assert.equal(await page.$eval('.ac-md strong', (e) => e.textContent), 'In short:');
      const row = await page.$eval('.ac-nav [aria-current="page"]', (e) => (e.textContent || '').trim());
      assert.equal(row, 'Compare SQLite, Postgres and DuckDB in a...');
      assert.equal(await page.getAttribute('[data-ac-send]', 'aria-label'), 'Send message');
    },
  );

  await check(
    'thinking: the Toggle folds the reasoning above a code answer; code blocks are Code mockups with a copy button',
    async () => {
      await page.click('[data-ac-think-toggle]');
      assert.equal(await page.getAttribute('[data-ac-think-toggle]', 'aria-pressed'), 'true');
      await page.fill('[data-ac-composer] .textarea', 'Write a debounce function in JavaScript');
      // the open, shimmering reasoning lasts half a second: the page records that it showed
      await page.evaluate(() => {
        const seen = new MutationObserver(() => {
          if (document.querySelector('.ac-session .session-item:last-child .ac-think[open] [data-shimmer]')) {
            (globalThis as any).__thinkingShown = true;
            seen.disconnect();
          }
        });
        seen.observe(document.querySelector('.ac-session')!, { childList: true, subtree: true, attributes: true });
      });
      await page.keyboard.press('Enter');
      await page.waitForSelector('[data-ac-send][data-streaming]');
      await idle(page);
      assert.equal(
        await page.evaluate(() => (globalThis as any).__thinkingShown),
        true,
        'the reasoning showed open while it was written',
      );
      const summary = await page.$eval('.ac-session .session-item:last-child .ac-think > summary', (e) =>
        (e.textContent || '').trim(),
      );
      assert.match(summary, /^Thought for \d+ seconds?$/);
      assert.equal(
        await page.$eval('.ac-session .session-item:last-child .ac-think', (e) => (e as HTMLDetailsElement).open),
        false,
      );
      const lines = await page.$$eval('.ac-session .session-item:last-child .mockup-code pre', (p) =>
        p.map((x) => x.textContent),
      );
      assert.equal(lines[0], 'function debounce(fn, wait = 250) {');
      assert.equal(await page.textContent('.ac-session .session-item:last-child .ac-code-head span'), 'js');
      await page.click('.ac-session .session-item:last-child [data-ac-copy-code]');
      await toasted(page, 'Copied to the clipboard');
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      assert.ok(copied.startsWith('function debounce(fn, wait = 250) {\n  let timer;'), copied.slice(0, 60));
      await page.click('[data-ac-think-toggle]');
    },
  );

  await check('the send button stops a running answer; it ends marked as stopped', async () => {
    // the 70B model writes slowly enough to be stopped halfway
    await page.click('.ac-model');
    await page.click('#ac-models [data-value="lumen-70b"]');
    await page.fill('[data-ac-composer] .textarea', 'Explain how a transformer reads a sentence');
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-ac-send][data-streaming]');
    await page.waitForFunction(
      () =>
        (document.querySelector('.ac-session .session-item:last-child .bubble-content')?.textContent || '').length > 20,
    );
    await page.click('[data-ac-send]');
    await idle(page);
    assert.match(await lastAnswer(page), /Stopped$/);
    assert.equal(await page.$eval('#ac-session', (e) => e.getAttribute('data-state-name') !== 'streaming'), true);
    await page.click('.ac-model');
    await page.click('#ac-models [data-value="lumen-8b"]');
  });

  await check('answer actions: rate, generation info, regenerate', async () => {
    const last = '.ac-session .session-item:last-child';
    await page.hover(last);
    await page.click(`${last} [data-ac-msg="good"]`);
    await toasted(page, 'Thanks for the feedback');
    assert.equal(await page.getAttribute(`${last} [data-ac-msg="good"]`, 'aria-pressed'), 'true');
    await page.click(`${last} [data-ac-msg="info"]`);
    assert.match(
      (await page.textContent(`${last} [data-ac-info]`)) || '',
      /^Lumen \d+B · \d+ tokens · \d+ tokens\/s · \d+\.\d s$/,
    );
    await page.click(`${last} [data-ac-msg="regenerate"]`);
    await page.waitForSelector('[data-ac-send][data-streaming]');
    await idle(page);
    assert.match(await lastAnswer(page), /^A transformer reads a whole sentence at once/);
    assert.doesNotMatch(await lastAnswer(page), /Stopped$/);
    assert.equal(
      await page.getAttribute(`${last} [data-ac-msg="good"]`, 'aria-pressed'),
      'false',
      'a new answer has no rating',
    );
  });

  await check(
    'question actions: edit drops what followed and asks again; delete asks first and removes the rest',
    async () => {
      const before = (await turns(page)).length;
      const q = `.ac-session .session-item:nth-last-child(2)`;
      await page.hover(q);
      await page.click(`${q} [data-ac-msg="edit"]`);
      await page.fill(`${q} .ac-edit .textarea`, 'Plan a three-day trip to Lisbon');
      await page.click(`${q} .ac-edit [type="submit"]`);
      await idle(page);
      assert.equal((await turns(page)).length, before);
      assert.match(await lastAnswer(page), /^Three days in Lisbon/);
      await page.hover(q);
      await page.click(`${q} [data-ac-msg="delete"]`);
      await page.waitForSelector('#ac-confirm[open]');
      assert.equal(await page.textContent('#ac-confirm-title'), 'Delete message?');
      await page.click('[data-ac-confirm-ok]');
      await page.waitForFunction(
        (n) => document.querySelectorAll('.ac-session .session-item').length === n,
        before - 2,
      );
    },
  );

  await check(
    'attachments: an image, audio, video, a text file and a PDF - chips, then a media bubble, the Audio and Video players and attachment cards',
    async () => {
      await page.click('[data-ac-new]');
      await page.setInputFiles('[data-ac-file]', [
        PHOTO,
        MP3,
        WEBM,
        { name: 'notes.md', mimeType: 'text/markdown', buffer: Buffer.from('# Notes\nline two\nline three') },
        { name: 'report.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 demo') },
      ]);
      await page.waitForFunction(() => document.querySelectorAll('.file-drop-item').length === 5);
      assert.deepEqual(
        await page.$$eval('.file-drop-item', (l) =>
          l.map((x) => (x as HTMLElement).dataset.kind + ' ' + x.querySelector('.file-drop-meta')!.textContent),
        ),
        ['image 640 × 400', 'audio 0:24', 'video 0:24', 'text 1 kB', 'file 1 kB'],
      );
      assert.match(
        (await page.getAttribute('.file-drop-item[data-kind="image"] img', 'src')) || '',
        /^data:image\/webp/,
      );
      await ask(page, 'What are these?');
      attachHash = new URL(page.url()).hash;
      const q = '.ac-session .session-item:nth-last-child(2)';
      assert.equal(await page.$$eval(`${q} .ac-files > .bubble .ac-image[data-media] img`, (i) => i.length), 1);
      assert.equal(
        await page.$eval(`${q} .ac-files .audio`, (a) => !!(a as any).api && a.hasAttribute('data-init')),
        true,
      );
      assert.equal(
        await page.$eval(`${q} .ac-files .video`, (a) => !!(a as any).api && !!a.querySelector('video')),
        true,
      );
      assert.deepEqual(
        await page.$$eval(`${q} .message-attachment`, (l) =>
          l.map((x) => [
            x.tagName,
            x.querySelector('.message-attachment-name')!.textContent,
            x.getAttribute('download'),
          ]),
        ),
        [
          ['A', 'notes.md', 'notes.md'],
          ['A', 'report.pdf', 'report.pdf'],
        ],
      );
      assert.equal(await page.textContent(`${q} .bubble-content:not([data-media])`), 'What are these?');
      // the demo model measures what it can
      const a = await lastAnswer(page);
      assert.match(a, /valley\.webp - an image, 640 × 400 px, mostly \w+ \(#[0-9a-f]{6}\)/);
      assert.match(a, /harbour\.mp3 - audio, 0:24 long/);
      assert.match(a, /harbour\.webm - a video, 640 × 360, 0:24 long/);
      assert.match(a, /notes\.md - text, 3 lines and 6 words, starting "# Notes"/);
      assert.match(a, /report\.pdf - application\/pdf/);
      assert.doesNotMatch(a, /Tokens - the text/, 'a question about the files gets no unrelated answer');
      // a picture opens in a Dialog
      await page.click(`${q} .ac-image`);
      await page.waitForSelector('#ac-preview[open]');
      assert.equal(await page.textContent('#ac-preview-title'), 'valley.webp');
      assert.equal(
        await page.getAttribute('[data-ac-preview-img]', 'src'),
        await page.getAttribute(`${q} .ac-image img`, 'src'),
      );
      assert.equal(await page.getAttribute('[data-ac-preview-download]', 'download'), 'valley.webp');
      await page.click('#ac-preview [data-dialog-close]');
    },
  );

  await check('attachments arrive by paste and by a drop on the conversation; a chip removes its file', async () => {
    await page.evaluate(async () => {
      const bytes = await (await fetch('../images/photos/1015-640x400.webp')).blob();
      const dt = new DataTransfer();
      dt.items.add(new File([bytes], 'pasted.webp', { type: 'image/webp' }));
      document
        .querySelector('[data-ac-composer] .textarea')!
        .dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    await page.waitForFunction(() => document.querySelectorAll('.file-drop-item').length === 1);
    assert.equal(await page.getAttribute('#ac-session', 'data-drop-label'), 'Drop files to attach');
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.items.add(new File(['a,b\n1,2'], 'table.csv', { type: 'text/csv' }));
      const session = document.querySelector('#ac-session')!;
      session.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }));
      session.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
      session.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    });
    await page.waitForFunction(() => document.querySelectorAll('.file-drop-item').length === 2);
    assert.deepEqual(
      await page.$$eval('.file-drop-item .file-drop-name', (l) => l.map((x) => x.firstChild!.textContent)),
      ['pasted.webp', 'table.csv'],
    );
    await page.click('.file-drop-item:first-child .file-drop-remove');
    await page.click('.file-drop-item:first-child .file-drop-remove');
    assert.equal(await page.$$eval('.file-drop-item', (l) => l.length), 0);
  });

  await check(
    'Examples: the sidebar lists conversations with Chat Components; an answered card shows its answers read only',
    async () => {
      assert.deepEqual(
        await page.$$eval('[data-ac-group="examples"] .sidebar-link', (l) =>
          l.map((x) => (x.textContent || '').trim()),
        ),
        [
          'Confirm a release plan',
          'Budget for the redesign',
          'Book a table',
          'A project brief, step by step',
          'Pick a plan (quick replies)',
          'Feedback, answered',
          'Support bot (Chat Script)',
          'Pizza order (Chat Script)',
        ],
      );
      await page.click('[data-ac-chat="ex-deploy"] .sidebar-link');
      await page.waitForSelector('.ac-session .chat-components[data-init] .chat-components-plan');
      assert.equal(await page.$eval('.ac-session .chat-components', (c: any) => c.dataset.stateName), 'answered');
      assert.deepEqual(
        await page.$$eval('.ac-session .chat-components [name="steps"]', (l: any[]) =>
          l.map((i) => `${i.value}:${i.checked}:${i.disabled}`),
        ),
        ['backup:true:true', 'migrate:true:true', 'canary:true:true', 'all:false:true'],
      );
      assert.equal(await lastAnswer(page), 'Scheduled for 22:00: 3 steps. I will post here when the canary is live.');
    },
  );

  await check(
    'a card in an example: answering it writes your turn and the demo model replies; the card stays answered after a reload',
    async () => {
      await page.click('[data-ac-chat="ex-booking"] .sidebar-link');
      await page.waitForSelector('.ac-session .chat-components[data-init] input[name="day"]');
      await page.fill('.ac-session input[name="day"]', '2026-12-04');
      await page.click('.ac-session [data-chat-action="book"]');
      await page.waitForSelector('[data-ac-send][data-streaming]');
      await idle(page);
      assert.deepEqual(await turns(page), ['user', 'assistant', 'user', 'assistant']);
      assert.equal(
        await page.$eval('.ac-session .session-item:nth-last-child(2) .bubble-content', (b) => b.textContent),
        'Day: 2026-12-04; Time: 19:30; Guests: 2; Seating: -',
      );
      assert.match(
        await lastAnswer(page),
        /^Thanks - noted: Day: 2026-12-04; Time: 19:30; Guests: 2; Seating: -\.\s*Booked - a confirmation is on its way\.$/,
      );
      await page.reload();
      await page.waitForSelector('.ac-session .chat-components[data-init]');
      assert.equal(await page.$eval('.ac-session .chat-components', (c: any) => c.dataset.stateName), 'answered');
      assert.equal(await page.$eval('.ac-session input[name="day"]', (i: any) => i.value), '2026-12-04');
    },
  );

  await check(
    'a question that needs a structured answer gets a card from the demo model (a marker while the fence streams in)',
    async () => {
      await page.click('[data-ac-new]');
      await page.evaluate(() => {
        const seen = new MutationObserver(() => {
          if (document.querySelector('.ac-session .marker [data-shimmer]')?.textContent === 'Preparing a card...') {
            (globalThis as any).__cardMarker = true;
            seen.disconnect();
          }
        });
        seen.observe(document.querySelector('.ac-session')!, { childList: true, subtree: true, characterData: true });
      });
      await ask(page, 'Which plan should we take?');
      assert.equal(await page.evaluate(() => (globalThis as any).__cardMarker), true);
      await page.click('.ac-session .session-item:last-child [data-chat-action="compare"]');
      await page.waitForSelector('[data-ac-send][data-streaming]');
      await idle(page);
      assert.match(await lastAnswer(page), /Starter: one workspace/);
    },
  );

  await check(
    'a Chat Script as a chat: the bot says its lines and asks with cards, branches on the answer, keeps the run across a reload',
    async () => {
      await page.click('[data-ac-chat="ex-support"] .sidebar-link');
      await page.waitForSelector('.ac-session .chat-components[data-init] [data-chat-action="refund"]');
      assert.equal(await page.textContent('[data-ac-model-name]'), 'Ada (script)');
      assert.equal(
        await page.$$eval('.ac-session .message-footer', (l) => l.length),
        0,
        'no generation actions on scripted turns',
      );
      await page.click('.ac-session [data-chat-action="refund"]');
      await page.waitForSelector('.ac-session .chat-components[data-init] input[name="order"]');
      await page.fill('.ac-session input[name="order"]', 'NW-4711');
      await page.fill('.ac-session .chat-components:has(input[name="order"]) .number-input input[type="text"]', '150');
      await page.click('.ac-session [data-chat-action="request"]');
      await page.waitForFunction(() =>
        /Jonas emails you about order NW-4711/.test(document.querySelector('.ac-session')!.textContent || ''),
      );
      // a script follows the end of the conversation: the window stays filled, no room reserved under an answer
      await page.waitForSelector('.ac-session [data-chat-action="yes"]');
      await page.waitForTimeout(400);
      const fill = await page.$eval('.ac-session .session-viewport', (v) => ({
        fromEnd: Math.round(v.scrollHeight - v.scrollTop - v.clientHeight),
        pad: (v.querySelector('.session-content') as HTMLElement).style.paddingBlockEnd,
      }));
      assert.deepEqual(fill, { fromEnd: 0, pad: '' });
      // typed text the node does not route: the fallback
      await page.waitForSelector('.ac-session [data-chat-action="yes"]');
      await page.fill('[data-ac-composer] .textarea', 'hmm');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() =>
        /Pick one of the buttons above/.test(document.querySelector('.ac-session')!.textContent || ''),
      );
      const before = await turns(page);
      await page.reload();
      await page.waitForSelector('.ac-session .chat-components[data-init] [data-chat-action="yes"]');
      assert.deepEqual(await turns(page), before, 'the transcript is kept');
      await page.click('.ac-session [data-chat-action="yes"]');
      await page.waitForFunction(
        () => document.querySelectorAll('.ac-session [data-chat-action="refund"]').length === 2,
      );
      await page.click('[data-ac-new]');
    },
  );

  await check('the model picker: Echo repeats the message', async () => {
    await page.click('.ac-model');
    await page.click('#ac-models [data-value="echo"]');
    assert.equal(await page.textContent('.ac-model [data-ac-model-name]'), 'Echo');
    await ask(page, 'ping 42');
    assert.equal(await lastAnswer(page), 'ping 42');
    assert.equal(await page.$eval('.ac-session .session-item:last-child .message-name', (e) => e.textContent), 'Echo');
    await page.click('.ac-model');
    await page.click('#ac-models [data-value="lumen-8b"]');
  });

  await check(
    'the chat list: a row opens its chat, the search filters, pin moves it, rename edits in place, delete asks first',
    async () => {
      await page.click('[data-ac-chat="sql"] .sidebar-link');
      await page.waitForFunction(() => location.hash === '#/c/sql');
      await page.waitForSelector('.ac-session .mockup-code');
      assert.equal(
        await page.$eval('[data-ac-chat="sql"] .sidebar-link', (e) => e.getAttribute('aria-current')),
        'page',
      );
      await page.fill('[data-ac-search]', 'haiku');
      assert.deepEqual(await chatTitles(page), ['A haiku about autumn rain']);
      await page.fill('[data-ac-search]', 'nothing like this');
      assert.equal(await page.$eval('[data-ac-none]', (e) => (e as HTMLElement).hidden), false);
      await page.fill('[data-ac-search]', '');
      await page.hover('[data-ac-chat="haiku"]');
      await page.click('[data-ac-chat="haiku"] .ac-chat-more');
      await page.click('#ac-menu-haiku [data-ac-chat-act="pin"]');
      assert.equal(await page.$$eval('[data-ac-group="pinned"] [data-ac-chat="haiku"]', (r) => r.length), 1);
      await page.hover('[data-ac-chat="haiku"]');
      await page.click('[data-ac-chat="haiku"] .ac-chat-more');
      await page.click('#ac-menu-haiku [data-ac-chat-act="rename"]');
      await page.fill('[data-ac-chat="haiku"] .ac-rename', 'Rain haiku');
      await page.keyboard.press('Enter');
      assert.equal((await page.textContent('[data-ac-chat="haiku"] .sidebar-link'))?.trim(), 'Rain haiku');
      await page.hover('[data-ac-chat="sql"]');
      await page.click('[data-ac-chat="sql"] .ac-chat-more');
      await page.click('#ac-menu-sql [data-ac-chat-act="delete"]');
      await page.waitForSelector('#ac-confirm[open]');
      assert.equal(await page.textContent('#ac-confirm-title'), 'Delete "Window functions in SQL"?');
      await page.click('[data-ac-confirm-ok]');
      await toasted(page, 'Chat deleted');
      await page.waitForFunction(
        () => location.hash === '#/' && document.querySelector('#ac-session')!.hasAttribute('data-empty'),
      );
      assert.equal(await page.$$eval('[data-ac-chat="sql"]', (r) => r.length), 0);
    },
  );

  await check(
    'Controls: the sliders show their value; the system prompt reaches the model; reset restores the defaults',
    async () => {
      await page.click('.ac-top [data-sidebar-trigger="ac-controls"]');
      assert.equal(await page.$eval('#ac-controls', (e) => e.getAttribute('data-state')), 'expanded');
      await page.$eval('#ac-temp', (e: HTMLInputElement) => {
        e.value = '1.2';
        e.dispatchEvent(new Event('input', { bubbles: true }));
      });
      assert.equal(await page.textContent('[data-ac-out="temperature"]'), '1.2');
      await page.fill('[name="systemPrompt"]', 'You are a pirate.');
      await ask(page, 'Tell me about tides');
      assert.match(await lastAnswer(page), /^Arr - /);
      await page.click('[data-ac-reset]');
      assert.equal(await page.inputValue('[name="systemPrompt"]'), 'You are a helpful assistant.');
      assert.equal(await page.textContent('[data-ac-out="temperature"]'), '0.7');
    },
  );

  await check(
    'an OpenAI-compatible API: the request carries key, model, system prompt and sampling; the SSE reply streams with its reasoning',
    async () => {
      await page.click('#ac-conn-api');
      assert.equal(await page.$eval('[data-ac-api]', (e) => (e as HTMLFieldSetElement).disabled), false);
      await page.fill('#ac-base', `http://localhost:${api.port}/v1`);
      await page.fill('#ac-key', 'test-key');
      await page.fill('#ac-model-id', 'stub-model');
      assert.equal(await page.$eval('[data-ac-conn-badge]', (e) => (e as HTMLElement).hidden), false);
      assert.equal(await page.textContent('.ac-model [data-ac-model-name]'), 'stub-model');
      await page.click('[data-ac-new]');
      await ask(page, 'Hello there');
      assert.equal(await lastAnswer(page), 'Hello from stub-model over SSE.');
      assert.equal(
        await page.$eval('.ac-session .session-item:last-child .ac-md strong', (e) => e.textContent),
        'stub-model',
      );
      assert.equal(
        await page.$eval('.ac-session .session-item:last-child .ac-think-body', (e) => e.textContent),
        'The user greets; answer briefly.',
      );
      const r = requests.at(-1)!;
      assert.equal(r.auth, 'Bearer test-key');
      assert.equal(r.body.model, 'stub-model');
      assert.equal(r.body.stream, true);
      assert.equal(r.body.temperature, 0.7);
      assert.equal(r.body.messages.length, 2);
      assert.equal(r.body.messages[1].content, 'Hello there');
      assert.equal(r.body.messages[0].role, 'system');
      assert.match(
        r.body.messages[0].content,
        /^You are a helpful assistant\.\n\nWhen a structured answer .* ui::component-schema /,
      );
      assert.equal(r.body.tools.length, 1);
      assert.equal(r.body.tools[0].function.name, 'show_components');
      assert.equal(r.body.tools[0].function.parameters.title, 'Component Schema');
      // a tool call becomes a card (the same fence, stored with the answer); its answer goes back as text + JSON
      await ask(page, 'A card please');
      await page.waitForSelector(
        '.ac-session .session-item:last-child .chat-components[data-init] input[name="seats"]',
      );
      assert.equal(
        (await page.textContent('.ac-session .session-item:last-child .bubble-content'))?.trim(),
        'One question:',
      );
      await page.fill('.ac-session .session-item:last-child input[name="seats"]', '12');
      await page.click('.ac-session .session-item:last-child [data-chat-action="ok"]');
      await page.waitForSelector('[data-ac-send][data-streaming]');
      await idle(page);
      assert.equal(await lastAnswer(page), 'Got your answer.');
      const sent = requests.at(-1)!.body.messages;
      assert.match(
        sent.at(-2).content,
        /^One question:\n\n```ui::component-schema\n\{"version":1,"id":"seats"/,
        'the history carries the card as a fence',
      );
      assert.equal(
        sent.at(-1).content,
        'Seats: 12\n\n```json\n{"id":"seats","action":"ok","answers":{"seats":12}}\n```',
      );
      // a fence written in pieces: a marker while it is open, the card once it closes
      await ask(page, 'A fence please');
      assert.equal(
        await page.$$eval('.ac-session .session-item:last-child .chat-components input[name="seats"]', (l) => l.length),
        1,
      );
      // without the switch: no tool, no card instructions
      await page.click('#ac-tool');
      await ask(page, 'Hello again');
      assert.equal(requests.at(-1)!.body.tools, undefined);
      assert.equal(requests.at(-1)!.body.messages[0].content, 'You are a helpful assistant.');
      await page.click('#ac-tool');
      // a picture goes to the API as an image_url part beside the text
      await page.setInputFiles('[data-ac-file]', [PHOTO]);
      await page.waitForFunction(() => document.querySelectorAll('.file-drop-item').length === 1);
      await ask(page, 'Describe it');
      const vision = requests.at(-1)!.body.messages.at(-1);
      assert.equal(vision.role, 'user');
      assert.equal(vision.content[0].type, 'text');
      assert.equal(vision.content[0].text, 'Describe it');
      assert.equal(vision.content[1].type, 'image_url');
      assert.match(vision.content[1].image_url.url, /^data:image\/webp;base64,/);
      // a server that fails: the answer says so in a destructive Alert
      await page.fill('#ac-base', `http://localhost:${api.port}/broken/v1`);
      await ask(page, 'Again');
      await page.waitForSelector('.ac-session .session-item:last-child .alert[data-variant="destructive"]');
      assert.match((await page.textContent('.ac-session .session-item:last-child .alert-description')) || '', /^500 /);
      await page.click('#ac-conn-demo');
      assert.equal(await page.$eval('[data-ac-api]', (e) => (e as HTMLFieldSetElement).disabled), true);
      await page.click('#ac-controls [data-sidebar-trigger="ac-controls"]');
    },
  );

  await check('Markdown from a model is cleaned: no script, handler or javascript: link reaches the page', async () => {
    const html = await page.evaluate(async () => {
      const { marked } = await import('https://cdn.jsdelivr.net/npm/marked@18.1.0/lib/marked.esm.js' as string);
      return marked.parse(
        '<img src=x onerror="globalThis.__xss=1"><script>globalThis.__xss=2</script>[a](javascript:alert(1))',
      );
    });
    assert.ok(html.includes('onerror'), 'marked passes raw HTML through');
    // through the app: an Echo of the same text
    await page.click('.ac-model');
    await page.click('#ac-models [data-value="echo"]');
    await ask(
      page,
      '<img src=x onerror="globalThis.__xss=1"><script>globalThis.__xss=2</script>[a](javascript:alert(1))',
    );
    const out = await page.$eval('.ac-session .session-item:last-child .ac-md', (e) => ({
      html: e.innerHTML,
      xss: (globalThis as any).__xss,
    }));
    assert.equal(out.xss, undefined);
    assert.doesNotMatch(out.html, /onerror|<script|<img|javascript:/i);
    await page.click('.ac-model');
    await page.click('#ac-models [data-value="lumen-8b"]');
  });

  await check('settings: Enter sends can be turned off (Ctrl+Enter sends); dark mode toggles the page', async () => {
    await page.click('.ac-user');
    await page.click('#ac-user-menu [data-dialog-trigger="ac-settings"]');
    await page.waitForSelector('#ac-settings[open]');
    await page.click('label[for="ac-enter"]');
    await page.click('label[for="ac-dark"]');
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), true);
    await page.click('#ac-settings [data-dialog-close]');
    await page.click('[data-ac-new]');
    await page.fill('[data-ac-composer] .textarea', 'one');
    await page.press('[data-ac-composer] .textarea', 'Enter');
    assert.equal(await page.inputValue('[data-ac-composer] .textarea'), 'one\n');
    await page.press('[data-ac-composer] .textarea', 'Control+Enter');
    await idle(page);
    assert.deepEqual(await turns(page), ['user', 'assistant']);
    await page.click('.ac-user');
    await page.click('#ac-user-menu [data-dialog-trigger="ac-settings"]');
    await page.click('label[for="ac-enter"]');
    await page.click('label[for="ac-dark"]');
    await page.click('#ac-settings [data-dialog-close]');
  });

  await check(
    'light / dark: the Swap at the top of the sidebar switches the page and the Settings switch follows',
    async () => {
      const dark = () => page.evaluate(() => document.documentElement.classList.contains('dark'));
      const before = await dark();
      await page.click('.ac-nav .sidebar-header .ac-mode');
      assert.equal(await dark(), !before);
      assert.equal(await page.$eval('[data-ac-mode]', (i: any) => i.checked), !before);
      assert.equal(await page.$eval('[data-ac-dark]', (i: any) => i.checked), !before);
      await page.click('.ac-nav .sidebar-header .ac-mode');
      assert.equal(await dark(), before);
    },
  );

  await check('chats and settings are kept across a reload', async () => {
    const titles = await page.$$eval('.ac-nav .ac-chat .sidebar-link', (r) =>
      r.map((x) => (x.textContent || '').trim()),
    );
    await page.reload();
    await page.waitForFunction(() => !!document.querySelector('.ac-nav .ac-chat'));
    assert.deepEqual(
      await page.$$eval('.ac-nav .ac-chat .sidebar-link', (r) => r.map((x) => (x.textContent || '').trim())),
      titles,
    );
    assert.ok(titles.includes('Rain haiku'));
    // a picture is kept with the chat; audio, video and files live for one visit and say so
    await page.evaluate((h) => (location.hash = h), attachHash);
    await page.waitForSelector('.ac-session .ac-image img');
    assert.match((await page.getAttribute('.ac-session .ac-image img', 'src')) || '', /^data:image\/webp/);
    assert.equal(await page.$$eval('.ac-session [data-ac-gone]', (l) => l.length), 4);
    assert.equal(
      (await page.textContent('.ac-session [data-ac-gone] .message-attachment-meta'))?.trim(),
      'Not kept after a reload',
    );
  });

  await check('sign out leads to the sign-in; a wrong password says so; the demo account signs in', async () => {
    await page.click('.ac-user');
    await page.click('#ac-user-menu [data-ac-action="sign-out"]');
    await page.waitForFunction(() => location.hash === '#/auth');
    assert.equal(await page.$eval('[data-ac-auth]', (e) => (e as HTMLElement).checkVisibility()), true);
    await page.fill('#ac-email', 'ada@example.com');
    await page.fill('#ac-password', 'wrong');
    await page.click('[data-ac-signin] [type="submit"]');
    assert.equal(await page.$eval('[data-ac-auth-error]', (e) => (e as HTMLElement).hidden), false);
    await page.fill('#ac-password', 'lumen');
    await page.click('[data-ac-signin] [type="submit"]');
    await toasted(page, 'Welcome back, Ada');
    await page.waitForFunction(() => location.hash === '#/');
    assert.equal(await page.$eval('[data-ac-auth]', (e) => (e as HTMLElement).hidden), true);
  });

  await check('delete all chats asks first and empties the list', async () => {
    await page.click('.ac-user');
    await page.click('#ac-user-menu [data-dialog-trigger="ac-settings"]');
    await page.click('#ac-settings [data-ac-action="clear-all"]');
    await page.waitForSelector('#ac-confirm[open]');
    assert.equal(await page.textContent('#ac-confirm-title'), 'Delete all chats?');
    await page.click('[data-ac-confirm-ok]');
    await page.waitForFunction(() => !document.querySelector('.ac-nav .ac-chat'));
    assert.equal(await page.$$eval('[data-ac-group]', (g) => g.every((x) => (x as HTMLElement).hidden)), true);
    // deleted examples stay deleted after a reload
    await page.reload();
    await page.waitForSelector('[data-ac-list]');
    await page.waitForTimeout(300);
    assert.equal(await page.$$eval('.ac-nav .ac-chat', (l) => l.length), 0);
  });

  await check('chats kept from a visit before the examples existed get the Examples group once', async () => {
    // VERIFIED (the maintainer's browser): stored chats from an earlier visit never showed the seeded examples
    await page.evaluate(() => localStorage.removeItem('lumen:examples'));
    await page.reload();
    await page.waitForSelector('[data-ac-group="examples"]:not([hidden]) .ac-chat');
    assert.equal(await page.$$eval('[data-ac-group="examples"] .ac-chat', (l) => l.length), 8);
  });

  await check('the page ran without errors', async () => {
    assert.deepEqual(errors, []);
  });
  await page.context().close();

  await check(
    'German: every target and attribute in both languages; the script writes its words in German too',
    async () => {
      const p = await open();
      assert.deepEqual(await translationGaps(p, '[data-ac]'), [], 'every target and attribute in English and German');
      assert.equal(await renderedLanguage(p, '[data-ac]'), 'en');
      await chooseLanguage(p, 'de');
      assert.equal(await renderedLanguage(p, '[data-ac]'), 'de');
      assert.equal((await p.textContent('[data-i18n-target="greeting"]'))?.trim(), 'Wie kann ich dir heute helfen?');
      assert.equal(await p.getAttribute('[data-ac-composer] .textarea', 'placeholder'), 'Nachricht senden');
      await p.click('[data-ac-chat="welcome"] .sidebar-link');
      await p.waitForSelector('.ac-session .session-item [data-ac-msg="regenerate"]');
      assert.equal(
        await p.getAttribute('.ac-session .session-item:last-child [data-ac-msg="regenerate"]', 'aria-label'),
        'Neu erzeugen',
      );
      assert.equal(await p.getAttribute('[data-ac-chat="welcome"] .ac-chat-more', 'aria-label'), 'Chat-Optionen');
      await p.context().close();
    },
  );

  await check(
    'a voice message: the microphone records, the chip names it and its length, it plays in the Audio player',
    async () => {
      const mic = await chromium.launch({
        args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
      });
      try {
        const ctx = await mic.newContext({ viewport: { width: 1400, height: 900 } });
        await ctx.grantPermissions(['microphone'], { origin: server.url });
        const p = await ctx.newPage();
        await offlineJsdelivr(p);
        await p.goto(`${server.url}${PAGE}`);
        await p.waitForFunction(() => !!document.querySelector('.ac-nav .ac-chat'));
        await p.click('[data-ac-record]');
        await p.waitForSelector('[data-ac-recording]:not([hidden])');
        assert.equal(await p.getAttribute('[data-ac-record]', 'aria-pressed'), 'true');
        await p.waitForTimeout(1300);
        await p.click('[data-ac-record]');
        await p.waitForFunction(() => document.querySelectorAll('.file-drop-item').length === 1);
        assert.equal(await p.getAttribute('.file-drop-item', 'data-kind'), 'audio');
        assert.match((await p.textContent('.file-drop-item .file-drop-name')) || '', /^Voice message \d/);
        assert.match((await p.textContent('.file-drop-item .file-drop-meta')) || '', /^0:0[1-2]$/);
        assert.equal(await p.$eval('[data-ac-recording]', (e) => (e as HTMLElement).hidden), true);
        await p.click('[data-ac-send]');
        await idle(p);
        assert.equal(await p.$eval('.ac-session .ac-files .audio', (a) => !!(a as any).api), true);
        assert.match(await lastAnswer(p), /Voice message .* - audio, 0:0[1-2] long/);
      } finally {
        await mic.close();
      }
    },
  );

  await check('narrow: the sidebar starts closed, opens over the conversation and a scrim closes it', async () => {
    const p = await open(390, 800);
    assert.equal(await p.$eval('.ac-nav', (e) => e.getAttribute('data-state')), 'collapsed');
    assert.equal(await p.$eval('.ac-nav', (e) => (e as HTMLElement).checkVisibility()), false);
    await p.click('.ac-top [data-sidebar-trigger="ac-nav"]');
    assert.equal(await p.$eval('.ac-nav', (e) => getComputedStyle(e).position), 'absolute');
    assert.equal(await p.$eval('[data-ac-scrim]', (e) => (e as HTMLElement).checkVisibility()), true);
    await p.mouse.click(370, 400);
    assert.equal(await p.$eval('.ac-nav', (e) => e.getAttribute('data-state')), 'collapsed');
    // a chat picked from the opened sidebar closes it
    await p.click('.ac-top [data-sidebar-trigger="ac-nav"]');
    await p.click('[data-ac-chat="welcome"] .sidebar-link');
    await p.waitForFunction(() => document.querySelector('.ac-nav')!.getAttribute('data-state') === 'collapsed');
    await p.waitForSelector('.ac-session .session-item');
    assert.equal(
      await p.$$eval('.ac-suggestions li', (l) => l.filter((x) => (x as HTMLElement).checkVisibility()).length),
      0,
    );
    await p.context().close();
  });
} finally {
  await browser.close();
  server.stop();
  api.stop(true);
}
if (failures) {
  console.error(`scaffold-ai-chat.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('scaffold-ai-chat.e2e: all checks passed');
