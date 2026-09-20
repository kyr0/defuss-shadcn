/**
 * Why: the canonical machine-readable component contract (`<name>.schema.json`,
 * plans/cmp-schemas-and-codeexample.md). The schema drives the docs CodeExample
 * state controls and is the single source of truth the Markdown `## States`
 * table is verified against — so both halves of that contract (parse/validate +
 * table comparison) live in ONE pure module: scripts/build.ts, scripts/verify.ts
 * and tests/component-schema.test.ts all consume the exact same code, so the
 * gate cannot drift from the writer. No defuss-schema dependency (plan §9):
 * the v1 vocabulary is small enough to validate by hand, in ~120 lines.
 */

export const SCHEMA_VERSION = 1;
export const STATE_TYPES = ['string', 'number', 'boolean', 'enum'] as const;
export type StateType = (typeof STATE_TYPES)[number];
export const TARGET_KINDS = ['root', 'selector'] as const;
export const MUTATION_KINDS = ['property', 'attribute', 'class', 'api'] as const;
/** plan §4: fixed method allow-list, expand only when a component demands it. */
export const ACTION_METHODS = ['focus', 'blur', 'click', 'showModal', 'close'] as const;
/** Suggested editors (plan §3); an unknown value falls back by type at runtime. */
export const EDITOR_COMPONENTS = ['text', 'number', 'checkbox', 'radio', 'select'] as const;

