import { describe, expect, it } from 'vitest';
// Vite ?raw imports instead of node:fs — Vitest runs this suite in browser
// mode (chromium), where the filesystem isn't available.
import themesSource from '../src/documentation/runtime/themes.ts?raw';
import tokensSource from '../src/theme/default-semantic-tokens.css?raw';
import {
  contrastRatio,
  parseColor,
  parseThemes,
  defaultTokenModes,
  sidebarContrastProblems,
  radiusConsistencyProblems,
  WCAG_AA,
} from '../scripts/lib/contrast.ts';

/**
 * Why: verify.ts's "theme sidebar contrast" gate decides whether theme
 * presets ship readable nav text. The math and data extraction live in the
 * pure scripts/lib/contrast.ts, so these tests pin the contract (color
 * parsing incl. oklch, ratio values, theme-file extraction, failure naming)
 * against known-good cases without touching the browser.
 */
describe('parseColor', () => {
  it('parses 3/6/8-digit hex', () => {
    expect(parseColor('#fff')).toEqual([255, 255, 255]);
    expect(parseColor('#04a5e5')).toEqual([4, 165, 229]);
    expect(parseColor('#04a5e580')).toEqual([4, 165, 229]);
  });
  it('parses rgb()/rgba() with percentages', () => {
    expect(parseColor('rgb(0, 255, 0)')).toEqual([0, 255, 0]);
    expect(parseColor('rgba(50%, 0%, 0%, 0.5)')).toEqual([128, 0, 0]);
  });
  it('parses oklch and clamps out-of-gamut', () => {
    expect(parseColor('oklch(1 0 0)')).toEqual([255, 255, 255]);
    expect(parseColor('oklch(0 0 0)')).toEqual([0, 0, 0]);
    // saturated blue lands near a saturated sRGB blue
    const [r, , b] = parseColor('oklch(0.45 0.3 264)')!;
    expect(b).toBeGreaterThan(100);
    expect(r).toBeLessThan(100);
  });
  it('returns null for unknown formats', () => {
    expect(parseColor('rebeccapurple')).toBeNull();
    expect(parseColor('')).toBeNull();
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for black/white and 1:1 for identical colors', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#123456', '#123456')).toBeCloseTo(1, 5);
  });
  it('is symmetric', () => {
    expect(contrastRatio('#04a5e5', '#ffffff')).toBeCloseTo(
      contrastRatio('#ffffff', '#04a5e5')!,
      10,
    );
  });
  it('flags the known-bad catppuccin-light active pair (2.79)', () => {
    // regression: white text on catppuccin blue shipped as an active nav link
    const bad = contrastRatio('#ffffff', '#04a5e5')!;
    expect(bad).toBeLessThan(WCAG_AA);
    // the replacement pair passes
    expect(contrastRatio('#fdf2f8', '#0e6da3')!).toBeGreaterThanOrEqual(WCAG_AA);
  });
  it('returns null when a color is unparsable', () => {
    expect(contrastRatio('nope', '#fff')).toBeNull();
  });
});

describe('parseThemes', () => {
  const fixture = `
globalThis.x = [
  {
    id: "alpha",
    label: "Alpha",
    styles: {
      light: {
        sidebar: "#ffffff", "sidebar-accent": "#eeeeee", "sidebar-accent-foreground": "#111111",
      },
      dark: {
        sidebar: "#000000", "sidebar-accent": "#222222", "sidebar-accent-foreground": "#eeeeee",
      },
    },
  },
  {
    id: "beta",
    label: "Beta",
    styles: { light: { "sidebar-accent": "#f0f0f0", "sidebar-accent-foreground": "#000000" } },
  },
];
`;
  it('extracts every theme with per-mode token maps', () => {
    const themes = parseThemes(fixture);
    expect(themes.map((t) => t.id)).toEqual(['alpha', 'beta']);
    expect(themes[0].modes.light['sidebar-accent']).toBe('#eeeeee');
    expect(themes[0].modes.dark['sidebar-accent-foreground']).toBe('#eeeeee');
    expect(themes[1].modes.light['sidebar-accent']).toBe('#f0f0f0');
  });

  it('extracts the real themes.ts (>=40 themes, all with sidebar tokens)', () => {
    const themes = parseThemes(themesSource);
    expect(themes.length).toBeGreaterThanOrEqual(40);
    // "default" ships no overrides at all (its tokens live in the token file)
    const missing = themes
      .filter((t) => t.id !== 'default')
      .filter((t) => !Object.values(t.modes).some((m) => m['sidebar-accent']));
    expect(missing.map((t) => t.id)).toEqual([]);
    expect(themes.find((t) => t.id === 'default')?.modes).toEqual({});
  });
});

