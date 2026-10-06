/**
 * Why: the Application Scaffolds are the system's real-world proof - whole
 * apps composed only from shipped components. A real app never loads all
 * 225 of them, so each scaffold is built ON ITS OWN (scripts/bundle.ts →
 * dist/apps/{app}.css + .js: core + exactly the components it uses), its
 * full-screen page loads only that bundle, and dist/stats.json publishes the
 * measured sizes. This module is the pure half: which components an app's
 * markup needs. scripts/lib/apps-files.ts feeds it the files; the
 * scaffold-lean e2e proves the answer - every app renders and behaves the
 * same on its own bundle as on all.css + all.js.
 *
 * A component is used when the markup (the example fence, scripts included)
 *   - carries one of its classes: a class is OWNED by the component whose
 *     name prefixes it (`dropdown-item` → dropdown, longest name wins), else
 *     by every component whose stylesheet starts a top-level rule with it
 *     (`.btn` → button, `.app-sidebar` → sidebar);
 *   - matches one of its JS init hooks that are not classes
 *     (`[data-context-menu]`, `[popovertarget]`, `<dialog>`) or an
 *     attribute its stylesheet styles on its own (`[data-lucide]`);
 *   - calls its namespace (`df$.shadcn.toast.show`).
 * Components that style the page itself (a top-level `body` rule - the
 * typography baseline) are in every app.
 * Then the same three rules run over the sources of every component found
 * (markup a component's JS writes - a data grid's checkboxes) until nothing
 * new turns up.
 */

/** One component as the resolver sees it. */
export type AppComponentSource = {
  name: string;
  /** the component stylesheet (empty when it has none) */
  css: string;
  /** the component script source (empty for CSS-only components) */
  ts: string;
};

const strip = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** a selector list split at its top-level commas (not inside :is() / :where()) */
function splitTop(sel: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of sel) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch;
  }
  parts.push(cur.trim());
  return parts.filter(Boolean);
}

/** The selectors of a stylesheet's top-level rules (rules nested in another
 *  style rule don't count; @layer / @media / @supports blocks do). */
function topLevelSelectors(css: string): string[] {
  const out: string[] = [];
  const stack: boolean[] = []; // true = style rule
  let text = '';
  for (const ch of strip(css)) {
    if (ch === '{') {
      const sel = text.trim();
      const isAt = sel.startsWith('@');
      if (!isAt && !stack.includes(true)) out.push(...splitTop(sel));
      stack.push(!isAt);
      text = '';
    } else if (ch === '}') {
      stack.pop();
      text = '';
    } else if (ch === ';') {
      text = '';
    } else {
      text += ch;
    }
  }
  return out;
}

const classesIn = (sel: string): string[] => [...sel.matchAll(/\.([a-z][a-z0-9-]*)/gi)].map((m) => m[1]);

/** The classes a stylesheet starts top-level rules with - a rule FOR one
 *  class: it leads the selector and no other class appears (`.toolbar .btn`
 *  styles a button, it doesn't define one). */
export function topLevelClasses(css: string): Set<string> {
  const out = new Set<string>();
  for (const part of topLevelSelectors(css)) {
    const m = part.match(/^[a-z]*\.([a-z][a-z0-9-]*)/i);
    if (m && classesIn(part).length === 1) out.add(m[1]);
  }
  return out;
}

/** The attributes a stylesheet styles on their own - a top-level rule led by
 *  an attribute with no class at all (`[data-lucide]` → the icon sizing). */
