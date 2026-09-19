Correct. Revised plan: **schemas live beside runtime components; `CodeExample` belongs to the documentation rendering path; every rendered documentation example uses it; Markdown `States` docs are deterministically verified against the schema.** No parallel kitchensink/demo architecture.

## Implementation plan for coding agent

### 1. Hard invariants

Implement these as non-negotiable:

```text
1. <component>.schema.json is the canonical machine-readable component contract.

2. Schema JSON is NEVER imported into component runtime JS.
   Runtime bundle cost = 0 bytes.

3. Every rendered component example in documentation goes through CodeExample.

4. CodeExample has ONE source of truth:
   the code shown in its editor IS the code executed to produce the preview.

5. Never accept:
      renderedChildren + separateCodeString
   because they can diverge.

6. Every component Markdown page has a `States` section.

7. `States` documentation MUST match <component>.schema.json deterministically.

8. Documentation/schema mismatch fails verification with actionable diagnostics.

9. No defuss-schema dependency.
```

---

# 2. Component sidecars

For every documented component:

```text
packages/shadcn/src/components/ui/
├── button.tsx
├── button.schema.json
├── input.tsx
├── input.schema.json
├── dialog.tsx
├── dialog.schema.json
└── ...
```

Use plain JSON.

Minimal v1:

```json
{
  "schemaVersion": 1,
  "name": "input",
  "states": {
    "value": {
      "type": "string",
      "default": "Hello world",
      "target": {
        "kind": "root"
      },
      "mutation": {
        "kind": "property",
        "name": "value"
      },
      "observation": {
        "kind": "property",
        "name": "value"
      },
      "editor": {
        "component": "input"
      }
    },
    "disabled": {
      "type": "boolean",
      "default": false,
      "target": {
        "kind": "root"
      },
      "mutation": {
        "kind": "property",
        "name": "disabled"
      },
      "observation": {
        "kind": "property",
        "name": "disabled"
      }
    }
  },
  "actions": {}
}
```

Keep supported state types small initially:

```ts
type StateType =
  | "string"
  | "number"
  | "boolean"
  | "enum";
```

For enum:

```json
{
  "type": "enum",
  "values": ["text", "email", "password"],
  "default": "text"
}
```

---

# 3. Editor hints remain schema metadata

Example:

```json
{
  "type": "number",
  "default": 1299.99,
  "editor": {
    "component": "number",
    "props": {
      "format": "currency",
      "currency": "EUR",
      "locale": "de-DE",
      "min": 0,
      "step": 0.01
    }
  }
}
```

Meaning:

```text
semantic type     number
example default   1299.99
suggested editor  number/currency
editor config     EUR, de-DE
```

Do not make `currency` another state unless it genuinely is component state.

Editor fallback:

```text
string  → text field
number  → number field
boolean → switch/checkbox
enum    → select
```

Unknown suggested editor → fallback by type.

---

# 4. Minimal mutation/observation vocabulary

Do not allow arbitrary JavaScript in schemas.

```ts
type Target =
  | { kind: "root" }
  | { kind: "selector"; selector: string };

type Mutation =
  | { kind: "property"; name: string }
  | { kind: "attribute"; name: string }
  | { kind: "class"; name: string };

type Observation =
  | { kind: "property"; name: string }
  | { kind: "attribute"; name: string }
  | { kind: "class"; name: string };
```

Actions:

```ts
type Action =
  | {
      target?: Target;
      operation: {
        kind: "method";
        name: "focus" | "blur" | "click" | "showModal" | "close";
      };
    }
  | {
      target?: Target;
      operation: {
        kind: "event";
        name: string;
      };
    };
```

Expand only when an actual component requires another primitive.

---

# 5. `CodeExample` replaces the divergent preview pattern

The old conceptual API:

```tsx
<CodePreview code="...">
  <CompletelyDifferentRenderedTree />
</CodePreview>
```

must disappear from documentation.

The new abstraction accepts **source only**:

```ts
interface CodeExampleProps {
  source: string;
  component?: string;
  schema?: ComponentSchema;
}
```

Conceptually:

```text
source
  ├── displayed in editor
  └── executed in sandbox
         ↓
       preview
```

There must be no second example-specific render tree.

---

# 6. Prefer one executable HTML+JS source

For maximum transparency, use one source buffer:

```html
<input
  data-example-root
  class="input"
  value="Hello world"
>

<script type="module">
  df$("[data-example-root]").on("input", (event) => {
    console.log(event.target.value);
  });
</script>
```

The exact same bytes:

```text
              ┌→ code editor
source string ┤
              └→ iframe/srcdoc execution
```

