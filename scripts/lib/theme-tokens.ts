/**
 * Why: a theme is a value for every token a theme may set - and nothing
 * else. Three places used to hold that list on their own (the token file,
 * the Theme Designer's TOKEN_RE, AGENTS.md prose); the theme skill needs it
 * with each token's role and the contrast pairs it must keep. This module is
 * the one owner of token semantics: the shadcn-theme skill's reference and
 * checker read it, and verify's `agent skills ↔ sources` gate fails when it
 * no longer matches the tokens default-semantic-tokens.css declares.
 */

export type TokenGroup = 'surface' | 'utility' | 'chart' | 'sidebar' | 'font' | 'radius' | 'shadow' | 'spacing' | 'tracking';

/** Every token a theme may set, with its group and the role components give it. */
export const THEME_TOKENS: Readonly<Record<string, { group: TokenGroup; role: string }>> = {
  background: { group: 'surface', role: 'the page surface' },
  foreground: { group: 'surface', role: 'body text on --background' },
  card: { group: 'surface', role: 'cards, panels, table and form surfaces' },
  'card-foreground': { group: 'surface', role: 'text on --card' },
  popover: { group: 'surface', role: 'floating surfaces: popovers, menus, dropdowns, the command palette' },
  'popover-foreground': { group: 'surface', role: 'text on --popover' },
  primary: { group: 'surface', role: 'the main action and selection: primary buttons, checked controls, active items' },
  'primary-foreground': { group: 'surface', role: 'text and icons on --primary' },
  secondary: { group: 'surface', role: 'secondary buttons and quieter fills' },
  'secondary-foreground': { group: 'surface', role: 'text on --secondary' },
  muted: { group: 'surface', role: 'subdued fills: stripes, skeletons, disabled areas' },
  'muted-foreground': { group: 'surface', role: 'secondary text - descriptions, hints, placeholders - on --muted AND on --background' },
  accent: { group: 'surface', role: 'hover and highlight: menu items, ghost buttons, focused rows' },
  'accent-foreground': { group: 'surface', role: 'text on --accent' },
  destructive: { group: 'surface', role: 'delete actions and errors' },
  'destructive-foreground': { group: 'surface', role: 'text on --destructive' },
  border: { group: 'utility', role: 'dividers and component outlines' },
  input: { group: 'utility', role: 'form control borders' },
  ring: { group: 'utility', role: 'the focus ring (keyboard focus must stay visible on --background)' },
  'chart-1': { group: 'chart', role: 'chart series 1; also diagram and status accents' },
  'chart-2': { group: 'chart', role: 'chart series 2' },
  'chart-3': { group: 'chart', role: 'chart series 3' },
  'chart-4': { group: 'chart', role: 'chart series 4' },
  'chart-5': { group: 'chart', role: 'chart series 5' },
  sidebar: { group: 'sidebar', role: 'the application sidebar surface' },
  'sidebar-foreground': { group: 'sidebar', role: 'idle sidebar text' },
  'sidebar-primary': { group: 'sidebar', role: 'the sidebar brand mark and primary item' },
  'sidebar-primary-foreground': { group: 'sidebar', role: 'text on --sidebar-primary' },
  'sidebar-accent': { group: 'sidebar', role: 'the active / hovered sidebar item' },
  'sidebar-accent-foreground': { group: 'sidebar', role: 'text on --sidebar-accent' },
  'sidebar-border': { group: 'sidebar', role: 'sidebar dividers' },
  'sidebar-ring': { group: 'sidebar', role: 'focus ring inside the sidebar' },
  'font-sans': { group: 'font', role: 'UI and body text stack' },
  'font-serif': { group: 'font', role: 'serif stack (papers, editorial blocks)' },
  'font-mono': { group: 'font', role: 'code, keys, numbers in tables' },
  radius: { group: 'radius', role: 'base corner radius; --radius-sm/md/lg/xl are derived from it - never set them' },
  'shadow-2xs': { group: 'shadow', role: 'elevation scale, smallest' },
  'shadow-xs': { group: 'shadow', role: 'elevation scale' },
  'shadow-sm': { group: 'shadow', role: 'elevation scale (cards, inputs)' },
  shadow: { group: 'shadow', role: 'elevation scale (default)' },
  'shadow-md': { group: 'shadow', role: 'elevation scale (popovers, menus)' },
  'shadow-lg': { group: 'shadow', role: 'elevation scale (dialogs)' },
  'shadow-xl': { group: 'shadow', role: 'elevation scale' },
  'shadow-2xl': { group: 'shadow', role: 'elevation scale, largest' },
  spacing: { group: 'spacing', role: 'the base spacing unit every gap / padding utility multiplies' },
  'tracking-normal': { group: 'tracking', role: 'default letter spacing' },
};

