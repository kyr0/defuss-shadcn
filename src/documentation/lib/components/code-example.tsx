import { existsSync, readFileSync } from 'node:fs';
import { codeExampleProblems } from '../code-example-contract';
import { componentPath } from '../repo';

/**
 * Why: THE documentation rendering mechanism for executable examples
 * (plans/cmp-schemas-and-codeexample.md §5/§8). Accepts source ONLY - the fence
 * body - and renders it once, as the editable textarea AND the sandbox input.
 * The preview is never a second render tree, so "displayed code" and "executed
 * code" cannot diverge by construction; passing such a prop throws at build
 * time (the guard lives in ../code-example-contract, shared with the tests).
 *
 * The component's schema (when one exists beside its source) is read at build
 * time and embedded as `data-schema` JSON - the docs runtime generates state
 * controls from it exclusively (§10), and pages stay self-contained on any host
 * (no runtime fetch that a mirror/CDN layout could break).
 *
 * The card IS the shipped HTML Preview Editor (src/components/code-example,
 * the wysiwyg bundle): all interactivity (srcdoc assembly, sandbox bridge,
 * controls, rerun/reset, viewport/device emulation, Shiki) lives in the
 * component; SSR emits its static shell so the layout, source and toolbars
 * exist pre-JS, and runtime/code-example.ts only configures the docs' preview
 * assets.
 *
 * Viewport toolbar (every card, not just the layout demos): Rotate / Phone /
 * Tablet / Desktop / Full + custom W×H fields. Phone (390×844) and tablet
 * (834×1112) pin the frame to a device box and draw a scaling CSS bezel + island
 * + home indicator around the sandbox (the .code-example-device shell) so it reads as a
 * handheld; Rotate flips the box for landscape. Desktop / Full measure the
 * content instead and reset the height field (placeholder "Full").
 */
/**
 * The example frame's sandbox. Every example runs in an opaque origin
 * (allow-scripts allow-forms) - isolated from the docs page and from each
 * other. Two opt-ins widen one card: `sandbox="embed"`, for an example that
 * hosts a third-party player (YouTube): such players need their own origin's
 * storage, which a nested frame only gets when this frame is same-origin - and
 * the player's permissions must be delegated through this frame;
 * `sandbox="links"`, for an example whose links open a page in a new tab (the
 * flagship deck's full-screen apps): popups only, the frame stays opaque, the
 * opened page runs unsandboxed like any link the reader follows.
 */
export const EXAMPLE_SANDBOX = {
  default: { sandbox: 'allow-scripts allow-forms', allow: 'clipboard-write' },
  embed: {
    sandbox: 'allow-scripts allow-forms allow-same-origin allow-presentation allow-popups',
    allow: 'clipboard-write; autoplay; encrypted-media; fullscreen; picture-in-picture',
  },
  links: { sandbox: 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox', allow: 'clipboard-write' },
} as const;

export interface CodeExampleProps {
  /** the exact example fence body - displayed AND executed (§4 one source) */
  source: string;
  /** schema to load controls from (defaults to the page's own component) */
  component?: string;
  /** demo caption (rendered like <ExampleLabel>) */
  label?: string;
  /** demo hint (rendered like <ExampleHint>) */
  hint?: string;
  /** fence attr sandbox="embed": the opt-in for a third-party player (EXAMPLE_SANDBOX) */
  sandbox?: string;
  /** min frame height in rem (fence attr height="N") - floors the sandbox while
   * the true content height arrives (mirrors the old previewStyle min-height) */
  height?: string;
  /** viewport toolbar boot mode (fence attr mode="phone|tablet|desktop|full"):
   * media-query components (sidebar) need the sandbox viewport ≥ their
   * breakpoint - a fence decides what the demo boots as */
  mode?: string;
  /** stage styles for the sandbox body (fence attr previewStyle="…") - mirrors
   * the old <Example previewStyle>: flex/gap/centering chrome of the demo area,
   * never part of the example source */
  previewStyle?: string;
  /** children etc. - forbidden (§5); typed unknown so the guard, not TS, reports them */
  children?: unknown;
  code?: unknown;
  preview?: unknown;
  previewSource?: unknown;
}

/** Read + lightly shape-check a sidecar schema (deep validation is verify's `component schemas` gate; failing loud here too so a broken contract never ships a silent page). */
function readSchema(component: string | undefined): string | null {
  if (!component || !/^[a-z0-9-]+$/.test(component)) return null;
  const file = componentPath(component, `${component}.schema.json`);
  if (!existsSync(file)) return null;
  const text = readFileSync(file, 'utf8');
  let schema: unknown;
  try {
    schema = JSON.parse(text);
  } catch (e) {
    throw new Error(`CodeExample: ${component}.schema.json is not valid JSON - ${(e as Error).message}`);
  }
  const s = schema as { name?: unknown; states?: unknown };
  if (typeof s.name !== 'string' || typeof s.states !== 'object' || s.states === null)
    throw new Error(`CodeExample: ${component}.schema.json lacks a string \`name\` / object \`states\` (see plan §2)`);
  return text;
}

/**
 * Why: the State tab is a CONTRACT preview, not chrome - it renders only when
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

/** The component's own icons (lucide, inline) - read from its source at build
 * time, so the server-rendered shell and the runtime-built one are the same. */
const ICONS: Record<string, string> = (() => {
  const src = readFileSync(componentPath('code-example', 'code-example.ts'), 'utf8');
  const block = /const ICONS = \{([\s\S]*?)\n\};/.exec(src)?.[1] ?? '';
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/'([a-z-]+)': '([^']*)'/g)) out[m[1]] = m[2];
  return out;
})();

