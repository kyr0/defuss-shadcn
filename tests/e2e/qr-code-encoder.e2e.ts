import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { minifySync } from 'oxc-minify';

/**
 * Why: rendered-image decoding proves interoperability, but an encoder can
 * still produce different modules after a compiler/minifier transformation.
 * These fixed-segment/version/ECC/mask vectors check the shipped tsc output
 * and its Oxc transformation against a separately transformed upstream pin.
 * They are transformation checks; qr-code.e2e.ts supplies independent ZXing
 * interoperability checks for the complete readable/minified component.
 *
 * Golden source: Nayuki QR-Code-generator v1.8.0, commit
 * 720f62bddb7226106071d4728c292cb1df519ceb, typescript-javascript/qrcodegen.ts.
 * https://github.com/nayuki/QR-Code-generator/blob/720f62bddb7226106071d4728c292cb1df519ceb/typescript-javascript/qrcodegen.ts
 * Reference JS was generated from that exact source with Node 24.19.0's
 * node:module.stripTypeScriptTypes(source, {mode:'transform', sourceMap:false}).
 * To reproduce the digests after obtaining that reference JS:
 * bun tests/e2e/qr-code-encoder.e2e.ts --print-reference=/path/nayuki-v1.8.0.js
 * The reference file's hash is checked before execution. Normal runs never
 * derive expected values from current code and need no research files.
 *
 * Matrix serialization: size*size bytes, one byte per module (dark=1,
 * light=0), row-major from top-left, with no quiet zone or row delimiters.
 * All cases disable ECC boosting and use minVersion=maxVersion=version.
 */

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT = resolve(ROOT, 'output/qr-code/encoder-report.json');
const SOURCE = 'src/components/data-display/qr-code/qr-code.ts';
const COMPILED = 'dist/components/qr-code/qr-code.js';
const PIN = {
  upstream: 'https://github.com/nayuki/QR-Code-generator',
  version: '1.8.0',
  commit: '720f62bddb7226106071d4728c292cb1df519ceb',
  source: 'typescript-javascript/qrcodegen.ts',
  sourceBytes: 41025,
  sourceSha256: 'c4749095a91bf9696e3a303998b9905e467094f53041e64393e65e6d887737fd',
  referenceTransform: 'Node 24.19.0 node:module.stripTypeScriptTypes, mode=transform, sourceMap=false',
  referenceJsBytes: 31358,
  referenceJsSha256: '7811006037329cda4a4e704dc0b7d1ac0056588fa71aea32990724a700eebffd',
};
const ECC_NAMES = { L: 'LOW', M: 'MEDIUM', Q: 'QUARTILE', H: 'HIGH' } as const;
type Ecc = { ordinal: number };
type Segment = object;
type Matrix = { version: number; size: number; mask: number; errorCorrectionLevel: Ecc; getModule(x: number, y: number): boolean };
type Encoder = {
  QrCode: { Ecc: Record<(typeof ECC_NAMES)[keyof typeof ECC_NAMES], Ecc>; encodeSegments(segments: Segment[], ecc: Ecc, minVersion: number, maxVersion: number, mask: number, boostEcc: boolean): Matrix };
  QrSegment: { makeNumeric(value: string): Segment; makeAlphanumeric(value: string): Segment; makeBytes(value: number[]): Segment; makeEci(assignment: number): Segment };
};
type SegmentSpec =
  | { mode: 'numeric' | 'alphanumeric' | 'utf8'; value: string; repeat?: number }
  | { mode: 'bytes'; hex: string; repeat?: number }
  | { mode: 'eci'; assignment: number };
type Vector = { id: string; version: number; ecc: keyof typeof ECC_NAMES; mask: number; segments: SegmentSpec[]; sha256: string };

