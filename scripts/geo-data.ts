import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { geoArea, geoBounds } from 'd3-geo';
import { DSON } from 'defuss-dson';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { feature, merge, quantize } from 'topojson-client';
import { topology } from 'topojson-server';
import { presimplify, simplify, sphericalTriangleArea } from 'topojson-simplify';
import { packTopology, unpackTopology, type GeoTopology } from './lib/dgeo.ts';

/**
 * Why: the Geo Map's boundaries (src/components/geography/geo-map/data/) are generated from Natural Earth
 * v5.1.2 - pinned source files, their SHA-256 in manifest.json - never hand-edited. This script is that
 * generator (a maintenance script like media-demo.ts: never part of build or verify; it downloads ~45 MB into
 * tmp/geo-data/ on its first run).
 *
 *   bun scripts/geo-data.ts           regenerate every file from the pinned sources
 *   bun scripts/geo-data.ts --names   rewrite only names.json (the search index) from the shipped chunks
 *
 * Files: world.dgeo (110m countries, 50m where 110m has none, the continents dissolved from them - always
 * resident), country-<ADM0_A3>.dgeo (50m), states-<parent>.dgeo (10m admin-1, shared-arc Visvalingam,
 * 2e-9 sr), states-hi-<parent>.dgeo (10m as published, from 24x), manifest.json and names.json (every state's
 * id, name and parent - the map searches it before a country's states are loaded).
 * VERIFIED: (bun scripts/geo-data.ts on 2026-11-01, cmp) all 745 regenerated .dgeo files are byte-identical to
 * the ones the defuss-geo 0.1.0 PoC shipped; manifest.json differs only in the last float digits of three
 * geoBounds (POL, ESB, KWT - ~1e-13 degrees).
 */

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'src/components/geography/geo-map/data');
const CACHE = join(ROOT, 'tmp/geo-data');
const BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/';

type Bounds = [number, number, number, number];
interface Props {
  id: string;
  name: string;
  level: 'continent' | 'country' | 'state';
  parent?: string;
  continent?: string;
}
type Region = Feature<Polygon | MultiPolygon, Props>;
type Source = FeatureCollection<Polygon | MultiPolygon, Record<string, any>>;

/** names.json: every state's [id, name, parent], sorted by id */
function writeNames(states: Region[]): void {
  const rows = states.map((r) => [r.properties.id, r.properties.name, r.properties.parent ?? '']);
  rows.sort((a, b) => (a[0]! < b[0]! ? -1 : a[0]! > b[0]! ? 1 : 0));
  writeFileSync(join(OUT, 'names.json'), JSON.stringify({ version: 1, states: rows }));
  console.log(`names.json: ${rows.length} states`);
}

if (process.argv.includes('--names')) {
  const states: Region[] = [];
  for (const file of readdirSync(OUT).filter((f) => /^states-(?!hi-).+\.dgeo$/.test(f)).sort()) {
    const t = unpackTopology(readFileSync(join(OUT, file)));
    const fc = feature(t, t.objects.regions!) as unknown as FeatureCollection<Polygon | MultiPolygon, Props>;
    states.push(...(fc.features as Region[]));
  }
  writeNames(states);
  process.exit(0);
}

mkdirSync(OUT, { recursive: true });
mkdirSync(CACHE, { recursive: true });
const sources: { url: string; sha256: string; bytes: number }[] = [];

async function source(name: string): Promise<Source> {
  const file = join(CACHE, name);
  let bytes: Uint8Array;
  if (existsSync(file)) bytes = readFileSync(file);
  else {
    console.log(`downloading ${name}`);
    const r = await fetch(BASE + name, { signal: AbortSignal.timeout(120_000) });
    if (!r.ok) throw new Error(`${r.status} ${BASE + name}`);
    bytes = new Uint8Array(await r.arrayBuffer());
    if (bytes.length > 200 * 1024 * 1024) throw new Error('source too large');
    writeFileSync(file, bytes);
  }
  sources.push({ url: BASE + name, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length });
  return JSON.parse(new TextDecoder().decode(bytes)) as Source;
}

/** Natural Earth's ring orientation varies; D3 renders the smaller spherical region, so each ring is turned to it. */
function rewind(region: Region): Region {
  const g = region.geometry;
  for (const polygon of g.type === 'Polygon' ? [g.coordinates] : g.coordinates) {
    if (geoArea({ type: 'Polygon', coordinates: [polygon[0]!] }) > 2 * Math.PI) polygon[0]!.reverse();
    for (const hole of polygon.slice(1)) if (geoArea({ type: 'Polygon', coordinates: [hole] }) < 2 * Math.PI) hole.reverse();
  }
  return region;
}

const collection = (features: Region[]): FeatureCollection => ({ type: 'FeatureCollection', features });
const makeTopology = (features: Region[], q = 1_000_000): GeoTopology =>
  topology({ regions: collection(features) }, q) as unknown as GeoTopology;

function country(f: Source['features'][number]): Region {
  const p = f.properties;
  // ADM0_A3 is the key: ISO_A3 holds -99 sentinels in this dataset
  const properties: Props = {
    id: String(p.ADM0_A3),
    name: p.NAME_EN || p.NAME,
    level: 'country',
    continent: p.CONTINENT === 'Seven seas (open ocean)' ? 'Oceanic islands' : p.CONTINENT,
  };
  return rewind({ type: 'Feature', properties, geometry: f.geometry });
}

