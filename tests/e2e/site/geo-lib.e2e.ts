import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import GeographicLib from 'geographiclib-geodesic';
import { chromium } from 'playwright';
import { s2 } from 's2js';
import { feature } from 'topojson-client';
import { unpackTopology } from '../../../scripts/lib/dgeo.ts';
import { startServer } from '../server.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';

/**
 * Why: the geography library (df$.shadcn.geo) is the component's own code where it is no official engine - S2,
 * the Morton index, routing and the DGEO decoder - so each is checked against an independent reference here, in
 * the browser that ships it: S2 against s2js 1.44.0 (a port of Google's S2), the geodesics against GeographicLib run
 * in Node, the Morton index against a brute-force scan, routing against hand-computed shortest paths, and every
 * shipped DGEO file decoded by the component AND by scripts/lib/dgeo.ts + topojson-client.
 */

const DATA = resolve(import.meta.dirname, '../../../dist/components/geo-map/data');
const server = startServer();
const browser = await chromium.launch();
const page = await browser.newPage();
await offlineJsdelivr(page);
await page.route(`${server.url}/tests/e2e/__geo-lib.html`, (route) =>
  route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><script type="module" src="/dist/components/core.js"></script><script type="module" src="/dist/components/geo-map/geo-map.js"></script>',
  }),
);
await page.goto(`${server.url}/tests/e2e/__geo-lib.html`);
await page.waitForFunction(() => !!(globalThis as any).df$?.shadcn?.geo);
await page.evaluate(() => (globalThis as any).df$.shadcn.geo.load());

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

let seed = 7;
const rnd = (): number => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const deg = 180 / Math.PI;
const near = (a: number[], b: number[], eps = 1e-9): boolean =>
  Math.abs(a[1]! - b[1]!) < eps && (Math.abs(a[0]! - b[0]!) < eps || Math.abs(Math.abs(a[0]! - b[0]!) - 360) < eps);

