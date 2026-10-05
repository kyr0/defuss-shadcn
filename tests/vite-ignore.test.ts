import { describe, expect, it } from 'vitest';
import { viteIgnore } from '../scripts/lib/vite-ignore.ts';

/**
 * Why: Bun.build and oxc-minify drop comments, so the shipped all.js and the
 * .min.js twins lost the `@vite-ignore` hint mermaid.ts puts on its runtime
 * vendor import() - and a consumer's Vite warned on every load. The bundle
 * and minify steps put it back with viteIgnore(); these pin that the hint
 * lands only on computed specifiers and that the source map still points at
 * the same code afterwards.
 */
describe('viteIgnore()', () => {
  it('hints import() of a computed specifier, never a literal one, never twice', () => {
    const src = "const a = import(url);\nconst b = import('./x.js');\nconst c = import(/* @vite-ignore */ u);";
    const { code, count } = viteIgnore(src);
    expect(count).toBe(1);
    expect(code).toBe("const a = import(/* @vite-ignore */ url);\nconst b = import('./x.js');\nconst c = import(/* @vite-ignore */ u);");
  });

  it('shifts the generated columns after the insertion on its line only', () => {
    // line 0: segments at columns 0, 2, 9 (deltas 0, 2, 7); line 1: one segment at column 4
    const { mappings } = viteIgnore('a=import(x)\nb = 1', 'A,E,O;I');
    // the segment at column 9 moves by the hint's 19 characters: delta 26 → "0B"; line 1 untouched
    expect(mappings).toBe('A,E,0B;I');
  });

  it('leaves code without dynamic imports alone', () => {
    expect(viteIgnore('export const x = 1;', 'AAAA')).toEqual({ code: 'export const x = 1;', mappings: 'AAAA', count: 0 });
  });
});