const save = (name: string, t: GeoTopology): number => {
  const bytes = packTopology(t);
  writeFileSync(join(OUT, name), bytes);
  return bytes.length;
};

const detailed = (await source('ne_50m_admin_0_countries.geojson')).features.map(country);
const coarse = (await source('ne_110m_admin_0_countries.geojson')).features.map(country);
const coarseIds = new Set(coarse.map((f) => f.properties.id));
// the tiny countries 110m omits stay addressable
coarse.push(...detailed.filter((f) => !coarseIds.has(f.properties.id)));
const coarseTopology = makeTopology(coarse, 100_000);
const countriesObject = coarseTopology.objects.regions!;
if (countriesObject.type !== 'GeometryCollection') throw new Error('expected the countries collection');
const continents = [...new Set(coarse.map((f) => f.properties.continent!))].sort().map((name) => {
  const members = countriesObject.geometries.filter((g) => (g.properties as Props | undefined)?.continent === name);
  return {
    type: 'Feature',
    properties: { id: name, name, level: 'continent' },
    geometry: merge(coarseTopology as never, members as never),
  } as Region;
});
const initial = topology({ countries: collection(coarse), continents: collection(continents) }, 100_000) as unknown as GeoTopology;
const initialBytes = save('world.dgeo', initial);

const details: Record<string, string> = {};
for (const f of detailed) {
  const id = f.properties.id;
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error(`unsafe country key ${id}`);
  // political subdivisions sharing one ADM0_A3 stay in one chunk
  if (details[id]) continue;
  save(`country-${id}.dgeo`, makeTopology(detailed.filter((other) => other.properties.id === id)));
  details[id] = `country-${id}.dgeo`;
}

const stateSource = await source('ne_10m_admin_1_states_provinces.geojson');
const stateGroups = new Map<string, Region[]>();
const allStates: Region[] = [];
for (const f of stateSource.features) {
  const p = f.properties;
  const parent = String(p.adm0_a3);
  const id = String(p.adm1_code);
  if (!/^[A-Za-z0-9_-]+$/.test(parent) || !id || id === 'undefined') throw new Error('invalid state identity');
  // identity, display name and parent only - no third-party auxiliary columns
  const region = rewind({
    type: 'Feature',
    properties: { id, name: p.name_en || p.name || id, parent, level: 'state' },
    geometry: f.geometry,
  });
  if (!stateGroups.has(parent)) stateGroups.set(parent, []);
  stateGroups.get(parent)!.push(region);
  allStates.push(region);
}

const states: Record<string, string> = {};
const stateDetails: Record<string, string> = {};
const bounds: Record<string, Bounds> = {};
for (const f of detailed) {
  const b = geoBounds(collection([f, ...(stateGroups.get(f.properties.id) ?? [])]));
  bounds[f.properties.id] = [b[0][0], b[0][1], b[1][0], b[1][1]];
}
let stateCount = 0;
for (const [parent, regions] of stateGroups) {
  if (!bounds[parent]) {
    const b = geoBounds(collection(regions));
    bounds[parent] = [b[0][0], b[0][1], b[1][0], b[1][1]];
  }
  const full = makeTopology(regions, 10_000_000);
  save(`states-hi-${parent}.dgeo`, full);
  // shared-arc simplification; the threshold is a spherical triangle area (steradians), no metre bound
  const medium = quantize(simplify(presimplify(full as never, sphericalTriangleArea), 2e-9), 10_000_000) as unknown as GeoTopology;
  save(`states-${parent}.dgeo`, medium);
  states[parent] = `states-${parent}.dgeo`;
  stateDetails[parent] = `states-hi-${parent}.dgeo`;
  stateCount += regions.length;
}

const manifest = {
  version: 1,
  dataset: 'Natural Earth v5.1.2',
  initial: 'world.dgeo',
  details,
  states,
  stateDetails,
  bounds,
  counts: { countries: coarse.length, detailedCountries: detailed.length, continents: continents.length, states: stateCount },
  sources,
  quantization: { world: 100000, countries: 1000000, states: 10000000 },
  stateSimplification: { algorithm: 'shared-arc Visvalingam', minTriangleAreaSteradians: 2e-9, fullDetailZoom: 24 },
};
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest));
writeNames(allStates);

// the same coarse topology in four encodings - what the Data & Encoding page reports (measured, not assumed)
const candidates = {
  geojson: Buffer.from(
    JSON.stringify({
      type: 'FeatureCollection',
      features: [
        ...(feature(initial as never, initial.objects.countries as never) as unknown as FeatureCollection).features,
        ...(feature(initial as never, initial.objects.continents as never) as unknown as FeatureCollection).features,
      ],
    }),
  ),
  topojson: Buffer.from(JSON.stringify(initial)),
  dsonTopology: Buffer.from(DSON.stringify(initial)),
  dgeo: Buffer.from(packTopology(initial)),
};
const sizes = Object.fromEntries(
  Object.entries(candidates).map(([name, bytes]) => [
    name,
    { raw: bytes.length, gzip: gzipSync(bytes).length, brotli: brotliCompressSync(bytes).length },
  ]),
);
writeFileSync(join(CACHE, 'encoding-sizes.json'), JSON.stringify(sizes, null, 2));
console.log(JSON.stringify({ ...manifest.counts, initialBytes, sizes }));
