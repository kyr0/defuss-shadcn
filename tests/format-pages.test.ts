import { describe, expect, it } from 'vitest';
import * as prettier from 'prettier/standalone';
import html from 'prettier/plugins/html';
import postcss from 'prettier/plugins/postcss';
import babel from 'prettier/plugins/babel';
import estree from 'prettier/plugins/estree';
import { fenceLengthFor, formatFences } from '../scripts/lib/format-pages.ts';
import { exampleFence } from '../scripts/lib/docs-ssg.ts';
import { exampleFences } from '../scripts/lib/schema.ts';
import { pageSourceRel } from '../src/documentation/lib/page-dirs.ts';

/** a real page's source: Vite serves any file as a string module with `?raw`
 * (a plain fetch would run the .mdx through its JS import analysis) */
const page = async (name: string): Promise<string> => (await import(/* @vite-ignore */ `/src/documentation/pages/${pageSourceRel(name)}?raw`)).default;

/**
 * Why: scripts/format-pages.ts reflows the html example fences of the doc
 * pages. Pins what the pure core promises: only ```html fence bodies change,
 * the fence grows when a body holds a ``` line, the result is idempotent,
 * and a formatted fence renders the same DOM (elements, attributes, text)
 * as the authored one - checked on real pages with the browser's parser.
 */

/** the CLI's HTML_OPTIONS plus the browser build's plugins */
const fmt = (s: string) =>
  prettier.format(s, {
    parser: 'html',
    printWidth: 120,
    singleQuote: true,
    htmlWhitespaceSensitivity: 'strict',
    plugins: [html, postcss, babel, estree],
  });

/** embedded CSS as the browser parses it - Prettier reflows the text (indentation, a final semicolon) */
const cssRules = (text: string) => {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(text);
  return Array.from(sheet.cssRules).map((r) => r.cssText);
};

/** embedded JS as a token soup: Prettier's quote style, quoted object keys, semicolons, arrow parentheses
 *  and trailing commas are the formatting freedoms; every other character must survive */
const jsSoup = (text: string) =>
  text
    .replace(/\s+/g, '')
    .replace(/"/g, "'")
    .replace(/\\'/g, "'")
    .replace(/'([A-Za-z_$][\w$]*)'(?=:)/g, '$1')
    .replace(/,(?=[)\]}])/g, '')
    .replace(/[;()]/g, '');

/** elements, attributes in order and whitespace-collapsed text - what a reader sees */
function canon(markup: string): string[] {
  const doc = new DOMParser().parseFromString(`<body>${markup}</body>`, 'text/html');
  const out: string[] = [];
  const walk = (node: Node, raw: boolean) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        // whitespace runs collapse to one space, a whitespace-only node stays ONE token: with strict
        // whitespace sensitivity the formatter neither adds nor removes whitespace between elements
        // (a space between two inline-block tiles renders), it only moves line breaks inside a run
        const t = raw ? (child as Text).data : (child as Text).data.replace(/\s+/g, ' ');
        if (t) out.push(JSON.stringify(t));
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        // a style attribute as the browser parses it - Prettier spaces its declarations
        const attr = (a: Attr) => `${a.name}=${JSON.stringify(a.name === 'style' ? (el as HTMLElement).style.cssText : a.value)}`;
        out.push(`<${el.tagName} ${Array.from(el.attributes).map(attr).join(' ')}>`);
        const type = (el.getAttribute('type') ?? '').toLowerCase();
        const codeScript = ['', 'module', 'text/javascript', 'application/javascript', 'application/json', 'application/ld+json', 'importmap'].includes(type);
        if (el.tagName === 'STYLE') out.push(...cssRules(el.textContent ?? ''));
        else if (el.tagName === 'SCRIPT' && codeScript) out.push(jsSoup(el.textContent ?? ''));
        else if (el.tagName === 'SCRIPT') out.push(el.textContent ?? ''); // data (text/markdown): byte for byte
        else walk(el, raw || el.tagName === 'PRE' || el.tagName === 'TEXTAREA');
        out.push(`</${el.tagName}>`);
      }
    }
  };
  walk(doc.body, false);
  return out;
}

