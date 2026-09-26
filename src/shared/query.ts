/**
 * Why: the typed doorway to the ONE query runtime installed by core
 * (dist/components/core.js, or embedded first inside all.js) - the contract of
 * plans/defuss-query-morph-integration.md §2.2. The full accessor validates runtime
 * capabilities (query's MorphApi surface) and throws one actionable load-order
 * error when they are missing; it never installs, repairs or loads anything.
 */
import type { DfDollar, MorphApi } from 'defuss-query/core';

/** The installed runtime as components may use it (callable + morph API). */
export type HostQuery = DfDollar;

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
  'removeDelegatedEvent',
  'getRegisteredEventTypes',
  'clearDelegatedEventsDeep',
  'clearDelegatedEvents',
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
