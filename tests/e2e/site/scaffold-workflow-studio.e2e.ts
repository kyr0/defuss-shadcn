import { chromium, type Page } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from '../server.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';
import { chooseLanguage, renderedLanguage, translationGaps } from '../lib/translation.ts';

/**
 * Why: the Workflow Studio scaffold promises five workflows that run and say what they did - an agent crew whose
 * reply rests on its data sources, a route planner that asks its traffic service twice, a three.js scene built from
 * the scene graph, an order-to-cash process that routes by its credit decision, and a hand-written neural network
 * that computes A + B, A - B, A × B and A ÷ B exactly. It also promises the editing around them: a custom editor in a
 * Window and a wizard, a page-edited field, labels that follow their values, connection labels that report what went
 * through, a Data Tree navigator with Follow, and a log of the editor's events. This drives the generated full-screen
 * page (dist/documentation/application/app-workflow-studio.html), built from the scaffold page's own example fence,
 * with defuss-i18n, defuss-dom-router and three.js served offline from node_modules.
 */
const PAGE = '/dist/documentation/application/app-workflow-studio.html';
const server = startServer();
// WebGL on a machine without a GPU: SwiftShader, as the Shader e2e does
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
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

const W = (p: Page, fn: string, ...args: unknown[]): Promise<any> =>
  p.evaluate(([fn, args]) => (globalThis as any).df$.shadcn.workflow[fn as string]('#ws-flow', ...(args as unknown[])), [fn, args] as const);
/** opens an app and waits for its first run to end */
async function app(p: Page, id: string): Promise<void> {
  await p.evaluate((a) => (location.hash = '#/' + a), id);
  await p.waitForFunction((a) => (document.querySelector('[data-ws]') as HTMLElement).dataset.wsOpen === a, id);
  await settle(p);
}
/** waits until the last workflow-run event in the log is no longer "running" */
async function settle(p: Page): Promise<void> {
  await p.waitForFunction(
    () => {
      const last = [...document.querySelectorAll('[data-ws-log] li')].find((li) => li.querySelector('b')?.textContent === 'workflow-run');
      return last && last.querySelector('span')?.textContent !== 'running';
    },
    null,
    { timeout: 30_000 },
  );
  await p.waitForTimeout(250);
}
const run = async (p: Page): Promise<void> => {
  await W(p, 'run');
  await p.waitForTimeout(250);
};
const preview = (p: Page): Promise<string> => p.innerText('[data-ws-preview]');
const labels = (p: Page): Promise<string[]> => p.$$eval('#ws-flow .workflow-edge-label', (l) => l.map((x) => x.textContent!));
const logged = (p: Page, name: string): Promise<string[]> =>
  p.$$eval('[data-ws-log] li', (lis, n) => lis.filter((li) => li.querySelector('b')?.textContent === n).map((li) => li.querySelector('span')!.textContent!), name);
/** the node's card in view at zoom 1 */
const show = async (p: Page, id: string): Promise<void> => {
  const n = await p.evaluate((id) => (globalThis as any).df$.shadcn.workflow.export('#ws-flow').nodes.find((x: any) => x.id === id), id);
  await W(p, 'camera', { x: 120 - n.x, y: 80 - n.y, zoom: 1 });
  await p.waitForTimeout(300);
};
const view = async (p: Page, zoom = 0.9): Promise<void> => {
  await W(p, 'camera', { x: 40, y: 40, zoom });
  await p.waitForTimeout(200);
};