export interface SchemaTarget {
  kind: (typeof TARGET_KINDS)[number];
  selector?: string;
}
export interface SchemaMutation {
  kind: (typeof MUTATION_KINDS)[number];
  name: string;
  /** api mutations only: named setState() config keys; the value string
   * '@value' is replaced by the editor value (bridge applyMop) */
  args?: Record<string, string | number | boolean>;
}
export interface SchemaEditor {
  component?: string;
  props?: Record<string, unknown>;
}
export interface StateSpec {
  type: StateType;
  default?: unknown;
  values?: string[];
  target?: SchemaTarget;
  mutation?: SchemaMutation;
  observation?: SchemaMutation;
  editor?: SchemaEditor;
}
export interface ActionSpec {
  target?: SchemaTarget;
  operation: { kind: 'method' | 'event'; name: string };
}
export interface ComponentSchema {
  schemaVersion: number;
  name: string;
  states: Record<string, StateSpec>;
  actions: Record<string, ActionSpec>;
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isNonEmptyStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isScalar = (v: unknown): boolean =>
  v === null || ['string', 'number', 'boolean'].includes(typeof v);

/**
 * Parse + validate one component schema. `source` names the file in every
 * message so a failing build tells an agent exactly which contract to repair.
 * Returns the typed schema (for reuse by manifest/docs gates) or the problems.
 */
export function parseComponentSchema(raw: unknown, source: string): { schema?: ComponentSchema; problems: string[] } {
  const problems: string[] = [];
  const err = (path: string, msg: string) => problems.push(`${source}: ${path}: ${msg}`);
  // shared target validator: states and actions both address an element
  const badTarget = (path: string, t: unknown) => {
    if (!isObj(t) || !(TARGET_KINDS as readonly string[]).includes(String(t.kind))) {
      err(path, 'target must be {kind:"root"} or {kind:"selector",selector:"…"}');
      return false;
    }
    if (t.kind === 'selector' && !isNonEmptyStr(t.selector)) {
      err(`${path}.selector`, 'selector kind requires a non-empty selector');
      return false;
    }
    return true;
  };
  if (!isObj(raw)) return { problems: [`${source}: schema root must be an object`] };
  if (raw.schemaVersion !== SCHEMA_VERSION) err('schemaVersion', `must be ${SCHEMA_VERSION}`);
  if (!isNonEmptyStr(raw.name)) err('name', 'must be a non-empty string');
  if (!isObj(raw.states)) {
    return { problems: [...problems, `${source}: states: must be an object`] };
  }
  const states: Record<string, StateSpec> = {};
  for (const [key, spec] of Object.entries(raw.states)) {
    // lowerCamelCase, optionally kebab-segmented: runtime state names are the
    // contract (accordion declares all-open/all-closed) and schemas mirror them
    if (!/^[a-z][a-zA-Z0-9]*(-[a-z][a-zA-Z0-9]*)*$/.test(key)) err(`states.${key}`, 'key must be a lowerCamelCase (optionally kebab-cased) identifier');
    if (!isObj(spec)) {
      err(`states.${key}`, 'must be an object');
      continue;
    }
    if (!(STATE_TYPES as readonly string[]).includes(String(spec.type))) {
      err(`states.${key}.type`, `must be one of ${STATE_TYPES.join('|')}`);
      continue;
    }
    const type = spec.type as StateType;
    if ('default' in spec && !isScalar(spec.default)) err(`states.${key}.default`, 'must be a JSON scalar');
    if ('default' in spec && typeof spec.default === 'number' && !Number.isFinite(spec.default))
      err(`states.${key}.default`, 'must be finite');
    if (type === 'boolean' && 'default' in spec && typeof spec.default !== 'boolean')
      err(`states.${key}.default`, 'must be a boolean for boolean states');
    if (type === 'number' && 'default' in spec && typeof spec.default !== 'number')
      err(`states.${key}.default`, 'must be a number for number states');
    if (type === 'string' && 'default' in spec && typeof spec.default !== 'string')
      err(`states.${key}.default`, 'must be a string for string states');
    let values: string[] | undefined;
    if (type === 'enum') {
      if (!Array.isArray(spec.values) || spec.values.length === 0 || !spec.values.every(isNonEmptyStr)) {
        err(`states.${key}.values`, 'enum states require a non-empty array of strings');
        continue;
      }
      values = spec.values as string[];
      if (new Set(values).size !== values.length) err(`states.${key}.values`, 'duplicate enum value');
      if ('default' in spec && !values.includes(spec.default as string))
        err(`states.${key}.default`, 'enum default must be one of values');
    } else if ('values' in spec) {
      err(`states.${key}.values`, 'only enum states may declare values');
      continue;
    }
    if ('target' in spec && !badTarget(`states.${key}.target`, spec.target)) continue;
    const badMop = (path: string, m: unknown) => {
      if (!isObj(m) || !(MUTATION_KINDS as readonly string[]).includes(String(m.kind))) {
        err(path, `kind must be one of ${MUTATION_KINDS.join('|')}`);
        return false;
      }
      if (!isNonEmptyStr(m.name)) {
        err(`${path}.name`, 'requires a non-empty name');
        return false;
      }
      // named setState() args ride api mutations only (bridge '@value' map)
      if ('args' in m) {
        if (m.kind !== 'api') err(`${path}.args`, 'only api mutations may declare args');
        else if (!isObj(m.args) || !Object.values(m.args as object).every(isScalar))
          err(`${path}.args`, 'must be an object of scalar values');
      }
      return true;
    };
    if ('mutation' in spec && !badMop(`states.${key}.mutation`, spec.mutation)) continue;
    if ('observation' in spec && !badMop(`states.${key}.observation`, spec.observation)) continue;
    if ('editor' in spec) {
      if (!isObj(spec.editor)) err(`states.${key}.editor`, 'must be an object');
      else {
        if ('component' in spec.editor && !isNonEmptyStr(spec.editor.component))
          err(`states.${key}.editor.component`, 'must be a non-empty string');
        if ('props' in spec.editor && !isObj(spec.editor.props))
          err(`states.${key}.editor.props`, 'must be an object');
      }
    }
    states[key] = spec as unknown as StateSpec;
  }
  if (!isObj(raw.actions)) {
    problems.push(`${source}: actions: must be an object (empty allowed)`);
    return { problems };
  }
  const actions: Record<string, ActionSpec> = {};
  for (const [key, act] of Object.entries(raw.actions)) {
    if (!/^[a-z][a-zA-Z0-9]*$/.test(key)) err(`actions.${key}`, 'key must be a lowerCamelCase identifier');
    if (!isObj(act) || !isObj((act as Record<string, unknown>).operation)) {
      err(`actions.${key}`, 'must carry an operation object');
      continue;
    }
    const op = (act as Record<string, unknown>).operation as Record<string, unknown>;
    if (op.kind === 'method') {
      if (!(ACTION_METHODS as readonly string[]).includes(String(op.name)))
        err(`actions.${key}.operation.name`, `method must be one of ${ACTION_METHODS.join('|')}`);
    } else if (op.kind === 'event') {
      if (!isNonEmptyStr(op.name)) err(`actions.${key}.operation.name`, 'event actions require a non-empty name');
    } else {
      err(`actions.${key}.operation.kind`, 'must be "method" or "event"');
      continue;
    }
    if ('target' in act && !badTarget(`actions.${key}.target`, act.target)) continue;
    actions[key] = act as unknown as ActionSpec;
  }
  return problems.length ? { problems } : { schema: { ...raw, states, actions } as unknown as ComponentSchema, problems };
}

/** Parse schema JSON text (JSON.parse errors surface as problems, never throws). */
export function parseComponentSchemaText(text: string, source: string) {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { problems: [`${source}: invalid JSON — ${(e as Error).message}`] };
  }
  return parseComponentSchema(raw, source);
}

