/**
 * Why: the screenshot freshness contract, shared by create-screenshots.ts
 * (skip unchanged components) and verify.ts (the gate). Content hashes, not
 * mtimes - rebuilding dist/ with identical files must NOT invalidate
 * screenshots, and editing a component must invalidate exactly its own shots.
 *
 * Fingerprint per component = global shell (theme tokens, doc css/js/fonts,
 * the core runtime) + that component's shipped files + its doc page. The
 * all.* and wysiwyg.* bundles are deliberately NOT part of it: they contain every
 * component's code, so hashing them would re-shoot everything on any single
 * component edit - the exact cost this fingerprint exists to avoid.
 * Known ceiling (ponytail): cross-component demo bleed-through (a .btn inside
 * the dialog demo, the code-example card framing every preview, demo images)
 * is NOT tracked - editing one of those re-shoots only itself. Escape hatch:
 * `bun run screenshots --force`. Upgrade path if it ever bites: compute a
 * real per-page dependency set from the preview markup.
 *
 * This module is PURE and dependency-free (no node:*) so the vitest browser
 * sandbox can import it (tests/inputs.test.ts pins the contract); the fs half
 * lives in inputs-files.ts - same split as apps.ts / apps-files.ts.
 */

/** A dist/ as a path → content map (Buffers count - they are Uint8Array). */
export type FileTree = Record<string, Uint8Array | string>;

/** Dirs whose every file is global shell (exported for the fs half's walker). */
export const SHELL_DIRS = ['theme', 'documentation/css', 'documentation/js', 'documentation/fonts'];

/**
 * Standalone global-runtime files (exported for the fs half's walker): the
 * core runtime every page embeds first inside its bundle (df$ + the shared
 * state/render helpers) - a core change legitimately re-shoots EVERY
 * component. The all.* and wysiwyg.* bundles stay out on purpose - see the header.
 */
export const SHELL_FILES = ['components/core.css', 'components/core.js'];

/** The membership rules - ONE source shared by the pure core (partitioning) and the fs half (walking). */
const isShellFile = (rel: string): boolean =>
  SHELL_FILES.includes(rel) || SHELL_DIRS.some((d) => rel.startsWith(`${d}/`));

const isOwnFile = (rel: string, name: string): boolean =>
  rel === `documentation/${name}.html` || rel.startsWith(`components/${name}/`);

const ENCODER = new TextEncoder();

/**
 * Dual-lane FNV-style hash over sorted (path, content) pairs. It is a cache
 * key, not a cryptographic digest - it only has to detect "bytes changed" -
 * and being dependency-free is what lets the vitest browser sandbox import
 * this module (no node:crypto there).
 */
function hashEntries(entries: [string, Uint8Array | string][]): string {
  const mix = (h1: number, h2: number, bytes: Uint8Array): [number, number] => {
    for (const byte of bytes) {
      h1 = Math.imul(h1 ^ byte, 0x01000193);
      h2 = Math.imul(h2 + byte, 0x85ebca6b);
      h2 = (h2 << 13) | (h2 >>> 19);
    }
    return [h1, h2];
  };
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const sep = ENCODER.encode('\0');
  // full-string compare: a first-char comparator once left same-letter files
  // in insertion order, leaking key order into the hash (tests/inputs.test.ts)
  for (const [rel, content] of [...entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    [h1, h2] = mix(h1, h2, ENCODER.encode(rel));
    [h1, h2] = mix(h1, h2, sep);
    [h1, h2] = mix(h1, h2, typeof content === 'string' ? ENCODER.encode(content) : content);
    [h1, h2] = mix(h1, h2, sep);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Pure core: per-component fingerprints over a virtual dist tree. Component
 * names derive from their components/<name>/ folders (flat bundle files like
 * all.css are not components); every fingerprint ends in the shell hash, so
 * a shell change shifts all of them at once.
 */
export function componentFingerprintsFrom(tree: FileTree): Record<string, string> {
  const entries = Object.entries(tree);
  const shell = hashEntries(entries.filter(([rel]) => isShellFile(rel)));
  const names = new Set(
    entries.flatMap(([rel]) => (/^components\/[^/]+\//.test(rel) ? [rel.split('/')[1]] : [])),
  );
  const out: Record<string, string> = {};
  for (const name of [...names].sort()) {
    out[name] = hashEntries(entries.filter(([rel]) => isOwnFile(rel, name))) + shell;
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
