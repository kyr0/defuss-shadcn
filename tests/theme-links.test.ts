/**
 * Why: df$.shadcn.loadTheme / ddf$.loadTheme is the single mechanism every
 * theme UI uses to mount a theme's font <link>s from its JSON sidecar —
 * the contract (schema v1, defuss-JSX-as-JSON, marker attribute, (rel,href)
 * dedup, 404 = no resources) is pinned here, plus a real round-trip against
 * the generated src/theme/kodama-grove.json the docs theme uses.
 */
// the df$ runtime core installs in production (shared code selects through it)
import './lib/df-runtime.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyThemeLinks,
  clearThemeLinks,
  loadTheme,
  parseThemeLinks,
} from '../src/shared/theme-links.ts';

const MARKED = 'link[data-df-theme-link]';
const headLinks = () => [...document.querySelectorAll(MARKED)];

beforeEach(() => {
  clearThemeLinks();
});

afterEach(() => {
  clearThemeLinks();
  document.getElementById('tokens-css')?.remove();
});

describe('parseThemeLinks', () => {
  it('accepts a v1 file and returns its links', () => {
    const file = parseThemeLinks(
      JSON.stringify({ schema: 'v1', links: [{ type: 'link', attributes: { rel: 'stylesheet', href: 'x' } }] }),
    );
    expect(file.links).toHaveLength(1);
  });

  it('rejects anything that is not schema v1 / a link list (path-named errors)', () => {
    expect(() => parseThemeLinks('nope')).toThrow(/invalid JSON/);
    expect(() => parseThemeLinks('{"schema":"v2","links":[]}')).toThrow(/\$\.schema/);
    expect(() => parseThemeLinks('{"schema":"v1"}')).toThrow(/\$\.links/);
    expect(() => parseThemeLinks('{"schema":"v1","links":[{"type":"script","attributes":{}}]}')).toThrow(
      /\$\.links\[0\]\.type/,
    );
    expect(() => parseThemeLinks('{"schema":"v1","links":[{"type":"link"}]}')).toThrow(/\$\.links\[0\]\.attributes/);
  });
});

describe('applyThemeLinks / clearThemeLinks', () => {
  it('mounts every link tagged with the theme id and removes them on clear', () => {
    applyThemeLinks('demo', [
      { type: 'link', attributes: { rel: 'preconnect', href: 'https://fonts.gstatic.com' } },
      { type: 'link', attributes: { rel: 'stylesheet', href: 'https://example.test/f.css' } },
    ]);
    const mounted = headLinks();
    expect(mounted).toHaveLength(2);
    expect(mounted.every((l) => l.getAttribute('data-df-theme-link') === 'demo')).toBe(true);
    expect(mounted.map((l) => l.getAttribute('href'))).toContain('https://example.test/f.css');

    clearThemeLinks();
    expect(headLinks()).toHaveLength(0);
  });

  it('dedups by (rel, href) - same theme or an existing page link never double-loads', () => {
    const pre = document.createElement('link');
    pre.rel = 'stylesheet';
    pre.href = 'https://example.test/shared.css';
    document.head.append(pre);
    applyThemeLinks('a', [
      { type: 'link', attributes: { rel: 'stylesheet', href: 'https://example.test/shared.css' } },
      { type: 'link', attributes: { rel: 'stylesheet', href: 'https://example.test/own.css' } },
    ]);
    expect(document.querySelectorAll('link[href="https://example.test/shared.css"]').length).toBe(1);
    applyThemeLinks('b', [{ type: 'link', attributes: { rel: 'stylesheet', href: 'https://example.test/shared.css' } }]);
    expect(headLinks().filter((l) => l.getAttribute('data-df-theme-link') === 'b')).toHaveLength(0);
    document.querySelectorAll('link[href="https://example.test/shared.css"]').forEach((l) => {
      if (l === pre) return;
      l.remove();
    });
    pre.remove();
  });

  it('replacing one theme drops the previous theme links (one theme at a time)', () => {
    applyThemeLinks('a', [{ type: 'link', attributes: { rel: 'stylesheet', href: 'https://example.test/a.css' } }]);
    applyThemeLinks('b', [{ type: 'link', attributes: { rel: 'stylesheet', href: 'https://example.test/b.css' } }]);
    const ids = headLinks().map((l) => l.getAttribute('data-df-theme-link'));
    expect(ids).toEqual(['b']);
  });
});

describe('loadTheme', () => {
  it('clears for default without touching the network', async () => {
    applyThemeLinks('x', [{ type: 'link', attributes: { rel: 'stylesheet', href: 'https://example.test/x.css' } }]);
    await loadTheme('default');
    expect(headLinks()).toHaveLength(0);
  });

  it('resolves (no links) for a theme without a sidecar - 404 is not an error', async () => {
    // no #tokens-css → relative id.json against the test page → guaranteed 404
    await expect(loadTheme('theme-without-sidecar')).resolves.toBeUndefined();
    expect(headLinks()).toHaveLength(0);
  });

  it('mounts the real generated sidecar (kodama-grove fonts)', async () => {
    // point the resolver at src/theme/utils/ so ../kodama-grove.json resolves
    // to the real generated file the Vite test server serves from the repo
    const tokens = document.createElement('link');
    tokens.id = 'tokens-css';
    tokens.href = new URL('/src/theme/utils/default-semantic-tokens.css', document.baseURI).href;
    document.head.append(tokens);

    await loadTheme('kodama-grove');
    const hrefs = headLinks().map((l) => l.getAttribute('href'));
    expect(hrefs.filter((h) => h?.includes('fonts.googleapis.com/css2?family='))).toHaveLength(3);
    expect(hrefs.some((h) => h?.includes('Merriweather'))).toBe(true);
    expect(hrefs.some((h) => h?.includes('Source+Serif+4'))).toBe(true);
    expect(hrefs.some((h) => h?.includes('JetBrains+Mono'))).toBe(true);

    await loadTheme('default');
    expect(headLinks()).toHaveLength(0);
  });
});
