/**
 * Why: the file-system half of the provenance stamp, split from the pure
 * contract in provenance.ts (same layout as stats.ts / stats-files.ts). The
 * bundle step (scripts/bundle.ts), the minify step (scripts/minify.ts) and
 * verify's `runtime provenance` gate all resolve upstream info from the
 * installed packages, so all three agree on one byte-identical stamp.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProvenanceInput, UpstreamInfo } from './provenance.ts';

/** Upstream runtimes bundled into core/all, in the order core embeds them. */
const UPSTREAMS = ['defuss-morph', 'defuss-query'] as const;

/**
 * Resolve the provenance input from the repo root: our version + pins from
 * package.json, each upstream's installed version/license/LICENSE hash from
 * node_modules. Throws on missing files - a build without the installed
 * upstreams is a broken workspace, not a "no provenance" situation.
 */
export function collectProvenance(root: string): ProvenanceInput {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    version: string;
    dependencies?: Record<string, string>;
  };
  const upstreams: UpstreamInfo[] = UPSTREAMS.map((name) => {
    const dir = join(root, 'node_modules', name);
    const meta = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
      version: string;
      license: string;
    };
    const licenseBytes = readFileSync(join(dir, 'LICENSE'));
    const pinned = pkg.dependencies?.[name];
    if (!pinned) throw new Error(`provenance: ${name} is bundled but not in package.json dependencies`);
    return {
      name,
      version: meta.version,
      pinned,
      license: meta.license,
      licenseSha256: createHash('sha256').update(licenseBytes).digest('hex'),
    };
  });
  // distinct license texts, in upstream order (deduped by hash - both
  // upstreams share one MIT text today)
  const seen = new Map<string, string>();
  for (const u of upstreams) {
    if (!seen.has(u.licenseSha256))
      seen.set(u.licenseSha256, readFileSync(join(root, 'node_modules', u.name, 'LICENSE'), 'utf8'));
  }
  return { version: pkg.version, upstreams, licenseTexts: [...seen.values()] };
}
