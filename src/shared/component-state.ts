/**
 * Why: every JS component's State API, built once (AGENTS.md "State API" +
 * "State through stores"). A component declares its states and the DOM side
 * of a state; componentState() returns the registry API ({name}Api) and
 * bindComponent() gives each element its own defuss-store store:
 *
 * - `el.store` holds `{ name, config }` - the element's state. Anything can
 *   subscribe; writing it (`el.store.set({ name: 'open', config: {} })`)
 *   applies the state like setState does.
 * - `el.api` = setState / getState / render, the established contract.
 * - The store follows what happens WITHOUT setState too: clicks, native
 *   closes, legacy code writing data-state-name - read back through the
 *   component's read() (or data-state-name), on its events and on attribute
 *   changes, coalesced into a microtask, and synchronously in getState().
 * - data-state-name mirrors the store's state name on the element.
 *
 * Emitted once inside core; components bind through df$.shadcn.shared.
 */
import { createStore } from 'defuss-store';
import type { Store } from 'defuss-store';
import { elementModel, renderModel } from './render.js';
import type { ElementModel } from './render.js';

/** A component's state: the declared name + its config. */
export interface ComponentState {
  name: string;
  config: Record<string, unknown>;
}

export interface StateSpec<E extends HTMLElement = HTMLElement> {
  /** the component's name, for errors */
  component: string;
  /** declared state names, 'default' first */
  states: readonly string[];
  /** the DOM side of a state (triggerStateChange); may return a promise.
   *  `incoming`: the config as passed - with mergeConfig, state.config is
   *  the merged one and one-shot keys (a scroll target) read `incoming` */
  apply(el: E, state: ComponentState, previous: ComponentState, incoming: Record<string, unknown>): unknown;
  /** the state the element shows NOW - when the user or the page can change
   *  it without setState (default: data-state-name + the stored config) */
  read?(el: E, state: ComponentState): ComponentState;
  /** a state's markup on a detached copy of the authored markup (render) */
  markup?(el: E, state: ComponentState & { model?: import('./render.js').ElementModel }): void;
  /** events on the element after which the state is read back */
  events?: readonly string[];
  /** merge a setState config into the stored one (default: replace) */
  mergeConfig?: boolean;
}

/**
 * VERIFIED: (every JS component's e2e - assertRenderContract) setState, getState,
 * render and el.store behave as documented here on every fixture instance.
 *
 * The registry-level State API (`df$.shadcn.{name}Api`): the element is passed
 * explicitly. The API docs specialize `name` and `config` per component (its
 * state names and its StateConfigs map).
 */
export interface ComponentApi<E extends HTMLElement = HTMLElement> {
  /**
   * Enter a state: the DOM work runs (also when it is the current state), the store records it.
   * @param el - the component's element
   * @param name - a declared state (an unknown name throws)
   * @param config - that state's config (merged into the stored one when the component merges)
   * @returns what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled())
   */
  setState(el: E, name: string, config?: Record<string, unknown>): unknown;
  /**
   * The state the element shows now - read back from the DOM, so it includes what the user changed.
   * @param el - the component's element
   * @returns the state's name, its config and the authored markup model render() starts from
   */
  getState(el: E): ComponentState & { model?: ElementModel };
  /**
   * The element's markup in a state - the authored markup with that state applied; a pure function of the state.
   * @param state - a state as getState() returns it (with its model)
   * @returns the element's outer HTML in that state
   */
  render(state: ComponentState & { model?: ElementModel }): string;
  /**
   * The element's store (bindComponent made it).
   * @param el - the component's element
   * @returns a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component
   */
  store(el: E): Store<ComponentState>;
  /**
   * Record a state the element reached on its own (no DOM work) - for a component's own handlers.
   * @param el - the component's element
   * @param name - the state it is in
   * @param config - its config
   */
  commit(el: E, name: string, config?: Record<string, unknown>): void;
}

/**
 * The per-element State API (`el.api`) bindComponent puts on every element -
 * the registry's methods with the element bound. The API docs specialize
 * `name` and `config` per component.
 */
