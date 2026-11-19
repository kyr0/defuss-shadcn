import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

/**
 * Why: E2E for the shipped Workflow editor (the defuss-workflow package, ported). The fixture mirrors the doc pages:
 * the application (toolbar actions, palette, outline, inspector, breadcrumb and readouts around a workflow with a group
 * and a subworkflow), a generated 10,000-node / 100,000-connection workflow, a grouped one drawn on the main thread and
 * a readonly one. Node types and their run handlers are registered by the fixture's own script.
 * Verifies: the worker boots from the component's own source (and the main-thread fallback); the render budget on
 * 10,000 nodes (no cards when zoomed out, a bounded pool zoomed in, connections sampled and said so); every outlet,
 * output and action; adding from the palette by click and by drop; selecting, moving (one undo step), connecting by
 * dragging between ports, a refused connection with its reason, dropping on a card; the selected connection's
 * inspector (route, disconnect); groups (collapse, group, ungroup); arrange; subworkflows in and out; a run with
 * outputs, progress states and the run events, and a cancelled one; readonly; keys; wheel zoom and pan; the minimap;
 * the formats (native, ComfyUI, Gradio) and import; generate and validate; destroy(); and the State API + render().
 */

const FIXTURE = '/tests/e2e/workflows/workflow.e2e-fixture.html';
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

const frames = (page: Page): Promise<unknown> =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 80)))));
const W = (page: Page, fn: string, ...args: unknown[]): Promise<any> =>
  page.evaluate(([fn, args]) => (globalThis as any).df$.shadcn.workflow[fn as string](...(args as unknown[])), [fn, args] as const);
const text = (page: Page, sel: string): Promise<string> => page.locator(sel).first().innerText();
const attr = (page: Page, sel: string, name: string): Promise<string | null> => page.locator(sel).first().getAttribute(name);
const nodes = (page: Page): Promise<number> => W(page, 'export', '#wf-basic').then((d) => d.nodes.length);
const edges = (page: Page): Promise<number> => W(page, 'export', '#wf-basic').then((d) => d.edges.length);
/** the center of an element in page coordinates */
const center = async (page: Page, sel: string): Promise<{ x: number; y: number }> => {
  const box = await page.locator(sel).first().boundingBox();
  assert.ok(box, `no box for ${sel}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};
const drag = async (page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
  await page.mouse.move(to.x, to.y, { steps: 4 });
  await page.mouse.up();
  await frames(page);
};
/** the app's view at zoom 1 with the workflow's top-left corner at (40, 70) */
const home = async (page: Page): Promise<void> => {
  await W(page, 'camera', '#wf-basic', { x: 40, y: 80, zoom: 1 });
  await frames(page);
};
const port = (node: string, id: string): string => `#wf-basic [data-node-id="${node}"] [data-port-id="${id}"] i`;

async function open(): Promise<{ page: Page; errors: string[] }> {
  const page = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text());
  });
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  await page.goto(`${server.url}${FIXTURE}`);
  await page.waitForFunction(() => [...document.querySelectorAll('.workflow')].every((el) => el.getAttribute('data-workflow-status') === 'ready'), null, { timeout: 30_000 });
  // the fixture's node types arrive after the editors start: the cards draw their fields
  await page.waitForFunction(() => !!(globalThis as any).df$?.shadcn?.workflow?.export);
  await frames(page);
  return { page, errors };
}

