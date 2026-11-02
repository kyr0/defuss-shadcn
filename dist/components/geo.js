// dist/components/geo-map/geo-map.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.12") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals, defussQuery, componentState, bindComponent } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var geoMapStates = ["default", "selected", "focused"];
var GEO_VENDOR_URLS = {
  d3Array: "https://cdn.jsdelivr.net/npm/d3-array@3.2.4/dist/d3-array.min.js",
  d3Geo: "https://cdn.jsdelivr.net/npm/d3-geo@3.1.1/dist/d3-geo.min.js",
  geodesic: "https://cdn.jsdelivr.net/npm/geographiclib-geodesic@2.2.0/geographiclib-geodesic.min.js",
  dson: "https://cdn.jsdelivr.net/npm/defuss-dson@1.1.2/dist/index.mjs"
};
var releaseData = () => `https://cdn.jsdelivr.net/gh/kyr0/defuss-shadcn@v${df$.shared?.abi ?? "0.0.0"}/dist/components/geo-map/data/manifest.json`;
var engines = null;
var enginesPromise = null;
var settings = {
  data: "",
  urls: { ...GEO_VENDOR_URLS },
  views: {}
};
var LOAD_MS = 20000;
var metaContent = (name) => (dfDollar(`meta[name="${name}"]`).get(0) ?? null)?.content ?? "";
function vendor(vendorUrl) {
  return Promise.resolve().then(() => import(/* @vite-ignore */ vendorUrl));
}
function load() {
  if (engines)
    return Promise.resolve();
  if (!enginesPromise) {
    const urls = settings.urls;
    const present = globalThis.d3;
    const d3 = present?.geoPath && present?.geoEqualEarth ? Promise.resolve() : vendor(urls.d3Array).then(() => vendor(urls.d3Geo));
    const pending = Promise.all([d3, vendor(urls.geodesic), vendor(urls.dson)]).then(([, , dson]) => {
      const g = globalThis;
      if (!g.d3?.geoPath)
        throw new Error("d3-geo did not install globalThis.d3");
      if (!g.geodesic?.Geodesic)
        throw new Error("GeographicLib did not install globalThis.geodesic");
      const DSON = dson?.DSON ?? dson?.default?.DSON;
      if (!DSON)
        throw new Error("defuss-dson exports no DSON");
      engines = { d3: g.d3, geodesic: g.geodesic, DSON };
      return engines;
    });
    pending.catch(() => {
      if (enginesPromise === pending)
        enginesPromise = null;
    });
    enginesPromise = pending;
  }
  let timer = 0;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`the geography engines did not load within ${LOAD_MS / 1000} s`)), LOAD_MS);
  });
  return Promise.race([enginesPromise, deadline]).then(() => {
    return;
  }).finally(() => clearTimeout(timer));
}
var ready = () => {
  if (!engines)
    throw new Error("the geography engines are not loaded - await df$.shadcn.geo.load() first");
  return engines;
};
function configure(options) {
  if (options.data !== undefined)
    settings.data = String(options.data);
  if (options.urls)
    settings.urls = { ...settings.urls, ...options.urls };
  if (options.views)
    settings.views = { ...settings.views, ...options.views };
}
function assertLonLat(point) {
  const p = point;
  if (!Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90)
    throw new RangeError("expected [longitude, latitude] in [-180, 180] x [-90, 90] degrees");
}
function assertBounds(b) {
  if (!Array.isArray(b) || b.length !== 4)
    throw new RangeError("expected [west, south, east, north]");
  assertLonLat([b[0], b[1]]);
  assertLonLat([b[2], b[3]]);
  if (b[1] > b[3])
    throw new RangeError("south must not exceed north");
}
function inBounds(point, bounds) {
  return point[1] >= bounds[1] && point[1] <= bounds[3] && (bounds[0] <= bounds[2] ? point[0] >= bounds[0] && point[0] <= bounds[2] : point[0] >= bounds[0] || point[0] <= bounds[2]);
}
var wrapLon = (lon) => ((lon + 180) % 360 + 360) % 360 - 180;
var clampZoom = (z) => Math.max(1, Math.min(1024, z));
var clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
var WGS84 = Object.freeze({ a: 6378137, f: 1 / 298.257223563 });
var solvers = new Map;
function solver(ellipsoid = WGS84) {
  const key = `${ellipsoid.a}/${ellipsoid.f}`;
  let s = solvers.get(key);
  if (!s) {
    if (!Number.isFinite(ellipsoid.a) || ellipsoid.a <= 0 || !Number.isFinite(ellipsoid.f) || ellipsoid.f < 0 || ellipsoid.f >= 1 / 50)
      throw new RangeError("an ellipsoid needs a > 0 and 0 <= f < 1/50");
    s = new (ready()).geodesic.Geodesic.Geodesic(ellipsoid.a, ellipsoid.f);
    solvers.set(key, s);
  }
  return s;
}
function inverse(a, b, ellipsoid) {
  assertLonLat(a);
  assertLonLat(b);
  const r = solver(ellipsoid).Inverse(a[1], a[0], b[1], b[0]);
  return { meters: r.s12, initialBearing: r.azi1, finalBearing: r.azi2 };
}
function direct(origin, bearing, meters, ellipsoid) {
  assertLonLat(origin);
  if (!Number.isFinite(bearing) || !Number.isFinite(meters))
    throw new RangeError("a finite bearing and distance");
  const p = solver(ellipsoid).Direct(origin[1], origin[0], bearing, meters);
  return [p.lon2, p.lat2];
}
function geodesicPath(a, b, maxStepMeters = 20000, ellipsoid) {
  if (!Number.isFinite(maxStepMeters) || maxStepMeters <= 0)
    throw new RangeError("maxStepMeters must be positive");
  const { meters } = inverse(a, b, ellipsoid);
  const n = Math.max(1, Math.ceil(meters / maxStepMeters));
  if (n > 1e5)
    throw new RangeError("too many geodesic samples (at most 100000 segments)");
  const line = solver(ellipsoid).InverseLine(a[1], a[0], b[1], b[0]);
  const points = [[a[0], a[1]]];
  for (let i = 1;i < n; i++) {
    const p = line.Position(meters * i / n);
    points.push([p.lon2, p.lat2]);
  }
  points.push([b[0], b[1]]);
  return points;
}
function polylineLength(points, ellipsoid) {
  let sum = 0;
  for (let i = 1;i < points.length; i++)
    sum += inverse(points[i - 1], points[i], ellipsoid).meters;
  return sum;
}
var S2_MAX = 2 ** 30;
var SWAP = 1;
var INVERT = 2;
var POS_TO_IJ = [
  [0, 1, 3, 2],
  [0, 2, 3, 1],
  [3, 2, 0, 1],
  [3, 1, 0, 2]
];
var POS_TO_ORIENTATION = [SWAP, 0, 0, INVERT | SWAP];
var LOOKUP_POS = new Int32Array(1024);
var LOOKUP_IJ = new Int32Array(1024);
function initLookup(level, i, j, orig, pos, orientation) {
  if (level === 4) {
    const ij = (i << 4) + j;
    LOOKUP_POS[(ij << 2) + orig] = (pos << 2) + orientation;
    LOOKUP_IJ[(pos << 2) + orig] = (ij << 2) + orientation;
    return;
  }
  const r = POS_TO_IJ[orientation];
  for (let k = 0;k < 4; k++)
    initLookup(level + 1, (i << 1) + (r[k] >> 1), (j << 1) + (r[k] & 1), orig, (pos << 2) + k, orientation ^ POS_TO_ORIENTATION[k]);
}
for (const o of [0, SWAP, INVERT, SWAP | INVERT])
  initLookup(0, 0, 0, o, 0, o);
