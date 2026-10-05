// -- prefs.ts - every choice the docs site remembers, one store each --------
// Why: AGENTS.md "State through stores" - Web Storage is reached only through
// persisted() (src/shared/store.ts): validated, versioned, memory when the
// browser refuses storage, and values visitors kept from before the stores
// (raw strings, '1' flags, plain JSON) adopted on first read. Bundled into
// the head script (js/head.js, built by scripts/build-docs.ts) with
// themes.ts, theme-switcher.ts and layout.ts - one instance per key; the
// deferred scripts (site.js, theme-designer.js) reach the same stores as
// df$.shadcn.docs.prefs.
import { persisted, storageAvailable } from '../../shared/store.js';

let refused = false;
const oneOf = <T extends string>(...values: T[]) => (v: unknown): v is T => values.includes(v as T);

export interface ThemeDraft {
  state: Record<string, unknown>;
  theme: { styles: Record<string, unknown>; links?: unknown[] };
  live?: boolean;
  updated?: string;
}

export const prefs = {
  /** the manual light / dark choice; '' follows the OS */
  colorScheme: persisted<'' | 'light' | 'dark'>('defuss-shadcn-theme', '', { validate: oneOf('', 'light', 'dark') }),
  /** the active color theme: a preset id, a designed 'custom-…' id or 'default' */
  colorTheme: persisted('defuss-shadcn-color-theme', 'default'),
  /** the Theme Designer's saved themes (validated per entry on read) */
  customThemes: persisted<Array<Record<string, unknown>>>('defuss-shadcn-custom-themes', [], { onError: () => { refused = true; } }),
  /** the Theme Designer's live draft, applied on every page until saved */
  themeDraft: persisted<ThemeDraft | null>('defuss-shadcn-theme-draft', null, {
    validate: (v): v is ThemeDraft | null => v === null || (typeof v === 'object' && !Array.isArray(v)),
  }),
  /** the docked (zero-width) sidebar; was '1' / '0' before the stores */
  navDocked: persisted('defuss-shadcn-nav-docked', false, { migrate: (old) => old === 1 || old === '1' || old === true }),
  /** { [section]: '0' | '1' } - only Introduction remembers its toggle */
  navCollapsed: persisted<Record<string, string>>('defuss-shadcn-nav-collapsed', {}),
  /** the GitHub star count, fetched once per session */
  ghStars: persisted('gh-stars', '', { area: 'session', migrate: (old) => String(old) }),
  /** the sidebar's scroll offset across a full page load (-1: none) */
  navScroll: persisted('shadcn-nav-scroll', -1, { area: 'session', migrate: (old) => Number(old) || 0 }),
};

/** false when the browser keeps these values for this page only */
export const prefsPersist = (): boolean => storageAvailable('local');

/** write the designed themes; false when the browser refused to keep them */
export function saveCustomThemes(list: Array<Record<string, unknown>>): boolean {
  refused = false;
  prefs.customThemes.set(list);
  return !refused && prefsPersist();
}