export interface ElementStateApi {
  /**
   * Enter a state: the DOM work runs (also when it is the current state), the store records it.
   * @param name - a declared state (an unknown name throws)
   * @param config - that state's config (merged into the stored one when the component merges)
   * @returns what the state's DOM work returned - a Promise for an async state (or await settled())
   */
  setState: (name: string, config?: Record<string, unknown>) => unknown;
  /**
   * The state the element shows now - read back from the DOM, so it includes what the user changed.
   * @returns the state's name, its config and the authored markup model render() starts from
   */
  getState: () => ComponentState & { model?: ElementModel };
  /**
   * The element's markup in a state - the authored markup with that state applied; a pure function of the state.
   * @param state - a state as getState() returns it (default: the current one)
   * @returns the element's outer HTML in that state
   */
  render: (state?: ComponentState & { model?: ElementModel }) => string;
  /**
   * Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting).
   * @returns resolves when nothing is pending
   */
  settled: () => Promise<void>;
}

type Entry = { store: Store<ComponentState>; model: ElementModel; recorded: WeakSet<ComponentState>; spec: StateSpec<HTMLElement>; queued: boolean; observer?: MutationObserver; unlisten?: () => void; pending?: Promise<unknown>; bound?: unknown };
const entries = new WeakMap<Element, Entry>();

/** name + JSON-equal config: no notification for a re-read of the same state */
function sameState(a: ComponentState, b: ComponentState): boolean {
  if (a === b) return true;
  if (!a || !b || a.name !== b.name) return false;
  try {
    return JSON.stringify(a.config) === JSON.stringify(b.config);
  } catch {
    return a.config === b.config;
  }
}

/** the element's entry - the registry API binds an element on first use, as
 *  it always worked on any element (a menu opened by code, no trigger) */
function entryOf<E extends HTMLElement>(el: E, api: ComponentApi<E>): Entry {
  const entry = entries.get(el);
  if (entry) return entry;
  bindComponent(el, api);
  return entries.get(el)!;
}

/**
 * A commit that only RECORDS a state (the DOM already shows it). Tagged by
 * identity, not by a "quiet" flag: defuss-store delivers a commit made inside
 * a listener AFTER that listener returns - a flag would be long reset by then
 * and the record would replay as an outside write (two states ping-ponging).
 */
function quietly(entry: Entry, next: ComponentState): void {
  entry.recorded.add(next);
  entry.store.set(next);
}

/**
 * Run the state's DOM work and record where it LANDED: a component that
 * names its own landing state writes data-state-name (a timer asked for
 * 'default' reports 'running') - seen in the observer's records, even when
 * the value did not change.
 */
function applyAndRecord(el: HTMLElement, entry: Entry, next: ComponentState, previous: ComponentState, incoming: Record<string, unknown> = next.config): unknown {
  entry.observer?.takeRecords();
  const result = entry.spec.apply(el, next, previous, incoming);
  const named = entry.observer?.takeRecords().some((r) => r.attributeName === 'data-state-name') && el.dataset.stateName;
  quietly(entry, named && entry.spec.states.includes(named) ? { name: named, config: next.config } : { ...next });
  // an async state (a diagram renders): settled() waits for it, then reads back
  if (result && typeof (result as Promise<unknown>).then === 'function') {
    const pending = Promise.resolve(result).then(
      () => { if (entries.get(el) === entry) sync(el, entry); },
      () => { if (entries.get(el) === entry) sync(el, entry); },
    );
    entry.pending = pending;
  }
  return result;
}

/** read the element's state back into its store */
function sync(el: HTMLElement, entry: Entry): void {
  const current = entry.store.value;
  const read = entry.spec.read
    ? entry.spec.read(el, current)
    : { name: el.dataset.stateName || current.name, config: current.config };
  if (!sameState(read, current)) quietly(entry, read);
}

