import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';
import { offlineJsdelivr } from './lib/vendor-offline.ts';

/**
 * Why: E2E for the shipped Editor.js integration. The official editor, its
 * tools and marked are served OFFLINE from the pinned devDependencies
 * (node_modules/@editorjs/*, node_modules/marked - the exact builds the
 * component requests from jsDelivr) through a Playwright route, so every
 * request is counted and the pinned paths are asserted. Verifies: lazy
 * loading (no editor → nothing requested; three editors → each build once),
 * Markdown → blocks → Markdown round trip, a JSON source, a tool subset,
 * the Toolbar commands (inline + block) with their toggles, the blocks API,
 * the change event, the readonly state and the render contract.
 */

const FIXTURE = '/tests/e2e/editorjs.e2e-fixture.html';
const CDN = 'https://cdn.jsdelivr.net/npm/';
const EDITOR = `${CDN}@editorjs/editorjs@2.31.7/dist/editorjs.mjs`;
const MARKED = `${CDN}marked@18.1.0/lib/marked.esm.js`;
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

/** the pinned CDN builds, served from node_modules (tests/e2e/lib/vendor-offline.ts) */
const offlineVendor = offlineJsdelivr;

const waitReady = (page: Page) => page.waitForFunction(() =>
  [...document.querySelectorAll('.editorjs')].every((e) => (e as HTMLElement).hasAttribute('data-ready') || (e as HTMLElement).hasAttribute('data-error')),
  undefined, { timeout: 30000 });

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
    el.focus();
    const s = getSelection()!;
    s.removeAllRanges();
    s.addRange(range);
    return true;
  }
  return false;
}, { sel, text });

