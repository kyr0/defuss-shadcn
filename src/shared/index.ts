/**
 * Why: the defuss-shadcn-shared layer entry (§2.5 of
 * plans/defuss-query-morph-integration.md) — the component-only shared runtime,
 * bundled exactly once into core and installed at df$.shadcn.shared. The
 * export list is explicit and reviewed: every name has actual cross-component
 * consumers (defussGlobals/safeShowPopover) or is the core bootstrap surface
 * (defussQuery/SHARED_ABI) or a general utility consumers bind to (debounce).
 * Docs-only code must never import from here — at runtime it reaches these
 * functions through df$.shadcn.shared instead (verify's `core allow-list` gate
 * enforces the membership).
 */
export { debounce, type Debounced } from './debounce.js';
export { defussGlobals, safeShowPopover } from './state-api.js';
export { defussQuery, RUNTIME_INCOMPLETE, type HostQuery } from './query.js';
export { SHARED_ABI } from './version.js';
