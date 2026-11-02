/**
 * Why: the Geography section ships a library (df$.shadcn.geo: geodesics, S2 cells, a Morton index, routing, the DGEO
 * reader) and a map that frames, picks and labels regions. tests/e2e/site/geo-lib.e2e.ts compares the library with
 * the reference implementations (s2js, GeographicLib, brute force) and tests/e2e/geography/geo-map.e2e.ts drives
 * every map configuration; this suite holds the documented contract in the unit run, on the built module, with the
 * pinned engines served from node_modules through configure({ urls }) - the self-hosting path the docs describe,
 * no network.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { packTopology, unpackTopology, type GeoTopology } from '../scripts/lib/dgeo.ts';
import { waitFor } from './helpers.ts';

type LonLat = [number, number];
// structural: the page realm's df$ (the repo's .d.ts types the component side)
type Any = any;
let geo: Any;
let geoMap: Any;

const load = (url: string): Promise<unknown> => import(/* @vite-ignore */ url);
const frame = (): Promise<number> => new Promise((r) => requestAnimationFrame(r));
/** drawn and loaded: the requested render ran (it marks what is still loading), then nothing is loading */
async function idle(el: HTMLElement): Promise<void> {
  await frame();
  await waitFor(() => !el.hasAttribute('aria-busy'), 'the map to load what it shows', 15_000);
  await frame();
}

beforeAll(async () => {
  await load('/dist/components/core.js');
  await load('/dist/components/geo-map/geo-map.js');
  const ns = (globalThis as Any).df$.shadcn;
  geo = ns.geo;
  geoMap = ns.geoMap;
  geo.configure({
    data: '/dist/components/geo-map/data/manifest.json',
    urls: {
      d3Array: '/node_modules/d3-array/dist/d3-array.min.js',
      d3Geo: '/node_modules/d3-geo/dist/d3-geo.min.js',
      geodesic: '/node_modules/geographiclib-geodesic/geographiclib-geodesic.min.js',
      dson: '/node_modules/defuss-dson/dist/index.mjs',
    },
  });
  await geo.load();
}, 30_000);

const MUNICH: LonLat = [11.582, 48.1351];
const BERLIN: LonLat = [13.405, 52.52];

describe('geodesy on the WGS84 ellipsoid', () => {
  it('direct() from A along inverse()\'s bearing and distance arrives at B', () => {
    const d = geo.inverse(MUNICH, BERLIN);
    expect(d.meters).toBeGreaterThan(400_000);
    const b = geo.direct(MUNICH, d.initialBearing, d.meters);
    expect(b[0]).toBeCloseTo(BERLIN[0], 6);
    expect(b[1]).toBeCloseTo(BERLIN[1], 6);
  });

  it('a sphere is another ellipsoid: the same pair measures differently', () => {
    const wgs = geo.inverse(MUNICH, BERLIN).meters;
    const sphere = geo.inverse(MUNICH, BERLIN, { a: 6371008.8, f: 0 }).meters;
    expect(sphere).not.toBeCloseTo(wgs, 0);
  });

  it('path() samples the geodesic from A to B; its length is the geodesic distance', () => {
    const line: LonLat[] = geo.path(MUNICH, BERLIN, 20_000);
    expect(line[0]).toEqual(MUNICH);
    expect(line.at(-1)![0]).toBeCloseTo(BERLIN[0], 6);
    expect(line.length).toBeGreaterThan(20);
    expect(geo.length(line) / geo.inverse(MUNICH, BERLIN).meters).toBeCloseTo(1, 4);
  });

  it('rejects positions outside longitude / latitude range', () => {
    expect(() => geo.inverse([200, 0], BERLIN)).toThrow(RangeError);
  });
});

describe('S2 cells', () => {
  it('Munich at level 6 is the cell 479f; its center maps back to it', () => {
    const cell = geo.s2Cell(MUNICH, 6);
    expect(cell.token).toBe('479f');
    expect(cell.level).toBe(6);
    expect(geo.s2Id('479f')).toBe(cell.id);
    expect(geo.s2Level('479f')).toBe(6);
    expect(geo.s2Cell(geo.s2Center('479f'), 6).token).toBe('479f');
  });

  it('four children one level down, each with the cell as parent; four distinct edge neighbors', () => {
    const children: string[] = geo.s2Children('479f');
    expect(children).toHaveLength(4);
    for (const c of children) {
      expect(geo.s2Level(c)).toBe(7);
      expect(geo.s2Parent(c)).toBe('479f');
    }
    const neighbors: string[] = geo.s2Neighbors('479f');
    expect(new Set(neighbors).size).toBe(4);
    expect(neighbors).not.toContain('479f');
    expect(geo.s2Vertices('479f')).toHaveLength(4);
  });

  it('a marker position may be an S2 cell: its center', () => {
    expect(geo.resolvePosition({ s2: '479f' })).toEqual(geo.s2Center('479f'));
  });
});

describe('Morton index', () => {
  it('encode / decode round-trip; a rectangle query returns exactly the points inside it', () => {
    expect(geo.mortonDecode(geo.mortonEncode(12345, 54321))).toEqual([12345, 54321]);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const points: LonLat[] = Array.from({ length: 400 }, () => [rnd() * 360 - 180, rnd() * 170 - 85]);
    const index = geo.mortonIndex(points, (p: LonLat) => p);
    expect(index.size).toBe(400);
    const box = [-20, 30, 40, 70];
    const inside = points.filter((p) => geo.inBounds(p, box));
    expect(new Set(index.query(box))).toEqual(new Set(inside));
    expect(inside.length).toBeGreaterThan(0);
  });
});

