import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { walk } from './audit.ts';

/**
 * Why: GitHub Pages publishes ./docs, which must contain ONLY the
 * documentation site (dist/documentation/* + the SEO files), not a copy of
 * the whole dist/ tree. The pages still reference `../components/…` and
 * `../theme/…`, so the mirror rewrites those two prefixes to the jsDelivr
 * GitHub CDN - the same public URLs the documentation itself recommends for
 * consumers (see es-modules.html). Both sync-docs.ts and verify.ts use this
 * module so the "docs mirror fresh" gate compares against exactly what the
 * sync produces.
 */

/** Published Pages root: docs/ files sit at the site root, so the
 *  `…/documentation/…` URLs baked into og:url/sitemap lose their prefix. */
export const PAGES_BASE = 'https://kyr0.github.io/defuss-shadcn';
/** Component assets (CSS/JS/skills/themes) resolve here from the Pages root.
 *  @latest = newest git tag (deploy.sh creates one per release; jsDelivr
 *  falls back to the default-branch commit while no tags exist). */
export const CDN_BASE = 'https://cdn.jsdelivr.net/gh/kyr0/defuss-shadcn@latest/dist';

/** Text files whose contents get rewritten; everything else copies verbatim. */
const TRANSFORMED = /\.(html|xml)$/;

/**
 * Live reference to a dist sibling in an HTML tag - a real element attribute,
 * NOT an escaped code sample (`<link href="../…` shows consumers the
 * dist-relative path and must stay verbatim). [^>] cannot span two tags, and
 * escaped samples never contain a literal `<tag`.
 */
const LIVE_REF =
  /(<(?:a|link|script|img|iframe|source|span)\b[^>]*?(?:href|src|data-spec-href)=")\.\.\/(components|theme)\//g;

/**
 * Mirror rewrite for one text file: live `../components/…` + `../theme/…`
 * attributes → CDN (the docs tree no longer carries those siblings), and the
 * published page URLs drop the `/documentation/` path segment (docs/ IS the
 * site root now). Escaped code samples keep their dist-relative paths.
 */
export function mirrorTransform(text: string): string {
  return text
    .replace(LIVE_REF, `$1${CDN_BASE}/$2/`)
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

/** SHA-256 of each file exactly as the mirror would write it to docs/. */
export function mirrorHashes(dist: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const { src, rel } of mirrorFiles(dist)) {
    const raw = readFileSync(src);
    const bytes = TRANSFORMED.test(src) ? Buffer.from(mirrorTransform(raw.toString('utf8')), 'utf8') : raw;
    map.set(rel, createHash('sha256').update(bytes).digest('hex'));
  }
  return map;
}
