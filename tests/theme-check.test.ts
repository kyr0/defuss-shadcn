import { describe, expect, it } from 'vitest';
import { checkTheme, suggestLightness, toOklch } from '../scripts/lib/theme-check.ts';
import { contrastRatio } from '../scripts/lib/contrast.ts';
import { CONTRAST_PAIRS, THEME_TOKENS, themeableTokens, tokenModes } from '../scripts/lib/theme-tokens.ts';
import tokenCss from '../src/theme/utils/default-semantic-tokens.css?raw';
import fjord from './e2e/agent-skills/fjord-theme.css?raw';

/**
 * Why: shadcn-theme's checker (bundled as skills/shadcn-theme/scripts/
 * theme-check.mjs) is the definition of done for a theme an agent writes.
 * Pins each rule on a minimal theme, the fix it proposes, and that a
 * complete, readable theme passes clean; agent-skills.e2e runs the bundle.
 */

const defaults = tokenModes(tokenCss);
const rules = (css: string) => checkTheme(css, defaults).map((f) => `${f.level} ${f.rule}`);
const lines = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `  --${k}: ${v};`).join('\n');

describe('theme tokens', () => {
  it('THEME_TOKENS are exactly the tokens the token file lets a theme set', () => {
    expect([...themeableTokens(tokenCss)].sort()).toEqual(Object.keys(THEME_TOKENS).sort());
  });
  it('every contrast pair names theme tokens', () => {
    for (const p of CONTRAST_PAIRS) expect([THEME_TOKENS[p.fg], THEME_TOKENS[p.bg]]).not.toContain(undefined);
  });
});

describe('checkTheme', () => {
  it('passes a complete, readable theme with no finding', () => {
    expect(checkTheme(fjord, defaults)).toEqual([]);
  });
  it('requires both modes, every colour token, one radius', () => {
    expect(rules(':root { --background: #fff; }')).toEqual(expect.arrayContaining(['error theme-modes', 'error theme-missing-color']));
    expect(rules(`:root {\n${lines({ ...defaults.light, radius: '0.5rem' })}\n}\n.dark {\n${lines({ ...defaults.dark, radius: '1rem' })}\n}`)).toContain('error theme-radius');
  });
  it('rejects unknown and derived tokens', () => {
    const f = checkTheme(`:root {\n  --brand: red;\n  --radius-lg: 8px;\n}`, defaults).filter((x) => x.rule === 'theme-unknown-token');
    expect(f.map((x) => x.line)).toEqual([2, 3]);
    expect(f[1].fix).toBe('set --radius only');
  });
  it('tiers contrast: reading pairs are errors, control labels warn above 3:1, the ring warns below 3:1', () => {
    const light = { ...defaults.light, foreground: 'oklch(0.75 0 0)', 'primary-foreground': 'oklch(0.62 0 0)', ring: 'oklch(0.95 0 0)' };
    const r = rules(`:root {\n${lines(light)}\n}\n.dark {\n${lines(defaults.dark)}\n}`);
    expect(r).toEqual(expect.arrayContaining(['error theme-contrast-reading', 'error theme-contrast-text', 'warning theme-contrast-ui']));
  });
  it('warns about a font family no @import loads', () => {
    expect(rules(`:root { --font-sans: "Inter", sans-serif; }`)).toContain('warning theme-font-import');
    expect(rules(`@import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');\n:root { --font-sans: "Inter", sans-serif; }`)).not.toContain('warning theme-font-import');
  });
});

describe('suggestLightness', () => {
  it('keeps chroma and hue and reaches the target', () => {
    const fix = suggestLightness('oklch(0.7 0.1 200)', 'oklch(1 0 0)', 4.5)!;
    expect(fix).toMatch(/^oklch\([\d.]+ 0\.1 200\)$/);
    expect(contrastRatio(fix, 'oklch(1 0 0)')!).toBeGreaterThanOrEqual(4.5);
  });
  it('reads hex through OKLCH (round trip within one sRGB step)', () => {
    const [L, C, H] = toOklch('#3b82f6')!;
    expect([L, C, H]).toEqual([0.6231, 0.188, 259.81]);
    expect(suggestLightness('#9ca3af', '#ffffff', 4.5)).toMatch(/^oklch\(/);
  });
});