/**
 * Published schema artifacts under dist/: every copied `<name>.schema.json` plus
 * the generated manifest. verify's `dist 1:1` orphan scan allow-lists exactly
 * these (their src counterpart lives at a DIFFERENT path —
 * src/components/<name>/<name>.schema.json — so the 1:1 rule cannot see them).
 */
export function isSchemaArtifact(distRel: string): boolean {
  return /^schemas\/[a-z0-9-]+\.schema\.json$/.test(distRel) || distRel === 'schemas/manifest.json';
}

/** Deterministic (sorted, fixed-format) manifest.json content for one build. */
export function schemaManifestText(components: string[]): string {
  const map: Record<string, string> = {};
  for (const c of [...components].sort()) map[c] = `./${c}.schema.json`;
  return JSON.stringify({ schemaVersion: SCHEMA_VERSION, components: map }, null, 2) + '\n';
}

// ---------------------------------------------------------------------------
// CodeExample contracts: the prop guard that makes the original divergence bug
// structurally impossible (§5: source-only props, never renderedChildren+code),
// and the schema→editor mapping (§3/§10: generic fallback by type, hints win).
// Pure so tests/component-schema.test.ts pins both in browser mode.
// ---------------------------------------------------------------------------

// Re-exported from the docs SSG tree (src/documentation/lib/code-example-
// contract.ts): the SSR component enforces the SAME guard at build time, and
// verify + the Vitest browser tests consume it through this path — one pure
// definition, no drift between what ships and what is gated (§5/§10/§27).
export {
  FORBIDDEN_CODE_EXAMPLE_PROPS,
  codeExampleProblems,
  editorFor,
  type EditorKind,
  type EditorStateSpec,
} from '../../src/documentation/lib/code-example-contract';

// ---------------------------------------------------------------------------
// Markdown `## States` — canonical table parser + schema comparison (§13–18)
// ---------------------------------------------------------------------------

export interface DocsStateRow {
  name: string;
  type: string | null;
  values: string[] | null; // null = cell empty / —
  def: string | null; // raw cell content, null = — / empty
  line: number;
}

export interface StatesTable {
  rows: DocsStateRow[];
  problems: string[];
}

/**
 * Locate the canonical `## States` table in a Markdown/MDX source. Deterministic
 * by construction (plan §13): a section anchored by a heading line exactly
 * `## States` OUTSIDE any fence, OR a `<StatesSection>` element (the existing
 * docs scaffold — which renders exactly that heading — so schema'd pages can
 * carry the contract table inside their States section without a second TOC
 * heading). Pages quote skill markdown — which has its own `## States` — inside
 * <CodeCard> fences; quoted material (inside fences) is never the contract. The
 * table itself must sit in a fenced block with meta exactly `states`. The fence
 * is required for two reasons: the docs pipeline deliberately ships without
 * remark-gfm (a bare table would render as pipe prose), and the fence makes the
 * contract self-delimiting — the remark plugin renders it into a real <table>
 * so the authored source and the rendered page show the same bytes.
 */