var RAD = 180 / Math.PI;
function lonLatToXyz(p) {
  const phi = p[1] / RAD;
  const theta = p[0] / RAD;
  const c = Math.cos(phi);
  return [Math.cos(theta) * c, Math.sin(theta) * c, Math.sin(phi)];
}
function xyzToLonLat(x, y, z) {
  return [Math.atan2(y, x) * RAD, Math.atan2(z, Math.hypot(x, y)) * RAD];
}
function xyzToFaceUV(x, y, z) {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const az = Math.abs(z);
  let f = ax > ay ? ax > az ? 0 : 2 : ay > az ? 1 : 2;
  if (f === 0 && x < 0 || f === 1 && y < 0 || f === 2 && z < 0)
    f += 3;
  switch (f) {
    case 0:
      return [0, y / x, z / x];
    case 1:
      return [1, -x / y, z / y];
    case 2:
      return [2, -x / z, -y / z];
    case 3:
      return [3, z / x, y / x];
    case 4:
      return [4, z / y, -x / y];
    default:
      return [5, -y / z, -x / z];
  }
}
function faceUVToXyz(f, u, v) {
  switch (f) {
    case 0:
      return [1, u, v];
    case 1:
      return [-u, 1, v];
    case 2:
      return [-u, -v, 1];
    case 3:
      return [-1, -v, -u];
    case 4:
      return [v, -1, -u];
    default:
      return [v, u, -1];
  }
}
var stToUV = (s) => s >= 0.5 ? (4 * s * s - 1) / 3 : (1 - 4 * (1 - s) * (1 - s)) / 3;
var uvToST = (u) => u >= 0 ? 0.5 * Math.sqrt(1 + 3 * u) : 1 - 0.5 * Math.sqrt(1 - 3 * u);
var stToIJ = (s) => clamp(Math.floor(S2_MAX * s), 0, S2_MAX - 1);
function fromFaceIJ(f, i, j) {
  let n = BigInt(f) << 60n;
  let bits = f & SWAP;
  for (let k = 7;k >= 0; k--) {
    bits += (i >> k * 4 & 15) << 6;
    bits += (j >> k * 4 & 15) << 2;
    bits = LOOKUP_POS[bits];
    n |= BigInt(bits >> 2) << BigInt(k * 8);
    bits &= SWAP | INVERT;
  }
  return n * 2n + 1n;
}
function faceIJ(id) {
  const f = Number(id >> 61n);
  let orientation = f & SWAP;
  let i = 0;
  let j = 0;
  let nbits = 2;
  for (let k = 7;k >= 0; k--) {
    orientation += Number(id >> BigInt(k * 8 + 1) & BigInt((1 << 2 * nbits) - 1)) << 2;
    orientation = LOOKUP_IJ[orientation];
    i += (orientation >> 6) * 2 ** (k * 4);
    j += (orientation >> 2 & 15) * 2 ** (k * 4);
    orientation &= SWAP | INVERT;
    nbits = 4;
  }
  return [f, i, j];
}
var lsb = (id) => id & -id;
var lsbForLevel = (level) => 1n << BigInt(2 * (30 - level));
function levelOf(id) {
  let tz = 0;
  while (tz < 64 && (id >> BigInt(tz) & 1n) === 0n)
    tz++;
  return 30 - (tz >> 1);
}
var parentAt = (id, level) => {
  const l = lsbForLevel(level);
  return id & -l | l;
};
var tokenOf = (id) => id.toString(16).padStart(16, "0").replace(/0+$/, "") || "X";
function s2Id(cell) {
  if (typeof cell === "string" && !/^[0-9a-fA-F]{1,16}$/.test(cell))
    throw new RangeError("expected a 1-16 digit hexadecimal S2 token");
  const id = typeof cell === "bigint" ? cell : BigInt(`0x${cell.padEnd(16, "0")}`);
  if (id <= 0n || id >= 1n << 64n || Number(id >> 61n) > 5 || (lsb(id) & 0x1555555555555555n) === 0n)
    throw new RangeError("invalid S2 cell id");
  return id;
}
function s2Cell(point, level = 12) {
  assertLonLat(point);
  if (!Number.isInteger(level) || level < 0 || level > 30)
    throw new RangeError("an S2 level is 0 to 30");
  const [f, u, v] = xyzToFaceUV(...lonLatToXyz(point));
  const id = parentAt(fromFaceIJ(f, stToIJ(uvToST(u)), stToIJ(uvToST(v))), level);
  return { id, token: tokenOf(id), level };
}
function s2Token(cell) {
  return tokenOf(s2Id(cell));
}
function s2Level(cell) {
  return levelOf(s2Id(cell));
}
function cellSquare(id) {
  const [f, i, j] = faceIJ(id);
  const size = 2 ** (30 - levelOf(id));
  return [f, Math.floor(i / size) * size, Math.floor(j / size) * size, size];
}
function s2Center(cell) {
  const [f, i, j, size] = cellSquare(s2Id(cell));
  return xyzToLonLat(...faceUVToXyz(f, stToUV((i + size / 2) / S2_MAX), stToUV((j + size / 2) / S2_MAX)));
}
function s2Vertices(cell) {
  const [f, i, j, size] = cellSquare(s2Id(cell));
  const u0 = stToUV(i / S2_MAX);
  const u1 = stToUV((i + size) / S2_MAX);
  const v0 = stToUV(j / S2_MAX);
  const v1 = stToUV((j + size) / S2_MAX);
  return [
    [u0, v0],
    [u1, v0],
    [u1, v1],
    [u0, v1]
  ].map(([u, v]) => xyzToLonLat(...faceUVToXyz(f, u, v)));
}
function s2Polygon(cell) {
  const token = s2Token(cell);
  const ring = s2Vertices(cell).reverse();
  ring.push([ring[0][0], ring[0][1]]);
  return {
    type: "Feature",
    properties: { id: token, name: `S2 ${token}`, level: "state" },
    geometry: { type: "Polygon", coordinates: [ring] }
  };
}
function fromFaceIJWrap(f, i, j) {
  i = clamp(i, -1, S2_MAX);
  j = clamp(j, -1, S2_MAX);
  const limit = 1 + Number.EPSILON;
  const u = clamp((2 * i + 1 - S2_MAX) / S2_MAX, -limit, limit);
  const v = clamp((2 * j + 1 - S2_MAX) / S2_MAX, -limit, limit);
  const [g, u2, v2] = xyzToFaceUV(...faceUVToXyz(f, u, v));
  return fromFaceIJ(g, stToIJ(0.5 * (u2 + 1)), stToIJ(0.5 * (v2 + 1)));
}
function s2Neighbors(cell) {
  const id = s2Id(cell);
  const level = levelOf(id);
  const size = 2 ** (30 - level);
  const [f, i, j] = faceIJ(id);
  return [
    [i, j - size],
    [i + size, j],
    [i, j + size],
    [i - size, j]
  ].map(([a, b]) => tokenOf(parentAt(fromFaceIJWrap(f, a, b), level)));
}
function s2Children(cell) {
  const id = s2Id(cell);
  if (levelOf(id) === 30)
    return [];
  const low = lsb(id);
  const begin = id - low + (low >> 2n);
  const step = low >> 1n;
  return [0n, 1n, 2n, 3n].map((k) => tokenOf(begin + k * step));
}
function s2Parent(cell, level) {
  const id = s2Id(cell);
  const own = levelOf(id);
  const target = level ?? own - 1;
  if (!Number.isInteger(target) || target < 0 || target > own)
    throw new RangeError(`a parent level is 0 to ${own}`);
  return tokenOf(parentAt(id, target));
}
function resolvePosition(value) {
  if (Array.isArray(value)) {
    assertLonLat(value);
    return [value[0], value[1]];
  }
  return s2Center(value.s2);
}
function checkBits(bits) {
  if (!Number.isInteger(bits) || bits < 1 || bits > 26)
    throw new RangeError("Morton bits are 1 to 26");
}
function mortonEncode(x, y, bits = 16) {
  checkBits(bits);
  if (![x, y].every((v) => Number.isInteger(v) && v >= 0 && v < 2 ** bits))
    throw new RangeError("grid coordinate out of range");
  const bx = BigInt(x);
  const by = BigInt(y);
  let key = 0n;
  for (let b = 0;b < bits; b++) {
    const s = BigInt(b);
    key |= (bx >> s & 1n) << 2n * s | (by >> s & 1n) << 2n * s + 1n;
  }
  return key;
}
function mortonDecode(key, bits = 16) {
  checkBits(bits);
  if (key < 0n || key >= 1n << BigInt(2 * bits))
    throw new RangeError("Morton key out of range");
  let x = 0n;
  let y = 0n;
  for (let b = 0;b < bits; b++) {
    const s = BigInt(b);
    x |= (key >> 2n * s & 1n) << s;
    y |= (key >> 2n * s + 1n & 1n) << s;
  }
  return [Number(x), Number(y)];
}
function mortonGrid(p, bits) {
  const n = 2 ** bits;
  return [Math.min(n - 1, Math.floor((p[0] + 180) / 360 * n)), Math.min(n - 1, Math.floor((p[1] + 90) / 180 * n))];
}
function mortonKey(point, bits = 16) {
  assertLonLat(point);
  checkBits(bits);
  return mortonEncode(...mortonGrid(point, bits), bits);
}
function mortonIndex(items, position, bits = 16) {
  checkBits(bits);
  const entries = items.map((item) => {
    const point = position(item);
    assertLonLat(point);
    return { key: mortonKey(point, bits), point: [point[0], point[1]], item };
  }).sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  const lowerBound = (key) => {
    let lo = 0;
    let hi = entries.length;
    while (lo < hi) {
      const m = lo + hi >>> 1;
      if (entries[m].key < key)
        lo = m + 1;
      else
        hi = m;
    }
    return lo;
  };
  const query = (bounds) => {
    assertBounds(bounds);
    if (bounds[0] > bounds[2])
      return [...query([bounds[0], bounds[1], 180, bounds[3]]), ...query([-180, bounds[1], bounds[2], bounds[3]])];
    const [x0, y0] = mortonGrid([bounds[0], bounds[1]], bits);
    const [x1, y1] = mortonGrid([bounds[2], bounds[3]], bits);
    const out = [];
    const walk = (x, y, size, depth, prefix) => {
      if (x > x1 || y > y1 || x + size - 1 < x0 || y + size - 1 < y0)
        return;
      const shift = BigInt(2 * (bits - depth));
      const begin = lowerBound(prefix << shift);
      const end = lowerBound(prefix + 1n << shift);
      if (begin === end)
        return;
      if (end - begin <= 32 || depth === bits || x >= x0 && y >= y0 && x + size - 1 <= x1 && y + size - 1 <= y1) {
        for (let i = begin;i < end; i++)
          if (inBounds(entries[i].point, bounds))
            out.push(entries[i].item);
        return;
      }
      const half = size / 2;
      for (let q = 0;q < 4; q++)
        walk(x + (q & 1) * half, y + (q >> 1) * half, half, depth + 1, prefix * 4n + BigInt(q));
    };
    walk(0, 0, 2 ** bits, 0, 0n);
    return out;
  };
  return { size: entries.length, ordered: () => entries.map((e) => e.item), query };
}

