/**
 * Why: tweakcn theme presets set sidebar token pairs, but the doc-site nav
 * styles (and agents authoring UIs) can still pair colors whose contrast
 * falls apart on some themes. verify.ts uses these pure helpers to measure
 * contrast of token pairs across every theme in themes.ts, so contrast
 * regressions fail the build with the exact theme/mode/pair named.
 */

export type RGB = [number, number, number];

/**
 * Why: parse the color shapes tweakcn exports (hex, rgb/rgba, oklch) into
 * sRGB 0–255 so luminance math works uniformly. Unknown formats return null
 * so callers skip rather than mis-measure.
 */
export function parseColor(c: string): RGB | null {
  const s = c.trim();
  let m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (m) {
    let hex = m[1];
    if (hex.length === 3) hex = [...hex].map((x) => x + x).join('');
    const n = parseInt(hex.slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const parts = m[1].split(/[,/\s]+/).filter(Boolean);
    const conv = (v: string, max: number): number | null => {
      const pct = v.endsWith('%');
      const n = parseFloat(pct ? v : v);
      if (Number.isNaN(n)) return null;
      return Math.round(pct ? (n / 100) * max : Math.min(n, max));
    };
    const r = conv(parts[0], 255);
    const g = conv(parts[1], 255);
    const b = conv(parts[2], 255);
    return r === null || g === null || b === null ? null : [r, g, b];
  }
  m = s.match(/^oklch\(\s*([^ ]+|[^a-z]+)\s+(-?[\d.]+|none)\s+(-?[\d.]+|none)(?:deg)?\s*\)$/i);
  if (m) {
    const L = parseFloat(m[1] === 'none' ? '0' : m[1]);
    const C = parseFloat(m[2] === 'none' ? '0' : m[2]);
    let H = parseFloat(m[3] === 'none' ? '0' : m[3]);
    if (Number.isNaN(L) || Number.isNaN(C) || Number.isNaN(H)) return null;
    return oklchToRgb(L, C, H);
  }
  return null;
}

/**
 * Why: OKLCH → linear sRGB (standard Björn Ottosson inverse: OKLab → LMS →
 * cube root → LMS-to-linear-RGB). Clamps to [0,255]; out-of-gamut colors land
 * on the nearest gamut edge, which is fine for contrast measurement.
 */
export function oklchToRgb(L: number, C: number, Hdeg: number): RGB {
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const lin = [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return lin.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255)) as RGB;
}

