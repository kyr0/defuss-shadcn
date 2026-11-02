import { DSON } from 'defuss-dson';
import type { Topology, Objects, GeometryObject } from 'topojson-specification';

/**
 * Why: the Geography data (src/components/geography/geo-map/data/) is DGEO - TopoJSON whose metadata is DSON
 * text and whose arcs are raw ZigZag varints behind an offset table. The browser reads it with the decoder
 * in geo-map.ts (the shipped reader); the data script (scripts/geo-data.ts) writes it with packTopology here
 * and reads it back with unpackTopology. Two readers of one format: the e2e (tests/e2e/geography/
 * geo-lib.e2e.ts) decodes every shipped file with both and compares them.
 * Why DGEO and not plain TopoJSON - VERIFIED: the world overview is 96,602 bytes as DGEO and 141,282 as TopoJSON on
 * disk; over the wire with Brotli the two are about equal, so the map reads both and the host chooses (the table on
 * pages/geography/geo-data.mdx, measured by geo-data.ts).
 * Pure: bytes in, bytes or objects out.
 *
 * DGEO v1, little endian: 'DGEO' · u16 version 1 · u16 flags 0 · u32 metadata bytes · u32 arc count · u32 arc
 * payload bytes · DSON metadata (the topology without `arcs`) · (count + 1) u32 offsets · the arcs, each a
 * run of (x, y) delta pairs as ZigZag base-128 varints.
 */

export type GeoTopology = Topology<Objects<Record<string, unknown>>>;
const HEADER = 20;
const MAX_BYTES = 256 * 1024 * 1024;
const MAX_ARCS = 2_000_000;
const utf8 = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

function unsigned(value: number, out: number[]): void {
  do {
    const low = value % 128;
    value = Math.floor(value / 128);
    out.push(low + (value ? 128 : 0));
  } while (value);
}

function readUnsigned(data: Uint8Array, cursor: { i: number }, end: number): number {
  let value = 0;
  let scale = 1;
  for (let j = 0; j < 5; j++) {
    if (cursor.i >= end) throw new Error('Truncated varint');
    const b = data[cursor.i++]!;
    value += (b & 127) * scale;
    if (value > 0xffffffff) throw new Error('Varint overflow');
    if (b < 128) {
      if (j && b === 0) throw new Error('Noncanonical varint');
      return value;
    }
    scale *= 128;
  }
  throw new Error('Oversized varint');
}

/** Checks the metadata a topology needs: a quantized transform and arc references in range. */
export function validateTopology(topology: GeoTopology, arcCount: number): void {
  if (!topology || topology.type !== 'Topology' || !topology.objects || typeof topology.objects !== 'object')
    throw new Error('Invalid topology metadata');
  const t = topology.transform;
  if (
    !t ||
    !Array.isArray(t.scale) ||
    !Array.isArray(t.translate) ||
    t.scale.length !== 2 ||
    t.translate.length !== 2 ||
    ![...t.scale, ...t.translate].every(Number.isFinite) ||
    t.scale.some((v) => v <= 0)
  )
    throw new Error('Quantized transform required');
  let refs = 0;
  const indices = (value: unknown, depth: number): void => {
    if (depth > 8 || ++refs > 10_000_000) throw new Error('Excessive arc references');
    if (Array.isArray(value)) {
      for (const x of value) indices(x, depth + 1);
      return;
    }
    if (typeof value !== 'number' || !Number.isInteger(value)) throw new Error('Invalid arc reference');
    if ((value < 0 ? -value - 1 : value) >= arcCount) throw new Error('Arc reference out of range');
  };
  const visit = (obj: GeometryObject<Record<string, unknown>>, depth = 0): void => {
    if (!obj || depth > 32) throw new Error('Invalid geometry tree');
    if (obj.type === 'GeometryCollection') {
      if (!Array.isArray(obj.geometries)) throw new Error('Invalid geometry collection');
      obj.geometries.forEach((g) => visit(g, depth + 1));
    } else if (['Polygon', 'MultiPolygon', 'LineString', 'MultiLineString'].includes(obj.type!))
      indices((obj as { arcs: unknown }).arcs, 0);
    else if (obj.type === 'Point' || obj.type === 'MultiPoint') {
      const points = obj.type === 'Point' ? [obj.coordinates] : obj.coordinates;
      if (!Array.isArray(points) || points.some((p) => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite)))
        throw new Error('Invalid point');
    } else if (obj.type !== null) throw new Error('Unsupported geometry type');
  };
  Object.values(topology.objects).forEach((g) => visit(g));
}