function Icon({ name }: { name: string }) {
  if (!ICONS[name]) throw new Error(`CodeExample: no icon "${name}" in components/code-example`);
  return (
    <svg class={`lucide lucide-${name}`} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[name] }}></svg>
  );
}

const H2_LABEL = 'text-sm font-medium mb-2';
const H2_HINT = 'text-xs text-muted-foreground mb-3';

export function CodeExample({ source, component, label, hint, height, mode, previewStyle, sandbox, children, code, preview, previewSource }: CodeExampleProps) {
  const problems = codeExampleProblems({ source, children, code, preview, previewSource });
  if (problems.length) throw new Error(`CodeExample: ${problems.join(' | ')}`);
  if (sandbox !== undefined && sandbox !== 'embed' && sandbox !== 'links') throw new Error(`CodeExample: sandbox="${sandbox}" - the opt-ins are sandbox="embed" and sandbox="links"`);
  const frame = EXAMPLE_SANDBOX[(sandbox ?? 'default') as keyof typeof EXAMPLE_SANDBOX];
  const schemaText = readSchema(component);
  const stateTab = showsStateTab(schemaText);
  const name = label ?? `${component ?? 'Example'} example`;
  // State-capture anchor (AGENTS.md "State API" rule 7): the card owns the
  // state demo now - its sandbox runs the one true source and the host api on
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
      {...(mode ? { 'data-vp-mode': mode } : {})}
      // previewStyle = stage chrome for the sandbox body (mirrors the old
      // <Example previewStyle>): layout of the demo area, never source bytes
      {...(previewStyle ? { 'data-preview-style': previewStyle } : {})}
    >
      {label ? <p class={H2_LABEL}>{label}</p> : null}
      {hint ? <p class={H2_HINT}>{hint}</p> : null}
      {/* the shipped code-example component's shell (components/code-example,
          the wysiwyg bundle) rendered here so the card exists pre-JS - the
          runtime finds .code-example-toolbar and builds nothing. class
          "preview" rides along on the stage (verify's `preview blocks` gate +
          the screenshot anchor); the inline padding undoes the docs .preview
          padding. The resizer component (all.js) puts handles on every side. */}
      <div class="code-example-stage preview" style="padding:0.75rem;overflow:hidden;">
        <div class="code-example-screen" data-mode="full">
          <div class="resizer code-example-resizer" data-handles="all" data-resize-mode="controlled" data-axis="both" data-min="240" data-max="1600" data-min-h="240" data-max-h="1400">
            <div class="code-example-device">
              <iframe class="code-example-frame" sandbox={frame.sandbox} allow={frame.allow} {...(sandbox === 'embed' ? { allowfullscreen: '' } : {})} title={name}></iframe>
              <span class="code-example-device-island" aria-hidden="true"></span>
              <span class="code-example-device-home" aria-hidden="true"></span>
            </div>
          </div>
        </div>
        <output class="code-example-error" role="alert" hidden></output>
        <button type="button" class="code-example-full-exit" title="Exit fullscreen (Esc)" aria-label="Exit fullscreen">
          <Icon name="x" />
        </button>
      </div>
      <div class="code-example-toolbar">
        <span class="code-example-viewport" role="group" aria-label="Preview device">
          <button type="button" class="code-example-vp" data-vp="rotate" title="Swap orientation (phone/tablet)" aria-disabled="true">
            <Icon name="rotate-cw" />
            <span>Rotate</span>
          </button>
          <button type="button" class="code-example-vp" data-vp="phone" aria-pressed="false" title="Phone 390×844">
            <Icon name="smartphone" />
            <span>Phone</span>
          </button>
          <button type="button" class="code-example-vp" data-vp="tablet" aria-pressed="false" title="Tablet 834×1112">
            <Icon name="tablet" />
            <span>Tablet</span>
          </button>
          <button type="button" class="code-example-vp" data-vp="desktop" aria-pressed="false" title="Desktop 1024">
            <Icon name="monitor" />
            <span>Desktop</span>
          </button>
          <button type="button" class="code-example-vp" data-vp="full" aria-pressed="true" title="Full width">
            <Icon name="app-window" />
            <span>Full</span>
          </button>
        </span>
        <span class="code-example-sep" aria-hidden="true"></span>
        <span class="code-example-size">
          <input class="code-example-vp-w" type="number" min="240" step="10" inputmode="numeric" placeholder="Width" aria-label="Custom preview width (px)" />
          <span class="code-example-vp-x" aria-hidden="true">×</span>
          <input class="code-example-vp-h" type="number" min="240" step="10" inputmode="numeric" placeholder="Full" aria-label="Custom preview height (px)" disabled />
        </span>
        <span class="code-example-sep" aria-hidden="true"></span>
        <span class="code-example-size">
          <input class="code-example-vp-z" type="number" min="25" max="100" step="5" inputmode="numeric" placeholder="Auto" aria-label="Preview zoom (%)" />
          <span class="code-example-vp-x" aria-hidden="true">%</span>
        </span>
        <span class="code-example-spacer"></span>
        {/* both tabs start off: the preview is the hero, a panel is opt-in */}
        <button type="button" class="code-example-tab" data-tab="code" aria-pressed="false" title="Show or hide the source">
          <Icon name="code-xml" />
          <span>Code</span>
        </button>
        {/* State tab only when the schema offers editable states */}
        {stateTab ? (
          <button type="button" class="code-example-tab" data-tab="state" aria-pressed="false" title="Show or hide the state controls">
            <Icon name="sliders-horizontal" />
            <span>State</span>
          </button>
        ) : null}
        <button type="button" class="code-example-reset" title="Restore the original source and rerun">
          <Icon name="rotate-ccw" />
          <span>Reset</span>
        </button>
        <button type="button" class="code-example-full" title="Preview fullscreen (Esc to exit)">
          <Icon name="maximize" />
          <span>Fullscreen</span>
        </button>
      </div>
      <div class="code-example-panel" data-panel="code" hidden>
        <button type="button" class="code-example-copy" title="Copy the source">
          <Icon name="copy" />
          <span>Copy</span>
        </button>
        {/* the textarea is the source the preview runs; the component's
            paint layer (Shiki) sits under it with the same metrics */}
        <div class="code-example-editor">
          <div class="code-example-paint" aria-hidden="true"></div>
          <textarea class="code-example-src" spellcheck="false" aria-label={`Editable source for: ${name}`} rows="10">{source}</textarea>
        </div>
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
 * fenced rows - the rendered page and the verified source are the same bytes,
 * and the docs pipeline (no remark-gfm) still shows a real <table>.
 */
/** Render a table cell's inline `code` spans - the fence body is markdown, but
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
    throw new Error(`StatesTable: malformed rows payload - ${(e as Error).message}`);
  }
  const cell = (v: string) => (v === '—' || v === '' ? '—' : v);
  // the contract table lives in a scroll container so the fixed metadata columns
  // never squeeze the Description prose (see .states-table in docs-utilities.css)
  return (
    <div class="states-table-wrap">
    <table class="table states-table" data-variant="simple">
      <thead>
        {/* fixed table layout resolves column widths from THIS row - the st-*
            width classes belong on the header cells, not the body cells */}
        <tr>
          <th scope="col" class="st-state">State</th>
          <th scope="col" class="st-type">Type</th>
          <th scope="col" class="st-values">Values</th>
          <th scope="col" class="st-default">Default</th>
          <th scope="col" class="st-desc">Description</th>
        </tr>
      </thead>
      <tbody>
        {data.map((r) => (
          // every cell keeps its fence backticks (the parser passes them
          // through) - inlineCode turns each span into a <code> chip, so a
          // Values cell with several tokens renders one chip per token
          <tr>
            <td class="st-state">{inlineCode(r.name)}</td>
            <td class="st-type">{inlineCode(r.type)}</td>
            <td class="st-values">{inlineCode(cell(r.values))}</td>
            <td class="st-default">{inlineCode(cell(r.def))}</td>
            <td class="st-desc">{inlineCode(r.desc)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