export function findStatesTable(src: string): { rows: DocsStateRow[]; problems: string[]; found: boolean } {
  const lines = src.split('\n');
  // fence map: `fenced[i]` = line i is INSIDE a ``` block; `edge[i]` = fence delimiter line
  const fenced = lines.map(() => false);
  const edge = lines.map(() => false);
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^(`{3,}|~{3,})/.test(lines[i])) {
      edge[i] = true;
      inFence = !inFence;
      continue;
    }
    fenced[i] = inFence;
  }
  const start = lines.findIndex((l, i) => (l.trim() === '## States' || l.trim().startsWith('<StatesSection')) && !fenced[i] && !edge[i]);
  if (start < 0) return { rows: [], problems: [], found: false };
  const sectionEnd = lines[start].trim().startsWith('<StatesSection') ? '</StatesSection>' : null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++)
    if (!edge[i] && (sectionEnd ? lines[i].includes(sectionEnd) : /^##\s/.test(lines[i]))) {
      end = i;
      break;
    }
  // the canonical table must live in a ```states fence inside the section
  let table: Array<{ l: string; n: number }> | null = null;
  for (let i = start + 1; i < end; i++) {
    if (/^(`{3,}|~{3,})states\s*$/.test(lines[i])) {
      let j = i + 1;
      while (j < end && !edge[j]) j++;
      table = lines.slice(i + 1, j).map((l, k) => ({ l, n: i + k + 2 }));
      break;
    }
  }
  if (!table)
    return {
      rows: [],
      problems: [
        `## States section (line ${start + 1}) has no \`\`\`states fenced table — the canonical contract block (plans/cmp-schemas-and-codeexample.md §13)`,
      ],
      found: true,
    };
  const pipeRows = table.filter(({ l }) => /^\s*\|/.test(l));
  // header + separator is a VALID empty contract: schemas may legitimately
  // declare zero observable states (behavior-only components driven through
  // actions); the fence still proves the section was verified
  if (pipeRows.length < 2)
    return { rows: [], problems: ['the ```states fence must contain a Markdown table (header + separator, rows optional)'], found: true };
  // strip every backtick per cell (plan §13 style: `text`, `email` cells carry
  // inline backticks; the contract is the bare text inside them)
  const cells = (l: string) =>
    l
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.replace(/`/g, '').trim());
  const header = cells(pipeRows[0].l);
  const col = (name: string) => header.indexOf(name);
  const problems: string[] = [];
  if (col('State') < 0) problems.push('States table must have a `State` column');
  if (col('Type') < 0) problems.push('States table must have a `Type` column');
  if (problems.length) return { rows: [], problems, found: true };
  const cValues = col('Values');
  const cDefault = col('Default');
  const rows: DocsStateRow[] = [];
  for (const { l, n } of pipeRows.slice(2)) {
    const c = cells(l);
    const name = c[col('State')] ?? '';
    if (!name) {
      problems.push(`line ${n}: empty state name`);
      continue;
    }
    if (rows.some((r) => r.name === name)) problems.push(`line ${n}: duplicate state row \`${name}\``);
    const rawValues = cValues >= 0 ? c[cValues] ?? '' : '';
    const rawDefault = cDefault >= 0 ? c[cDefault] ?? '' : '';
    rows.push({
      name,
      type: c[col('Type')] || null,
      values: rawValues === '' || rawValues === '—' ? null : rawValues.split(',').map((v) => v.trim()).filter(Boolean),
      def: rawDefault === '' || rawDefault === '—' ? null : rawDefault,
      line: n,
    });
  }
  return { rows, problems, found: true };
}

/** Compare one schema against one already-located docs table (pure; unit-tested). */
export function schemaStatesProblems(
  docPath: string,
  schema: ComponentSchema,
  rows: DocsStateRow[],
  tableProblems: string[],
): string[] {
  const P = (msg: string) => `${docPath} → ## States: ${msg}`;
  const problems = tableProblems.map(P);
  const rowOf = new Map(rows.map((r) => [r.name, r]));
  for (const [key, spec] of Object.entries(schema.states)) {
    const row = rowOf.get(key);
    if (!row) {
      const def = 'default' in spec ? fmtJson(spec.default) : '—';
      problems.push(P(`MISSING STATE \`${key}\` (${spec.type}, default=${def}) — documented=${'—'}`));
      continue;
    }
    if (row.type !== spec.type)
      problems.push(P(`state \`${key}\`: type mismatch — schema: ${spec.type}, docs: ${row.type ?? '—'}`));
    // enum + boolean carry a closed value set; the Values cell must mirror it exactly
    const docValues = row.values ?? [];
    if (spec.type === 'enum' || spec.type === 'boolean') {
      const want = new Set<string>(spec.type === 'enum' ? (spec.values ?? []) : ['true', 'false']);
      const have = new Set(docValues);
      const missing = [...want].filter((v) => !have.has(v));
      const extra = [...have].filter((v) => !want.has(v));
      if (missing.length) problems.push(P(`state \`${key}\`: missing values ${missing.map((v) => `\`${v}\``).join(', ')}`));
      if (extra.length) problems.push(P(`state \`${key}\`: unexpected values ${extra.map((v) => `\`${v}\``).join(', ')}`));
    } else if (docValues.length) {
      problems.push(P(`state \`${key}\`: non-enum state must show \`—\` in Values, got \`${docValues.join(', ')}\``));
    }
    // default: schema-absent must be —; a present default must match after
    // scalar normalization (no fuzzy prose matching, plan §18)
    const docDefault = row.def;
    if (!('default' in spec)) {
      if (docDefault !== null) problems.push(P(`state \`${key}\`: schema declares no default, docs show \`${docDefault}\` (use \`—\`)`));
    } else {
      const norm = normalizeDocDefault(docDefault);
      if (!defaultMatches(spec.default, norm))
        problems.push(P(`state \`${key}\`: default mismatch — schema: ${fmtJson(spec.default)}, docs: \`${docDefault}\``));
    }
  }
  for (const row of rows)
    if (!(row.name in schema.states))
      problems.push(P(`PHANTOM STATE \`${row.name}\` (docs line ${row.line}) — not in the component schema`));
  return problems;
}

