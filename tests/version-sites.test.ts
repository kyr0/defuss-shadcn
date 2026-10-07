import { describe, expect, it } from 'vitest';
import { PIN_GLOBS, PIN_IGNORE, VERSION_SITES, pinDrift, rewritePins, versionDrift } from '../scripts/lib/version-sites';

// Minimal text of each site, all at 1.2.3.
const files: Record<string, string> = {
  'package.json': '{\n  "name": "x",\n  "version": "1.2.3"\n}\n',
  '.claude-plugin/plugin.json': '{\n  "name": "x",\n  "version": "1.2.3"\n}\n',
  '.codex-plugin/plugin.json': '{\n  "name": "x",\n  "version": "1.2.3"\n}\n',
  'plugin.json': '{\n  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",\n  "name": "x",\n  "version": "1.2.3"\n}\n',
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

describe('pinned versions', () => {
  const page = [
    '<p>Replace @latest with a specific version tag:</p>',
    '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/kyr0/defuss-shadcn@v0.1.1/dist/theme/utils/default-semantic-tokens.css">',
    '<script src="https://cdn.jsdelivr.net/gh/kyr0/defuss-shadcn@latest/dist/components/all.js"></script>',
  ].join('\n');

  it('reports a pin that is not the release, with its line', () => {
    expect(pinDrift('pages/installation.mdx', page, '0.9.4')).toEqual(['pages/installation.mdx:2 pins defuss-shadcn@v0.1.1, the release is v0.9.4']);
  });

  it('accepts the release, @latest and placeholders', () => {
    expect(pinDrift('x.md', page.replace('v0.1.1', 'v0.9.4'), '0.9.4')).toEqual([]);
    expect(pinDrift('x.md', 'pins the tag (defuss-shadcn@vX.Y.Z)', '0.9.4')).toEqual([]);
  });

  it('rewritePins moves every pin (and nothing else) to the release', () => {
    const next = rewritePins(page + '\n' + page, '1.0.0');
    expect(pinDrift('x', next, '1.0.0')).toEqual([]);
    expect(next.match(/@v1\.0\.0/g)).toHaveLength(2);
    expect(next).toContain('defuss-shadcn@latest');
  });

  it('covers the installation page and skips generated docs runtime', () => {
    expect(PIN_GLOBS.some((g) => g.startsWith('src/'))).toBe(true);
    expect(PIN_IGNORE.test('src/documentation/public/js/site.js')).toBe(true);
    expect(PIN_IGNORE.test('src/documentation/pages/installation.mdx')).toBe(false);
  });
});
