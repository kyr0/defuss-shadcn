import { inflateSync } from 'node:zlib';

/**
 * Why: a print check asserts what a reader sees on each page - the header row on every page, the total on the
 * last one, "Seite 2 von 3" from page 2 - so it needs the text per page, not the layout before printing. Chromium
 * (Skia) writes every page as one content stream whose text shows 2-byte glyph codes (`<00240025> Tj`, `[...] TJ`)
 * in a font that carries a ToUnicode CMap (bfchar / bfrange); this reads exactly that, no PDF library.
 * VERIFIED: (tmp/pdf-structure-probe.ts on a Chromium 153 PDF) page objects list their fonts under
 * /Resources /Font, each font names its /ToUnicode stream, the pages tree's /Kids give the page order.
 */

interface PdfObject {
  dict: string;
  data?: Buffer;
}

/** every `N 0 obj ... endobj`, its dictionary and its (inflated) stream - streams are skipped by /Length */
function objects(pdf: Buffer): Map<number, PdfObject> {
  const s = pdf.toString('latin1');
  const out = new Map<number, PdfObject>();
  const re = /(\d+) 0 obj\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const from = m.index + m[0].length;
    const end = s.indexOf('endobj', from);
    const at = s.indexOf('stream', from);
    if (at !== -1 && at < end) {
      const dict = s.slice(from, at);
      const length = Number(/\/Length (\d+)/.exec(dict)?.[1] ?? 0);
      let start = at + 'stream'.length;
      if (s[start] === '\r') start++;
      if (s[start] === '\n') start++;
      const raw = pdf.subarray(start, start + length);
      let data = raw;
      if (/\/FlateDecode/.test(dict)) {
        try {
          data = inflateSync(raw);
        } catch {
          data = raw;
        }
      }
      out.set(Number(m[1]), { dict, data });
      re.lastIndex = s.indexOf('endobj', start + length) + 'endobj'.length;
    } else {
      out.set(Number(m[1]), { dict: s.slice(from, end) });
      re.lastIndex = end + 'endobj'.length;
    }
  }
  return out;
}

const ref = (dict: string, key: string): number | undefined => {
  const m = new RegExp(`/${key}\\s+(\\d+) 0 R`).exec(dict);
  return m ? Number(m[1]) : undefined;
};

/** a `/Key << ... >>` sub-dictionary written inline (one level - Skia's /Font and /XObject maps) */
const inline = (dict: string, key: string): string | undefined => new RegExp(`/${key}\\s*<<([^>]*)>>`).exec(dict)?.[1];

/** name → object number of a resource map (inline, or one indirect object away) */
function resources(objs: Map<number, PdfObject>, dict: string, kind: 'Font' | 'XObject'): Map<string, number> {
  const resDict = inline(dict, 'Resources') !== undefined ? dict : (objs.get(ref(dict, 'Resources') ?? -1)?.dict ?? '');
  let map = inline(resDict, kind);
  if (map === undefined) {
    const id = ref(resDict, kind);
    map = id !== undefined ? objs.get(id)?.dict : undefined;
  }
  const out = new Map<string, number>();
  for (const m of (map ?? '').matchAll(/\/(\S+?)\s+(\d+) 0 R/g)) out.set(m[1], Number(m[2]));
  return out;
}

/** a font's ToUnicode CMap: glyph code (hex) → text */
function cmap(objs: Map<number, PdfObject>, fontId: number): Map<string, string> {
  const out = new Map<string, string>();
  const id = ref(objs.get(fontId)?.dict ?? '', 'ToUnicode');
  const text = id !== undefined ? (objs.get(id)?.data?.toString('latin1') ?? '') : '';
  const utf16 = (hex: string) => String.fromCharCode(...(hex.match(/.{4}/g) ?? []).map((h) => parseInt(h, 16)));
  for (const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g))
    for (const m of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) out.set(m[1].toUpperCase(), utf16(m[2]));
  for (const block of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g))
    for (const m of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(<[0-9A-Fa-f]+>|\[[^\]]*\])/g)) {
      const lo = parseInt(m[1], 16);
      const hi = parseInt(m[2], 16);
      const width = m[1].length;
      const list = m[3].startsWith('[') ? [...m[3].matchAll(/<([0-9A-Fa-f]+)>/g)].map((x) => x[1]) : null;
      const first = list ? 0 : parseInt(m[3].slice(1, -1), 16);
      for (let code = lo; code <= hi; code++) {
        const key = code.toString(16).toUpperCase().padStart(width, '0');
        out.set(key, list ? utf16(list[code - lo] ?? '') : String.fromCharCode(first + code - lo));
      }
    }
  return out;
}

/** a PDF transform [a b c d e f] */
type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
/** m applied first, then n (PDF row-vector convention: p' = p × m × n) */
const mul = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
];

/** one text run: its text and where it starts (the text matrix's origin) in PDF points, origin bottom left */
interface Run {
  text: string;
  x: number;
  y: number;
}

