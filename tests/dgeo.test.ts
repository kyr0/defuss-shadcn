/**
 * Why: the Geography data is DGEO (scripts/lib/dgeo.ts) - TopoJSON whose metadata is DSON and whose arcs are
 * ZigZag varints behind an offset table. scripts/geo-data.ts writes every shipped file through packTopology,
 * so the codec's contract is: what it packs, unpackTopology returns unchanged, and bytes that are not a
 * well-formed DGEO file are refused by name instead of decoding into wrong boundaries.
 * (Every shipped file is also decoded by both readers in tests/e2e/site/geo-lib.e2e.ts.)
 */
import { describe, expect, it } from 'vitest';
import { packTopology, unpackTopology, validateTopology, type GeoTopology } from '../scripts/lib/dgeo.ts';

const topology = (): GeoTopology =>
  ({
    type: 'Topology',
    transform: { scale: [0.01, 0.01], translate: [-180, -90] },
    objects: {
      regions: {
        type: 'GeometryCollection',
        geometries: [
          { type: 'Polygon', arcs: [[0, 1]], id: 'A', properties: { name: 'Ä-land', parent: 'X' } },
          { type: 'MultiPolygon', arcs: [[[-1, 2]], [[~0]]], id: 'B', properties: { name: 'B' } },
          { type: 'Point', coordinates: [5, 6] },
        ],
      },
    },
    arcs: [
      [[0, 0], [100, 0], [0, 100], [-100, -100]],
      [[100, 0], [-2147483648, 2147483647]],
      [[5, 5], [1, -1]],
    ],
  }) as unknown as GeoTopology;

describe('DGEO codec', () => {
  it('round-trips a topology: metadata, properties, negative arc indices and int32 deltas', () => {
    const t = topology();
    const bytes = packTopology(t);
    expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe('DGEO');
    expect(unpackTopology(bytes)).toEqual(t);
  });

  it('refuses a wrong magic, version, length or offset table by name', () => {
    const bytes = packTopology(topology());
    const bad = (edit: (b: Uint8Array) => Uint8Array) => () => unpackTopology(edit(bytes.slice()));
    expect(bad((b) => ((b[0] = 0), b))).toThrow('Invalid DGEO header');
    expect(bad((b) => ((b[4] = 2), b))).toThrow('Unsupported DGEO version/flags');
    expect(bad((b) => b.subarray(0, b.length - 1))).toThrow('Invalid DGEO lengths');
    const view = new DataView(bytes.buffer);
    const meta = view.getUint32(8, true);
    expect(
      bad((b) => {
        new DataView(b.buffer).setUint32(20 + meta, 1, true); // offset(0) must be 0
        return b;
      }),
    ).toThrow('Invalid arc offset table');
  });

  it('refuses topologies the map cannot draw: no quantized transform, arc references out of range, short arcs', () => {
    const noTransform = { ...topology(), transform: undefined } as unknown as GeoTopology;
    expect(() => packTopology(noTransform)).toThrow('Quantized transform required');
    expect(() => validateTopology(topology(), 2)).toThrow('Arc reference out of range');
    const short = topology();
    short.arcs[2] = [[1, 1]];
    expect(() => packTopology(short)).toThrow('Arc needs ≥ 2 points');
    const fractional = topology();
    fractional.arcs[0][1] = [0.5, 0];
    expect(() => packTopology(fractional)).toThrow('Expected int32 coordinate delta');
  });
});
