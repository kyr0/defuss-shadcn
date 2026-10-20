import { NAV, flattenNav } from './nav.ts';
/**
 * Why: one layout for every tree that maps to the sidebar. Components live in
 * src/components/<section>/<name>/ (component-dirs.ts); the doc pages, their
 * rendered output, the e2e tests and the app bundles follow the SAME section
 * folders - pages/<section>/<slug>.mdx renders to <section>/<slug>.html, the
 * site root keeps only index.html and the asset folders. This module is the
 * one owner of "where does a page live and how do two pages link": every
 * script, docs component, runtime hint and verify gate asks here instead of
 * joining `${slug}.html` itself. The section of a page is the slug of the
 * sidebar section that lists it (nav.ts), exactly as for a component. Pure
 * (no fs) so the browser-mode unit tests can pin it; the fs half is
 * page-dirs-files.ts.
 *
 * VERIFIED: (tests/page-dirs.test.ts) the section of every kind of page, the
 * three link shapes (same section, other section, from and to the root), the
 * asset prefix per depth and the ids of the generated standalone pages.
 */
/** `Forms & Inputs` → `forms-inputs` - the section folder of components, pages, tests. */
export function sectionSlug(heading) {
    return heading.toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
/** The site root page: the only page outside a section folder. */
export const ROOT_PAGE = 'index';
/**
 * Pages whose example fence ALSO renders chrome-free beside them
 * (scripts/build-docs.ts writes the file next to the page): a deck as
 * deck-<slug>.html (framed by the Getting Started rail), a scaffold as
 * app-<name>.html (full screen, on its own bundle), a document as
 * full-<slug>.html (full screen, on the whole system). One list each, shared
 * by the producer, the docs components that link them and verify.
 */
export const STANDALONE_DECKS = ['system-in-numbers'];
export const STANDALONE_APPS = [
    'scaffold-admin-dashboard',
    'scaffold-messenger',
    'scaffold-issue-tracker',
    'scaffold-notes',
    'scaffold-status-page',
    'scaffold-desktop',
    'scaffold-document-editor',
];
/** the Website templates: a site needs an address to route - their full-screen page is where the router owns one
 *  (a docs card is an about:srcdoc frame - the Client-side Routing guide) */
export const WEBSITE_TEMPLATES = [
    'website-landing-page',
    'website-news',
    'website-blog',
    'website-article',
    'website-comments',
    'website-company',
    'website-events-promotions',
    'website-media',
    'website-shop',
    'website-account-states',
    'website-docs-help',
    'website-search-navigation',
];
export const STANDALONE_DOCS = ['paper', 'letter', 'invoice', 'studio', ...WEBSITE_TEMPLATES];
/** The app name of a scaffold page slug (`scaffold-messenger` → `messenger`) - its bundle is dist/apps/<name>/. */
export const appName = (slug) => slug.replace(/^scaffold-/, '');
/** The ids (file stems) of the generated standalone pages. */
export const standaloneDeckId = (slug) => `deck-${slug}`;
export const standaloneAppId = (slug) => `app-${appName(slug)}`;
export const standaloneDocId = (slug) => `full-${slug}`;
/** The page a standalone id was generated from, or null for an ordinary page id. */
export function standaloneSource(id) {
    const deck = STANDALONE_DECKS.find((s) => standaloneDeckId(s) === id);
    if (deck)
        return deck;
    const app = STANDALONE_APPS.find((s) => standaloneAppId(s) === id);
    if (app)
        return app;
    const doc = STANDALONE_DOCS.find((s) => standaloneDocId(s) === id);
    return doc ?? null;
}
/** every nav href → the slug of its section, computed once */
const SECTION_OF = new Map();
for (const s of NAV)
    for (const i of flattenNav(s.items))
        SECTION_OF.set(i.href.replace(/\.html$/, ''), sectionSlug(s.heading));
/** The section folder of a page id ('' for the root page), null when no sidebar section lists it. */
export function pageSection(id) {
    if (id === ROOT_PAGE)
        return '';
    const source = standaloneSource(id);
    return SECTION_OF.get(source ?? id) ?? null;
}
/** True for a page id the sidebar lists, the root page, or a generated standalone page. */
export const isPage = (id) => pageSection(id) !== null;
/** Every page id the site renders: the sidebar's pages, the root, the standalone pages. */
export function pageIds() {
    const ids = [ROOT_PAGE, ...SECTION_OF.keys()].filter((s, i, a) => a.indexOf(s) === i);
    return [
        ...ids,
        ...STANDALONE_DECKS.map(standaloneDeckId),
        ...STANDALONE_APPS.map(standaloneAppId),
        ...STANDALONE_DOCS.map(standaloneDocId),
    ];
}
/** The output path of a page from the docs root: `data-display/badge.html`, `index.html`. Throws on an unknown id. */
export function pageRel(id) {
    const section = pageSection(id);
    if (section === null)
        throw new Error(`page-dirs: no sidebar section lists "${id}.html" (lib/nav.ts)`);
    return section ? `${section}/${id}.html` : `${id}.html`;
}
/** The source path of a page from pages/: `data-display/badge.mdx`. */
export const pageSourceRel = (slug) => pageRel(slug).replace(/\.html$/, '.mdx');
/** The prefix that reaches the docs root from a page: '' at the root, '../' inside a section. */
export const docsRoot = (id) => (pageSection(id) ? '../' : '');
/** The published site root (docs/CNAME): docs/ serves dist/documentation/ at the domain root, so a page's
 *  public URL is SITE_BASE + its docs-root-relative path - no `/documentation/` segment. */
export const SITE_BASE = 'https://shadcn.defuss.org';
/** The public URL of a page: `https://shadcn.defuss.org/data-display/badge.html`. */
export const pageUrl = (id) => `${SITE_BASE}/${pageRel(id)}`;
/**
 * The relative href from one page to another: `badge.html` inside one
 * section, `../data-display/badge.html` across sections, `data-display/badge.html`
 * from the root, `../index.html` back to it. `hash` keeps a `#fragment`.
 */
export function pageHref(from, to, hash = '') {
    const fromSection = pageSection(from);
    if (fromSection === null)
        throw new Error(`page-dirs: no sidebar section lists "${from}.html" (lib/nav.ts)`);
    const toRel = pageRel(to);
    const toSection = pageSection(to) ?? '';
    const href = !fromSection ? toRel : toSection === fromSection ? `${to}.html` : `../${toRel}`;
    return href + hash;
}
/** A docs asset (`css/layout.css`) or a dist sibling (`../components/all.css`) from a page. */
export const assetHref = (from, path) => `${docsRoot(from)}${path}`;
/**
 * Resolve a rendered page's links and asset references from its folder.
 * Authors, nav.ts and the docs components write page ids (`href="badge.html"`)
 * and root-relative assets (`css/layout.css`, a download in `files/`, `../components/all.css`); this
 * turns them into the path from the page at `outputFile` (docs-root-relative):
 * `../data-display/badge.html`, `../css/layout.css`. Real tags only - an
 * escaped sample (`&lt;a href=`) and a fence's shown source keep their text.
 * `http(s):`, `#`, `mailto:`, `about:` and already-relative (`../x`, `./x`,
 * `/x`) values pass through. The SSG runs it on every page (lib/plugins.ts),
 * build-docs.ts on the standalone pages it writes itself.
 * VERIFIED: (verify `page links resolve` + `cross-page imports`) every link
 * and asset in every rendered page resolves from its folder.
 */
// a video's captions (<track src>) too - VERIFIED: full-website-media.html asked videos/demo.en.vtt of its own folder (404)
const LINK_ATTR = /(<(?:a|iframe|link|script|img|source|track|video|audio|form|use)\b[^>]*?\s(?:href|src|action|poster)=")([^"]*)(")/g;
const ASSET_ROOTS = /^(?:css|js|fonts|images|videos|templates|files)\//;
export function resolvePageRefs(html, outputFile) {
    const id = outputFile.replace(/\\/g, '/').replace(/^.*\//, '').replace(/\.html$/, '');
    return html
        .replace(LINK_ATTR, (whole, open, value, close) => {
        if (/^(?:[a-z][a-z0-9+.-]*:|#|\/|\.\.?\/)/i.test(value))
            return whole;
        const page = pageTarget(value);
        if (page)
            return `${open}${pageHref(id, page[0], page[1])}${close}`;
        if (ASSET_ROOTS.test(value))
            return `${open}${assetHref(id, value)}${close}`;
        return whole;
    })
        .replace(/(\s(?:href|src)=")(\.\.\/(?:components|theme|apps|schemas)\/)/g, (_m, open, path) => `${open}${assetHref(id, path)}`);
}
/** A link value that names a page by its id (`button.html#variants`): [id, its `#` / `?` part], else null. */
function pageTarget(value) {
    const page = value.match(/^([a-z0-9-]+)\.html((?:[#?].*)?)$/);
    return page && isPage(page[1]) ? [page[1], page[2]] : null;
}
/**
 * The page links of an example's source, as a map from what the author wrote
 * to the page's path from the docs root: `{ "paper.html": "papers/paper.html" }`.
 * An example card shows and runs its source as written, in a preview whose
 * base is the docs root (runtime/code-example.ts) - there a page id names a
 * file that does not exist. CodeExample hands this map to the card as
 * `data-links`: the preview uses the paths, the source keeps the ids. Same
 * tags and ids as resolvePageRefs.
 * VERIFIED: (code-example-docs.e2e) the flagship deck card's report link and
 * the Teaser card's embedded deck load their pages.
 */
export function pageLinks(html) {
    const links = {};
    for (const m of html.matchAll(LINK_ATTR)) {
        const page = pageTarget(m[2]);
        if (page)
            links[m[2]] = pageRel(page[0]) + page[1];
    }
    return links;
}
//# sourceMappingURL=page-dirs.js.map