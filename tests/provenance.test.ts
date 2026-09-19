/**
 * Why: the provenance stamp is what makes the MIT attribution travel with
 * core/all — the contract (pointer shape, NOTICE sections, hash grouping)
 * must not drift silently, since verify compares artifacts byte-wise against
 * a fresh render. Pure contract test (no fs), like tests/minify.test.ts.
 */
import { describe, expect, it } from 'vitest';
import {
  hasProvenancePointer,
  provenanceNotice,
  provenancePointer,
  type ProvenanceInput,
} from '../scripts/lib/provenance.ts';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64); // distinct upstream license
const MIT = 'MIT License\n\nCopyright (c) 2026 Test Author\n\nPermission...';

const input: ProvenanceInput = {
  version: '9.9.9',
  upstreams: [
    { name: 'defuss-morph', version: '0.1.1', pinned: '0.1.1', license: 'MIT', licenseSha256: HASH_A },
    { name: 'defuss-query', version: '0.1.0', pinned: '0.1.0', license: 'MIT', licenseSha256: HASH_A }, // shared text
  ],
  licenseTexts: [MIT],
};

describe('provenancePointer', () => {
  it('is a single-line comment carrying our version + each upstream version and hash', () => {
    const p = provenancePointer(input);
    expect(p.startsWith('/*') && p.endsWith('*/')).toBe(true);
    expect(p.split('\n')).toHaveLength(1); // must not break line-based sourcemap use
    expect(p).toContain('v9.9.9');
    expect(p).toContain('defuss-morph@0.1.1');
    expect(p).toContain('defuss-query@0.1.0');
    expect(p).toContain(`sha256:${HASH_A}`);
    expect(p).toContain('NOTICE.txt');
  });
});

describe('provenanceNotice', () => {
  it('lists pinned versions and hashes per upstream', () => {
    const n = provenanceNotice(input);
    expect(n).toContain('Version: 9.9.9');
    expect(n).toContain('- defuss-morph@0.1.1 (pinned "0.1.1" in package.json)');
    expect(n).toContain(`LICENSE sha256 ${HASH_A}`);
  });
  it('prints a shared license text ONCE covering both packages', () => {
    const n = provenanceNotice(input);
    expect(n.match(/Permission\.\.\./g)).toHaveLength(1);
    expect(n).toContain('License for defuss-morph + defuss-query:');
  });
  it('prints separate sections when upstreams have different licenses', () => {
    const two: ProvenanceInput = {
      version: '1.0.0',
      upstreams: [
        { name: 'defuss-morph', version: '1', pinned: '1', license: 'MIT', licenseSha256: HASH_A },
        { name: 'defuss-query', version: '1', pinned: '1', license: 'MIT', licenseSha256: HASH_B },
      ],
      licenseTexts: [MIT, MIT.replace('2026 Test', '2025 Other')],
    };
    const n = provenanceNotice(two);
    expect(n).toContain('License for defuss-morph:');
    expect(n).toContain('License for defuss-query:');
    expect(n.match(/Permission\.\.\./g)).toHaveLength(2);
  });
});

describe('hasProvenancePointer', () => {
  it('finds the pointer inside artifact code', () => {
    const artifact = `var x=1;\n${provenancePointer(input)}\n//# sourceMappingURL=x.map\n`;
    expect(hasProvenancePointer(artifact, provenancePointer(input))).toBe(true);
    expect(hasProvenancePointer('var x=1;\n//# sourceMappingURL=x.map\n', provenancePointer(input))).toBe(false);
  });
});
