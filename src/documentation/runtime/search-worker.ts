/**
 * The docs search worker: it owns the documents, the indexes, the language identifier and the model; the page
 * (runtime/docs-search.ts) only renders what it posts. Bundled by scripts/build-search-worker.ts into
 * js/search/search-worker.js (an ES module worker; the semantic half is a chunk of its own, loaded with the model).
 *
 * Two lanes, after the defuss-search demo worker (search.defuss.org, website/search-worker.mjs):
 * - lexical: documents.json.br (the docs' prose) builds a BM25 index (defuss-lexicalsearch, English analyzer) and
 *   createLexicalOnlySearch answers as you type - prefix and fuzzy expansion of the last word;
 * - semantic: tokens.bin.br (the documents' ColBERT token index, encoded at build time by scripts/search-index.ts)
 *   plus Winzling-reranker (MoEdernColBERT 1.5M, q8) under ONNX Runtime Web's WASM backend, which encodes only the
 *   query; createLexicalSemanticTinySearch fuses BM25 with the MaxSim scan.
 * The model files download as `<file>.br` from the pinned Hugging Face revision, decoded by defuss-brotli and checked
 * against their SHA-256 before the Cache API keeps them; the token index, the documents and ONNX Runtime's WASM are
 * kept the same way - a second visit downloads nothing but the manifest. Each typed query's language comes from
 * defuss-lid (CLD3, the major_20 pack): the search takes it (`language`), and a query in another language than the
 * docs' English leans on the vector source, the only one that can match it (FUSION below).
 * Newest query wins: typing costs one search per pause, however many keystrokes arrive.
 */
import { decompress, init as initBrotli } from 'defuss-brotli/decompressor/slim';
import { loadCld3Pack } from 'defuss-lid/cld3-pack';
import { LexicalSearch } from 'defuss-lexicalsearch';
import en from 'defuss-lexicalsearch/en';
import { searchPreset } from 'defuss-search';
import { createLexicalOnlySearch, createLexicalSemanticTinySearch } from 'defuss-search/strategies';
import type { SearchColumns, SearchManifest } from '../lib/search-format.ts';
import type { LaneState, PageMessage, SearchHit, WorkerEvent } from './search-messages';

interface HybridLike {
  searchWithStats(query: { text: string; language?: string }, options: { limit: number }): Promise<{ hits: { id: string }[]; timings: { totalMs: number } }>;
}

const LIMIT = 20;
const SNIPPET = 140;
const CACHE_NAME = 'defuss-shadcn-search';
/** BM25 over the title (3x), the group (a section's page title) and the prose; the last word expands as typed */
const FIELDS = { title: { weight: 3 }, group: { weight: 1.5 }, body: {} };
const LEXICAL = { search: { prefix: true, fuzzy: true } } as const;
/**
 * The docs are English, so BM25 matches a German or French question only by chance (a component name), while the
 * multilingual ColBERT model matches its meaning: a query defuss-lid reads in another language takes the vector
 * source's weight over BM25's - the efficient preset's fusion (lexical 2, vector 1) turned around.
 */
const OTHER_LANGUAGES = ['de', 'nl', 'ja', 'ko', 'th', 'pt', 'vi', 'tr', 'zh', 'id', 'it', 'ru', 'ur', 'hi', 'bn', 'fr', 'ar', 'es', 'pl'];
const FUSION = {
  ...searchPreset('efficient').fusion,
  byLanguage: [{ languages: OTHER_LANGUAGES, weights: { lexical: 1, vector: 2 } }],
};
/** CLD3 reads a language reliably only from a few words; shorter queries keep the docs' language */
const MIN_DETECT_CHARS = 12;

const post = (event: WorkerEvent): void => self.postMessage(event);
const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

let manifest: SearchManifest;
let manifestUrl: URL;
let columns: SearchColumns;
let index: LexicalSearch;
let lexicalSearch: HybridLike;
let hybrid: HybridLike | undefined;
const state: { lexical: LaneState; semantic: LaneState } = { lexical: 'idle', semantic: 'idle' };
const status = (extra: Partial<Extract<WorkerEvent, { type: 'status' }>> = {}): void =>
  post({ type: 'status', ...state, ...extra });

// ---- files: Cache API first, else a download with progress, decoded and checked -----------------------------------
const openCache = (): Promise<Cache | undefined> =>
  typeof caches === 'undefined' ? Promise.resolve(undefined) : caches.open(CACHE_NAME).catch(() => undefined);

/**
 * Downloads one file with byte progress through XMLHttpRequest's progress events (at most every 80 ms).
 * Why not a streamed fetch: VERIFIED: (defuss-search demo, 20 page loads each, 2026-11-01) reading fetch bodies with
 * getReader() in a worker made Chromium report completed downloads as net::ERR_ABORTED; XHR did not, and reports
 * progress.
 */