try {
  await check('S2: tokens, levels, centers, corners, edge neighbors, children and parents equal s2js', async () => {
    const cases = Array.from({ length: 400 }, (_, i) => ({ p: [rnd() * 360 - 180, rnd() * 180 - 90] as [number, number], level: i % 31 }));
    cases.push({ p: [180, 0], level: 10 }, { p: [-180, 90], level: 3 }, { p: [0, -90], level: 30 }, { p: [11.582, 48.1351], level: 6 });
    const mine = await page.evaluate((cases) => {
      const g = (globalThis as any).df$.shadcn.geo;
      return cases.map(({ p, level }) => {
        const c = g.s2Cell(p, level);
        return {
          token: c.token,
          id: String(c.id),
          level: g.s2Level(c.token),
          center: g.s2Center(c.token),
          corners: g.s2Vertices(c.token),
          neighbors: g.s2Neighbors(c.token),
          children: g.s2Children(c.token),
          parent: level ? g.s2Parent(c.token) : null,
          byId: g.s2Token(BigInt(String(c.id))),
        };
      });
    }, cases);
    cases.forEach(({ p, level }, i) => {
      const id = s2.cellid.parent(s2.cellid.fromLatLng(s2.LatLng.fromDegrees(p[1], p[0])), level);
      const m = mine[i]!;
      const where = `${p} L${level}`;
      assert.equal(m.token, s2.cellid.toToken(id), where);
      assert.equal(m.id, String(id), where);
      assert.equal(m.byId, m.token, where);
      assert.equal(m.level, level, where);
      const ll = s2.cellid.latLng(id);
      assert.ok(near(m.center, [ll.lng * deg, ll.lat * deg]), `${where} center`);
      const cell = s2.Cell.fromCellID(id);
      for (let k = 0; k < 4; k++) {
        const v = s2.LatLng.fromPoint(cell.vertex(k));
        assert.ok(near(m.corners[k]!, [v.lng * deg, v.lat * deg]), `${where} corner ${k}`);
      }
      assert.deepEqual(m.neighbors, s2.cellid.edgeNeighbors(id).map(s2.cellid.toToken), `${where} neighbors`);
      assert.deepEqual(m.children, level === 30 ? [] : s2.cellid.children(id).map(s2.cellid.toToken), `${where} children`);
      if (level) assert.equal(m.parent, s2.cellid.toToken(s2.cellid.parent(id, level - 1)), `${where} parent`);
    });
  });

  await check('S2: a string is a hex token - a decimal id or a malformed token is refused', async () => {
    const errs = await page.evaluate(() => {
      const g = (globalThis as any).df$.shadcn.geo;
      const fails = (f: () => unknown): boolean => {
        try {
          f();
          return false;
        } catch {
          return true;
        }
      };
      return [fails(() => g.s2Center('5764607523034234880x')), fails(() => g.s2Center('479e')), fails(() => g.s2Cell([200, 0], 3)), fails(() => g.s2Cell([0, 0], 31))];
    });
    assert.deepEqual(errs, [true, true, true, true]);
  });

  await check('geodesics: inverse, direct and the sampled path equal GeographicLib (WGS84 and a sphere)', async () => {
    const pairs = Array.from({ length: 60 }, () => [
      [rnd() * 360 - 180, rnd() * 178 - 89],
      [rnd() * 360 - 180, rnd() * 178 - 89],
    ]) as [number, number][][];
    pairs.push([[0, 0], [179.5, 0.5]], [[11.582, 48.1351], [13.405, 52.52]]);
    const got = await page.evaluate((pairs) => {
      const g = (globalThis as any).df$.shadcn.geo;
      return pairs.map(([a, b]) => {
        const inv = g.inverse(a, b);
        const sphere = g.inverse(a, b, { a: 6371008.8, f: 0 });
        return { inv, sphere: sphere.meters, end: g.direct(a, inv.initialBearing, inv.meters), path: g.path(a, b, 500_000), length: g.length(g.path(a, b, 50_000)) };
      });
    }, pairs);
    const wgs = GeographicLib.Geodesic.WGS84;
    const sphere = new GeographicLib.Geodesic.Geodesic(6371008.8, 0);
    pairs.forEach(([a, b], i) => {
      const r = wgs.Inverse(a![1], a![0], b![1], b![0]);
      const g = got[i]!;
      assert.ok(Math.abs(g.inv.meters - r.s12!) < 1e-6, `${a} → ${b}: ${g.inv.meters} vs ${r.s12}`);
      assert.ok(Math.abs(g.inv.initialBearing - r.azi1!) < 1e-9);
      assert.ok(Math.abs(g.sphere - sphere.Inverse(a![1], a![0], b![1], b![0]).s12!) < 1e-6);
      assert.ok(near(g.end, b!, 1e-7), `direct lands on b: ${g.end} vs ${b}`);
      assert.deepEqual(g.path[0], a);
      assert.deepEqual(g.path.at(-1), b);
      assert.ok(g.path.length >= Math.ceil(r.s12! / 500_000) + 1);
      // a dense path is the geodesic: its length is the distance
      assert.ok(Math.abs(g.length - r.s12!) < 1e-3 * Math.max(1, r.s12! / 1e6), `path length ${g.length} vs ${r.s12}`);
    });
    // Munich - Berlin, the README's example: ~504 km on WGS84
    assert.ok(Math.abs(got.at(-1)!.inv.meters - 504_200) < 1_000, String(got.at(-1)!.inv.meters));
  });

  await check('Morton: encode / decode round trips; a rectangle query equals a brute-force scan (also across the antimeridian)', async () => {
    const result = await page.evaluate(() => {
      const g = (globalThis as any).df$.shadcn.geo;
      let s = 11;
      const r = (): number => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
      const pts = Array.from({ length: 3000 }, (_, i) => ({ i, p: [r() * 360 - 180, r() * 180 - 90] as [number, number] }));
      const index = g.mortonIndex(pts, (x: { p: [number, number] }) => x.p);
      const rects = [
        [-10, 35, 30, 60],
        [170, -20, -170, 20],
        [-180, -90, 180, 90],
        [0, 0, 0.5, 0.5],
        [100, 10, 101, 80],
      ];
      const queries = rects.map((b) => {
        const got = index.query(b).map((x: { i: number }) => x.i).sort((a: number, b: number) => a - b);
        const want = pts.filter((x) => g.inBounds(x.p, b)).map((x) => x.i);
        return JSON.stringify(got) === JSON.stringify(want) ? 'ok' : `${b}: ${got.length} vs ${want.length}`;
      });
      const round = [[0, 0], [65535, 65535], [12345, 54321]].every(([x, y]) => {
        const [a, b] = g.mortonDecode(g.mortonEncode(x, y));
        return a === x && b === y;
      });
      const ordered = index.ordered().map((x: { p: [number, number] }) => g.mortonKey(x.p));
      const sorted = ordered.every((k: bigint, i: number) => !i || ordered[i - 1] <= k);
      return { queries, round, sorted, size: index.size, z: String(g.mortonEncode(1, 0)) + String(g.mortonEncode(0, 1)) };
    });
    assert.deepEqual(result.queries, ['ok', 'ok', 'ok', 'ok', 'ok']);
    assert.ok(result.round && result.sorted);
    assert.equal(result.size, 3000);
    assert.equal(result.z, '12', 'x on the even bits, y on the odd');
  });

  await check('routing: Dijkstra over the supplied lengths, one-way segments, interior positions, the position along a route', async () => {
    const r = await page.evaluate(() => {
      const g = (globalThis as any).df$.shadcn.geo;
      const nodes = [
        { id: 'a', position: [0, 0] },
        { id: 'b', position: [1, 0] },
        { id: 'c', position: [2, 0] },
        { id: 'd', position: [1, 1] },
        { id: 'x', position: [5, 5] },
      ];
      const segments = [
        { id: 'ab', from: 'a', to: 'b', lengthMeters: 100, bidirectional: true },
        { id: 'bc', from: 'b', to: 'c', lengthMeters: 100, bidirectional: true },
        // a geometric shortcut with a longer recorded length: the recorded length wins
        { id: 'ac', from: 'a', to: 'c', lengthMeters: 500, bidirectional: true },
        // one way: d → a only
        { id: 'da', from: 'd', to: 'a', lengthMeters: 10 },
        { id: 'bd', from: 'b', to: 'd', lengthMeters: 30, bidirectional: true },
      ];
      const graph = g.routeGraph(nodes, segments);
      const ac = graph.route('a', 'c');
      const ad = graph.route('a', 'd');
      const da = graph.route('d', 'a');
      const ax = graph.route('a', 'x');
      const inside = graph.routeAt({ segment: 'ab', fraction: 0.25 }, { segment: 'bc', fraction: 0.5 });
      const mid = g.positionAlongRoute(ac, 100);
      const nearest = graph.nearestNode([0.9, 0.95]);
      const box = graph.nodesInBounds([0.5, -1, 2.5, 0.5]).map((n: { id: string }) => n.id).sort();
      const fails = (f: () => unknown): string => {
        try {
          f();
          return '';
        } catch (e) {
          return String(e);
        }
      };
      return {
        ac: [ac.lengthMeters, ac.nodeIds.join('')],
        ad: [ad.lengthMeters, ad.nodeIds.join('')],
        da: [da.lengthMeters, da.nodeIds.join('')],
        ax,
        inside: [inside.lengthMeters, inside.steps.map((s: { segment: string }) => s.segment).join(',')],
        mid,
        nearest: nearest.node.id,
        box,
        negative: fails(() => g.routeGraph(nodes, [{ id: 'n', from: 'a', to: 'b', lengthMeters: -1 }])),
        geometry: fails(() => g.routeGraph(nodes, [{ id: 'm', from: 'a', to: 'b', lengthMeters: 1, coordinates: [[0, 0], [2, 0]] }])),
      };
    });
    assert.deepEqual(r.ac, [200, 'abc']);
    assert.deepEqual(r.ad, [130, 'abd'], 'd → a is one way: a reaches d through b');
    assert.deepEqual(r.da, [10, 'da']);
    assert.equal(r.ax, null, 'an unconnected node has no route');
    assert.deepEqual(r.inside, [125, 'ab,bc'], '75 % of ab + 50 % of bc');
    assert.ok(near(r.mid, [1, 0], 1e-9), `100 m along a-b-c is b: ${r.mid}`);
    assert.equal(r.nearest, 'd');
    assert.deepEqual(r.box, ['b', 'c']);
    assert.match(r.negative, /finite and >= 0/);
    assert.match(r.geometry, /start and end at its nodes/);
  });

  await check('DGEO: every shipped file decodes in the browser exactly as scripts/lib/dgeo.ts + topojson-client decode it', async () => {
    const files = readdirSync(DATA).filter((f) => f.endsWith('.dgeo')).sort();
    assert.equal(files.length, 745);
    // a fingerprint per file: features, ids, names, positions and a coordinate sum
    const fingerprint = (fc: { features: { properties: Record<string, unknown>; geometry: any }[] }[]): string => {
      let points = 0;
      let sum = 0;
      const walk = (c: unknown): void => {
        if (typeof (c as number[])[0] === 'number') {
          points++;
          sum += (c as number[])[0]! * 1.5 + (c as number[])[1]!;
        } else (c as unknown[]).forEach(walk);
      };
      const ids: string[] = [];
      for (const col of fc)
        for (const f of col.features) {
          ids.push(`${f.properties.level}:${f.properties.id}:${f.properties.name}:${f.properties.parent ?? ''}`);
          walk(f.geometry.coordinates);
        }
      return `${ids.join('|')}#${points}#${sum.toFixed(6)}`;
    };
    const node = files.map((file) => {
      const t = unpackTopology(readFileSync(resolve(DATA, file)));
      return fingerprint(Object.keys(t.objects).map((name) => feature(t as never, t.objects[name] as never) as never));
    });
    const browserPrints: string[] = [];
    for (let i = 0; i < files.length; i += 100) {
      browserPrints.push(
        ...(await page.evaluate(
          async (names) => {
            const g = (globalThis as any).df$.shadcn.geo;
            const out: string[] = [];
            for (const name of names) {
              const t = g.decode(new Uint8Array(await (await fetch(`/dist/components/geo-map/data/${name}`)).arrayBuffer()));
              let points = 0;
              let sum = 0;
              const walk = (c: any): void => {
                if (typeof c[0] === 'number') {
                  points++;
                  sum += c[0] * 1.5 + c[1];
                } else c.forEach(walk);
              };
              const ids: string[] = [];
              for (const object of Object.keys(t.objects))
                for (const f of g.features(t, object)) {
                  ids.push(`${f.properties.level}:${f.properties.id}:${f.properties.name}:${f.properties.parent ?? ''}`);
                  walk(f.geometry.coordinates);
                }
              out.push(`${ids.join('|')}#${points}#${sum.toFixed(6)}`);
            }
            return out;
          },
          files.slice(i, i + 100),
        )),
      );
    }
    const differ = files.filter((_, i) => node[i] !== browserPrints[i]);
    assert.deepEqual(differ, []);
  });

  await check('names.json lists every state of the shipped chunks with its parent', async () => {
    const names = JSON.parse(readFileSync(resolve(DATA, 'names.json'), 'utf8')) as { states: [string, string, string][] };
    const deu = names.states.filter((s) => s[2] === 'DEU').map((s) => s[0]).sort();
    const t = unpackTopology(readFileSync(resolve(DATA, 'states-DEU.dgeo')));
    const chunk = (feature(t as never, t.objects.regions as never) as never as { features: { properties: { id: string } }[] }).features.map((f) => f.properties.id).sort();
    assert.deepEqual(deu, chunk);
    assert.equal(names.states.length, 4596);
  });

  await check('rewind: RFC 7946 and D3 winding both come out as the small region', async () => {
    const areas = await page.evaluate(() => {
      const g = (globalThis as any).df$.shadcn.geo;
      const d3 = (globalThis as any).d3;
      const ccw = { type: 'Feature', properties: { id: 'a', name: 'A', level: 'country' }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] } };
      const cw = { ...ccw, geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]] } };
      return [g.rewind(ccw), g.rewind(cw)].map((r: any) => d3.geoArea(r));
    });
    assert.ok(areas.every((a) => a < 0.05), JSON.stringify(areas));
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\ngeo-lib: all checks passed');