describe('defaultTokenModes', () => {
  it('extracts sidebar tokens from the shipped token file', () => {
    const modes = defaultTokenModes(tokensSource);
    expect(modes.light['sidebar-accent']).toMatch(/oklch/);
    expect(modes.dark['sidebar-accent']).toMatch(/oklch/);
    expect(modes.light['sidebar']).toMatch(/oklch/);
  });
});

describe('sidebarContrastProblems', () => {
  const mk = (
    fg: string,
    bg: string,
    sidebar = '#ffffff',
    baseFg = '#111111',
  ): Parameters<typeof sidebarContrastProblems>[0] => [
    {
      id: 't',
      label: 'T',
      modes: {
        light: {
          'sidebar-accent-foreground': fg,
          'sidebar-accent': bg,
          sidebar,
          'sidebar-foreground': baseFg,
        },
      },
    },
  ];

  it('passes readable pairs', () => {
    expect(sidebarContrastProblems(mk('#111111', '#eeeeee'))).toEqual([]);
  });

  it('names the theme, mode, pair and measured ratio when active text fails', () => {
    const problems = sidebarContrastProblems(mk('#ffffff', '#04a5e5'));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('t');
    expect(problems[0]).toContain('light');
    expect(problems[0]).toContain('active nav text');
  });

  it('flags unreadable idle text on the sidebar background', () => {
    const problems = sidebarContrastProblems(mk('#111111', '#eeeeee', '#eeeeee', '#eeeeee'));
    expect(problems.some((p) => p.includes('idle nav text'))).toBe(true);
  });

  it('the shipped presets all pass (regression for the 15 dark + 7 light contrast complaints)', () => {
    const themes = parseThemes(themesSource);
    const defaults = defaultTokenModes(tokensSource);
    const problems = sidebarContrastProblems([
      ...themes,
      { id: 'default', label: 'Default', modes: defaults },
    ]);
    expect(problems).toEqual([]);
  });
});

describe('radiusConsistencyProblems', () => {
  const mk = (lightRadius?: string, darkRadius?: string): Parameters<typeof radiusConsistencyProblems>[0] => [
    {
      id: 't',
      label: 'T',
      modes: {
        light: { radius: lightRadius } as Record<string, string>,
        dark: { radius: darkRadius } as Record<string, string>,
      },
    },
  ];

  it('passes when both modes declare the same radius', () => {
    expect(radiusConsistencyProblems(mk('0.5rem', '0.5rem'))).toEqual([]);
  });

  it('passes when the theme declares no radius at all (uses the default)', () => {
    expect(radiusConsistencyProblems(mk(undefined, undefined))).toEqual([]);
  });

  it('flags a mode-missing radius (dark silently reverted to default rounding)', () => {
    const problems = radiusConsistencyProblems(mk('0px', undefined));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('(unset)');
    expect(problems[0]).toContain('light');
  });

  it('flags mismatched values', () => {
    expect(radiusConsistencyProblems(mk('0px', '0.5rem'))).toHaveLength(1);
  });

  it('every shipped preset declares an identical radius in light and dark', () => {
    // regression: themes shipped radius only in light, so dark mode changed
    // the theme's shape; doom-64 + retro-arcade must be hard-square both ways
    const themes = parseThemes(themesSource);
    expect(radiusConsistencyProblems(themes)).toEqual([]);
    const doom = themes.find((t) => t.id === 'doom-64')!.modes;
    expect(doom.light.radius).toBe('0px');
    expect(doom.dark.radius).toBe('0px');
    const retro = themes.find((t) => t.id === 'retro-arcade')!.modes;
    expect(retro.light.radius).toBe('0px');
    expect(retro.dark.radius).toBe('0px');
    // OpenAI: one ChatGPT identity, pill-round in BOTH modes
    const openai = themes.find((t) => t.id === 'openai')!.modes;
    expect(openai.light.radius).toBe(openai.dark.radius);
    expect(openai.light.radius).not.toBe('0px');
  });
});
