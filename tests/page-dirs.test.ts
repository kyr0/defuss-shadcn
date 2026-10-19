import { describe, expect, it } from 'vitest';
import {
  ROOT_PAGE,
  STANDALONE_APPS,
  assetHref,
  docsRoot,
  isPage,
  pageHref,
  pageIds,
  pageLinks,
  pageRel,
  pageUrl,
  pageSection,
  pageSourceRel,
  resolvePageRefs,
  sectionSlug,
  standaloneAppId,
  standaloneDeckId,
  standaloneDocId,
  standaloneSource,
} from '../src/documentation/lib/page-dirs.ts';
import { NAV } from '../src/documentation/lib/nav.ts';

/**
 * Why: src/documentation/lib/page-dirs.ts is the one owner of where a page
 * lives and how pages link, for every script, docs component and gate. Pins
 * the section of each kind of page, the link shapes between them, the asset
 * prefix per depth and the generated standalone page ids - against the real
 * NAV, so a sidebar change that breaks the layout fails here first.
 */

describe('sectionSlug', () => {
  it('turns a sidebar heading into its folder', () => {
    expect(sectionSlug('Forms & Inputs')).toBe('forms-inputs');
    expect(sectionSlug('WYSIWYG Editors')).toBe('wysiwyg-editors');
    expect(sectionSlug('Introduction')).toBe('introduction');
  });
});

describe('pageSection', () => {
  it('places a component page, a guide, a nested child, the root and an unknown id', () => {
    expect(pageSection('badge')).toBe('data-display');
    expect(pageSection('theming')).toBe('guides');
    expect(pageSection('anim-fade')).toBe('guides'); // Animations → Fade: the section's folder, two levels only
    expect(pageSection('installation')).toBe('introduction');
    expect(pageSection(ROOT_PAGE)).toBe('');
    expect(pageSection('no-such-page')).toBeNull();
    expect(isPage('badge')).toBe(true);
    expect(isPage('no-such-page')).toBe(false);
  });

  it('places a generated standalone page beside its source page', () => {
    expect(standaloneSource(standaloneAppId('scaffold-notes'))).toBe('scaffold-notes');
    expect(standaloneAppId('scaffold-notes')).toBe('app-notes');
    expect(pageSection('app-notes')).toBe('application');
    expect(pageSection(standaloneDeckId('system-in-numbers'))).toBe('presentations');
    expect(pageSection(standaloneDocId('paper'))).toBe('papers');
    expect(standaloneSource('badge')).toBeNull();
    for (const app of STANDALONE_APPS) expect(pageSection(app)).toBe('application');
  });

  it('lists every sidebar page once, plus the root and the standalone pages', () => {
    const ids = pageIds();
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('index');
    expect(ids).toContain('badge');
    expect(ids).toContain('app-notes');
    expect(ids).toContain('deck-system-in-numbers');
    expect(ids).toContain('full-paper');
    const navCount = new Set(NAV.flatMap((s) => s.items.flatMap((i) => [i.href, ...(i.children ?? []).map((c) => c.href)]))).size;
    expect(ids.length).toBeGreaterThanOrEqual(navCount);
  });
});

describe('paths and links', () => {
  it('output and source paths carry the section folder; the root page stays at the root', () => {
    expect(pageRel('badge')).toBe('data-display/badge.html');
    expect(pageSourceRel('badge')).toBe('data-display/badge.mdx');
    expect(pageRel('index')).toBe('index.html');
    expect(pageRel('app-notes')).toBe('application/app-notes.html');
    expect(() => pageRel('no-such-page')).toThrow(/no sidebar section/);
    expect(pageUrl('badge')).toBe('https://shadcn.defuss.org/data-display/badge.html');
    expect(pageUrl('index')).toBe('https://shadcn.defuss.org/index.html');
  });

  it('links: inside a section, across sections, from the root, back to the root, with a hash', () => {
    expect(pageHref('badge', 'avatar')).toBe('avatar.html');
    expect(pageHref('badge', 'button')).toBe('../actions/button.html');
    expect(pageHref('index', 'button')).toBe('actions/button.html');
    expect(pageHref('button', 'index')).toBe('../index.html');
    expect(pageHref('index', 'index')).toBe('index.html');
    expect(pageHref('badge', 'button', '#variants')).toBe('../actions/button.html#variants');
    expect(pageHref('scaffold-notes', 'app-notes')).toBe('app-notes.html');
    expect(pageHref('index', 'deck-system-in-numbers')).toBe('presentations/deck-system-in-numbers.html');
    expect(() => pageHref('badge', 'no-such-page')).toThrow(/no sidebar section/);
  });

  it('resolvePageRefs: page ids, root assets and dist siblings follow the page folder; everything else passes', () => {
    const html =
      '<a href="button.html#variants">b</a><a href="badge.html">x</a><link rel="stylesheet" href="css/layout.css"><script src="../components/all.js"></script>' +
      '<a href="https://x.y/badge.html">e</a><a href="#top">t</a><a href="../schemas/badge.schema.json">s</a><iframe src="deck-system-in-numbers.html"></iframe>' +
      '<pre>&lt;a href="button.html"&gt;</pre><a href="no-such.html">dead</a>';
    expect(resolvePageRefs(html, 'data-display/badge.html')).toBe(
      '<a href="../actions/button.html#variants">b</a><a href="badge.html">x</a><link rel="stylesheet" href="../css/layout.css"><script src="../../components/all.js"></script>' +
        '<a href="https://x.y/badge.html">e</a><a href="#top">t</a><a href="../../schemas/badge.schema.json">s</a><iframe src="../presentations/deck-system-in-numbers.html"></iframe>' +
        '<pre>&lt;a href="button.html"&gt;</pre><a href="no-such.html">dead</a>',
    );
    // the root page: ids gain their folder, assets stay
    expect(resolvePageRefs('<a href="button.html">b</a><link href="css/x.css">', 'index.html')).toBe('<a href="actions/button.html">b</a><link href="css/x.css">');
  });

  it('pageLinks: an example\'s page ids map to their paths from the docs root; other links and escaped samples stay out', () => {
    const html =
      '<a href="paper.html" target="_blank">r</a><a href="button.html#variants">b</a><iframe src="deck-system-in-numbers.html"></iframe>' +
      '<a href="https://x.y/badge.html">e</a><a href="no-such.html">dead</a><img src="images/x.png"><pre>&lt;a href="badge.html"&gt;</pre>';
    expect(pageLinks(html)).toEqual({
      'paper.html': 'papers/paper.html',
      'button.html#variants': 'actions/button.html#variants',
      'deck-system-in-numbers.html': 'presentations/deck-system-in-numbers.html',
    });
    expect(pageLinks('<p>no links</p>')).toEqual({});
  });

  it('assets: one level up from a section page, none from the root', () => {
    expect(docsRoot('index')).toBe('');
    expect(docsRoot('badge')).toBe('../');
    expect(assetHref('badge', 'css/layout.css')).toBe('../css/layout.css');
    expect(assetHref('badge', '../components/all.css')).toBe('../../components/all.css');
    expect(assetHref('index', '../components/all.css')).toBe('../components/all.css');
  });
});
