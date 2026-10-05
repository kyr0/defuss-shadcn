/**
 * Why: a tweakcn theme may need RUNTIME resources a stylesheet cannot express
 * - most of the time Google-Fonts <link>s (tweakcn ships them as Next.js
 * `next/font` layout code we deliberately do not have). build.ts publishes
 * each such theme's resources verbatim as `theme/<id>.json` (defuss-JSX-as-
 * JSON VNodes: `{ schema:'v1', links:[{type:'link', attributes:{…}}] }`);
 * this tiny loader is the ONE mechanism every theme UI (the shipped
 * theme-switcher component, the docs switcher, agents via `ddf$`) shares to
 * fetch the sidecar and mount/replace its <link> tags in <head>. Themes
 * without resources ship no sidecar - the 404 is the "nothing to load"
 * answer, not an error. core installs it at df$.shadcn.shared.loadTheme and
 * ddf$.loadTheme.
 */
import { defussQuery } from './query.js';

/** One defuss-JSX-as-JSON resource node (only <link> is loadable). */
export interface ThemeLinkNode {
  type: 'link';
  attributes: Record<string, string>;
  children?: (string | ThemeLinkNode)[];
}

/** The theme sidecar contract (schema v1). */
export interface ThemeLinksFile {
  schema: 'v1';
  links: ThemeLinkNode[];
}

/** Mount marker: our injected links carry [data-df-theme-link]="<theme id>". */
const LINK_ATTR = 'data-df-theme-link';

// Per-id fetch cache: repeated switch-back-and-forth must not re-fetch, and
// concurrent loadTheme calls share one request.
const inflight = new Map<string, Promise<ThemeLinksFile | null>>();

/**
 * Why: resolve a theme's sidecar URL beside the shipped token file - the same
 * base trick themeHref uses (tokens live in theme/utils/, sidecars in theme/),
 * so it survives the docs/ mirror where the token href was rewritten to the
 * jsDelivr CDN and the sidecar resolves to the very same publish point.
 */
function themeJsonHref(id: string): string {
  const $ = defussQuery();
  const tokens = $('#tokens-css').get(0) ?? $('link[href*="default-semantic-tokens.css"]').get(0);
  if (tokens) return new URL(`../${id}.json`, (tokens as HTMLLinkElement).href).href;
  return `${id}.json`;
}

/**
 * Why: validate the sidecar as the CONTRACT, not as vibes - every failure
 * message names the exact JSON path so a theme author repairs it blind. Only
 * resource <link> nodes load (a theme JSON is a first-party file, but
 * executing <script>/<style> from fetched JSON would be a needless escape
 * hatch). Pure: unit-testable without mounting.
 */
export function parseThemeLinks(text: string): ThemeLinksFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new Error(`theme links: invalid JSON - ${e instanceof Error ? e.message : e}`);
  }
  const file = raw as Partial<ThemeLinksFile>;
  if (!file || file.schema !== 'v1')
    throw new Error('theme links: $.schema must be "v1"');
  if (!Array.isArray(file.links)) throw new Error('theme links: $.links must be an array');
  for (const [i, node] of file.links.entries()) {
    if (!node || node.type !== 'link')
      throw new Error(`theme links: $.links[${i}].type must be "link" (got ${JSON.stringify(node && node.type)})`);
    if (!node.attributes || typeof node.attributes !== 'object')
      throw new Error(`theme links: $.links[${i}].attributes must be an object`);
  }
  return { schema: 'v1', links: file.links };
}

/** Why: remove every link this loader mounted (theme switch / 'default'). */
export function clearThemeLinks(): void {
  defussQuery()(`link[${LINK_ATTR}]`).remove();
}

/**
 * Why: mount a parsed sidecar's links, replacing a previously mounted theme's
 * set. Dedup key is (rel, href): a page that already ships the very same font
 * sheet (or a re-apply of the same theme) never double-loads it - duplicate
 * font CSS is wasted bytes and, for some families, a FOUT retrigger.
 */
export function applyThemeLinks(themeId: string, links: ThemeLinkNode[]): void {
  const $ = defussQuery();
  if (!$('#df-theme-links').get(0)) {
    // a marker element keeps "which links are ours" a pure attribute read —
    // clearThemeLinks never needs this map, but mount dedup does
    const marker = document.createElement('template');
    marker.id = 'df-theme-links';
    document.head.append(marker);
  }
  clearThemeLinks();
  for (const node of links) {
    const rel = node.attributes.rel ?? '';
    const href = node.attributes.href ?? '';
    const existing = $(`link[rel="${CSS.escape(rel)}"][href="${CSS.escape(href)}"]`).get(0);
    if (existing) continue; // already present (static page link or earlier mount)
    const link = document.createElement('link');
    for (const [name, value] of Object.entries(node.attributes)) link.setAttribute(name, String(value));
    link.setAttribute(LINK_ATTR, themeId);
    document.head.append(link);
  }
}

/**
 * Why: the single entry point theme UIs call - load (and mount) the resources
 * a theme declares, or clear them for 'default'. Resolves when the mounts are
 * in place; rejects only on a MALFORMED sidecar (fetch/404 mean "no
 * resources" and resolve after clearing, so an offline or theme-less page
 * still switches colors - fonts are progressive enhancement).
 */
export function loadTheme(id: string): Promise<void> {
  if (!id || id === 'default') {
    clearThemeLinks();
    return Promise.resolve();
  }
  let pending = inflight.get(id);
  if (!pending) {
    pending = (async (): Promise<ThemeLinksFile | null> => {
      try {
        const res = await fetch(themeJsonHref(id));
        // 404 (no sidecar = theme without resources) and network/offline
        // failures share one answer: nothing to mount. Only a MALFORMED
        // sidecar escapes as a rejection (a parseThemeLinks throw), so theme
        // authors see contract errors, users never see font errors.
        return res.ok ? parseThemeLinks(await res.text()) : null;
      } catch (e) {
        if (e instanceof SyntaxError || (e instanceof Error && e.message.startsWith('theme links'))) throw e;
        return null;
      }
    })();
    inflight.set(id, pending);
  }
  return pending.then((file) => {
    if (file) applyThemeLinks(id, file.links);
    else clearThemeLinks();
  });
}
