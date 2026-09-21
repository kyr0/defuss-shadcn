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
  /** min frame height in rem (fence attr height="N") — floors the sandbox while
   * the true content height arrives (mirrors the old previewStyle min-height) */
  height?: string;
  /** stage styles for the sandbox body (fence attr previewStyle="…") — mirrors
   * the old <Example previewStyle>: flex/gap/centering chrome of the demo area,
   * never part of the example source */
  previewStyle?: string;
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

/**
 * Why: the State tab is a CONTRACT preview, not chrome — it renders only when
 * the schema actually offers something to edit (≥1 state) and the schema hasn't
 * opted out via `"stateTab": false` (context-menu: the panel can't express a
 * right-click gesture, so its card ships the editor only). The schema itself
 * still rides on the card either way: the state-capture anchor and the runtime
 * api keep working for screenshots.
 */
function showsStateTab(schemaText: string | null): boolean {
  if (!schemaText) return false;
  const s = JSON.parse(schemaText) as { states?: Record<string, unknown>; stateTab?: unknown };
  return s.stateTab !== false && Object.keys(s.states ?? {}).length > 0;
}

const H2_LABEL = 'text-sm font-medium mb-2';
const H2_HINT = 'text-xs text-muted-foreground mb-3';

export function CodeExample({ source, component, label, hint, height, previewStyle, children, code, preview, previewSource }: CodeExampleProps) {
  const problems = codeExampleProblems({ source, children, code, preview, previewSource });
  if (problems.length) throw new Error(`CodeExample: ${problems.join(' | ')}`);
  const schemaText = readSchema(component);
  const stateTab = showsStateTab(schemaText);
  const name = label ?? `${component ?? 'Example'} example`;
  // State-capture anchor (AGENTS.md "State API" rule 7): the card owns the
  // state demo now — its sandbox runs the one true source and the host api on
  // the card drives it, so create-screenshots captures the live sandbox
  // instead of a second hand-written demo tree. Schema'd cards only: the
  // driver's setState contract is exactly the schema's state list.
  return (
    <div
      class="code-example"
      {...(component ? { 'data-component': component } : {})}
      {...(schemaText ? { 'data-schema': schemaText } : {})}
      {...(schemaText ? { 'data-state-demo': '' } : {})}
      {...(height ? { 'data-height': height } : {})}
      // previewStyle = stage chrome for the sandbox body (mirrors the old
      // <Example previewStyle>): layout of the demo area, never source bytes
      {...(previewStyle ? { 'data-preview-style': previewStyle } : {})}
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
        {/* State tab renders ONLY when the schema offers editable states — an
            empty contract (or stateTab:false) means no tab: editor stands alone. */}
        {stateTab ? <button class="code-example-tab" data-tab="state" aria-pressed="false">State</button> : null}
        <span class="code-example-spacer"></span>
        <button class="code-example-copy" title="Copy the example source">
          <i data-lucide="copy"></i>
          <span>Copy</span>
        </button>
        <button class="code-example-reset" title="Restore the original source and rerun">
          <i data-lucide="rotate-ccw"></i>
          <span>Reset</span>
        </button>
      </div>
      <div class="code-example-panel" data-panel="code">
        <textarea
          class="code-example-src"
          spellcheck="false"
          aria-label={`Editable source for: ${name}`}
          rows="10"
        >{source}</textarea>
      </div>
      {stateTab ? <div class="code-example-panel" data-panel="state" hidden></div> : null}
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
/** Render a table cell's inline `code` spans — the fence body is markdown, but
 * the docs pipeline (no remark-gfm inside JSX text) hands us raw bytes, so the
 * backticks are interpreted here: every odd segment becomes a <code> chip. */
function inlineCode(v: string) {
  return v.split('`').map((seg, i) => (i % 2 === 1 ? <code>{seg}</code> : seg));
}

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
            {/* Values may hold several backticked tokens — render each as a chip */}
            <td>{inlineCode(cell(r.values))}</td>
            <td><code>{cell(r.def)}</code></td>
            <td>{inlineCode(r.desc)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