/** A quantized, arc-sharing TopoJSON topology as DGEO bytes. */
export function packTopology(topology: GeoTopology): Uint8Array {
  if (!Array.isArray(topology.arcs) || topology.arcs.length > MAX_ARCS) throw new Error('Too many/missing arcs');
  validateTopology(topology, topology.arcs.length);
  const { arcs, ...metadata } = topology;
  const raw: number[] = [];
  const offsets = [0];
  for (const arc of arcs) {
    if (arc.length < 2) throw new Error('Arc needs ≥ 2 points');
    for (const point of arc) {
      if (point.length !== 2) throw new Error('2D arcs required');
      for (const delta of point) {
        if (!Number.isInteger(delta) || delta < -0x80000000 || delta > 0x7fffffff)
          throw new Error('Expected int32 coordinate delta');
        unsigned(delta < 0 ? -delta * 2 - 1 : delta * 2, raw);
      }
    }
    offsets.push(raw.length);
  }
  const meta = utf8.encode(DSON.stringify(metadata));
  const tableLength = offsets.length * 4;
  const bytes = new Uint8Array(HEADER + meta.length + tableLength + raw.length);
  if (bytes.length > MAX_BYTES) throw new Error('DGEO size limit exceeded');
  bytes.set([68, 71, 69, 79, 1, 0, 0, 0]);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, meta.length, true);
  view.setUint32(12, arcs.length, true);
  view.setUint32(16, raw.length, true);
  bytes.set(meta, HEADER);
  offsets.forEach((offset, i) => view.setUint32(HEADER + meta.length + i * 4, offset, true));
  bytes.set(raw, HEADER + meta.length + tableLength);
  return bytes;
}

/** DGEO bytes back to the quantized TopoJSON topology (first-party data: DSON is no sandbox for hostile metadata). */
export function unpackTopology(bytes: Uint8Array): GeoTopology {
  if (bytes.length < HEADER || bytes.length > MAX_BYTES || String.fromCharCode(...bytes.subarray(0, 4)) !== 'DGEO')
    throw new Error('Invalid DGEO header');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint16(4, true) !== 1 || view.getUint16(6, true) !== 0) throw new Error('Unsupported DGEO version/flags');
  const m = view.getUint32(8, true);
  const count = view.getUint32(12, true);
  const rawLength = view.getUint32(16, true);
  const base = HEADER + m + (count + 1) * 4;
  if (m > 64 * 1024 * 1024 || count > MAX_ARCS || base + rawLength !== bytes.length) throw new Error('Invalid DGEO lengths');
  const metadata = DSON.parse(decoder.decode(bytes.subarray(HEADER, HEADER + m))) as GeoTopology;
  validateTopology(metadata, count);
  const offset = (i: number): number => view.getUint32(HEADER + m + i * 4, true);
  if (offset(0) !== 0 || offset(count) !== rawLength) throw new Error('Invalid arc offset table');
  const arcs: number[][][] = [];
  for (let i = 0; i < count; i++) {
    const start = offset(i);
    const stop = offset(i + 1);
    if (stop < start || stop > rawLength) throw new Error('Non-monotonic arc offsets');
    const cursor = { i: base + start };
    const end = base + stop;
    const arc: number[][] = [];
    while (cursor.i < end) {
      const x = readUnsigned(bytes, cursor, end);
      const y = readUnsigned(bytes, cursor, end);
      arc.push([x % 2 ? -(x + 1) / 2 : x / 2, y % 2 ? -(y + 1) / 2 : y / 2]);
    }
    if (arc.length < 2) throw new Error('Arc needs ≥ 2 points');
    arcs.push(arc);
  }
  return { ...metadata, arcs };
}
