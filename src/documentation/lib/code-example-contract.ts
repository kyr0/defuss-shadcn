/**
 * Why: the CodeExample API contract (plans/cmp-schemas-and-codeexample.md §5,
 * §10, §27) as ONE pure module. The SSR component imports it (inside the docs
 * SSG project so defuss-ssg's .ssg-temp copy carries it), scripts/lib/schema.ts
 * re-exports it (verify + Vitest browser tests consume it there - both sides
 * therefore enforce the same prop guard and the same editor mapping). No fs,
 * no DOM - importable everywhere.
 */

/** Props that would re-introduce dual sources of truth - CodeExample rejects them (§5). */
export const FORBIDDEN_CODE_EXAMPLE_PROPS = ['children', 'code', 'preview', 'previewSource'] as const;

/**
 * Runtime guard the SSR component calls: passing a second render source fails
 * the docs build with a message that states the rule. `source` must be a
 * non-empty string - the example fence body is both editor and sandbox input.
 */
export function codeExampleProblems(props: Record<string, unknown>): string[] {
  const problems: string[] = [];
  if (typeof props.source !== 'string' || props.source.trim() === '')
    problems.push('CodeExample requires a non-empty `source` string (the example fence)');
  // an EMPTY children array is the jsx-runtime's default for childless JSX
  // (`<CodeExample source=… />`), not a second render source - only actual
  // content violates the source-only contract (§5)
  const isRenderContent = (v: unknown) =>
    (Array.isArray(v) && v.length > 0) ||
    (typeof v === 'string' && v.trim() !== '') ||
    (typeof v === 'object' && v !== null && !Array.isArray(v));
  for (const p of FORBIDDEN_CODE_EXAMPLE_PROPS)
    if (p in props && isRenderContent(props[p]))
      problems.push(
        `CodeExample received \`${p}\` - displayed code and rendered preview must come from the SAME source string (plans/cmp-schemas-and-codeexample.md §5)`,
      );
  return problems;
}

/** Minimal shape the editor mapping reads (structural subset of StateSpec). */
export interface EditorStateSpec {
  type: 'string' | 'number' | 'boolean' | 'enum';
  values?: string[];
  editor?: { component?: string; props?: Record<string, unknown> };
}

/** Suggested editors (plan §3); an unknown value falls back by type at runtime. */
export const EDITOR_COMPONENTS = ['text', 'number', 'checkbox', 'radio', 'select'] as const;
export type EditorKind = (typeof EDITOR_COMPONENTS)[number];

/**
 * Editor resolution (plan §3/§10): schema hint when recognized, type fallback
 * otherwise - never component-name branching. `props` pass through raw for the
 * runtime (number: min/step/format/currency/locale; select: none needed).
 */
export function editorFor(spec: EditorStateSpec): { kind: EditorKind; props: Record<string, unknown> } {
  // enum defaults to radio boxes: the value set is small and closed, and
  // every option visible beats a dropdown (one glance, no click to reveal)
  const fallback: EditorKind =
    spec.type === 'boolean' ? 'checkbox' : spec.type === 'number' ? 'number' : spec.type === 'enum' ? 'radio' : 'text';
  const hint = spec.editor?.component;
  const kind = (EDITOR_COMPONENTS as readonly string[]).includes(String(hint)) ? (hint as EditorKind) : fallback;
  return { kind, props: (spec.editor?.props ?? {}) as Record<string, unknown> };
}
