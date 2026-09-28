/**
 * Why: one command moves EVERY version site (scripts/lib/version-sites.ts) to
 * the new release version - package.json alone left the plugin manifest,
 * the shared-ABI stamp and the deck cover behind.
 *
 *   bun scripts/bump-version.ts 0.9.1
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { VERSION_SITES } from './lib/version-sites.ts';

const ROOT = join(import.meta.dirname, '..');
const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+(?:-[\w.]+)?$/.test(version)) {
  console.error('usage: bun scripts/bump-version.ts <x.y.z[-suffix]>');
  process.exit(1);
}
for (const s of VERSION_SITES) {
  const path = join(ROOT, s.file);
  const before = readFileSync(path, 'utf8');
  const was = s.read(before);
  writeFileSync(path, s.write(before, version));
  console.log(`  ${s.file}: ${was} → ${version} (${s.what})`);
}
