/**
 * Why: the shared global-key API - ONE flag-guarded document keydown listener
 * (AGENTS.md "document-level event delegation") that components register
 * handlers into, instead of each hand-rolling its own listener + guard
 * (command, sidebar and presentation all duplicated that pattern). Handlers
 * fire in registration order; a handler returning true stops later handlers
 * for that event. Key events aimed at editable elements (inputs, textareas,
 * selects, contenteditable) are never dispatched - typing in a form must
 * never trigger global commands.
 *
 * Isomorphic-safe: registering before a document exists is a no-op that
 * still returns a working unbind.
 */

export type GlobalKeyHandler = (event: KeyboardEvent) => void | true;

const handlers = new Set<GlobalKeyHandler>();
let listening = false;

const isEditable = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target.closest('input, textarea, select, [contenteditable="true"]') !== null);

function onKeydown(event: KeyboardEvent): void {
  if (isEditable(event.target)) return;
  // Set iteration survives mid-loop deletes, so a handler may unbind itself
  for (const handler of handlers) {
    if (handler(event) === true) break;
  }
}

/**
 * Register a global keydown handler. Returns the unbind function. The first
 * registration installs the shared document listener, the last unbind
 * removes it - cheap for components that mount/unmount.
 */
export function bindGlobalKeys(handler: GlobalKeyHandler): () => void {
  handlers.add(handler);
  if (!listening && typeof document !== 'undefined') {
    listening = true;
    document.addEventListener('keydown', onKeydown);
  }
  return () => {
    handlers.delete(handler);
    if (handlers.size === 0 && listening) {
      listening = false;
      document.removeEventListener('keydown', onKeydown);
    }
  };
}
