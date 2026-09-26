/**
 * One `aria-describedby="…"` usage: who declares it (for the message) and the
 * id tokens it references.
 */
export interface AriaRef {
  /** short human label of the referencing element, e.g. `input#f-name` */
  owner: string;
  /** lowercase tag name of the referencing element (ownership check) */
  tag?: string;
  tokens: string[];
}

/** Elements that can meaningfully carry `aria-describedby` for a field hint:
 *  the three form controls of issue #18 plus `<fieldset>` (a group-level
 *  description belongs to the group element, not one of its checkboxes). */
export const DESCRIPTION_HOSTS = ['input', 'select', 'textarea', 'fieldset'];

/**
 * Why: issue #18's fixed pattern puts `aria-describedby` ON the field - an
 * `aria-describedby` on some unrelated wrapper element does nothing for the
 * person focused in the control. Every `.field-description`/`.field-error`
 * id that IS referenced must be referenced by at least one host element.
 * Unreferenced ids are reported by verify's `field description wiring` gate,
 * so they are skipped here to keep each finding owned by exactly one gate.
 */
export function fieldDescriptionOwnerProblems(
  name: string,
  refs: AriaRef[],
  targets: { id: string; cls: string }[],
): string[] {
  const problems: string[] = [];
  for (const t of targets) {
    const referrers = refs.filter((r) => r.tokens.includes(t.id));
    if (referrers.length === 0) continue; // the wiring gate's finding
    if (!referrers.some((r) => r.tag && DESCRIPTION_HOSTS.includes(r.tag))) {
      const who = referrers.map((r) => `<${r.tag ?? '?'}>`).join('/');
      problems.push(
        `${name}: #${t.id} (.${t.cls}) is only referenced by ${who} - aria-describedby must sit on the ${DESCRIPTION_HOSTS.join('/')} itself`,
      );
    }
  }
  return problems;
}

/**
 * Why: the #18 bug class has a second half - a wiring that *exists* but does
 * not resolve. `aria-describedby="foo"` is dead weight unless exactly ONE
 * element on the page carries `id="foo"`: a typo/renamed id dangles (nothing
 * announced), a duplicated id resolves unpredictably across AT. Pure function
 * over already-extracted page data → deterministic, unit-testable without a
 * parser; verify.ts feeds it linkedom's view of the live doc pages.
 */
export function ariaDescribedByProblems(name: string, refs: AriaRef[], ids: string[]): string[] {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  const problems: string[] = [];
  for (const ref of refs) {
    for (const token of ref.tokens) {
      const n = counts.get(token) ?? 0;
      if (n === 0) problems.push(`${name}: ${ref.owner} references #${token} - no element has that id`);
      else if (n > 1)
        problems.push(`${name}: ${ref.owner} references #${token} - ${n} elements share the id (must be exactly one)`);
    }
  }
  return problems;
}

/**
 * Why: deterministic parity for the `.field-*` helper classes
 * (`.field-description`, `.field-error`, …). When a component's CSS styles a
 * field class it SHIPS that feature - so the component skill and its doc page
 * must describe it too. This is the same drift class check 15 pins for
 * `data-variant`/`data-size` (CSS is the source of truth, docs silently rot),
 * but those checks never look at components without variant/size selectors —
 * `form.css` styles `.field-description` yet has none, so field features
 * needed their own gate. Pure string analysis: no fs, no browser - fully
 * deterministic and unit-testable (tests/fields.test.ts).
 */

/** Every `.field-<name>` class selector referenced in one CSS source, de-duped. */
export function fieldClasses(css: string): string[] {
  return [...new Set([...css.matchAll(/\.(field-[a-z0-9-]+)/g)].map((m) => m[1]))];
}

/** A field class counts as documented when quoted (`"field-…"` markup),
 *  backticked (`` `field-…` `` prose), or as its selector (`.field-…`). */
function documented(text: string, cls: string): boolean {
  return text.includes(`"${cls}"`) || text.includes(`\`${cls}\``) || text.includes(`.${cls}`);
}

export interface FieldComponent {
  name: string;
  /** component CSS source (empty = no shipped stylesheet) */
  css: string;
  /** component-skill.md source */
  skill: string;
  /** documentation/<name>.html source */
  doc: string;
}

/**
 * Problems for a set of components: for every `.field-*` class a component CSS
 * styles, the class name must appear in BOTH the component skill and the doc
 * page. Returns one line per missing artifact - empty when everything is
 * described. (Aria wiring of the live demos is a separate concern, gated by
 * verify's `field description wiring` check.)
 */
export function fieldFeatureProblems(components: FieldComponent[]): string[] {
  const problems: string[] = [];
  for (const c of components) {
    for (const cls of fieldClasses(c.css)) {
      if (!documented(c.skill, cls))
        problems.push(`${c.name}: CSS styles .${cls} but component-skill.md doesn't document it`);
      if (!documented(c.doc, cls))
        problems.push(`${c.name}: CSS styles .${cls} but documentation/${c.name}.html doesn't show it`);
    }
  }
  return problems;
}
