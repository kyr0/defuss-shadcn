import { describe, expect, it } from 'vitest';
import { openDocPage, waitFor } from './helpers.ts';

/**
 * Why: the SPA router swaps only <main>, so the <head> of the page a visitor
 * first loads is the one that persists for the whole session. Any stylesheet
 * or component module the *next* page needs must therefore be adopted during
 * navigation, or that page renders with whatever the previous page happened to
 * import — unstyled markup and dead interactions, visible only when arriving
 * through the sidebar rather than by URL.
 *
 * Every page currently imports every component, so the adoption path is
 * dormant against production markup. These tests remove an asset from the live
 * document first, reproducing the state a page with narrower imports would
 * arrive in, and assert the router puts it back.
 */

const BADGE_CSS = '../components/badge/badge.css';
const ACCORDION_JS = '../components/accordion/accordion.js';

const nav = (doc: Document, href: string): HTMLAnchorElement => {
  const link = doc.querySelector<HTMLAnchorElement>(`.nav-link[href="${href}"]`);
  if (!link) throw new Error(`no sidebar link for ${href}`);
  return link;
};

describe('SPA router asset adoption', () => {
  it('re-adds a stylesheet the incoming page declares but the document lacks', async () => {
    const { doc } = await openDocPage('button.html');

    const link = doc.querySelector<HTMLLinkElement>(`link[rel="stylesheet"][href="${BADGE_CSS}"]`);
    expect(link, 'button.html imports badge.css today').not.toBeNull();
    link!.remove();
    expect(doc.querySelector(`link[rel="stylesheet"][href="${BADGE_CSS}"]`)).toBeNull();

    nav(doc, 'badge.html').click();

    await waitFor(
      () => doc.querySelector(`link[rel="stylesheet"][href="${BADGE_CSS}"]`),
      'badge.css to be adopted during navigation',
    );
    await waitFor(() => doc.querySelector('main .badge'), 'the badge page content');
  });

  it('applies the adopted stylesheet to the swapped-in markup', async () => {
    const { doc } = await openDocPage('button.html');
    doc.querySelector<HTMLLinkElement>(`link[rel="stylesheet"][href="${BADGE_CSS}"]`)!.remove();

    nav(doc, 'badge.html').click();
    await waitFor(() => doc.querySelector('main .preview .badge'), 'the badge page content');

    const badge = doc.querySelector('main .preview .badge')!;
    await waitFor(
      () => doc.defaultView!.getComputedStyle(badge).borderRadius === '9999px',
      'the pill radius from the adopted stylesheet',
    );
  });

  it('does not duplicate assets the document already has', async () => {
    const { doc } = await openDocPage('button.html');
    const count = () => doc.querySelectorAll(`link[rel="stylesheet"][href="${BADGE_CSS}"]`).length;
    expect(count()).toBe(1);

    nav(doc, 'badge.html').click();
    await waitFor(() => doc.querySelector('main .badge'), 'the badge page content');

    expect(count(), 'navigation must not append a second copy').toBe(1);
  });

  it('adopts a component module the incoming page declares', async () => {
    const { doc } = await openDocPage('button.html');

    const script = doc.querySelector<HTMLScriptElement>(`script[type="module"][src="${ACCORDION_JS}"]`);
    expect(script, 'button.html imports accordion.js today').not.toBeNull();
    script!.remove();

    nav(doc, 'accordion.html').click();

    await waitFor(
      () => doc.querySelector(`script[type="module"][src="${ACCORDION_JS}"]`),
      'accordion.js to be adopted during navigation',
    );
  });
});
