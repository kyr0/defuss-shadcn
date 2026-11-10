/**
 * The docs search index on the wire (pure): what scripts/search-index.ts writes into dist/documentation/search/, what
 * the search worker (runtime/search-worker.ts) reads and what verify's `search index ↔ docs` gate checks - one owner
 * of the format, three readers.
 *
 * - manifest.json: the fingerprint, the model pin, the vendor URLs, both files' sizes and the token index's small
 *   fields (sizes, codebook, signs);
 * - documents.json.br: the documents as columns (ids, titles, groups, types, texts) - keys once, not 3,000 times;
 * - tokens.bin.br: each document's token count (uint32), then the TurboQuant codes. Typed arrays use the platform's
 *   byte order, little-endian on every browser and CPU the docs target (defuss-search's demo ships its token index
 *   the same way).
 * VERIFIED: (tests/search-index.test.ts) packTokens and unpackTokens round-trip counts, codes, codebook and signs, and
 * unpackTokens refuses a file of the wrong length or counts that do not sum to the tokens.
 */

export const SEARCH_SCHEMA = 'defuss-shadcn-search.v1';

/** The documents, one column per field, in index order. */
export interface SearchColumns {
  /** the href from the docs root (`actions/button.html#toc-sizes`) */
  ids: string[];
  /** the page's or the section's title */
  titles: string[];
  /** a page: its sidebar section; a section: its page's title */
  groups: string[];
  /** a page's taxonomy type, '' for none */
  types: string[];
  /** the prose the lexical index reads */
  texts: string[];
}

/** The quantizer's fields that are no codes: they ride in the manifest. */
export interface TokenMeta {
  size: number;
  dims: number;
  rotatedDims: number;
  codeBytes: number;
  clip: number;
  codebook: number[];
  signs: number[];
}

/** The pinned ColBERT release the token matrices were encoded with, and where the browser downloads it. */
export interface SearchModel {
  /** the Hugging Face repository */
  id: string;
  /** the pinned commit */
  revision: string;
  /** id@revision:graph hash - the token matrices were encoded under it */
  fingerprint: string;
  /** the release's files: name → SHA-256 of the decoded bytes */
  files: Record<string, string>;
  /** where `<file>.br` downloads from */
  base: string;
}

export interface SearchManifest {
  schema: string;
  /** SHA-256 of the documents under the model (scripts/lib/search-docs.ts searchFingerprint) */
  fingerprint: string;
  model: SearchModel;
  /** the pinned vendor files the worker loads (jsDelivr, the installed versions) */
  assets: {
    /** ONNX Runtime Web's single-thread WASM build */
    ortWasm: string;
    /** defuss-brotli's decoder */
    brotliWasm: string;
    /** defuss-lid's CLD3 pack and core */
    lidPack: string;
    lidCore: string;
  };
  documents: { file: string; bytes: number; rawBytes: number; count: number };
  tokens: TokenMeta & { file: string; bytes: number; rawBytes: number };
}

/** The token index as buildColbertTokenIndex() returns it (defuss-search/colbert). */
export interface TokenIndex {
  tokenCounts: ArrayLike<number>;
  turboquant: {
    size: number;
    dims: number;
    rotatedDims: number;
    codeBytes: number;
    clip: number;
    codebook: Float32Array;
    signs: Int8Array;
    codes: Uint8Array;
  };
}

/**
 * Splits a token index into the manifest's fields and one binary.
 * @param index - buildColbertTokenIndex()'s result
 * @returns the manifest fields and the bytes of tokens.bin
 */
export function packTokens({ tokenCounts, turboquant }: TokenIndex): { meta: TokenMeta; bytes: Uint8Array } {
  const { size, dims, rotatedDims, codeBytes, clip, codebook, signs, codes } = turboquant;
  const counts = Uint32Array.from(tokenCounts);
  const bytes = new Uint8Array(counts.byteLength + codes.length);
  bytes.set(new Uint8Array(counts.buffer), 0);
  bytes.set(codes, counts.byteLength);
  // float32 to a JSON number and back restores each value exactly
  return { meta: { size, dims, rotatedDims, codeBytes, clip, codebook: Array.from(codebook), signs: Array.from(signs) }, bytes };
}

/**
 * The inverse of packTokens; the codes stay a view into `bytes`.
 * @param meta - the manifest's token fields
 * @param documents - how many documents the index holds
 * @param bytes - the decoded tokens.bin
 * @returns the index createColbertRetriever({ index }) takes
 * @throws RangeError when the bytes do not hold that many documents and tokens
 */
export function unpackTokens(meta: TokenMeta, documents: number, bytes: Uint8Array): TokenIndex {
  const countBytes = 4 * documents;
  if (bytes.length !== countBytes + meta.size * meta.codeBytes)
    throw new RangeError(`token index holds ${bytes.length} bytes, expected ${countBytes + meta.size * meta.codeBytes}`);
  const tokenCounts = new Uint32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + countBytes));
  let sum = 0;
  for (const n of tokenCounts) sum += n;
  if (sum !== meta.size) throw new RangeError(`token counts sum to ${sum}, the index holds ${meta.size} tokens`);
  return {
    tokenCounts,
    turboquant: {
      size: meta.size,
      dims: meta.dims,
      rotatedDims: meta.rotatedDims,
      codeBytes: meta.codeBytes,
      clip: meta.clip,
      codebook: Float32Array.from(meta.codebook),
      signs: Int8Array.from(meta.signs),
      codes: bytes.subarray(countBytes),
    },
  };
}