export function componentState<E extends HTMLElement = HTMLElement>(spec: StateSpec<E>): ComponentApi<E> {
  const validate = (name: string): void => {
    if (!spec.states.includes(name)) {
      throw new Error(`${spec.component}: unknown state "${name}" (supported: ${spec.states.join(', ')})`);
    }
  };
  const api: ComponentApi<E> = {
    setState(el, name, config = {}) {
      validate(name);
      const entry = entryOf(el, api);
      const previous = entry.store.value;
      const next = { name, config: spec.mergeConfig ? { ...previous.config, ...config } : config };
      // the DOM work runs on EVERY setState - re-entering a state re-applies it
      const result = applyAndRecord(el as unknown as HTMLElement, entry, next, previous, config);
      // the state it landed in (a state machine may move on by itself)
      sync(el as unknown as HTMLElement, entry);
      return result;
    },
    getState(el) {
      const entry = entryOf(el, api);
      sync(el as unknown as HTMLElement, entry);
      return { ...entry.store.value, model: entry.model };
    },
    render(state) {
      return renderModel(state.model!, (copy) => spec.markup?.(copy as E, state));
    },
    store(el) {
      return entryOf(el, api).store;
    },
    commit(el, name, config) {
      validate(name);
      const entry = entryOf(el, api);
      const next = { name, config: config ?? entry.store.value.config };
      if (!sameState(next, entry.store.value)) quietly(entry, next);
    },
  };
  (api as { spec?: StateSpec<E> }).spec = spec;
  return api;
}

/**
 * Undo bindComponent (a component's destroy()): no more read-back, the store
 * is destroyed (its subscribers are dropped), el.store / el.api go away.
 */
export function unbindComponent(el: Element): void {
  const entry = entries.get(el);
  if (!entry) return;
  entries.delete(el);
  entry.observer?.disconnect();
  entry.unlisten?.();
  entry.store.destroy();
  const host = el as unknown as { store?: unknown; api?: unknown };
  if (host.store === entry.store) delete host.store;
}

/**
 * Bind `el` to its component: snapshot the authored markup (render()), make
 * its store (initial: `initial`, else 'default' / {}), wire the read-back and
 * set `el.store` + `el.api`. Returns the per-element api.
 */
export function bindComponent<E extends HTMLElement>(
  el: E,
  api: ComponentApi<E>,
  initial?: ComponentState,
): ElementStateApi {
  const spec = (api as unknown as { spec: StateSpec<HTMLElement> }).spec;
  // bound already (a menu two triggers share): one store per element
  const known = entries.get(el);
  if (known?.bound) return known.bound as ReturnType<typeof bindComponent>;
  // the state the element already names (data-state-name), else 'default'
  const start = initial ?? { name: (el as unknown as HTMLElement).dataset.stateName || 'default', config: {} };
  const store = createStore<ComponentState>(start, { equals: sameState });
  const entry: Entry = { store, model: elementModel(el), recorded: new WeakSet(), spec, queued: false };
  entries.set(el, entry);
  const host = el as unknown as HTMLElement;
  // the name on the element, for CSS hooks and observers
  store.subscribe(
    (next, previous) => {
      if (host.dataset.stateName !== next.name) host.dataset.stateName = next.name;
      if (!previous || entry.recorded.has(next)) return;
      // an outside write (el.store.set): apply it like setState - unless a
      // later commit already superseded it (the store drains in order)
      if (store.value !== next) return;
      if (!spec.states.includes(next.name)) throw new Error(`${spec.component}: unknown state "${next.name}"`);
      applyAndRecord(host, entry, next, previous);
      sync(host, entry);
    },
    { immediate: true },
  );
  // read-back: the component's events and attribute changes, one microtask later
  const later = (): void => {
    if (entry.queued) return;
    entry.queued = true;
    queueMicrotask(() => {
      entry.queued = false;
      if (entries.get(el) === entry && !store.destroyed) sync(host, entry);
    });
  };
  for (const type of spec.events ?? []) host.addEventListener(type, later);
  entry.unlisten = () => {
    for (const type of spec.events ?? []) host.removeEventListener(type, later);
  };
  entry.observer = new MutationObserver((records) => {
    if (records.some((r) => r.attributeName !== 'data-init')) later();
  });
  entry.observer.observe(host, { attributes: true, subtree: true });
  const bound = {
    setState: (name: string, config?: Record<string, unknown>) => api.setState(el, name, config),
    getState: () => api.getState(el),
    render: (state?: ComponentState & { model?: ElementModel }) => api.render(state ?? api.getState(el)),
    /** resolves once the last state's DOM work is done (async states) */
    settled: async (): Promise<void> => {
      let seen: Promise<unknown> | undefined;
      while (entry.pending && entry.pending !== seen) {
        seen = entry.pending;
        await seen;
      }
    },
  };
  entry.bound = bound;
  Object.assign(el, { api: bound, store });
  return bound;
}
