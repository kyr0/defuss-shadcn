import { describe, expect, it } from 'vitest';
import { componentFingerprintsFrom, type FileTree } from '../scripts/lib/inputs.ts';

/**
 * Why: the screenshot increment lives or dies on WHICH files make a
 * component stale - the shell once hashed the all.* bundle, so any single
 * component edit re-shot all ~150 components. Pins the contract from
 * AGENTS.md: a component edit (or its doc page) re-shoots exactly that
 * component; the all.* and wysiwyg.* bundles are untracked (every edit rebuilds
 * them); the core runtime and the theme/doc shell shift every component,
 * because every page loads them. Pure module, no node:* - runs in the vitest
 * browser sandbox (the fs half is scripts/lib/inputs-files.ts).
 */

/** A minimal dist/ with two components, both bundles and the whole shell. */
const tree = (): FileTree => ({
  'theme/utils/default-semantic-tokens.css': 'tokens-1',
  'documentation/css/site.css': 'site-1',
  'documentation/js/head.js': 'head-1',
  'documentation/fonts/inter.woff2': 'font-1',
  'components/core.css': 'core-css-1',
  'components/core.js': 'core-js-1',
  // bundles: rebuilt on every component edit - must not be tracked
  'components/all.css': 'all-css-1',
  'components/all.js': 'all-js-1',
  'components/all.min.css': 'all-min-1',
  'components/wysiwyg.css': 'wysiwyg-css-1',
  'components/wysiwyg.js': 'wysiwyg-js-1',
  'components/button/button.css': 'btn-1',
  'components/button/component-skill.md': 'btn-skill',
  'components/dialog/dialog.css': 'dlg-1',
  'components/dialog/dialog.js': 'dlg-js',
  'documentation/button.html': 'btn-page-1',
  'documentation/dialog.html': 'dlg-page-1',
  // a non-component docs page must not leak into any fingerprint
  'documentation/getting-started.html': 'intro-1',
});

/** Keys whose fingerprint differs between two trees - what would re-shoot. */
const changedKeys = (a: Record<string, string>, b: Record<string, string>): string[] =>
  Object.keys({ ...a, ...b }).filter((k) => a[k] !== b[k]);

describe('componentFingerprintsFrom', () => {
  it('fingerprints exactly the component folders - flat bundle files are not components', () => {
    expect(Object.keys(componentFingerprintsFrom(tree())).sort()).toEqual(['button', 'dialog']);
  });

  it('an own-file edit stales exactly that component', () => {
    const base = componentFingerprintsFrom(tree());
    const next = componentFingerprintsFrom({ ...tree(), 'components/button/button.css': 'btn-2' });
    expect(changedKeys(base, next)).toEqual(['button']);
  });

  it('a doc-page edit stales exactly that component', () => {
    const base = componentFingerprintsFrom(tree());
    const next = componentFingerprintsFrom({ ...tree(), 'documentation/dialog.html': 'dlg-page-2' });
    expect(changedKeys(base, next)).toEqual(['dialog']);
  });

  it('a bundle rebuild (all.*, wysiwyg.*, min twins) stales nothing', () => {
    const base = componentFingerprintsFrom(tree());
    const next = componentFingerprintsFrom({
      ...tree(),
      'components/all.css': 'all-css-2',
      'components/all.js': 'all-js-2',
      'components/all.min.css': 'all-min-2',
      'components/wysiwyg.css': 'wysiwyg-css-2',
      'components/wysiwyg.js': 'wysiwyg-js-2',
    });
    expect(next).toEqual(base);
  });

  it('a non-component docs page is untracked', () => {
    const base = componentFingerprintsFrom(tree());
    const next = componentFingerprintsFrom({ ...tree(), 'documentation/getting-started.html': 'intro-2' });
    expect(next).toEqual(base);
  });

  it('a core-runtime or shell change stales every component', () => {
    const base = componentFingerprintsFrom(tree());
    for (const file of ['components/core.js', 'components/core.css', 'theme/utils/default-semantic-tokens.css', 'documentation/css/site.css', 'documentation/js/head.js', 'documentation/fonts/inter.woff2']) {
      const next = componentFingerprintsFrom({ ...tree(), [file]: 'changed' });
      expect(changedKeys(base, next).sort(), file).toEqual(['button', 'dialog']);
    }
  });

  it('is deterministic regardless of key insertion order', () => {
    const entries = Object.entries(tree()).reverse() as [string, Uint8Array | string][];
    expect(componentFingerprintsFrom(Object.fromEntries(entries))).toEqual(componentFingerprintsFrom(tree()));
  });
});
