#!/usr/bin/env node
/**
 * Builds the docs search index into dist/documentation/search/ from the rendered pages (scripts/build-docs.ts runs it
 * after the SSG build; `node scripts/search-index.ts` alone after a docs build):
 * - documents.json.br - every document's id, title, group, type and lexical text (lib/search-docs.ts), which the
 *   browser indexes with BM25 in a few milliseconds;
 * - tokens.bin.br - the ColBERT token index of the documents' semantic texts (Winzling-reranker, the MoEdernColBERT
 *   1.5M graph defuss-vectorsearch pins), quantized by defuss-search's buildColbertTokenIndex: per document its token
 *   count (uint32), then the TurboQuant codes;
 * - manifest.json - the sizes, the quantizer's small fields and the fingerprint of the documents under the model,
 *   which verify's `search index ↔ docs` gate recomputes.
 * Why encode here: VERIFIED: (defuss-search website/token-index.mjs, measured 2026-11-02 and 2026-11-09) encoding
 * 2,000 passages with the WASM model in Chromium took 13 to 15 s - every visitor would pay it; VERIFIED: (2026-11-10,
 * this script) node encodes the docs' 3,276 semantic texts in 11.4 s, once per change. Each semantic text's token
 * matrix is cached in .cache/search/ under its hash, so a docs build encodes only what changed; the model itself
 * loads from .cache/models/ (downloaded once from its pinned Hugging Face revision, every file SHA-256 checked by
 * defuss-vectorsearch).
 * Why node's Brotli: the files are compressed once at build; the browser decodes them with defuss-brotli's decoder,
 * the one defuss-vectorsearch decodes the model files with.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync, constants } from 'node:zlib';
import { buildColbertTokenIndex } from 'defuss-search/colbert';
import { MOEDERNCOLBERT_MODELS } from 'defuss-vectorsearch/browser.js';
import { packTokens, SEARCH_SCHEMA, type SearchManifest } from '../src/documentation/lib/search-format.ts';
import { collectSearchDocs, searchFingerprint } from './lib/search-docs-files.ts';
import type { SearchDoc } from './lib/search-docs.ts';

const ROOT = join(import.meta.dirname, '..');
/** the pinned ColBERT release (defuss-vectorsearch 0.4.0): the browser loads the same one */
export const COLBERT = MOEDERNCOLBERT_MODELS['1.5m'];
/** the token matrices' fingerprint: model, commit and graph hash */
export const MODEL_FINGERPRINT = `${COLBERT.id}@${COLBERT.revision}:${COLBERT.files['model_q8.onnx']}`;
/** the installed version of a package: the pin of the jsDelivr URL the browser loads it from */
const installed = (name: string): string =>
  (JSON.parse(readFileSync(join(ROOT, 'node_modules', name, 'package.json'), 'utf8')) as { version: string }).version;
const jsdelivr = (name: string, path: string): string => `https://cdn.jsdelivr.net/npm/${name}@${installed(name)}/${path}`;

/**
 * The parts of the manifest that do not depend on the documents: the model pin and the vendor URLs. verify compares
 * them too - a package update without a rebuilt index would leave the browser loading another version.
 * @returns the model and asset fields of the manifest
 */
export function searchPins(): Pick<SearchManifest, 'model' | 'assets'> {
  return {
    model: {
      id: COLBERT.id,
      revision: COLBERT.revision,
      fingerprint: MODEL_FINGERPRINT,
      files: { ...COLBERT.files },
      base: `https://huggingface.co/${COLBERT.id}/resolve/${COLBERT.revision}/`,
    },
    assets: {
      // the single-thread WASM build: the search worker aliases the reranker's onnxruntime-web/webgpu import to
      // onnxruntime-web/wasm (scripts/build-search-worker.ts) - 2.69 MB Brotli instead of the WebGPU build's 4.64 MB
      ortWasm: jsdelivr('onnxruntime-web', 'dist/ort-wasm-simd-threaded.wasm'),
      brotliWasm: jsdelivr('defuss-brotli', 'dist/decompressor.wasm'),
      lidPack: jsdelivr('defuss-lid', 'models/cld3-pq-dno/major_20.cld3q'),
      lidCore: jsdelivr('defuss-lid', 'runtime/cld3-core.bin.gz'),
    },
  };
}

interface Matrix {
  data: Float32Array;
  tokenCount: number;
  dimensions: number;
  fingerprint: string;
  truncated: boolean;
}

const log = (message: string): void => console.log(`${new Date().toISOString()} INFO search-index ${message}`);
const brotli = (bytes: Uint8Array): Buffer =>
  brotliCompressSync(bytes, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: bytes.length },
  });

