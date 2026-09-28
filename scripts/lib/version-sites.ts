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
