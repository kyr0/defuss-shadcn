import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { RELEASE_STAMP, cdnBase, mirrorFiles, mirrorTransform, packageVersion } from './lib/mirror.ts';

/**
 * Why: GitHub Pages publishes ./docs with no build step, and ./docs is the
 * documentation SITE - dist/documentation/* plus the SEO files - not a copy
 * of the whole dist/ tree. The pages' `../components/…` and `../theme/…`
 * references are rewritten to the jsDelivr GitHub CDN pinned to the release
 * (`@vX.Y.Z`, see lib/mirror.ts), so the shipped tree needs nothing but the
 * site itself.
 *
 * docs/ is a RELEASE snapshot: pages and their pinned assets always come
 * from the same tag. It is republished only when package.json's version
 * differs from docs/release.json (deploy.sh bumps the version first) or with
 * --force (deploy.sh again, after stamping the changelog hash) - every other
 * build leaves the live site on the released version, so a page for a
 * component that is not released yet never goes live without its CSS / JS.
 */

const ROOT = join(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist');
const OUT = join(ROOT, 'docs');
const force = process.argv.includes('--force');

if (!existsSync(DIST)) {
  console.error('sync-docs: dist/ missing - run `bun run build` first');
  process.exit(1);
}

const version = packageVersion(ROOT);
const stampPath = join(OUT, RELEASE_STAMP);
const published = existsSync(stampPath) ? (JSON.parse(readFileSync(stampPath, 'utf8')) as { version?: string }).version : undefined;
if (!force && published === version) {
  console.log(
    `sync-docs: docs/ is the v${version} release snapshot - unchanged (republished at the next release by deploy.sh, or \`bun scripts/sync-docs.ts --force\`)`,
  );
  process.exit(0);
}

// full replace: a stale file from a previous publish must not survive the mirror
rmSync(OUT, { recursive: true, force: true });

let count = 0;
for (const { src, rel } of mirrorFiles(DIST)) {
  if (src.endsWith('.DS_Store')) continue;
  const out = join(OUT, rel);
  mkdirSync(dirname(out), { recursive: true });
  const raw = readFileSync(src);
  writeFileSync(out, /\.(html|xml)$/.test(src) ? mirrorTransform(raw.toString('utf8'), version) : raw);
  count++;
}
writeFileSync(stampPath, JSON.stringify({ version, tag: `v${version}`, assets: cdnBase(version) }, null, 2) + '\n');

console.log(
  `sync-docs: ${count} files → docs/ - the v${version} release snapshot (../component & ../theme refs pinned to ${cdnBase(version)}; 404.html fallback; stamped docs/${RELEASE_STAMP})`,
);
