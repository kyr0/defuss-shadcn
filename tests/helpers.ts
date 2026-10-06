import { page, userEvent } from 'vitest/browser';

/**
 * Why: Vitest browser mode has no `page.goto()` - tests run inside a fixed
 * iframe. Loading the real documentation pages as a *same-origin* child iframe
 * is the supported way to drive the actual site UI end-to-end. Same-origin also
 * lets us read `iframe.contentDocument` directly for state assertions, while
 * interactions go through `page.frameLocator()` locators (trusted input).
 */

/** Why: Vitest's server root is the repo root, so the real pages are under dist/. */
const DOC_BASE = '/dist/documentation';
/** Milliseconds between `waitFor` polls. */
const POLL_MS = 50;
/** Default timeout for iframe page loads (CDN scripts included). */
const LOAD_TIMEOUT_MS = 15000;

/** 3 on CI, 1 locally - vitest.config.ts defines it (hang guards scale with the machine) */
declare const __TIMEOUT_SCALE__: number;

export async function waitFor(predicate: () => unknown, label: string, timeout = 5000): Promise<void> {
  const start = Date.now();
  const limit = timeout * __TIMEOUT_SCALE__;
  while (!predicate()) {
    if (Date.now() - start > limit) throw new Error(`Timed out waiting for ${label}`);
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

/**
 * Loads a documentation page (`dist/documentation/<name>`) in a fresh
 * same-origin iframe and resolves once it fully loaded (module scripts ran).
 * Returns `frame` for interactions and `doc` for direct state assertions.
 */
export async function openDocPage(name: string): Promise<{
  el: HTMLIFrameElement;
  frame: ReturnType<typeof page.frameLocator>;
  doc: Document;
}> {
  document.body.innerHTML = ''; // ensure only one iframe at a time
  const el = document.createElement('iframe');
  el.setAttribute(
    'style',
    'position:fixed;inset:0;width:100%;height:100%;border:0;background:#fff',
  );
  el.src = `${DOC_BASE}/${name}`;
  document.body.appendChild(el);
  // The initial about:blank document is already "complete" and can even fire a
  // load event before the real navigation, so poll the actual location instead
  // until the iframe shows our page with all scripts executed.
  await waitFor(
    () =>
      el.contentWindow?.location.pathname.endsWith(`/${name}`) &&
      el.contentWindow.document.readyState === 'complete',
    `${name} to load`,
    LOAD_TIMEOUT_MS,
  );
  // same-origin: contentWindow survives navigation, keeps a live handle
  const contentWindow = el.contentWindow as Window;
  return { el, frame: page.frameLocator(page.elementLocator(el)), doc: contentWindow.document };
}

/**
 * Why: Vitest's FrameLocator only exposes getBy* queries (no CSS/nth), but
 * doc pages repeat visible text in code snippets. `userEvent.click` accepts a
 * raw Element, so CSS-selected nodes from `doc` can still be clicked with
 * real, trusted Playwright input.
 */
export async function clickSelector(doc: Document, css: string): Promise<void> {
  await waitFor(() => doc.querySelector(css), `element "${css}" to exist`);
  await userEvent.click(doc.querySelector(css) as Element);
}
