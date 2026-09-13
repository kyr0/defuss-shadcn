/**
 * Why: the tweakcn presets in src/documentation/runtime/themes.ts are the
 * single token-theme dataset (swatch dots + the contrast gate read it), but
 * consumers need theme files they can drop in next to — or in place of —
 * default-semantic-tokens.css. This pure core renders one preset into that
 * stylesheet shape; scripts/build.ts regenerates src/theme/<id>.css from it
 * on every build (same regenerate-in-src pattern as SKILL.md), and
 * scripts/verify.ts fails when the files drift.
 */

/** Minimal shape of a themes.ts entry this renderer consumes (parseThemes'
 *  ThemeEntry: token maps keyed by mode). */
export interface ThemeLike {
  id: string;
  label: string;
  modes: Record<string, Record<string, string>>;
}

/** The generated stylesheet's filename for a theme id. */
export function themeFileName(id: string): string {
  return `${id}.css`;
}

/** `:root`/`.dark` block from a token map — keys are token names without `--`. */
function tokenBlock(selector: string, tokens: Record<string, string>): string {
  const decls = Object.entries(tokens).map(([k, v]) => `  --${k}: ${v};`).join('\n');
  return `${selector} {\n${decls}\n}`;
}

/**
 * Why: one preset → one standalone theme stylesheet. Light tokens land in
 * `:root`, dark in `.dark` — loading the file after default-semantic-tokens.css
 * overrides it in both modes (same source order ⇒ higher cascade position),
 * and dark-mode toggling needs no JS because `.dark` already matches `html.dark`.
 * Returns null for style-less presets (`default` = the token file itself).
 */
export function themeCssText(theme: ThemeLike): string | null {
  const light = theme.modes.light;
  const dark = theme.modes.dark;
  if (!light && !dark) return null;
  const blocks: string[] = [
    `/* ${theme.label} theme — generated from src/documentation/runtime/themes.ts by scripts/build.ts. Edit themes.ts, not this file. */`,
  ];
  if (light) blocks.push(tokenBlock(':root', light));
  if (dark) blocks.push(tokenBlock('.dark', dark));
  return `${blocks.join('\n\n')}\n`;
}