/** Colour tokens: a theme sets every one of them in both modes, or the
 *  default palette leaks into the gaps. */
export const COLOR_GROUPS: readonly TokenGroup[] = ['surface', 'utility', 'chart', 'sidebar'];

export type ContrastTier = 'reading' | 'text' | 'ui';

/** Foreground / background pairs a theme must keep readable, by tier:
 *  `reading` (body text: error below 4.5:1), `text` (control labels:
 *  warning below 4.5:1, error below 3:1), `ui` (non-text indicators:
 *  warning below 3:1). Calibrated on the 43 shipped presets + default: every
 *  `reading` pair reaches 4.5:1 in all 90 palettes; the `text` pairs miss it
 *  in 10 to 48 of them, so for those 4.5:1 is the goal, 3:1 the floor.
 *  VERIFIED: (measured 2026-10-07 over src/theme/*.css + the token file) */
export const CONTRAST_PAIRS: readonly { fg: string; bg: string; tier: ContrastTier }[] = [
  { fg: 'foreground', bg: 'background', tier: 'reading' },
  { fg: 'card-foreground', bg: 'card', tier: 'reading' },
  { fg: 'popover-foreground', bg: 'popover', tier: 'reading' },
  { fg: 'sidebar-foreground', bg: 'sidebar', tier: 'reading' },
  { fg: 'sidebar-accent-foreground', bg: 'sidebar-accent', tier: 'reading' },
  { fg: 'primary-foreground', bg: 'primary', tier: 'text' },
  { fg: 'secondary-foreground', bg: 'secondary', tier: 'text' },
  { fg: 'muted-foreground', bg: 'muted', tier: 'text' },
  { fg: 'muted-foreground', bg: 'background', tier: 'text' },
  { fg: 'accent-foreground', bg: 'accent', tier: 'text' },
  { fg: 'destructive-foreground', bg: 'destructive', tier: 'text' },
  { fg: 'sidebar-primary-foreground', bg: 'sidebar-primary', tier: 'text' },
  { fg: 'ring', bg: 'background', tier: 'ui' },
];

/** The minimum ratios per tier: [error below, warning below]. */
export const TIER_LIMITS: Readonly<Record<ContrastTier, readonly [number, number]>> = {
  reading: [4.5, 4.5],
  text: [3, 4.5],
  ui: [0, 3],
};

/** The tokens the token file lets a theme set: every token its `:root`
 *  block declares with a literal value (derived ones read `var(--radius)`). */
export function themeableTokens(tokenCss: string): string[] {
  const root = tokenCss.match(/:root\s*\{[^}]*\}/)?.[0] ?? '';
  return [...root.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)].filter((m) => !m[2].includes('var(')).map((m) => m[1]);
}

/** The light / dark token values of a stylesheet's `:root` / `.dark` blocks. */
export function tokenModes(css: string): { light: Record<string, string>; dark: Record<string, string> } {
  const grab = (re: RegExp): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const block of css.match(re) ?? []) for (const m of block.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
    return out;
  };
  return { light: grab(/:root\s*\{[^}]*\}/g), dark: grab(/\.dark\s*\{[^}]*\}/g) };
}