function download(url: string, onBytes: (loaded: number, total: number) => void): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    let reported = 0;
    request.open('GET', url);
    request.responseType = 'arraybuffer';
    request.onprogress = (event) => {
      if (performance.now() - reported < 80) return;
      reported = performance.now();
      onBytes(event.loaded, event.lengthComputable ? event.total : 0);
    };
    request.onload = () => {
      if (request.status !== 200) return reject(new Error(`${url}: HTTP ${request.status}`));
      const bytes = new Uint8Array(request.response as ArrayBuffer);
      onBytes(bytes.length, bytes.length);
      resolve(bytes);
    };
    request.onerror = () => reject(new Error(`${url}: network error`));
    request.send();
  });
}

let brotliReady: Promise<void> | undefined;
/** decodes a `.br` file; the decoder's WASM (186 kB) loads once, for the documents, the tokens and the model */
async function unbrotli(bytes: Uint8Array): Promise<Uint8Array> {
  brotliReady ??= initBrotli(manifest.assets.brotliWasm).catch((error: unknown) => {
    brotliReady = undefined;
    throw error;
  });
  await brotliReady;
  return decompress(bytes);
}

const sha256 = async (bytes: Uint8Array): Promise<string> =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>)), (x) => x.toString(16).padStart(2, '0')).join('');

/** progress of the files a phase downloads at once: the sum over the files started */
function phaseProgress(phase: string): (file: string) => (loaded: number, total: number) => void {
  const files = new Map<string, [number, number]>();
  return (file) => (loaded, total) => {
    files.set(file, [loaded, Math.max(total, loaded)]);
    let sum = 0;
    let all = 0;
    for (const [l, t] of files.values()) {
      sum += l;
      all += t;
    }
    status({ phase, loaded: sum, total: all });
  };
}

/**
 * One file, kept decoded in the cache under `key`. Downloaded from `from` (default: the key); a Brotli file is
 * decoded here, and `sha` (when the release pins one) must match before the cache keeps it.
 * A server may send a `.br` file with `Content-Encoding: br` (VERIFIED: Vite's dev server does, GitHub Pages sends
 * it as application/octet-stream, 2026-11-10), and the browser then hands over the decoded bytes: a file whose size
 * is the decoded size (`rawBytes`), or whose SHA-256 already matches the pin, is taken as it is.
 */
async function cachedFile(
  key: string,
  options: { from?: string; brotli?: boolean; sha?: string; rawBytes?: number; onBytes: (loaded: number, total: number) => void },
): Promise<{ bytes: Uint8Array; cached: boolean }> {
  const cache = await openCache();
  const hit = await cache?.match(key);
  if (hit) return { bytes: new Uint8Array(await hit.arrayBuffer()), cached: true };
  const raw = await download(options.from ?? key, options.onBytes);
  const decoded = async (): Promise<Uint8Array> => {
    if (!options.brotli || raw.length === options.rawBytes) return raw;
    try {
      return await unbrotli(raw);
    } catch (error) {
      if (options.sha && (await sha256(raw)) === options.sha) return raw;
      throw error;
    }
  };
  const bytes = await decoded();
  if (options.sha && (await sha256(bytes)) !== options.sha) throw new Error(`${key}: SHA-256 differs from the pinned release`);
  await cache?.put(key, new Response(bytes as Uint8Array<ArrayBuffer>)).catch(() => undefined);
  return { bytes, cached: false };
}

/** the URL a search file is cached under: its fingerprint in the query, so a rebuilt index is a new entry */
const indexUrl = (file: string): string => {
  const url = new URL(file, manifestUrl);
  url.searchParams.set('v', manifest.fingerprint);
  return url.href;
};

/** drops what an earlier index or release left in the cache: everything this manifest does not name */
async function pruneCache(): Promise<void> {
  const cache = await openCache();
  if (!cache) return;
  const keep = new Set([
    indexUrl(manifest.documents.file),
    indexUrl(manifest.tokens.file),
    manifest.assets.ortWasm,
    ...Object.keys(manifest.model.files).map((file) => manifest.model.base + file),
  ]);
  for (const request of await cache.keys()) if (!keep.has(request.url)) await cache.delete(request);
}

// ---- the lexical lane --------------------------------------------------------------------------------------------
async function loadLexical(): Promise<void> {
  state.lexical = 'loading';
  status({ phase: 'documents' });
  const response = await fetch(manifestUrl, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`${manifestUrl.href}: HTTP ${response.status}`);
  manifest = (await response.json()) as SearchManifest;
  void pruneCache().catch(() => undefined);
  const progress = phaseProgress('documents');
  const { bytes } = await cachedFile(indexUrl(manifest.documents.file), { brotli: true, rawBytes: manifest.documents.rawBytes, onBytes: progress('documents') });
  columns = JSON.parse(new TextDecoder().decode(bytes)) as SearchColumns;
  index = new LexicalSearch({ analyzer: en, fields: FIELDS });
  index.addAll(columns.ids.map((id, i) => ({ id, fields: { title: columns.titles[i], group: columns.groups[i], body: columns.texts[i] } })));
  lexicalSearch = createLexicalOnlySearch(index, { lexical: LEXICAL }) as unknown as HybridLike;
  state.lexical = 'ready';
  status();
}