/** WCAG relative luminance (sRGB → linear → weighted sum). */
function luminance([r, g, b]: RGB): number {
  const chan = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

/**
 * Why: WCAG contrast ratio (1…21). Returns null when either color is
 * unparsable so callers skip instead of failing on exotic color syntax.
 */
export function contrastRatio(a: string, b: string): number | null {
  const ca = parseColor(a);
  const cb = parseColor(b);
  if (!ca || !cb) return null;
  const la = luminance(ca);
  const lb = luminance(cb);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Why: themes.ts is a plain data file; this extracts per-theme token maps
 * without executing it (verify runs under bun without DOM, tests want the raw
 * data). Tracks brace depth while respecting string literals so the
 * light:{…}/dark:{…} blocks are split exactly.
 */
export function parseThemes(source: string): ThemeEntry[] {
  const entries: ThemeEntry[] = [];
  // theme objects start at a `{ id: "x",` and end at the next top-level `{`
  const starts = [...source.matchAll(/\{\s*\n\s*id:\s*"([^"]+)"/g)];
  for (let i = 0; i < starts.length; i++) {
    const begin = starts[i].index!;
    const end = i + 1 < starts.length ? starts[i + 1].index! : source.lastIndexOf(']');
    const chunk = source.slice(begin, end);
    const modes: Record<string, Record<string, string>> = {};
    for (const mode of ['light', 'dark'] as const) {
      const key = `${mode}:`;
      const k = chunk.indexOf(key);
      if (k === -1) continue;
      const open = chunk.indexOf('{', k);
      const close = findMatchingBrace(chunk, open);
      if (close === -1) continue;
      const tokens: Record<string, string> = {};
      for (const tm of chunk.slice(open + 1, close).matchAll(/"?([A-Za-z][\w-]*)"?\s*:\s*"([^"]*)"/g))
        tokens[tm[1]] = tm[2];
      modes[mode] = tokens;
    }
    const label = chunk.match(/label:\s*"([^"]*)"/)?.[1] ?? starts[i][1];
    // optional `links: [...]` - resource links (fonts) the theme needs at
    // runtime, authored as STRICT JSON (double quotes) so this is the one
    // honest parse; build.ts ships it verbatim as <id>.json, and a malformed
    // array fails the build here instead of the consumer's font loader.
    let links: Record<string, unknown>[] | undefined;
    const linksAt = chunk.search(/\n\s*links:/);
    if (linksAt !== -1) {
      const open = chunk.indexOf('[', linksAt);
      const close = findMatchingBracket(chunk, open);
      if (open === -1 || close === -1)
        throw new Error(`themes.ts: theme "${starts[i][1]}" has an unterminated links array`);
      try {
        links = JSON.parse(chunk.slice(open, close + 1));
      } catch (e) {
        throw new Error(`themes.ts: theme "${starts[i][1]}" links must be valid JSON - ${e}`);
      }
    }
    entries.push({ id: starts[i][1], label, modes, ...(links ? { links } : {}) });
  }
  return entries;
}

export type ThemeEntry = {
  id: string;
  label: string;
  modes: Record<string, Record<string, string>>;
  /** resource <link> VNodes (defuss-JSX-as-JSON) the theme loads at runtime */
  links?: Record<string, unknown>[];
};

/** WCAG AA minimum contrast for normal-size text. */
export const WCAG_AA = 4.5;

/**
 * Why: "default" isn't in themes.ts - its tokens live in the shipped
 * default-semantic-tokens.css. This extracts the sidebar token values from
 * the :root/.dark blocks so the contrast gate covers the default theme too
 * (it had the washed-out active-pill bug the user reported).
 */
export function defaultTokenModes(source: string): Record<string, Record<string, string>> {
  // token blocks are flat declarations - match each block's braces exactly
  // once (index-based slicing breaks if comments mention ".dark" early)
  const grab = (re: RegExp): Record<string, string> => {
    const block = source.match(re)?.[0] ?? '';
    const out: Record<string, string> = {};
    for (const m of block.matchAll(/--(sidebar[\w-]*)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
    return out;
  };
  return {
    light: grab(/:root\s*\{[^}]*\}/),
    dark: grab(/\.dark\s*\{[^}]*\}/),
  };
}

/**
 * Why: the doc-site nav lives on --sidebar, so its two guaranteed-readable
 * pairings are sidebar-accent-foreground/on-sidebar-accent (active/hover)
 * and sidebar-foreground/on-sidebar (idle). tweakcn presets drift apart in
 * taste - but these are the accessibility floor, and the bug class that
 * bit us is pairing text against the *wrong* background token. This
 * measures both pairs per theme/mode (default theme included) so verify
 * fails with the exact theme/mode named; unparsable colors are skipped,
 * not silently passed.
 */
/**
 * Why: a theme's shape is part of its identity - ChatGPT is pill-round,
 * Doom64 is hard-square. light and dark are two palettes of ONE theme, so
 * `radius` must be declared identically in both modes (themes.ts shipped
 * radius in light blocks only, so dark mode silently fell back to the
 * default rounding - AGENTS.md "Theme radius consistency").
 */
export function radiusConsistencyProblems(themes: ThemeEntry[]): string[] {
  const problems: string[] = [];
  for (const t of themes) {
    const light = t.modes.light?.radius;
    const dark = t.modes.dark?.radius;
    if (!light && !dark) continue; // theme opts into the default radius
    if (light !== dark)
      problems.push(`${t.id}: radius "${light ?? '(unset)'}" (light) ≠ "${dark ?? '(unset)'}" (dark) - both modes must declare the same value`);
  }
  return problems;
}

export function sidebarContrastProblems(
  themes: ThemeEntry[],
  min = WCAG_AA,
): string[] {
  const problems: string[] = [];
  const pairs: Array<[string, string, string]> = [
    ['sidebar-accent-foreground', 'sidebar-accent', 'active nav text'],
    ['sidebar-foreground', 'sidebar', 'idle nav text'],
  ];
  for (const t of themes) {
    for (const mode of ['light', 'dark']) {
      const tk = t.modes[mode];
      if (!tk) continue;
      for (const [fgKey, bgKey, what] of pairs) {
        const ratio = tk[fgKey] && tk[bgKey] ? contrastRatio(tk[fgKey], tk[bgKey]) : null;
        if (ratio === null || ratio >= min) continue;
        problems.push(
          `${t.id} (${mode}): ${what} ${tk[fgKey]} on ${tk[bgKey]} = ${ratio.toFixed(2)} < ${min}`,
        );
      }
    }
  }
  return problems;
}

/** Index of the `]` matching the `[` at `open` (string-aware; braces inside
 * array items are skipped - only bracket depth counts). -1 if unbalanced. */
function findMatchingBracket(s: string, open: number): number {
  if (open === -1) return -1;
  let depth = 0;
  let inStr = false;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === '"' && s[i - 1] !== '\\') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Index of the `}` matching the `{` at `open` (string-aware). -1 if unbalanced. */
function findMatchingBrace(s: string, open: number): number {
  let depth = 0;
  let inStr = false;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