const fenceBodies = (mdx: string) => [...mdx.matchAll(/^(`{3,})html[^\n]*\n([\s\S]*?)^\1$/gm)].map((m) => m[2]);

/** the first canonical entry two markups disagree on, with its neighbours - null when equal */
function firstDiff(a: string[], b: string[]): string | null {
  if (a.length !== b.length) return `${a.length} vs ${b.length} entries`;
  const i = a.findIndex((x, k) => x !== b[k]);
  if (i < 0) return null;
  if (a[i].length > 200 && b[i].length > 200) {
    // a long text (a script's token soup): show the first differing character in context
    let c = 0;
    while (c < a[i].length && a[i][c] === b[i][c]) c++;
    return `entry ${i}, character ${c}\n  before: …${a[i].slice(Math.max(0, c - 60), c + 60)}…\n  after:  …${b[i].slice(Math.max(0, c - 60), c + 60)}…`;
  }
  const from = Math.max(0, i - 1);
  return `entry ${i}\n  before: ${a.slice(from, i + 2).join(' | ')}\n  after:  ${b.slice(from, i + 2).join(' | ')}`;
}

describe('formatFences', () => {
  it('leaves a page without html fences alone', async () => {
    const page = '# Title\n\n```states\n| State | Type |\n| --- | --- |\n| a | string |\n```\n\n<p>prose</p>\n';
    const r = await formatFences(page, fmt);
    expect(r).toEqual({ text: page, fences: 0, changed: 0 });
  });

  it('formats an html example fence body and nothing else', async () => {
    const long = '<div class="card"><p>' + 'word '.repeat(60).trim() + '</p><button class="btn" data-variant="outline">Go</button></div>';
    const page = `<Example>\n\n\`\`\`html example label="x" schema="none"\n${long}\n\`\`\`\n\n</Example>\n<p>a long prose line ${'x'.repeat(200)}</p>\n`;
    const r = await formatFences(page, fmt);
    expect(r.fences).toBe(1);
    expect(r.changed).toBe(1);
    expect(r.text).toMatch(/^```html example label="x" schema="none"\n/m);
    expect(r.text).toContain(`<p>a long prose line ${'x'.repeat(200)}</p>`);
    expect(r.text.split('\n').filter((l) => l.length > 120)).toHaveLength(1); // the prose line only
    expect(canon(fenceBodies(r.text)[0].trimEnd())).toEqual(canon(long));
  });

  it('skips a ```html opening inside another fence', async () => {
    const page = '```md\n```html example\n<div   class="x">   </div>\n```\n```\n';
    const r = await formatFences(page, fmt);
    expect(r).toEqual({ text: page, fences: 0, changed: 0 });
  });

  it('grows the fence when the formatted body holds a ``` line', async () => {
    // a body whose ``` sits indented by four spaces is a valid 3-backtick fence;
    // a formatter that moves such a line to the margin would close the fence early
    const page = '```html example\n<p>    ```</p>\n```\n';
    const reflow = async () => '<p>\n```\n</p>\n';
    const r = await formatFences(page, reflow);
    expect(r.text).toBe('````html example\n<p>\n```\n</p>\n````\n');
    expect(fenceBodies(r.text)).toHaveLength(1);
    // the readers of these fences accept the longer fence
    expect(exampleFence(r.text)).toBe(fenceBodies(r.text)[0]);
    expect(exampleFences(r.text)).toHaveLength(1);
    expect(exampleFences(r.text)[0].body).toBe(fenceBodies(r.text)[0].replace(/\n$/, ''));
    expect(fenceLengthFor('x\n```\ny')).toBe(4);
    expect(fenceLengthFor('x\n`````\ny')).toBe(6);
    expect(fenceLengthFor('plain', 5)).toBe(5);
  });

  it('keeps data scripts, pre and textarea byte for byte - Prettier would re-indent a Markdown document and prints a stray ">" before a <pre>', async () => {
    const md = '<script type="text/markdown" class="editorjs-source">\n# Title\n\n    indented stays\n</script>';
    const pre = '<pre><code>Error 504\n  keep   this</code></pre>';
    const details = `<details class="x"><summary>Technical details</summary>${pre}</details>`;
    const ta = '<textarea id="t">\n  </textarea>';
    const page = `\`\`\`html example\n<div class="wrap">${md}${details}${ta}</div>\n\`\`\`\n`;
    const r = await formatFences(page, fmt);
    const body = fenceBodies(r.text)[0];
    expect(body).toContain(md);
    expect(body).toContain(pre); // the <details> around it may be reflowed; the <pre> and its content never
    expect(body).toContain(ta);
    expect(body).not.toContain('>>');
    expect(canon(body.trimEnd())).toEqual(canon(`<div class="wrap">${md}${details}${ta}</div>`));
  });

  it('is idempotent on a real page', async () => {
    const badge = await page('badge');
    const once = await formatFences(badge, fmt);
    const twice = await formatFences(once.text, fmt);
    expect(once.fences).toBeGreaterThan(0);
    expect(twice.text).toBe(once.text);
    expect(twice.changed).toBe(0);
  });

  it.each(['badge', 'wishlist-item', 'scaffold-notes'])('keeps the rendered DOM of every fence of %s', async (name) => {
    const source = await page(name);
    const r = await formatFences(source, fmt);
    const before = fenceBodies(source);
    const after = fenceBodies(r.text);
    expect(after).toHaveLength(before.length);
    before.forEach((b, i) => expect(firstDiff(canon(b), canon(after[i])), `fence ${i}`).toBeNull());
  });
});