class Queue {
  values = [];
  push(value) {
    let i = this.values.length;
    this.values.push(value);
    while (i > 0) {
      const p = i - 1 >>> 1;
      if (this.values[p].cost <= value.cost)
        break;
      this.values[i] = this.values[p];
      i = p;
    }
    this.values[i] = value;
  }
  pop() {
    if (!this.values.length)
      return;
    const first = this.values[0];
    const last = this.values.pop();
    if (this.values.length) {
      let i = 0;
      while (i * 2 + 1 < this.values.length) {
        let c = i * 2 + 1;
        if (c + 1 < this.values.length && this.values[c + 1].cost < this.values[c].cost)
          c++;
        if (this.values[c].cost >= last.cost)
          break;
        this.values[i] = this.values[c];
        i = c;
      }
      this.values[i] = last;
    }
    return first;
  }
}
function pointOnLine(points, fraction) {
  if (fraction <= 0)
    return [points[0][0], points[0][1]];
  const last = points[points.length - 1];
  if (fraction >= 1)
    return [last[0], last[1]];
  const lengths = points.slice(1).map((p, i) => inverse(points[i], p).meters);
  const total = lengths.reduce((a, b) => a + b, 0);
  if (!total)
    return [points[0][0], points[0][1]];
  const target = total * fraction;
  let before = 0;
  for (let i = 0;i < lengths.length; i++) {
    if (before + lengths[i] >= target)
      return direct(points[i], inverse(points[i], points[i + 1]).initialBearing, target - before);
    before += lengths[i];
  }
  return [last[0], last[1]];
}
function sliceLine(points, from, to) {
  const total = polylineLength(points);
  const out = [pointOnLine(points, from)];
  let before = 0;
  for (let i = 1;i < points.length - 1; i++) {
    before += inverse(points[i - 1], points[i]).meters;
    const f = total ? before / total : 0;
    if (f > from && f < to)
      out.push([points[i][0], points[i][1]]);
  }
  out.push(pointOnLine(points, to));
  return out;
}
function routeGraph(nodes, segments) {
  const byId = new Map;
  const segs = new Map;
  const adjacency = new Map;
  for (const n of nodes) {
    if (!n.id || byId.has(n.id))
      throw new Error(`duplicate or empty node id: ${n.id}`);
    assertLonLat(n.position);
    byId.set(n.id, { ...n, position: [n.position[0], n.position[1]] });
    adjacency.set(n.id, []);
  }
  for (const edge of segments) {
    if (!edge.id || segs.has(edge.id))
      throw new Error(`duplicate or empty segment id: ${edge.id}`);
    if (!byId.has(edge.from) || !byId.has(edge.to))
      throw new Error(`unknown endpoint of segment ${edge.id}`);
    if (!Number.isFinite(edge.lengthMeters) || edge.lengthMeters < 0)
      throw new RangeError(`segment ${edge.id}: the length must be finite and >= 0`);
    const a = byId.get(edge.from).position;
    const b = byId.get(edge.to).position;
    const points = edge.coordinates?.map((p) => {
      assertLonLat(p);
      return [p[0], p[1]];
    }) ?? [a, b];
    const end = points[points.length - 1];
    if (points.length < 2 || points[0][0] !== a[0] || points[0][1] !== a[1] || end[0] !== b[0] || end[1] !== b[1])
      throw new Error(`segment ${edge.id}: its geometry must start and end at its nodes`);
    const segment = { ...edge, coordinates: points };
    segs.set(edge.id, segment);
    adjacency.get(edge.from).push({ to: edge.to, segment, reversed: false });
    if (edge.bidirectional)
      adjacency.get(edge.to).push({ to: edge.from, segment, reversed: true });
  }
  const index = mortonIndex([...byId.values()], (n) => n.position);
  const copy = (n) => ({ ...n, position: [n.position[0], n.position[1]] });
  const route = (from, to) => {
    if (!byId.has(from) || !byId.has(to))
      throw new Error("unknown route node");
    const costs = new Map([[from, 0]]);
    const previous = new Map;
    const queue = new Queue;
    queue.push({ id: from, cost: 0 });
    for (let current = queue.pop();current; current = queue.pop()) {
      if (current.cost !== costs.get(current.id))
        continue;
      if (current.id === to)
        break;
      for (const arc of adjacency.get(current.id)) {
        const cost = current.cost + arc.segment.lengthMeters;
        if (!Number.isFinite(cost))
          throw new RangeError("route cost overflow");
        if (cost < (costs.get(arc.to) ?? Infinity)) {
          costs.set(arc.to, cost);
          previous.set(arc.to, { from: current.id, arc });
          queue.push({ id: arc.to, cost });
        }
      }
    }
    if (!costs.has(to))
      return null;
    const steps = [];
    const ids = [to];
    for (let id = to;id !== from; ) {
      const p = previous.get(id);
      const coordinates = p.arc.segment.coordinates.map((q) => [q[0], q[1]]);
      if (p.arc.reversed)
        coordinates.reverse();
      steps.push({
        segment: p.arc.segment.id,
        from: p.from,
        to: id,
        reversed: p.arc.reversed,
        lengthMeters: p.arc.segment.lengthMeters,
        coordinates
      });
      id = p.from;
      ids.push(id);
    }
    steps.reverse();
    ids.reverse();
    const coordinates = steps.flatMap((step, i) => i ? step.coordinates.slice(1) : step.coordinates);
    if (!steps.length) {
      const p = byId.get(from).position;
      coordinates.push([p[0], p[1]], [p[0], p[1]]);
    }
    return { lengthMeters: costs.get(to), nodeIds: ids, steps, coordinates };
  };
  const routeAt = (from, to) => {
    const allNodes = [...byId.values()];
    const cuts = new Map;
    const originals = new Map;
    let sequence = 0;
    const unique = () => {
      let id;
      do
        id = `__geo_cut_${sequence++}`;
      while (byId.has(id) || segs.has(id));
      return id;
    };
    const resolve = (p) => {
      const edge = segs.get(p.segment);
      if (!edge)
        throw new Error(`unknown segment: ${p.segment}`);
      if (!Number.isFinite(p.fraction) || p.fraction < 0 || p.fraction > 1)
        throw new RangeError("a fraction is 0 to 1");
      if (p.fraction === 0)
        return edge.from;
      if (p.fraction === 1)
        return edge.to;
      if (!cuts.has(edge.id))
        cuts.set(edge.id, new Map);
      const map = cuts.get(edge.id);
      if (!map.has(p.fraction)) {
        const id = unique();
        map.set(p.fraction, id);
        allNodes.push({ id, position: pointOnLine(edge.coordinates, p.fraction) });
      }
      return map.get(p.fraction);
    };
    const a = resolve(from);
    const b = resolve(to);
    const positionOf = (id) => allNodes.find((n) => n.id === id).position;
    const split = [];
    for (const edge of segs.values()) {
      const map = cuts.get(edge.id);
      if (!map) {
        split.push(edge);
        continue;
      }
      const parts = [[0, edge.from], ...map.entries(), [1, edge.to]];
      parts.sort((x, y) => x[0] - y[0]);
      for (let i = 1;i < parts.length; i++) {
        const prev = parts[i - 1];
        const next = parts[i];
        const coordinates = sliceLine(edge.coordinates, prev[0], next[0]);
        coordinates[0] = [...positionOf(prev[1])];
        coordinates[coordinates.length - 1] = [...positionOf(next[1])];
        const id = unique();
        originals.set(id, edge.id);
        split.push({
          ...edge,
          id,
          from: prev[1],
          to: next[1],
          coordinates,
          lengthMeters: edge.lengthMeters * (next[0] - prev[0])
        });
      }
    }
    const result = routeGraph(allNodes, split).route(a, b);
    if (result)
      for (const step of result.steps)
        step.segment = originals.get(step.segment) ?? step.segment;
    return result;
  };
  const nearestNode = (position, bounds) => {
    assertLonLat(position);
    let best = null;
    for (const node of bounds ? index.query(bounds) : [...byId.values()]) {
      const meters = inverse(position, node.position).meters;
      if (!best || meters < best.meters)
        best = { node: copy(node), meters };
    }
    return best;
  };
  return {
    route,
    routeAt,
    nearestNode,
    nodesInBounds: (bounds) => index.query(bounds).map(copy),
    mortonOrder: () => index.ordered().map((n) => n.id)
  };
}
function positionAlongRoute(route, meters) {
  if (!Number.isFinite(meters) || meters < 0 || meters > route.lengthMeters)
    throw new RangeError("a distance on the route");
  let remaining = meters;
  for (const step of route.steps) {
    if (remaining <= step.lengthMeters && step.lengthMeters > 0)
      return pointOnLine(step.coordinates, remaining / step.lengthMeters);
    remaining -= step.lengthMeters;
  }
  const last = route.coordinates[route.coordinates.length - 1];
  return [last[0], last[1]];
}
var DGEO_HEADER = 20;
var DGEO_MAX = 256 * 1024 * 1024;
var MAX_ARCS = 2000000;
var utf8 = new TextDecoder("utf-8", { fatal: true });
function readVarint(data, cursor, end) {
  let value = 0;
  let scale = 1;
  for (let k = 0;k < 5; k++) {
    if (cursor.i >= end)
      throw new Error("DGEO: truncated varint");
    const b = data[cursor.i++];
    value += (b & 127) * scale;
    if (value > 4294967295)
      throw new Error("DGEO: varint overflow");
    if (b < 128) {
      if (k && b === 0)
        throw new Error("DGEO: noncanonical varint");
      return value;
    }
    scale *= 128;
  }
  throw new Error("DGEO: oversized varint");
}
function checkTopology(t, arcCount) {
  if (!t || t.type !== "Topology" || !t.objects || typeof t.objects !== "object")
    throw new Error("invalid topology");
  const tr = t.transform;
  if (!tr || tr.scale.length !== 2 || tr.translate.length !== 2 || ![...tr.scale, ...tr.translate].every(Number.isFinite))
    throw new Error("a quantized topology needs its transform");
  let refs = 0;
  const indices = (value, depth) => {
    if (depth > 8 || ++refs > 1e7)
      throw new Error("excessive arc references");
    if (Array.isArray(value)) {
      for (const x of value)
        indices(x, depth + 1);
      return;
    }
    if (!Number.isInteger(value) || (value < 0 ? -value - 1 : value) >= arcCount)
      throw new Error("arc reference out of range");
  };
  const visit = (o, depth) => {
    if (!o || depth > 32)
      throw new Error("invalid geometry tree");
    if (o.type === "GeometryCollection")
      (o.geometries ?? []).forEach((g) => visit(g, depth + 1));
    else if (["Polygon", "MultiPolygon", "LineString", "MultiLineString"].includes(o.type))
      indices(o.arcs, 0);
  };
  Object.values(t.objects).forEach((o) => visit(o, 0));
}
function decode(bytes) {
  if (bytes.length > DGEO_MAX)
    throw new Error("topology size limit exceeded");
  if (bytes[0] !== 68) {
    const t = JSON.parse(utf8.decode(bytes));
    if (!Array.isArray(t.arcs) || t.arcs.length > MAX_ARCS)
      throw new Error("invalid arcs");
    checkTopology(t, t.arcs.length);
    return t;
  }
  if (bytes.length < DGEO_HEADER || bytes[1] !== 71 || bytes[2] !== 69 || bytes[3] !== 79)
    throw new Error("invalid DGEO header");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint16(4, true) !== 1 || view.getUint16(6, true) !== 0)
    throw new Error("unsupported DGEO version");
  const m = view.getUint32(8, true);
  const count = view.getUint32(12, true);
  const rawLength = view.getUint32(16, true);
  const base = DGEO_HEADER + m + (count + 1) * 4;
  if (m > 64 * 1024 * 1024 || count > MAX_ARCS || base + rawLength !== bytes.length)
    throw new Error("invalid DGEO lengths");
  const meta = ready().DSON.parse(utf8.decode(bytes.subarray(DGEO_HEADER, DGEO_HEADER + m)));
  checkTopology(meta, count);
  const offset = (k) => view.getUint32(DGEO_HEADER + m + k * 4, true);
  if (offset(0) !== 0 || offset(count) !== rawLength)
    throw new Error("invalid DGEO offset table");
  const arcs = [];
  for (let k = 0;k < count; k++) {
    const start = offset(k);
    const stop = offset(k + 1);
    if (stop < start || stop > rawLength)
      throw new Error("non-monotonic DGEO offsets");
    const cursor = { i: base + start };
    const end = base + stop;
    const arc = [];
    while (cursor.i < end) {
      const x = readVarint(bytes, cursor, end);
      const y = readVarint(bytes, cursor, end);
      arc.push([x % 2 ? -(x + 1) / 2 : x / 2, y % 2 ? -(y + 1) / 2 : y / 2]);
    }
    if (arc.length < 2)
      throw new Error("a DGEO arc needs two points");
    arcs.push(arc);
  }
  return { ...meta, arcs };
}
function features(topology, object) {
  const o = topology.objects[object];
  if (!o)
    throw new Error(`the topology has no object "${object}"`);
  const [kx, ky] = topology.transform?.scale ?? [1, 1];
  const [dx, dy] = topology.transform?.translate ?? [0, 0];
  const arcs = topology.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map((p) => {
      x += p[0];
      y += p[1];
      return [x * kx + dx, y * ky + dy];
    });
  });
  const line = (indices) => {
    const points = [];
    for (const i of indices) {
      if (points.length)
        points.pop();
      const start = points.length;
      for (const p of arcs[i < 0 ? ~i : i])
        points.push([p[0], p[1]]);
      if (i < 0) {
        const tail = points.splice(start).reverse();
        points.push(...tail);
      }
    }
    return points;
  };
  const ring = (indices) => {
    const points = line(indices);
    while (points.length < 4)
      points.push([points[0][0], points[0][1]]);
    return points;
  };
  const geometry = (g) => {
    switch (g.type) {
      case "Polygon":
        return { type: "Polygon", coordinates: g.arcs.map(ring) };
      case "MultiPolygon":
        return { type: "MultiPolygon", coordinates: g.arcs.map((p) => p.map(ring)) };
      case "LineString": {
        const points = line(g.arcs);
        if (points.length < 2)
          points.push([points[0][0], points[0][1]]);
        return { type: "LineString", coordinates: points };
      }
      case "MultiLineString":
        return { type: "MultiLineString", coordinates: g.arcs.map(line) };
      case "Point":
        return { type: "Point", coordinates: [g.coordinates[0] * kx + dx, g.coordinates[1] * ky + dy] };
      case "MultiPoint":
        return {
          type: "MultiPoint",
          coordinates: g.coordinates.map((c) => [c[0] * kx + dx, c[1] * ky + dy])
        };
      case "GeometryCollection":
        return { type: "GeometryCollection", geometries: g.geometries.map(geometry) };
      default:
        return null;
    }
  };
  const feature = (g) => ({
    type: "Feature",
    ...g.id != null ? { id: g.id } : {},
    properties: g.properties ?? {},
    geometry: geometry(g)
  });
  return o.type === "GeometryCollection" ? o.geometries.map(feature) : [feature(o)];
}
function rewind(region) {
  const { d3 } = ready();
  const g = region.geometry;
  if (!g || g.type !== "Polygon" && g.type !== "MultiPolygon")
    throw new Error("a region is a Polygon or MultiPolygon");
  const fix = (polygon) => polygon.map((ring, i) => {
    if (ring.length < 4)
      throw new Error("a ring needs four positions (closed)");
    ring.forEach(assertLonLat);
    const copy = ring.map((p) => [p[0], p[1]]);
    const big = d3.geoArea({ type: "Polygon", coordinates: [copy] }) > 2 * Math.PI;
    return (i === 0 ? big : !big) ? copy.reverse() : copy;
  });
  const coordinates = g.type === "Polygon" ? fix(g.coordinates) : g.coordinates.map(fix);
  return {
    type: "Feature",
    properties: { ...region.properties },
    geometry: { type: g.type, coordinates }
  };
}
function boundsProxy(id, bounds) {
  const [west, south, east, north] = bounds;
  const intervals = west > east ? [
    [west, 180],
    [-180, east]
  ] : [[west, east]];
  const polygons = [];
  const bottom = Math.max(-90, south - 0.1);
  const top = Math.min(90, north + 0.1);
  for (const [w, e] of intervals) {
    const count = Math.max(1, Math.ceil((e - w) / 60));
    for (let part = 0;part < count; part++) {
      const a = w + (e - w) * part / count;
      const b = w + (e - w) * (part + 1) / count;
      const steps = Math.max(1, Math.ceil((b - a) / 5));
      const ring = [
        [a, bottom],
        [a, top]
      ];
      for (let j = 1;j <= steps; j++)
        ring.push([a + (b - a) * j / steps, top]);
      ring.push([b, bottom]);
      for (let j = steps - 1;j >= 0; j--)
        ring.push([a + (b - a) * j / steps, bottom]);
      polygons.push([ring]);
    }
  }
  return {
    type: "Feature",
    properties: { id, name: id, level: "country" },
    geometry: { type: "MultiPolygon", coordinates: polygons }
  };
}
var datasets = new Map;
var CACHE_BYTES = 24 * 1024 * 1024;
var MAX_LOADS = 4;
var activeLoads = 0;
var loadQueue = [];
var keyOf = (r) => `${r.properties.level}:${r.properties.id}`;
async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`HTTP ${response.status} for ${url}`);
  return new Uint8Array(await response.arrayBuffer());
}
function index(ds, regions) {
  for (const r of regions)
    ds.byKey.set(keyOf(r), r);
}
function openDataset(url) {
  let known = datasets.get(url);
  if (!known) {
    known = (async () => {
      await load();
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`HTTP ${response.status} for ${url}`);
      const json = await response.json();
      const ds = {
        url,
        manifest: null,
        countries: [],
        continents: [],
        memoryStates: [],
        countryIds: new Set,
        proxies: new Map,
        byKey: new Map,
        chunks: new Map,
        loading: new Set,
        failed: new Map,
        bytes: 0,
        maps: new Set,
        names: null,
        parents: new Map
      };
      if (json?.type === "FeatureCollection") {
        const regions = json.features.map(rewind);
        ds.continents = regions.filter((r) => r.properties.level === "continent");
        ds.countries = regions.filter((r) => r.properties.level === "country");
        ds.memoryStates = regions.filter((r) => r.properties.level === "state");
        for (const s of ds.memoryStates)
          if (s.properties.parent)
            ds.parents.set(keyOf(s), s.properties.parent);
      } else {
        const manifest = json;
        if (manifest.version !== 1 || !manifest.initial || !manifest.details || !manifest.states)
          throw new Error(`${url} is no geo-map manifest (version 1)`);
        ds.manifest = manifest;
        const topology = decode(await fetchBytes(new URL(manifest.initial, url).href));
        ds.countries = features(topology, "countries");
        ds.continents = features(topology, "continents");
        for (const [id, b] of Object.entries(manifest.bounds ?? {}))
          ds.proxies.set(id, boundsProxy(id, b));
      }
      ds.countryIds = new Set(ds.countries.map((r) => r.properties.id));
      index(ds, ds.countries);
      index(ds, ds.continents);
      index(ds, ds.memoryStates);
      return ds;
    })();
    known.catch(() => {
      if (datasets.get(url) === known)
        datasets.delete(url);
    });
    datasets.set(url, known);
  }
  return known;
}
function chunk(ds, path, wanted) {
  wanted.add(path);
  const entry = ds.chunks.get(path);
  if (entry) {
    ds.chunks.delete(path);
    ds.chunks.set(path, entry);
    return entry.regions;
  }
  if (!ds.loading.has(path) && (ds.failed.get(path)?.until ?? 0) <= Date.now() && !loadQueue.some((q) => q.ds === ds && q.path === path))
    loadQueue.push({ ds, path });
  return;
}
function liveMaps(ds) {
  for (const el of ds.maps)
    if (!el.isConnected)
      ds.maps.delete(el);
  return [...ds.maps];
}
var wantedBySomeMap = (ds, path) => liveMaps(ds).some((el) => el._geo?.wanted.has(path));
function pump() {
  while (activeLoads < MAX_LOADS && loadQueue.length) {
    const next = loadQueue.pop();
    if (next.ds.chunks.has(next.path) || next.ds.loading.has(next.path) || !wantedBySomeMap(next.ds, next.path))
      continue;
    activeLoads++;
    next.ds.loading.add(next.path);
    loadChunk(next.ds, next.path);
  }
}
async function loadChunk(ds, path) {
  const url = new URL(path, ds.url).href;
  try {
    const bytes = await fetchBytes(url);
    const regions = features(decode(bytes), "regions");
    ds.chunks.set(path, { regions, bytes: bytes.length });
    ds.bytes += bytes.length;
    ds.failed.delete(path);
    index(ds, regions);
    for (const [key, entry] of ds.chunks) {
      if (ds.bytes <= CACHE_BYTES || ds.chunks.size <= 1)
        break;
      if (!wantedBySomeMap(ds, key)) {
        ds.chunks.delete(key);
        ds.bytes -= entry.bytes;
      }
    }
  } catch (err) {
    const attempts = (ds.failed.get(path)?.attempts ?? 0) + 1;
    ds.failed.set(path, { attempts, until: Date.now() + Math.min(60000, 1000 * 2 ** attempts) });
    for (const el of liveMaps(ds))
      reportError(el, err, url);
  } finally {
    ds.loading.delete(path);
    activeLoads--;
    for (const el of liveMaps(ds))
      requestRender(el);
    pump();
  }
}
var normalize = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
function searchEntries(ds) {
  if (!ds.names) {
    const resident = [...ds.continents, ...ds.countries, ...ds.memoryStates].map((r) => {
      const parent = r.properties.parent ? ds.byKey.get(`country:${r.properties.parent}`)?.properties.name : "";
      const label = parent ? `${r.properties.name}, ${parent}` : r.properties.name;
      return { key: keyOf(r), name: r.properties.name, level: r.properties.level, label, norm: normalize(label) };
    });
    const namesPath = ds.manifest ? ds.manifest.names ?? "names.json" : "";
    const pending = !namesPath ? Promise.resolve(resident) : fetch(new URL(namesPath, ds.url).href).then((r) => r.ok ? r.json() : { states: [] }).catch(() => ({ states: [] })).then((json) => {
      const states = (json.states ?? []).map(([id, name, parent]) => {
        ds.parents.set(`state:${id}`, parent);
        const country = ds.byKey.get(`country:${parent}`)?.properties.name ?? parent;
        const label = `${name}, ${country}`;
        return { key: `state:${id}`, name, level: "state", label, norm: normalize(label) };
      });
      return [...resident, ...states];
    });
    ds.names = pending;
  }
  return ds.names;
}
function rank(entries, query, limit) {
  const q = normalize(query);
  if (!q)
    return [];
  const order = ["continent", "country", "state"];
  const scored = [];
  for (const e of entries) {
    const name = normalize(e.name);
    const score = name === q || e.norm === q ? 0 : name.startsWith(q) ? 1 : name.split(/[\s-]+/).some((w) => w.startsWith(q)) ? 2 : e.norm.includes(q) ? 3 : -1;
    if (score >= 0)
      scored.push([score * 10 + order.indexOf(e.level), e]);
  }
  scored.sort((a, b) => a[0] - b[0] || a[1].label.localeCompare(b[1].label));
  return scored.slice(0, limit).map(([, e]) => ({ key: e.key, name: e.name, level: e.level, label: e.label }));
}
var PROJECTIONS = ["equalEarth", "equalArea", "mercator", "equirectangular", "orthographic"];
var LEVELS = ["auto", "continent", "country", "state"];
var PALETTES = ["atlas", "ocean", "forest", "sunset", "heat", "mono", "chart"];
var BORDERS = ["natural", "cased", "dashed", "none"];
var HOME = [0, 12];
function makeProjection(name, box, center, zoom, clip = true) {
  const { d3 } = ready();
  const make = {
    equalEarth: d3.geoEqualEarth,
    equalArea: d3.geoAzimuthalEqualArea,
    mercator: d3.geoMercator,
    equirectangular: d3.geoEquirectangular,
    orthographic: d3.geoOrthographic
  }[name];
  const p = make().precision(0.35);
  p.fitExtent([
    [box.x0 + 12, box.y0 + 12],
    [Math.max(box.x0 + 13, box.x1 - 12), Math.max(box.y0 + 13, box.y1 - 12)]
  ], { type: "Sphere" });
  const scale = p.scale();
  if (name === "orthographic")
    p.rotate([-center[0], -center[1], 0]).clipAngle(90);
  else if (name === "equalArea")
    p.rotate([-center[0], -center[1], 0]);
  else
    p.rotate([-center[0], 0, 0]).center([0, clamp(center[1], -85, 85)]);
  p.scale(scale * zoom).translate([(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2]);
  if (clip)
    p.clipExtent([
      [box.x0, box.y0],
      [box.x1, box.y1]
    ]);
  return p;
}
var VIEWS = {
  "continent:Europe": [-25, 34, 45, 71],
  "continent:North America": [-168, 7, -20, 72],
  "continent:Oceania": [110, -48, -175, 5]
};
function mainBody(region) {
  const { d3 } = ready();
  const g = region.geometry;
  if (g.type !== "MultiPolygon" || g.coordinates.length < 2)
    return region;
  const parts = g.coordinates.map((coordinates) => {
    const poly = { type: "Polygon", coordinates };
    return { coordinates, area: d3.geoArea(poly), centroid: d3.geoCentroid(poly) };
  });
  parts.sort((a, b) => b.area - a.area);
  const included = [parts[0]];
  let rest = parts.slice(1);
  for (let changed = true;changed; ) {
    changed = false;
    const area = included.reduce((s, p) => s + p.area, 0);
    const center = d3.geoCentroid({ type: "MultiPolygon", coordinates: included.map((p) => p.coordinates) });
    const radius = Math.sqrt(area / Math.PI);
    const next = rest.filter((p) => {
      const near = d3.geoDistance(center, p.centroid) <= 2 * (radius + Math.sqrt(p.area / Math.PI)) + 0.02;
      if (near) {
        included.push(p);
        changed = true;
      }
      return !near;
    });
    rest = next;
  }
  return { ...region, geometry: { type: "MultiPolygon", coordinates: included.map((p) => p.coordinates) } };
}
function frame(target, box, projection) {
  const { d3 } = ready();
  const center = d3.geoCentroid(target);
  const c = [wrapLon(center[0]), clamp(center[1], -85, 85)];
  const p = makeProjection(projection, box, c, 1, false);
  const b = d3.geoPath(p).bounds(target);
  const w = b[1][0] - b[0][0];
  const h = b[1][1] - b[0][1];
  const pad = 28;
  const zoom = clampZoom(Math.min((box.x1 - box.x0 - pad * 2) / Math.max(0.000000001, w), (box.y1 - box.y0 - pad * 2) / Math.max(0.000000001, h)));
  return { center: c, zoom: Number.isFinite(zoom) ? zoom : 1 };
}
var NS = "http://www.w3.org/2000/svg";
var nextId = 0;
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs))
    el.setAttribute(k, v);
  return el;
}
function setChildren(parent, nodes) {
  dfDollar(parent).empty().append(nodes);
}
function layerPath(layer, d) {
  let p = layer.firstElementChild;
  if (!p) {
    p = svgEl("path");
    dfDollar(layer).append(p);
  }
  if (p.getAttribute("d") !== d)
    p.setAttribute("d", d);
}
function hash(s) {
  let h = 2166136261;
  for (let i = 0;i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
var reducedMotion = () => typeof globalThis.matchMedia === "function" && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
function keyList(value) {
  const list = Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(/[\s,]+/) : [];
  return [...new Set(list.map((k) => k.trim()).filter(Boolean))];
}
function parseCenter(value) {
  if (!value)
    return null;
  const parts = value.split(",").map((v) => Number(v.trim()));
  if (parts.length !== 2 || !parts.every(Number.isFinite))
    return null;
  return [wrapLon(parts[0]), clamp(parts[1], -85, 85)];
}
function viewFromAttributes(el, camera) {
  const d = el.dataset;
  const pick = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
  return {
    projection: pick(d.projection, PROJECTIONS, "equalEarth"),
    level: pick(d.level, LEVELS, "country"),
    palette: pick(d.palette, PALETTES, "atlas"),
    border: pick(d.border, BORDERS, "natural"),
    graticule: d.graticule !== "false",
    callouts: d.callouts !== undefined && d.callouts !== "false",
    selected: keyList(d.selected ?? ""),
    focus: d.focus || null,
    center: camera.center,
    zoom: camera.zoom
  };
}
var stateNameOf = (v) => v.focus ? "focused" : v.selected.length ? "selected" : "default";
function configOf(geo) {
  const v = geo.view;
  const camera = geo.flight?.target ?? { center: v.center, zoom: v.zoom };
  return {
    projection: v.projection,
    level: v.level,
    palette: v.palette,
    border: v.border,
    graticule: v.graticule,
    callouts: v.callouts,
    selected: [...v.selected],
    focus: v.focus,
    center: [camera.center[0], camera.center[1]],
    zoom: camera.zoom
  };
}
function requestRender(el) {
  const geo = el._geo;
  if (!geo || geo.frameId)
    return;
  geo.frameId = requestAnimationFrame(() => {
    geo.frameId = 0;
    renderMap(el);
  });
}
function reportError(el, err, url) {
  const message = err instanceof Error ? err.message : String(err);
  el.dispatchEvent(new CustomEvent("geo-map-error", { detail: { message, url }, bubbles: true }));
}
function levelFor(view) {
  return view.level === "auto" ? view.zoom >= 8 ? "state" : view.zoom >= 2 ? "country" : "continent" : view.level;
}
function cellFocus(view) {
  if (!view.focus?.startsWith("s2:"))
    return null;
  try {
    return s2Token(view.focus.slice(3));
  } catch {
    return null;
  }
}
function cellsDrawn(geo) {
  const token = cellFocus(geo.view);
  return token ? s2Children(token).map(s2Polygon) : geo.cellRegions;
}
function selectRegions(geo, path) {
  const ds = geo.ds;
  const v = geo.view;
  const m = ds.manifest;
  const zoom = v.zoom;
  geo.wanted = new Set;
  const visible = (r) => !!path(zoom >= 3 ? ds.proxies.get(r.properties.id) ?? r : r);
  const statesOf = (id) => {
    if (!m)
      return ds.memoryStates.filter((s) => s.properties.parent === id);
    const p = zoom >= 24 ? m.stateDetails?.[id] ?? m.states[id] : m.states[id];
    return p ? chunk(ds, p, geo.wanted) : [];
  };
  const countryShape = (r) => {
    const p = zoom >= 3 && m ? m.details[r.properties.id] : undefined;
    return p && chunk(ds, p, geo.wanted) || [r];
  };
  const focus = v.focus ? ds.byKey.get(v.focus) : undefined;
  const focusKey = v.focus;
  if (focusKey && !focusKey.startsWith("s2:")) {
    const [level, ...rest] = focusKey.split(":");
    const id = rest.join(":");
    const countries = ds.countries.filter(visible);
    if (level === "continent") {
      const inside = countries.filter((c) => c.properties.continent === id);
      return {
        regions: inside.flatMap(countryShape),
        context: countries.filter((c) => c.properties.continent !== id).flatMap(countryShape)
      };
    }
    const countryId = level === "country" ? id : focus?.properties.parent ?? ds.parents.get(focusKey) ?? "";
    const states = countryId ? statesOf(countryId) : undefined;
    const home = ds.byKey.get(`country:${countryId}`);
    return {
      regions: states?.length ? states : home ? countryShape(home) : [],
      context: countries.filter((c) => c.properties.id !== countryId).flatMap(countryShape)
    };
  }
  const level = levelFor(v);
  if (level === "continent")
    return { regions: ds.continents, context: [] };
  const regions = [];
  for (const c of ds.countries) {
    if (!visible(c))
      continue;
    if (level === "state" && zoom >= 3) {
      const states = statesOf(c.properties.id);
      regions.push(...states && states.length ? states : countryShape(c));
    } else
      regions.push(...countryShape(c));
  }
  if (level === "state" && zoom >= 3 && m)
    for (const id of Object.keys(m.states)) {
      if (ds.countryIds.has(id))
        continue;
      const proxy = ds.proxies.get(id);
      if (proxy && path(proxy))
        regions.push(...statesOf(id) ?? []);
    }
  return { regions, context: [] };
}
function anchorOf(path, projection, region) {
  const { d3 } = ready();
  const g = region.geometry;
  let largest = g;
  if (g.type === "MultiPolygon") {
    let best = -1;
    for (const coordinates of g.coordinates) {
      const poly = { type: "Polygon", coordinates };
      const a = path.area(poly);
      if (a > best) {
        best = a;
        largest = poly;
      }
    }
  }
  const c = path.centroid(largest);
  if (!c.every(Number.isFinite))
    return null;
  const inside = (pt) => {
    const ll = projection.invert?.(pt);
    return !!ll && d3.geoContains(largest, ll);
  };
  if (inside(c))
    return c;
  const [[x0, y0], [x1, y1]] = path.bounds(largest);
  let best = null;
  let dist = Infinity;
  for (let i = 1;i < 8; i++)
    for (let j = 1;j < 8; j++) {
      const pt = [x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * j / 8];
      const d = Math.hypot(pt[0] - c[0], pt[1] - c[1]);
      if (d < dist && inside(pt)) {
        best = pt;
        dist = d;
      }
    }
  return best ?? c;
}
function cssPx(el, name, fallback) {
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n))
    return fallback;
  if (raw.endsWith("rem"))
    return n * parseFloat(getComputedStyle(document.documentElement).fontSize || "16");
  if (raw.endsWith("em"))
    return n * parseFloat(getComputedStyle(el).fontSize || "16");
  return n;
}
var gutterOf = (el) => cssPx(el, "--geo-map-callout-width", 160);
var measure;
function textWidth(text, font, size) {
  if (measure === undefined)
    measure = typeof OffscreenCanvas === "undefined" ? null : new OffscreenCanvas(1, 1).getContext("2d");
  if (!measure)
    return text.length * size * 0.58;
  measure.font = font;
  return measure.measureText(text).width;
}
function renderMap(el) {
  const geo = el._geo;
  if (!geo || geo.status !== "ready" || !geo.ds)
    return;
  const { d3 } = ready();
  const start = performance.now();
  const v = geo.view;
  const W = geo.width;
  const H = geo.height;
  const gutter = v.callouts ? Math.min(gutterOf(el), W / 3) : 0;
  geo.box = { x0: gutter, y0: 0, x1: W - gutter, y1: H };
  geo.svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  geo.projection = makeProjection(v.projection, geo.box, v.center, v.zoom);
  const path = d3.geoPath(geo.projection);
  const { regions, context } = selectRegions(geo, path);
  geo.ds.maps.add(el);
  pump();
  const L = geo.layers;
  layerPath(L.sphere, path({ type: "Sphere" }) ?? "");
  layerPath(L.graticule, v.graticule ? path(d3.geoGraticule10()) ?? "" : "");
  const selected = new Set(v.selected);
  const styles = geo.layersData.styles;
  geo.drawn = new Map;
  let visibleRegions = 0;
  let contextRegions = 0;
  let visibleCells = 0;
  const reconcile = (layer, items, kind) => {
    const existing = new Map;
    for (const child of [...layer.children])
      existing.set(child.getAttribute("data-key") ?? "", child);
    const keep = new Set;
    for (const region of items) {
      const key = kind === "cell" ? `s2:${region.properties.id}` : keyOf(region);
      if (keep.has(key))
        continue;
      const d = path(region);
      if (!d)
        continue;
      keep.add(key);
      if (kind === "context")
        contextRegions++;
      else {
        geo.drawn.set(key, region);
        if (kind === "cell")
          visibleCells++;
        else
          visibleRegions++;
      }
      let p = existing.get(key);
      if (!p) {
        p = svgEl("path", {
          "data-key": key,
          class: kind === "cell" ? "geo-map-region geo-map-cell" : "geo-map-region"
        });
        if (kind !== "context") {
          p.setAttribute("role", "button");
          p.setAttribute("tabindex", "-1");
          p.setAttribute("aria-label", `${region.properties.name} (${kind === "cell" ? "S2 cell" : region.properties.level})`);
        }
        layer.append(p);
      }
      if (p.getAttribute("d") !== d)
        p.setAttribute("d", d);
      if (kind !== "cell")
        p.setAttribute("data-tone", String(hash(region.properties.id) % 7));
      if (kind !== "context")
        p.setAttribute("aria-pressed", selected.has(key) ? "true" : "false");
      const style = styles[key];
      p.removeAttribute("style");
      if (style) {
        if (style.fill !== undefined)
          p.style.fill = style.fill;
        if (style.stroke !== undefined)
          p.style.stroke = style.stroke;
        if (style.strokeWidth !== undefined)
          p.style.strokeWidth = String(style.strokeWidth);
        if (style.opacity !== undefined)
          p.style.opacity = String(style.opacity);
        if (style.dash !== undefined)
          p.style.strokeDasharray = style.dash;
      }
    }
    for (const [key, p] of existing)
      if (!keep.has(key))
        p.remove();
  };
  reconcile(L.context, context, "context");
  reconcile(L.regions, regions, "region");
  reconcile(L.cells, cellsDrawn(geo), "cell");
  const stops = [...L.regions.children, ...L.cells.children];
  const stop = stops.find((p) => p.getAttribute("data-key") === geo.roving) ?? stops.find((p) => p.getAttribute("aria-pressed") === "true") ?? stops[0];
  geo.roving = stop?.getAttribute("data-key") ?? null;
  for (const p of stops) {
    const t = p === stop ? "0" : "-1";
    if (p.getAttribute("tabindex") !== t)
      p.setAttribute("tabindex", t);
  }
  setChildren(L.lines, geo.layersData.lines.flatMap((line) => {
    let coordinates = line.coordinates;
    if (!coordinates && line.from && line.to)
      coordinates = geodesicPath(line.from, line.to);
    const d = coordinates ? path({ type: "LineString", coordinates }) : null;
    if (!d)
      return [];
    const p = svgEl("path", { d, class: "geo-map-line", "data-line": line.id });
    if (line.color)
      p.style.stroke = line.color;
    if (line.width !== undefined)
      p.style.strokeWidth = String(line.width);
    if (line.dash)
      p.style.strokeDasharray = line.dash;
    return [p];
  }));
  let visibleMarkers = 0;
  setChildren(L.markers, geo.layersData.markers.flatMap((marker) => {
    const pos = resolvePosition(marker.position);
    if (!path({ type: "Point", coordinates: pos }))
      return [];
    const xy = geo.projection(pos);
    visibleMarkers++;
    const g = svgEl("g", {
      class: "geo-map-marker",
      transform: `translate(${xy[0].toFixed(2)},${xy[1].toFixed(2)})`,
      "data-marker": marker.id,
      "data-shape": marker.shape ?? "circle",
      role: "img",
      "aria-label": marker.label ?? marker.id
    });
    const shape = marker.shape === "diamond" ? svgEl("path", { d: "M0,-7L7,0L0,7L-7,0Z" }) : marker.shape === "square" ? svgEl("rect", { x: "-5", y: "-5", width: "10", height: "10", rx: "2" }) : marker.shape === "pin" ? svgEl("path", { d: "M0,1C-18,-14 -5,-22 0,-22C5,-22 18,-14 0,1Z" }) : svgEl("circle", { r: "5" });
    if (marker.color)
      shape.style.fill = marker.color;
    g.append(shape);
    if (marker.label) {
      const text = svgEl("text", { x: "10", y: marker.shape === "pin" ? "-12" : "-6" });
      text.textContent = marker.label;
      g.append(text);
    }
    return [g];
  }));
  geo.anchors = new Map;
  const callable = [...geo.drawn].filter(([k]) => !k.startsWith("s2:"));
  if (callable.length <= 400)
    for (const [key, region] of callable) {
      const a = anchorOf(path, geo.projection, region);
      if (a && a[0] >= geo.box.x0 && a[0] <= geo.box.x1 && a[1] >= 0 && a[1] <= H)
        geo.anchors.set(key, a);
    }
  let calloutCount = 0;
  if (v.callouts)
    calloutCount = drawCallouts(el, geo, W, H, gutter, path);
  else
    setChildren(L.callouts, []);
  drawLift(geo);
  geo.stats = {
    visibleRegions,
    contextRegions,
    visibleCells,
    visibleMarkers,
    callouts: calloutCount,
    renderMs: performance.now() - start,
    cachedChunks: geo.ds.chunks.size,
    loadedBytes: geo.ds.bytes,
    loading: [...geo.wanted].filter((p) => !geo.ds.chunks.has(p) && !geo.ds.failed.has(p)).length
  };
  if (el.hasAttribute("aria-busy") !== geo.stats.loading > 0)
    dfDollar(el).attr("aria-busy", geo.stats.loading ? "true" : null);
  if (geo.pendingFit && geo.ds.byKey.has(geo.pendingFit) && !geo.flight) {
    const key = geo.pendingFit;
    geo.pendingFit = null;
    flyTo(el, targetFor(geo, key), false);
  }
  writeOutputs(el);
  el.dispatchEvent(new CustomEvent("geo-map-render", { detail: { ...geo.stats } }));
}
function drawCallouts(el, geo, W, H, gutter, path) {
  const layer = geo.layers.callouts;
  const focus = geo.view.focus;
  const entries = [...geo.anchors].map(([key, anchor]) => {
    const region = geo.drawn.get(key);
    return { key, anchor, name: region.properties.name, area: path.area(region) };
  });
  const size = cssPx(el, "--geo-map-callout-size", 14);
  const row = Math.max(18, Math.round(size * 1.6));
  const font = `600 ${size}px ${getComputedStyle(el).fontFamily}`;
  const room = gutter - 12;
  const fit = (name) => {
    if (textWidth(name, font, size) <= room)
      return name;
    let n = name.length - 1;
    while (n > 1 && textWidth(`${name.slice(0, n)}…`, font, size) > room)
      n--;
    return `${name.slice(0, n).trimEnd()}…`;
  };
  const capacity = Math.max(1, Math.floor((H - 16) / row));
  const mid = (geo.box.x0 + geo.box.x1) / 2;
  const shown = entries.sort((a, b) => b.area - a.area).slice(0, capacity * 2);
  shown.sort((a, b) => a.anchor[0] - b.anchor[0]);
  const west = shown.filter((e) => e.anchor[0] < mid).length;
  const split = clamp(west, shown.length - capacity, capacity);
  const sides = { left: shown.slice(0, split), right: shown.slice(split) };
  const groups = [];
  for (const side of ["left", "right"]) {
    const list = sides[side].sort((a, b) => a.anchor[1] - b.anchor[1]);
    const top = Math.round(size) + row;
    const bottom = H - 8;
    const ys = list.map((e) => clamp(e.anchor[1], top, bottom));
    for (let i = 1;i < ys.length; i++)
      ys[i] = Math.max(ys[i], ys[i - 1] + row);
    if (ys.length && ys[ys.length - 1] > bottom) {
      ys[ys.length - 1] = bottom;
      for (let i = ys.length - 2;i >= 0; i--)
        ys[i] = Math.min(ys[i], ys[i + 1] - row);
    }
    list.forEach((e, i) => {
      const y = ys[i];
      const edge = side === "left" ? gutter : W - gutter;
      const outer = side === "left" ? 6 : W - 6;
      const g = svgEl("g", { class: "geo-map-callout", "data-key": e.key, "data-side": side });
      if (focus && e.key === focus)
        g.setAttribute("data-focus", "");
      g.append(svgEl("polyline", {
        class: "geo-map-callout-line",
        points: `${e.anchor[0].toFixed(1)},${e.anchor[1].toFixed(1)} ${edge.toFixed(1)},${y.toFixed(1)} ${outer.toFixed(1)},${y.toFixed(1)}`
      }), svgEl("circle", {
        class: "geo-map-callout-dot",
        cx: e.anchor[0].toFixed(1),
        cy: e.anchor[1].toFixed(1),
        r: "2.5"
      }));
      const text = svgEl("text", {
        class: "geo-map-callout-label",
        x: String(outer),
        y: (y - Math.max(4, Math.round(size * 0.3))).toFixed(1),
        "text-anchor": side === "left" ? "start" : "end"
      });
      text.textContent = fit(e.name);
      g.append(text);
      if (geo.view.selected.includes(e.key))
        g.setAttribute("data-selected", "");
      groups.push(g);
    });
  }
  setChildren(layer, groups);
  return groups.length;
}
function drawLift(geo) {
  const el = dfDollar(geo.svg).closest(".geo-map").get(0);
  const keys = new Set;
  if (el?.dataset.highlight === "lift")
    for (const k of geo.view.selected)
      keys.add(k);
  if (geo.hover)
    keys.add(geo.hover);
  const existing = new Map;
  for (const c of [...geo.layers.lift.children])
    existing.set(c.getAttribute("data-key") ?? "", c);
  const keep = [];
  for (const key of keys) {
    const source = dfDollar(geo.svg).find(`.geo-map-regions [data-key="${CSS.escape(key)}"], .geo-map-cells [data-key="${CSS.escape(key)}"]`).get(0) ?? null;
    if (!source)
      continue;
    let copy = existing.get(key);
    if (!copy)
      copy = svgEl("path", { "data-key": key, class: "geo-map-lifted" });
    copy.setAttribute("d", source.getAttribute("d") ?? "");
    for (const a of ["data-tone", "style", "aria-pressed"]) {
      const value = source.getAttribute(a);
      if (value === null)
        copy.removeAttribute(a);
      else
        copy.setAttribute(a, value);
    }
    if (key.startsWith("s2:"))
      copy.classList.add("geo-map-cell");
    keep.push(copy);
  }
  setChildren(geo.layers.lift, keep);
}
function targetFor(geo, key) {
  const box = geo.box.x1 > geo.box.x0 ? geo.box : { x0: 0, y0: 0, x1: geo.width, y1: geo.height };
  const bounds = settings.views[key] ?? VIEWS[key];
  if (bounds)
    return frame(boundsProxy(key, bounds), box, geo.view.projection);
  const cell = cellFocus({ ...geo.view, focus: key });
  if (cell)
    return frame(s2Polygon(cell), box, geo.view.projection);
  const region = geo.ds?.byKey.get(key);
  if (region)
    return frame(region.properties.level === "continent" ? region : mainBody(region), box, geo.view.projection);
  const parent = geo.ds?.parents.get(key);
  const home = parent ? geo.ds?.byKey.get(`country:${parent}`) : undefined;
  geo.pendingFit = key;
  return home ? frame(mainBody(home), box, geo.view.projection) : { center: geo.view.center, zoom: geo.view.zoom };
}
function flyTo(el, target, animate = true) {
  const geo = el._geo;
  const { d3 } = ready();
  cancelFlight(geo);
  const from = { center: geo.view.center, zoom: geo.view.zoom };
  const to = {
    center: [wrapLon(target.center[0]), clamp(target.center[1], -85, 85)],
    zoom: clampZoom(target.zoom)
  };
  if (!animate || reducedMotion() || !geo.width) {
    geo.view.center = to.center;
    geo.view.zoom = to.zoom;
    requestRender(el);
    announceView(el);
    return Promise.resolve();
  }
  const interpolate = d3.geoInterpolate(from.center, to.center);
  const distance = d3.geoDistance(from.center, to.center);
  const ms = clamp(420 + distance * 260 + Math.abs(Math.log2(to.zoom / from.zoom)) * 90, 450, 1400);
  let t0 = -1;
  return new Promise((resolve) => {
    const step = (now) => {
      if (t0 < 0)
        t0 = now;
      const t = Math.min(1, (now - t0) / ms);
      const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      const c = interpolate(e);
      geo.view.center = [wrapLon(c[0]), clamp(c[1], -85, 85)];
      geo.view.zoom = from.zoom * (to.zoom / from.zoom) ** e;
      renderMap(el);
      if (t < 1 && geo.flight) {
        geo.flight.id = requestAnimationFrame(step);
        return;
      }
      geo.view.center = to.center;
      geo.view.zoom = to.zoom;
      geo.flight = null;
      renderMap(el);
      announceView(el);
      resolve();
    };
    geo.flight = { id: requestAnimationFrame(step), target: to, done: resolve };
  });
}
function cancelFlight(geo) {
  if (!geo.flight)
    return;
  cancelAnimationFrame(geo.flight.id);
  const done = geo.flight.done;
  geo.flight = null;
  done();
}
function announceView(el) {
  const geo = el._geo;
  const v = geo.view;
  const key = `${v.center[0].toFixed(4)},${v.center[1].toFixed(4)},${v.zoom.toFixed(4)}`;
  if (key === geo.lastView)
    return;
  geo.lastView = key;
  el.dispatchEvent(new CustomEvent("geo-map-view", {
    detail: { center: [v.center[0], v.center[1]], zoom: v.zoom, level: levelFor(v) },
    bubbles: true
  }));
}
function reflect(el, name, value, fallback) {
  const current = el.getAttribute(name);
  if ((current ?? fallback) === (value ?? fallback))
    return;
  dfDollar(el).attr(name, value === fallback && current === null ? null : value);
}
function applyMarkup(el, name, config) {
  if (config.projection !== undefined)
    reflect(el, "data-projection", config.projection, "equalEarth");
  if (config.level !== undefined)
    reflect(el, "data-level", config.level, "country");
  if (config.palette !== undefined)
    reflect(el, "data-palette", config.palette, "atlas");
  if (config.border !== undefined)
    reflect(el, "data-border", config.border, "natural");
  if (config.graticule !== undefined)
    reflect(el, "data-graticule", config.graticule ? null : "false", null);
  if (config.callouts !== undefined)
    reflect(el, "data-callouts", config.callouts ? "true" : null, null);
  const selected = name === "default" ? [] : keyList(config.selected ?? "");
  const now = keyList(el.getAttribute("data-selected") ?? "");
  if (selected.join(" ") !== now.join(" "))
    dfDollar(el).attr("data-selected", selected.length ? selected.join(" ") : null);
  const focus = name === "focused" ? config.focus || null : null;
  if ((el.getAttribute("data-focus") || null) !== focus)
    dfDollar(el).attr("data-focus", focus);
}
function checkConfig(config) {
  if (config.projection !== undefined && !PROJECTIONS.includes(config.projection))
    throw new RangeError(`geo-map: unknown projection "${config.projection}" (${PROJECTIONS.join(", ")})`);
  if (config.level !== undefined && !LEVELS.includes(config.level))
    throw new RangeError(`geo-map: unknown level "${config.level}" (${LEVELS.join(", ")})`);
  if (config.palette !== undefined && !PALETTES.includes(config.palette))
    throw new RangeError(`geo-map: unknown palette "${config.palette}" (${PALETTES.join(", ")})`);
  if (config.border !== undefined && !BORDERS.includes(config.border))
    throw new RangeError(`geo-map: unknown border "${config.border}" (${BORDERS.join(", ")})`);
  if (config.center !== undefined)
    assertLonLat(config.center);
  if (config.zoom !== undefined && (!Number.isFinite(Number(config.zoom)) || Number(config.zoom) < 1 || Number(config.zoom) > 1024))
    throw new RangeError("geo-map: zoom is 1 to 1024");
}
function triggerStateChange(el, name, config, incoming) {
  const geo = el._geo;
  checkConfig(config);
  if (incoming.focus?.startsWith("s2:"))
    s2Token(incoming.focus.slice(3));
  if (name === "focused" && !config.focus && geo.authored.focus)
    config = { ...config, focus: geo.authored.focus };
  if (name === "selected" && !keyList(config.selected ?? "").length)
    config = { ...config, selected: geo.authored.selected };
  let landed = name;
  if (name === "focused" && !config.focus)
    landed = keyList(config.selected ?? "").length ? "selected" : "default";
  if (name === "selected" && !keyList(config.selected ?? "").length)
    landed = "default";
  applyMarkup(el, landed, config);
  if (landed !== name)
    el.dataset.stateName = landed;
  return geo.ready.then(() => {
    const before = geo.view.focus;
    syncView(el, false);
    if (geo.status !== "ready")
      return;
    const camera = incoming.center !== undefined || incoming.zoom !== undefined;
    if (camera)
      return flyTo(el, { center: incoming.center ?? geo.view.center, zoom: Number(incoming.zoom ?? geo.view.zoom) }, false);
    if (geo.view.focus && geo.view.focus !== before)
      return flyTo(el, targetFor(geo, geo.view.focus));
    requestRender(el);
    return;
  });
}
function syncView(el, fly) {
  const geo = el._geo;
  if (!geo)
    return;
  const previous = geo.view;
  const next = viewFromAttributes(el, { center: previous.center, zoom: previous.zoom });
  const changed = JSON.stringify({ ...next, center: 0, zoom: 0 }) !== JSON.stringify({ ...previous, center: 0, zoom: 0 });
  if (!changed)
    return;
  geo.view = next;
  if (next.selected.join(" ") !== previous.selected.join(" "))
    announceSelection(el);
  if (next.focus !== previous.focus) {
    announceFocus(el);
    if (fly && next.focus && geo.status === "ready")
      flyTo(el, targetFor(geo, next.focus));
  }
  requestRender(el);
}
function nameOfKey(geo, key) {
  return geo.ds?.byKey.get(key)?.properties.name ?? (key.startsWith("s2:") ? `S2 ${key.slice(3)}` : key);
}
function announceSelection(el) {
  const geo = el._geo;
  const keys = [...geo.view.selected];
  el.dispatchEvent(new CustomEvent("geo-map-select", {
    detail: { keys, names: keys.map((k) => nameOfKey(geo, k)) },
    bubbles: true
  }));
}
function announceFocus(el) {
  const geo = el._geo;
  const key = geo.view.focus;
  el.dispatchEvent(new CustomEvent("geo-map-focus", {
    detail: { key, name: key ? nameOfKey(geo, key) : null },
    bubbles: true
  }));
}
var geoMapApi = componentState({
  component: "geo-map",
  states: geoMapStates,
  mergeConfig: true,
  apply: (el, state, _previous, incoming) => triggerStateChange(el, state.name, state.config, incoming),
  read: (el) => {
    const geo = el._geo;
    if (!geo)
      return { name: el.dataset.stateName || "default", config: {} };
    const view = viewFromAttributes(el, { center: geo.view.center, zoom: geo.view.zoom });
    const config = configOf({ ...geo, view: { ...view, center: geo.view.center, zoom: geo.view.zoom } });
    return { name: stateNameOf(view), config };
  },
  markup: (el, state) => applyMarkup(el, state.name, state.config)
});
function userChange(el, patch) {
  const geo = el._geo;
  const config = { ...configOf(geo), ...patch };
  const name = stateNameOf({ focus: config.focus ?? null, selected: keyList(config.selected) });
  if (patch.focus !== undefined && patch.focus !== geo.view.focus) {
    act(el, Promise.resolve(geoMapApi.setState(el, name, { selected: config.selected, focus: config.focus ?? null })));
    return;
  }
  applyMarkup(el, name, config);
  syncView(el, true);
  geoMapApi.commit(el, name, configOf(geo));
}
function pixelOf(geo, e) {
  const r = geo.svg.getBoundingClientRect();
  return [(e.clientX - r.left) * geo.width / (r.width || 1), (e.clientY - r.top) * geo.height / (r.height || 1)];
}
function unprojectVisible(projection, pixel) {
  const { d3 } = ready();
  const p = projection.invert?.(pixel);
  if (!p || !p.every(Number.isFinite) || Math.abs(p[1]) > 90)
    return null;
  if (!d3.geoPath(projection)({ type: "Point", coordinates: p }))
    return null;
  const back = projection(p);
  if (!back || Math.hypot(back[0] - pixel[0], back[1] - pixel[1]) > 0.1)
    return null;
  return [p[0], p[1]];
}
function pan(el, dx, dy) {
  const geo = el._geo;
  if (!geo.projection)
    return;
  cancelFlight(geo);
  const delta = RAD / geo.projection.scale();
  geo.view.center = [wrapLon(geo.view.center[0] - dx * delta), clamp(geo.view.center[1] + dy * delta, -85, 85)];
  requestRender(el);
}
function zoomAt(el, factor, pixel) {
  const geo = el._geo;
  if (!geo.projection)
    return;
  cancelFlight(geo);
  const zoom = clampZoom(geo.view.zoom * factor);
  let center = [...geo.view.center];
  const before = pixel ? unprojectVisible(geo.projection, pixel) : null;
  for (let i = 0;pixel && before && i < 4; i++) {
    const after = unprojectVisible(makeProjection(geo.view.projection, geo.box, center, zoom), pixel);
    if (!after)
      break;
    const dLon = wrapLon(before[0] - after[0]);
    const dLat = before[1] - after[1];
    center = [wrapLon(center[0] + dLon), clamp(center[1] + dLat, -85, 85)];
    if (Math.abs(dLon) + Math.abs(dLat) < 0.000001)
      break;
  }
  geo.view.center = center;
  geo.view.zoom = zoom;
  requestRender(el);
}
function settleSoon(el) {
  const geo = el._geo;
  clearTimeout(geo.restTimer);
  geo.restTimer = setTimeout(() => announceView(el), 160);
}
var keyAt = (target) => {
  if (!(target instanceof Element))
    return null;
  const hit = dfDollar(target).closest("[data-key]").get(0);
  return hit && !dfDollar(hit).closest(".geo-map-context").get(0) ? hit.getAttribute("data-key") : null;
};
function pick(el, key, additive) {
  const geo = el._geo;
  const mode = el.dataset.select ?? "single";
  if (mode === "none")
    return;
  const now = geo.view.selected;
  let next;
  if (mode === "multiple" || additive)
    next = now.includes(key) ? now.filter((k) => k !== key) : [...now, key];
  else
    next = now.length === 1 && now[0] === key ? [] : [key];
  geo.roving = key;
  userChange(el, { selected: next });
}
function showTooltip(geo, key, pixel) {
  const t = geo.tooltip;
  if (!key) {
    t.hidden = true;
    return;
  }
  const region = geo.drawn.get(key);
  if (!region)
    return;
  const parent = region.properties.parent ? geo.ds?.byKey.get(`country:${region.properties.parent}`)?.properties.name : "";
  dfDollar(t).text(parent ? `${region.properties.name}, ${parent}` : region.properties.name);
  t.hidden = false;
  if (pixel) {
    t.style.left = `${Math.min(pixel[0] + 14, geo.width - 8)}px`;
    t.style.top = `${pixel[1] + 12}px`;
  }
}
function setHover(el, key) {
  const geo = el._geo;
  if (geo.hover === key)
    return;
  geo.hover = key;
  for (const c of dfDollar(geo.svg).find(".geo-map-callout").toArray())
    c.toggleAttribute("data-hover", c.getAttribute("data-key") === key);
  drawLift(geo);
  writeOutputs(el);
}
function moveRoving(el, key, dir) {
  const geo = el._geo;
  const from = geo.anchors.get(key);
  if (!from)
    return;
  let best = null;
  let score = Infinity;
  for (const [k, a] of geo.anchors) {
    if (k === key)
      continue;
    const dx = a[0] - from[0];
    const dy = a[1] - from[1];
    const along = dx * dir[0] + dy * dir[1];
    if (along <= 0)
      continue;
    const across = Math.abs(dx * dir[1] - dy * dir[0]);
    const s = along + across * 2;
    if (s < score) {
      score = s;
      best = k;
    }
  }
  if (!best)
    return;
  geo.roving = best;
  renderMap(el);
  const target = dfDollar(geo.svg).find(`[data-key="${CSS.escape(best)}"][role="button"]`).get(0);
  target?.focus();
}
function bindInteractions(el) {
  const geo = el._geo;
  const svg = geo.svg;
  const signal = geo.abort.signal;
  svg.addEventListener("pointerdown", (e) => {
    if (e.button !== 0)
      return;
    geo.pointers.set(e.pointerId, pixelOf(geo, e));
    geo.moved = false;
  }, { signal });
  svg.addEventListener("pointermove", (e) => {
    const next = pixelOf(geo, e);
    const previous = geo.pointers.get(e.pointerId);
    if (!previous) {
      const key = keyAt(e.target);
      setHover(el, key);
      showTooltip(geo, key, next);
      return;
    }
    if (Math.hypot(next[0] - previous[0], next[1] - previous[1]) < 0.5)
      return;
    if (!svg.hasPointerCapture(e.pointerId))
      svg.setPointerCapture(e.pointerId);
    const others = [...geo.pointers.entries()].filter(([id]) => id !== e.pointerId);
    if (others.length) {
      const other = others[0][1];
      const a = Math.hypot(previous[0] - other[0], previous[1] - other[1]);
      const b = Math.hypot(next[0] - other[0], next[1] - other[1]);
      if (a > 2 && b > 2)
        zoomAt(el, b / a);
    } else
      pan(el, next[0] - previous[0], next[1] - previous[1]);
    if (Math.hypot(next[0] - previous[0], next[1] - previous[1]) > 1)
      geo.moved = true;
    geo.pointers.set(e.pointerId, next);
    showTooltip(geo, null);
    settleSoon(el);
  }, { signal });
  const release = (e) => {
    geo.pointers.delete(e.pointerId);
  };
  svg.addEventListener("pointerup", release, { signal });
  svg.addEventListener("pointercancel", release, { signal });
  svg.addEventListener("lostpointercapture", release, { signal });
  svg.addEventListener("pointerleave", () => {
    setHover(el, null);
    showTooltip(geo, null);
  }, { signal });
  svg.addEventListener("click", (e) => {
    if (geo.moved)
      return;
    const key = keyAt(e.target);
    if (key)
      pick(el, key, e.shiftKey || e.metaKey || e.ctrlKey);
  }, { signal });
  svg.addEventListener("dblclick", (e) => {
    e.preventDefault();
    const key = keyAt(e.target);
    const drill = key && el.dataset.drill !== "none" && !key.startsWith("state:") && !(key.startsWith("s2:") && s2Level(key.slice(3)) === 30);
    if (drill)
      userChange(el, { focus: key, selected: [] });
    else
      zoomAt(el, 2, pixelOf(geo, e));
    settleSoon(el);
  }, { signal });
  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? geo.height : 1);
    zoomAt(el, Math.exp(-delta * 0.0015), pixelOf(geo, e));
    settleSoon(el);
  }, { signal, passive: false });
  svg.addEventListener("keydown", (e) => {
    const key = keyAt(e.target);
    const arrows = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1]
    };
    if (key && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      pick(el, key, e.shiftKey);
      return;
    }
    if (key && arrows[e.key] && !e.shiftKey) {
      e.preventDefault();
      moveRoving(el, key, arrows[e.key]);
      return;
    }
    if (e.key === "Escape") {
      if (geo.view.selected.length)
        userChange(el, { selected: [] });
      else if (geo.view.focus)
        act(el, focusUp(el));
      return;
    }
    if (!["+", "=", "-", "Home", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key))
      return;
    e.preventDefault();
    if (e.key === "+" || e.key === "=")
      zoomAt(el, 1.5);
    else if (e.key === "-")
      zoomAt(el, 1 / 1.5);
    else if (e.key === "Home")
      act(el, reset(el));
    else {
      const [x, y] = arrows[e.key];
      pan(el, -x * 50, -y * 50);
    }
    settleSoon(el);
  }, { signal });
  svg.addEventListener("focusin", (e) => {
    const key = keyAt(e.target);
    if (key) {
      geo.roving = key;
      setHover(el, key);
    }
  }, { signal });
  svg.addEventListener("focusout", () => setHover(el, null), { signal });
}
function writeOutputs(el) {
  if (!el.id)
    return;
  const geo = el._geo;
  for (const out of dfDollar(`output[data-geo-for="${CSS.escape(el.id)}"]`).toArray()) {
    const kind = out.dataset.geoOutput ?? "selection";
    const v = geo.view;
    const cell = cellFocus(v);
    const text = kind === "focus" ? v.focus ? nameOfKey(geo, v.focus) : "World" : kind === "zoom" ? `${v.zoom < 10 ? v.zoom.toFixed(1) : Math.round(v.zoom)}x` : kind === "level" ? v.focus ? v.focus.startsWith("s2:") ? cell ? `S2 level ${s2Level(cell) + 1}` : "" : v.focus.startsWith("continent:") ? "country" : "state" : levelFor(v) : kind === "hover" ? geo.hover ? nameOfKey(geo, geo.hover) : "" : kind === "center" ? `${v.center[1].toFixed(2)}°, ${v.center[0].toFixed(2)}°` : kind === "regions" ? String(geo.stats.visibleRegions) : v.selected.map((k) => nameOfKey(geo, k)).join(", ");
    if (out.textContent !== text)
      dfDollar(out).text(text);
  }
}
var mapFor = (control) => {
  const id = control.getAttribute("data-geo-for") ?? "";
  const el = id ? dfDollar(`#${CSS.escape(id)}`).get(0) : null;
  return el?.matches(".geo-map") && el._geo ? el : null;
};
async function suggest(input, el) {
  const hits = await search(el, input.value, 12);
  let list = input.list ?? null;
  if (!list) {
    list = document.createElement("datalist");
    list.id = `${el.id}-geo-names-${nextId++}`;
    list.setAttribute("data-ce-chrome", "");
    dfDollar(input).after(list);
    input.setAttribute("list", list.id);
  }
  setChildren(list, hits.map((h) => {
    const o = document.createElement("option");
    o.value = h.label;
    return o;
  }));
  return hits;
}
async function runSearch(input, el) {
  const value = input.value.trim();
  if (!value)
    return;
  const hits = await search(el, value, 12);
  const hit = hits.find((h) => normalize(h.label) === normalize(value)) ?? hits[0];
  input.setCustomValidity(hit ? "" : `No region named "${value}"`);
  input.toggleAttribute("aria-invalid", !hit);
  if (!hit) {
    input.reportValidity();
    return;
  }
  await focusRegion(el, hit.key);
}
function act(el, action) {
  action.catch((err) => reportError(el, err, ""));
}
function bindControls() {
  if (document.__geoMapInit)
    return;
  document.__geoMapInit = true;
  dfDollar(document).on("click", (e) => {
    const control = e.target instanceof Element ? dfDollar(e.target).closest("[data-geo-for][data-geo-action]").get(0) : undefined;
    if (!control || control.tagName === "INPUT")
      return;
    const el = mapFor(control);
    if (!el)
      return;
    const value = control.dataset.value ?? "";
    const geo = el._geo;
    switch (control.dataset.geoAction) {
      case "zoom-in":
        zoomAt(el, 1.6);
        settleSoon(el);
        break;
      case "zoom-out":
        zoomAt(el, 1 / 1.6);
        settleSoon(el);
        break;
      case "reset":
        act(el, reset(el));
        break;
      case "up":
        act(el, focusUp(el));
        break;
      case "focus":
        act(el, focusRegion(el, value || geo.view.selected[0] || null));
        break;
      case "select":
        act(el, select(el, keyList(value)));
        break;
      case "clear":
        act(el, select(el, []));
        break;
    }
  });
  dfDollar(document).on("change", (e) => {
    const control = e.target instanceof HTMLElement ? e.target : null;
    if (!control?.matches("[data-geo-for]"))
      return;
    const el = mapFor(control);
    if (!el)
      return;
    if (control.matches('input[data-geo-action="search"]')) {
      act(el, runSearch(control, el));
      return;
    }
    const param = control.dataset.geoParam;
    if (!param)
      return;
    const value = control instanceof HTMLInputElement && control.type === "checkbox" ? control.checked : control.value;
    const current = el.api.getState();
    act(el, Promise.resolve(geoMapApi.setState(el, current.name, { [param]: value })));
  });
  dfDollar(document).on("input", (e) => {
    const input = e.target instanceof HTMLInputElement ? e.target : null;
    if (!input?.matches('[data-geo-for][data-geo-action="search"]'))
      return;
    const el = mapFor(input);
    if (!el)
      return;
    input.setCustomValidity("");
    input.removeAttribute("aria-invalid");
    act(el, suggest(input, el));
  });
  dfDollar(document).on("keydown", (e) => {
    const ev = e;
    const input = ev.target instanceof HTMLInputElement ? ev.target : null;
    if (ev.key !== "Enter" || !input?.matches('[data-geo-for][data-geo-action="search"]'))
      return;
    const el = mapFor(input);
    if (!el)
      return;
    ev.preventDefault();
    act(el, runSearch(input, el));
  });
}
var mapOf = (el) => {
  const node = typeof el === "string" ? dfDollar(el).get(0) : el;
  if (!node?.matches?.(".geo-map") || !node._geo)
    throw new Error("not an initialized .geo-map");
  return node;
};
function select(el, keys) {
  const node = mapOf(el);
  const geo = node._geo;
  const name = geo.view.focus ? "focused" : keys.length ? "selected" : "default";
  return Promise.resolve(geoMapApi.setState(node, name, { selected: keys }));
}
async function focusRegion(el, region) {
  const node = mapOf(el);
  const geo = node._geo;
  await geo.ready;
  let key = region;
  if (key?.startsWith("s2:"))
    key = `s2:${s2Token(key.slice(3))}`;
  else if (key && !/^(continent|country|state):/.test(key))
    key = (await search(node, key, 1))[0]?.key ?? null;
  if (region && !key)
    throw new Error(`geo-map: no region named "${region}"`);
  if (key?.startsWith("state:") && geo.ds && !geo.ds.parents.has(key) && !geo.ds.byKey.has(key))
    await searchEntries(geo.ds);
  await geoMapApi.setState(node, key ? "focused" : "default", { focus: key, selected: [] });
}
async function focusUp(el) {
  const node = mapOf(el);
  const geo = node._geo;
  const key = geo.view.focus;
  if (!key)
    return reset(node);
  const cell = cellFocus(geo.view);
  if (cell)
    return s2Level(cell) ? focusRegion(node, `s2:${s2Parent(cell)}`) : reset(node);
  const region = geo.ds?.byKey.get(key);
  const parent = key.startsWith("state:") ? `country:${region?.properties.parent ?? geo.ds?.parents.get(key) ?? ""}` : key.startsWith("country:") && region?.properties.continent ? `continent:${region.properties.continent}` : null;
  if (parent && geo.ds?.byKey.has(parent))
    return focusRegion(node, parent);
  return reset(node);
}
async function reset(el) {
  const node = mapOf(el);
  const geo = node._geo;
  await geo.ready;
  await geoMapApi.setState(node, "default", {});
  if (geo.status === "ready")
    await flyTo(node, geo.home);
}
async function search(el, query, limit = 10) {
  const node = mapOf(el);
  const geo = node._geo;
  await geo.ready;
  if (!geo.ds)
    return [];
  return rank(await searchEntries(geo.ds), query, limit);
}
function zoomBy(el, factor) {
  if (!Number.isFinite(factor) || factor <= 0)
    throw new RangeError("a positive zoom factor");
  const node = mapOf(el);
  zoomAt(node, factor);
  settleSoon(node);
}
async function setView(el, center, zoom, animate = true) {
  const node = mapOf(el);
  const geo = node._geo;
  assertLonLat(center);
  await geo.ready;
  await flyTo(node, { center, zoom: zoom ?? geo.view.zoom }, animate);
}
function setLayers(el, layers) {
  const node = mapOf(el);
  const geo = node._geo;
  const next = { ...geo.layersData };
  if (layers.markers) {
    for (const m of layers.markers)
      resolvePosition(m.position);
    next.markers = layers.markers.map((m) => ({ ...m }));
  }
  if (layers.lines) {
    for (const l of layers.lines) {
      if (l.coordinates) {
        if (l.coordinates.length < 2)
          throw new RangeError(`line ${l.id}: two positions at least`);
        l.coordinates.forEach(assertLonLat);
      } else if (!l.from || !l.to)
        throw new RangeError(`line ${l.id}: coordinates, or from and to`);
    }
    next.lines = layers.lines.map((l) => ({ ...l }));
  }
  if (layers.cells) {
    next.cells = layers.cells.map((c) => s2Token(c));
    geo.cellRegions = next.cells.map(s2Polygon);
  }
  if (layers.styles)
    next.styles = { ...layers.styles };
  geo.layersData = next;
  requestRender(node);
}
function visible(el) {
  const geo = mapOf(el)._geo;
  return [...geo.drawn].map(([key, r]) => ({
    key,
    name: r.properties.name,
    level: r.properties.level,
    anchor: geo.anchors.get(key) ?? null
  }));
}
function region(el, key) {
  return mapOf(el)._geo.ds?.byKey.get(key) ?? null;
}
function project(el, point) {
  const geo = mapOf(el)._geo;
  assertLonLat(point);
  if (!geo.projection || !ready().d3.geoPath(geo.projection)({ type: "Point", coordinates: point }))
    return null;
  return geo.projection(point);
}
function unproject(el, pixel) {
  const geo = mapOf(el)._geo;
  return geo.projection ? unprojectVisible(geo.projection, pixel) : null;
}
function stats(el) {
  return { ...mapOf(el)._geo.stats };
}
function hatch(el) {
  return mapOf(el)._geo.hatch;
}
df$.geoMapApi = geoMapApi;
df$.geoMapStates = geoMapStates;
df$.geoMap = {
  select,
  focus: focusRegion,
  up: focusUp,
  reset,
  search,
  zoomBy,
  setView,
  setLayers,
  visible,
  region,
  project,
  unproject,
  stats,
  hatch
};
df$.geo = {
  load,
  configure,
  urls: GEO_VENDOR_URLS,
  WGS84,
  inverse,
  direct,
  path: geodesicPath,
  length: polylineLength,
  s2Cell,
  s2Id,
  s2Token,
  s2Level,
  s2Center,
  s2Vertices,
  s2Polygon,
  s2Neighbors,
  s2Children,
  s2Parent,
  resolvePosition,
  inBounds,
  mortonEncode,
  mortonDecode,
  mortonKey,
  mortonIndex,
  routeGraph,
  positionAlongRoute,
  decode,
  features,
  rewind
};
function layersFrom(el) {
  const script = dfDollar(el).children("script.geo-map-layers").get(0);
  const empty = { markers: [], lines: [], cells: [], styles: {} };
  if (!script)
    return empty;
  const json = JSON.parse(script.textContent || "{}");
  return { ...empty, ...json };
}
function dataUrl(el) {
  const raw = el.dataset.src || metaContent("geo-map-data") || settings.data || releaseData();
  return new URL(raw, document.baseURI).href;
}
function mount(el) {
  const camera = {
    center: parseCenter(el.dataset.center) ?? HOME,
    zoom: clampZoom(Number(el.dataset.zoom) || 1)
  };
  const svg = svgEl("svg", {
    "data-ce-chrome": "",
    class: "geo-map-svg",
    role: "group",
    tabindex: "0",
    "aria-roledescription": "map",
    "aria-label": el.getAttribute("aria-label") || "Interactive map. Arrow keys pan, plus and minus zoom, Home resets."
  });
  const pattern = svgEl("pattern", {
    id: `geo-map-hatch-${nextId++}`,
    width: "8",
    height: "8",
    patternUnits: "userSpaceOnUse"
  });
  pattern.append(svgEl("path", { d: "M-2,2L2,-2M0,8L8,0M6,10L10,6", class: "geo-map-hatch" }));
  const defs = svgEl("defs");
  defs.append(pattern);
  svg.append(defs);
  const layers = {};
  for (const name of ["sphere", "graticule", "context", "regions", "cells", "lines", "lift", "markers", "callouts"]) {
    layers[name] = svgEl("g", { class: `geo-map-${name}` });
    if (["sphere", "graticule", "context", "lift", "lines"].includes(name))
      layers[name].setAttribute("aria-hidden", "true");
    svg.append(layers[name]);
  }
  const tooltip = document.createElement("output");
  tooltip.className = "geo-map-tooltip";
  tooltip.setAttribute("data-ce-chrome", "");
  tooltip.hidden = true;
  tooltip.setAttribute("aria-hidden", "true");
  let layersData;
  let layerError = "";
  try {
    layersData = layersFrom(el);
  } catch (err) {
    layersData = { markers: [], lines: [], cells: [], styles: {} };
    layerError = `script.geo-map-layers is no valid JSON: ${err instanceof Error ? err.message : err}`;
  }
  const geo = {
    view: viewFromAttributes(el, camera),
    ds: null,
    status: "loading",
    ready: Promise.resolve(),
    svg,
    layers,
    tooltip,
    hatch: `url(#${pattern.id})`,
    width: el.clientWidth || 800,
    height: el.clientHeight || 480,
    projection: null,
    box: { x0: 0, y0: 0, x1: 0, y1: 0 },
    frameId: 0,
    flight: null,
    pendingFit: null,
    pointers: new Map,
    moved: false,
    drawn: new Map,
    anchors: new Map,
    hover: null,
    roving: null,
    layersData,
    cellRegions: [],
    wanted: new Set,
    stats: {
      visibleRegions: 0,
      contextRegions: 0,
      visibleCells: 0,
      visibleMarkers: 0,
      callouts: 0,
      renderMs: 0,
      cachedChunks: 0,
      loadedBytes: 0,
      loading: 0
    },
    abort: new AbortController,
    resize: new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      if (r.width > 0 && r.height > 0 && (r.width !== geo.width || r.height !== geo.height)) {
        geo.width = r.width;
        geo.height = r.height;
        requestRender(el);
      }
    }),
    attrs: new MutationObserver(() => syncView(el, true)),
    lastView: "",
    home: camera,
    authored: { focus: el.dataset.focus || null, selected: keyList(el.dataset.selected ?? "") },
    restTimer: 0
  };
  el._geo = geo;
  dfDollar(el).append(svg).append(tooltip);
  el.dataset.geoStatus = "loading";
  dfDollar(el).attr("aria-busy", "true");
  geo.ready = (async () => {
    try {
      await load();
      try {
        layersData.cells = layersData.cells.map((c) => s2Token(c));
        geo.cellRegions = layersData.cells.map(s2Polygon);
        for (const m of layersData.markers)
          resolvePosition(m.position);
      } catch (err) {
        layersData.cells = [];
        layersData.markers = layersData.markers.filter((m) => {
          try {
            resolvePosition(m.position);
            return true;
          } catch {
            return false;
          }
        });
        layerError ||= `script.geo-map-layers: ${err instanceof Error ? err.message : err}`;
      }
      geo.ds = await openDataset(dataUrl(el));
      geo.ds.maps.add(el);
      geo.status = "ready";
      el.dataset.geoStatus = "ready";
      if (geo.view.focus && !el.dataset.center && !el.dataset.zoom) {
        geo.box = { x0: 0, y0: 0, x1: geo.width, y1: geo.height };
        const target = targetFor(geo, geo.view.focus);
        geo.view.center = target.center;
        geo.view.zoom = target.zoom;
      }
      renderMap(el);
      announceView(el);
      if (layerError) {
        dfDollar(el).append(dfDollar('<output class="geo-map-error" role="alert" data-ce-chrome></output>').text(layerError));
        reportError(el, new Error(layerError), "");
      }
    } catch (err) {
      geo.status = "error";
      el.dataset.geoStatus = "error";
      dfDollar(el).attr("aria-busy", null);
      const message = err instanceof Error ? err.message : String(err);
      dfDollar(el).children(".geo-map-error").remove();
      dfDollar(el).append(dfDollar('<output class="geo-map-error" role="alert" data-ce-chrome></output>').text(`The map could not be loaded. ${message}`));
      reportError(el, err, "");
    }
  })();
  geo.resize.observe(el);
  geo.attrs.observe(el, {
    attributes: true,
    attributeFilter: [
      "data-projection",
      "data-level",
      "data-palette",
      "data-border",
      "data-graticule",
      "data-callouts",
      "data-selected",
      "data-focus",
      "data-highlight"
    ]
  });
  bindInteractions(el);
}
function init() {
  dfDollar(".geo-map:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    bindControls();
    mount(el);
    const geo = el._geo;
    const name = stateNameOf(geo.view);
    bindComponent(el, geoMapApi, { name, config: configOf(geo) });
    geoMapApi.setState(el, name, {});
  });
}
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

//# debugId=AAAD9B4A4C946AF364756E2164756E21
//# sourceMappingURL=geo.js.map
