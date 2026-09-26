import { describe, expect, it } from 'vitest';
import {
  headingSlug,
  markdownLinkProblems,
  withoutCodeFences,
  type MdDoc,
} from '../scripts/lib/links.ts';

/**
 * Why: verify's "markdown link integrity" gate runs on the real tree, so
 * regressions in the checker itself (missed links, false positives on code
 * fences) would silently un-gate the docs. These tests pin the pure core's
 * contract on synthetic docs with a fake `exists`.
 */

/** Fake tree: a few files that "exist" for the resolver. */
const TREE = new Set([
  'docs/readme.md:./guide.md',
  'docs/readme.md:../src/app.ts',
  'docs/readme.md:images/logo.png',
  'docs/readme.md:guide.md',
]);
const exists = (from: string, relPath: string) => TREE.has(`${from}:${relPath}`);

const doc = (text: string): MdDoc => ({ name: 'docs/readme.md', text });

describe('withoutCodeFences', () => {
  it('drops ``` fenced blocks including their content', () => {
    expect(withoutCodeFences('a\n```html\n[x](y)\n```\nb')).toBe('a\nb');
  });
  it('drops ~~~ fenced blocks and keeps a mismatched closer inside a fence', () => {
    expect(withoutCodeFences('~~~\n```\n[link](x)\n~~~\nkeep')).toBe('keep');
  });
  it('keeps an unterminated fence open to EOF (defensive)', () => {
    expect(withoutCodeFences('a\n```\n[x](y)')).toBe('a');
  });
  it('passes through text without fences', () => {
    expect(withoutCodeFences('# Title\n\n[x](y)')).toBe('# Title\n\n[x](y)');
  });
});

describe('headingSlug', () => {
  it('lowercases, strips punctuation, hyphenates spaces', () => {
    expect(headingSlug('Quick Start!')).toBe('quick-start');
    expect(headingSlug("What's New?")).toBe('whats-new');
  });
  it('keeps unicode letters', () => {
    expect(headingSlug('Théme Ñav')).toBe('théme-ñav');
  });
  it('keeps code/HTML content as text, unwraps links (github parity)', () => {
    expect(headingSlug('Using `dist/SKILL.md`')).toBe('using-distskillmd');
    expect(headingSlug('See [Docs](x.md) here')).toBe('see-docs-here');
    expect(headingSlug('The <dialog> Element')).toBe('the-dialog-element');
  });
});

describe('markdownLinkProblems', () => {
  it('passes valid file links and reports dead ones by name', () => {
    expect(markdownLinkProblems([doc('see [guide](./guide.md)')], exists)).toEqual([]);
    expect(markdownLinkProblems([doc('see [nope](./nope.md)')], exists)).toEqual([
      'docs/readme.md: dead link (./nope.md) - ./nope.md not found',
    ]);
  });

  it('skips external schemes and the conventional placeholders', () => {
    const text =
      '[a](https://x.dev) [b](mailto:x@x.dev) [c](tel:+1) [d](data:,) [e](#) [f](...) [g]()';
    expect(markdownLinkProblems([doc(text)], () => false)).toEqual([]);
  });

  it('existence-checks image links too', () => {
    expect(markdownLinkProblems([doc('![logo](images/logo.png)')], exists)).toEqual([]);
    expect(markdownLinkProblems([doc('![gone](images/gone.png)')], exists)).toHaveLength(1);
  });

  it('decodes %xx escapes in targets', () => {
    expect(markdownLinkProblems([doc('[x](./guide%2Emd)')], exists)).toEqual([]);
  });

  it('resolves same-file anchors against headings (github slug rules)', () => {
    const text = '# Intro\n\n## Quick Start!\n\n[ok](#quick-start)';
    expect(markdownLinkProblems([doc(text)], exists)).toEqual([]);
    expect(markdownLinkProblems([doc(text + '\n[bad](#nope)')], exists)).toEqual([
      'docs/readme.md: dead anchor #nope - no heading with that slug in the file',
    ]);
  });

  it('accepts explicit id="…" anchors', () => {
    expect(markdownLinkProblems([doc('<a id="sec"></a>\n[x](#sec)')], exists)).toEqual([]);
  });

  it('ignores links and headings inside code fences', () => {
    const text = '```\n# Heading\n[x](./nope.md)\n[y](#nope)\n```\nreal [g](./guide.md)';
    expect(markdownLinkProblems([doc(text)], exists)).toEqual([]);
  });

  it('reports escaped links - they render as literal text, never work', () => {
    expect(markdownLinkProblems([doc('the \\[Button\\](./guide.md) component')], exists)).toEqual([
      'docs/readme.md: escaped link "\\[Button\\](./guide.md)" renders as literal text - link it for real (HTML <a href>, or <DocLink href> in .mdx)',
    ]);
    // external targets count too - the escape bug is independent of the target
    expect(markdownLinkProblems([doc('\\[X\\](https://x.dev)')], exists)).toHaveLength(1);
  });

  it('cross-file anchors only check the file (documented ceiling)', () => {
    expect(markdownLinkProblems([doc('[x](./guide.md#whatever)')], exists)).toEqual([]);
    expect(markdownLinkProblems([doc('[x](./missing.md#whatever)')], exists)).toHaveLength(1);
  });

  it('checks every doc in the batch', () => {
    const bad: MdDoc = { name: 'other.md', text: '[x](./ghost.md)' };
    expect(markdownLinkProblems([doc('[g](./guide.md)'), bad], exists)).toEqual([
      'other.md: dead link (./ghost.md) - ./ghost.md not found',
    ]);
  });
});
