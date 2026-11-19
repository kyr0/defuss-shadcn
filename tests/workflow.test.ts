import { describe, expect, test } from 'vitest';
import { waitFor } from './helpers';

/**
 * Why: the Workflow editor's promises are edits that are checked whole and undone whole, gestures that become one
 * transaction, keys that work like a desktop editor's, runs that report their states, and formats that round-trip.
 * tests/e2e/workflows/workflow.e2e.ts proves them with trusted Playwright input; this drives the same public behaviors
 * in the unit suite on the component's e2e fixture - through the df$.shadcn.workflow namespace, the State API,
 * keyboard and pointer events and the outlets' controls - so the paths the e2e reaches only by mouse (marquee, pinch,
 * paste, align, the inspector's edits, the main-thread renderer) are covered too.
 */

type W = Record<string, (...a: any[]) => any>;
/** the fixture frame's window: its own constructors (an event or an object of another realm is not its own) */
type Win = Window & typeof globalThis & { df$: { shadcn: { workflow: W } } };

async function openFixture(): Promise<{ win: Win; doc: Document; w: W; el: HTMLElement }> {
  document.body.innerHTML = '';
  const frame = document.createElement('iframe');
  frame.setAttribute('style', 'position:fixed;inset:0;width:1440px;height:1000px;border:0;background:#fff');
  frame.src = '/tests/e2e/workflows/workflow.e2e-fixture.html';
  document.body.appendChild(frame);
  await waitFor(() => frame.contentDocument?.readyState === 'complete' && !!(frame.contentWindow as Win | null)?.df$?.shadcn?.workflow, 'the fixture', 15000);
  const doc = frame.contentDocument!;
  await waitFor(() => [...doc.querySelectorAll('.workflow')].every((el) => el.getAttribute('data-workflow-status') === 'ready'), 'the editors', 30000);
  const win = frame.contentWindow as Win;
  return { win, doc, w: win.df$.shadcn.workflow, el: doc.getElementById('wf-basic')! };
}

const tick = (win: Win): Promise<void> => new Promise((r) => win.requestAnimationFrame(() => win.setTimeout(r, 30)));
const key = (el: Element, k: string, init: KeyboardEventInit = {}): void => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: k === ' ' ? 'Space' : k, bubbles: true, cancelable: true, ...init }));
};
const center = (el: Element): { x: number; y: number } => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};
/** a pointer gesture of synthetic events: down on `from`'s element, moves, up */
async function gesture(win: Win, root: Element, at: Element, from: { x: number; y: number }, to: { x: number; y: number }, init: PointerEventInit = {}): Promise<void> {
  const ev = (type: string, p: { x: number; y: number }, buttons: number): PointerEvent =>
    new win.PointerEvent(type, { pointerId: 1, pointerType: 'mouse', isPrimary: true, bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, button: 0, buttons, ...init });
  at.dispatchEvent(ev('pointerdown', from, 1));
  for (const f of [0.25, 0.5, 0.75, 1]) root.dispatchEvent(ev('pointermove', { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f }, 1));
  root.dispatchEvent(ev('pointerup', to, 0));
  await tick(win);
}
const node = (w: W, el: HTMLElement, id: string): any => w.export(el).nodes.find((n: any) => n.id === id);

