import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { mirrorFiles, mirrorTransform } from './lib/mirror.ts';

/**
 * Why: GitHub Pages publishes ./docs with no build step, and ./docs is the
 * documentation SITE - dist/documentation/* plus the SEO files - not a copy
 * of the whole dist/ tree. The pages' `../components/…` and `../theme/…`
 * references are rewritten to the jsDelivr GitHub CDN (see lib/mirror.ts),
 * so the shipped tree needs nothing but the site itself.
 */

const ROOT = join(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist');
const OUT = join(ROOT, 'docs');

if (!existsSync(DIST)) {
  console.error('sync-docs: dist/ missing - run `bun run build` first');
  process.exit(1);
}

// full replace: a stale file from a previous publish must not survive the mirror
rmSync(OUT, { recursive: true, force: true });

let count = 0;
for (const { src, rel } of mirrorFiles(DIST)) {
  if (src.endsWith('.DS_Store')) continue;
  const out = join(OUT, rel);
  mkdirSync(dirname(out), { recursive: true });
  const raw = readFileSync(src);
  writeFileSync(out, /\.(html|xml)$/.test(src) ? mirrorTransform(raw.toString('utf8')) : raw);
  count++;
}

console.log(
  `sync-docs: ${count} files → docs/ (documentation site only, incl. 404.html fallback; ../component & ../theme refs rewritten to the jsDelivr CDN - ready for GitHub Pages)`,
);
