#!/usr/bin/env bun
import { pageDirs } from '../src/documentation/lib/page-dirs-files.ts';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as prettier from 'prettier';
import { formatFences } from './lib/format-pages.ts';

/**
 * Why: format the ```html example fences of every doc page with Prettier's
 * HTML printer (scripts/lib/format-pages.ts says why only the fences), at
 * the same width as oxfmt formats the components. `--write` rewrites the
 * pages, `--check` fails on any page `--write` would change - `bun run lint`
 * runs the check (`bun run format` the write).
 * VERIFIED: (tests/format-pages.test.ts) a formatted fence renders the same
 * DOM - elements, attributes and text - as the authored one.
 *
 * A page whose exact text this formatter found formatted before is not printed
 * again: .cache/format-pages.json keeps the hashes of formatted page texts,
 * keyed by the formatter (this script, lib/format-pages.ts, Prettier's version,
 * the options) - an edited page, or any formatter change, formats for real.
 * VERIFIED: (tmp/format-cache-probe.ts) the same output with and without the
 * cache, an unformatted edit still fails the check; 3.2 s -> 0.03 s warm.
 */

const ROOT = join(import.meta.dirname, '..');
const PAGES = join(ROOT, 'src', 'documentation', 'pages');

/** Prettier's HTML printer at the components' width.
 *  - htmlWhitespaceSensitivity 'strict': Prettier never adds or removes whitespace between elements.
 *    Its default ('css') assumes a tag's default display - but a <div> styled inline-block renders the
 *    newline Prettier puts between two of them as a space (the Width & Height demos overflowed 320px),
 *    and a contenteditable block's textContent starts with the indentation it adds (the Notes scaffold's
 *    Markdown shortcuts stopped matching). Strict keeps the authored whitespace; lines break only where
 *    whitespace already is and inside tags.
 *  - singleQuote for the embedded <script>s: every df$('…') call in the sources, the skills and the
 *    examples is written that way (tests/ui.test.ts looks for one). Prettier applies the option to an
 *    example's inline <style> too - the component sheets stay on double quotes (oxfmt's override).
 *  A <script> of a non-code type (text/markdown) never reaches Prettier - lib/format-pages.ts keeps it. */
export const HTML_OPTIONS = { parser: 'html', printWidth: 120, singleQuote: true, htmlWhitespaceSensitivity: 'strict' } as const;

const check = process.argv.includes('--check');
const write = process.argv.includes('--write');
if (check === write) {
  console.error('usage: bun scripts/format-pages.ts --check | --write');
  process.exit(2);
}

const sha = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
const CACHE = join(ROOT, '.cache', 'format-pages.json');
const formatter = sha(
  [readFileSync(import.meta.filename), readFileSync(join(import.meta.dirname, 'lib', 'format-pages.ts')), prettier.version, JSON.stringify(HTML_OPTIONS)].join('\0'),
);
const cached: { formatter?: string; formatted?: Record<string, number> } = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
/** page text hash -> its fence count, for every page text found formatted (this run's pages only) */
const known = cached.formatter === formatter ? (cached.formatted ?? {}) : {};
const formatted: Record<string, number> = {};

const stale: string[] = [];
/** fences Prettier's HTML parser refuses - markup a browser repairs silently (an unclosed element, a stray closing tag) */
const broken: string[] = [];
let fences = 0;
// every page, in its section folder (page-dirs-files.ts) - `f` is the path from pages/
const pages = pageDirs(PAGES).map((p) => (p.folder ? `${p.folder}/${p.slug}.mdx` : `${p.slug}.mdx`)).sort();
for (const f of pages) {
  const file = join(PAGES, f);
  const text = readFileSync(file, 'utf8');
  const textHash = sha(text);
  if (known[textHash] !== undefined) {
    fences += known[textHash];
    formatted[textHash] = known[textHash];
    continue;
  }
  const fmt = async (html: string) => {
    try {
      return await prettier.format(html, HTML_OPTIONS);
    } catch (e) {
      const first = html.split('\n').find((l) => l.trim()) ?? '';
      throw new Error(`pages/${f}, the fence starting "${first.trim().slice(0, 70)}": ${(e as Error).message.split('\n')[0]}`);
    }
  };
  let result;
  try {
    result = await formatFences(text, fmt);
    // Prettier's member-chain breaking inside <script> is not idempotent on
    // every input (bar-race, election-hex-cartogram: pass two re-joins a chain
    // pass one broke, and a page took more than three passes once); `--write`
    // formats to the fixpoint, so one `--check` pass is stable afterwards
    for (let pass = 1; write && pass < 9; pass++) {
      const again = await formatFences(result.text, fmt);
      if (again.text === result.text) break;
      result = { ...again, fences: result.fences };
      if (pass === 8) broken.push(`pages/${f}: the html fences do not settle after 8 passes - format the fence by hand`);
    }
  } catch (e) {
    broken.push((e as Error).message);
    continue;
  }
  fences += result.fences;
  // --write formats to the fixpoint, so the text it writes is formatted too
  if (result.text === text || write) formatted[sha(result.text)] = result.fences;
  if (result.text === text) continue;
  stale.push(f);
  if (write) writeFileSync(file, result.text);
}
mkdirSync(join(ROOT, '.cache'), { recursive: true });
writeFileSync(CACHE, `${JSON.stringify({ formatter, formatted })}\n`);
for (const b of broken) console.log(`format-pages: ${b}`);
if (broken.length) console.log(`format-pages: ${broken.length} page(s) with markup Prettier cannot parse\n  fix: repair the named fence (the browser repairs it silently; the shown source is wrong)`);
if (check && stale.length) {
  for (const f of stale) console.log(`format-pages: pages/${f} has an unformatted html fence`);
  console.log(`format-pages: ${stale.length} of ${pages.length} page(s) unformatted\n  fix: bun run format`);
}
if (broken.length || (check && stale.length)) process.exit(1);
console.log(`format-pages: ${fences} html fences in ${pages.length} pages, ${stale.length} page(s) ${write ? 'rewritten' : 'unformatted'}`);
