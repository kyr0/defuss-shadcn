#!/usr/bin/env bun
/**
 * Bundles the docs search worker (src/documentation/runtime/search-worker.ts) into
 * src/documentation/public/js/search/ - search-worker.js plus the chunk of its semantic half, which the worker
 * imports when the model loads (Bun's code splitting). scripts/build-docs.ts runs it before the SSG build copies
 * public/ into dist/documentation/.
 *
 * One alias: defuss-vectorsearch's reranker imports `onnxruntime-web/webgpu`; the docs run it on the WASM backend
 * only, so the import resolves to the single-thread WASM build (`onnxruntime-web/wasm`). VERIFIED: (2026-11-10, node's
 * Brotli and jsDelivr's content-length) its binary is 2.69 MB compressed, the WebGPU build's 4.64 MB
 * (runtime/search-semantic.ts says why both must be one module).
 */
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'src', 'documentation', 'public', 'js', 'search');
const ORT_WASM_BUILD = join(ROOT, 'node_modules', 'onnxruntime-web', 'dist', 'ort.wasm.bundle.min.mjs');
if (!existsSync(ORT_WASM_BUILD)) throw new Error(`build-search-worker: ${ORT_WASM_BUILD} is missing - onnxruntime-web changed its layout`);

rmSync(OUT, { recursive: true, force: true });
const result = await Bun.build({
  entrypoints: [join(ROOT, 'src', 'documentation', 'runtime', 'search-worker.ts')],
  outdir: OUT,
  target: 'browser',
  format: 'esm',
  splitting: true,
  minify: true,
  naming: { entry: '[name].[ext]', chunk: 'chunk-[hash].[ext]' },
  plugins: [
    {
      name: 'onnxruntime-web-wasm',
      setup(build) {
        build.onResolve({ filter: /^onnxruntime-web(\/webgpu|\/wasm)?$/ }, () => ({ path: ORT_WASM_BUILD }));
      },
    },
  ],
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
for (const out of result.outputs) console.log(`search worker → ${out.path.slice(ROOT.length + 1)} (${(out.size / 1024).toFixed(1)} KiB)`);