No transpilation should be necessary for these docs examples.

The sandbox may invisibly supply only **environment infrastructure**:

* defuss/`df$`;
* defuss-shadcn CSS;
* theme variables;
* sandbox bridge.

It MUST NOT supply example-specific behavior.

---

# 7. Markdown integration: every rendered example becomes `CodeExample`

Do not require docs authors to manually construct JSX `CodeExample` instances.

Extend the Markdown renderer with a canonical executable fence/directive.

For example:

````md
### Basic

```html example
<input data-example-root class="input" value="Hello world">

<script type="module">
  df$("[data-example-root]").on("input", (event) => {
    console.log(event.target.value);
  });
</script>
```
````

For an example involving another component:

````md
```html example component="dialog"
...
```
````

The Markdown renderer recognizes `example` and produces:

```text
CodeExample(source=<exact fence contents>)
```

Normal static code remains normal:

````md
```bash
bun add defuss-shadcn
```
````

### Critical rule

There must be **one and only one documentation rendering mechanism for executable examples**.

Remove/migrate:

```text
CodePreview
Preview + duplicated code
manual rendered example + fenced equivalent
hidden JSX demonstration tree
```

Add a verifier that rejects legacy executable-example constructs.

---

# 8. CodeExample UI

Recommended layout:

```text
┌─────────────────────────────────────────────┐
│ Preview                                     │
│                                             │
│               rendered DOM                  │
│                                             │
├─────────────────────────────────────────────┤
│ [Code] [State]                   [Reset]     │
├─────────────────────────────────────────────┤
│ editable exact HTML + JS                    │
└─────────────────────────────────────────────┘
```

Or tabs if current docs design prefers them.

Features required:

```text
✓ preview
✓ editable source
✓ live rerun
✓ reset source
✓ runtime errors visible
✓ generated state controls
✓ schema actions
```

Start with a lightweight textarea/editor. Do not add Monaco unless already justified independently.

---

# 9. Sandbox execution

Execute edited examples in an isolated iframe:

```html
<iframe sandbox="allow-scripts">
```

Prefer no `allow-same-origin`.

On each run:

```text
source edit
   ↓ debounce
fresh srcdoc
   ↓
load docs runtime/CSS
   ↓
execute exact source
   ↓
send READY / ERROR / STATE messages
```

Use a per-example channel ID so multiple examples cannot cross-talk.

Protocol:

```ts
type ParentToSandbox =
  | { type: "set-state"; state: string; value: unknown }
  | { type: "action"; action: string }
  | { type: "read-state" };

type SandboxToParent =
  | { type: "ready" }
  | { type: "state"; values: Record<string, unknown> }
  | { type: "error"; message: string; stack?: string };
```

---

# 10. State controls are generated from schema

Given:

```json
{
  "states": {
    "value": {
      "type": "string"
    },
    "disabled": {
      "type": "boolean"
    },
    "type": {
      "type": "enum",
      "values": ["text", "email", "password"]
    }
  }
}
```

CodeExample renders:

```text
value      [ Hello world          ]
disabled   [ OFF ]
type       [ text              ▾ ]
```

A schema suggestion can replace the generic editor:

```text
number + currency hint
        ↓
currency-aware number editor
```

The code remains generic.

No:

```ts
if (component === "input") ...
if (component === "dialog") ...
```

Component behavior must come from schema primitives.

---

# 11. Source remains authoritative

Important subtlety:

After running source, state controls should **observe the resulting DOM first**.

Resolution:

```text
observable DOM value
   ↓ available
use it

otherwise
   ↓
schema.default
```

Do not silently overwrite the example source's initial state with schema defaults.

Therefore if source says:

```html
<input value="42">
```

while schema default is `"Hello world"`, the state panel initially shows:

```text
value = "42"
```

Schema `default` is fallback/recommended initial state, not an invisible override.

---

# 12. State mutation does not rewrite source in v1

If the user changes:

```text
value: Hello → World
```

the State panel mutates the live preview.

Do **not** attempt to modify HTML source automatically.

That avoids AST/source-rewriting complexity.

`Reset`:

```text
restore original source
→ rerun
→ reread states
```

Later, source rewriting could become a separate explicit operation.

---

# 13. The Markdown `States` section becomes structurally verifiable

This is the other key change.

Require a canonical form on every component page:

```md
## States

| State | Type | Values | Default | Description |
| --- | --- | --- | --- | --- |
| `value` | `string` | — | `"Hello world"` | Current field value. |
| `disabled` | `boolean` | `true`, `false` | `false` | Disables interaction. |
| `type` | `enum` | `text`, `email`, `password` | `text` | Input behavior. |
```