describe('routing over supplied segment lengths', () => {
  const nodes = [
    { id: 'A', position: [0, 0] as LonLat },
    { id: 'B', position: [1, 0] as LonLat },
    { id: 'C', position: [2, 0] as LonLat },
    { id: 'D', position: [5, 5] as LonLat },
  ];
  const segments = [
    { id: 'ab', from: 'A', to: 'B', lengthMeters: 100, bidirectional: true },
    { id: 'bc', from: 'B', to: 'C', lengthMeters: 100 },
    { id: 'ac', from: 'A', to: 'C', lengthMeters: 500, bidirectional: true },
  ];

  it('the shortest route takes the supplied lengths, not the geometry; one-way segments stay one-way', () => {
    const g = geo.routeGraph(nodes, segments);
    const r = g.route('A', 'C');
    expect(r.lengthMeters).toBe(200);
    expect(r.nodeIds).toEqual(['A', 'B', 'C']);
    const back = g.route('C', 'A'); // bc is one-way: back over ac
    expect(back.nodeIds).toEqual(['C', 'A']);
    expect(back.lengthMeters).toBe(500);
    expect(g.route('A', 'D')).toBeNull();
  });

  it('routes between positions inside segments, cut proportionally; positions along the route', () => {
    const g = geo.routeGraph(nodes, segments);
    const r = g.routeAt({ segment: 'ab', fraction: 0.5 }, { segment: 'bc', fraction: 0.5 });
    expect(r.lengthMeters).toBeCloseTo(100, 6);
    expect(geo.positionAlongRoute(r, 0)[0]).toBeCloseTo(0.5, 6);
    expect(geo.positionAlongRoute(r, r.lengthMeters)[0]).toBeCloseTo(1.5, 6);
    expect(() => geo.positionAlongRoute(r, r.lengthMeters + 1)).toThrow(RangeError);
  });

  it('nearest node and the nodes in a rectangle', () => {
    const g = geo.routeGraph(nodes, segments);
    expect(g.nearestNode([1.9, 0.1]).node.id).toBe('C');
    expect(g.nodesInBounds([-0.5, -0.5, 1.5, 0.5]).map((n: { id: string }) => n.id).sort()).toEqual(['A', 'B']);
  });

  it('refuses a segment that names an unknown node', () => {
    expect(() => geo.routeGraph(nodes, [{ id: 'x', from: 'A', to: 'Z', lengthMeters: 1 }])).toThrow();
  });
});

describe('DGEO: the shipped reader reads what the build writes', () => {
  it('decode() equals the build\'s unpackTopology() and features() yields the regions', () => {
    const topology = {
      type: 'Topology',
      transform: { scale: [0.001, 0.001], translate: [0, 0] },
      objects: {
        regions: {
          type: 'GeometryCollection',
          geometries: [{ type: 'Polygon', arcs: [[0]], id: 'SQ', properties: { name: 'Square', level: 'country' } }],
        },
      },
      arcs: [[[0, 0], [1000, 0], [0, 1000], [-1000, 0], [0, -1000]]],
    } as unknown as GeoTopology;
    const bytes = packTopology(topology);
    const read = geo.decode(bytes);
    expect(read).toEqual(unpackTopology(bytes));
    const regions = geo.features(read, 'regions');
    expect(regions).toHaveLength(1);
    expect(regions[0].properties.name).toBe('Square');
  });

  it('refuses bytes that are not DGEO', () => {
    expect(() => geo.decode(new Uint8Array([1, 2, 3, 4]))).toThrow();
  });
});

describe('the map: frame, pick, search, label', () => {
  it('frames Europe with its countries, picks by state, finds Germany and frames its states', async () => {
    const el = document.createElement('div');
    el.className = 'geo-map';
    el.id = 'unit-map';
    el.style.cssText = 'width: 800px; height: 480px; display: block';
    el.dataset.focus = 'continent:Europe';
    el.dataset.callouts = 'true';
    el.setAttribute('aria-label', 'Europe');
    document.body.append(el);
    const map = el as HTMLElement & { api: Any };
    await new Promise<void>((r) => {
      const t = setInterval(() => map.api && (clearInterval(t), r()), 20);
    });
    await map.api.settled();
    await idle(el);
    expect(el.dataset.geoStatus).toBe('ready');
    expect(map.api.getState().name).toBe('focused');
    const keys = geoMap.visible(el).map((v: { key: string }) => v.key);
    expect(keys).toContain('country:DEU');
    expect(geoMap.stats(el).callouts).toBeGreaterThan(0);
    expect(geoMap.stats(el).contextRegions).toBeGreaterThan(0);

    await map.api.setState('focused', { selected: ['country:FRA'] });
    expect(el.dataset.selected).toBe('country:FRA');

    const [hit] = await geoMap.search(el, 'Germany');
    expect(hit.key).toBe('country:DEU');
    await geoMap.focus(el, 'country:DEU');
    await idle(el);
    expect(el.dataset.focus).toBe('country:DEU');
    // the pickable layer holds the focus's children; visible() also lists the dimmed context drawn around them
    const states = [...el.querySelectorAll('.geo-map-regions [data-key]')].map((p) => p.getAttribute('data-key')!);
    expect(states.length).toBeGreaterThan(10);
    expect(states.every((k) => k.startsWith('state:DEU'))).toBe(true);
    expect(geoMap.visible(el).map((v: { key: string }) => v.key)).toEqual(expect.arrayContaining(states));

    const xy = geoMap.project(el, [10, 51]);
    const back = geoMap.unproject(el, xy);
    expect(back[0]).toBeCloseTo(10, 4);
    expect(back[1]).toBeCloseTo(51, 4);

    await geoMap.up(el);
    expect(el.dataset.focus).toBe('continent:Europe');
    await geoMap.reset(el);
    expect(map.api.getState().name).toBe('default');
    el.remove();
  }, 30_000);
});