try {
  await check('the adapter pins editorjs@2.31.7 and marked@18.1.0 (never @latest)', async () => {
    const src = readFileSync(resolve(import.meta.dirname, '../../dist/components/editorjs/editorjs.js'), 'utf8');
    assert.ok(src.includes(EDITOR));
    assert.ok(src.includes(MARKED));
    assert.doesNotMatch(src, /(editorjs|marked)@latest/);
  });

  await check('no editor on the page → nothing is requested', async () => {
    const page = await browser.newPage();
    const requests = await offlineVendor(page);
    await page.route(`${server.url}/tests/e2e/__editorjs-empty.html`, (route) => route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><link rel="stylesheet" href="/dist/components/editorjs/editorjs.css"><p>none</p><script type="module" src="/dist/components/core.js"></script><script type="module" src="/dist/components/editorjs/editorjs.js"></script>',
    }));
    await page.goto(`${server.url}/tests/e2e/__editorjs-empty.html`);
    await page.waitForFunction(() => !!globalThis.df$?.shadcn?.editorjsApi);
    await page.waitForTimeout(500);
    assert.deepEqual(requests, []);
    await page.close();
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const requests = await offlineVendor(page);
  await page.goto(`${server.url}${FIXTURE}`);
  await waitReady(page);

  await check('three editors → the editor, marked and each tool are requested exactly once, all pinned', async () => {
    const states = await page.$$eval('.editorjs', (els) => els.map((e) => (e.hasAttribute('data-ready') ? 'ready' : 'error')));
    assert.deepEqual(states, ['ready', 'ready', 'ready']);
    const counts = new Map<string, number>();
    for (const u of requests) counts.set(u, (counts.get(u) ?? 0) + 1);
    assert.ok([...counts.values()].every((n) => n === 1), `each build once: ${[...counts.entries()].filter(([, n]) => n > 1).map(([u]) => u).join(', ')}`);
    assert.ok(counts.has(EDITOR) && counts.has(MARKED));
    assert.equal(requests.filter((u) => u.includes('@editorjs/')).length, 9, 'the editor + 8 tools');
  });

  await check('Markdown renders as blocks: heading, paragraph with inline formatting, nested list, quote, code, rule, table', async () => {
    const r = await page.evaluate(() => {
      const el = document.getElementById('ed-md')!;
      const blocks = [...el.querySelectorAll('.ce-block')];
      return {
        count: blocks.length,
        ids: blocks.map((b) => (b as HTMLElement).dataset.id),
        h1: el.querySelector('h1.ce-header')?.textContent,
        inline: el.querySelector('.ce-paragraph')?.innerHTML ?? '',
        nested: el.querySelectorAll('.cdx-list__item .cdx-list__item').length,
        quote: el.querySelector('.cdx-quote__text')?.textContent?.trim(),
        code: (el.querySelector('.ce-code__textarea') as HTMLTextAreaElement | null)?.value,
        rule: !!el.querySelector('.ce-delimiter'),
        cells: el.querySelectorAll('.tc-cell').length,
      };
    });
    assert.equal(r.count, 7);
    assert.deepEqual(r.ids, ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'], 'deterministic block ids');
    assert.equal(r.h1, 'Design brief');
    assert.match(r.inline, /<(b|strong)>bold<\/\1>/);
    assert.match(r.inline, /<(i|em)>italic<\/\1>/);
    assert.match(r.inline, /<code class="inline-code">code<\/code>/);
    assert.match(r.inline, /<a href="https:\/\/example\.org">link<\/a>/);
    assert.equal(r.nested, 1);
    assert.equal(r.quote, 'A quote.');
    assert.equal(r.code, 'const x = 1;');
    assert.equal(r.rule, true);
    assert.equal(r.cells, 4);
  });

  await check('the round trip gives the Markdown back', async () => {
    const md = await page.evaluate(() => globalThis.df$.shadcn.editorjs!.markdown('#ed-md'));
    assert.equal(md, [
      '# Design brief',
      'A paragraph with **bold**, *italic*, `code` and a [link](https://example.org).',
      '- a list\n- with items\n  - nested',
      '> A quote.',
      '```\nconst x = 1;\n```',
      '---',
      '| Column | Value |\n| --- | --- |\n| a | 1 |',
    ].join('\n\n') + '\n');
  });

  await check('a JSON source renders its blocks with their ids; a tool subset starts empty with the placeholder', async () => {
    const r = await page.evaluate(() => ({
      ids: [...document.querySelectorAll('#ed-json .ce-block')].map((b) => (b as HTMLElement).dataset.id),
      h2: document.querySelector('#ed-json h2.ce-header')?.textContent,
      readonly: document.getElementById('ed-json')!.api!.getState().name,
      subBlocks: document.querySelectorAll('#ed-sub .ce-block').length,
      placeholder: document.querySelector('#ed-sub .ce-paragraph')?.getAttribute('data-placeholder-active') ?? document.querySelector('#ed-sub .ce-paragraph')?.getAttribute('data-placeholder'),
    }));
    assert.deepEqual(r.ids, ['h1', 'p1', 'l1']);
    assert.equal(r.h2, 'Release notes');
    assert.equal(r.readonly, 'readonly');
    assert.equal(r.subBlocks, 1, 'one empty paragraph');
    assert.equal(r.placeholder, 'Notes');
  });

  await check('toolbar: Bold on a selection wraps it; the toggle reports the formatting', async () => {
    assert.equal(await select(page, '#ed-md .ce-paragraph', 'paragraph'), true);
    await page.click('#ed-bar [data-editor-command="bold"]');
    await page.waitForFunction(() => /<(b|strong)>paragraph<\/(b|strong)>/.test(document.querySelector('#ed-md .ce-paragraph')!.innerHTML));
    await page.waitForFunction(() => document.querySelector('#ed-bar [data-editor-command="bold"]')!.getAttribute('aria-pressed') === 'true');
  });

  await check('toolbar: Highlight and Inline code wrap the selection in the tools\' markup', async () => {
    assert.equal(await select(page, '#ed-md .ce-paragraph', 'with'), true);
    await page.click('#ed-bar [data-editor-command="marker"]');
    assert.match(await page.$eval('#ed-md .ce-paragraph', (p) => p.innerHTML), /<mark class="cdx-marker">with<\/mark>/);
    assert.equal(await select(page, '#ed-md .ce-paragraph', 'and'), true);
    await page.click('#ed-bar [data-editor-command="inline-code"]');
    assert.match(await page.$eval('#ed-md .ce-paragraph', (p) => p.innerHTML), /<code class="inline-code">and<\/code>/);
  });

  await check('toolbar: Heading 2 converts the current block, Paragraph converts it back; the block toggles follow', async () => {
    assert.equal(await select(page, '#ed-md .ce-paragraph', 'A'), true);
    await page.click('#ed-bar [data-editor-command="header:2"]');
    await page.waitForFunction(() => document.querySelectorAll('#ed-md h2.ce-header').length === 1);
    await page.waitForFunction(() => document.querySelector('#ed-bar [data-editor-command="header:2"]')!.getAttribute('aria-pressed') === 'true');
    assert.equal(await page.$eval('#ed-bar [data-editor-command="paragraph"]', (b) => b.getAttribute('aria-pressed')), 'false');
    assert.equal(await select(page, '#ed-md h2.ce-header', 'A'), true);
    await page.click('#ed-bar [data-editor-command="paragraph"]');
    await page.waitForFunction(() => document.querySelectorAll('#ed-md h2.ce-header').length === 0 && document.querySelectorAll('#ed-md .ce-paragraph').length >= 1);
  });

  await check('toolbar: Divider inserts after the current block; the command API does the same as a button', async () => {
    const before = await page.$$eval('#ed-md .ce-block', (b) => b.length);
    assert.equal(await select(page, '#ed-md .ce-paragraph', 'A'), true);
    await page.click('#ed-bar [data-editor-command="delimiter"]');
    await page.waitForFunction((n) => document.querySelectorAll('#ed-md .ce-block').length === n + 1, before);
    const applied = await page.evaluate(async () => {
      document.querySelector<HTMLElement>('#ed-md .ce-paragraph')!.focus();
      return globalThis.df$.shadcn.editorjs!.command('#ed-md', 'quote');
    });
    assert.equal(applied, true);
    await page.waitForFunction(() => document.querySelectorAll('#ed-md .cdx-quote').length === 2);
  });

  await check('editorjs-change fires on typing with the block count', async () => {
    const detail = await page.evaluate(async () => {
      const el = document.getElementById('ed-sub')!;
      const got = new Promise<number>((r) => el.addEventListener('editorjs-change', (e) => r((e as CustomEvent).detail.blocks), { once: true }));
      const p = el.querySelector<HTMLElement>('.ce-paragraph')!;
      p.focus();
      document.execCommand('insertText', false, 'Hello');
      return Promise.race([got, new Promise<number>((r) => setTimeout(() => r(-1), 3000))]);
    });
    assert.equal(detail, 1);
  });

  await check('blocks API: setMarkdown replaces the document, blocks() saves it, setBlocks restores it, toMarkdown serializes', async () => {
    const r = await page.evaluate(async () => {
      const api = globalThis.df$.shadcn.editorjs!;
      await api.setMarkdown('#ed-sub', '## Loaded\n\n- one\n- two');
      const saved = await api.blocks('#ed-sub') as { blocks: { type: string }[] };
      await api.setMarkdown('#ed-sub', 'Replaced.');
      const replaced = document.querySelectorAll('#ed-sub .ce-block').length;
      await api.setBlocks('#ed-sub', saved);
      return { types: saved.blocks.map((b) => b.type), replaced, h2: document.querySelector('#ed-sub h2.ce-header')?.textContent, md: api.toMarkdown(saved.blocks as any), parsed: (api.toBlocks('#ed-sub', '# T\n\ntext') as { type: string }[]).map((b) => b.type) };
    });
    assert.deepEqual(r.types, ['header', 'list']);
    assert.equal(r.replaced, 1);
    assert.equal(r.h2, 'Loaded');
    assert.equal(r.md, '## Loaded\n\n- one\n- two\n');
    assert.deepEqual(r.parsed, ['header', 'paragraph']);
  });

  await check("state API: setState('readonly') marks the element and switches the editor; 'default' switches back", async () => {
    await page.evaluate(() => document.getElementById('ed-md')!.api!.setState('readonly'));
    await page.waitForFunction(() => (globalThis.df$.shadcn.editorjs!.editor('#ed-md') as any).readOnly.isEnabled === true);
    const r = await page.evaluate(() => ({ attr: document.getElementById('ed-md')!.hasAttribute('data-readonly'), name: document.getElementById('ed-md')!.api!.getState().name, toolbar: !document.querySelector('#ed-md .ce-toolbar') || getComputedStyle(document.querySelector('#ed-md .ce-toolbar')!).display === 'none' }));
    assert.deepEqual(r, { attr: true, name: 'readonly', toolbar: true });
    await page.evaluate(() => document.getElementById('ed-md')!.api!.setState('default'));
    await page.waitForFunction(() => (globalThis.df$.shadcn.editorjs!.editor('#ed-md') as any).readOnly.isEnabled === false);
    assert.equal(await page.$eval('#ed-md', (e) => e.hasAttribute('data-readonly')), false);
  });

  await check('state API: unknown state names throw; registry globals expose api + states + url', async () => {
    const r = await page.evaluate(() => {
      let err = '';
      try { document.getElementById('ed-md')!.api!.setState('nope'); } catch (e) { err = (e as Error).message; }
      return { err, states: globalThis.df$.shadcn.editorjsStates, url: globalThis.df$.shadcn.editorjs!.url };
    });
    assert.match(r.err, /unknown state/);
    assert.deepEqual(r.states, ['default', 'readonly']);
    assert.equal(r.url, EDITOR);
  });

  await check('no page errors', async () => {
    assert.deepEqual(errors, []);
  });

  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await assertRenderContract(page, '.editorjs[id]', ['default', 'readonly'], { runtimeAttrs: ['data-ready', 'data-error'], runtimeOwned: '.editorjs-holder', settled: '.editorjs:not([data-ready]):not([data-error])' });
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\neditorjs.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('editorjs.e2e: all checks passed');