export function topLevelAttrs(css: string): Set<string> {
  const out = new Set<string>();
  for (const part of topLevelSelectors(css)) {
    const m = part.match(/^[a-z]*\[([a-z][a-z0-9-]*)/i);
    if (m && classesIn(part).length === 0) out.add(m[1]);
  }
  return out;
}

/** True when a stylesheet styles the page itself - a top-level `html` /
 *  `body` rule (typography's base font size): every app carries it. */
export function stylesPage(css: string): boolean {
  return topLevelSelectors(css).some((sel) => /^(?:html|body)$/.test(sel));
}

/** The non-class init hooks of a component script: attribute names
 *  (`data-context-menu`, `popovertarget`) and bare tags (`dialog`) of its
 *  `:not([data-init])` init selectors - with or without a type argument
 *  (`dfDollar<HTMLDialogElement>('dialog:not(…)')`). VERIFIED: (tests/apps.test.ts) typing a
 *  query once hid dialog's hook and dropped dialog.js from the Notes app bundle. */
export function initHooks(ts: string): { attrs: string[]; tags: string[] } {
  const attrs = new Set<string>();
  const tags = new Set<string>();
  for (const m of ts.matchAll(/dfDollar(?:<[^>()]*>)?\((['"`])([^'"`]*?:not\(\[data-init\]\))/g)) {
    for (const sel of m[2].split(',')) {
      const s = sel.trim();
      const tag = s.match(/^([a-z]+)(?=[:[]|$)/);
      if (tag) tags.add(tag[1]);
      const lead = s.match(/^\[([a-z][a-z0-9-]*)/);
      if (lead && lead[1] !== 'data-init') attrs.add(lead[1]);
    }
  }
  return { attrs: [...attrs], tags: [...tags] };
}

/** The class tokens a text uses: class="…" attributes (template strings
 *  included) and classList / addClass / toggleClass string arguments. */
export function usedClasses(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/\bclass(?:Name)?=\\?["'`]([^"'`\\]*)/g)) for (const c of m[1].split(/\s+/)) if (/^[a-z][a-z0-9-]*$/i.test(c)) out.add(c);
  for (const m of text.matchAll(/\b(?:classList\.(?:add|toggle|remove)|addClass|toggleClass)\(\s*['"`]([^'"`]+)['"`]/g)) for (const c of m[1].split(/\s+/)) out.add(c);
  return out;
}

const camel = (name: string): string => name.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());

/** a component source without its comments and error messages (they quote
 *  markup the component never writes) */
const code = (ts: string): string =>
  ts.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\/|Error\(/.test(l)).join('\n');

/** A resolver over the system's components - build once, ask per app. */
export function appResolver(components: readonly AppComponentSource[]) {
  const byName = new Map(components.map((c) => [c.name, c]));
  const names = components.map((c) => c.name).sort((a, b) => b.length - a.length);
  const definers = new Map<string, Set<string>>();
  for (const c of components) {
    for (const cls of topLevelClasses(c.css)) {
      if (!definers.has(cls)) definers.set(cls, new Set());
      definers.get(cls)!.add(c.name);
    }
  }
  const hooks = components.map((c) => {
    const js = initHooks(c.ts);
    return { name: c.name, tags: js.tags, attrs: [...new Set([...js.attrs, ...topLevelAttrs(c.css)])] };
  });
  const namespaces = new Map(components.map((c) => [camel(c.name), c.name]));

  /** the components one class belongs to */
  const mentions = (name: string, cls: string): boolean => new RegExp(`\\.${cls}(?![\\w-])`).test(byName.get(name)!.css);
  const owners = (cls: string): string[] => {
    // the component named by the class (website blocks: `mk-<name>`) - if
    // its stylesheet styles that class at all
    const bare = cls.replace(/^mk-/, '');
    const prefix = names.find((n) => (bare === n || bare.startsWith(`${n}-`)) && mentions(n, cls));
    if (prefix) return [prefix];
    return [...(definers.get(cls) ?? [])];
  };

  /** the components one text (markup or a component's source) asks for */
  function direct(text: string): Set<string> {
    const out = new Set<string>();
    for (const cls of usedClasses(text)) for (const o of owners(cls)) out.add(o);
    for (const h of hooks) {
      if (h.attrs.some((a) => new RegExp(`<[a-z][^>]*\\s${a}(?=[\\s=>/])`, 'i').test(text))) out.add(h.name);
      if (h.tags.some((t) => new RegExp(`<${t}[\\s>]`, 'i').test(text))) out.add(h.name);
    }
    for (const m of text.matchAll(/df\$\.shadcn\.([a-zA-Z]+?)(?:Api|States)?\b/g)) {
      const n = namespaces.get(m[1]);
      if (n) out.add(n);
    }
    return out;
  }

  /** every component the markup needs - directly or through a component's own markup */
  const base = components.filter((c) => stylesPage(c.css)).map((c) => c.name);
  return function resolve(markup: string): string[] {
    const used = direct(markup);
    for (const n of base) used.add(n);
    const queue = [...used];
    while (queue.length) {
      const c = byName.get(queue.pop()!);
      if (!c?.ts) continue;
      for (const n of direct(code(c.ts))) if (!used.has(n)) { used.add(n); queue.push(n); }
    }
    return [...used].sort();
  };
}