/** the cache file of one semantic text's token matrix */
const cacheFile = (dir: string, text: string): string =>
  join(dir, createHash('sha256').update(`${MODEL_FINGERPRINT}\0${text}`).digest('hex') + '.bin');

/** a cached matrix: int32 token count, int32 dimensions, then the float32 rows */
function readMatrix(file: string): Matrix {
  const bytes = readFileSync(file);
  const head = new Int32Array(bytes.buffer, bytes.byteOffset, 2);
  const [tokenCount, dimensions] = [head[0], head[1]];
  const data = new Float32Array(bytes.buffer.slice(bytes.byteOffset + 8, bytes.byteOffset + 8 + tokenCount * dimensions * 4));
  return { data, tokenCount, dimensions, fingerprint: MODEL_FINGERPRINT, truncated: false };
}
function writeMatrix(file: string, m: Matrix): void {
  const out = new Uint8Array(8 + m.data.byteLength);
  out.set(new Uint8Array(Int32Array.from([m.tokenCount, m.dimensions]).buffer), 0);
  out.set(new Uint8Array(m.data.buffer, m.data.byteOffset, m.data.byteLength), 8);
  writeFileSync(file, out);
}

/** encodes the semantic texts the cache lacks, in batches, with the pinned model under ORT's WASM backend */
async function encodeMissing(docs: SearchDoc[], dir: string): Promise<number> {
  const texts = [...new Set(docs.map((d) => d.dense))].filter((t) => !existsSync(cacheFile(dir, t)));
  if (!texts.length) return 0;
  // the model loads only when something needs encoding - a build with a warm cache needs no model, no network
  const { createColbertReranker } = await import('defuss-vectorsearch/onnx.js');
  const colbert = createColbertReranker({
    model: '1.5m',
    precision: 'q8',
    device: 'wasm',
    numThreads: 1,
    truncate: true,
    cacheDir: join(ROOT, '.cache', 'models'),
  });
  log(`encoding ${texts.length} semantic texts`);
  for (let i = 0; i < texts.length; i += 64) {
    const batch = texts.slice(i, i + 64);
    const matrices = (await colbert.encodeDocuments(batch, { truncate: true })) as Matrix[];
    matrices.forEach((m, j) => {
      if (m.fingerprint !== MODEL_FINGERPRINT) throw new Error(`search index: model ${m.fingerprint}, expected ${MODEL_FINGERPRINT}`);
      writeMatrix(cacheFile(dir, batch[j]), m);
    });
  }
  await colbert.dispose?.();
  return texts.length;
}

/**
 * Writes dist/documentation/search/ for the rendered docs.
 * @param docsDir - the rendered documentation (default dist/documentation)
 * @returns the manifest written
 */
export async function buildSearchIndex(docsDir = join(ROOT, 'dist', 'documentation')): Promise<SearchManifest> {
  const started = performance.now();
  const docs = collectSearchDocs(docsDir);
  const cache = join(ROOT, '.cache', 'search');
  mkdirSync(cache, { recursive: true });
  const encoded = await encodeMissing(docs, cache);
  const matrices = docs.map((d) => readMatrix(cacheFile(cache, d.dense)));
  const { meta, bytes: tokens } = packTokens(buildColbertTokenIndex(matrices));
  // columns, not objects: the keys would repeat 3,000 times
  const documents = new TextEncoder().encode(
    JSON.stringify({
      ids: docs.map((d) => d.id),
      titles: docs.map((d) => d.title),
      groups: docs.map((d) => d.group),
      types: docs.map((d) => d.type ?? ''),
      texts: docs.map((d) => d.text),
    }),
  );
  const out = join(docsDir, 'search');
  mkdirSync(out, { recursive: true });
  const docsBr = brotli(documents);
  const tokensBr = brotli(tokens);
  writeFileSync(join(out, 'documents.json.br'), docsBr);
  writeFileSync(join(out, 'tokens.bin.br'), tokensBr);
  const manifest: SearchManifest = {
    schema: SEARCH_SCHEMA,
    fingerprint: searchFingerprint(docs, MODEL_FINGERPRINT),
    ...searchPins(),
    documents: { file: 'documents.json.br', bytes: docsBr.length, rawBytes: documents.length, count: docs.length },
    tokens: { file: 'tokens.bin.br', bytes: tokensBr.length, rawBytes: tokens.length, ...meta },
  };
  writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  log(
    `docs=${docs.length} encoded=${encoded} tokens=${meta.size} documents=${docsBr.length}B tokens=${tokensBr.length}B ms=${Math.round(performance.now() - started)}`,
  );
  return manifest;
}

if (import.meta.main ?? process.argv[1]?.endsWith('search-index.ts')) await buildSearchIndex();