// ---- the semantic lane -------------------------------------------------------------------------------------------
let semanticStarted = false;
async function loadSemantic(): Promise<void> {
  if (semanticStarted) return;
  semanticStarted = true;
  state.semantic = 'loading';
  let cachedAll = true;
  try {
    const tokenProgress = phaseProgress('tokens');
    const tokens = await cachedFile(indexUrl(manifest.tokens.file), { brotli: true, rawBytes: manifest.tokens.rawBytes, onBytes: tokenProgress('tokens') });
    cachedAll &&= tokens.cached;
    // the semantic half is a chunk of its own: the lexical lane never loads ONNX Runtime
    const semantic = await import('./search-semantic.ts');
    const runtime = phaseProgress('runtime');
    const wasm = await cachedFile(manifest.assets.ortWasm, { onBytes: runtime('ort') });
    cachedAll &&= wasm.cached;
    const model = phaseProgress('model');
    const colbert = await semantic.loadColbert(wasm.bytes, async (file) => {
      const key = manifest.model.base + file;
      const got = await cachedFile(key, { from: `${key}.br`, brotli: true, sha: manifest.model.files[file], onBytes: model(file) });
      cachedAll &&= got.cached;
      return got.bytes;
    });
    status({ phase: 'index' });
    const retriever = semantic.retriever(columns.ids, manifest, tokens.bytes, colbert);
    hybrid = (await createLexicalSemanticTinySearch(index, {
      vector: retriever,
      lexical: LEXICAL,
      defaults: { fusion: FUSION },
    })) as unknown as HybridLike;
    state.semantic = 'ready';
    status({ cached: cachedAll });
  } catch (error) {
    // the lexical lane keeps answering; the next page load tries again
    state.semantic = 'error';
    semanticStarted = false;
    status({ error: messageOf(error) });
  }
}

// ---- the language of a query: defuss-lid's major_20 pack, loaded with the first query long enough -----------------
let identifier: ReturnType<typeof loadCld3Pack> | undefined;
async function detectLanguage(text: string): Promise<string | undefined> {
  if (text.length < MIN_DETECT_CHARS) return undefined;
  identifier ??= loadCld3Pack(manifest.assets.lidPack, { coreURL: manifest.assets.lidCore }).catch((error: unknown) => {
    identifier = undefined; // the next query tries again
    throw error;
  });
  const [best] = (await identifier).predict(text);
  return best?.reliable ? best.language : undefined;
}

// ---- search: newest query wins -------------------------------------------------------------------------------------
const snippet = (text: string): string => {
  if (text.length <= SNIPPET) return text;
  const cut = text.lastIndexOf(' ', SNIPPET);
  return `${text.slice(0, cut > SNIPPET / 2 ? cut : SNIPPET)}...`;
};
const rows = new Map<string, number>();
const hitOf = (id: string): SearchHit => {
  if (!rows.size) columns.ids.forEach((x, i) => rows.set(x, i));
  const i = rows.get(id) ?? -1;
  return { id, title: columns.titles[i] ?? id, group: columns.groups[i] ?? '', type: columns.types[i] ?? '', snippet: snippet(columns.texts[i] ?? '') };
};

let pending: { id: number; text: string } | undefined;
let searching = false;
async function pump(): Promise<void> {
  if (searching) return;
  searching = true;
  try {
    while (pending) {
      const job = pending;
      pending = undefined;
      await runSearch(job);
    }
  } finally {
    searching = false;
  }
}
async function runSearch({ id, text }: { id: number; text: string }): Promise<void> {
  try {
    const query = text.trim();
    const language = await detectLanguage(query).catch(() => undefined);
    const search = hybrid ?? lexicalSearch;
    const response = await search.searchWithStats({ text: query, ...(language ? { language } : {}) }, { limit: LIMIT });
    post({
      type: 'results',
      id,
      text,
      mode: hybrid ? 'hybrid' : 'lexical',
      ...(language ? { language } : {}),
      hits: response.hits.map((hit) => hitOf(hit.id)),
      ms: response.timings.totalMs,
    });
  } catch (error) {
    post({ type: 'error', id, message: messageOf(error) });
  }
}

let lexicalReady: Promise<void> | undefined;
let semanticWanted = false;
self.onmessage = ({ data }: MessageEvent<PageMessage>) => {
  if (data.type === 'start') {
    if (lexicalReady) return;
    manifestUrl = new URL(data.manifest);
    semanticWanted = data.semantic;
    lexicalReady = loadLexical().then(
      () => {
        if (semanticWanted) void loadSemantic();
      },
      (error: unknown) => {
        lexicalReady = undefined;
        state.lexical = 'error';
        status({ error: messageOf(error) });
      },
    );
  } else if (data.type === 'semantic') {
    semanticWanted = true;
    void lexicalReady?.then(loadSemantic);
  } else if (data.type === 'search') {
    pending = { id: data.id, text: data.text };
    void lexicalReady?.then(pump);
  }
};
