/**
 * A component's parts file - its individual examples, one instance of each kind (`button.parts.md` beside the
 * sources; scripts/lib/example-parts.ts reads them). Source only: the docs build lists them in the Studio's library,
 * the pages show none of them, and build.ts never copies one into dist/ (verify's `dist 1:1` skips them the same way).
 * Its own module, free of node:fs: the contract module that names it runs in the browser test runner too
 * (VERIFIED: tests/example-parts.test.ts failed to import while component-dirs.ts held it). component-dirs.ts, the
 * layout owner, re-exports it.
 */
export const partsFileName = (name: string): string => `${name}.parts.md`;

/** Whether a path names a parts file. */
export const isPartsFile = (path: string): boolean => path.endsWith('.parts.md');