try {
  const { page, errors } = await open();

  await check('boot: every workflow ready, drawn by the worker - the grouped one on the main thread (data-worker="none")', async () => {
    const r = await page.evaluate(() =>
      [...document.querySelectorAll('.workflow')].map((el) => [el.id, el.getAttribute('data-renderer'), el.getAttribute('role'), el.getAttribute('tabindex')]),
    );
    assert.deepEqual(r, [
      ['wf-basic', 'worker', 'application', '0'],
      ['wf-big', 'worker', 'application', '0'],
      ['wf-groups', 'main', 'application', '0'],
      ['wf-readonly', 'worker', 'application', '0'],
      ['wf-custom', 'worker', 'application', '0'],
      ['wf-list', 'worker', 'application', '0'],
      ['wf-links', 'worker', 'application', '0'],
      ['nav-wf', 'worker', 'application', '0'],
    ]);
  });

  await check('budget: 10,000 nodes and 100,000 connections - no cards zoomed out, a bounded pool zoomed in, sampled connections said so', async () => {
    const doc = await W(page, 'export', '#wf-big');
    assert.equal(doc.nodes.length, 10000);
    assert.ok(doc.edges.length > 95000, `${doc.edges.length} connections`);
    let s = await W(page, 'stats', '#wf-big');
    assert.equal(s.domNodes, 0);
    assert.ok(s.edges <= 5000 && s.edgesTruncated, JSON.stringify(s));
    assert.match(await text(page, '#big-drawn'), /sampled/);
    // zoomed out every node in view is a plain box: far more than the 3,000 drawn cards
    assert.ok(s.zoom < 0.12 && s.nodes > 9000, `${s.nodes} boxes at ${s.zoom}`);
    await W(page, 'camera', '#wf-big', { x: 0, y: 0, zoom: 0.8 });
    await frames(page);
    await frames(page);
    s = await W(page, 'stats', '#wf-big');
    assert.ok(s.domNodes > 0 && s.domNodes <= 150, `${s.domNodes} cards`);
    const elements = await page.evaluate(() => document.querySelectorAll('#wf-big *').length);
    assert.ok(elements < 4000, `${elements} elements in the editor`);
    assert.equal(await text(page, '#big-renderer'), 'Worker canvas');
  });

  await check('outputs: title, counts, selection, zoom, drawn', async () => {
    assert.equal(await text(page, '#out-title'), 'Text pipeline');
    assert.equal(await text(page, '#out-nodes'), '7');
    assert.equal(await text(page, '#out-edges'), '8');
    assert.equal(await text(page, '#out-selection'), 'Nothing selected');
    await home(page);
    await page.waitForFunction(() => document.querySelector('#out-zoom')!.textContent === '100%');
    assert.match(await text(page, '#out-drawn'), /^\d+ connections drawn$/);
  });

  await check('palette: the types by category; search filters; a click adds a node, undo takes it back', async () => {
    const headings = await page.locator('#wf-palette .workflow-palette-heading').allInnerTexts();
    assert.deepEqual(headings.map((h) => h.toUpperCase()), ['INPUTS', 'TEXT', 'ANALYZE', 'OUTPUTS', 'JOBS', 'BATCHES']);
    await page.fill('#wf-palette [data-workflow-search]', 'word');
    assert.equal(await page.locator('#wf-palette [data-workflow-type]').count(), 1);
    await page.fill('#wf-palette [data-workflow-search]', '');
    await page.click('#wf-palette [data-workflow-type="count"]');
    await frames(page);
    assert.equal(await nodes(page), 8);
    assert.equal(await text(page, '#out-selection'), '1 selected');
    await page.click('[data-workflow-action="undo"]');
    await frames(page);
    assert.equal(await nodes(page), 7);
  });

  await check('palette: a type dropped on the canvas lands where it was dropped', async () => {
    await home(page);
    const box = (await page.locator('#wf-basic').boundingBox())!;
    const at = { x: box.x + 300, y: box.y + 470 };
    await page.evaluate(({ x, y }) => {
      const dt = new DataTransfer();
      dt.setData('application/x-workflow-type', 'prompt');
      const target = document.elementFromPoint(x, y)!;
      target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer: dt }));
      target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer: dt }));
    }, at);
    await frames(page);
    const doc = await W(page, 'export', '#wf-basic');
    const added = doc.nodes.find((n: any) => !['p1', 'n1', 'u1', 'r1', 'c1', 's1', 'v1'].includes(n.id));
    assert.ok(added, 'a node was added');
    const world = { x: 300 - 40, y: 470 - 80 };
    assert.ok(Math.abs(added.x + added.width / 2 - world.x) < 2 && Math.abs(added.y + 40 - world.y) < 2, JSON.stringify(added));
    await W(page, 'undo', '#wf-basic');
  });

  await check('select by click: data-selected, the selection event, the inspector', async () => {
    await home(page);
    const events: unknown[] = await page.evaluate(() => {
      (globalThis as any).__sel = [];
      document.querySelector('#wf-basic')!.addEventListener('workflow-select', (e) => (globalThis as any).__sel.push((e as CustomEvent).detail));
      return [];
    });
    await page.click('#wf-basic [data-node-id="r1"] .workflow-node-title');
    await frames(page);
    assert.equal(await attr(page, '#wf-basic', 'data-selected'), 'r1');
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__sel.at(-1)), { selected: ['r1'], edge: null, path: [] });
    assert.equal(await text(page, '#wf-inspector .workflow-inspector-title'), 'Repeat');
    assert.ok(events);
  });

  await check('move: a header drag moves the node onto the 16-unit grid, as one undo step', async () => {
    await home(page);
    const before = (await W(page, 'export', '#wf-basic')).nodes.find((n: any) => n.id === 'r1');
    const from = await center(page, '#wf-basic [data-node-id="r1"] .workflow-node-title');
    await drag(page, from, { x: from.x + 64, y: from.y + 32 });
    let after = (await W(page, 'export', '#wf-basic')).nodes.find((n: any) => n.id === 'r1');
    const snap = (v: number): number => Math.round(v / 16) * 16;
    assert.deepEqual([after.x, after.y], [snap(before.x + 64), snap(before.y + 32)]);
    await page.click('[data-workflow-action="undo"]');
    after = (await W(page, 'export', '#wf-basic')).nodes.find((n: any) => n.id === 'r1');
    assert.deepEqual([after.x, after.y], [before.x, before.y]);
  });

  await check('connect: a drag from an output to an input connects; an occupied input refuses with the reason', async () => {
    await home(page);
    const id = await W(page, 'addNode', '#wf-basic', 'uppercase', { x: 490, y: 560 });
    await W(page, 'camera', '#wf-basic', { x: 20, y: 60, zoom: 0.6 });
    await frames(page);
    await drag(page, await center(page, port('p1', 'text')), await center(page, port(id, 'text')));
    let doc = await W(page, 'export', '#wf-basic');
    assert.ok(doc.edges.some((e: any) => e.source.node === 'p1' && e.target.node === id), 'p1 → new node');
    await page.evaluate(() => {
      (globalThis as any).__err = [];
      document.querySelector('#wf-basic')!.addEventListener('workflow-error', (e) => (globalThis as any).__err.push((e as CustomEvent).detail.message));
    });
    // a number into a text input: refused by type
    await drag(page, await center(page, port('n1', 'value')), await center(page, port(id, 'text')));
    doc = await W(page, 'export', '#wf-basic');
    assert.equal(doc.edges.filter((e: any) => e.target.node === id).length, 1);
    assert.match(await page.evaluate(() => (globalThis as any).__err.at(-1)), /Incompatible types: number → text|is full/);
    await W(page, 'undo', '#wf-basic');
    await W(page, 'undo', '#wf-basic');
    assert.equal(await nodes(page), 7);
  });

  await check('connect: dropped on a card, the first free port that fits takes it; compatible ports light up while dragging', async () => {
    const id = await W(page, 'addNode', '#wf-basic', 'count', { x: 490, y: 560 });
    await W(page, 'camera', '#wf-basic', { x: 20, y: 60, zoom: 0.6 });
    await frames(page);
    const from = await center(page, port('p1', 'text'));
    const to = await center(page, `#wf-basic [data-node-id="${id}"] .workflow-node-title`);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x - 20, to.y, { steps: 5 });
    await frames(page);
    assert.equal(await attr(page, '#wf-basic', 'data-connecting'), 'output');
    assert.equal(await attr(page, `#wf-basic [data-node-id="${id}"] [data-port-id="text"]`, 'data-compatible'), 'true');
    assert.equal(await attr(page, `#wf-basic [data-node-id="${id}"] [data-port-id="words"]`, 'data-compatible'), 'false');
    await page.mouse.move(to.x, to.y, { steps: 2 });
    await page.mouse.up();
    await frames(page);
    const doc = await W(page, 'export', '#wf-basic');
    assert.ok(doc.edges.some((e: any) => e.source.node === 'p1' && e.target.node === id && e.target.port === 'text'));
    assert.equal(await attr(page, '#wf-basic', 'data-connecting'), null);
    await W(page, 'undo', '#wf-basic');
    await W(page, 'undo', '#wf-basic');
  });

  await check('API: connect() checks like a drag - types, capacity, cycles; validate() names the problem', async () => {
    const reason = await page.evaluate(() => {
      try {
        (globalThis as any).df$.shadcn.workflow.connect('#wf-basic', { node: 'n1', port: 'value' }, { node: 'u1', port: 'text' });
        return 'connected';
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.match(reason, /Incompatible types|is full/);
    const cycle = await page.evaluate(() => {
      const w = (globalThis as any).df$.shadcn.workflow;
      const doc = w.export('#wf-basic');
      doc.edges.push({ id: 'loop', source: { node: 'r1', port: 'out' }, target: { node: 'p1', port: 'text' } });
      const p1 = doc.nodes.find((n: any) => n.id === 'p1');
      p1.ports.push({ id: 'text', direction: 'input', type: 'text' });
      return [w.validate(doc), w.validate(w.export('#wf-basic'))];
    });
    assert.match(cycle[0], /Duplicate port|cycle/);
    assert.equal(cycle[1], null);
  });

  await check('a connection: selected, inspected (route, disconnect), undone', async () => {
    await W(page, 'select', '#wf-basic', [], 'e4');
    await frames(page);
    assert.equal(await attr(page, '#wf-basic', 'data-selected-edge'), 'e4');
    assert.equal(await attr(page, '#wf-basic', 'data-selected'), null);
    assert.equal(await text(page, '#wf-inspector .workflow-inspector-kicker'), 'CONNECTION');
    await page.selectOption('#wf-inspector [data-workflow-edit="route"]', 'straight');
    let e4 = (await W(page, 'export', '#wf-basic')).edges.find((e: any) => e.id === 'e4');
    assert.equal(e4.route, 'straight');
    await page.click('#wf-inspector [data-workflow-edit="disconnect"]');
    assert.equal(await edges(page), 7);
    await W(page, 'undo', '#wf-basic');
    await W(page, 'undo', '#wf-basic');
    e4 = (await W(page, 'export', '#wf-basic')).edges.find((e: any) => e.id === 'e4');
    assert.equal(e4.route ?? 'bezier', 'bezier');
  });

  await check('a click on a connection selects it (the worker hit-tests the curve)', async () => {
    await W(page, 'commit', '#wf-basic', 'Straight', [
      { kind: 'edges', id: 'e2', value: { id: 'e2', source: { node: 'u1', port: 'out' }, target: { node: 'r1', port: 'text' }, route: 'straight' } },
    ]);
    // the connection in the middle of the view (u1's output at world x 600, r1's input at 700)
    await W(page, 'camera', '#wf-basic', { x: -300, y: 120, zoom: 1 });
    await frames(page);
    await W(page, 'select', '#wf-basic', []);
    const a = await center(page, port('u1', 'out'));
    const b = await center(page, port('r1', 'text'));
    const at = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    await page.mouse.click(at.x, at.y);
    const selected = await page
      .waitForFunction(() => document.querySelector('#wf-basic')!.getAttribute('data-selected-edge') === 'e2', null, { timeout: 10_000 })
      .then(() => true, () => false);
    if (!selected) {
      // say what the click met, so a failure names its cause
      const seen = await page.evaluate(async ({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        const root = document.querySelector('#wf-basic')!;
        const w = (globalThis as any).df$.shadcn.workflow;
        return {
          under: el ? `${el.tagName}.${el.className}` : null,
          camera: w.camera(root),
          edge: w.export(root).edges.find((e: any) => e.id === 'e2'),
          selected: [root.getAttribute('data-selected'), root.getAttribute('data-selected-edge')],
          message: root.querySelector('.workflow-message')?.textContent,
          scrolled: [root.scrollLeft, root.scrollTop],
        };
      }, at);
      throw new Error(`no connection selected at ${JSON.stringify(at)} (ports ${JSON.stringify([a, b])}): ${JSON.stringify(seen)}`);
    }
    await W(page, 'undo', '#wf-basic');
  });

  await check('groups: the outline collapses one (its nodes leave, a header stands in), the group action makes one, ungroup lifts it', async () => {
    await home(page);
    await page.click('#wf-outline [data-workflow-group="g1"]');
    await frames(page);
    let doc = await W(page, 'export', '#wf-basic');
    assert.equal(doc.groups.find((g: any) => g.id === 'g1').collapsed, true);
    assert.equal(await page.locator('#wf-basic [data-node-id="p1"]').count(), 0);
    assert.match(await text(page, '#wf-basic [data-group-id="g1"] .workflow-group-count'), /2 nodes/);
    await page.click('#wf-basic [data-group-id="g1"] .workflow-group-toggle');
    await frames(page);
    doc = await W(page, 'export', '#wf-basic');
    assert.ok(!doc.groups.find((g: any) => g.id === 'g1').collapsed);
    await W(page, 'select', '#wf-basic', ['u1', 'r1']);
    await page.click('[data-workflow-action="group"]');
    doc = await W(page, 'export', '#wf-basic');
    const made = doc.groups.find((g: any) => g.title === 'Text steps');
    assert.ok(made, 'the new group');
    assert.equal(doc.nodes.find((n: any) => n.id === 'u1').groupId, made.id);
    await W(page, 'select', '#wf-basic', ['u1']);
    await W(page, 'action', '#wf-basic', 'ungroup');
    doc = await W(page, 'export', '#wf-basic');
    assert.equal(doc.groups.length, 1);
    assert.equal(doc.nodes.find((n: any) => n.id === 'u1').groupId, undefined);
    await W(page, 'undo', '#wf-basic');
    await W(page, 'undo', '#wf-basic');
  });

  await check('arrange: the nodes move into layers in one undoable change', async () => {
    const before = await W(page, 'export', '#wf-basic');
    await page.evaluate(() => (globalThis as any).df$.shadcn.workflow.arrange('#wf-basic'));
    const after = await W(page, 'export', '#wf-basic');
    const x = (doc: any, id: string): number => doc.nodes.find((n: any) => n.id === id).x;
    assert.ok(x(after, 'p1') < x(after, 'u1') && x(after, 'u1') < x(after, 'r1') && x(after, 'r1') < x(after, 'v1'));
    await W(page, 'undo', '#wf-basic');
    assert.deepEqual(await W(page, 'export', '#wf-basic'), before);
  });

  await check('subworkflow: a double click opens it (breadcrumb, counts); the crumb leads back', async () => {
    await home(page);
    await page.dblclick('#wf-basic [data-node-id="s1"] .workflow-node-title');
    await frames(page);
    assert.equal(await text(page, '#out-nodes'), '1');
    assert.deepEqual(await page.locator('#wf-crumbs .breadcrumb-item').allInnerTexts(), ['Text pipeline', 'Shout']);
    assert.equal(await page.locator('[data-workflow-action="parent"]').isDisabled(), false);
    await page.click('#wf-crumbs [data-workflow-up]');
    await frames(page);
    assert.equal(await text(page, '#out-nodes'), '7');
    assert.equal(await page.locator('[data-workflow-action="parent"]').isDisabled(), true);
  });

  await check('run: every node runs in order, the preview shows the outputs, the run events go running → done', async () => {
    await page.evaluate(() => {
      (globalThis as any).__run = [];
      document.querySelector('#wf-basic')!.addEventListener('workflow-run', (e) => (globalThis as any).__run.push((e as CustomEvent).detail.status));
    });
    await page.click('[data-workflow-action="run"]');
    await page.waitForFunction(() => (globalThis as any).__run.includes('done'));
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__run), ['running', 'done']);
    await home(page);
    await W(page, 'camera', '#wf-basic', { x: -700, y: 80, zoom: 1 });
    await frames(page);
    const out = await text(page, '#wf-basic [data-node-id="v1"] .workflow-output');
    assert.match(out, /A LIGHTHOUSE AT DAWN \/ A LIGHTHOUSE AT DAWN/);
    assert.match(out, /^4$/m);
    assert.equal(await attr(page, '#wf-basic [data-node-id="v1"]', 'data-status'), 'success');
  });

  await check('run: an adapter that runs elsewhere reports states; cancel ends it as cancelled', async () => {
    await page.evaluate(() => {
      const w = (globalThis as any).df$.shadcn.workflow;
      w.configure('#wf-basic', {
        execution: {
          run: (doc: any, ctx: any) =>
            new Promise((_, reject) => {
              ctx.emit({ nodeId: 'p1', state: { status: 'running', progress: 0.5 } });
              ctx.signal.addEventListener('abort', () => reject(ctx.signal.reason));
            }),
        },
      });
      (globalThis as any).__run = [];
      void w.run('#wf-basic');
    });
    await page.waitForFunction(() => document.querySelector('#wf-basic')!.hasAttribute('data-running'));
    await W(page, 'camera', '#wf-basic', { x: 40, y: 80, zoom: 1 });
    await frames(page);
    assert.equal(await text(page, '#wf-basic [data-node-id="p1"] .workflow-node-status'), '50%');
    assert.equal(await page.locator('[data-workflow-action="cancel"]').isDisabled(), false);
    await page.click('[data-workflow-action="cancel"]');
    await page.waitForFunction(() => (globalThis as any).__run.includes('cancelled'));
    await frames(page);
    assert.equal(await attr(page, '#wf-basic [data-node-id="p1"]', 'data-status'), 'cancelled');
    await W(page, 'configure', '#wf-basic', { execution: null });
  });

  await check('readonly: the action toggles it (aria-pressed, data-readonly, disabled controls); edits are refused', async () => {
    await page.click('[data-workflow-action="readonly"]');
    assert.equal(await attr(page, '[data-workflow-action="readonly"]', 'aria-pressed'), 'true');
    assert.equal(await attr(page, '#wf-basic', 'data-readonly'), '');
    assert.equal(await page.locator('[data-workflow-action="undo"]').isDisabled(), true);
    assert.equal(await page.locator('#wf-palette [data-workflow-type="prompt"]').isDisabled(), true);
    await home(page);
    assert.equal(await page.locator('#wf-basic [data-node-id="p1"] fieldset').evaluate((f) => (f as HTMLFieldSetElement).disabled), true);
    assert.equal(await W(page, 'addNode', '#wf-basic', 'prompt'), undefined);
    await page.click('[data-workflow-action="readonly"]');
    assert.equal(await attr(page, '#wf-basic', 'data-readonly'), null);
    assert.equal(await page.locator('#wf-readonly [data-node-id="a"] fieldset').evaluate((f) => (f as HTMLFieldSetElement).disabled), true);
    assert.equal(await attr(page, '#wf-readonly [data-node-id="b"]', 'data-selected'), '');
  });

  await check('a card field edits the node data (one undo step)', async () => {
    await home(page);
    const area = page.locator('#wf-basic [data-node-id="p1"] textarea');
    await area.fill('three small words');
    await area.blur();
    let p1 = (await W(page, 'export', '#wf-basic')).nodes.find((n: any) => n.id === 'p1');
    assert.equal(p1.data.text, 'three small words');
    await W(page, 'undo', '#wf-basic');
    p1 = (await W(page, 'export', '#wf-basic')).nodes.find((n: any) => n.id === 'p1');
    assert.equal(p1.data.text, 'a lighthouse at dawn');
  });

  await check('history: every change by its label; travel() undoes and redoes to any change, one workflow-change each', async () => {
    const start = await W(page, 'history', '#wf-basic');
    const text = async () => (await W(page, 'export', '#wf-basic')).nodes.find((n: any) => n.id === 'p1').data.text;
    for (const t of ['one', 'two', 'three']) await W(page, 'setField', '#wf-basic', 'p1', 'text', t);
    const h = await W(page, 'history', '#wf-basic');
    assert.equal(h.at, start.at + 3);
    assert.equal(h.changes.length, h.at, 'a new change drops the undone ones');
    assert.match(h.changes.at(-1), /^Edit .+: text$/, 'named by the card and the key');
    const changes = await page.evaluate(() => {
      const el = document.querySelector('#wf-basic')!;
      const seen: string[] = [];
      el.addEventListener('workflow-change', (e: any) => seen.push(e.detail.label));
      (globalThis as any).__seen = seen;
      (globalThis as any).df$.shadcn.workflow.travel(el, (globalThis as any).df$.shadcn.workflow.history(el).at - 2);
      return seen.length;
    });
    assert.equal(changes, 2, 'two undo steps');
    assert.equal(await text(), 'one');
    assert.deepEqual(await W(page, 'history', '#wf-basic'), { changes: h.changes, at: h.at - 2 }, 'the undone ones stay, in redo order');
    await W(page, 'travel', '#wf-basic', 999);
    assert.equal(await text(), 'three', 'clamped to the newest');
    await W(page, 'travel', '#wf-basic', start.at);
    assert.equal(await text(), 'a lighthouse at dawn');
  });

  await check('inspector: rename, lock, data as JSON', async () => {
    await W(page, 'select', '#wf-basic', ['u1']);
    await frames(page);
    await page.fill('#wf-inspector [data-workflow-edit="title"]', 'Capitals');
    await page.locator('#wf-inspector [data-workflow-edit="title"]').blur();
    assert.equal((await W(page, 'export', '#wf-basic')).nodes.find((n: any) => n.id === 'u1').title, 'Capitals');
    await page.check('#wf-inspector [data-workflow-edit="locked"]');
    assert.equal((await W(page, 'export', '#wf-basic')).nodes.find((n: any) => n.id === 'u1').locked, true);
    await page.fill('#wf-inspector [data-workflow-edit="data"]', '{"note": "x"}');
    await page.click('#wf-inspector [data-workflow-edit="apply-data"]');
    assert.deepEqual((await W(page, 'export', '#wf-basic')).nodes.find((n: any) => n.id === 'u1').data, { note: 'x' });
    for (let i = 0; i < 3; i++) await W(page, 'undo', '#wf-basic');
    const u1 = (await W(page, 'export', '#wf-basic')).nodes.find((n: any) => n.id === 'u1');
    assert.deepEqual([u1.title, u1.locked, u1.data], ['Uppercase', undefined, {}]);
  });

  await check('keys: ⌘A selects all, Delete removes, ⌘Z restores, F fits, + zooms, Escape cancels a pending connection', async () => {
    await page.focus('#wf-basic');
    await page.keyboard.press('ControlOrMeta+a');
    assert.equal(await text(page, '#out-selection'), '7 selected');
    await page.keyboard.press('Delete');
    assert.equal(await nodes(page), 0);
    await page.keyboard.press('ControlOrMeta+z');
    assert.equal(await nodes(page), 7);
    await page.keyboard.press('f');
    await frames(page);
    const fit = (await W(page, 'camera', '#wf-basic')).zoom;
    await page.keyboard.press('+');
    await frames(page);
    assert.ok((await W(page, 'camera', '#wf-basic')).zoom > fit);
    await home(page);
    await page.locator(`#wf-basic [data-node-id="p1"] [data-port-id="text"]`).focus();
    await page.keyboard.press('Enter');
    assert.equal(await attr(page, '#wf-basic', 'data-connecting'), 'output');
    await page.focus('#wf-basic');
    await page.keyboard.press('Escape');
    assert.equal(await attr(page, '#wf-basic', 'data-connecting'), null);
  });

  await check('a port that takes the focus at the edge never scrolls the editor (cards, canvas and pointer stay in line)', async () => {
    // VERIFIED defect: overflow hidden let a focus scroll the editor by 86px - every later click missed what it showed
    const width = await page.evaluate(() => document.querySelector('#wf-basic')!.clientWidth);
    // u1's output port (world x 600) on the right edge
    await W(page, 'camera', '#wf-basic', { x: width - 600, y: 80, zoom: 1 });
    await frames(page);
    await page.locator('#wf-basic [data-node-id="u1"] [data-port-id="out"]').focus();
    await page.evaluate(() => document.querySelector('#wf-basic [data-node-id="u1"]')!.scrollIntoView());
    assert.deepEqual(await page.evaluate(() => [document.querySelector('#wf-basic')!.scrollLeft, document.querySelector('#wf-basic')!.scrollTop]), [0, 0]);
    await page.focus('#wf-basic');
  });

  await check('keys: Enter on one port, then on another, connects', async () => {
    const id = await W(page, 'addNode', '#wf-basic', 'uppercase', { x: 490, y: 560 });
    await W(page, 'camera', '#wf-basic', { x: 20, y: 60, zoom: 0.6 });
    await frames(page);
    await page.locator(`#wf-basic [data-node-id="p1"] [data-port-id="text"]`).focus();
    await page.keyboard.press('Enter');
    await page.locator(`#wf-basic [data-node-id="${id}"] [data-port-id="text"]`).focus();
    await page.keyboard.press('Enter');
    const doc = await W(page, 'export', '#wf-basic');
    assert.ok(doc.edges.some((e: any) => e.source.node === 'p1' && e.target.node === id));
    await W(page, 'undo', '#wf-basic');
    await W(page, 'undo', '#wf-basic');
  });

  await check('view: the wheel zooms at the cursor, a background drag pans, the minimap moves the view, the controls zoom', async () => {
    await home(page);
    const box = (await page.locator('#wf-basic').boundingBox())!;
    await page.mouse.move(box.x + 200, box.y + 200);
    await page.mouse.wheel(0, -200);
    await frames(page);
    let cam = await W(page, 'camera', '#wf-basic');
    assert.ok(cam.zoom > 1, `zoom ${cam.zoom}`);
    await home(page);
    await drag(page, { x: box.x + 520, y: box.y + 20 }, { x: box.x + 420, y: box.y + 60 });
    cam = await W(page, 'camera', '#wf-basic');
    assert.deepEqual([cam.x, cam.y], [-60, 120]);
    const mini = (await page.locator('#wf-basic .workflow-minimap').boundingBox())!;
    await page.mouse.click(mini.x + mini.width - 10, mini.y + mini.height / 2);
    await frames(page);
    assert.ok((await W(page, 'camera', '#wf-basic')).x < cam.x, 'the view moved right');
    await home(page);
    await page.click('#wf-basic [data-workflow-control="zoom-in"]');
    assert.equal((await W(page, 'camera', '#wf-basic')).zoom, 1.25);
    await page.click('#wf-basic [data-workflow-control="reset"]');
    assert.equal((await W(page, 'camera', '#wf-basic')).zoom, 1);
  });

  await check('formats: a ComfyUI prompt and a Gradio workflow load and write back; generate is deterministic', async () => {
    const r = await page.evaluate(() => {
      const w = (globalThis as any).df$.shadcn.workflow;
      const prompt = {
        '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'model.safetensors' } },
        '2': { class_type: 'CLIPTextEncode', inputs: { text: 'a cat', clip: ['1', 1] } },
        '3': { class_type: 'KSampler', inputs: { seed: 7, model: ['1', 0], positive: ['2', 0] } },
      };
      const doc = w.fromComfy(prompt);
      const back = w.toComfy(doc);
      const gradio = {
        schema_version: '2', id: 'g', name: 'Gradio flow',
        references: [{ id: 'r', label: 'Input', inputs: [], outputs: [{ id: 'o', type: 'text' }] }],
        operators: [{ id: 'op', label: 'Summarize', inputs: [{ id: 'i', type: 'markdown', required: true }], outputs: [] }],
        subjects: [],
        edges: [{ id: 'e', from_node_id: 'r', from_port_id: 'o', to_node_id: 'op', to_port_id: 'i' }],
      };
      const gdoc = w.fromGradio(gradio);
      const gback = w.toGradio(gdoc);
      const a = w.generate({ nodes: 200, edges: 400, seed: 3 });
      const b = w.generate({ nodes: 200, edges: 400, seed: 3 });
      return {
        nodes: doc.nodes.length, edges: doc.edges.length, back: back['3'].inputs.positive, seed: back['3'].inputs.seed,
        gnodes: gdoc.nodes.length, gedge: gback.edges[0], same: JSON.stringify(a) === JSON.stringify(b), valid: w.validate(a),
      };
    });
    assert.deepEqual(r, {
      nodes: 3, edges: 3, back: ['2', 0], seed: 7, gnodes: 2,
      gedge: { id: 'e', from_node_id: 'r', from_port_id: 'o', to_node_id: 'op', to_port_id: 'i', type: 'text' },
      same: true, valid: null,
    });
  });

  await check('import: the file input reads a ComfyUI prompt; an invalid file keeps the workflow and says why', async () => {
    const before = await W(page, 'export', '#wf-basic');
    const input = page.locator('#wf-basic input[type="file"]');
    await input.setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{"schemaVersion": 2, "id": "x"}') });
    await page.waitForFunction(() => /Unsupported schemaVersion/.test(document.querySelector('#wf-basic .workflow-message')!.textContent ?? ''));
    assert.deepEqual(await W(page, 'export', '#wf-basic'), before);
    const prompt = { '1': { class_type: 'LoadImage', inputs: { image: 'cat.png' } }, '2': { class_type: 'SaveImage', inputs: { images: ['1', 0] } } };
    await input.setInputFiles({ name: 'prompt.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(prompt)) });
    await page.waitForFunction(() => document.querySelector('#out-nodes')!.textContent === '2');
    assert.equal(await text(page, '#out-title'), 'Imported ComfyUI prompt');
    // the inspector follows a loaded graph too (a new graph starts at version 0 again - its key once held)
    await W(page, 'select', '#wf-basic', []);
    assert.match(await text(page, '#wf-inspector .workflow-inspector-kicker'), /imported comfyui prompt/i);
    await W(page, 'load', '#wf-basic', before);
    assert.equal(await text(page, '#out-nodes'), '7');
  });

  await check('export action: downloads the document as JSON', async () => {
    const download = page.waitForEvent('download');
    await page.click('[data-workflow-action="export"]');
    const file = await download;
    assert.equal(file.suggestedFilename(), 'text-pipeline.json');
  });

  const job = (wf: string, key: string): string => `#${wf} [data-node-id="j1"] .workflow-field[data-key="${key}"]`;

  await check('fields: a custom editor value is a button with an arrow on its label; render() draws it; renderLabel follows the value', async () => {
    await W(page, 'camera', '#wf-custom', { x: 40, y: 60, zoom: 1 });
    await W(page, 'camera', '#wf-list', { x: 40, y: 60, zoom: 1 });
    await frames(page);
    const r = await page.evaluate(() => {
      const f = (k: string) => document.querySelector(`#wf-custom [data-node-id="j1"] .workflow-field[data-key="${k}"]`)!;
      return {
        config: f('config').querySelector('.fx-config')?.textContent,
        role: f('config').querySelector('.workflow-field-value')!.getAttribute('role'),
        popup: f('config').querySelector('.workflow-field-value')!.getAttribute('aria-haspopup'),
        arrows: ['config', 'script', 'threshold'].map((k) => !!f(k).querySelector('.workflow-field-edit-icon svg')),
        script: f('script').querySelector('.workflow-field-value')!.textContent,
        label: f('threshold').querySelector('.fx-label')?.textContent,
      };
    });
    assert.deepEqual(r, {
      config: 'x4 · 30 steps · faces',
      role: 'button',
      popup: 'dialog',
      arrows: [true, true, false],
      script: 'return input;',
      label: '✓ Threshold',
    });
    const detail = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const wf = document.querySelector('#wf-custom')!;
          wf.addEventListener('workflow-field-change', (e) => resolve((e as CustomEvent).detail), { once: true });
          (globalThis as any).df$.shadcn.workflow.setField(wf, 'j1', 'threshold', 0.9);
        }),
    );
    assert.deepEqual(detail, { nodeId: 'j1', key: 'threshold', value: 0.9, oldValue: 0.4, path: [] });
    await frames(page);
    assert.equal(await text(page, `${job('wf-custom', 'threshold')} .fx-label`), '⚠ Threshold');
    assert.equal(await attr(page, `${job('wf-custom', 'threshold')} .fx-label`, 'data-level'), 'high');
    assert.equal(await page.inputValue(`${job('wf-custom', 'threshold')} input`), '0.9');
    assert.equal(await W(page, 'getField', '#wf-custom', 'j1', 'threshold'), 0.9);
    assert.equal(await W(page, 'setField', '#wf-custom', 'nope', 'threshold', 1), false);
  });

  await check('a JSON type borrows a field render() (and run) from the global type of the same name', async () => {
    assert.equal(await text(page, '#wf-custom [data-node-id="st"] .workflow-field[data-key="stamp"] .fx-stamp'), 'approved');
    assert.equal(await page.locator('#wf-custom [data-node-id="st"] .workflow-field[data-key="name"] input').count(), 1, 'its JSON fields stay');
  });

  await check('custom editor: a click on the value asks with workflow-field-edit, then edit() - its value lands (one undo step); undefined keeps the old one', async () => {
    await page.evaluate(() => {
      const g = globalThis as any;
      g.__nextConfig = { model: 'swinir', steps: 12, faces: false };
      g.__events = [];
      const wf = document.querySelector('#wf-custom')!;
      for (const n of ['workflow-field-edit', 'workflow-field-change'])
        wf.addEventListener(n, (e) => g.__events.push([n, (e as CustomEvent).detail.key]));
    });
    await page.click(`${job('wf-custom', 'config')} [data-workflow-field-edit="config"]`);
    await frames(page);
    assert.equal(await text(page, `${job('wf-custom', 'config')} .fx-config`), 'swinir · 12 steps');
    const r = await page.evaluate(() => ({ events: (globalThis as any).__events, edited: (globalThis as any).__edited }));
    assert.deepEqual(r.events, [['workflow-field-edit', 'config'], ['workflow-field-change', 'config']]);
    assert.deepEqual(r.edited, { value: { model: 'x4', steps: 30, faces: true }, node: 'j1', custom: true });
    await W(page, 'undo', '#wf-custom');
    assert.equal((await W(page, 'getField', '#wf-custom', 'j1', 'config')).model, 'x4');
    // the keyboard opens it too; an editor that answers undefined changes nothing
    await page.evaluate(() => ((globalThis as any).__nextConfig = undefined));
    await page.focus(`${job('wf-custom', 'config')} [data-workflow-field-edit="config"]`);
    await page.keyboard.press('Enter');
    await frames(page);
    const events = await page.evaluate(() => (globalThis as any).__events.length);
    assert.equal(events, 3, 'only the edit request, no change');
    assert.equal((await W(page, 'getField', '#wf-custom', 'j1', 'config')).model, 'x4');
  });

  await check('external editor: workflow-field-edit is cancelable - the page writes with setField(); editField() focuses an inline control', async () => {
    const r = await page.evaluate(async () => {
      const wf = document.querySelector('#wf-custom')!;
      const w = (globalThis as any).df$.shadcn.workflow;
      const seen: unknown[] = [];
      const on = (e: Event): void => {
        const d = (e as CustomEvent).detail;
        seen.push(d);
        e.preventDefault();
        w.setField(wf, d.nodeId, d.key, 'return input.trim();');
      };
      wf.addEventListener('workflow-field-edit', on);
      const wrote = await w.editField(wf, 'j1', 'script');
      wf.removeEventListener('workflow-field-edit', on);
      const focused = await w.editField(wf, 'j1', 'threshold');
      return { seen, wrote, value: w.getField(wf, 'j1', 'script'), focused, active: (document.activeElement as HTMLInputElement).type };
    });
    assert.deepEqual(r, {
      seen: [{ nodeId: 'j1', key: 'script', value: 'return input;', path: [] }],
      wrote: false,
      value: 'return input.trim();',
      focused: true,
      active: 'range',
    });
    await frames(page);
    assert.equal(await text(page, `${job('wf-custom', 'script')} .workflow-field-value`), 'return input.trim();');
  });

  await check('readonly: a custom editor value is aria-disabled and opens nothing', async () => {
    await page.evaluate(() => (document.querySelector('#wf-custom') as any).api.setState('readonly'));
    await frames(page);
    assert.equal(await attr(page, `${job('wf-custom', 'config')} .workflow-field-value`, 'aria-disabled'), 'true');
    const before = await page.evaluate(() => (globalThis as any).__events.length);
    // aria-disabled: Playwright refuses a click, the browser does not
    await page.dispatchEvent(`${job('wf-custom', 'config')} .workflow-field-value`, 'click');
    assert.equal(await W(page, 'editField', '#wf-custom', 'j1', 'config'), false);
    assert.equal(await page.evaluate(() => (globalThis as any).__events.length), before);
    await page.evaluate(() => (document.querySelector('#wf-custom') as any).api.setState('default'));
  });

  await check('list layout (data-layout=list): the fields as a Property Grid list - labels above values, a value edits in place, the change is a workflow-field-change', async () => {
    const r = await page.evaluate(() => {
      const card = document.querySelector('#wf-list [data-node-id="j1"]')!;
      const grid = card.querySelector('.workflow-properties')!;
      const tr = grid.querySelector('tr[data-path="threshold"]')!;
      const key = tr.querySelector('.property-grid-key')!.getBoundingClientRect();
      const value = tr.querySelector('.property-grid-value')!.getBoundingClientRect();
      const raw = document.querySelector('#wf-list [data-node-id="raw"] .workflow-properties');
      return {
        layout: card.getAttribute('data-layout'),
        grid: grid.getAttribute('data-layout'),
        rows: [...grid.querySelectorAll('tbody tr')].map((x) => x.getAttribute('data-path')),
        above: key.bottom <= value.top + 1,
        label: tr.querySelector('.fx-label')?.textContent,
        arrow: !!grid.querySelector('tr[data-path="config"] .workflow-field-edit-icon'),
        config: grid.querySelector('tr[data-path="config"] .fx-config')?.textContent,
        raw: raw ? [...raw.querySelectorAll('tbody tr')].map((x) => x.getAttribute('data-path')) : null,
      };
    });
    assert.deepEqual(r, {
      layout: 'list',
      grid: 'list',
      rows: ['threshold', 'config', 'script'],
      above: true,
      label: '✓ Threshold',
      arrow: true,
      config: 'x4 · 30 steps · faces',
      raw: ['quality', 'format'],
    });
    const changes = page.evaluate(
      () =>
        new Promise((resolve) => {
          const out: unknown[] = [];
          const wf = document.querySelector('#wf-list')!;
          wf.addEventListener('workflow-field-change', (e) => {
            out.push((e as CustomEvent).detail);
            if (out.length === 2) resolve(out);
          });
          // the grid's own events stay inside the card
          document.addEventListener('property-grid-change', () => out.push('leaked'), { once: true });
        }),
    );
    await page.click('#wf-list [data-node-id="j1"] tr[data-path="threshold"] .property-grid-value');
    await page.fill('#wf-list [data-node-id="j1"] .property-grid-editor input', '0.7');
    await page.keyboard.press('Enter');
    await page.click('#wf-list [data-node-id="raw"] tr[data-path="format"] .property-grid-value');
    await page.fill('#wf-list [data-node-id="raw"] .property-grid-editor input', 'png');
    await page.keyboard.press('Enter');
    assert.deepEqual(await changes, [
      { nodeId: 'j1', key: 'threshold', value: 0.7, oldValue: 0.4, path: [] },
      { nodeId: 'raw', key: 'format', value: 'png', oldValue: 'webp', path: [] },
    ]);
    // moving a node redraws none of its fields (a drag hands the card a new node every frame)
    const kept = await page.evaluate(async () => {
      const w = (globalThis as any).df$.shadcn.workflow;
      const row = document.querySelector('#wf-list [data-node-id="j1"] tr[data-path="config"]');
      const n = w.export('#wf-list').nodes.find((x: any) => x.id === 'j1');
      w.commit('#wf-list', 'Move', [{ kind: 'nodes', id: 'j1', value: { ...n, x: n.x + 32 } }]);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const same = row === document.querySelector('#wf-list [data-node-id="j1"] tr[data-path="config"]');
      w.undo('#wf-list');
      return same;
    });
    assert.equal(kept, true, 'the list rows survive a move');
    // a custom editor's row opens the editor
    await page.evaluate(() => ((globalThis as any).__nextConfig = { model: 'lanczos', steps: 1, faces: false }));
    await page.click('#wf-list [data-node-id="j1"] tr[data-path="config"] .property-grid-value');
    await frames(page);
    assert.equal(await text(page, '#wf-list [data-node-id="j1"] tr[data-path="config"] .fx-config'), 'lanczos · 1 steps');
  });

  await check('navigator: tree() lists groups, nodes and subworkflow nodes for a Data Tree; a pick selects (Follow off: the view stays, on: it moves); the selection opens the one way to it', async () => {
    const rows = await W(page, 'tree', '#nav-wf');
    assert.deepEqual(
      rows.map((r: any) => [r.id, r.parentId, r.kind, r.path.join('/')]),
      [
        ['#g1', null, 'group', ''],
        ['a', '#g1', 'node', 'a'],
        ['b', '#g1', 'node', 'b'],
        ['far', null, 'node', 'far'],
        ['sub', null, 'subworkflow', 'sub'],
        ['sub/inner', 'sub', 'node', 'sub/inner'],
      ],
    );
    const item = (name: string) => page.locator('#nav-tree .data-tree-item', { hasText: name }).first();
    const camera = await W(page, 'camera', '#nav-wf');
    await item('Far away').click();
    assert.equal(await attr(page, '#nav-wf', 'data-selected'), 'far');
    assert.deepEqual(await W(page, 'camera', '#nav-wf'), camera, 'Follow off: the view stays');
    await page.click('#nav-follow');
    assert.equal(await attr(page, '#nav-follow', 'aria-pressed'), 'true');
    await item('Polish').locator('.data-tree-toggle').click();
    await item('Inner shout').click();
    await frames(page);
    assert.equal(await attr(page, '#nav-wf', 'data-selected'), 'inner');
    const inside = await page.evaluate(() => {
      const wf = document.querySelector('#nav-wf')!.getBoundingClientRect();
      const card = document.querySelector('#nav-wf [data-node-id="inner"]')?.getBoundingClientRect();
      return !!card && Math.abs(card.left + card.width / 2 - (wf.left + wf.width / 2)) < 40;
    });
    assert.equal(inside, true, 'Follow on: the view moved into the subworkflow, onto the node');
    // the other way: a selection in the workflow opens only the way to it in the tree
    await W(page, 'leave', '#nav-wf');
    await W(page, 'select', '#nav-wf', ['b']);
    const config = await page.$eval('#nav-tree', (t: any) => t.store.value.config);
    assert.deepEqual([config.expanded, config.selected], [['#g1'], 'b']);
    assert.equal(await page.$eval('#nav-tree .data-tree-item[aria-selected="true"]', (i) => i.textContent), 'Shout');
    // a filter finds nodes at any depth
    await page.fill('#nav-filter', 'shout');
    await page.waitForFunction(() => document.querySelector('#nav-tree')!.querySelectorAll('.data-tree-item').length === 4);
    assert.deepEqual(
      await page.$$eval('#nav-tree .data-tree-item', (xs) => xs.map((x) => x.textContent)),
      ['Draft', 'Shout', 'Polish', 'Inner shout'],
    );
    await page.fill('#nav-filter', '');
    // the rows follow the document
    const far = (await W(page, 'export', '#nav-wf')).nodes.find((n: any) => n.id === 'far');
    await W(page, 'commit', '#nav-wf', 'Rename', [{ kind: 'nodes', id: 'far', value: { ...far, title: 'Very far' } }]);
    await page.waitForFunction(() => [...document.querySelectorAll('#nav-tree .data-tree-item')].some((x) => x.textContent === 'Very far'));
  });

  await check('connection types: a port type lends look and label, a connection its own type, label and animation; a run labels what went through and moves dashes into the running node', async () => {
    await W(page, 'camera', '#wf-links', { x: 40, y: 40, zoom: 1 });
    await frames(page);
    const labels = () =>
      page.evaluate(() =>
        Object.fromEntries([...document.querySelectorAll('#wf-links .workflow-edge-label')].map((l) => [(l as HTMLElement).dataset.edgeId, l.textContent])),
      );
    const flows = () => page.evaluate(() => document.querySelectorAll('#wf-links .workflow-edge-flow path').length);
    assert.deepEqual(await labels(), { l1: 'batch', l2: 'on empty', l3: 'plain' });
    assert.equal(await flows(), 1, 'only the animated connection moves');
    const run = W(page, 'run', '#wf-links');
    await page.waitForFunction(() => document.querySelector('#wf-links [data-node-id="sink"]')?.getAttribute('data-status') === 'running');
    await frames(page);
    assert.ok((await flows()) >= 3, 'the connections into the running node carry moving dashes');
    assert.equal(await attr(page, '#wf-links', 'aria-busy'), 'true', 'busy while the run is in flight');
    await run;
    await frames(page);
    assert.equal(await attr(page, '#wf-links', 'aria-busy'), null);
    assert.deepEqual(await labels(), { l1: '3 values', l2: 'on empty', l3: 'plain' });
    assert.equal(await flows(), 1);
  });

  await check('connection labels keep clear: none covers a card or another label; with no free place one hides (data-crowded) - the selected one still shows', async () => {
    await W(page, 'camera', '#wf-links', { x: 40, y: 40, zoom: 1 });
    await frames(page);
    type Box = { x: number; y: number; r: number; b: number };
    const boxes = () =>
      page.evaluate(() => {
        const box = (e: Element) => {
          const b = e.getBoundingClientRect();
          return { x: b.left, y: b.top, r: b.right, b: b.bottom };
        };
        return {
          labels: [...document.querySelectorAll('#wf-links .workflow-edge-label')].map((l) => ({
            id: (l as HTMLElement).dataset.edgeId!,
            crowded: l.hasAttribute('data-crowded'),
            ...box(l),
          })),
          cards: [...document.querySelectorAll('#wf-links .workflow-node')].map(box),
        };
      });
    const hit = (a: Box, b: Box): boolean => a.x < b.r && a.r > b.x && a.y < b.b && a.b > b.y;
    let { labels, cards } = await boxes();
    assert.deepEqual(labels.filter((l) => l.crowded).map((l) => l.id), [], 'room for every label');
    for (const l of labels) {
      for (const c of cards) assert.ok(!hit(l, c), `${l.id} covers a card`);
      for (const o of labels) if (o !== l) assert.ok(!hit(l, o), `${l.id} covers ${o.id}`);
    }
    // a card over the whole way between the two columns: no label finds a place
    const wall = await W(page, 'node', '#wf-links', 'prompt', { x: 205, y: -300 }, { id: 'wall', title: 'Wall', width: 210, height: 800 });
    await W(page, 'commit', '#wf-links', 'Wall', [{ kind: 'nodes', id: 'wall', value: wall }]);
    await frames(page);
    ({ labels } = await boxes());
    assert.deepEqual(labels.filter((l) => l.crowded).map((l) => l.id).sort(), ['l1', 'l2', 'l3']);
    assert.equal(await page.locator('#wf-links .workflow-edge-label[data-edge-id="l1"]').isVisible(), false);
    await W(page, 'select', '#wf-links', [], 'l1');
    await frames(page);
    ({ labels } = await boxes());
    assert.deepEqual(labels.filter((l) => l.crowded).map((l) => l.id).sort(), ['l2', 'l3'], 'the selected label shows');
    await W(page, 'select', '#wf-links', []);
    await W(page, 'undo', '#wf-links');
    await frames(page);
    ({ labels } = await boxes());
    assert.deepEqual(labels.filter((l) => l.crowded).map((l) => l.id), []);
  });

  await check('palette: data-workflow-types lists only the named types - a name, or prefix* for every name that starts so', async () => {
    const listed = () => page.locator('#wf-palette [data-workflow-type]').evaluateAll((b) => b.map((x) => (x as HTMLElement).dataset.workflowType));
    const all = await listed();
    await page.evaluate(() => ((document.querySelector('#wf-palette') as HTMLElement).dataset.workflowTypes = 'count up*'));
    // read on the next render - a search is one
    await page.fill('#wf-palette [data-workflow-search]', ' ');
    await page.fill('#wf-palette [data-workflow-search]', '');
    assert.deepEqual(await listed(), all.filter((t) => t === 'count' || t!.startsWith('up')));
    await page.evaluate(() => delete (document.querySelector('#wf-palette') as HTMLElement).dataset.workflowTypes);
    await page.fill('#wf-palette [data-workflow-search]', ' ');
    await page.fill('#wf-palette [data-workflow-search]', '');
    assert.deepEqual(await listed(), all);
  });

  await check('connection labels: a click selects the connection (workflow-select); setEdge() changes it as one undoable change and validates it', async () => {
    const said = page.evaluate(
      () => new Promise((r) => document.querySelector('#wf-links')!.addEventListener('workflow-select', (e: any) => r(e.detail.edge), { once: true })),
    );
    await page.locator('#wf-links .workflow-edge-label[data-edge-id="l2"]').click();
    assert.equal(await said, 'l2');
    await frames(page);
    assert.equal(await attr(page, '#wf-links .workflow-edge-label[data-edge-id="l2"]', 'data-selected'), '');
    assert.equal(await W(page, 'setEdge', '#wf-links', 'l1', { label: 'renamed', animated: true, dash: 'dashed', width: 5 }), true);
    await frames(page);
    let doc = await W(page, 'export', '#wf-links');
    assert.deepEqual(
      (({ label, animated, dash, width }) => ({ label, animated, dash, width }))(doc.edges.find((x: any) => x.id === 'l1')),
      { label: 'renamed', animated: true, dash: 'dashed', width: 5 },
    );
    assert.equal(await page.evaluate(() => document.querySelectorAll('#wf-links .workflow-edge-flow path').length), 2);
    await W(page, 'undo', '#wf-links');
    doc = await W(page, 'export', '#wf-links');
    assert.equal(doc.edges.find((x: any) => x.id === 'l1').label, undefined);
    const refused = await page.evaluate(() => {
      try {
        (globalThis as any).df$.shadcn.workflow.setEdge('#wf-links', 'l1', { width: 40 });
        return 'accepted';
      } catch (err) {
        return (err as Error).message;
      }
    });
    assert.match(refused, /width/);
    assert.equal(await W(page, 'setEdge', '#wf-links', 'nope', { label: 'x' }), false);
    const invalid = await W(page, 'validate', {
      schemaVersion: 1, id: 'x', title: 'x', groups: [],
      nodes: [], edges: [{ id: 'e', dash: 'wavy', source: { node: 'a', port: 'b' }, target: { node: 'c', port: 'd' } }],
    });
    assert.match(String(invalid), /dash/);
  });

  await check('State API: readonly and default with a selection, a connection, a camera', async () => {
    const r = await page.evaluate(async () => {
      const el = document.querySelector('#wf-basic') as any;
      await el.api.setState('readonly', { selected: ['p1', 'u1'] });
      const a = [el.getAttribute('data-readonly'), el.getAttribute('data-selected'), el.api.getState().name];
      await el.api.setState('default', { edge: 'e1' });
      const b = [el.getAttribute('data-readonly'), el.getAttribute('data-selected'), el.getAttribute('data-selected-edge'), el.api.getState().config.selected];
      await el.api.setState('default', { selected: 'v1', camera: { x: 10, y: 20, zoom: 0.75 } });
      const c = [el.getAttribute('data-selected'), el.getAttribute('data-selected-edge'), el.api.getState().config.camera];
      el.setAttribute('data-selected', 'n1');
      await new Promise((r) => setTimeout(r, 30));
      const d = (globalThis as any).df$.shadcn.workflow.export ? el.api.getState().config.selected : null;
      return { a, b, c, d };
    });
    assert.deepEqual(r, {
      a: ['', 'p1 u1', 'readonly'],
      b: [null, null, 'e1', []],
      c: ['v1', null, { x: 10, y: 20, zoom: 0.75 }],
      d: ['n1'],
    });
    assert.equal(await text(page, '#out-selection'), '1 selected');
  });

  await check('destroy(): the worker stops, the chrome and the outlets empty, the State API unbinds, data-init stays', async () => {
    const r = await page.evaluate(() => {
      (globalThis as any).df$.shadcn.workflow.destroy('#wf-readonly');
      const el = document.querySelector('#wf-readonly') as any;
      return { chrome: el.querySelectorAll('[data-ce-chrome]').length, api: !!el.api, init: el.hasAttribute('data-init') };
    });
    assert.deepEqual(r, { chrome: 0, api: false, init: true });
  });

  await check('no page errors', async () => {
    assert.deepEqual(errors, []);
  });

  await check('render() contract: default and readonly on every fixture workflow', async () => {
    const n = await assertRenderContract(page, '.workflow[id]', ['default', 'readonly'], {
      runtimeAttrs: ['role', 'aria-roledescription', 'tabindex', 'data-renderer', 'data-workflow-status', 'data-gesture', 'data-connecting', 'data-running'],
      runtimeOwned: '[data-ce-chrome]',
    });
    assert.ok(n >= 4, `${n} instances`);
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nworkflow: all checks passed');
