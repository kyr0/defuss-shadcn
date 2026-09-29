/**
 * Why: the shared global-key API - ONE flag-guarded document keydown listener
 * (AGENTS.md "document-level event delegation") that components register
 * handlers into, instead of each hand-rolling its own listener + guard
 * (command, sidebar and presentation all duplicated that pattern). Handlers
 * fire in registration order; a handler returning true stops later handlers
 * for that event.
 *
 * Typing-safe by default: key events aimed at editable elements (inputs,
 * textareas, selects, contenteditable) are NOT dispatched to a handler -
 * typing in a form must never trigger global commands. A handler that needs
 * keys there too (Escape to leave a field, a shortcut that is meaningful in
 * an empty search box) opts in per registration with { editable: true } and
 * then decides itself - `isEditableTarget(event)` tells it where the key
 * came from.
 *
 * Isomorphic-safe: registering before a document exists is a no-op that
 * still returns a working unbind.
 */

export type GlobalKeyHandler = (event: KeyboardEvent) => void | true;

export interface GlobalKeyOptions {
  /** also receive keys typed into inputs / textareas / selects /
   * contenteditable (default false - typing-safe). The handler must then
   * leave ordinary typing alone itself. */
  editable?: boolean;
}

const handlers = new Map<GlobalKeyHandler, GlobalKeyOptions>();
let listening = false;

const isEditable = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target.closest('input, textarea, select, [contenteditable="true"]') !== null);

/** Did this key event come from an editable element (a field being typed in)? */
export const isEditableTarget = (event: Event): boolean => isEditable(event.target);

function onKeydown(event: KeyboardEvent): void {
  const editable = isEditable(event.target);
  // Map iteration survives mid-loop deletes, so a handler may unbind itself
  for (const [handler, opts] of handlers) {
    if (editable && !opts.editable) continue;
    if (handler(event) === true) break;
  }
}

/**
 * Register a global keydown handler. Returns the unbind function. The first
 * registration installs the shared document listener, the last unbind
 * removes it - cheap for components that mount/unmount.
 */
export function bindGlobalKeys(handler: GlobalKeyHandler, options: GlobalKeyOptions = {}): () => void {
  handlers.set(handler, { ...options });
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
