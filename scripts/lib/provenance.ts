/**
 * Why: core.js/all.js embed the defuss-morph + defuss-query runtimes, so the
 * MIT attribution must travel WITH the shipped artifact (plans/
 * defuss-query-morph-integration.md §6 "per-release provenance notices").
 * The stamp is deterministic - defuss-shadcn version + pinned upstream
 * versions + SHA-256 of each LICENSE file - so regenerating a release renders
 * byte-identical notices, and a verify gate catches drift like stats.json.
 * Pure module (no fs/crypto): callers pass the computed hashes in, so
 * tests/provenance.test.ts can pin the contract in browser mode.
 */

/** One bundled upstream package, resolved from node_modules by the caller. */
export interface UpstreamInfo {
  /** npm package name (defuss-morph | defuss-query) */
  name: string;
  /** installed version (node_modules package.json) */
  version: string;
  /** version pinned in OUR package.json dependencies */
  pinned: string;
  /** SPDX license id from the upstream package.json */
  license: string;
  /** SHA-256 hex of the upstream LICENSE file bytes */
  licenseSha256: string;
}

export interface ProvenanceInput {
  /** defuss-shadcn version (package.json) */
  version: string;
  /** bundled runtimes, in the order core embeds them */
  upstreams: UpstreamInfo[];
  /**
   * Distinct upstream LICENSE texts, same order as `upstreams` (deduped by
   * hash by the caller - both upstreams share one MIT text today, so one
   * paragraph covers both).
   */
  licenseTexts: string[];
}

const sha = (u: UpstreamInfo) => `sha256:${u.licenseSha256}`;

/**
 * One-line provenance pointer appended INSIDE each runtime artifact (readable
 * AND minified core/all). Single line, no newline: appended after the code and
 * before the sourceMappingURL comment, so source-map positions stay valid.
 */
export function provenancePointer(input: ProvenanceInput): string {
  const ups = input.upstreams
    .map((u) => `${u.name}@${u.version} (${u.license}, ${sha(u)})`)
    .join(' + ');
  return `/* defuss-shadcn v${input.version} runtime provenance: bundles ${ups}; full notice: NOTICE.txt */`;
}

/**
 * dist/components/NOTICE.txt - the per-release provenance notice shipped next
 * to the artifacts that embed the upstream runtimes.
 */
export function provenanceNotice(input: ProvenanceInput): string {
  const rows = input.upstreams
    .map(
      (u) =>
        `- ${u.name}@${u.version} (pinned "${u.pinned}" in package.json)\n  license: ${u.license} - LICENSE sha256 ${u.licenseSha256}`,
    )
    .join('\n');
  // One section per DISTINCT license text (caller orders licenseTexts by
  // first hash occurrence): shared texts list all covering packages once.
  const firstHash = (hash: string) => input.upstreams.findIndex((o) => o.licenseSha256 === hash);
  const sections = input.upstreams
    .filter((u, i) => firstHash(u.licenseSha256) === i) // print each distinct text once
    .map((u) => {
      const covered = input.upstreams
        .filter((o) => o.licenseSha256 === u.licenseSha256)
        .map((o) => o.name)
        .join(' + ');
      return `License for ${covered}:\n${'-'.repeat(12 + covered.length)}\n${input.licenseTexts[firstHash(u.licenseSha256)].trimEnd()}\n`;
    })
    .join('\n');
  return `defuss-shadcn NOTICE
=====================

Version: ${input.version}
Embedded runtime packages (bundled into dist/components/core.js, core.min.js,
all.js and all.min.js by scripts/bundle.ts + scripts/minify.ts):

${rows}

The pointer comment at the end of each artifact names the exact versions +
license hashes this release embeds.

${sections}`;
}

/** True when `artifactText` carries this release's provenance pointer. */
export function hasProvenancePointer(artifactText: string, pointer: string): boolean {
  return artifactText.includes(pointer);
}
