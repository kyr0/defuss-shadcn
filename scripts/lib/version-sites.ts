/**
 * Why: the release version lives in more than package.json - the Claude Code
 * plugin manifest, the shared-ABI stamp core publishes, and the flagship
 * deck's cover. A release that bumps only package.json leaves the others
 * behind (0.9.0 → 0.9.1 hit exactly that), so every site is listed here ONCE:
 * scripts/bump-version.ts rewrites them all, verify's `version sites` gate
 * fails when any of them disagrees with package.json.
 *
 * Pure (no fs): each site is a repo-relative file + how to read and replace
 * the version in its text.
 */
export interface VersionSite {
  /** repo-relative path */
  file: string;
  /** what the version means there (for gate messages) */
  what: string;
  /** the version found in the text, or null when the pattern is gone */
  read(text: string): string | null;
  /** the text with the version replaced */
  write(text: string, version: string): string;
}

/** A site whose version is the first capture group of `re`. */
const site = (file: string, what: string, re: RegExp): VersionSite => ({
  file,
  what,
  read: (text) => text.match(re)?.[1] ?? null,
  write: (text, version) => {
    if (!re.test(text)) throw new Error(`${file}: version pattern not found (${what})`);
    return text.replace(re, (m, old: string) => m.replace(old, version));
  },
});

export const VERSION_SITES: VersionSite[] = [
  site('package.json', 'npm package version', /^ {2}"version": "([^"]+)"/m),
  site('.claude-plugin/plugin.json', 'Claude Code plugin version', /^ {2}"version": "([^"]+)"/m),
  site('src/shared/version.ts', 'shared ABI stamp (df$.shadcn.shared.abi)', /SHARED_ABI = '([^']+)'/),
  site('src/documentation/pages/system-in-numbers.mdx', 'deck cover eyebrow', /defuss-shadcn · v(\d+\.\d+\.\d+(?:-[\w.]+)?)</),
];

/** Every site that disagrees with `version` (empty = all in step). */
export function versionDrift(read: (file: string) => string, version: string): string[] {
  return VERSION_SITES.flatMap((s) => {
    const found = s.read(read(s.file));
    if (found === null) return [`${s.file}: no version found (${s.what}) - the pattern in scripts/lib/version-sites.ts no longer matches`];
    return found === version ? [] : [`${s.file} says ${found} (${s.what}), package.json says ${version}`];
  });
}

/**
 * Why: a CDN pin in the docs (`…/gh/kyr0/defuss-shadcn@v0.1.1/…` on the
 * installation page) is a version site too - a reader copies it, so it must
 * name the CURRENT release. Every `defuss-shadcn@vX.Y.Z` in the authored
 * text listed by PIN_GLOBS is checked by verify's `pinned versions` gate and
 * moved by scripts/bump-version.ts with the others. The docs/ release
 * snapshot pins its own tag (scripts/lib/mirror.ts) and is not listed;
 * changelog data quoting old releases is JSON, not listed either.
 */
export const PIN_RE = /defuss-shadcn@v(\d+\.\d+\.\d+(?:-[\w.]+)?)/g;

/** repo-relative globs of the authored text whose CDN pins must name the release */
export const PIN_GLOBS = [
  'README.md',
  'AGENTS.md',
  'ARCH.md',
  'src/**/*.{md,mdx,ts,tsx,html,css}',
  'skills/**/*.md',
  'dist/SKILL.md',
  'dist/components/*/component-skill.md',
];
/** generated output inside PIN_GLOBS that is rebuilt from the sources above */
export const PIN_IGNORE = /^src\/documentation\/(public\/js|dist)\//;

/** Every pin in `text` that is not `version`, as "file:line pins vA, the release is vB". */
export function pinDrift(file: string, text: string, version: string): string[] {
  const out: string[] = [];
  text.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(PIN_RE))
      if (m[1] !== version) out.push(`${file}:${i + 1} pins defuss-shadcn@v${m[1]}, the release is v${version}`);
  });
  return out;
}

/** `text` with every pin moved to `version`. */
export const rewritePins = (text: string, version: string): string => text.replace(PIN_RE, `defuss-shadcn@v${version}`);
