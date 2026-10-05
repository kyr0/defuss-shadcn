import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { walk } from './audit.ts';

/**
 * Why: GitHub Pages publishes ./docs, which must contain ONLY the
 * documentation site (dist/documentation/* + the SEO files), not a copy of
 * the whole dist/ tree. The pages still reference `../components/…` and
 * `../theme/…`, so the mirror rewrites those two prefixes to the jsDelivr
 * GitHub CDN - PINNED to the release the snapshot documents (`@vX.Y.Z`),
 * never `@latest`: `@latest` answers with a 7-day browser cache (a purge
 * only clears jsDelivr's edge), so visitors kept the previous release's
 * all.css / all.js for days, and pages published from main between
 * releases referenced components the latest tag did not have yet. docs/ is
 * therefore a RELEASE snapshot: sync-docs.ts republishes it only when the
 * version changes (deploy.sh) and stamps docs/release.json; verify.ts checks
 * the stamp and the pinning with this module.
 */

/** Published Pages root: docs/ files sit at the site root, so the
 *  `…/documentation/…` URLs baked into og:url/sitemap lose their prefix. */
export const PAGES_BASE = 'https://kyr0.github.io/defuss-shadcn';
/** jsDelivr GitHub root of the repo (no version). */
export const CDN_REPO = 'https://cdn.jsdelivr.net/gh/kyr0/defuss-shadcn';
/** @latest (newest tag) - what README's quick start shows consumers and
 *  what purge-cdn.ts refreshes; never used by the docs snapshot. */
export const CDN_BASE = `${CDN_REPO}@latest/dist`;
/** The immutable, release-pinned asset root the docs snapshot loads from. */
export const cdnBase = (version: string): string => `${CDN_REPO}@v${version}/dist`;
/** The version in package.json - the release a snapshot is published for. */
export const packageVersion = (root: string): string =>
  (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string }).version;
/** docs/release.json - the stamp of the release the snapshot belongs to. */
export const RELEASE_STAMP = 'release.json';

/**
 * Live reference to a dist sibling in an HTML tag - a real element attribute,
 * NOT an escaped code sample (`<link href="../…` shows consumers the
 * dist-relative path and must stay verbatim). [^>] cannot span two tags, and
 * escaped samples never contain a literal `<tag`.
 */
const LIVE_REF =
  /(<(?:a|link|script|img|iframe|source|span)\b[^>]*?(?:href|src|data-spec-href)=")\.\.\/(components|theme|apps)\//g;

/**
 * Mirror rewrite for one text file: live `../components/…`, `../theme/…` and
 * `../apps/…` (the full-screen scaffolds' own bundles)
 * attributes → CDN (the docs tree no longer carries those siblings), and the
 * published page URLs drop the `/documentation/` path segment (docs/ IS the
 * site root now). Escaped code samples keep their dist-relative paths.
 */
export function mirrorTransform(text: string, version: string): string {
  return text
    .replace(LIVE_REF, `$1${cdnBase(version)}/$2/`)
    .replaceAll(`${PAGES_BASE}/documentation/`, `${PAGES_BASE}/`);
}

/** GitHub Pages serves a blank page for unknown URLs unless a 404.html exists. */
const NOT_FOUND_PAGE = '404.html';

/** Files mirrored from dist/ into docs/ (documentation tree + SEO files). */
export function mirrorFiles(dist: string): Array<{ src: string; rel: string }> {
  const DOC = join(dist, 'documentation');
  const files = walk(DOC, ['']).map((f) => ({ src: f, rel: relative(DOC, f) }));
  for (const name of ['robots.txt', 'sitemap.xml']) {
    files.push({ src: join(dist, name), rel: name });
  }
  // 404 fallback: same transformed index.html so GitHub Pages never shows an
  // empty page for a dead link (Pages serves 404.html with a 404 status).
  if (!files.some((f) => f.rel === NOT_FOUND_PAGE)) {
    files.push({ src: join(DOC, 'index.html'), rel: NOT_FOUND_PAGE });
  }
  return files;
}

/** Live CDN asset references in a published page that are NOT pinned to
 * `version` (`@latest`, another tag, a commit) - the snapshot gate. */
export function unpinnedRefs(html: string, version: string): string[] {
  const out: string[] = [];
  const re = /<(?:a|link|script|img|iframe|source|span)\b[^>]*?(?:href|src|data-spec-href)="(https:\/\/cdn\.jsdelivr\.net\/gh\/kyr0\/defuss-shadcn@([^/"]+)\/dist\/[^"]*)"/g;
  for (const m of html.matchAll(re)) if (m[2] !== `v${version}`) out.push(m[1]);
  return out;
}
