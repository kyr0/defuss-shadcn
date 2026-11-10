/**
 * The semantic half of the docs search worker (runtime/search-worker.ts), a chunk of its own: ONNX Runtime Web,
 * Winzling-reranker and the ColBERT retriever load only when the semantic lane starts - the lexical lane answers
 * without them.
 *
 * ONNX Runtime: defuss-vectorsearch's reranker imports `onnxruntime-web/webgpu`; scripts/build-search-worker.ts
 * resolves that import to the single-thread WASM build (`onnxruntime-web/wasm`), the one this file imports, so both
 * share one module and the reranker runs on the WASM binary handed over here (`env.wasm.wasmBinary`) - the worker
 * downloads and caches it like the model. VERIFIED: (2026-11-10, measured with node's Brotli) the WASM build is
 * 2.69 MB compressed, the WebGPU build 4.64 MB; device 'wasm' needs no WebGPU kernels.
 */
import * as ort from 'onnxruntime-web/wasm';
import { createColbertRetriever } from 'defuss-search/colbert';
import { createColbertReranker } from 'defuss-vectorsearch/browser.js';
import { unpackTokens, type SearchManifest } from '../lib/search-format.ts';

type Colbert = ReturnType<typeof createColbertReranker>;

/**
 * Loads Winzling-reranker (MoEdernColBERT 1.5M, q8) on the given ONNX Runtime WASM binary, then warms it up.
 * @param wasm - ONNX Runtime Web's ort-wasm-simd-threaded.wasm
 * @param loadFile - one file of the pinned release, decoded and SHA-256 checked
 * @returns the loaded reranker
 */
export async function loadColbert(wasm: Uint8Array, loadFile: (name: string) => Promise<Uint8Array>): Promise<Colbert> {
  ort.env.wasm.wasmBinary = wasm;
  // one thread: GitHub Pages sends no cross-origin isolation headers, so there is no SharedArrayBuffer
  ort.env.wasm.numThreads = 1;
  const colbert = createColbertReranker({
    model: '1.5m',
    precision: 'q8',
    device: 'wasm',
    numThreads: 1,
    loadFile,
    allowRemoteModels: false,
  });
  await colbert.load();
  await colbert.encodeQueries(['warm-up'], { truncate: true });
  return colbert;
}

/**
 * The ColBERT retriever over the prebuilt token index: the documents are never encoded here, only the query.
 * @param ids - the documents' ids, in index order
 * @param manifest - the search manifest (the token index's fields)
 * @param bytes - the decoded tokens.bin
 * @param colbert - the loaded reranker
 * @returns a defuss-search retriever
 */
export function retriever(ids: string[], manifest: SearchManifest, bytes: Uint8Array, colbert: Colbert): ReturnType<typeof createColbertRetriever> {
  return createColbertRetriever({
    ids,
    index: unpackTokens(manifest.tokens, ids.length, bytes),
    encodeQuery: async (text: string) => (await colbert.encodeQueries([text], { truncate: true }))[0],
  });
}
