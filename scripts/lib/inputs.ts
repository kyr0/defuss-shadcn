import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Why: the screenshot freshness contract, shared by create-screenshots.ts
 * (skip unchanged components) and verify.ts (the gate). Content hashes, not
 * mtimes — rebuilding dist/ with identical files must NOT invalidate
 * screenshots, and editing a component must invalidate exactly its own shots.
 *
 * Fingerprint per component = global shell (theme tokens, doc css/js/fonts,
 * the all.css/all.js bundle — every page loads these) + that component's
 * shipped files + its doc page.
 * Known ceiling (ponytail): cross-component demo bleed-through (e.g. a .btn
 * inside the dialog demo) is NOT tracked — editing button.css won't re-shoot
 * dialog.png. Escape hatch: `bun run screenshots --force`. Upgrade path if it
 * ever bites: compute a real per-page dependency set from the preview markup.
 */

const SHELL_DIRS = ['theme', 'documentation/css', 'documentation/js', 'documentation/fonts'];
// every doc page loads the single-file bundle, so a bundle rebuild can shift
// EVERY screenshot — hash it into the shell, not into any one component
const SHELL_FILES = ['components/all.css', 'components/all.js'];

/** Deterministic hash over a fixed set of files, relative path included. */
function hashFiles(root: string, files: string[]): string {
  const h = createHash('sha256');
  for (const f of [...files].sort()) {
    h.update(relative(root, f));
    h.update('\0');
    h.update(readFileSync(f));
    h.update('\0');
  }
  return h.digest('hex').slice(0, 16);
}

function collect(dir: string): string[] {
  if (statSync(dir, { throwIfNoEntry: false })?.isDirectory() !== true) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...collect(p));
    else out.push(p);
  }
  return out;
}

/**
 * Parse the declared State API names from a component source
 * (`const {name}States = ['default', …]`). Empty array = no declared states.
 * Shared by create-screenshots.ts (which state PNGs to capture) and verify.ts
 * (which artifacts must cover every state). AGENTS.md "State API".
 */
export function declaredStates(tsSource: string): string[] {
  const m = tsSource.match(/\b\w+States\s*=\s*\[([^\]]*)\]/);
  if (!m) return [];
  return [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
}

/**
 * Per-component input fingerprint: global shell hash mixed with the
 * component's own shipped files (dist/components/<name>/**) and its doc page
 * (dist/documentation/<name>.html). Any global change shifts every entry.
 */
export function componentFingerprints(dist: string): Record<string, string> {
  const shellFiles = [
    ...SHELL_DIRS.flatMap((d) => collect(join(dist, d))),
    ...SHELL_FILES.map((f) => join(dist, f)).filter(
      (f) => statSync(f, { throwIfNoEntry: false })?.isFile() === true,
    ),
  ];
  const shell = hashFiles(dist, shellFiles);

  const comps = join(dist, 'components');
  const out: Record<string, string> = {};
  if (statSync(comps, { throwIfNoEntry: false })?.isDirectory() !== true) return out;
  for (const name of readdirSync(comps)) {
    if (statSync(join(comps, name)).isDirectory() !== true) continue;
    const own = [join(dist, 'documentation', `${name}.html`), ...collect(join(comps, name))].filter(
      (f) => statSync(f, { throwIfNoEntry: false })?.isFile() === true,
    );
    out[name] = hashFiles(dist, own) + shell;
  }
  return out;
}