/**
 * The text a content stream shows, one run per text matrix (Tm) - a Tj / TJ without a new Tm continues the run;
 * q / Q / cm are followed so a run's origin lands in page space, and XObjects (Do) are entered with their /Matrix.
 */
function streamRuns(objs: Map<number, PdfObject>, owner: string, ops: string, seen: Set<number>, start: Matrix): Run[] {
  const fonts = resources(objs, owner, 'Font');
  const xobjects = resources(objs, owner, 'XObject');
  const maps = new Map<string, Map<string, string>>();
  const out: Run[] = [];
  const stack: Matrix[] = [];
  let ctm = start;
  let run: Run | null = null;
  let font: Map<string, string> | undefined;
  const decode = (hex: string) => {
    const width = font && [...font.keys()][0]?.length === 2 ? 2 : 4;
    return (hex.match(new RegExp(`.{${width}}`, 'g')) ?? []).map((c) => font?.get(c.toUpperCase()) ?? '').join('');
  };
  const show = (text: string) => {
    if (!run) out.push((run = { text: '', x: ctm[4], y: ctm[5] }));
    run.text += text;
  };
  const num = '([-\\d.]+)\\s+';
  const six = num.repeat(6);
  const re = new RegExp(
    `(?:^|\\s)(q|Q)(?=\\s)|${six}cm|${six}Tm|\\/(\\S+)\\s+[-\\d.]+\\s+Tf|<([0-9A-Fa-f]*)>\\s*Tj|\\[((?:[^\\]]|\\n)*?)\\]\\s*TJ|\\/(\\S+)\\s+Do`,
    'g',
  );
  for (const m of ops.matchAll(re)) {
    if (m[1] === 'q') stack.push(ctm);
    else if (m[1] === 'Q') ctm = stack.pop() ?? ctm;
    else if (m[2] !== undefined) ctm = mul(m.slice(2, 8).map(Number) as Matrix, ctm);
    else if (m[8] !== undefined) {
      const t = m.slice(8, 14).map(Number) as Matrix;
      const [x, y] = [t[4] * ctm[0] + t[5] * ctm[2] + ctm[4], t[4] * ctm[1] + t[5] * ctm[3] + ctm[5]];
      out.push((run = { text: '', x, y }));
    } else if (m[14]) {
      const id = fonts.get(m[14]);
      if (id !== undefined && !maps.has(m[14])) maps.set(m[14], cmap(objs, id));
      font = maps.get(m[14]);
    } else if (m[15] !== undefined) show(decode(m[15]));
    else if (m[16] !== undefined) {
      // a TJ array: hex strings with kerning numbers between them; a large negative number is a word space
      show(
        [...m[16].matchAll(/<([0-9A-Fa-f]*)>|(-?[\d.]+)/g)].map((p) => (p[1] !== undefined ? decode(p[1]) : Number(p[2]) < -200 ? ' ' : '')).join(''),
      );
    } else if (m[17]) {
      const id = xobjects.get(m[17]);
      const x = id !== undefined ? objs.get(id) : undefined;
      if (x?.data && !seen.has(id!)) {
        seen.add(id!);
        const matrix = /\/Matrix\s*\[([^\]]*)\]/.exec(x.dict)?.[1].trim().split(/\s+/).map(Number) as Matrix | undefined;
        out.push(...streamRuns(objs, x.dict, x.data.toString('latin1'), seen, matrix?.length === 6 ? mul(matrix, ctm) : ctm));
        run = null;
      }
    }
  }
  return out.filter((r) => r.text);
}

/**
 * The text of every page of a Chromium PDF, in page order: each page's text runs joined as they come, whitespace
 * collapsed. Chromium writes some text glyph by glyph (letter-spaced lines, margin boxes) and puts no space
 * between runs, so words can run together or apart - compare without whitespace (perPage does).
 */
