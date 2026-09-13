import { describe, expect, it } from 'vitest';
import { isDerivedArtifact, minifyArtifactProblems } from '../scripts/lib/minify.ts';

/**
 * Why: verify's `dist 1:1` allow-list and the `minified artifacts` gate decide
 * which generated files (scripts/minify.ts + tsc sourceMap) may exist in dist/
 * and which twin a component must ship. The logic lives in the pure
 * scripts/lib/minify.ts so these tests pin the contract in browser mode —
 * same split as tests/changelog.test.ts.
 */

describe('isDerivedArtifact', () => {
  it.each([
    'components/dialog/dialog.min.css',
    'components/dialog/dialog.min.js',
    'components/dialog/dialog.js.map',
    'components/dialog/dialog.min.js.map',
  ])('accepts the generated twin %s', (p) => expect(isDerivedArtifact(p)).toBe(true));

  it.each([
    'components/dialog/dialog.css',
    'components/dialog/dialog.js',
    'components/dialog/component-skill.md',
    'documentation/index.html',
    'theme/utils/default-semantic-tokens.css',
  ])('rejects the shipped file %s', (p) => expect(isDerivedArtifact(p)).toBe(false));
});

describe('minifyArtifactProblems', () => {
  it('passes when every twin is present', () => {
    expect(
      minifyArtifactProblems(
        new Set([
          'components/badge/badge.css',
          'components/badge/badge.min.css',
          'components/dialog/dialog.css',
          'components/dialog/dialog.min.css',
          'components/dialog/dialog.js',
          'components/dialog/dialog.js.map',
          'components/dialog/dialog.min.js',
          'components/dialog/dialog.min.js.map',
        ]),
      ),
    ).toEqual([]);
  });

  it('requires the CSS twin', () => {
    expect(minifyArtifactProblems(new Set(['components/badge/badge.css']))).toEqual([
      'dist/components/badge/badge.min.css missing',
    ]);
  });

  it('requires all three JS twins', () => {
    expect(minifyArtifactProblems(new Set(['components/dialog/dialog.js']))).toEqual([
      'dist/components/dialog/dialog.js.map missing',
      'dist/components/dialog/dialog.min.js missing',
      'dist/components/dialog/dialog.min.js.map missing',
    ]);
  });

  it('ignores non-component and derived files as inputs', () => {
    expect(
      minifyArtifactProblems(
        new Set([
          'documentation/index.html',
          'theme/utils/default-semantic-tokens.css',
          'components/grid/grid-layout.css', // not the {name}/{name}.css shape
          'components/dialog/dialog.min.js', // a twin never demands twins
          'components/dialog/dialog.min.min.js', // nor a twin of a twin
        ]),
      ),
    ).toEqual([]);
  });
});
