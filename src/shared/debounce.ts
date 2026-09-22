/**
 * Why: bursty platform events (pointermove drags, resize, MutationObserver
 * batches, sandbox postMessages) fire faster than the work they trigger can
 * settle; running the work per-event causes visual churn (flicker) and wasted
 * re-layout. The one trailing-edge debounce — later calls within the wait
 * window slide the timer, the work runs once on quiet — is the shared answer,
 * emitted ONCE inside core (like every shared fn) and installed at
 * df$.shadcn.shared.debounce so components, the docs runtime and consumers
 * bind to the same implementation instead of hand-rolling their own.
 */

/** A debounced wrapper carrying its two controls. */
export interface Debounced<A extends unknown[]> {
  /** forward the latest args; resets the wait timer (work runs on quiet) */
  (...args: A): void;
  /** run any pending call NOW (e.g. on drag end — the last state must land) */
  flush(): void;
  /** drop any pending call (e.g. on teardown) */
  cancel(): void;
}

/**
 * Trailing-edge debounce: `fn` runs at most once per `wait` ms, with the MOST
 * RECENT arguments. Returns a wrapper exposing `flush()` (apply a pending call
 * immediately) and `cancel()` (drop it). No leading invocation by design —
 * every consumer here wants "settle, then act", not "act, then rest".
 */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: A | undefined;
  const invoke = (): void => {
    timer = undefined;
    const args = lastArgs;
    lastArgs = undefined;
    if (args) fn(...args);
  };
  const wrapped = (...args: A): void => {
    lastArgs = args; // always keep the freshest args — trailing semantics
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(invoke, wait);
  };
  wrapped.flush = (): void => {
    if (timer === undefined) return;
    clearTimeout(timer);
    invoke();
  };
  wrapped.cancel = (): void => {
    if (timer === undefined) return;
    clearTimeout(timer);
    timer = undefined;
    lastArgs = undefined;
  };
  return wrapped;
}