/** `false`→false, `42`→42, `null`→null, `"x"`→'x'; otherwise the raw cell text. */
function normalizeDocDefault(cell: string | null): string | number | boolean | null | undefined {
  if (cell === null) return undefined;
  const c = cell.trim();
  if (c === 'null') return null;
  if (c === 'true') return true;
  if (c === 'false') return false;
  if (c.startsWith('"') && c.endsWith('"') && c.length >= 2) {
    try {
      return JSON.parse(c);
    } catch {
      return c;
    }
  }
  if (c !== '' && !isNaN(Number(c))) return Number(c);
  return c;
}

function defaultMatches(schemaDefault: unknown, doc: ReturnType<typeof normalizeDocDefault>): boolean {
  if (typeof schemaDefault === 'string' && typeof doc === 'string') return schemaDefault === doc;
  return (
    (typeof schemaDefault === typeof doc || schemaDefault === null || doc === null) &&
    String(schemaDefault) === String(doc)
  );
}

/** JSON scalar as it must appear in the docs table (backticked cell content). */
export function fmtJson(v: unknown): string {
  return JSON.stringify(v);
}

// ---------------------------------------------------------------------------
// Executable-example fences (§7/§21/§22): the canonical ```… example directive
// ---------------------------------------------------------------------------

export interface ExampleFence {
  lang: string;
  meta: string;
  body: string;
  line: number;
  /** schema key resolved from `component="…"` in the fence meta (else the page's own component) */
  component: string | null;
  label: string | null;
  hint: string | null;
}

const FENCE = /(^|\n)(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)\n\2(?=\n|$)/g;

/** Every fenced block whose meta contains the `example` directive, with the
 * exact body bytes (fence → CodeExample.source verbatim, plan §7). */
export function exampleFences(mdx: string): ExampleFence[] {
  const out: ExampleFence[] = [];
  for (const m of mdx.matchAll(FENCE)) {
    const meta = (m[3] ?? '').trim();
    if (!/(^|\s)example(\s|$)/.test(meta)) continue;
    const attrs = [...meta.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)];
    const attr = (k: string) => attrs.find((a) => a[1] === k)?.[2] ?? null;
    out.push({
      lang: meta.split(/\s+/)[0] ?? '',
      meta,
      body: m[4],
      line: mdx.slice(0, m.index!).split('\n').length,
      component: attr('component'),
      label: attr('label'),
      hint: attr('hint'),
    });
  }
  return out;
}