// Explicit segments exercise all fixed masks, all ECC levels, version-info
// introduction (6 -> 7), count-field boundaries (9 -> 10, 26 -> 27), and 40.
const VECTORS: Vector[] = [
  { id: 'numeric-v1-L-mask0', version: 1, ecc: 'L', mask: 0, segments: [{ mode: 'numeric', value: '012345678901234567890123456789' }], sha256: 'a134faa48ae8db40370da06a63ff388e86a2b90e83777378d1d43810b2e0d792' },
  { id: 'alphanumeric-v1-M-mask1', version: 1, ecc: 'M', mask: 1, segments: [{ mode: 'alphanumeric', value: 'HELLO WORLD' }], sha256: '474ebcd54dc827b9ca9036cf07341d3c892078c11b75468f4f7edddf25e938db' },
  { id: 'binary-v2-Q-mask2', version: 2, ecc: 'Q', mask: 2, segments: [{ mode: 'bytes', hex: '00017f80feff102030405060' }], sha256: '280dc7056be4b45be101d527a4d39d94b18b747799c4c87ea425a750a1ec9bff' },
  { id: 'unicode-eci-v6-H-mask3', version: 6, ecc: 'H', mask: 3, segments: [{ mode: 'eci', assignment: 26 }, { mode: 'utf8', value: 'Grüße / 日本語 / 🚀' }], sha256: '65fa3f267e26fa1ca08db2d0442628b4ee60da14c374e8d3e9fe3c90e8d17b66' },
  { id: 'mixed-v7-L-mask4', version: 7, ecc: 'L', mask: 4, segments: [{ mode: 'alphanumeric', value: 'ORDER/2026/' }, { mode: 'numeric', value: '0123456789', repeat: 16 }, { mode: 'bytes', hex: '00ff8041' }], sha256: 'edb84c5fef4ed31c7a95bf05b504db203e97e804cdc062c0590e1b470c0f8435' },
  { id: 'binary-v9-M-mask5', version: 9, ecc: 'M', mask: 5, segments: [{ mode: 'bytes', hex: '000102030405060708090a0b0c0d0e0f', repeat: 8 }], sha256: 'eb44610d6b7f22e9e3861f2fe35ef000c70808e60ff8cf2f030b44c8f77dc5bb' },
  { id: 'alphanumeric-v10-Q-mask6', version: 10, ecc: 'Q', mask: 6, segments: [{ mode: 'alphanumeric', value: 'ABC123 $%*+-./:', repeat: 8 }], sha256: 'dae0adfa1e9c260a8875d4e8d9c57b97cbcae77e5f145471ad5d009a89ebef63' },
  { id: 'numeric-v26-H-mask7', version: 26, ecc: 'H', mask: 7, segments: [{ mode: 'numeric', value: '0123456789', repeat: 50 }], sha256: 'b0772da805aa24cc6f5d52daa5724013d9a0961136b3fbd884c5438835484743' },
  { id: 'unicode-eci-v27-Q-mask0', version: 27, ecc: 'Q', mask: 0, segments: [{ mode: 'eci', assignment: 26 }, { mode: 'utf8', value: 'Καλημέρα / العربية / 日本語 / 🚀', repeat: 8 }], sha256: 'e3de3cc6f4b821106ce0491fb6e5f3e698cf4f6db31170e83a8bb3e327d18851' },
  { id: 'binary-v40-H-mask7', version: 40, ecc: 'H', mask: 7, segments: [{ mode: 'bytes', hex: '000102030405060708090a0b0c0d0e0ff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff', repeat: 32 }], sha256: '180ce655f8f78f43c4236311d1e4f0c93cd9dba9728ca2d5c0295008ede77ee9' },
];

const sha256 = (value: string | Uint8Array): string => createHash('sha256').update(value).digest('hex');

function vendoredRegion(source: string, name: string): string {
  const begin = '// BEGIN VENDORED qrcodegen.ts\n';
  const end = '// END VENDORED qrcodegen.ts';
  assert.equal(source.split(begin).length, 2, `${name}: one opening vendor marker`);
  assert.equal(source.split(end).length, 2, `${name}: one closing vendor marker`);
  const start = source.indexOf(begin) + begin.length;
  const finish = source.indexOf(end);
  assert.ok(finish > start, `${name}: ordered vendor markers`);
  return source.slice(start, finish);
}

// This seam exists only in a fresh VM context. No production file or global
// gains an encoder export. Keeping an observable assignment also prevents
// Oxc from deleting the isolated namespace as unreferenced test input.
const TEST_SEAM = '\nglobalThis.__qrCodeTestEncoder = qrcodegen;\n';
function loadEncoder(code: string): Encoder {
  const sandbox: { __qrCodeTestEncoder?: Encoder } = {};
  runInNewContext(code, sandbox, { timeout: 1_000 });
  assert.ok(sandbox.__qrCodeTestEncoder, 'isolated encoder seam');
  return sandbox.__qrCodeTestEncoder;
}

