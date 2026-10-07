/**
 * Why: a theme an agent writes from a photo or a brand guide looks right in
 * the reply and fails in the product - a token the system never reads, a
 * dark mode that keeps the default palette, a primary button nobody can
 * read. The shadcn-theme skill runs this checker (bundled into
 * skills/shadcn-theme/scripts/theme-check.mjs) on every theme it writes:
 * pure, text in, findings out, each finding naming the token, the mode and
 * the fix - for a failing contrast pair the nearest OKLCH lightness that
 * passes.
 * VERIFIED: (tests/theme-check.test.ts; agent-skills.e2e runs the bundle under node)
 */
import { contrastRatio, parseColor, luminance } from './contrast.ts';
import { COLOR_GROUPS, CONTRAST_PAIRS, THEME_TOKENS, TIER_LIMITS } from './theme-tokens.ts';

export interface ThemeFinding {
  level: 'error' | 'warning';
  rule: string;
  /** 1-based line in the theme file, when the finding has one */
  line?: number;
  message: string;
  fix?: string;
}

type Mode = 'light' | 'dark';
const MODES: readonly Mode[] = ['light', 'dark'];

/** A theme stylesheet's parts: font imports, and per mode each token's value and line. */
export function parseThemeCss(text: string): {
  imports: string[];
  modes: Partial<Record<Mode, Map<string, { value: string; line: number }>>>;
} {
  const lineAt = (i: number) => text.slice(0, i).split('\n').length;
  const imports = [...text.matchAll(/@import\s+url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map((m) => m[1]);
  const modes: Partial<Record<Mode, Map<string, { value: string; line: number }>>> = {};
  for (const block of text.matchAll(/(:root|\.dark)\s*\{([^}]*)\}/g)) {
    const mode: Mode = block[1] === ':root' ? 'light' : 'dark';
    const map = (modes[mode] ??= new Map());
    const bodyAt = block.index! + block[0].indexOf('{') + 1;
    for (const d of block[2].matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) map.set(d[1], { value: d[2].trim(), line: lineAt(bodyAt + d.index!) });
  }
  return { imports, modes };
}

/** Any colour parseColor reads, as OKLCH [L, C, H] (rounded for writing back). */
export function toOklch(color: string): [number, number, number] | null {
  const m = color.trim().match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/[^)]*)?\)$/i);
  if (m) return [m[2] ? parseFloat(m[1]) / 100 : parseFloat(m[1]), parseFloat(m[3]), parseFloat(m[4])];
  const rgb = parseColor(color);
  if (!rgb) return null;
  // sRGB → linear → LMS → OKLab (Björn Ottosson), then polar
  const [r, g, b] = rgb.map((v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const mm = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s2 = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * mm - 0.0040720468 * s2;
  const A = 1.9779984951 * l - 2.428592205 * mm + 0.4505937099 * s2;
  const B = 0.0259040371 * l + 0.7827717662 * mm - 0.808675766 * s2;
  const C = Math.hypot(A, B);
  const H = C < 1e-4 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return [+L.toFixed(4), +C.toFixed(4), +H.toFixed(2)];
}

/** The OKLCH colour with the lightness nearest to `fg`'s that reaches `target`
 *  against `bg`, chroma and hue kept - null when a colour cannot be read or
 *  no lightness reaches it. */
export function suggestLightness(fg: string, bg: string, target: number): string | null {
  const lch = toOklch(fg);
  const bgRgb = parseColor(bg);
  if (!lch || !bgRgb) return null;
  const [L0, c, h] = lch;
  // away from the background: darker text on a light surface, lighter on a dark one
  const step = luminance(bgRgb) > 0.18 ? -0.005 : 0.005;
  for (let L = L0; L >= 0 && L <= 1; L += step) {
    const candidate = `oklch(${+L.toFixed(3)} ${c} ${h})`;
    if ((contrastRatio(candidate, bg) ?? 0) >= target) return candidate;
  }
  return null;
}

const GENERIC_FONTS = /^(system-ui|ui-sans-serif|ui-serif|ui-monospace|sans-serif|serif|monospace|cursive|fantasy|-apple-system|BlinkMacSystemFont|Segoe UI|Helvetica Neue|Helvetica|Arial|Georgia|Times New Roman|Times|Menlo|Monaco|Consolas|Courier New|Courier|SFMono-Regular|Liberation Mono|Roboto Mono|Apple Color Emoji|Segoe UI Emoji|Noto Color Emoji)$/i;

/**
 * Every problem of a theme stylesheet (`:root` = light, `.dark` = dark).
 * `defaults` are the token file's values: a mode that leaves a non-colour
 * token unset inherits them, so pairs are measured as the product shows them.
 */
export function checkTheme(text: string, defaults: Record<Mode, Record<string, string>>): ThemeFinding[] {
  const out: ThemeFinding[] = [];
  const { imports, modes } = parseThemeCss(text);
  if (!modes.light && !modes.dark) {
    return [{ level: 'error', rule: 'theme-blocks', message: 'no :root or .dark block with tokens', fix: 'write the light palette in `:root { --token: value; }` and the dark one in `.dark { ... }`' }];
  }
  for (const mode of MODES) {
    if (!modes[mode]) out.push({ level: 'error', rule: 'theme-modes', message: `no ${mode === 'light' ? ':root (light)' : '.dark (dark)'} block - a theme is one identity with two palettes`, fix: `add the ${mode} palette; every colour token in both modes` });
  }
  const colorTokens = Object.keys(THEME_TOKENS).filter((t) => COLOR_GROUPS.includes(THEME_TOKENS[t].group));
  for (const mode of MODES) {
    const map = modes[mode];
    if (!map) continue;
    for (const [token, { line }] of map) {
      if (THEME_TOKENS[token]) continue;
      const derived = /^radius-(sm|md|lg|xl)$/.test(token);
      out.push({ level: 'error', rule: 'theme-unknown-token', line, message: `--${token} (${mode}) is not a theme token${derived ? ' - it is derived from --radius' : ''}; components never read it`, fix: derived ? 'set --radius only' : 'remove it, or map its value to the token whose role fits (references/tokens.md)' });
    }
    const missing = colorTokens.filter((t) => !map.has(t));
    if (missing.length) out.push({ level: 'error', rule: 'theme-missing-color', message: `${mode}: ${missing.length} colour token(s) unset - the default palette shows through: ${missing.map((t) => `--${t}`).join(', ')}`, fix: 'set every colour token in both modes' });
  }
  const radius = MODES.map((m) => modes[m]?.get('radius'));
  if ((radius[0] || radius[1]) && radius[0]?.value !== radius[1]?.value) {
    out.push({ level: 'error', rule: 'theme-radius', line: (radius[1] ?? radius[0])!.line, message: `--radius differs: "${radius[0]?.value ?? '(unset)'}" (light) vs "${radius[1]?.value ?? '(unset)'}" (dark) - the shape is part of the theme`, fix: 'declare the same --radius in :root and .dark' });
  }
  for (const mode of MODES) {
    const map = modes[mode];
    if (!map) continue;
    const value = (t: string) => map.get(t)?.value ?? defaults[mode][t];
    for (const { fg, bg, tier } of CONTRAST_PAIRS) {
      const [f, b] = [value(fg), value(bg)];
      if (!f || !b) continue;
      const ratio = contrastRatio(f, b);
      const line = map.get(fg)?.line;
      if (ratio === null) {
        out.push({ level: 'error', rule: 'theme-color-format', line, message: `--${fg} / --${bg} (${mode}): cannot measure "${f}" on "${b}"`, fix: 'write colours as oklch(L C H), #hex, rgb() or hsl()' });
        continue;
      }
      const [errorBelow, warnBelow] = TIER_LIMITS[tier];
      if (ratio >= warnBelow) continue;
      const level = ratio < errorBelow ? 'error' : 'warning';
      const suggestion = suggestLightness(f, b, warnBelow);
      out.push({
        level,
        rule: `theme-contrast-${tier}`,
        line,
        message: `--${fg} on --${bg} (${mode}) = ${ratio.toFixed(2)}:1, below ${warnBelow}:1${tier === 'ui' ? ' (non-text: the focus ring must stay visible)' : ''}`,
        fix: suggestion ? `--${fg}: ${suggestion} reaches ${warnBelow}:1 (lightness only; chroma and hue kept)` : `change the lightness of --${fg} or --${bg} until the pair reaches ${warnBelow}:1`,
      });
    }
  }
  const imported = imports.join(' ').toLowerCase();
  for (const slot of ['font-sans', 'font-serif', 'font-mono']) {
    const decl = modes.light?.get(slot) ?? modes.dark?.get(slot);
    if (!decl) continue;
    const family = decl.value.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
    if (!family || GENERIC_FONTS.test(family)) continue;
    if (!imported.includes(family.toLowerCase().replace(/\s+/g, '+')) && !imported.includes(family.toLowerCase())) {
      out.push({ level: 'warning', rule: 'theme-font-import', line: decl.line, message: `--${slot} names "${family}", which no @import loads - visitors without it see the fallback`, fix: `add @import url('https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, '+')}:wght@400;500;600;700&display=swap'); at the top` });
    }
  }
  return out;
}
