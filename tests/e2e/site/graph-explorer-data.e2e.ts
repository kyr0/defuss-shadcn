import assert from 'node:assert/strict';
import { chromium, type Frame, type Page } from 'playwright';
import { startServer } from '../server.ts';

/**
 * Why: the Graph Explorer's "Your own graph" promise - a page hands the explorer its graph as typed arrays
 * (df$.shadcn.graphExplorer.load, data-source="external") and gets the explorer's views for it: its labels, its type
 * names, its refs, its depth (here four cluster levels, files one level higher beside folders), per-view cycles, the
 * search, subtree() and the details; a graph the worker refuses fires graph-explorer-error and leaves the graph
 * shown; a loaded graph replaces the one shown - a generated one too - without a trace of it. This runs the docs
 * page's example as a reader does, in its sandbox, then loads graphs of its own into it and into a generated
 * explorer of the same page. A page of its own (graph-explorer-data.e2e-fixture.html, cross-origin isolated so a
 * SharedArrayBuffer exists) then takes each refusal, a refused first load, two loads at once, a navigation racing a
 * load, and the bounds: 1,024 children per cluster, 256 cluster levels, a large subtree of mixed depth.
 */

const PAGE = '/dist/documentation/graphs/graph-explorer.html';
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

/** the sandbox of the card that holds a selector */
async function frameWith(page: Page, sel: string): Promise<Frame> {
  const cards = page.locator('.code-example');
  for (let k = 0; k < (await cards.count()); k++) {
    await cards.nth(k).scrollIntoViewIfNeeded();
    for (const f of page.frames())
      if (f !== page.mainFrame() && (await f.$(sel).catch(() => null))) {
        await (await f.frameElement()).scrollIntoViewIfNeeded();
        return f;
      }
  }
  throw new Error(`no example holds ${sel}`);
}
const ready = (f: Frame, id: string) =>
  f.waitForFunction((id) => document.getElementById(id)?.getAttribute('data-graph-status') === 'ready', id, {
    timeout: 30_000,
  });
const inspect = (f: Frame, id: string) =>
  f.evaluate((id) => (globalThis as any).df$.shadcn.graphExplorer.inspect('#' + id, { children: true }), id);
const rootLabels = async (f: Frame, id: string) =>
  ((await inspect(f, id)).children as { label: string }[]).map((c) => c.label).sort();