describe('Workflow: edits, gestures, keys, runs and formats', () => {
  test('gestures: a header drag moves a node onto the grid, a Shift-drag selects by marquee, a port drag connects', async () => {
    const { win, doc, w, el } = await openFixture();
    w.camera(el, { x: 40, y: 80, zoom: 1 });
    await tick(win);
    const before = node(w, el, 'r1');
    const title = doc.querySelector('#wf-basic [data-node-id="r1"] .workflow-node-title')!;
    const a = center(title);
    await gesture(win, el, title, a, { x: a.x + 70, y: a.y + 30 });
    const after = node(w, el, 'r1');
    expect([after.x, after.y]).toEqual([Math.round((before.x + 70) / 16) * 16, Math.round((before.y + 30) / 16) * 16]);
    w.undo(el);
    // marquee over the left column (Prompt and Times)
    const grid = el.querySelector('.workflow-grid')!;
    const box = el.getBoundingClientRect();
    await gesture(win, el, grid, { x: box.left + 20, y: box.top + 60 }, { x: box.left + 320, y: box.top + 540 }, { shiftKey: true });
    expect(el.getAttribute('data-selected')!.split(' ').sort()).toEqual(['n1', 'p1']);
    // connect: Times' output to a new Repeat's times input
    const id = w.addNode(el, 'repeat', { x: 380, y: 520 });
    w.camera(el, { x: 20, y: 60, zoom: 0.6 });
    await tick(win);
    const from = doc.querySelector('#wf-basic [data-node-id="n1"] [data-port-id="value"] i')!;
    const to = doc.querySelector(`#wf-basic [data-node-id="${id}"] [data-port-id="times"] i`)!;
    await gesture(win, el, from, center(from), center(to));
    expect(w.export(el).edges.some((e: any) => e.source.node === 'n1' && e.target.node === id && e.target.port === 'times')).toBe(true);
    // a background drag pans
    w.camera(el, { x: 40, y: 80, zoom: 1 });
    await gesture(win, el, grid, { x: box.left + 600, y: box.top + 30 }, { x: box.left + 500, y: box.top + 70 });
    expect(w.camera(el)).toMatchObject({ x: -60, y: 120 });
  });

  test('keys: select all, copy and paste, duplicate, delete, undo and redo, nudge, follow a connection, zoom, fit, enter', async () => {
    const { win, w, el } = await openFixture();
    const count = (): number => w.export(el).nodes.length;
    key(el, 'a', { ctrlKey: true });
    expect(el.getAttribute('data-selected')!.split(' ').length).toBe(7);
    key(el, 'c', { ctrlKey: true });
    key(el, 'v', { ctrlKey: true });
    expect(count()).toBe(14);
    key(el, 'z', { metaKey: true });
    expect(count()).toBe(7);
    key(el, 'z', { metaKey: true, shiftKey: true });
    expect(count()).toBe(14);
    key(el, 'z', { metaKey: true });
    w.select(el, ['u1']);
    key(el, 'd', { ctrlKey: true });
    expect(count()).toBe(8);
    key(el, 'Delete');
    expect(count()).toBe(7);
    w.select(el, ['u1']);
    const x = node(w, el, 'u1').x;
    key(el, 'ArrowRight');
    key(el, 'ArrowDown', { shiftKey: true });
    expect([node(w, el, 'u1').x - x, node(w, el, 'u1').y]).toEqual([16, 64]);
    key(el, 'y', { ctrlKey: true });
    w.undo(el);
    w.undo(el);
    key(el, 'ArrowRight', { altKey: true });
    expect(el.getAttribute('data-selected')).toBe('r1');
    key(el, 'ArrowLeft', { altKey: true });
    expect(el.getAttribute('data-selected')).toBe('u1');
    w.camera(el, { x: 0, y: 0, zoom: 1 });
    key(el, '+');
    expect(w.camera(el).zoom).toBeCloseTo(1.25);
    key(el, '-');
    expect(w.camera(el).zoom).toBeCloseTo(1);
    key(el, '0');
    key(el, 'f', { shiftKey: true });
    key(el, 'f');
    w.select(el, ['s1']);
    key(el, 'Enter');
    await tick(win);
    expect(w.export(el).nodes.length).toBe(7);
    expect(el.ownerDocument.querySelector('#out-nodes')!.textContent).toBe('1');
    key(el, 'Escape');
    w.leave(el);
    expect(el.ownerDocument.querySelector('#out-nodes')!.textContent).toBe('7');
  });

  test('actions: align, group and ungroup, collapse, duplicate, delete, arrange, readonly - each disabled while it cannot apply', async () => {
    const { win, doc, w, el } = await openFixture();
    const act = (name: string): void => w.action(el, name);
    w.select(el, ['u1', 'r1', 'c1']);
    act('align-left');
    expect(new Set(['u1', 'r1', 'c1'].map((id) => node(w, el, id).x)).size).toBe(1);
    act('align-top');
    expect(new Set(['u1', 'r1', 'c1'].map((id) => node(w, el, id).y)).size).toBe(1);
    w.undo(el);
    w.undo(el);
    act('group');
    const g = w.export(el).groups.find((x: any) => x.id !== 'g1');
    expect(node(w, el, 'u1').groupId).toBe(g.id);
    w.select(el, ['u1']);
    act('ungroup');
    expect(w.export(el).groups.length).toBe(1);
    act('duplicate');
    act('delete');
    act('select-all');
    expect(el.getAttribute('data-selected')!.split(' ').length).toBe(7);
    act('zoom-in');
    act('zoom-out');
    act('fit');
    await w.arrange(el);
    expect(node(w, el, 'p1').x).toBeLessThan(node(w, el, 'v1').x);
    act('readonly');
    expect(el.hasAttribute('data-readonly')).toBe(true);
    expect((doc.querySelector('[data-workflow-for="wf-basic"][data-workflow-action="undo"]') as HTMLButtonElement).disabled).toBe(true);
    act('readonly');
    // the outline collapses a group, the group's button opens it again
    (doc.querySelector('#wf-outline [data-workflow-group="g1"]') as HTMLElement).click();
    await tick(win);
    expect(w.export(el).groups[0].collapsed).toBe(true);
    w.camera(el, { x: 40, y: 80, zoom: 1 });
    await tick(win);
    (doc.querySelector('#wf-basic [data-group-id="g1"] .workflow-group-toggle') as HTMLElement).click();
    expect(w.export(el).groups[0].collapsed).toBeFalsy();
  });

  test('cards and inspector: fields write the node data, the inspector renames, locks, edits JSON, routes and disconnects', async () => {
    const { win, doc, w, el } = await openFixture();
    w.camera(el, { x: 40, y: 80, zoom: 1 });
    await tick(win);
    const area = doc.querySelector('#wf-basic [data-node-id="p1"] textarea') as HTMLTextAreaElement;
    area.value = 'two words';
    area.dispatchEvent(new Event('change', { bubbles: true }));
    expect(node(w, el, 'p1').data.text).toBe('two words');
    const slider = doc.querySelector('#wf-basic [data-node-id="n1"] input[type="range"]') as HTMLInputElement;
    slider.value = '5';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
    expect(node(w, el, 'n1').data.value).toBe(5);
    w.select(el, ['u1']);
    await tick(win);
    const edit = (name: string): HTMLInputElement => doc.querySelector(`#wf-inspector [data-workflow-edit="${name}"]`) as HTMLInputElement;
    edit('title').value = 'Capitals';
    edit('title').dispatchEvent(new Event('change', { bubbles: true }));
    expect(node(w, el, 'u1').title).toBe('Capitals');
    edit('locked').checked = true;
    edit('locked').dispatchEvent(new Event('change', { bubbles: true }));
    expect(node(w, el, 'u1').locked).toBe(true);
    const errors: string[] = [];
    el.addEventListener('workflow-error', (e) => errors.push((e as CustomEvent).detail.message));
    edit('data').value = '{ not json';
    edit('apply-data').click();
    expect(errors.length).toBe(1);
    edit('data').value = '{"note": 1}';
    edit('apply-data').click();
    expect(node(w, el, 'u1').data).toEqual({ note: 1 });
    w.select(el, [], 'e1');
    await tick(win);
    const route = edit('route') as unknown as HTMLSelectElement;
    route.value = 'orthogonal';
    route.dispatchEvent(new Event('change', { bubbles: true }));
    expect(w.export(el).edges.find((e: any) => e.id === 'e1').route).toBe('orthogonal');
    edit('disconnect').click();
    expect(w.export(el).edges.some((e: any) => e.id === 'e1')).toBe(false);
  });

  test('runs: outputs flow through a subworkflow; a failing adapter ends the run as error with its message', async () => {
    const { win, doc, w, el } = await openFixture();
    const runs: string[] = [];
    el.addEventListener('workflow-run', (e) => runs.push((e as CustomEvent).detail.status));
    await w.run(el);
    expect(runs).toEqual(['running', 'done']);
    w.camera(el, { x: -700, y: 80, zoom: 1 });
    await tick(win);
    expect(doc.querySelector('#wf-basic [data-node-id="v1"] .workflow-output')!.textContent).toMatch(/A LIGHTHOUSE AT DAWN/);
    w.configure(el, {
      execution: {
        run: async (_doc: unknown, ctx: any) => {
          ctx.emit({ nodeId: 'p1', state: { status: 'running', progress: 0.5 } });
          throw new Error('the runner is gone');
        },
      },
    });
    await w.run(el).catch(() => undefined);
    expect(runs.at(-1)).toBe('error');
    w.setRuntime(el, 'p1', { status: 'queued' });
    w.configure(el, { execution: null });
  });

  test('formats: ComfyUI and Gradio load through load() and write back; validate names a problem; generate is stable', async () => {
    const { win, w, el } = await openFixture();
    // plain JSON of the page's own realm, as a page passes it
    const own = <T>(value: T): T => win.JSON.parse(JSON.stringify(value));
    const prompt = {
      '1': { class_type: 'LoadImage', inputs: { image: 'cat.png' } },
      '2': { class_type: 'ImageScale', inputs: { width: 512, image: ['1', 0] } },
      '3': { class_type: 'SaveImage', inputs: { images: ['2', 0] } },
    };
    w.load(el, own(prompt));
    expect(w.export(el).nodes.length).toBe(3);
    expect(w.toComfy(w.export(el))['2']).toMatchObject({ class_type: 'ImageScale', inputs: { width: 512, image: ['1', 0] } });
    const gradio = {
      schema_version: '2',
      id: 'g',
      name: 'Gradio flow',
      references: [{ id: 'r', label: 'Input', inputs: [], outputs: [{ id: 'o', type: 'text' }], position: { x: 10, y: 20 } }],
      operators: [{ id: 'op', label: 'Summarize', inputs: [{ id: 'i', type: 'markdown', required: true }], outputs: [{ id: 'out', type: 'text' }] }],
      subjects: [{ id: 's', label: 'Show', inputs: [{ id: 't', type: 'text', required: true }], outputs: [] }],
      edges: [
        { id: 'e', from_node_id: 'r', from_port_id: 'o', to_node_id: 'op', to_port_id: 'i' },
        { id: 'f', from_node_id: 'op', from_port_id: 'out', to_node_id: 's', to_port_id: 't' },
      ],
    };
    w.load(el, own(gradio));
    const back = w.toGradio(w.export(el));
    expect([back.references.length, back.operators.length, back.subjects.length, back.edges.length]).toEqual([1, 1, 1, 2]);
    expect(w.validate({ schemaVersion: 2 })).toMatch(/schemaVersion/);
    const doc = w.generate({ nodes: 120, edges: 300, seed: 9, stage: 6, groups: 2, collapsed: true });
    expect(JSON.stringify(doc)).toBe(JSON.stringify(w.generate({ nodes: 120, edges: 300, seed: 9, stage: 6, groups: 2, collapsed: true })));
    expect(w.validate(doc)).toBeNull();
    w.load(el, doc);
    expect(w.export(el).nodes.length).toBe(120);
    // the next frame draws the loaded graph
    await waitFor(() => w.stats(el)?.nodes > 7, 'a frame of the loaded graph');
  });

  test('the main-thread renderer and the State API: a pinch zooms, setState writes the attributes, destroy unbinds', async () => {
    const { win, doc, w } = await openFixture();
    const el = doc.getElementById('wf-groups') as HTMLElement & { api: any };
    expect(el.getAttribute('data-renderer')).toBe('main');
    const z = w.camera(el).zoom;
    const box = el.getBoundingClientRect();
    const grid = el.querySelector('.workflow-grid')!;
    const touch = (type: string, id: number, x: number): PointerEvent =>
      new win.PointerEvent(type, { pointerId: id, pointerType: 'touch', bubbles: true, cancelable: true, clientX: box.left + x, clientY: box.top + 100, buttons: type === 'pointerup' ? 0 : 1 });
    grid.dispatchEvent(touch('pointerdown', 11, 200));
    grid.dispatchEvent(touch('pointerdown', 12, 300));
    el.dispatchEvent(touch('pointermove', 12, 400));
    el.dispatchEvent(touch('pointerup', 12, 400));
    el.dispatchEvent(touch('pointerup', 11, 200));
    await tick(win);
    expect(w.camera(el).zoom).toBeGreaterThan(z);
    await el.api.setState('readonly', { selected: [w.export(el).nodes[0].id] });
    expect(el.hasAttribute('data-readonly')).toBe(true);
    // the config is merged: a state change without a selection keeps the one there is
    await el.api.setState('default', {});
    expect(el.api.getState()).toMatchObject({ name: 'default', config: { selected: [w.export(el).nodes[0].id] } });
    expect(el.hasAttribute('data-readonly')).toBe(false);
    w.destroy(el);
    expect(el.querySelector('[data-ce-chrome]')).toBeNull();
  });

  test('fields: setField / getField with workflow-field-change, a custom editor through workflow-field-edit and edit(), the list layout, tree() and reveal()', async () => {
    const { win, doc, w } = await openFixture();
    const custom = doc.getElementById('wf-custom')!;
    const list = doc.getElementById('wf-list')!;
    const nav = doc.getElementById('nav-wf')!;
    w.camera(custom, { x: 40, y: 60, zoom: 1 });
    w.camera(list, { x: 40, y: 60, zoom: 1 });
    await tick(win);
    const changes: any[] = [];
    custom.addEventListener('workflow-field-change', (e) => changes.push((e as CustomEvent).detail));
    expect(w.setField(custom, 'j1', 'threshold', 0.2)).toBe(true);
    expect(w.setField(custom, 'j1', 'threshold', 0.2)).toBe(true);
    expect(changes.map((c) => [c.key, c.value, c.oldValue])).toEqual([['threshold', 0.2, 0.4]]);
    expect(w.getField(custom, 'j1', 'threshold')).toBe(0.2);
    expect(w.getField(custom, 'j1', 'nope')).toBeUndefined();
    // a custom editor: edit() resolves the value; an editor that throws is reported and writes nothing
    // the frame's own objects: the editor checks JSON values by their prototype
    (win as any).__nextConfig = win.JSON.parse('{ "model": "swinir", "steps": 5, "faces": false }');
    expect(await w.editField(custom, 'j1', 'config')).toBe(true);
    expect(w.getField(custom, 'j1', 'config').model).toBe('swinir');
    const errors: string[] = [];
    custom.addEventListener('workflow-error', (e) => errors.push((e as CustomEvent).detail.message));
    w.register(custom, {
      type: 'job',
      label: 'Job',
      ports: [],
      fields: [{ key: 'config', kind: 'value', edit: () => { throw new win.Error('the editor broke'); } }],
    });
    expect(await w.editField(custom, 'j1', 'config')).toBe(false);
    expect(errors.at(-1)).toBe('the editor broke');
    // a node type checks its fields
    expect(() => w.register(custom, { type: 'bad', label: 'Bad', ports: [], fields: [{ key: 'k', kind: 'text', render: 'no' }] })).toThrow(/render/);
    expect(() => w.register(custom, { type: 'bad', label: 'Bad', ports: [], layout: 'grid' })).toThrow(/layout/);
    // the list layout: a Property Grid list per card; setField redraws it
    await waitFor(() => !!list.querySelector('[data-node-id="raw"] .workflow-properties tbody tr'), 'the list grids');
    w.setField(list, 'raw', 'quality', 90);
    await tick(win);
    await waitFor(() => list.querySelector('[data-node-id="raw"] tr[data-path="quality"] .property-grid-value')?.textContent === '90', 'the list follows');
    // readonly reaches the list's grids
    await (list as any).api.setState('readonly');
    await waitFor(() => list.querySelector('[data-node-id="raw"] .workflow-properties')?.hasAttribute('data-readonly') === true, 'a readonly grid');
    expect(w.setField(list, 'raw', 'quality', 1)).toBe(false);
    await (list as any).api.setState('default');
    // tree() and reveal(): a node inside a subworkflow, then back at the top
    const rows = w.tree(nav);
    expect(rows.find((r: any) => r.id === 'sub/inner')).toMatchObject({ parentId: 'sub', path: ['sub', 'inner'] });
    expect(w.reveal(nav, ['sub', 'inner'])).toBe(true);
    expect(nav.getAttribute('data-selected')).toBe('inner');
    // inside the subworkflow its live store is the tree's
    expect(w.tree(nav).filter((r: any) => r.parentId === 'sub').map((r: any) => r.id)).toEqual(['sub/inner']);
    expect(w.reveal(nav, ['a'], { camera: true })).toBe(true);
    expect(nav.getAttribute('data-selected')).toBe('a');
    expect(w.reveal(nav, ['far', 'x'])).toBe(false);
    expect(w.reveal(nav, [])).toBe(false);
  });
});