export function pdfText(pdf: Buffer): string[] {
  return pdfRuns(pdf).map((runs) =>
    runs
      .map((r) => r.text)
      .join('')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

/** A text run on a printed page: its text and where it starts, in mm from the page's top-left corner (baseline). */
export interface PageRun {
  text: string;
  /** mm from the left edge */
  x: number;
  /** mm from the top edge, at the baseline */
  y: number;
}

/** The text runs of every page of a Chromium PDF, in page order and stream order, positioned in mm. */
export function pdfRuns(pdf: Buffer): PageRun[][] {
  const objs = objects(pdf);
  // the page order: the pages tree from its root (a /Pages node without /Parent), /Kids depth first
  const pageIds: number[] = [];
  const walk = (id: number) => {
    const dict = objs.get(id)?.dict ?? '';
    if (/\/Type\s*\/Pages\b/.test(dict)) {
      const kids = /\/Kids\s*\[([^\]]*)\]/.exec(dict)?.[1] ?? '';
      for (const k of kids.matchAll(/(\d+) 0 R/g)) walk(Number(k[1]));
    } else if (/\/Type\s*\/Page\b/.test(dict)) pageIds.push(id);
  };
  const root = [...objs].find(([, o]) => /\/Type\s*\/Pages\b/.test(o.dict) && !/\/Parent\b/.test(o.dict));
  if (root) walk(root[0]);
  const mm = 25.4 / 72;
  return pageIds.map((id) => {
    const dict = objs.get(id)!.dict;
    const height = Number(/\/MediaBox\s*\[([^\]]*)\]/.exec(dict)?.[1].trim().split(/\s+/)[3] ?? 842);
    const contents = [...(/\/Contents\s*\[([^\]]*)\]/.exec(dict)?.[1] ?? `${ref(dict, 'Contents') ?? ''} 0 R`).matchAll(/(\d+) 0 R/g)];
    const ops = contents.map((c) => objs.get(Number(c[1]))?.data?.toString('latin1') ?? '').join('\n');
    return streamRuns(objs, dict, ops, new Set(), IDENTITY).map((r) => ({ text: r.text, x: r.x * mm, y: (height - r.y) * mm }));
  });
}

/** a PDF string token at the start of `s`: a literal `( ... )` (escapes, nested parentheses) or `<hex>`; UTF-16BE
 *  with its byte order mark, else one byte per character */
function pdfString(s: string): string | undefined {
  s = s.trimStart();
  let bytes: number[] = [];
  if (s[0] === '<') bytes = (s.slice(1, s.indexOf('>')).replace(/\s+/g, '').match(/.{1,2}/g) ?? []).map((h) => parseInt(h.padEnd(2, '0'), 16));
  else if (s[0] === '(') {
    const escapes: Record<string, number> = { n: 10, r: 13, t: 9, b: 8, f: 12 };
    for (let i = 1, depth = 1; i < s.length; i++) {
      const c = s[i];
      if (c === '\\') {
        const next = s[++i];
        const octal = /^[0-7]{1,3}/.exec(s.slice(i))?.[0];
        if (octal) {
          bytes.push(parseInt(octal, 8));
          i += octal.length - 1;
        } else if (next in escapes) bytes.push(escapes[next]);
        else if (next !== '\n' && next !== '\r') bytes.push(next.charCodeAt(0));
        continue;
      }
      if (c === '(') depth++;
      if (c === ')' && --depth === 0) break;
      bytes.push(c.charCodeAt(0));
    }
  } else return undefined;
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    let text = '';
    for (let i = 2; i + 1 < bytes.length; i += 2) text += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
    return text;
  }
  return String.fromCharCode(...bytes);
}

/** A bookmark of a PDF's outline: its title and its depth (0 = top level). */
export interface OutlineItem {
  title: string;
  level: number;
}

/**
 * The bookmarks of a PDF (its document outline), depth first - what a reader's sidebar lists. Chromium writes one
 * per heading when printed with `outline: true`, titled with the heading's text as laid out.
 * VERIFIED: (tmp/tagged-pdf-probe.ts) Chromium 153 writes the titles as literal strings, or as UTF-16BE hex with a
 * byte order mark when they hold a character outside ASCII ("Angebot für ...").
 */
export function pdfOutline(pdf: Buffer): OutlineItem[] {
  const objs = objects(pdf);
  const catalog = [...objs.values()].find((o) => /\/Type\s*\/Catalog\b/.test(o.dict));
  const out: OutlineItem[] = [];
  const seen = new Set<number>();
  const walk = (first: number | undefined, level: number) => {
    for (let at = first; at !== undefined && !seen.has(at); ) {
      seen.add(at);
      const dict = objs.get(at)?.dict ?? '';
      const title = /\/Title\s*/.exec(dict);
      if (title) out.push({ title: pdfString(dict.slice(title.index + title[0].length)) ?? '', level });
      walk(ref(dict, 'First'), level + 1);
      at = ref(dict, 'Next');
    }
  };
  const root = catalog && ref(catalog.dict, 'Outlines');
  if (root !== undefined) walk(ref(objs.get(root)?.dict ?? '', 'First'), 0);
  return out;
}

/** whether a PDF is tagged: a structure tree (headings, paragraphs, tables) a screen reader can follow */
export const pdfTagged = (pdf: Buffer): boolean => /\/StructTreeRoot\s+\d+ 0 R/.test(pdf.toString('latin1'));

/** the first run on a page whose text (whitespace ignored) starts with `text` */
export const runAt = (runs: PageRun[], text: string): PageRun | undefined =>
  runs.find((r) => r.text.replace(/\s+/g, '').startsWith(text.replace(/\s+/g, '')));

const squeeze = (s: string) => s.replace(/\s+/g, '');

/** how often `text` appears on each page, whitespace ignored on both sides */
export const perPage = (pages: string[], text: string): number[] =>
  pages.map((p) => squeeze(p).split(squeeze(text)).length - 1);
