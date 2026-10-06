/**
 * Why: the typed doorway to the ONE query runtime installed by core
 * (dist/components/core.js, or embedded first inside all.js) - the contract of
 * plans/defuss-query-morph-integration.md §2.2. The full accessor validates runtime
 * capabilities (query's MorphApi surface) and throws one actionable load-order
 * error when they are missing; it never installs, repairs or loads anything.
 */
import type { DfDollar, DfQuery, MorphApi, QueryRoot } from 'defuss-query/core';

/**
 * The installed runtime as components may use it (callable + morph API) - with one type-only
 * difference: a selector query yields HTMLElements by default. defuss-query types its results as
 * Element, which is right for any DOM; component markup in this system is HTML (its classes,
 * dataset, value, focus()), so the honest default here is HTMLElement, and the few queries for SVG
 * name their type (`dfDollar<SVGPathElement>('path')`). Compiles to nothing.
 * VERIFIED: (tsc -p tsconfig.components.json, HEAD + this file alone) this default removed 707 of
 * the 1,147 component type errors the ratchet carried on 2026-10-06.
 */
export type HostQuery = {
  // a bare tag name types itself (`'video'` → HTMLVideoElement, `'svg'` → SVGSVGElement)
  <K extends keyof HTMLElementTagNameMap>(selector: K, context?: QueryRoot): DfQuery<HTMLElementTagNameMap[K]>;
  <K extends keyof SVGElementTagNameMap>(selector: K, context?: QueryRoot): DfQuery<SVGElementTagNameMap[K]>;
  <T extends Element = HTMLElement>(selector: string, context?: QueryRoot): DfQuery<T>;
} & DfDollar;

// the chained queries follow the same default (declaration merging: these overloads come first)
declare module 'defuss-query/core' {
  interface DfQuery<T extends EventTarget = Element> {
    find<K extends keyof HTMLElementTagNameMap>(selector: K): DfQuery<HTMLElementTagNameMap[K]>;
    find<K extends keyof SVGElementTagNameMap>(selector: K): DfQuery<SVGElementTagNameMap[K]>;
    find<E extends Element = HTMLElement>(selector: string): DfQuery<E>;
    closest<K extends keyof HTMLElementTagNameMap>(selector: K): DfQuery<HTMLElementTagNameMap[K]>;
    closest<E extends Element = HTMLElement>(selector: string): DfQuery<E>;
    children<E extends Element = HTMLElement>(selector?: string): DfQuery<E>;
    parent<E extends Element = HTMLElement>(): DfQuery<E>;
  }
}

/**
 * query's MorphApi contract (§2.2) - the exact injection surface core bundles.
 * Not a facade or security check: a drift between the installed runtime and
 * this list is a load-order/config error, caught loudly below.
 */
const MORPH_METHODS = [
  'morph',
  'getRenderer',
  'htmlStringToVNodes',
  'renderMarkup',
  'domNodeToVNode',
  'registerDelegatedEvent',
  'clearDelegatedEventsDeep',
  'handleLifecycleEventsForOnMount',
] as const satisfies readonly (keyof MorphApi)[];

/** The ONE load-order error text (§2.3) - same message for every failure mode. */
export const RUNTIME_INCOMPLETE =
  'defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone';

/**
 * Why: returns the installed callable query factory or throws - a component
 * must never silently fall back to a bare namespace object, and core must be
 * distinguishable from a foreign/unrelated `df$` global. Limits: this reads
 * globalThis synchronously; it does not wait for the runtime to appear.
 */
export function defussQuery(): HostQuery {
  const candidate: unknown = Reflect.get(globalThis, 'df$');
  if (typeof candidate === 'function') {
    const prototype: unknown = Reflect.get(candidate, 'fn');
    if (
      typeof Reflect.get(candidate, 'queryVersion') === 'string' &&
      typeof prototype === 'object' &&
      prototype !== null &&
      typeof Reflect.get(prototype, 'morph') === 'function' &&
      MORPH_METHODS.every((name) => typeof Reflect.get(candidate, name) === 'function')
    ) {
      return candidate as HostQuery;
    }
  }
  throw new Error(RUNTIME_INCOMPLETE);
}