try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await offlineJsdelivr(page);
  await page.goto(server.url + PAGE);
  await page.waitForFunction(() => document.querySelector('[data-ws]')?.hasAttribute('data-ws-ready'), null, { timeout: 20_000 });
  await settle(page);

  await check('opens on the agent crew and runs it once: the reply rests on the order API and the knowledge base', async () => {
    assert.equal(await page.getAttribute('[data-ws-app="agents"]', 'data-current'), '');
    const text = await preview(page);
    assert.match(text, /cracked hopper/);
    assert.match(text, /sending a replacement/, 'the classifier read it as a replacement');
    assert.match(text, /Order 48213 \(Hand grinder, Milk jug 600 ml\) was delivered by DHL/, 'the order API answered');
    assert.match(text, /\[email\], \[phone\]/, 'the guardrail redacted the contact data');
    assert.match(text, /Sources\s+kb-returns, kb-damaged/);
    assert.ok((await logged(page, 'workflow-run')).includes('done'));
  });

  await check('the Nodes panel lists the open app\'s node types only; a click adds one, undo takes it back', async () => {
    const types = () => page.$$eval('[data-ws-palette] [data-workflow-type]', (b) => b.map((x) => (x as HTMLElement).dataset.workflowType!));
    const listed = await types();
    assert.equal(listed.length, 10, listed.join(' '));
    assert.ok(listed.every((t) => t.startsWith('ag-')), listed.join(' '));
    const before = (await W(page, 'export')).nodes.length;
    await page.click('[data-ws-palette] [data-workflow-type="ag-critic"]');
    await page.waitForTimeout(200);
    assert.equal((await W(page, 'export')).nodes.length, before + 1);
    await W(page, 'undo');
    assert.equal((await W(page, 'export')).nodes.length, before);
  });

  await check('the app bundle styles what the cards write: a slider field is the Slider, the verdict a Badge', async () => {
    await show(page, 'classify');
    const slider = await page.evaluate(() => getComputedStyle(document.querySelector('#ws-flow [data-node-id="classify"] input.slider')!).appearance);
    await show(page, 'guard');
    // the first frame at a new place can wait on the GPU (SwiftShader: ~650 ms once) - wait for the card itself
    await page.waitForSelector('#ws-flow [data-node-id="guard"] .badge');
    const badge = await page.evaluate(() => getComputedStyle(document.querySelector('#ws-flow [data-node-id="guard"] .badge')!).display);
    assert.deepEqual({ slider, badge }, { slider: 'none', badge: 'inline-flex' });
    // back to the whole workflow, the flight over
    await W(page, 'fit');
    await page.waitForTimeout(800);
  });

  await check('connection types: every port type labels what went through - tokens, documents, the order, the intent, the facts', async () => {
    await W(page, 'fit');
    await page.waitForTimeout(300);
    const l = await labels(page);
    for (const want of ['≈ 26 tokens', '2 docs', 'order 48213', '“replacement”', '3 facts', 'approved reply']) assert.ok(l.includes(want), `${want} in ${l.join(' | ')}`);
    const looks = await page.evaluate(() => {
      const e = (globalThis as any).df$.shadcn.workflow.export('#ws-flow').edges;
      return { e11: e.find((x: any) => x.id === 'e11').label };
    });
    assert.deepEqual(looks, { e11: 'approved reply' });
  });

  await check('a custom editor in a Window: the prompt opens, Save writes it (workflow-field-change), ⌘Z takes it back', async () => {
    await show(page, 'classify');
    await page.click('#ws-flow [data-node-id="classify"] [data-workflow-field-edit]');
    await page.waitForSelector('#ws-code[open]');
    assert.equal(await page.textContent('#ws-code-title'), 'Prompt');
    await page.fill('#ws-code-text', 'Label it. One word.');
    await page.click('#ws-code-save');
    // edit() resolves on Save; the editor writes the value right after
    await page.waitForFunction(() => (globalThis as any).df$.shadcn.workflow.getField('#ws-flow', 'classify', 'prompt') === 'Label it. One word.');
    assert.equal(await page.$eval('#ws-code', (d) => (d as HTMLDialogElement).open), false);
    assert.equal(await W(page, 'getField', 'classify', 'prompt'), 'Label it. One word.');
    assert.match((await logged(page, 'workflow-field-change'))[0], /^classify\.prompt: /);
    await page.waitForFunction(() => document.querySelector('#ws-flow [data-node-id="classify"] [data-workflow-field-edit] pre')?.textContent === 'Label it. One word.');
    await W(page, 'undo');
    assert.match(await W(page, 'getField', 'classify', 'prompt'), /^Classify the customer message/);
  });

  await check('a page-edited field: the blocked words ask with workflow-field-edit, the page answers with setField()', async () => {
    await show(page, 'guard');
    await page.click('#ws-flow [data-node-id="guard"] [data-key="blocklist"] [data-workflow-field-edit]');
    await page.waitForSelector('#ws-code[open]');
    assert.match(await page.textContent('#ws-code-title') ?? '', /^Blocked words/);
    await page.fill('#ws-code-text', 'replacement');
    await page.click('#ws-code-save');
    await page.waitForFunction(() => (globalThis as any).df$.shadcn.workflow.getField('#ws-flow', 'guard', 'blocklist') === 'replacement');
    assert.equal(await W(page, 'getField', 'guard', 'blocklist'), 'replacement');
    assert.ok((await logged(page, 'workflow-field-edit')).includes('guard.blocklist'));
    await run(page);
    await settle(page);
    assert.match(await page.textContent('#ws-flow [data-node-id="guard"] [data-key="verdict"]') ?? '', /blocked: replacement/);
    await W(page, 'undo');
  });

  await check('labels follow the value: the temperature turns 🔥 past 1, 🧊 at 0', async () => {
    await show(page, 'writer');
    const label = () => page.textContent('#ws-flow [data-node-id="writer"] [data-key="temperature"] .label');
    await W(page, 'setField', 'writer', 'temperature', 1.2);
    await page.waitForTimeout(200);
    assert.match((await label()) ?? '', /🔥 Temperature - creative/);
    await W(page, 'setField', 'writer', 'temperature', 0);
    await page.waitForTimeout(200);
    assert.match((await label()) ?? '', /🧊 Temperature - exact/);
  });

  await check('navigator: the filter finds a node inside the Research crew; a pick enters the subworkflow and selects it; a card click opens its way in the tree', async () => {
    await page.fill('[data-tree-filter="ws-tree"]', 'Critic');
    await page.waitForTimeout(300);
    await page.click('#ws-tree [role="treeitem"]:has-text("Critic agent")');
    await page.waitForFunction(() => (document.querySelector('#ws-flow') as any).api.getState().config.selected[0] === 'critic');
    assert.match(await page.innerText('[data-workflow-outlet="breadcrumb"]'), /Research crew/);
    await page.fill('[data-tree-filter="ws-tree"]', '');
    await page.click('[data-workflow-action="parent"]');
    await page.waitForTimeout(300);
    await W(page, 'select', ['send']);
    await page.waitForTimeout(300);
    assert.match((await page.textContent('#ws-tree [role="treeitem"][aria-selected="true"]')) ?? '', /Send reply/);
  });

  await check('Follow: pressed, a pick flies the editor to the node; released, only the selection moves', async () => {
    await view(page, 1);
    const cam = () => W(page, 'camera');
    const before = await cam();
    await page.click('#ws-follow');
    assert.equal(await page.getAttribute('#ws-follow', 'aria-pressed'), 'false');
    await page.click('#ws-tree [role="treeitem"]:has-text("Guardrail")');
    await page.waitForTimeout(500);
    assert.deepEqual(await cam(), before, 'Follow off: the view stays');
    await page.click('#ws-follow');
    await page.click('#ws-tree [role="treeitem"]:has-text("Customer message")');
    await page.waitForTimeout(900);
    assert.notDeepEqual(await cam(), before, 'Follow on: the view flew');
  });

  await check('route planner: Dijkstra over the traffic, the traffic service asked again for the route only; the map draws the route', async () => {
    await app(page, 'algorithm');
    const text = await preview(page);
    assert.match(text, /Route\s+Depot - Station - Park - Clinic - Airport/);
    assert.match(text, /Planned\s+85\.4 min/);
    assert.match(text, /Asked again\s+92\.5 min/);
    assert.equal(await page.$$eval('[data-ws-preview] svg .route', (r) => r.length), 1);
    await W(page, 'fit');
    await page.waitForTimeout(300);
    const l = await labels(page);
    assert.ok(l.includes('21 factors') && l.includes('4 factors'), 'the first call weighs every road, the second only the 4 on the route: ' + l.join(' | '));
    assert.ok((await page.$$('#ws-flow .workflow-edge-flow path')).length >= 2, 'live traffic connections move');
  });

  await check('route planner: the algorithm is code in a Window - a broken one fails its node with the reason', async () => {
    await W(page, 'setField', 'dijkstra', 'code', 'return null;');
    await run(page);
    await settle(page);
    assert.ok((await logged(page, 'workflow-run')).some((l) => /must return \{ stops, minutes \}/.test(l)));
    await W(page, 'undo');
  });

  await check('3D scene: the scene graph through two subworkflows (shader, motion) becomes a three.js scene; Render keeps a still frame', async () => {
    await app(page, 'scene');
    await page.waitForFunction(() => (document.querySelector('[data-ws]') as HTMLElement).dataset.wsScene === 'ready', null, { timeout: 20_000 });
    assert.match(await preview(page), /Objects\s+Hero knot, Satellite/);
    const out = await page.evaluate(() => {
      const d = (globalThis as any).df$.shadcn.workflow.export('#ws-flow');
      return { glow: !!d.nodes.find((n: any) => n.id === 'glow').subgraph, motion: d.nodes.find((n: any) => n.id === 'motion').subgraph.nodes.length };
    });
    assert.deepEqual(out, { glow: true, motion: 3 });
    await W(page, 'fit');
    await page.waitForTimeout(300);
    const l = await labels(page);
    assert.ok(l.includes('shader material') && l.includes('spin + bob') && l.includes('2 objects · 2 lights'), l.join(' | '));
    const pixels = await page.$eval('[data-ws-preview] canvas', (c) => (c as HTMLCanvasElement).toDataURL().length);
    assert.ok(pixels > 5000, 'the stage drew something');
  });

  await check('order to cash: the wizard folds three steps into one Order; a tight credit limit routes it to the rejection notice', async () => {
    await app(page, 'process');
    assert.match(await preview(page), /Invoiced - INV-10427, € 108\.80/);
    await show(page, 'order');
    await page.click('#ws-flow [data-node-id="order"] [data-workflow-field-edit]');
    await page.waitForSelector('#ws-wizard[open]');
    await page.click('#ws-w-next');
    await page.fill('#ws-w-q2', '2');
    await page.click('#ws-w-next');
    await page.check('#ws-wizard [name="express"]');
    await page.click('#ws-w-finish');
    await page.waitForFunction(() => (globalThis as any).df$.shadcn.workflow.getField('#ws-flow', 'order', 'order').lines.length === 3);
    const order = await W(page, 'getField', 'order', 'order');
    assert.deepEqual(order.lines.map((l: any) => l.qty), [2, 1, 2]);
    assert.equal(order.shipping.express, true);
    await run(page);
    await settle(page);
    assert.match(await preview(page), /Invoiced - INV-10427, € 157\.70/, '2 × 24.90 + 59 + 2 × 19.50 + 9.90 express');
    await W(page, 'setField', 'credit', 'limit', 100);
    await run(page);
    await settle(page);
    const text = await preview(page);
    assert.match(text, /Credit check - rejected: over the limit/);
    assert.match(text, /Customer told - About your order SO-10427/);
    assert.doesNotMatch(text, /Invoiced/);
  });

  await check('neural calculator: 973 weights and biases; A op B read from the readout matrices for +, −, ×, ÷ and ÷ 0', async () => {
    await app(page, 'neural');
    const text = await preview(page);
    assert.match(text, /42 ÷ 8 =\s+5\.25/);
    assert.match(text, /Weights and biases\s+973/);
    const result = async (a: number, op: string, b: number) => {
      await W(page, 'setField', 'a', 'value', a);
      await W(page, 'setField', 'b', 'value', b);
      await W(page, 'setField', 'op', 'op', op);
      await run(page);
      await settle(page);
      return page.textContent('[data-ws-result]');
    };
    assert.equal(await result(100, '×', 100), '10000.00');
    assert.equal(await result(3, '−', 97), '−94.00');
    assert.equal(await result(100, '÷', 7), '14.28');
    assert.equal(await result(58, '+', 99), '157.00');
    assert.equal(await result(5, '÷', 0), 'undefined (÷ 0)');
    const lit = await page.$$eval('[data-ws-preview] .ws-matrix td[data-on]', (c) => c.length);
    assert.equal(lit, 0, 'no digit lights up for ÷ 0');
  });

  await check('neural calculator: Check all runs every A, B and op through the weights in the editor - all exact; one changed weight breaks it', async () => {
    await page.click('[data-ws-preview] button:has-text("Check all")');
    await page.waitForFunction(() => /exact/.test(document.querySelector('[data-ws-check]')?.textContent ?? ''), null, { timeout: 60_000 });
    assert.equal(await page.textContent('[data-ws-check]'), '40,804 of 40,804 exact');
    const units = await W(page, 'getField', 'multiply', 'units');
    units[0][3][0][1] = 64; // the gate of bit 0 now asks for a 64
    await W(page, 'setField', 'multiply', 'units', units);
    await page.click('[data-ws-preview] button:has-text("Check all")');
    await page.waitForFunction(() => /exact -/.test(document.querySelector('[data-ws-check]')?.textContent ?? ''), null, { timeout: 60_000 });
    assert.match(await page.textContent('[data-ws-check]') ?? '', /first miss: /);
    await W(page, 'undo');
  });

  await check('apps keep their edits: back on the agent crew, the changed temperature is still there', async () => {
    await app(page, 'agents');
    assert.equal(await W(page, 'getField', 'writer', 'temperature'), 0);
  });

  await check('events: field changes, selections, runs and node states all reached the log', async () => {
    for (const name of ['workflow-change', 'workflow-field-change', 'workflow-field-edit', 'workflow-select', 'workflow-run', 'workflow-node-state', 'workflow-navigate'])
      assert.ok((await logged(page, name)).length > 0, name);
  });

  await check('BDI-II: 21 items and every rule run - a total, its band, the item 9 flag, prorating, a changed cut-off', async () => {
    await app(page, 'bdi');
    const nodes = await page.evaluate(() => (globalThis as any).df$.shadcn.workflow.export('#ws-flow').nodes.filter((n: any) => n.type.startsWith('bdi-item')).length);
    assert.equal(nodes, 21, 'one node per item');
    const total = () => page.textContent('[data-ws-bdi]');
    assert.equal(await total(), '25');
    assert.match(await preview(page), /moderate[\s\S]*sleeps less \(2\); eats less \(1\)/);
    assert.equal(await page.$$eval('[data-ws-preview] [role="alert"]', (a) => a.length), 0, 'item 9 at 0: no flag');
    const again = async () => {
      await run(page);
      await settle(page);
    };
    await W(page, 'setField', 'q9', 'answer', '2');
    await again();
    assert.match(await page.innerText('[data-ws-preview] [role="alert"]'), /Item 9: urgent - contact now/);
    assert.equal(await total(), '27');
    await W(page, 'setField', 'q9', 'answer', '0');
    await W(page, 'setField', 'q18', 'answer', '1b');
    await again();
    assert.match(await preview(page), /eats more \(1\)/, 'appetite: b means more');
    // two answers missing: prorated from the 19 answered; a third stops the score
    await W(page, 'setField', 'q1', 'answer', '–');
    await W(page, 'setField', 'q2', 'answer', '–');
    await again();
    assert.equal(await total(), String(Math.round((22 * 21) / 19)));
    assert.match(await preview(page), /prorated for item 1, 2/);
    await W(page, 'setField', 'q3', 'answer', '–');
    await again();
    assert.equal(await total(), 'incomplete');
    await W(page, 'setField', 'q1', 'answer', '2');
    await W(page, 'setField', 'q2', 'answer', '1');
    await W(page, 'setField', 'q3', 'answer', '1');
    await W(page, 'setField', 'band', 'bands', [{ from: 0, to: 24, band: 'below the line' }, { from: 25, to: 63, band: 'above the line' }]);
    await again();
    assert.match(await preview(page), /above the line/, 'the band follows the edited cut-offs');
    const l = await labels(page);
    assert.ok(l.includes('25 from 21 items') && l.includes('item 9: none'), l.join(' | '));
  });

  await check('Auto-run: pressed, a burst of value changes runs once, 500 ms after the last; released, a change runs nothing', async () => {
    await page.evaluate(() => {
      const g = globalThis as any;
      g.__runs = 0;
      document.querySelector('#ws-flow')!.addEventListener('workflow-run', (e: any) => e.detail.status === 'running' && g.__runs++);
    });
    const runs = (): Promise<number> => page.evaluate(() => (globalThis as any).__runs);
    assert.equal(await page.getAttribute('#ws-auto', 'aria-pressed'), 'false', 'off at first');
    await page.click('#ws-auto');
    assert.equal(await page.getAttribute('#ws-auto', 'aria-pressed'), 'true');
    await W(page, 'setField', 'q9', 'answer', '1');
    await page.waitForTimeout(200);
    await W(page, 'setField', 'q9', 'answer', '3');
    await page.waitForTimeout(300);
    assert.equal(await runs(), 0, 'no run inside the delay');
    await page.waitForFunction(() => (globalThis as any).__runs === 1, null, { timeout: 5_000 });
    await settle(page);
    assert.equal(await runs(), 1, 'one run for the burst');
    assert.match(await page.innerText('[data-ws-preview] [role="alert"]'), /Item 9: urgent/, 'the run saw the last value');
    await page.click('#ws-auto');
    assert.equal(await page.getAttribute('#ws-auto', 'aria-pressed'), 'false');
    await W(page, 'setField', 'q9', 'answer', '0');
    await page.waitForTimeout(900);
    assert.equal(await runs(), 1, 'released: no run');
  });

  await check('History: a sidebar right of the editor lists every change; a row, Back and Forward step the workflow through them', async () => {
    const box = (sel: string) => page.locator(sel).boundingBox();
    const [editor, history, previewBox] = await Promise.all([box('#ws-editor'), box('#ws-history-panel'), box('#ws-preview-panel')]);
    assert.ok(editor!.x + editor!.width <= history!.x + 1 && history!.x + history!.width <= previewBox!.x + 1, 'editor | history | preview');
    const hist = (): Promise<{ changes: string[]; at: number }> => W(page, 'history');
    const { changes, at } = await hist();
    assert.ok(changes.length >= 10 && at === changes.length, `${at} of ${changes.length} applied`);
    assert.ok(changes.includes('Edit 9 · Suicidal thoughts or wishes: answer'), changes.join(' | '));
    const rows = () => page.$$eval('[data-ws-history] li', (l) => l.map((li) => [li.getAttribute('aria-current'), li.hasAttribute('data-undone')]));
    assert.equal((await rows()).length, changes.length + 1, 'one row per change, and Loaded');
    assert.deepEqual((await rows()).at(-1), ['step', false], 'the last change is current');
    const q9 = (): Promise<string> => W(page, 'getField', 'q9', 'answer');
    const atStep = (n: number) => page.waitForFunction((n) => (globalThis as any).df$.shadcn.workflow.history('#ws-flow').at === n && document.querySelector(`[data-ws-history] li[data-step="${n}"][aria-current]`), n);
    // back to the document as loaded: every change undone
    await page.click('[data-ws-history] li[data-step="0"] button');
    await atStep(0);
    assert.equal(await q9(), '0');
    assert.equal(await W(page, 'getField', 'q18', 'answer'), '1a', 'item 18 as loaded');
    assert.ok((await rows()).slice(1).every(([, undone]) => undone), 'every change muted');
    assert.equal(await page.isDisabled('[data-ws-history-step="-1"]'), true, 'nothing further back');
    // Forward redoes the first change (item 9 to 2), Back takes it back
    await page.click('[data-ws-history-step="1"]');
    await atStep(1);
    assert.equal(await q9(), '2');
    await page.click('[data-ws-history-step="-1"]');
    await atStep(0);
    // to the newest change again: the workflow as it was
    await page.click(`[data-ws-history] li[data-step="${changes.length}"] button`);
    await atStep(changes.length);
    assert.equal(await q9(), '0');
    assert.deepEqual((await W(page, 'getField', 'band', 'bands'))[1].band, 'above the line');
    assert.equal(await page.isDisabled('[data-ws-history-step="1"]'), true, 'nothing further forward');
    // a change after a step back drops the changes after it
    await page.click(`[data-ws-history] li[data-step="${changes.length - 1}"] button`);
    await atStep(changes.length - 1);
    await W(page, 'setField', 'q20', 'answer', '3');
    await page.waitForFunction((n) => document.querySelectorAll('[data-ws-history] li').length === n, changes.length + 1);
    assert.match((await hist()).changes.at(-1)!, /^Edit 20 · .*: answer$/);
    assert.equal(await page.textContent('[data-ws-history-count]'), `${changes.length} / ${changes.length}`);
  });

  await check('an app opened while another still runs: the run is cancelled and the new app still runs its first time', async () => {
    const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await offlineJsdelivr(p);
    await p.goto(server.url + PAGE + '#/agents');
    await p.waitForFunction(() => document.querySelector('#ws-flow')?.hasAttribute('data-running'), null, { timeout: 20_000 });
    await p.evaluate(() => (location.hash = '#/algorithm'));
    await p.waitForFunction(() => /Planned\s+85\.4 min/.test((document.querySelector('[data-ws-preview]') as HTMLElement).innerText), null, { timeout: 20_000 });
    assert.equal(await p.getAttribute('[data-ws]', 'data-ws-open'), 'algorithm');
    await p.close();
  });

  await check('no script errors along the way', async () => {
    assert.deepEqual(errors, []);
  });

  await check('routing: a deep link opens its app; translation: the frame in German, every target in both languages', async () => {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await offlineJsdelivr(p);
    await p.goto(server.url + PAGE + '#/neural');
    await p.waitForFunction(() => document.querySelector('[data-ws]')?.hasAttribute('data-ws-ready'), null, { timeout: 20_000 });
    assert.equal(await p.getAttribute('[data-ws-app="neural"]', 'data-current'), '');
    assert.equal(await p.getAttribute('[data-ws-app="neural"]', 'aria-current'), 'page');
    assert.equal(await p.getAttribute('#ws-history-panel', 'data-state-name'), 'minimized', 'below 1600px the History starts folded');
    assert.deepEqual(await translationGaps(p, '[data-ws]'), [], 'every target and attribute in English and German');
    await chooseLanguage(p, 'de');
    await p.waitForFunction(() => document.querySelector('[data-ws]')?.getAttribute('lang') === 'de');
    assert.equal(await renderedLanguage(p, '[data-ws]'), 'de');
    assert.equal(await p.textContent('[data-i18n-target="ws-t-preview"]'), 'Vorschau');
    assert.equal(await p.textContent('[data-i18n-target="ws-a-neural"]'), 'Neuronaler Rechner');
    await p.close();
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`scaffold-workflow-studio.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('scaffold-workflow-studio.e2e: all checks passed');
