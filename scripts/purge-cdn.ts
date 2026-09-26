import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { walk } from './lib/audit.ts';
import { CDN_BASE } from './lib/mirror.ts';

/**
 * Why: docs/ pages load their component assets from jsDelivr @latest (see
 * lib/mirror.ts). jsDelivr resolves @latest to a git tag once and caches both
 * the resolution and the files (s-maxage=43200 at the edge, max-age=604800 in
 * browsers), so right after a release the deployed site can keep serving the
 * PREVIOUS release's assets - a fixed bug stays live for up to 12h.
 *
 * This script purges EVERY mutable URL jsDelivr actually exposes:
 * 1. the `@latest` PACKAGE ROOT - the @latest → tag resolution is an entry of
 *    its own. Purging only files re-resolves through the stale entry and
 *    re-caches old bytes at edges that still hold the resolution (observed
 *    post-v0.8.3: one CSS stayed stale ~10 min although its file purge
 *    reported "finished");
 * 2. every individual dist asset path - the complete release payload
 *    (components/, theme/, documentation/ assets incl. fonts & videos,
 *    SKILL.md, robots.txt/sitemap.xml).
 * Run it after `bun run deploy` once the tag is pushed and GitHub Pages has
 * republished.
 */

const ROOT = join(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist');
const PURGE_BASE = CDN_BASE.replace('cdn.jsdelivr.net', 'purge.jsdelivr.net');

// whole-tree walk: any dist/ file a release ships may already sit in
// jsDelivr's cache (agents fetch SKILL.md/skills from @latest too, not just
// the CSS/JS the docs pages link), so purge all of them, not just components
const files = walk(DIST, [''])
  .map((f) => relative(DIST, f))
  .filter((rel) => !rel.endsWith('.DS_Store'));

if (files.length === 0) {
  console.error('purge-cdn: no dist assets found - run `bun run build` first');
  process.exit(1);
}

// Preflight (learned the hard way): a purge only re-fetches from whatever tag
// @latest currently resolves to. If the release tag isn't pushed yet, every
// path purges "successfully" while upstream still serves the previous
// release - a silent no-op that looks like "the CSS was not purged". Ask
// jsDelivr directly whether it can serve the version we're releasing; its
// @latest entry-resolution cache lags a tag push by minutes, but a direct
// @<version> fetch succeeds as soon as the tag is on GitHub.
const version = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version as string;
const probe = await fetch(`${CDN_BASE.replace('@latest', '@' + version)}/SKILL.md`, { method: 'HEAD' });
if (!probe.ok) {
  console.error(
    `purge-cdn: jsDelivr cannot serve v${version} yet (@${version}/dist/SKILL.md -> ${probe.status}).\n` +
      `  Purging now would be a silent no-op - @latest still resolves to the previous tag.\n` +
      `  Publish first: git push origin main && git push origin v${version}, then re-run.`,
  );
  process.exit(1);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function purgeUrl(url: string): Promise<'ok' | 'retry'> {
  try {
    const res = await fetch(url);
    if (!res.ok) return 'retry';
    const body = (await res.json()) as {
      status?: string;
      paths?: Record<string, { throttled?: boolean }>;
    };
    const entry = Object.values(body.paths ?? {})[0];
    if (body.status !== 'finished' || entry?.throttled) return 'retry';
    return 'ok';
  } catch {
    return 'retry';
  }
}

async function purgeWithRetry(url: string, attempts = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if ((await purgeUrl(url)) === 'ok') return true;
    await sleep(1000 * attempt); // the purge API throttles aggressive clients
  }
  return false;
}

// 1. package root FIRST: purging `…@latest` clears the cached entry
// resolution, so the per-file purges below re-fetch from the NEW tag.
const PKG_ROOT = PURGE_BASE.slice(0, PURGE_BASE.lastIndexOf('/'));
if (!(await purgeWithRetry(PKG_ROOT))) {
  console.error(
    `purge-cdn: purging the @latest package root failed (${PKG_ROOT}) —\n` +
      `  file purges would re-resolve through the stale entry; aborting.`,
  );
  process.exit(1);
}

// 2. every individual asset path, on a small worker pool (throttle-friendly)
const pending = [...files];
const failed: string[] = [];

async function worker() {
  for (let rel = pending.pop(); rel; rel = pending.pop()) {
    if (!(await purgeWithRetry(`${PURGE_BASE}/${rel}`))) failed.push(rel);
    await sleep(150);
  }
}

await Promise.all(Array.from({ length: 4 }, worker));

if (failed.length > 0) {
  console.error(`purge-cdn: ${failed.length}/${files.length} paths failed:`);
  for (const rel of failed) console.error(`  ${rel}`);
  process.exit(1);
}

console.log(`purge-cdn: @latest package root + ${files.length} dist asset paths purged from jsDelivr`);