This is deliberately boring because it is deterministic.

Do **not** validate by vague natural-language search.

---

# 14. Implement `verify-component-docs.ts`

The verifier reads:

```text
foo.schema.json
foo.md
```

and compares schema → Markdown `## States`.

Algorithm:

### A. Locate component schemas

Discover:

```text
src/components/ui/*.schema.json
```

### B. Map each schema to its component Markdown page

Use the documentation project's existing naming convention.

Prefer deterministic basename mapping:

```text
input.schema.json ↔ input.md
dialog.schema.json ↔ dialog.md
```

If the checkout uses another directory layout, preserve that layout rather than introducing a new docs tree.

### C. Parse `## States`

Find heading:

```text
## States
```

Read until the next heading of level `##` or higher.

Require one Markdown table there.

Parse column names case-sensitively after normalization.

Required:

```text
State
Type
```

Recommended/verified where applicable:

```text
Values
Default
Description
```

---

# 15. Exact verification semantics

For:

```json
{
  "states": {
    "value": { "type": "string" },
    "disabled": { "type": "boolean" },
    "type": {
      "type": "enum",
      "values": ["text", "email"]
    }
  }
}
```

Docs MUST contain exactly these state terms:

```text
value
disabled
type
```

### Fail: missing state

Schema:

```text
value
disabled
```

Docs:

```text
value
```

Output:

```text
ERROR input.md → ## States

Schema state missing from documentation:
  - disabled

Source:
  packages/shadcn/src/components/ui/input.schema.json
```

### Fail: phantom state

Docs:

```text
value
loading
```

Schema lacks `loading`.

Output:

```text
ERROR input.md → ## States

Documented state does not exist in schema:
  - loading
```

This catches stale documentation in both directions.

---

# 16. Verify state types too

Schema:

```json
"value": {
  "type": "string"
}
```

Docs:

```md
| `value` | `number` | ... |
```

must fail:

```text
ERROR input.md → state `value`

Type mismatch:
  schema: string
  docs:   number
```

This is important because the schema drives CodeExample's state editor.

---

# 17. Verify enum values

Schema:

```json
"type": {
  "type": "enum",
  "values": ["text", "email", "password"]
}
```

Docs:

```text
text, email
```

must fail:

```text
ERROR input.md → state `type`

Missing enum values:
  - password
```

Also reject extra values:

```text
Unexpected documented enum values:
  - date
```

Use set comparison; ordering is irrelevant.

---

# 18. Verify defaults where documented

I would make `Default` canonical too.

If schema has:

```json
"default": false
```

documentation must say:

```md
`false`
```

If a state has no default:

```text
—
```

This catches another common drift vector essentially for free.

Normalize JSON scalar representations:

```text
string  → JSON string semantics
number  → numeric
boolean → true/false
null    → null
```

Don't build a fancy parser.

---

# 19. Do not duplicate schema descriptions automatically

The Markdown prose remains human-written.

Schema establishes:

```text
state exists
type
values
default
```

Docs provide:

```text
meaning
usage
context
warnings
examples
```

The verifier checks factual structural completeness, not prose quality.

This is preferable to auto-generating the entire States section.

---

# 20. Agent-friendly diagnostics

Verification output must explicitly tell an agent what to fix.

Example:

```text
[component-docs] FAIL: input

Schema:
  packages/shadcn/src/components/ui/input.schema.json

Docs:
  docs/components/input.md

States section is out of sync:

  MISSING STATE
    disabled: boolean, default=false

  TYPE MISMATCH
    value
      schema: string
      docs: number

  ENUM VALUES MISSING
    type: password

Fix the Markdown States section so it matches the component schema.
Do not modify the schema merely to make verification pass unless
the component's actual runtime contract changed.
```

That last instruction matters.

---

# 21. Add executable-example verification

The same verifier suite should ensure the original divergence cannot return.

Implement:

```text
verify-code-examples.ts
```

For every component Markdown page:

* detect executable/rendered example syntax;
* ensure every one routes through the canonical `example` fence/directive;
* reject legacy preview constructs;
* reject separately specified render/code pairs;
* reject an empty example;
* parse the source enough to guarantee it is passed verbatim to CodeExample.

If docs previously contain `CodePreview`, after migration:

```text
repository search for CodePreview in component docs/runtime
→ zero results
```

Static non-runnable code snippets remain allowed.

---

# 22. Make `CodeExample` the Markdown renderer's default for executable fences

The docs Markdown pipeline should effectively do:

```ts
if (codeFence.meta.example) {
  return <CodeExample source={codeFence.literal} ... />;
}

return <CodeBlock ... />;
```

Thus docs authors cannot accidentally produce:

```text
example code
+
separate preview
```

They author one thing.

---

# 23. Schema resolution for CodeExample

On a component page such as:

```text
input.md
```

the docs build/runtime already knows the page component:

```text
input
```

Use this to resolve:

```text
input.schema.json
```

For most examples no metadata is needed.

Only override when one page intentionally demonstrates another component:

````md
```html example component="dialog"
...
```
````

Schemas should be loaded by docs tooling only.

Never inject them into the `defuss-shadcn` main JS bundle.

---

# 24. Build-time schema copying

Source:

```text
src/components/ui/input.schema.json
```

Published artifact:

```text
dist/schemas/input.schema.json
```

Generate:

```text
dist/schemas/manifest.json
```

Example:

```json
{
  "schemaVersion": 1,
  "components": {
    "button": "./button.schema.json",
    "dialog": "./dialog.schema.json",
    "input": "./input.schema.json"
  }
}
```

Sorted and deterministic.

This is useful for external agents/tools too, not just documentation.

---

# 25. Verification pipeline

Add one high-level command, e.g.:

```text
bun run verify
```

which performs:

```text
1. validate component *.schema.json
2. ensure runtime code imports zero schemas
3. build/copy schemas + manifest
4. verify every schema has corresponding component documentation
5. verify every `## States` table against schema
6. verify executable examples use CodeExample
7. build documentation
8. browser-test CodeExample
```

Any failure exits non-zero.

CI/prepublish/docs deployment must run it.

---

# 26. Migration strategy

Do not try to add schema metadata without simultaneously fixing docs divergence.

### Phase 1 — infrastructure

Implement:

```text
component schema types
schema validator
schema build/copy
manifest
CodeExample
Markdown example extension
States verifier
example verifier
```

### Phase 2 — one complete component

Use `input` first:

```text
input.tsx
input.schema.json
input.md
all examples → CodeExample
States → verified
browser test → verified
```

Prove complete vertical slice.

### Phase 3 — difficult components

Next:

```text
checkbox/switch
slider
dialog
select/combobox
```

These exercise:

```text
boolean
number
enum
actions
composite state
```

Only extend schema vocabulary if one of these demonstrates a real missing primitive.

### Phase 4 — migrate every component

For every existing component:

```text
1. create <name>.schema.json
2. audit actual runtime states
3. migrate ALL rendered docs examples to CodeExample
4. rewrite/fix `## States`
5. run verifier
6. close every reported gap
```

Do not bulk-create guessed schemas from docs.

Runtime implementation is authoritative for constructing the initial schema; after that, schema becomes the contract that keeps docs synchronized.

---

# 27. Tests

### Schema verifier tests

At minimum:

```text
✓ exact match
✓ missing state fails
✓ undocumented extra state fails
✓ wrong type fails
✓ incomplete enum fails
✓ extra enum value fails
✓ wrong default fails
✓ missing States section fails
✓ duplicate state row fails
✓ duplicate schema state impossible/JSON semantics
✓ malformed table fails clearly
```

### CodeExample browser tests

```text
✓ displayed source === executed source
✓ editing HTML changes preview
✓ editing JS changes behavior
✓ syntax error appears visibly
✓ runtime error appears visibly
✓ reset restores source
✓ string state generates text editor
✓ boolean generates boolean editor
✓ number generates number editor
✓ enum generates select
✓ editor hint affects selected editor/config
✓ state mutation changes live preview
✓ direct preview interaction updates state control
✓ actions work
✓ multiple examples remain isolated
```

### Regression test for original bug

Explicitly add a test proving this API/design is impossible:

```text
CodeExample cannot receive
  `code`
AND
  separately rendered `children`.
```

Ideally the component type has no such props.

---

# 28. Definition of done

```text
✓ <component>.schema.json exists beside every documented component

✓ schema metadata contributes 0 bytes to normal component runtime bundle

✓ every rendered docs example uses CodeExample

✓ no rendered example has independent "displayed code" and "rendered code"

✓ editing shown code directly changes the preview

✓ CodeExample state controls come exclusively from schema metadata

✓ every component .md has a canonical ## States section

✓ every schema state is documented

✓ no nonexistent state is documented

✓ state types match

✓ enum values match

✓ defaults match where specified

✓ verification fails deterministically on any gap

✓ failure output tells coding agents exactly what needs documentation work

✓ CI/docs build runs the verifier

✓ CodePreview/dual-source example mechanism is removed from the component documentation path
```