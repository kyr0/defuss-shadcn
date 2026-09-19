import { existsSync, readFileSync } from 'node:fs';
import { codeExampleProblems } from '../code-example-contract';
import { repoFile } from '../repo';

/**
 * Why: THE documentation rendering mechanism for executable examples
 * (plans/cmp-schemas-and-codeexample.md §5/§8). Accepts source ONLY — the fence
 * body — and renders it once, as the editable textarea AND the sandbox input.
 * The preview is never a second render tree, so "displayed code" and "executed
 * code" cannot diverge by construction; passing such a prop throws at build
 * time (the guard lives in ../code-example-contract, shared with the tests).
 *
 * The component's schema (when one exists beside its source) is read at build
 * time and embedded as `data-schema` JSON — the docs runtime generates state
 * controls from it exclusively (§10), and pages stay self-contained on any host
 * (no runtime fetch that a mirror/CDN layout could break).
 *
 * All interactivity (srcdoc assembly, sandbox bridge, controls, rerun/reset)
 * lives in runtime/code-example.ts; SSR emits the static shell so the layout,
 * source and toolbar exist pre-JS.
 */
export interface CodeExampleProps {
  /** the exact example fence body — displayed AND executed (§4 one source) */
  source: string;
  /** schema to load controls from (defaults to the page's own component) */
  component?: string;
  /** demo caption (rendered like <ExampleLabel>) */
  label?: string;
  /** demo hint (rendered like <ExampleHint>) */
  hint?: string;
  /** children etc. — forbidden (§5); typed unknown so the guard, not TS, reports them */
  children?: unknown;
  code?: unknown;
  preview?: unknown;
  previewSource?: unknown;
}

/** Read + lightly shape-check a sidecar schema (deep validation is verify's `component schemas` gate; failing loud here too so a broken contract never ships a silent page). */
function readSchema(component: string | undefined): string | null {
  if (!component || !/^[a-z0-9-]+$/.test(component)) return null;
  const file = repoFile('src', 'components', component, `${component}.schema.json`);
  if (!existsSync(file)) return null;
  const text = readFileSync(file, 'utf8');
  let schema: unknown;
  try {
    schema = JSON.parse(text);
  } catch (e) {
    throw new Error(`CodeExample: ${component}.schema.json is not valid JSON — ${(e as Error).message}`);
  }
  const s = schema as { name?: unknown; states?: unknown };
  if (typeof s.name !== 'string' || typeof s.states !== 'object' || s.states === null)
    throw new Error(`CodeExample: ${component}.schema.json lacks a string \`name\` / object \`states\` (see plan §2)`);
  return text;
}

const H2_LABEL = 'text-sm font-medium mb-2';
const H2_HINT = 'text-xs text-muted-foreground mb-3';

export function CodeExample({ source, component, label, hint, children, code, preview, previewSource }: CodeExampleProps) {
  const problems = codeExampleProblems({ source, children, code, preview, previewSource });
  if (problems.length) throw new Error(`CodeExample: ${problems.join(' | ')}`);
  const schemaText = readSchema(component);
  const name = label ?? `${component ?? 'Example'} example`;
  return (
    <div
      class="code-example"
      {...(component ? { 'data-component': component } : {})}
      {...(schemaText ? { 'data-schema': schemaText } : {})}
    >
      {label ? <p class={H2_LABEL}>{label}</p> : null}
      {hint ? <p class={H2_HINT}>{hint}</p> : null}
      {/* class="preview" exactly (verify's `preview blocks` gate + screenshot anchor);
          the iframe is inside it, so the captured default-state PNG shows the live sandbox */}
      <div class="preview" style="padding:0;overflow:hidden;">
        <iframe class="code-example-frame" sandbox="allow-scripts" title={name} style="width:100%;min-height:8rem;border:0;display:block;"></iframe>
        <output class="code-example-error" role="alert" hidden></output>
      </div>
      <div class="code-example-toolbar">
        <button class="code-example-tab" data-tab="code" aria-pressed="true">Code</button>
        <button class="code-example-tab" data-tab="state" aria-pressed="false" {...(schemaText ? {} : { disabled: true })}>State</button>
        <span class="code-example-spacer"></span>
        <button class="code-example-copy">Copy</button>
        <button class="code-example-reset" title="Restore the original source and rerun">Reset</button>
      </div>
      <div class="code-example-panel" data-panel="code">
        <textarea
          class="code-example-src"
          spellcheck="false"
          aria-label={`Editable source for: ${name}`}
          rows="10"
        >{source}</textarea>
      </div>
      <div class="code-example-panel" data-panel="state" hidden></div>
    </div>
  );
}

export interface StatesRow {
  name: string;
  type: string;
  values: string;
  def: string;
  desc: string;
}

/**
 * Why: renders the canonical `## States` contract table (```states fence, plan
 * §13) as the shipped `.table` component. The remark plugin passes the exact
 * fenced rows — the rendered page and the verified source are the same bytes,
 * and the docs pipeline (no remark-gfm) still shows a real <table>.
 */
export function StatesTable({ rows }: { rows: string }) {
  let data: StatesRow[];
  try {
    data = JSON.parse(rows) as StatesRow[];
  } catch (e) {
    throw new Error(`StatesTable: malformed rows payload — ${(e as Error).message}`);
  }
  const cell = (v: string) => (v === '—' || v === '' ? '—' : v);
  return (
    <table class="table" data-variant="simple">
      <thead>
        <tr>
          <th>State</th>
          <th>Type</th>
          <th>Values</th>
          <th>Default</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {data.map((r) => (
          <tr>
            <td><code>{r.name}</code></td>
            <td><code>{r.type}</code></td>
            <td>{r.values}</td>
            <td><code>{cell(r.def)}</code></td>
            <td>{r.desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