function segmentsFor(q: Encoder, specs: SegmentSpec[]): Segment[] {
  return specs.map((spec) => {
    if (spec.mode === 'eci') return q.QrSegment.makeEci(spec.assignment);
    if (spec.mode === 'bytes') return q.QrSegment.makeBytes([...Buffer.from(spec.hex.repeat(spec.repeat ?? 1), 'hex')]);
    const value = spec.value.repeat(spec.repeat ?? 1);
    if (spec.mode === 'numeric') return q.QrSegment.makeNumeric(value);
    if (spec.mode === 'alphanumeric') return q.QrSegment.makeAlphanumeric(value);
    return q.QrSegment.makeBytes([...Buffer.from(value, 'utf8')]);
  });
}

function matrixHash(q: Encoder, vector: Vector): string {
  const ecc = q.QrCode.Ecc[ECC_NAMES[vector.ecc]];
  const matrix = q.QrCode.encodeSegments(segmentsFor(q, vector.segments), ecc, vector.version, vector.version, vector.mask, false);
  assert.equal(matrix.version, vector.version, `${vector.id}: fixed version`);
  assert.equal(matrix.size, 17 + 4 * vector.version, `${vector.id}: module count`);
  assert.equal(matrix.mask, vector.mask, `${vector.id}: fixed mask`);
  assert.equal(matrix.errorCorrectionLevel.ordinal, ['L', 'M', 'Q', 'H'].indexOf(vector.ecc), `${vector.id}: exact ECC without boosting`);
  const bytes = new Uint8Array(matrix.size * matrix.size);
  for (let y = 0; y < matrix.size; y++) {
    for (let x = 0; x < matrix.size; x++) bytes[y * matrix.size + x] = matrix.getModule(x, y) ? 1 : 0;
  }
  return sha256(bytes);
}

const referencePath = process.argv.find((arg) => arg.startsWith('--print-reference='))?.slice('--print-reference='.length);
if (referencePath) {
  const referenceJs = readFileSync(resolve(referencePath));
  assert.equal(referenceJs.length, PIN.referenceJsBytes, 'pinned reference JS length');
  assert.equal(sha256(referenceJs), PIN.referenceJsSha256, 'pinned reference JS hash');
  const q = loadEncoder(referenceJs.toString('utf8') + TEST_SEAM);
  console.log(JSON.stringify(VECTORS.map((vector) => ({ ...vector, sha256: matrixHash(q, vector) })), null, 2));
} else {
  const report: { pin: typeof PIN; artifacts: Record<string, { bytes: number; sha256: string }>; checks: { id: string; transformation: string; sha256: string; passed: boolean }[]; passed: boolean; error?: string } = { pin: PIN, artifacts: {}, checks: [], passed: false };
  try {
    const source = vendoredRegion(readFileSync(resolve(ROOT, SOURCE), 'utf8'), SOURCE);
    assert.equal(Buffer.byteLength(source), PIN.sourceBytes, 'byte-preserved upstream source length');
    assert.equal(sha256(source), PIN.sourceSha256, 'byte-preserved upstream source hash');
    const artifact = readFileSync(resolve(ROOT, COMPILED), 'utf8');
    const compiled = vendoredRegion(artifact, COMPILED);
    report.artifacts[COMPILED] = { bytes: Buffer.byteLength(artifact), sha256: sha256(artifact) };
    // These are scripts/minify.ts's production options, applied to the
    // actual tsc-emitted region plus the isolated observable test seam.
    const minified = minifySync('qr-code-encoder.seam.js', compiled + TEST_SEAM, { module: true, compress: true, mangle: true, sourcemap: true });
    assert.equal(minified.errors.length, 0, 'Oxc minifier errors');
    assert.ok(minified.map, 'Oxc transformation source map');
    report.artifacts['test-only-oxc-transform'] = { bytes: Buffer.byteLength(minified.code), sha256: sha256(minified.code) };
    for (const [transformation, code] of [['published-tsc', compiled + TEST_SEAM], ['production-oxc-options', minified.code]] as const) {
      const q = loadEncoder(code);
      for (const vector of VECTORS) {
        assert.match(vector.sha256, /^[0-9a-f]{64}$/, `${vector.id}: stored upstream golden digest`);
        const actual = matrixHash(q, vector);
        report.checks.push({ id: vector.id, transformation, sha256: actual, passed: actual === vector.sha256 });
        assert.equal(actual, vector.sha256, `${transformation}: ${vector.id} module matrix`);
      }
    }
    assert.equal(report.checks.length, VECTORS.length * 2);
    report.passed = true;
    console.log(`qr-code-encoder: ${report.checks.length}/${report.checks.length} fixed-matrix transformation checks passed`);
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    mkdirSync(resolve(OUTPUT, '..'), { recursive: true });
    writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  }
}
