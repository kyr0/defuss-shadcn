/**
 * Why: the html example fences of the doc pages are the one place a formatter
 * can reflow safely - a fence body is plain HTML, both the shown and the
 * executed source of a live example (lib/mdx-example.ts), with no MDX
 * semantics inside. The JSX prose around the fences stays untouched: MDX
 * parses JSX children as Markdown, so a tool that hard-wraps a paragraph can
 * turn a line starting with `- ` into a list, and Prettier's `mdx` parser is
 * MDX v1 (it rewrote a JSX comment's star-slash into emphasis underscores and
 * broke the docs build).
 *
 * Pure core: splits a page at its fences and hands every ```html fence body
 * to the formatter given (the CLI passes Prettier's HTML printer, the test
 * Prettier's browser build). Other fences (```states, ```ts, a ```md sample
 * that itself contains ```html lines) are copied through unchanged. When a
 * formatted body holds a line that opens with three or more backticks, the
 * fence grows to one backtick more than that run (CommonMark: the closing
 * fence must be at least as long as the opening one), and every reader of
 * these fences accepts a longer fence (docs-ssg.ts exampleFence, schema.ts
 * fence map, remark).
 * VERIFIED: (tests/format-pages.test.ts) only html fence bodies change, the
 * fence grows when needed, the result is idempotent, and a formatted fence
 * renders the same DOM (elements, attributes, text, embedded CSS via the
 * CSSOM) as the authored one on real pages, with the browser's parser.
 */

export type Formatter = (html: string) => Promise<string>;

export interface FormatFencesResult {
  /** the page with every html fence body formatted */
  text: string;
  /** html fences seen */
  fences: number;
  /** html fences whose body or fence length changed */
  changed: number;
}

/** any fence line: up to three spaces of indentation (CommonMark), the
 *  backtick run, its info string. An indented fence is copied through: its
 *  body would need the indentation stripped and restored, and no page has one. */
const FENCE = /^( {0,3})(`{3,})(.*)$/;

/** info strings this formatter owns: `html`, `html example …` - not `htmlx` */
const isHtml = (info: string) => /^html(\s|$)/.test(info);

/** the fence length a body needs: longer than any backtick run opening one of its lines */
export function fenceLengthFor(body: string, minimum = 3): number {
  let need = minimum;
  for (const line of body.split('\n')) {
    const run = line.match(/^ {0,3}(`{3,})/)?.[1].length ?? 0;
    if (run >= need) need = run + 1;
  }
  return need;
}

/** script types a JS/JSON formatter may touch; every other `<script type>` (text/markdown: an
 *  Editor.js document, text/plain) carries DATA whose bytes an app reads - kept verbatim */
const CODE_SCRIPT_TYPES = new Set(['', 'module', 'text/javascript', 'application/javascript', 'application/json', 'application/ld+json', 'importmap']);

/** The elements a formatter must not touch, each swapped for an HTML comment the formatter keeps
 *  verbatim; `restore` puts them back:
 *  - `<script type="…">` of a data type (text/markdown): its bytes are what an app reads;
 *  - `<pre>` and `<textarea>`: their content is verbatim by definition, and Prettier (3.9, strict
 *    whitespace sensitivity) prints a stray `>` before a `<pre>` that directly follows another
 *    element's closing tag - masked, the `<pre>` never reaches it.
 *  VERIFIED: Prettier re-indented the Document Editor scaffold's text/markdown document (10 e2e
 *  checks failed) and turned `</summary><pre>` into `</summary>><pre>` (error-state, comment-item);
 *  tests/format-pages.test.ts pins both cases byte for byte. */
export function keepVerbatim(html: string): { masked: string; restore: (formatted: string) => string } {
  const kept: string[] = [];
  const keep = (whole: string) => {
    kept.push(whole);
    return `<!--format-pages:keep:${kept.length - 1}-->`;
  };
  const masked = html
    .replace(/<script\b([^>]*)>[\s\S]*?<\/script>/gi, (whole, attrs: string) => {
      const type = (attrs.match(/\btype\s*=\s*["']?([^"'\s>]*)/i)?.[1] ?? '').toLowerCase();
      return CODE_SCRIPT_TYPES.has(type) ? whole : keep(whole);
    })
    .replace(/<(pre|textarea)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, keep);
  return { masked, restore: (formatted) => formatted.replace(/<!--format-pages:keep:(\d+)-->/g, (_, i) => kept[Number(i)]) };
}

export async function formatFences(mdx: string, fmt: Formatter): Promise<FormatFencesResult> {
  const lines = mdx.split('\n');
  const out: string[] = [];
  let fences = 0;
  let changed = 0;
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].match(FENCE);
    if (!open) {
      out.push(lines[i]);
      continue;
    }
    const indent = open[1];
    const ticks = open[2];
    const info = open[3];
    const close = new RegExp(`^ {0,3}\`{${ticks.length},}\\s*$`);
    let j = i + 1;
    while (j < lines.length && !close.test(lines[j])) j++;
    if (j >= lines.length) {
      // unclosed fence: not ours to repair
      out.push(...lines.slice(i));
      break;
    }
    if (!isHtml(info) || indent !== '') {
      out.push(...lines.slice(i, j + 1));
      i = j;
      continue;
    }
    fences++;
    const body = lines.slice(i + 1, j).join('\n');
    const { masked, restore } = keepVerbatim(body);
    const formatted = body.trim() === '' ? '' : restore(await fmt(masked + '\n')).replace(/\n+$/, '');
    const fence = '`'.repeat(fenceLengthFor(formatted, ticks.length));
    if (formatted !== body || fence !== ticks || lines[j].trim() !== ticks) changed++;
    out.push(fence + info);
    if (formatted !== '') out.push(formatted);
    out.push(fence);
    i = j;
  }
  return { text: out.join('\n'), fences, changed };
}
