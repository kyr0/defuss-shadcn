/**
 * Bundlers and minifiers drop comments - also the `/* @vite-ignore *\/` hint a
 * source puts in a dynamic import() of a runtime URL (mermaid's vendor build).
 * Without it a consumer's Vite warns "The above dynamic import cannot be
 * analyzed" for the shipped bundle. viteIgnore() puts the hint back on every
 * import() whose argument is not a literal, and shifts the source map so it
 * still points at the same code (pure: strings in, strings out).
 */

const HINT = '/* @vite-ignore */ ';
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** the first base64-VLQ value of a source-map segment, and how many characters it used */
function decodeFirst(segment: string): { value: number; length: number } {
  let shift = 0;
  let result = 0;
  let i = 0;
  for (;;) {
    const digit = B64.indexOf(segment[i++]);
    result += (digit & 31) << shift;
    if (!(digit & 32)) break;
    shift += 5;
  }
  return { value: result & 1 ? -(result >>> 1) : result >>> 1, length: i };
}

function encode(value: number): string {
  let vlq = value < 0 ? (-value << 1) | 1 : value << 1;
  let out = '';
  do {
    let digit = vlq & 31;
    vlq >>>= 5;
    if (vlq) digit |= 32;
    out += B64[digit];
  } while (vlq);
  return out;
}

/** move every generated column at or after `column` on one mappings line by `by` */
function shiftLine(line: string, column: number, by: number): string {
  if (!line) return line;
  const segments = line.split(',');
  let at = 0;
  for (let i = 0; i < segments.length; i++) {
    const { value, length } = decodeFirst(segments[i]);
    at += value;
    if (at >= column) {
      // deltas: only the first segment at/after the insertion moves; the rest follow it
      segments[i] = encode(value + by) + segments[i].slice(length);
      break;
    }
  }
  return segments.join(',');
}

/** where the hint goes: right after `import(` when the argument is not a string / template literal */
const DYNAMIC_IMPORT = /\bimport\((?!\s*\/\*\s*@vite-ignore)(?=\s*[A-Za-z_$])/g;

export function viteIgnore(code: string, mappings?: string): { code: string; mappings?: string; count: number } {
  const hits: number[] = [];
  for (const m of code.matchAll(DYNAMIC_IMPORT)) hits.push(m.index! + m[0].length);
  if (!hits.length) return { code, mappings, count: 0 };
  let out = code;
  const lines = mappings?.split(';');
  // last first, so earlier offsets stay valid
  for (const offset of hits.reverse()) {
    out = out.slice(0, offset) + HINT + out.slice(offset);
    if (lines) {
      const before = code.slice(0, offset);
      const line = before.split('\n').length - 1;
      const column = offset - (before.lastIndexOf('\n') + 1);
      if (lines[line] !== undefined) lines[line] = shiftLine(lines[line], column, HINT.length);
    }
  }
  return { code: out, mappings: lines?.join(';'), count: hits.length };
}
