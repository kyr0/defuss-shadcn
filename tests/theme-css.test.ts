import { describe, expect, it } from 'vitest';
import { parseThemes } from '../scripts/lib/contrast.ts';
import { themeCssText, themeFileName, themeJsonText } from '../scripts/lib/theme-css.ts';
// Vite ?raw/glob imports instead of node:fs - Vitest runs browser mode
// (see tests/contrast.test.ts for the same pattern).
import themesSource from '../src/documentation/runtime/themes.ts?raw';
import tokenFileSource from '../src/theme/utils/default-semantic-tokens.css?raw';

/** every generated theme file, keyed by id (utils/ subfolder excluded). */
const themeFiles = import.meta.glob('../src/theme/*.css', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
function generatedFile(id: string): string {
  const key = Object.keys(themeFiles).find((k) => k.endsWith(`/${id}.css`));
  if (!key) throw new Error(`src/theme/${id}.css missing`);
  return themeFiles[key];
}

/** every generated resource sidecar (themes with `links:` only). */
const themeJsonFiles = import.meta.glob('../src/theme/*.json', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
function generatedJsonFile(id: string): string | undefined {
  const key = Object.keys(themeJsonFiles).find((k) => k.endsWith(`/${id}.json`));
  return key ? themeJsonFiles[key] : undefined;
}

/**
 * Why: dist/theme/<id>.css files are generated (build.ts) and consumed by
 * the theme switcher at runtime - a rendering regression here would silently
 * break every theme file. These tests pin the pure renderer AND one full
 * integration round-trip against the real themes.ts dataset.
 */

describe('themeFileName', () => {
  it('maps an id to its stylesheet filename', () => {
    expect(themeFileName('claude')).toBe('claude.css');
  });
});

describe('themeCssText', () => {
  it('returns null for a style-less preset (default = the token file)', () => {
    expect(themeCssText({ id: 'default', label: 'Default', modes: {} })).toBeNull();
  });

  it('renders :root from light and .dark from dark, in declaration order', () => {
    const css = themeCssText({
      id: 'x',
      label: 'X',
      modes: {
        light: { background: 'white', primary: 'oklch(0.5 0.1 200)' },
        dark: { background: 'black' },
      },
    })!;
    expect(css).toContain(':root {\n  --background: white;\n  --primary: oklch(0.5 0.1 200);\n}');
    expect(css).toContain('.dark {\n  --background: black;\n}');
    expect(css.indexOf(':root')).toBeLessThan(css.indexOf('.dark'));
    expect(css.startsWith('/* X theme - generated')).toBe(true);
  });

  it('omits the .dark block for a light-only preset', () => {
    const css = themeCssText({ id: 'x', label: 'X', modes: { light: { background: 'white' } } })!;
    expect(css).toContain(':root');
    expect(css).not.toContain('.dark');
  });
});

describe('generated theme files (integration)', () => {
  it('every style-bearing preset renders byte-identical to src/theme/<id>.css', () => {
    // the same comparison verify's `theme files fresh` gate makes - pinned
    // here so a renderer change fails fast, not only at verify
    const themes = parseThemes(themesSource);
    let checked = 0;
    for (const t of themes) {
      const css = themeCssText(t);
      if (css === null) continue;
      expect(generatedFile(t.id), `${t.id}.css`).toBe(css);
      checked++;
    }
    expect(checked).toBeGreaterThan(30); // presets exist and render
  });

  it('the base token file itself is not regenerated over (stays hand-authored)', () => {
    // default-semantic-tokens.css is the TweakCN-shaped source of truth, not
    // generator output - the generator must never write it
    expect(tokenFileSource).not.toContain('generated from src/documentation/runtime/themes.ts');
    expect(generatedFile('claude')).toContain('generated from');
  });

  it('link-bearing themes ship a byte-identical resource sidecar, others ship none', () => {
    // the same comparison verify's `theme files fresh` sidecar arm makes
    const themes = parseThemes(themesSource);
    const withLinks = themes.filter((t) => t.links && t.links.length > 0);
    expect(withLinks.map((t) => t.id)).toContain('kodama-grove');
    for (const t of themes) {
      const json = themeJsonText(t);
      if (json === null) {
        expect(generatedJsonFile(t.id), `${t.id}.json must not exist`).toBeUndefined();
      } else {
        expect(generatedJsonFile(t.id), `${t.id}.json`).toBe(json);
      }
    }
  });

  it('the kodama-grove sidecar carries the Google-Fonts links as v1 VNodes', () => {
    const json = generatedJsonFile('kodama-grove')!;
    const file = JSON.parse(json) as { schema: string; links: { type: string; attributes: { href?: string } }[] };
    expect(file.schema).toBe('v1');
    const hrefs = file.links.map((l) => l.attributes.href);
    expect(file.links.every((l) => l.type === 'link')).toBe(true);
    expect(hrefs.filter((h) => h?.includes('fonts.googleapis.com/css2')).length).toBe(3);
    expect(hrefs.some((h) => h?.includes('Merriweather'))).toBe(true);
    expect(hrefs.some((h) => h?.includes('Source+Serif+4'))).toBe(true);
    expect(hrefs.some((h) => h?.includes('JetBrains+Mono'))).toBe(true);
    // its CSS carries the matching font token overrides (both modes, same set)
    const css = generatedFile('kodama-grove');
    expect(css.match(/--font-sans:/g)).toHaveLength(2);
    expect(css).toContain("--font-serif: 'Source Serif 4', serif;");
  });
});
