import { describe, expect, it } from 'vitest';
import { VERSION_SITES, versionDrift } from '../scripts/lib/version-sites';

// Minimal text of each site, all at 1.2.3.
const files: Record<string, string> = {
  'package.json': '{\n  "name": "x",\n  "version": "1.2.3"\n}\n',
  '.claude-plugin/plugin.json': '{\n  "name": "x",\n  "version": "1.2.3"\n}\n',
  'src/shared/version.ts': "export const SHARED_ABI = '1.2.3';\n",
  'src/documentation/pages/system-in-numbers.mdx': '<p class="sys-eyebrow">defuss-shadcn · v1.2.3</p>',
};

describe('version sites', () => {
  it('all sites in step → no drift', () => {
    expect(versionDrift((f) => files[f], '1.2.3')).toEqual([]);
  });

  it('a site left behind is reported with its file and meaning', () => {
    const drift = versionDrift((f) => (f === '.claude-plugin/plugin.json' ? files[f].replace('1.2.3', '1.2.2') : files[f]), '1.2.3');
    expect(drift).toEqual(['.claude-plugin/plugin.json says 1.2.2 (Claude Code plugin version), package.json says 1.2.3']);
  });

  it('a site whose pattern vanished is reported, not silently passed', () => {
    const drift = versionDrift((f) => (f === 'src/shared/version.ts' ? '// gone' : files[f]), '1.2.3');
    expect(drift[0]).toMatch(/src\/shared\/version\.ts: no version found/);
  });

  it('write() moves every site to the new version (and only the version)', () => {
    for (const s of VERSION_SITES) {
      const next = s.write(files[s.file], '2.0.0');
      expect(s.read(next)).toBe('2.0.0');
      expect(next.replace('2.0.0', '1.2.3')).toBe(files[s.file]);
    }
  });
});
