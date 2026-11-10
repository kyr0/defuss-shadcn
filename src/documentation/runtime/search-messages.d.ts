/**
 * The messages between the docs search's page side (runtime/docs-search.ts) and its worker
 * (runtime/search-worker.ts). A declaration file on purpose: tsc compiles docs-search.ts one file at a time into
 * public/js/, and a type import from the worker pulled the worker and its imports into that program - tsc emitted
 * them unbundled (js/search-worker.js, lib/search-format.js beside its source). VERIFIED: (2026-11-10) a .d.ts
 * emits nothing.
 */

/** a lane of the search: the BM25 index, or the ColBERT model and token index */
export type LaneState = 'idle' | 'loading' | 'ready' | 'error';

/** one ranked document as the palette shows it */
export interface SearchHit {
  /** the href from the docs root */
  id: string;
  title: string;
  group: string;
  type: string;
  /** the first words of the document's prose */
  snippet: string;
}

/** what the worker posts */
export type WorkerEvent =
  | { type: 'status'; lexical: LaneState; semantic: LaneState; phase?: string; loaded?: number; total?: number; cached?: boolean; error?: string }
  | { type: 'results'; id: number; text: string; mode: 'lexical' | 'hybrid'; language?: string; hits: SearchHit[]; ms: number }
  | { type: 'error'; id?: number; message: string };

/** what the page posts */
export type PageMessage = { type: 'start'; manifest: string; semantic: boolean } | { type: 'semantic' } | { type: 'search'; id: number; text: string };
