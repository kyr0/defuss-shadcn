import { describe, expect, it } from 'vitest';
import { docsDistToSrc } from '../scripts/lib/docs-ssg.ts';
import { pageSearchDocs, TEXT_CHARS, type SearchDoc } from '../scripts/lib/search-docs.ts';
import { searchIndexProblems, type SearchIndexInput } from '../scripts/lib/search-index-check.ts';
import {
  packTokens,
  SEARCH_SCHEMA,
  unpackTokens,
  type SearchManifest,
  type TokenIndex,
} from '../src/documentation/lib/search-format.ts';

/**
 * Why: the docs search reads its documents from the rendered pages (scripts/lib/search-docs.ts) and ships them with a
 * token index in a format three modules share (src/documentation/lib/search-format.ts); verify's `search index ↔ docs`
 * gate decides from scripts/lib/search-index-check.ts whether the built index is the docs' current one. Pinned here:
 * what a real rendered page contributes, the token format's round trip and every way the gate fails.
 */

describe('pageSearchDocs on a rendered page', () => {
  it('the page first (its header lead), then one document per TOC section - never the source listings', async () => {
    const html = await (await fetch('/dist/documentation/actions/button.html')).text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const docs = pageSearchDocs(doc, { rel: 'actions/button.html', title: 'Button', group: 'Actions', type: 'ATM' });
    expect(docs[0]).toMatchObject({ id: 'actions/button.html', title: 'Button', group: 'Actions', type: 'ATM' });
    expect(docs[0].text).toMatch(/^Triggers an action or event/);
    expect(docs[0].dense.startsWith('Button. Triggers an action')).toBe(true);
    const sizes = docs.find((d) => d.title === 'Sizes');
    expect(sizes).toMatchObject({ id: 'actions/button.html#toc-sizes', group: 'Button', dense: 'Sizes - Button' });
    expect(docs.some((d) => /#toc-(css|javascript|js)$/.test(d.id))).toBe(false);
    expect(new Set(docs.map((d) => d.id)).size).toBe(docs.length);
    for (const d of docs) expect(d.text.length).toBeLessThanOrEqual(TEXT_CHARS);
  });
});

/** a tiny index: 3 documents with 2, 0 and 3 tokens of 4 code bytes */
const index = (): TokenIndex => ({
  tokenCounts: [2, 0, 3],
  turboquant: {
    size: 5,
    dims: 8,
    rotatedDims: 8,
    codeBytes: 4,
    clip: 0.5,
    codebook: Float32Array.from([0.1, -0.25]),
    signs: Int8Array.from([1, -1]),
    codes: Uint8Array.from({ length: 20 }, (_, i) => i),
  },
});

describe('the token format', () => {
  it('packTokens and unpackTokens round-trip the counts, the codes and the quantizer fields', () => {
    const { meta, bytes } = packTokens(index());
    expect(bytes.length).toBe(3 * 4 + 20);
    const back = unpackTokens(meta, 3, bytes);
    expect(Array.from(back.tokenCounts)).toEqual([2, 0, 3]);
    expect(Array.from(back.turboquant.codes)).toEqual(Array.from(index().turboquant.codes));
    expect(back.turboquant.codebook).toEqual(index().turboquant.codebook);
    expect(back.turboquant.signs).toEqual(index().turboquant.signs);
  });
  it('a file of the wrong length, or counts that do not sum to the tokens, is refused', () => {
    const { meta, bytes } = packTokens(index());
    expect(() => unpackTokens(meta, 3, bytes.subarray(0, bytes.length - 1))).toThrow(RangeError);
    expect(() => unpackTokens({ ...meta, size: 4 }, 3, bytes.subarray(0, 12 + 16))).toThrow(/sum to 5/);
  });
});

const docs: SearchDoc[] = [
  { id: 'a.html', title: 'A', group: 'G', type: 'ATM', text: 'alpha', dense: 'A. alpha' },
  { id: 'a.html#toc-x', title: 'X', group: 'A', text: 'x', dense: 'X - A' },
  { id: 'b.html', title: 'B', group: 'G', text: 'beta', dense: 'B. beta' },
];
const pins: SearchIndexInput['pins'] = {
  model: {
    id: 'm',
    revision: 'r',
    fingerprint: 'm@r:h',
    files: { 'model_q8.onnx': 'h' },
    base: 'https://example.test/m/',
  },
  assets: { ortWasm: 'o', brotliWasm: 'b', lidPack: 'p', lidCore: 'c' },
};
/** an index that matches `docs`, with a way to spoil one part */
function input(change: (i: SearchIndexInput) => void = () => {}): SearchIndexInput {
  const columns = {
    ids: docs.map((d) => d.id),
    titles: docs.map((d) => d.title),
    groups: docs.map((d) => d.group),
    types: docs.map((d) => d.type ?? ''),
    texts: docs.map((d) => d.text),
  };
  const decoded = new TextEncoder().encode(JSON.stringify(columns));
  const { meta, bytes } = packTokens(index());
  const manifest: SearchManifest = {
    schema: SEARCH_SCHEMA,
    fingerprint: 'f1',
    ...structuredClone(pins),
    documents: { file: 'documents.json.br', bytes: 10, rawBytes: decoded.length, count: 3 },
    tokens: { file: 'tokens.bin.br', bytes: 20, rawBytes: bytes.length, ...meta },
  };
  const i: SearchIndexInput = {
    manifest,
    fingerprint: 'f1',
    docs,
    pins,
    documents: { stored: 10, decoded },
    tokens: { stored: 20, decoded: bytes },
  };
  change(i);
  return i;
}

describe('searchIndexProblems', () => {
  it('an index built from the documents the pages hold now passes', () => {
    expect(searchIndexProblems(input())).toEqual([]);
  });
  it('a docs change since the build fails by its fingerprint', () => {
    expect(searchIndexProblems(input((i) => (i.fingerprint = 'f2')))).toEqual([
      expect.stringMatching(/other documents than the rendered pages hold now/),
    ]);
  });
  it('a moved model or vendor pin fails', () => {
    expect(searchIndexProblems(input((i) => (i.manifest!.model.revision = 'old')))).toEqual([
      expect.stringMatching(/is not the pinned m@r:h/),
    ]);
    expect(searchIndexProblems(input((i) => (i.manifest!.assets.ortWasm = 'old')))).toEqual([
      expect.stringMatching(/other vendor files/),
    ]);
  });
  it('a documents file that differs from the pages names the column and the first document', () => {
    const problems = searchIndexProblems(
      input((i) => {
        const columns = JSON.parse(new TextDecoder().decode(i.documents!.decoded));
        columns.texts[2] = 'gamma';
        i.documents!.decoded = new TextEncoder().encode(JSON.stringify(columns));
        i.manifest!.documents.rawBytes = i.documents!.decoded.length;
      }),
    );
    expect(problems).toEqual(['search/documents.json.br: texts differ from the pages from b.html']);
  });
  it('sizes the manifest does not state, a cut token file and missing files fail', () => {
    expect(searchIndexProblems(input((i) => (i.documents!.stored = 11)))).toEqual([
      expect.stringMatching(/11 \/ \d+ bytes, the manifest says 10/),
    ]);
    expect(searchIndexProblems(input((i) => (i.tokens!.decoded = i.tokens!.decoded.subarray(0, 31))))).toContainEqual(
      expect.stringMatching(/token index holds 31 bytes, expected 32/),
    );
    expect(searchIndexProblems(input((i) => (i.tokens = undefined)))).toEqual([
      'search/tokens.bin.br is missing or not Brotli',
    ]);
    expect(searchIndexProblems(input((i) => (i.manifest = undefined)))).toEqual([
      'dist/documentation/search/manifest.json is missing',
    ]);
  });
});

describe("the search files in verify's dist 1:1 mapping", () => {
  it('the worker bundle maps to its source, the index to nothing; an unbundled worker beside the runtime is an orphan', () => {
    expect(docsDistToSrc('js/search/search-worker.js')).toBe('documentation/runtime/search-worker.ts');
    expect(docsDistToSrc('js/search/chunk-abc123.js')).toBeNull();
    // the Database Explorer's defuss-db bundle: entries map to runtime/db/, chunks to nothing
    expect(docsDistToSrc('js/db/db.js')).toBe('documentation/runtime/db/db.ts');
    expect(docsDistToSrc('js/db/db-worker.js')).toBe('documentation/runtime/db/db-worker.ts');
    expect(docsDistToSrc('js/db/chunk-abc123.js')).toBeNull();
    expect(docsDistToSrc('search/manifest.json')).toBeNull();
    expect(docsDistToSrc('js/docs-search.js')).toBe('documentation/runtime/docs-search.ts');
    // tsc once emitted these, unbundled, through a type import - no source owns them
    for (const stray of ['js/search-worker.js', 'js/search-semantic.js'])
      expect(docsDistToSrc(stray)).not.toMatch(/\.ts$/);
  });
});