/** a small graph of the test's own, as a builder in the frame (__own()): two clusters of three nodes, links both ways */
const defineOwn = (f: Frame) =>
  f.evaluate(() => {
    (globalThis as any).__own = () => ({
      clusters: {
        parent: Int32Array.of(-1, 0, 0),
        type: Uint8Array.of(0, 1, 1),
        label: ['own-root', 'alpha-team', 'beta-team'],
        ref: ['r', 'a', 'b'],
      },
      nodes: {
        cluster: Int32Array.of(1, 1, 1, 2, 2, 2),
        type: Uint8Array.of(0, 1, 0, 1, 0, 1),
        label: ['alpha-one', 'alpha-two', 'alpha-three', 'beta-one', 'beta-two', 'beta-three'],
        ref: ['own:a1', 'own:a2', 'own:a3', 'own:b1', 'own:b2', 'own:b3'],
      },
      edges: {
        start: Int32Array.of(0, 2, 3, 4, 5, 6, 6),
        target: Int32Array.of(1, 3, 2, 0, 4, 0),
        type: Uint8Array.of(0, 1, 0, 0, 0, 1),
      },
      types: { cluster: ['Org', 'Team'], node: ['person', 'service'], edge: ['knows', 'owns'] },
    });
  });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|lucide|unpkg/.test(m.text())) errors.push(m.text());
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && !r.url().includes('api.github.com')) errors.push(`${r.status()} ${r.url()}`);
  });
  // the docs header asks GitHub for its star count - not this page's business, and no network in a test
  await page.route('https://api.github.com/**', (r) =>
    r.fulfill({ json: { stargazers_count: 0 }, headers: { 'access-control-allow-origin': '*' } }),
  );
  await page.goto(`${server.url}${PAGE}`);
  const f = await frameWith(page, '#own');
  await ready(f, 'own');
  await defineOwn(f);
  await f.waitForFunction(() => (document.getElementById('own-info')!.textContent ?? '').endsWith('seed 1'));
  const first = Number((await f.locator('#own-info').innerText()).split(' ')[0].replace(/,/g, ''));

  await check(
    "the example's graph shows: its node count, four cluster levels, its packages; Nodes, Relations and Labels only",
    async () => {
      const graph = (await inspect(f, 'own')).graph;
      assert.equal(graph.nodes, first);
      assert.ok(first > 2000 && first < 3000, `about 2,500 nodes, not ${first}`);
      assert.equal(graph.depth, 4);
      assert.deepEqual(await rootLabels(f, 'own'), ['cli', 'core', 'data', 'net', 'ui']);
      assert.deepEqual(
        await f.evaluate(() => (globalThis as any).df$.shadcn.graphExplorer.layers('#own').map((l: any) => l.name)),
        ['nodes', 'relations', 'labels'],
      );
      assert.deepEqual(
        await f.$$eval('[data-graph-explorer-for="own"] [data-graph-explorer-layer]', (bs) =>
          bs.map((b) => b.getAttribute('data-graph-explorer-layer')),
        ),
        ['nodes', 'relations', 'labels'],
      );
      assert.equal(await f.getAttribute('#own', 'aria-busy'), null);
    },
  );

  let cycleId = '';
  await check(
    "find() matches a loaded label and carries its ref; the loop of three has scc 3 in its file's view",
    async () => {
      const hits = await f.evaluate(() => (globalThis as any).df$.shadcn.graphExplorer.find('#own', 'collectCycle'));
      assert.equal(hits.length, 1, JSON.stringify(hits));
      assert.equal(hits[0].ref, 'core/src/graph.ts#collectCycle');
      assert.equal(hits[0].kind, 'entity');
      assert.equal(hits[0].path, 'core › src › graph.ts');
      assert.ok(['function', 'class', 'constant'].includes(hits[0].type), hits[0].type);
      cycleId = hits[0].id;
      // a node renderer that never draws: it sees every node of a view as renderers do
      await f.evaluate(() => {
        const g = globalThis as any;
        g.__seen = new Map();
        g.df$.shadcn.graphExplorer.register('#own', {
          kind: 'node',
          name: 'probe',
          sizes: {},
          render: (_n: any, c: any) => c.html``,
          match: (n: any) => {
            g.__seen.set(n.ref ?? n.id, { label: n.label, scc: n.scc, typeName: n.typeName });
            return false;
          },
        });
      });
      await f.evaluate((id) => (globalThis as any).df$.shadcn.graphExplorer.navigate('#own', id), cycleId);
      const seen: Record<string, any> = await f.evaluate(() => Object.fromEntries((globalThis as any).__seen));
      const loop = ['visitNode', 'expandEdge', 'collectCycle'].map((name) => 'core/src/graph.ts#' + name);
      for (const ref of loop) {
        assert.equal(seen[ref]?.scc, 3, `${ref}: ${JSON.stringify(seen[ref])}`);
        assert.ok(
          ['function', 'class', 'constant'].includes(seen[ref]?.typeName),
          `${ref}: ${JSON.stringify(seen[ref])}`,
        );
      }
      const others = Object.entries(seen).filter(([k]) => k.startsWith('core/src/graph.ts#') && !loop.includes(k));
      assert.ok(others.length > 20, `the rest of graph.ts (${others.length})`);
      assert.ok(
        others.every(([, v]) => v.scc === 1),
        'no other node of the file is in a cycle',
      );
      assert.equal(
        (await inspect(f, 'own')).view,
        (await f.evaluate((id) => (globalThis as any).df$.shadcn.graphExplorer.path('#own', id), cycleId)).at(-2).id,
      );
    },
  );

  await check(
    "a node's details list its outgoing and its incoming links, its type and its ref - no owner, rows or freshness",
    async () => {
      const details = f.locator('[data-graph-explorer-for="own"][data-graph-explorer-outlet="details"]');
      await f.waitForFunction(() =>
        [...document.querySelectorAll('[data-graph-explorer-outlet="details"] .graph-explorer-section-title')].some(
          (t) => /Incoming/.test(t.textContent ?? ''),
        ),
      );
      const sections = await details
        .locator('.graph-explorer-section')
        .evaluateAll((ss) =>
          Object.fromEntries(
            ss.map((s) => [
              s.querySelector('.graph-explorer-section-title span')?.textContent?.trim(),
              [...s.querySelectorAll('.graph-explorer-row-name')].map((r) => r.textContent?.trim()),
            ]),
          ),
        );
      assert.ok(sections.Outgoing?.includes('visitNode'), JSON.stringify(sections));
      assert.ok(sections.Incoming?.includes('expandEdge'), JSON.stringify(sections));
      const text = await details.innerText();
      assert.match(text, /core\/src\/graph\.ts#collectCycle/);
      assert.doesNotMatch(text, /Owner|Freshness|Rows/);
    },
  );

  await check(
    'subtree() walks the loaded hierarchy: functions at depth 4 below the folders, at depth 3 in index.ts',
    async () => {
      const rows: any[] = await f.evaluate(() => (globalThis as any).df$.shadcn.graphExplorer.subtree('#own', 'c0', 5));
      const entities = rows.filter((r) => r.kind === 'entity');
      assert.equal(entities.length, first);
      const deep = entities.filter((r) => r.level === 4);
      assert.ok(deep.length > 0 && deep.every((r) => /^[a-z]+\/[a-z]+\/[a-z]+\.ts#/.test(r.ref)), "the folders' files");
      const shallow = entities.filter((r) => r.level === 3);
      assert.ok(
        shallow.length > 0 && shallow.every((r) => /^[a-z]+\/index\.ts#/.test(r.ref)),
        "the packages' index.ts",
      );
      assert.equal(rows[0].label, 'repository');
      assert.equal(rows[0].type, 'Repository');
      assert.deepEqual([...new Set(rows.filter((r) => r.kind === 'cluster').map((r) => r.type))].sort(), [
        'File',
        'Folder',
        'Package',
        'Repository',
      ]);
    },
  );

  await check(
    'Another graph replaces the first: its own count and packages, at its top, nothing selected, no updates',
    async () => {
      // update() works on a loaded graph: the change is named by the loaded label (of the view shown: graph.ts)
      const recorded = await f.evaluate(
        (id) =>
          (globalThis as any).df$.shadcn.graphExplorer.update('#own', {
            target: id,
            text: 'a change of the first graph',
          }),
        cycleId,
      );
      assert.deepEqual(
        recorded.map((u: any) => [u.target, u.label, u.layer]),
        [[cycleId, 'collectCycle', 'nodes']],
      );
      assert.equal(await f.evaluate(() => (globalThis as any).df$.shadcn.graphExplorer.updates('#own').length), 1);
      await f.click('#own-next');
      await f.waitForFunction(() => (document.getElementById('own-info')!.textContent ?? '').endsWith('seed 2'));
      const second = Number((await f.locator('#own-info').innerText()).split(' ')[0].replace(/,/g, ''));
      assert.notEqual(second, first);
      const now = await inspect(f, 'own');
      assert.equal(now.graph.nodes, second);
      assert.equal(now.view, 'c0');
      assert.deepEqual(await rootLabels(f, 'own'), ['cli', 'core', 'data', 'docs', 'net', 'ui']);
      const state = await f.evaluate(() => (document.getElementById('own') as any).api.getState());
      assert.equal(state.name, 'default');
      assert.deepEqual(state.config.selected, []);
      assert.equal(await f.evaluate(() => (globalThis as any).df$.shadcn.graphExplorer.updates('#own').length), 0);
      assert.match(
        await f.locator('[data-graph-explorer-for="own"][data-graph-explorer-outlet="details"]').innerText(),
        /Nothing selected/,
      );
      const hits = await f.evaluate(() => (globalThis as any).df$.shadcn.graphExplorer.find('#own', 'collectCycle'));
      assert.equal(hits.length, 1);
      assert.equal(hits[0].ref, 'core/src/graph.ts#collectCycle');
      assert.equal(await f.getAttribute('#own', 'data-graph-status'), 'ready');
      assert.equal(
        await f.getAttribute(
          '[data-graph-explorer-for="own"][data-graph-explorer-outlet="search"] input',
          'placeholder',
        ),
        `Search ${second.toLocaleString('en-US')} nodes ( / )`,
      );
    },
  );

  await check(
    "a graph of the test's own: only it remains; its typed arrays moved to the worker (empty on the page)",
    async () => {
      const out = await f.evaluate(async () => {
        const ge = (globalThis as any).df$.shadcn.graphExplorer;
        const data = (globalThis as any).__own();
        const shown = await ge.load('#own', data);
        return {
          shown,
          moved: [data.clusters.parent, data.nodes.cluster, data.edges.start, data.edges.target].map(
            (a: any) => a.length,
          ),
          labels: data.nodes.label.length,
          cycle: await ge.find('#own', 'collectCycle'),
          beta: await ge.find('#own', 'BETA'),
          rows: await ge.subtree('#own', 'c0', 3),
        };
      });
      assert.equal(out.shown, true);
      assert.deepEqual(out.moved, [0, 0, 0, 0], 'the typed arrays are detached');
      assert.equal(out.labels, 6, 'the label list is a copy');
      assert.deepEqual(out.cycle, [], 'nothing of the code bases is left');
      assert.deepEqual(
        out.beta.map((h: any) => [h.label, h.ref]),
        [
          ['beta-team', 'b'],
          ['beta-one', 'own:b1'],
          ['beta-two', 'own:b2'],
          ['beta-three', 'own:b3'],
        ],
      );
      assert.deepEqual(
        out.rows.map((r: any) => [r.id, r.parent, r.type, r.level]),
        [
          ['c0', '', 'Org', 0],
          ['c1', 'c0', 'Team', 1],
          ['n0', 'c1', 'person', 2],
          ['n1', 'c1', 'service', 2],
          ['n2', 'c1', 'person', 2],
          ['c2', 'c0', 'Team', 1],
          ['n3', 'c2', 'service', 2],
          ['n4', 'c2', 'person', 2],
          ['n5', 'c2', 'service', 2],
        ],
      );
      assert.deepEqual(await rootLabels(f, 'own'), ['alpha-team', 'beta-team']);
      assert.equal((await inspect(f, 'own')).graph.nodes, 6);
      // the two teams link both ways: one aggregate edge with both counts
      assert.deepEqual(
        (await inspect(f, 'own')).edges.map((e: any) => [e.id, e.count, e.count2, e.kind]),
        [['c1>c2', 1, 1, 'agg']],
      );
    },
  );

  await check(
    'refused data fires graph-explorer-error with the first thing wrong; the graph shown stays and still moves',
    async () => {
      const out = await f.evaluate(async () => {
        const g = globalThis as any,
          ge = g.df$.shadcn.graphExplorer;
        const messages: string[] = [];
        document
          .getElementById('own')!
          .addEventListener('graph-explorer-error', (e: any) => messages.push(e.detail.message));
        // cluster 3's parent (0) comes after a child of cluster 1: the root's children are not side by side
        const split = (globalThis as any).__own();
        split.clusters = {
          parent: Int32Array.of(-1, 0, 1, 0),
          type: Uint8Array.of(0, 1, 1, 1),
          label: ['r', 'a', 'a1', 'b'],
        };
        split.nodes.cluster = Int32Array.of(2, 2, 2, 3, 3, 3);
        const contiguous = await ge.load('#own', split);
        // a link to node 9 of six
        const far = (globalThis as any).__own();
        far.edges.target = Int32Array.of(1, 3, 2, 0, 4, 9);
        const target = await ge.load('#own', far);
        await ge.navigate('#own', 'n4');
        return { contiguous, target, messages, view: ge.inspect('#own').view };
      });
      assert.deepEqual([out.contiguous, out.target], [false, false]);
      assert.equal(out.messages.length, 2, JSON.stringify(out.messages));
      assert.match(
        out.messages[0],
        /^Invalid graph data: cluster 3 has parent 0 after a child of 1: the children of a cluster must be contiguous/,
      );
      assert.match(out.messages[1], /^Invalid graph data: edge 5 has target 9, which is no node/);
      assert.equal((await inspect(f, 'own')).graph.nodes, 6);
      assert.equal(out.view, 'c2', 'the kept graph still navigates');
      assert.equal(await f.getAttribute('#own', 'data-graph-status'), 'ready');
      assert.equal(await f.getAttribute('#own', 'aria-busy'), null);
    },
  );

  await check(
    'variable depth: a cluster whose entities are not contiguous counts, lists and links them all',
    async () => {
      // A holds A1 (entities) and A2 > A2x (entities); B holds B1. BFS puts B1 between A1 and A2x in the node order
      const out = await f.evaluate(async () => {
        const ge = (globalThis as any).df$.shadcn.graphExplorer;
        const shown = await ge.load('#own', {
          clusters: {
            parent: Int32Array.of(-1, 0, 0, 1, 1, 2, 4),
            type: Uint8Array.of(0, 1, 1, 2, 2, 2, 2),
            label: ['mixed', 'A', 'B', 'A1', 'A2', 'B1', 'A2x'],
          },
          nodes: {
            cluster: Int32Array.of(3, 3, 5, 5, 6, 6, 6),
            type: new Uint8Array(7),
            label: ['a1-0', 'a1-1', 'b1-0', 'b1-1', 'a2x-0', 'a2x-1', 'a2x-2'],
            ref: ['0', '1', '2', '3', '4', '5', '6'],
          },
          edges: {
            start: Int32Array.of(0, 1, 1, 2, 3, 4, 5, 6),
            target: Int32Array.of(2, 4, 6, 5, 6, 0),
            type: new Uint8Array(6),
          },
          types: { cluster: ['Root', 'Group', 'Team'], node: ['member'], edge: ['to'] },
        });
        const root = ge.inspect('#own', { children: true }).edges;
        const rows = await ge.subtree('#own', 'c0', 6);
        await ge.dive('#own', 'c1');
        const inA = ge.inspect('#own', { children: true }).edges;
        return {
          shown,
          root,
          inA,
          levels: rows.filter((r: any) => r.kind === 'entity').map((r: any) => [r.label, r.level]),
        };
      });
      assert.equal(out.shown, true);
      // A -> B: a1-0 -> b1-0; B -> A: b1-0 -> a2x-0, b1-1 -> a2x-2. In A: A2x -> A1 (a2x-2 -> a1-0)
      assert.deepEqual(
        out.root.map((e: any) => [e.id, e.count, e.count2]),
        [['c1>c2', 1, 2]],
      );
      assert.deepEqual(
        out.inA.map((e: any) => [e.id, e.count, e.count2]),
        [['c4>c3', 1, 0]],
      );
      assert.deepEqual(out.levels, [
        ['a1-0', 3],
        ['a1-1', 3],
        ['a2x-0', 4],
        ['a2x-1', 4],
        ['a2x-2', 4],
        ['b1-0', 3],
        ['b1-1', 3],
      ]);
      const details = f.locator('[data-graph-explorer-for="own"][data-graph-explorer-outlet="details"]');
      // A's page: every entity below it in the grid - two ranges of the node order
      await f.evaluate(() => (globalThis as any).df$.shadcn.graphExplorer.expand('#own', 'c1'));
      await f.waitForFunction(() =>
        /of 5 entities/.test(
          document.querySelector('[data-graph-explorer-outlet="details"] .graph-explorer-records-count')?.textContent ??
            '',
        ),
      );
      assert.match(await details.locator('.graph-explorer-records-count').innerText(), /^5 of 5 entities/);
      assert.deepEqual(
        await details.locator('.data-grid-header').evaluateAll((hs) => hs.map((h) => h.textContent?.trim())),
        ['Name', 'Type', 'Cluster', 'Out', 'In', 'Ref'],
      );
      const page = await details.innerText();
      assert.doesNotMatch(page, /Links not closed|Owners|Link health/);
      await f.evaluate(() => (globalThis as any).df$.shadcn.graphExplorer.collapse('#own'));
      // the link between A and B: its single links both ways, with A's and B's members
      await f.evaluate(() => (globalThis as any).df$.shadcn.graphExplorer.expand('#own', 'c1>c2'));
      await f.waitForFunction(() =>
        /of 3 links/.test(
          document.querySelector('[data-graph-explorer-outlet="details"] .graph-explorer-records-count')?.textContent ??
            '',
        ),
      );
      const link = await details.innerText();
      assert.doesNotMatch(link, /Breakers|Trips|Circuit breakers/);
      await f.evaluate(() => (globalThis as any).df$.shadcn.graphExplorer.collapse('#own'));
      // a2x-2's details: out to a1-0 (another cluster), in from a2x-1 (its own) and b1-1 (B1)
      await f.evaluate(() => (globalThis as any).df$.shadcn.graphExplorer.navigate('#own', 'n6'));
      await f.waitForFunction(() =>
        /b1-1/.test(document.querySelector('[data-graph-explorer-outlet="details"]')?.textContent ?? ''),
      );
      const rows = await details
        .locator('.graph-explorer-section')
        .evaluateAll((ss) =>
          Object.fromEntries(
            ss.map((s) => [
              s.querySelector('.graph-explorer-section-title span')?.textContent?.trim(),
              [...s.querySelectorAll('.graph-explorer-row-name')].map((r) => r.textContent?.trim()).sort(),
            ]),
          ),
        );
      assert.deepEqual(rows.Outgoing, ['a1-0']);
      assert.deepEqual(rows.Incoming, ['a2x-1', 'b1-1']);
    },
  );

  await check('six cluster levels and more: navigate, breadcrumbs, up, dive, subtree and the far field', async () => {
    // a binary tree of clusters, levels 0 to 6, two entities in each of the 64 leaves, a ring of links
    const out = await f.evaluate(async () => {
      const ge = (globalThis as any).df$.shadcn.graphExplorer;
      const parent = [-1];
      for (let i = 1; i < 127; i++) parent.push((i - 1) >> 1);
      const cluster = Array.from({ length: 128 }, (_, i) => 63 + (i >> 1));
      const shown = await ge.load('#own', {
        clusters: {
          parent: Int32Array.from(parent),
          type: new Uint8Array(127),
          label: parent.map((_, i) => 'level-' + Math.floor(Math.log2(i + 1)) + '-' + i),
        },
        nodes: {
          cluster: Int32Array.from(cluster),
          type: new Uint8Array(128),
          label: cluster.map((_, i) => 'deep-' + i),
          ref: cluster.map((_, i) => 'd' + i),
        },
        edges: {
          start: Int32Array.from({ length: 129 }, (_, i) => i),
          target: Int32Array.from({ length: 128 }, (_, i) => (i + 1) % 128),
          type: new Uint8Array(128),
        },
        types: { cluster: ['Level'], node: ['leaf'], edge: ['next'] },
      });
      await ge.navigate('#own', 'n127');
      const deep = ge.inspect('#own').view;
      const crumbs = [...document.querySelectorAll('[data-graph-explorer-for="own"] .breadcrumb-item')].map((c) =>
        c.textContent!.trim(),
      );
      const path = (await ge.path('#own', 'n127')).map((p: any) => p.id);
      let ups = 0;
      while (await ge.up('#own')) ups++;
      const top = ge.inspect('#own').view;
      await ge.dive('#own', 'c2');
      const dived = ge.inspect('#own').view;
      const rows = await ge.subtree('#own', 'c0', 8);
      return {
        shown,
        deep,
        crumbs,
        path,
        ups,
        top,
        dived,
        levels: [...new Set(rows.map((r: any) => r.level))],
        entities: rows.filter((r: any) => r.kind === 'entity').length,
      };
    });
    assert.equal(out.shown, true);
    assert.deepEqual(out.path, ['c0', 'c2', 'c6', 'c14', 'c30', 'c62', 'c126', 'n127']);
    assert.equal(out.deep, 'c126');
    assert.deepEqual(out.crumbs, [
      'level-0-0',
      'level-1-2',
      'level-2-6',
      'level-3-14',
      'level-4-30',
      'level-5-62',
      'level-6-126',
    ]);
    assert.equal(out.ups, 6);
    assert.equal(out.top, 'c0');
    assert.equal(out.dived, 'c2');
    assert.deepEqual(out.levels, [0, 1, 2, 3, 4, 5, 6, 7]);
    assert.equal(out.entities, 128);
    // the far field: the worker draws the levels below the view as dots
    await f.waitForFunction(() => {
      const w = (globalThis as any).df$.shadcn.graphExplorer.inspect('#own').worker;
      return w.view === 2 && w.dots > 0;
    });
  });

  await check('a generated graph gives way to a loaded one: its domains, Health and Live mode go', async () => {
    const g = await frameWith(page, '#outlets');
    await ready(g, 'outlets');
    await defineOwn(g);
    assert.ok(
      (
        await g.evaluate(() => (globalThis as any).df$.shadcn.graphExplorer.layers('#outlets').map((l: any) => l.name))
      ).includes('health'),
    );
    const out = await g.evaluate(async () => {
      const ge = (globalThis as any).df$.shadcn.graphExplorer;
      const shown = await ge.load('#outlets', (globalThis as any).__own());
      ge.simulate('#outlets', true);
      await new Promise((r) => setTimeout(r, 1500));
      return {
        shown,
        layers: ge.layers('#outlets').map((l: any) => l.name),
        synthetic: await ge.find('#outlets', 'ledger'),
        updates: ge.updates('#outlets').length,
        graph: ge.inspect('#outlets').graph,
      };
    });
    assert.equal(out.shown, true);
    assert.deepEqual(out.layers, ['nodes', 'relations', 'labels']);
    assert.deepEqual(out.synthetic, [], 'no generated name is left');
    assert.equal(out.updates, 0, 'Live mode does not run on a loaded graph');
    assert.equal(out.graph.nodes, 6);
    assert.deepEqual(await rootLabels(g, 'outlets'), ['alpha-team', 'beta-team']);
    const outline = await g.$$eval(
      '[data-graph-explorer-for="outlets"][data-graph-explorer-outlet="outline"] .graph-explorer-label',
      (ls) => ls.map((l) => l.textContent?.trim()).sort(),
    );
    assert.deepEqual(outline, ['alpha-team', 'beta-team']);
  });

  // -- an explorer of the page's own (graph-explorer-data.e2e-fixture.html), served cross-origin isolated so a
  // SharedArrayBuffer exists: refusals, the first load, races, what a load resets, the limits
  const FIXTURE = '/tests/e2e/site/graph-explorer-data.e2e-fixture.html';
  const iso = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  iso.on('pageerror', (e) => errors.push(`fixture: ${e}`));
  iso.on('console', (m) => {
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(`fixture: ${m.text()}`);
  });
  iso.on('response', (r) => {
    if (r.status() >= 400) errors.push(`fixture: ${r.status()} ${r.url()}`);
  });
  await iso.route(`${server.url}${FIXTURE}`, async (route) => {
    const res = await route.fetch();
    await route.fulfill({
      response: res,
      headers: {
        ...res.headers(),
        'cross-origin-opener-policy': 'same-origin',
        'cross-origin-embedder-policy': 'require-corp',
      },
    });
  });
  await iso.goto(`${server.url}${FIXTURE}`);
  const x = iso.mainFrame();
  await x.waitForFunction(
    () => !!(document.getElementById('ext') as any)?._graphExplorer && !!(globalThis as any).df$?.shadcn?.graphExplorer,
  );
  await defineOwn(x);
  await x.evaluate(() => {
    const g = globalThis as any;
    g.__errors = [];
    document
      .getElementById('ext')!
      .addEventListener('graph-explorer-error', (e: any) => g.__errors.push(e.detail.message));
  });

  await check(
    'a refused first load: the waiting explorer shows the error; a valid load then shows the graph and hides Live mode',
    async () => {
      const out = await x.evaluate(async () => {
        const g = globalThis as any,
          ge = g.df$.shadcn.graphExplorer,
          el = document.getElementById('ext')!;
        const live = document.querySelector('[data-graph-explorer-action="live"]') as HTMLElement;
        const before = {
          status: el.getAttribute('data-graph-status'),
          live: live.hidden,
          isolated: globalThis.crossOriginIsolated,
        };
        const bad = g.__own();
        bad.edges.target = Int32Array.of(1, 3, 2, 0, 4, 6);
        const refused = await ge.load('#ext', bad);
        const after = {
          status: el.getAttribute('data-graph-status'),
          text: el.querySelector('.graph-explorer-loading-text')!.textContent,
          shown: !el.querySelector<HTMLElement>('.graph-explorer-loading')!.hidden,
        };
        const shown = await ge.load('#ext', g.__own());
        return {
          before,
          refused,
          after,
          shown,
          messages: [...g.__errors],
          status: el.getAttribute('data-graph-status'),
          busy: el.getAttribute('aria-busy'),
          live: live.hidden,
          loading: el.querySelector<HTMLElement>('.graph-explorer-loading')!.hidden,
        };
      });
      assert.deepEqual(out.before, { status: 'loading', live: false, isolated: true });
      assert.equal(out.refused, false);
      assert.deepEqual(out.messages, ['Invalid graph data: edge 5 has target 6, which is no node']);
      assert.equal(out.after.status, 'error');
      assert.ok(out.after.shown, 'the error shows in place of the graph');
      assert.match(out.after.text ?? '', /^The graph could not be built: Invalid graph data: edge 5 has target 6/);
      assert.equal(out.shown, true);
      assert.equal(out.status, 'ready');
      assert.equal(out.busy, null);
      assert.equal(out.loading, true, 'the error went with the graph that came');
      assert.equal(out.live, true, 'the Live switch is hidden for a loaded graph');
    },
  );

  // one minimal bad graph per thing the worker checks: [the message after 'Invalid graph data: ', the change]
  const REFUSALS: Record<string, string> = {
    'no data': 'the data must be an object',
    'no types': 'clusters, nodes, edges and types are required',
    'clusters.parent kind': 'clusters.parent must be an Int32Array',
    'clusters.type kind': 'clusters.type must be an Uint8Array',
    'nodes.cluster kind': 'nodes.cluster must be an Int32Array',
    'nodes.type kind': 'nodes.type must be an Uint8Array',
    'edges.start kind': 'edges.start must be an Int32Array',
    'edges.target kind': 'edges.target must be an Int32Array',
    'edges.type kind': 'edges.type must be an Uint8Array',
    'shared buffer':
      'clusters.parent must not be backed by a SharedArrayBuffer: the page could change it after the check',
    'types.cluster': 'types.cluster must be a list of names',
    'types.node': 'types.node must be a list of names',
    'types.edge with a hole': 'types.edge must be a list of names',
    'no root': 'clusters: there must be a root (cluster 0)',
    'no nodes': 'nodes: there must be at least one',
    'clusters.type length': 'clusters.type has 2 entries, 3 expected',
    'clusters.label with a hole': 'clusters.label must be a list of strings',
    'clusters.ref length': 'clusters.ref has 2 entries, 3 expected',
    'nodes.type length': 'nodes.type has 5 entries, 6 expected',
    'nodes.label with holes': 'nodes.label must be a list of strings',
    'nodes.ref with a number': 'nodes.ref must be a list of strings',
    'nodes.ref length': 'nodes.ref has 7 entries, 6 expected',
    'edges.start length': 'edges.start has 6 entries, 7 expected',
    'edges.type length': 'edges.type has 5 entries, 6 expected',
    'root with a parent': 'clusters.parent[0] must be -1: cluster 0 is the root',
    'parent after child': 'cluster 1 has parent 2: a parent comes before its children (BFS order)',
    'children apart':
      'cluster 3 has parent 0 after a child of 1: the children of a cluster must be contiguous, the clusters in BFS order',
    'too many clusters in one': 'cluster 0 has 1025 children, at most 1024',
    'too many nodes in one': 'cluster 1 has 1025 children, at most 1024',
    'too deep': 'cluster 256 is at level 256: at most 256 cluster levels',
    'cluster type': 'cluster 2 has type 5, beyond types.cluster',
    'node in no cluster': 'node 5 is in cluster 7, which does not exist',
    'nodes unsorted': 'node 3 is in cluster 1 after a node of 2: nodes are sorted by cluster',
    'clusters and nodes': 'cluster 0 holds clusters and nodes: a cluster holds only one of them',
    'node type': 'node 5 has type 9, beyond types.node',
    'empty cluster': 'cluster 2 is empty: it needs clusters or nodes',
    'start not 0': 'edges.start[0] must be 0',
    'start falls': 'edges.start falls at node 1: it must not decrease',
    'start end': 'edges.start[6] is 5, the length of edges.target (6) expected',
    target: 'edge 5 has target 9, which is no node',
    'negative target': 'edge 0 has target -1, which is no node',
    'edge type': 'edge 5 has type 7, beyond types.edge',
  };
  await check('every refusal: the worker names the first thing wrong and the graph shown stays', async () => {
    const out: { name: string; shown: boolean; message: string | undefined }[] = await x.evaluate(async () => {
      const g = globalThis as any,
        ge = g.df$.shadcn.graphExplorer;
      const flat = (n: number, parentOf: (i: number) => number, clusterOf: (i: number) => number, nodes: number) => ({
        clusters: {
          parent: Int32Array.from({ length: n }, (_, i) => parentOf(i)),
          type: new Uint8Array(n),
          label: Array.from({ length: n }, (_, i) => 'c' + i),
        },
        nodes: {
          cluster: Int32Array.from({ length: nodes }, (_, i) => clusterOf(i)),
          type: new Uint8Array(nodes),
          label: Array.from({ length: nodes }, (_, i) => 'n' + i),
          ref: Array.from({ length: nodes }, (_, i) => 'r' + i),
        },
        edges: { start: new Int32Array(nodes + 1), target: new Int32Array(0), type: new Uint8Array(0) },
        types: { cluster: ['c'], node: ['n'], edge: ['e'] },
      });
      // a list of n with holes, as new Array(n) leaves the entries never set
      const holes = (n: number, set: Record<number, string>) => {
        const a: string[] = [];
        a.length = n;
        for (const [k, v] of Object.entries(set)) a[+k] = v;
        return a;
      };
      const cases: [string, (d: any) => any][] = [
        ['no data', () => null],
        ['no types', (d) => ({ ...d, types: undefined })],
        ['clusters.parent kind', (d) => ((d.clusters.parent = [-1, 0, 0]), d)],
        ['clusters.type kind', (d) => ((d.clusters.type = Int8Array.of(0, 1, 1)), d)],
        ['nodes.cluster kind', (d) => ((d.nodes.cluster = Uint32Array.of(1, 1, 1, 2, 2, 2)), d)],
        ['nodes.type kind', (d) => ((d.nodes.type = Uint16Array.of(0, 1, 0, 1, 0, 1)), d)],
        ['edges.start kind', (d) => ((d.edges.start = Float64Array.of(0, 2, 3, 4, 5, 6, 6)), d)],
        ['edges.target kind', (d) => ((d.edges.target = Uint8Array.of(1, 3, 2, 0, 4, 0)), d)],
        ['edges.type kind', (d) => ((d.edges.type = Uint8ClampedArray.of(0, 1, 0, 0, 0, 1)), d)],
        [
          'shared buffer',
          (d) => (
            (d.clusters.parent = new Int32Array(new SharedArrayBuffer(12))),
            d.clusters.parent.set([-1, 0, 0]),
            d
          ),
        ],
        ['types.cluster', (d) => ((d.types.cluster = 'Org'), d)],
        ['types.node', (d) => ((d.types.node = ['person', 2]), d)],
        ['types.edge with a hole', (d) => ((d.types.edge = holes(2, { 0: 'knows' })), d)],
        ['no root', (d) => ((d.clusters = { parent: new Int32Array(0), type: new Uint8Array(0), label: [] }), d)],
        [
          'no nodes',
          (d) => (
            (d.nodes = { cluster: new Int32Array(0), type: new Uint8Array(0), label: [], ref: [] }),
            (d.edges = { start: Int32Array.of(0), target: new Int32Array(0), type: new Uint8Array(0) }),
            d
          ),
        ],
        ['clusters.type length', (d) => ((d.clusters.type = Uint8Array.of(0, 1)), d)],
        ['clusters.label with a hole', (d) => ((d.clusters.label = holes(3, { 0: 'r', 1: 'a' })), d)],
        ['clusters.ref length', (d) => ((d.clusters.ref = ['r', 'a']), d)],
        ['nodes.type length', (d) => ((d.nodes.type = Uint8Array.of(0, 1, 0, 1, 0)), d)],
        ['nodes.label with holes', (d) => ((d.nodes.label = holes(6, { 0: 'only one' })), d)],
        ['nodes.ref with a number', (d) => ((d.nodes.ref = ['a', 'b', 'c', 'd', 'e', 6]), d)],
        ['nodes.ref length', (d) => ((d.nodes.ref = [...d.nodes.ref, 'extra']), d)],
        ['edges.start length', (d) => ((d.edges.start = Int32Array.of(0, 2, 3, 4, 5, 6)), d)],
        ['edges.type length', (d) => ((d.edges.type = Uint8Array.of(0, 1, 0, 0, 0)), d)],
        ['root with a parent', (d) => ((d.clusters.parent = Int32Array.of(0, 0, 0)), d)],
        ['parent after child', (d) => ((d.clusters.parent = Int32Array.of(-1, 2, 0)), d)],
        [
          'children apart',
          (d) => (
            (d.clusters = {
              parent: Int32Array.of(-1, 0, 1, 0),
              type: new Uint8Array(4),
              label: ['r', 'a', 'a1', 'b'],
            }),
            (d.nodes.cluster = Int32Array.of(2, 2, 2, 3, 3, 3)),
            d
          ),
        ],
        [
          'too many clusters in one',
          () =>
            flat(
              1026,
              (i) => (i ? 0 : -1),
              (i) => 1 + i,
              1025,
            ),
        ],
        [
          'too many nodes in one',
          () =>
            flat(
              2,
              (i) => (i ? 0 : -1),
              () => 1,
              1025,
            ),
        ],
        [
          'too deep',
          () =>
            flat(
              257,
              (i) => i - 1,
              () => 256,
              1,
            ),
        ],
        ['cluster type', (d) => ((d.clusters.type = Uint8Array.of(0, 1, 5)), d)],
        ['node in no cluster', (d) => ((d.nodes.cluster = Int32Array.of(1, 1, 1, 2, 2, 7)), d)],
        ['nodes unsorted', (d) => ((d.nodes.cluster = Int32Array.of(1, 1, 2, 1, 2, 2)), d)],
        ['clusters and nodes', (d) => ((d.nodes.cluster = Int32Array.of(0, 1, 1, 2, 2, 2)), d)],
        ['node type', (d) => ((d.nodes.type = Uint8Array.of(0, 1, 0, 1, 0, 9)), d)],
        ['empty cluster', (d) => ((d.nodes.cluster = Int32Array.of(1, 1, 1, 1, 1, 1)), d)],
        ['start not 0', (d) => ((d.edges.start = Int32Array.of(1, 2, 3, 4, 5, 6, 6)), d)],
        ['start falls', (d) => ((d.edges.start = Int32Array.of(0, 2, 1, 4, 5, 6, 6)), d)],
        ['start end', (d) => ((d.edges.start = Int32Array.of(0, 2, 3, 4, 5, 5, 5)), d)],
        ['target', (d) => ((d.edges.target = Int32Array.of(1, 3, 2, 0, 4, 9)), d)],
        ['negative target', (d) => ((d.edges.target = Int32Array.of(-1, 3, 2, 0, 4, 0)), d)],
        ['edge type', (d) => ((d.edges.type = Uint8Array.of(0, 1, 0, 0, 0, 7)), d)],
      ];
      const out = [];
      for (const [name, change] of cases) {
        g.__errors.length = 0;
        const shown = await ge.load('#ext', change(g.__own()));
        out.push({ name, shown, message: g.__errors[0] });
      }
      return out;
    });
    assert.deepEqual(
      out.map((c) => c.name),
      Object.keys(REFUSALS),
      'one case per refusal',
    );
    const wrong = out.filter((c) => c.shown !== false || c.message !== 'Invalid graph data: ' + REFUSALS[c.name]);
    assert.deepEqual(wrong, [], 'each refused with its own message');
    assert.equal((await inspect(x, 'ext')).graph.nodes, 6, 'the graph shown stays');
    assert.equal(await x.getAttribute('#ext', 'data-graph-status'), 'ready');
    // the buffers were transferred although the data was refused: the same object again is detached
    const again = await x.evaluate(async () => {
      const g = globalThis as any,
        ge = g.df$.shadcn.graphExplorer;
      const d = g.__own();
      d.edges.target = Int32Array.of(1, 3, 2, 0, 4, 9);
      g.__errors.length = 0;
      const first = await ge.load('#ext', d);
      return { first, emptied: d.edges.target.length, second: await ge.load('#ext', d), message: g.__errors[1] };
    });
    assert.deepEqual([again.first, again.emptied, again.second], [false, 0, false]);
    assert.match(again.message ?? '', /^Invalid graph data: .*detached/i);
  });

  await check('of two loads under way only the one that shows resolves true; the one it superseded false', async () => {
    const out = await x.evaluate(async () => {
      const g = globalThis as any,
        ge = g.df$.shadcn.graphExplorer;
      const second = g.__own();
      second.clusters.label = ['second-root', 'gamma-team', 'delta-team'];
      const results = await Promise.all([ge.load('#ext', g.__own()), ge.load('#ext', second)]);
      return { results, labels: ge.inspect('#ext', { children: true }).children.map((c: any) => c.label) };
    });
    assert.deepEqual(out.results, [false, true]);
    assert.deepEqual(out.labels, ['gamma-team', 'delta-team']);
  });

  await check(
    "a load clears the search query and the outline filter: the new graph's outline shows all of its top",
    async () => {
      await x.fill('[data-graph-explorer-outlet="search"] input', 'gamma');
      await x.fill('[data-graph-explorer-outlet="outline"] .graph-explorer-outline-filter', 'delta');
      await x.waitForFunction(
        () => document.querySelectorAll('[data-graph-explorer-outlet="outline"] .graph-explorer-label').length === 1,
      );
      await x.evaluate(() => (globalThis as any).df$.shadcn.graphExplorer.load('#ext', (globalThis as any).__own()));
      assert.equal(await x.inputValue('[data-graph-explorer-outlet="search"] input'), '');
      assert.equal(await x.inputValue('[data-graph-explorer-outlet="outline"] .graph-explorer-outline-filter'), '');
      assert.deepEqual(
        await x.$$eval('[data-graph-explorer-outlet="outline"] .graph-explorer-label', (ls) =>
          ls.map((l) => l.textContent?.trim()).sort(),
        ),
        ['alpha-team', 'beta-team'],
      );
    },
  );

  await check('Live mode stays off for a loaded graph - also when its worker is asked to simulate', async () => {
    const out = await x.evaluate(async () => {
      const g = globalThis as any,
        ge = g.df$.shadcn.graphExplorer,
        el = document.getElementById('ext') as any;
      await new Promise((r) => setTimeout(r, 300)); // a frame came: the worker has a camera to simulate in
      el._graphExplorer.post({ t: 'simulate', on: true });
      await new Promise((r) => setTimeout(r, 2500));
      el._graphExplorer.post({ t: 'simulate', on: false });
      return { updates: ge.updates('#ext').length, status: el.getAttribute('data-graph-status') };
    });
    assert.deepEqual(out, { updates: 0, status: 'ready' });
  });

  await check(
    'a node beside a large subtree of mixed depth (100,001 nodes, 200,203 clusters) can be selected',
    async () => {
      const out = await x.evaluate(async () => {
        const g = globalThis as any,
          ge = g.df$.shadcn.graphExplorer;
        // 0 root | 1 A (entities), 2 X | X's 200 groups | 250 folders each | a file and a subfolder per folder | a file in
        // each subfolder: the node order (BFS) puts each folder's two files far apart
        const n = 50000,
          groups = n / 250;
        const parent = [-1, 0, 0];
        for (let j = 0; j < groups; j++) parent.push(2);
        const s0 = parent.length;
        for (let i = 0; i < n; i++) parent.push(3 + Math.floor(i / 250));
        const t0 = parent.length;
        for (let i = 0; i < n; i++) parent.push(s0 + i, s0 + i);
        const u0 = parent.length;
        for (let i = 0; i < n; i++) parent.push(t0 + 2 * i);
        const cluster = [1];
        for (let i = 0; i < n; i++) cluster.push(t0 + 2 * i + 1);
        for (let i = 0; i < n; i++) cluster.push(u0 + i);
        const C = parent.length,
          N = cluster.length;
        const t = performance.now();
        g.__errors.length = 0;
        const shown = await ge.load('#ext', {
          clusters: { parent: Int32Array.from(parent), type: new Uint8Array(C), label: parent.map((_, i) => 'c' + i) },
          nodes: {
            cluster: Int32Array.from(cluster),
            type: new Uint8Array(N),
            label: cluster.map((_, i) => 'n' + i),
            ref: cluster.map((_, i) => 'r' + i),
          },
          // one link from deep down to A's node: its incoming links are searched through the whole subtree
          edges: {
            start: Int32Array.from({ length: N + 1 }, (_, i) => (i === N ? 1 : 0)),
            target: Int32Array.of(0),
            type: new Uint8Array(1),
          },
          types: { cluster: ['folder'], node: ['fn'], edge: ['calls'] },
        });
        await ge.navigate('#ext', 'n0');
        const details = document.querySelector('[data-graph-explorer-outlet="details"]')!;
        const incoming = () =>
          [...details.querySelectorAll('.graph-explorer-section')]
            .find((s) => s.querySelector('.graph-explorer-section-title')?.textContent?.startsWith('Incoming'))
            ?.querySelector('.graph-explorer-row-name')?.textContent;
        const status = () => document.getElementById('ext')!.getAttribute('data-graph-status');
        for (let k = 0; k < 200 && !incoming() && status() === 'ready'; k++)
          await new Promise((r) => setTimeout(r, 50));
        return {
          shown,
          C,
          N,
          ms: Math.round(performance.now() - t),
          status: status(),
          errors: [...g.__errors],
          incoming: incoming(),
        };
      });
      assert.deepEqual([out.shown, out.C, out.N, out.status, out.errors], [true, 200203, 100001, 'ready', []]);
      assert.equal(out.incoming, 'n' + (out.N - 1), `the link from the last node (${out.ms} ms)`);
    },
  );

  await check('256 cluster levels load, navigate and walk (257 are refused above)', async () => {
    const out = await x.evaluate(async () => {
      const ge = (globalThis as any).df$.shadcn.graphExplorer;
      const C = 256;
      const shown = await ge.load('#ext', {
        clusters: {
          parent: Int32Array.from({ length: C }, (_, i) => i - 1),
          type: new Uint8Array(C),
          label: Array.from({ length: C }, (_, i) => 'l' + i),
        },
        nodes: { cluster: Int32Array.of(C - 1), type: new Uint8Array(1), label: ['bottom'], ref: ['b'] },
        edges: { start: Int32Array.of(0, 0), target: new Int32Array(0), type: new Uint8Array(0) },
        types: { cluster: ['level'], node: ['leaf'], edge: ['e'] },
      });
      await ge.navigate('#ext', 'n0');
      const rows = await ge.subtree('#ext', 'c0', 1000);
      return { shown, view: ge.inspect('#ext').view, rows: rows.length, deepest: rows.at(-1).level };
    });
    assert.deepEqual(out, { shown: true, view: 'c255', rows: 257, deepest: 256 });
  });

  await check(
    'navigate() and load() in one task: the page stays responsive and the new graph shows at its top',
    async () => {
      await x.evaluate(() => (globalThis as any).df$.shadcn.graphExplorer.load('#ext', (globalThis as any).__own()));
      // the path of n4 is answered from the new graph, after it was installed and before its top view came
      await x.evaluate(() => {
        const g = globalThis as any,
          ge = g.df$.shadcn.graphExplorer;
        g.__race = Promise.all([ge.navigate('#ext', 'n4'), ge.load('#ext', g.__own())]);
      });
      const answer = await Promise.race([
        x.evaluate(() => 'responsive'),
        new Promise((r) => setTimeout(() => r('frozen'), 8000)),
      ]);
      assert.equal(answer, 'responsive');
      const out = await x.evaluate(async () => {
        const g = globalThis as any;
        const [, shown] = await g.__race;
        return { shown, view: g.df$.shadcn.graphExplorer.inspect('#ext').view };
      });
      assert.deepEqual(out, { shown: true, view: 'c0' });
    },
  );

  await check('no page errors and no failed requests', async () => {
    assert.deepEqual(errors, []);
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\ngraph-explorer-data: all checks passed');
