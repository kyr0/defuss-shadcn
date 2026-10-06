# defuss-query + defuss-morph Integration Plan

> Status: **implemented** (revision 2.4, 2026-09-19). Landed: §2 runtime/artifact
> contract (core.js + individual bindings + all = core + components), the §2.2 shared accessor,
> `df$.shadcn` namespace across components/docs/tests/skills, docs-runtime staging (no early
> namespace access), §5.1 artifact gates (core allow-list, all composition, core bindings,
> legacy namespace, shared ABI), §5.3 e2e for both delivery modes + bootstrap failures
> (tests/e2e/core.e2e.ts), stats core measurement, §5 docs parity (guide page "DOM
> Querying & Morphing", README/index/installation/es-modules updates), **all four §3 Tier-1
> migrations** (toast: query `.append()`/`.remove()` lifecycle; calendar: `df$(grid).morph()`
> keyed by stable ISO-date cell ids - identity + focus survive re-renders, identity-tested;
> combobox: query scalar writes over flag-based filtering - node/caret identity preserved;
> carousel: keyed dot morph + `.attr()`/`.prop()` flags), and the **§3 Tier-2 query baseline**
> (command, sortable, theme-switcher, image: scoped `.find()` lookup + `.attr()/.prop()/.data()/
> .text()/.val()/.css()` scalar writes, `.append()/.before()/.after()` exact moves, `.html()`
> single-pass swatch render; native protocols - showModal/showPopover/focus/DnD - stay native
> as named exceptions).
> **§5.1 DOM boundary** (verify gate `DOM boundary (migrated components)`): component sources
> that adopted the runtime (import `defussQuery`) may not use native structural sinks
> (innerHTML/outerHTML assignment, insertAdjacentHTML/Element, replaceChildren, insertBefore,
> appendChild) nor the §5.2 `.prop(innerHTML|outerHTML|textContent)` escape - the allow-list
> ships empty (every migrated file uses query ops). **Per-release provenance** (§6): the
> deterministic stamp (defuss-shadcn version + pinned upstream versions + SHA-256 of each
> LICENSE) rides inside core.js/core.min.js/all.js/all.min.js as a pointer comment and ships
> as dist/components/NOTICE.txt (scripts/lib/provenance.ts + provenance-files.ts); verify's
> `runtime provenance` gate fails on drift, tests/provenance.test.ts pins the contract.
> Revision 2 baseline text below is retained unchanged.
>
> (Original revision-2 header:) proposal; application migration and distribution changes not implemented. Revision 2, 2026-09-17.
>
> Complete replacement for revision 1, retaining the seven numbered sections, `df$.shadcn` namespace, component adoption map, and query/morph behavior requirements. **The distribution contract changes:** the host now loads our bundled `core` plus selected components, or our self-contained `all`. Separate host-provided query/morph assets and per-component shared-helper inlining are no longer the default or required delivery path.
>
> Source baseline retained from revision 1: [`kyr0/defuss@50aae32aa9aea45612510703e75875ed98aa6386`][BASE], committed 2026-09-16. Package manifests declare `defuss-query 0.1.0` and `defuss-morph 0.1.1`; query declares morph peer `^0.1.1`. These are the previously source-checked versions, not a new check of main or published npm/CDN artifacts. [Q-PKG] [M-PKG]
>
> The original plan cites a 2026-09-13 audit of **28 components: 21 native-flag-only, 7 structural**. Those counts remain historical input, not a new audit. Its adoption map names **8 Tier-1/Tier-2 candidates + 21 native-state components = 29 names**. Reconcile that discrepancy during inventory; do not drop a named component to match the old total.
>
> **Decision 1: both packages are real runtime dependencies, included in our distribution.** Query is the component-facing DOM API; morph is its parser, renderer, reconciler, and delegated-event substrate. Neither is optional. There is no native fallback renderer.
>
> **Decision 2: core installs the one runtime; components use it.** The host chooses a delivery mode. Inside the distribution, initialization is **morph → query → defuss-shadcn-shared → component code**. Only core's bootstrap installs `df$`; component implementations own their existing `df$.shadcn` APIs/state, never replace `df$`, extend `df$.fn`, or install another engine.
>
> **Decision 3: query everywhere appropriate; reconciliation only for structure.** Select/traverse through `df$`; use scalar setters for flags, attributes, classes, and values. Use collection `.morph()` for data-driven subtree reconciliation and query insertion/removal methods for exact lifecycle operations. Native browser protocols remain native.
>
> **Decision 4: two delivery modes, one implementation.** `core = defuss-morph + defuss-query + defuss-shadcn-shared`; `all = core + all shipped component code`. An individual component contains only its own implementation and references to core. **Documentation-only code belongs in neither core nor all.** `defuss-shadcn-shared` means the component-runtime shared layer, not a catch-all for code used by the docs site and not a requirement to publish another npm package.

## 1. Why they earn dependency status

`defuss-query` supplies the missing callable facade: `df$(selector, root)`, traversal, scalar updates, literal text, forms, events, and structural operations. Collections are snapshot Arrays, not live queries or reactive state. Query is a deliberate jQuery-shaped subset, not a drop-in jQuery implementation. [Q-README] [Q-IMPL]

`df$(el).morph(content, options)` delegates to the same morph engine as `df$.morph(el, content, options)`. `.html(content, options)` is an alias for this reconciliation path, **not** native `innerHTML` replacement. Prefer `.morph()` in component renderers so the semantics are explicit. The static API remains available for integration-level uses; do not build another wrapper API around it. [Q-IMPL]

The important distinction is **reconciliation versus exact mutation**. Query's `.append()`, `.prepend()`, `.before()`, `.after()`, `.replaceWith()`, and `.remove()` use its structural adapter. That adapter reuses morph's parsing, rendering, events, and lifecycle primitives, but performs exact native insertion/removal itself. They do not all call the diff algorithm; `.replaceWith()` intentionally replaces identity. [Q-ARCH]

For reconciliation, stable keys/IDs and compatible element types allow matched nodes to survive updates. This can preserve listeners and live state, but does not make every update identity- or focus-preserving: omitted nodes in a full render are removed, and a changed element type can require replacement. Focus on a removed calendar date needs an explicit component policy, not a promise from a key. Assert actual browser behavior. [M-README]

**Mode selection:**

| Required operation | Sanctioned path |
| --- | --- |
| Full next subtree, including deletions/reordering | `df$(container).morph(nextContent)` |
| Addressed partial updates/upserts, retaining unmentioned siblings | `df$(container).morph(changeSet, { diff: true })` |
| Exact insertion, move, or removal | Query `.append()` / `.prepend()` / `.before()` / `.after()` / `.remove()` |
| Native flag, ARIA attribute, class, or control value | Query `.prop()` / `.attr()` / class methods / `.val()` |
| Literal user-facing text | Query `.text(value)` or literal VNode children |

`diff: true` is not a filtering/deletion operation and does not reorder addressed siblings. A declared `children` field still reconciles that item's children; an addressed tag change can replace the item. Do not summarize the entire operation as "nothing can ever be removed." [M-README]

HTML-string omission cannot explicitly uncheck an uncontrolled input or clear its live value. Direct scalar changes now use `.prop("checked", false)` and `.val("")`; controlled state expressed **inside a render** uses explicit VNode properties. VNodes are no longer the only sanctioned way to set a control's state. [Q-IMPL] [M-README]

## 2. The runtime and artifact contract

### 2.1 Core provides `df$`; components own `df$.shadcn` APIs/state

A supported page loads **core followed by selected component scripts**, or **all alone**. Both modes install the same callable query factory, the same morph API, and the same component-shared implementation. Consumers do not separately load defuss-morph or defuss-query.

Core must initialize the morph/query pair and the shared layer before any component evaluates. Upstream morph's browser loader alone supplies an API object, while query's installer upgrades that object to a callable factory. Upstream query-first loading also exists with morph >= 0.1.1, but it is not the distribution bootstrap used here. Core bundles the library modules and initializes their composition explicitly, as specified in §2.6. [Q-README] [Q-IMPL] [M-GLOBAL]

The supported delivery modes are alternatives, not additive layers: do not load `core + all`, multiple core copies, or separately installed morph/query alongside these bundled artifacts. Add a bootstrap guard **outside and before execution of the embedded runtime payload**: reject an already installed `df$` with a clear configuration error rather than overwriting it, creating a second registry, or silently adopting an unqualified runtime. A rejected bootstrap re-execution must leave the original factory, handlers, and state unchanged. This guarantee covers our bootstrap against a pre-existing global; it does not intercept unrelated scripts that mutate `df$` afterward, which is unsupported. Test duplicate execution with classic scripts or distinct asset URLs; do not require an error from a cached module import that does not execute again. No runtime hot-swap or automatic compatibility fallback is part of this milestone.

All `_defussShadcn` namespace usages already have been migrated to `df$.shadcn` across component registries, `{name}Api` / `{name}States`, docs data, `themes.ts`, `theme-switcher.ts`, search-index code, types, verification rules, and AGENTS.md. Preserve existing schemas and behavior. Namespace migration **does not make docs code a core dependency**: docs scripts populate `df$.shadcn.docs` only after the library runtime is ready; core never imports, initializes, or prepopulates docs data. Any docs-only early theme bootstrap retains its pre-paint behavior outside the library artifacts without accessing the namespace prematurely.

Core installs the component-shared API once at `df$.shadcn.shared`; this is a new typed internal distribution surface, not a second global. Existing component API/state fields remain where they are. `defussGlobals()` remains `(defussQuery().shadcn ??= {})`, compiled once into the shared layer. Core may prepare that namespace and its shared helpers, but it must not eagerly populate component-specific registries or initialize components that were not loaded.

**Types:** use query's exported types and opt-in `import type {} from "defuss-query/global"`. Augment `QueryFactory` through `defuss-query/core` with the existing optional `shadcn` namespace type, extended for `shared`; preserve existing fields and add a concrete shared-API type rather than `any` or a generic dictionary. Core's implementation must not depend on docs runtime modules to obtain those types. Do not redeclare `var df$` incompatibly or copy upstream method signatures. Add strict consumer type tests for modular and all-in-one use. [Q-GLOBAL] [Q-PKG] [Q-IMPL]

### 2.2 One shared accessor, not per-component copies

Keep `src/shared/query.ts` as the typed doorway to the actual query factory. **Its implementation is emitted once in core**, along with the component-shared State-API infrastructure. Component source may import shared helpers for type checking and maintainability; the component build binds those imports to the installed `df$.shadcn.shared` functions instead of inlining their bodies.

The full accessor validates runtime capabilities; it does not install, repair, or load anything:

```ts
// src/shared/query.ts - included once in core, never inlined into each component.
import type { MorphApi } from "defuss-query";

type HostQuery = typeof import("defuss-query").df$;

const MORPH_METHODS = [
  "morph",
  "getRenderer",
  "htmlStringToVNodes",
  "renderMarkup",
  "domNodeToVNode",
  "registerDelegatedEvent",
  "removeDelegatedEvent",
  "getRegisteredEventTypes",
  "clearDelegatedEventsDeep",
  "clearDelegatedEvents",
  "handleLifecycleEventsForOnMount",
] as const satisfies readonly (keyof MorphApi)[];

export function defussQuery(): HostQuery {
  const candidate: unknown = Reflect.get(globalThis, "df$");
  if (typeof candidate === "function") {
    const prototype: unknown = Reflect.get(candidate, "fn");
    if (
      typeof Reflect.get(candidate, "queryVersion") === "string" &&
      typeof prototype === "object" &&
      prototype !== null &&
      typeof Reflect.get(prototype, "morph") === "function" &&
      MORPH_METHODS.every(
        (name) => typeof Reflect.get(candidate, name) === "function",
      )
    ) {
      return candidate as HostQuery;
    }
  }
  throw new Error(
    "defuss-shadcn: runtime incomplete; load core before component scripts, " +
      "or load all alone",
  );
}
```

The method list is query's `MorphApi` contract, not a new facade or security check. [Q-TYPES]

Each emitted component needs only a minimal entry guard and direct bindings to shared exports: check that `df$.shadcn.shared` exists and carries the expected distribution/shared-ABI version, then resolve its helpers before any registry or DOM mutation. A missing core must produce the same actionable load-order error, not an accidental property-access failure. Generate the expected version from the release build; qualify core and components from the same release rather than guessing cross-version compatibility.

The small entry guard is linkage code, not permission to copy `MORPH_METHODS`, query/morph implementations, State-API helpers, registries, or a general loader into every component. The all build uses the same component payloads and the same shared function references. No parallel `morph()` wrapper, collection proxy, method-forwarding facade, or alternate renderer is needed.

### 2.3 Required artifacts and consumer loading

The following are **target outputs**, not claims that they already exist. Keep the existing `dist/components/` distribution family and publish both readable and minified variants:

| Artifact | Must contain | Must not contain | Consumer prerequisite |
| --- | --- | --- | --- |
| `dist/components/core.js`, `core.min.js` | One defuss-morph runtime + one defuss-query runtime + defuss-shadcn-shared, with only the bootstrap/linkage needed to expose them. | Individual component implementations/registrations; docs-only runtime, data, styles, or examples. | No separately loaded query/morph assets. |
| `dist/components/<name>.js`, `<name>.min.js` | That component's implementation/private helpers and minimal bindings to core. | Embedded morph/query; copied shared implementations/state; unrelated component implementations; docs-only code. | Matching core, loaded first. |
| `dist/components/all.js`, `all.min.js` | The exact logical core payload + every shipped component implementation, once each. | Docs-only code; a second core or second copy of any component/shared module. | None of the other JavaScript artifacts. |
| Separate docs-site assets | Documentation bootstrap/navigation/search/code examples and other site-only behavior. | Inclusion in any library artifact's dependency graph. | Core + required components, or all, when accessing the library. |

`all` means **all public runtime components**, including native-state and Tier-2 components, not only the four Tier-1 migrations. Build its inventory from the actual shipping component manifest; the historical 28/29 count is not a build list. A docs page demonstrating a reusable component does not make that component docs-only. Conversely, locating a docs helper under a shared directory does not make it a core dependency.

Browser outputs are import-free, self-contained script payloads: core and all must not fetch another JavaScript chunk, CDN runtime, or shared helper; individual components must not fetch core automatically. Build as classic-script-compatible isolated payloads that also execute when imported for side effects from a module. TypeScript type imports are removed. Use module-aware bundling for dependencies, not concatenated unprocessed ESM files.

**Modular JavaScript:** keep existing required theme/token/component stylesheets; load core and only the desired components.

```html
<script type="module">
  await import("/dist/components/core.min.js");
  await import("/dist/components/dialog.min.js");
  await import("/dist/components/calendar.min.js");
</script>
```

**All-in-one JavaScript:** keep existing required stylesheets; no separate core, query, or morph tag.

```html
<script type="module">
  await import("/dist/components/all.min.js");
</script>
```

**Classic-script inclusion** is equally supported, with ordered deferred scripts:

```html
<script defer src="/dist/components/core.min.js"></script>
<script defer src="/dist/components/dialog.min.js"></script>
<script defer src="/dist/components/calendar.min.js"></script>
```

For the classic all-in-one path, the single script is `all.min.js`. Do not use `async` tags or start component imports concurrently with core; an ordinary inline application script also cannot assume preceding deferred/module scripts have finished. Explicit awaited imports stop the sequence when core fails. Components must initialize correctly both before and after `DOMContentLoaded`, including deliberate later component loading.

These are JavaScript composition requirements. Existing token/theme/component CSS contracts remain unchanged; loading core must not implicitly pull every component's CSS or any docs styles. Do not infer a new CSS packaging API from the JavaScript filenames.

`DocPage` consumes the same public artifacts as other hosts, then loads its docs-only code separately. Keep fixtures for both delivery modes even if the production docs shell uses all. Test emitted pages and `scripts/lib/mirror.ts` URL rewriting, including literal dynamic imports and classic script URLs; no docs template may rely on separately injected vendor globals to make a broken core/all bundle appear functional. Preserve docs-theme pre-paint timing outside these artifacts.

For bundler consumers using these distribution entries, preserve their side effects in package metadata and import the selected core/component or all entry without separately installing a query instance on `globalThis`. Do not add an unbundled third runtime-bootstrap mode in this milestone. Bundle-source imports use the pinned upstream library modules as described below; browser installation is owned by core, not by the consumer's own query bootstrap.

### 2.4 Query semantics components must preserve

| Area | Integration rule |
| --- | --- |
| Selection | Native CSS selectors only; scope to the component root or explicit ShadowRoot. Selections are snapshots: retain stable roots, re-query membership after structural changes. Assert required targets; empty selections otherwise permit no-op setters. |
| Scalar writes | `.prop()` for native booleans/properties; `.attr("aria-selected", "false")` for an explicit ARIA false string; `.val()` for live values. `.attr(name, false)` also writes the string `"false"`; **only `.attr(name, null)` removes it**. Use `.prop()` for HTML boolean state, not attribute presence. Query already rejects structural `.prop()` writes such as `innerHTML`. |
| Forms | `.form(submitter)` requires exactly one form and returns native `FormData`. Preserve duplicate names/files; do not replace a structured form contract with `.serialize()` indiscriminately. |
| Events | Element `.on(type, handler, options)` uses morph delegation. `this` is the selected target; `event.currentTarget` may be the delegation root. There is no `.on(type, selector, handler)` overload or jQuery event-namespace contract. |
| Native event requirements | Keep native `addEventListener` when `once`, `passive`, `signal`, or exact native propagation/currentTarget semantics are required; query supports only `capture`. Preserve native dialog/popover, focus, pointer capture, geometry, observers, scrolling, and animation protocols. |
| Teardown/activation | Prefer `.off(type, ownedHandler)`, not broad `.off()` on shared elements: broad removal can also clear VNode handlers. `.trigger()` dispatches `CustomEvent`; it is not `.click()`, form submission, or trusted input. |
| Async rendering | Without a transition, `.morph()` returns the selection synchronously. With a transition, it returns `Promise<selection>`; await it before subsequent dependent operations. Do not hide that distinction behind a `void` wrapper. |

These are source-derived constraints, not new features to implement in query. Existing public State APIs and event timing remain unchanged. [Q-IMPL] [Q-TYPES] [Q-ARCH]

### 2.5 What qualifies as defuss-shadcn-shared

`defuss-shadcn-shared` is the **component-only shared runtime layer**, with an explicit entry such as `src/shared/index.ts`. This proposed entry is a build boundary, not a new dependency the browser must load. Keep only common component infrastructure: the query accessor, State-API plumbing, and actual cross-component helpers/registries. Include the minimal core bootstrap/linkage and release/ABI metadata here; do not introduce another general-purpose runtime package.

Admission is based on runtime consumers, not directory names: ordinary helpers must be genuinely used by multiple shipped components; foundational infrastructure must demonstrably serve the shared component contract. A helper used by one component stays private to that component. A helper used only by documentation is docs-only. A docs import is never evidence that a helper belongs in core.

Audit **transitive** runtime imports/re-exports and top-level side effects. Split mixed files before bundling: common component code remains in the shared layer; documentation navigation, search indexes/palette wiring, code-block behavior, preview/demo logic, docs shell/sidebar behavior, route data, analytics, and site-specific theme initialization stay in the docs build. A generic reusable `sidebar`, `command`, or `theme-switcher` component remains a component; its docs-specific adapter/data does not move with it.

The dependency direction is `component → shared → query/morph`, with docs permitted to consume the public library. Neither shared nor library components may depend on docs. Core must not scan for or initialize individual components, install component-specific listeners/observers, allocate their named state registries, populate `df$.shadcn.docs`, or load docs assets. Generic shared functions may perform their documented work when a loaded component calls them; that is distinct from eager component initialization at core load.

The shared export list is explicit and reviewed. Do not re-export every utility from a generic barrel or import component modules to discover registrations. Put a reason and actual component consumers beside each admitted shared export in the build inventory; no requirement to duplicate a one-off helper across components just to qualify it for core.

### 2.6 Build graph, ordering, and dependency ownership

Replace the previous external-runtime/inlined-helper build policy with these steps:

1. **Core build.** Resolve one pinned `defuss-morph` library namespace and query's `createDf$` from `defuss-query/core`; bundle those modules once. Construct the callable with that same morph instance, publish it from the guarded bootstrap, then install the component-shared exports. This uses the upstream injection boundary rather than patching either engine or loading both query's injected core and its auto-created library instance. [Q-IMPL] [Q-INDEX] [Q-PKG]
2. **Individual builds.** Typecheck component sources against their normal shared imports; transform the explicit shared import boundary into references to `df$.shadcn.shared` using a module/AST-aware build step. Bundle component-private helpers only. Fail unsupported import shapes instead of silently inlining shared code. Emit isolated payloads with the small readiness/version guard; no unresolved imports or runtime loader.
3. **All build.** Assemble the emitted readable core payload first, then the same individual component payloads in a deterministic manifest order; generate the readable artifact and minify the assembled result once. Scopes must remain isolated. There is no second compile path that embeds shared modules into each component. `all = core + components` is a source/behavior composition invariant, not an assertion that independently compressed byte sizes add up.
4. **Ordering.** Core's global-conflict guard runs before its bundled runtime executes; shared installation completes before component initialization. Do not put bootstrap assignment in an ESM entry body after static side-effect component imports: those imports could evaluate first. Inspect the emitted artifact to verify actual execution order.
5. **Component independence.** A selected component must not silently pull in another component implementation. Audit cross-component imports. Extract genuinely shared behavior into shared, or document a real compositional dependency requiring that additional component to be selected. Publish/test any such requirements rather than hiding them in core or loading extra code. Test each independently advertised component with core alone.
6. **Release ownership.** Query and morph are real bundled dependencies of the library distribution, not merely runtime peers supplied by the page. Declare/lock the build inputs in package metadata and the lockfile, satisfying query's morph peer with the same resolved version; preserve dependency/type resolution for package consumers. Start qualification with the prior source versions query `0.1.0` + morph `0.1.1`, verifying published availability before prescribing registry/CDN pins. Workspace builds are valid pinned inputs. Record dependency versions, source/build provenance, licenses/notices, and per-artifact source membership; do not fork or hand-copy dependency source. [Q-PKG] [M-PKG]

Preserve side-effect metadata for the browser entries so downstream tooling does not discard runtime installation/component registration. Keep an explicit library component manifest separate from docs entrypoints, and verify the emitted module graph including generated code, not merely import spelling. Build both delivery modes from the same release inputs and regenerate all readable/minified twins, maps, mirrors, and payload reports together. No `@latest` production examples or invented compatibility ranges.

## 3. Component adoption map

All audited components adopt query for ordinary selection/traversal and suitable scalar writes. Event migration is semantic, not a search-and-replace. **Being a non-candidate for morph no longer means being a non-candidate for query.**

### Tier 1 - this milestone

| Component | Direct query integration | Structural path and acceptance criteria |
| --- | --- | --- |
| [calendar](../src/components/data-display/calendar/calendar.ts) | Scoped grid/control selection; query attributes/properties; retain native focus/keyboard operations. | `df$(grid).morph(nextGrid)` replaces `grid.innerHTML`. Stable date keys such as `d2026-09-13`; test identity for retained, matchable dates. Keep navigation controls outside the render boundary. When the focused date disappears, restore focus according to the existing keyboard/active-date policy. |
| [combobox](../src/components/forms-inputs/combobox/combobox.ts) | Query `.prop("hidden", ...)`, `.attr("aria-selected", ...)`, `.text()` for the trigger label, and `.val()` where required. | Morph keyed options only when option markup/membership/order changes. Filtering an existing list via flags does not need a new full renderer. Trigger/input stays outside the morphed subtree; preserve caret, keyboard behavior, active-descendant IDs, and announced state. |
| [carousel](../src/components/data-display/carousel/carousel.ts) | Query controls/dots and update `aria-current` through `.attr()` during slide changes. | Morph dot structure at initialization or when slides change, not merely to flip a flag. Use stable slide IDs when reorderable; index keys only for fixed positional identity. |
| [toast](../src/components/feedback-status/toast/toast.ts) | Mount with query `.append()`, locate an owned toast by a stable ID/key, and retain existing lifecycle/timer APIs. | Update a toast's owned content with `.morph()`; dismiss through `.remove()` after existing teardown/animation. A future authoritative stack renderer may use full keyed `.morph()`, but do not add a second state store now. Omission from a diff patch is never dismissal. |

Keys must be unique within the relevant reconciliation scope and represent identity, not the current filtered position. Preserve unmanaged/slotted content by keeping it outside owned render boundaries. The same collection must not acquire competing incremental and full-state owners.

### Tier 2 - lands with the feature that needs it

- [command](../src/components/overlays/command/command.ts): query for selection, flags, and interactions; full keyed `.morph()` when a filtered result set changes membership/order. Use `{ diff: true }` only for addressed streaming patches/upserts where retaining other results is intended.
- [sortable](../src/components/data-display/sortable/sortable.ts): restore an existing-node order through query `.append(orderedNodes)` on one parent; use full keyed morph only when an authoritative data render already exists. Native `appendChild` moves already preserve node identity; the benefit here is a shared adapter, not repairing a supposed replacement operation. Do not `.remove()` before moving: that clears delegated handlers. [Q-IMPL] [Q-ARCH]
- [theme-switcher](../src/components/navigation/theme-switcher/theme-switcher.ts): query for selection/state; include swatches in item VNodes/markup when rendering the list instead of hand-building an extra subtree.
- [image](../src/components/data-display/image/image.ts): query for controls and exact lightbox mount/unmount; introduce `.morph()` only for real re-rendered content. Preserve native focus, dialog, and media behavior.

### No structural reconciliation unless their behavior changes

`dialog`, `sheet`, `alert-dialog`, `dropdown`, `popover`, `tooltip`, `navigation-menu`, `accordion`, `tree-view`, `toggle`, `toggle-group`, `slider`, `sidebar`, `tabs`, `toolbar`, `number-input`, `color-picker`, `product-showcase`, `avatar`, `context-menu`, `alert`.

These remain native-state components with CSS rendering the result. Query can replace repeated DOM lookup/flag plumbing; a full subtree diff for one `open`, `hidden`, or ARIA update is still unnecessary. Native methods such as `showModal()`, `showPopover()`, and `focus()` stay native. A new data-rendered collection triggers a scoped morph adoption, not a component-wide rewrite.

## 4. Workstreams

0. **Namespace, typing, and ownership inventory.** Move runtime/API state to `df$.shadcn`, add typed `shared` exports, and preserve existing State APIs. Reconcile the component count and create an explicit shipping component inventory. Classify every current shared helper by actual runtime consumers; split docs-only/mixed files before creating a shared barrel. Exit: no legacy runtime namespace access; strict types pass; component/shared/docs boundaries and compositional dependencies are documented. Historical migration text and deliberate negative fixtures are excluded from the legacy-name gate.

1. **Artifact/bootstrap spike.** Produce real core + one component and all fixtures from the same inputs, with no separately loaded vendor scripts. Verify callable query, shared helper availability, morph behavior, startup before/after `DOMContentLoaded`, and the existing mirror/build output. Negative fixtures cover component-without-core, mismatched shared version, duplicate/conflicting core/all, and attempted overwrite of another `df$`. Exit: failures occur before component mutation and preserve any already active runtime.

2. **Shared extraction and packaging.** Replace per-component shared-helper inlining with §2.6's once-in-core implementations and direct shared bindings. Build readable/minified core, every individual component, and self-contained all. Update package metadata, dependency pins/notices, source inventories, artifact stats, and docs mirroring. Exit: exact artifact membership; one core/shared instance per supported mode; no docs code or hidden imports/chunks; no stale external-host-runtime requirement. All's component set equals the shipping manifest.

3. **Query baseline migration.** Migrate component-scoped lookup/traversal, ordinary scalar/class/value writes, and literal text. Review event conversions for delegation, options, teardown, target/currentTarget, and timing. Retain necessary native primitives as named exceptions. Exit: existing behavior tests pass in both delivery modes, stale membership references are eliminated, and shared-root handlers do not duplicate during observer re-initialization.

4. **Tier-1 structural migrations.** Calendar → combobox → carousel → toast, one focused commit each. Keep existing builders/state contracts where valid; replace only §3's identified operations. Exit: keyed identity, appropriate focus recovery, input selection, live form state, deletion, cleanup, and repeated-init assertions pass. No alternate native renderer remains. Unselected components must not acquire code, state, or initialization through core.

5. **Claims and docs parity.** Update README + `index.mdx` in one parity commit with both installation modes and their CSS prerequisites. Keep the canonical plan at `plans/defuss-query-morph-integration.md` and update incoming references. Add the guide **"DOM Querying & Morphing"**, navigation entry, and component skill notes. The docs shell consumes public core/components or all plus a separate docs entry. Remove obsolete quick-start requirements to load vendor scripts before all; regenerate mirrors and measured payload reports.

6. **Guardrails and release qualification.** Install §5's DOM, source-graph, packaging, and docs-exclusion gates; narrow migration exceptions. Promote `tmp/mutation-audit.ts` into `scripts/lib/` only if retained as a repeatable check. Qualify the exact runtime pair with upstream package checks and application tests for both distribution modes. Source inspection and this plan's checks do not establish that library builds or browser tests have passed.

## 5. New static rules and behavioral gates

### 5.1 Sanctioned DOM and artifact boundaries

Add a **components DOM boundary** gate in the existing `scripts/lib/` verification pattern. In migrated component code, reject direct structural writes such as native `innerHTML`/`outerHTML` assignment, `insertAdjacentHTML`, `replaceChildren`, and ad-hoc `createElement` + insertion chains. Route sanctioned structure through query `.morph()`/`.html()` or query's exact mutation methods.

Do not ban method names blindly: native `Element.append()` and `DfQuery.append()` have different receivers. Use syntax/receiver information, with type resolution where needed. Also flag prohibited `.prop("innerHTML", ...)`, `.prop("outerHTML", ...)`, and `.prop("textContent", ...)` before execution; query rejects those at runtime. Reads and native browser protocols are not structural-render violations. [Q-IMPL]

Keep narrow file/function-scoped, reasoned exceptions for migration and necessary native operations. Exceptions cannot become fallback renderers or blanket component exemptions. Fix guidance points to this plan and the appropriate query method.

**Artifact-content gates are release blockers, not documentation promises:**

| Gate | Required invariant |
| --- | --- |
| Core allow-list | Runtime sources are only the pinned morph package, query package, and approved component-shared layer with its minimal bootstrap/linkage. No individual component implementation/registration and no docs-only module/data, including transitive imports and generated code. |
| Shared admission | Each export has actual cross-component consumers or a documented common-runtime role. Single-component helpers remain private; documentation use alone never qualifies. Mixed component/docs modules are split. |
| Individual isolation | Each component contains its own/private code and linkage only; no morph/query/shared implementation copies, no unrelated components, and no automatic core fetch. |
| All composition | Exactly the same logical core and the complete shipping component manifest, once each. No docs entry, duplicate engine/helper state, missing component, or second bundled compilation path. |
| No hidden payload | Emitted core, all, and individual scripts contain no runtime imports, remote loaders, or hidden JavaScript chunks. Docs-only assets are absent from their dependency graphs and load-time network requests. |
| Runtime ownership | Only guarded core bootstrap installs `df$`; component implementations do not replace it or extend `df$.fn`. Missing/mismatched core fails before component mutation. Duplicate/conflicting loads fail before embedded runtime execution and preserve existing state. |
| Publication parity | Required readable/minified twins and maps exist; mirrors are current; package side-effect/dependency metadata and notices agree; quick-starts show core + selected components OR all alone. |

Use resolved input/module graphs and artifact inventories, not only symbol greps: minification can hide names and a docs helper may live outside a docs directory. Assert the same exclusion on all as on core; otherwise a broad component-entry glob can reintroduce docs code. The emitted-page bootstrap test must exercise these artifacts without a separately installed query/morph instance masking omissions.

### 5.2 Input and lifecycle safety

Treat `.morph(string)`, `.html(string)`, string insertion, and `df$("<markup>")` as HTML sinks, not sanitizers. Use `.text()` or literal VNode text children for untrusted labels. Retain explicit attribute/URL validation and approved escaping for string builders. A VNode does not make a dangerous URL or event attribute safe. Query's factory interprets a string beginning with `<` as markup; never pass arbitrary user text as its selector input. [Q-IMPL]

Keep `triggerStateChange` synchronous-first; do not replace native activation with `.trigger()`. Transitions apply to content updates, not as a replacement for native dialog/Popover open-close protocols. Explicitly await dependent animated renders and test latest-wins behavior. [Q-IMPL] [M-README]

Removal must still dispose component-owned timers, observers, subscriptions, and state. Query/morph delegated-listener cleanup is not general application teardown. Exact moves use one target when identity matters: multi-target insertion clones content for all but the last target, so copies do not retain original node identity or native listeners. [Q-IMPL] [Q-ARCH]

### 5.3 Required browser/type assertions

Run the behavioral suite through both **core + selected components** and **all alone**, with readable and minified variants. Use pristine pages without docs/vendor bootstraps to establish actual artifact independence.

| Area | Required evidence |
| --- | --- |
| Core alone | Callable `df$`, morph API, and shared exports are available. No component-specific API/state/observer/listener/DOM initialization and no `df$.shadcn.docs` or docs asset request. Distinguish any upstream/runtime internals from forbidden component-specific work. |
| Modular selection | Core + each independently advertised component works; subset combinations work; unselected component code/APIs/state/initialization remain absent. Shared function and registry identities are the core instances. Test late loading and any explicitly declared compositional dependency. |
| All parity | All alone exposes every shipping component and passes the same behavior tests, with one runtime/shared layer. No extra core/vendor request; observable behavior matches core + the same complete component set. |
| Bootstrap failures | Component without core or with mismatched shared version fails before mutation. A preloaded standalone vendor runtime followed by core/all, re-executed core, core + all, and conflicting global are rejected without replacing existing `df$`/shared/state or duplicating handlers. Test actual classic and module-side-effect loading. |
| Query/state | Root scoping; new members are re-queried; explicit ARIA false versus attribute removal; `.prop("checked", false)` / `.val("")`; native form/public State-API behavior preserved. |
| Reconciliation | Same node/listener for retained compatible keys; full-render deletion/reorder; diff upserts preserve unmentioned siblings; no mistaken diff filtering/dismissal. |
| Focus/accessibility | Surviving focused node/input selection where applicable; defined recovery for removed calendar dates; combobox keyboard/active-descendant behavior; carousel and toast announcements. |
| Events/lifecycle | No duplicate handlers after repeated initialization; correct `this`/currentTarget expectations; native-option exceptions; owned teardown without removing unrelated listeners; moves distinct from removal. |
| Async/types | Sync return path versus transition Promise; latest-wins regression; upstream global/namespace/shared-API augmentation; invalid chaining/options rejected; strict consumers for both modes pass. |
| Build/docs | Input inventories establish exact core/individual/all membership and exclude docs transitively. Published package entries retain side effects. Mirrors/load order and documentation functionality pass with docs code loaded separately. |

Use the existing component `bun run e2e` workflow for application tests. Keep upstream package qualification separate: query exposes `bun run check`; morph's manifest lists its lint/typecheck/test/build/bundle/minify/stats/verify release sequence. Neither upstream coverage claims nor source review replace application integration and distribution tests. [Q-PKG] [M-PKG]

## 6. Costs - bundled once, measured honestly

- **Core payload:** measure the actual artifact containing morph + query + component-shared code, including bootstrap/linkage. Query's prior README reports **4.2 kB gzip** for its standalone browser bundle, excluding morph; neither that value nor the original morph-only 6.8 KiB figure is a combined-core measurement. Report raw/gzip/Brotli for each emitted core/all/individual artifact. [Q-README]
- **Modular versus all:** publish the transfer total for core + selected components and the size of all. Sum independently compressed files for the modular path; measure all as one compressed artifact. Do not infer all's compressed size by adding separate bundle sizes. Shared infrastructure is paid once per supported page configuration, not once per selected component. Byte savings and runtime improvements are measured outcomes, not promises.
- **Docs cost:** no docs-only bytes in either library bundle or individual components. Report docs-site assets separately; never omit embedded dependencies from a library size claim or count them as somebody else's host payload.
- **Dependency ownership:** shipping core/all means maintaining pinned bundled versions, notices, build provenance, and compatibility tests. Consumers receive them with the release and need no separate runtime scripts. A host cannot swap an external morph/query version underneath this distribution and assume it is qualified.
- **Consumer wording:** **"Load core plus the components you use, or load all. Both modes include defuss-query and defuss-morph through core; documentation code is separate. No framework or jQuery dependency."** Individual component files require matching core and keep their existing stylesheet prerequisites. Do not describe all as runtime-external or the project as having zero runtime dependencies.
- **Compatibility and behavior:** query delegation, snapshot membership, deliberate replacements, and async transitions remain constraints, not automatically risk-free improvements. Qualify the exact pre-1.0 runtime pair and the component/shared version contract. Treat behavior and artifact-boundary regressions as release blockers.

## 7. Definition of done

- Readable/minified **core**, **every individual component**, and **all** are emitted and published. Core contains only defuss-morph + defuss-query + defuss-shadcn-shared; all contains that core plus the complete shipping component set, once each.
- Documentation-only runtime/data/styles are absent from the transitive core, all, and individual-component graphs. Mixed helpers are split; the approved shared layer has actual component consumers. The docs site loads its own code separately.
- Consumers can use **core + selected components** or **all alone**, without separate vendor scripts, hidden JavaScript chunks, or shared-helper downloads. Existing CSS requirements are preserved and documented. Initialization is morph → query → shared → components, including late-loaded components.
- Individual components reference the once-installed shared implementation without embedding morph/query/shared copies or initializing unselected components. Missing/mismatched core and duplicate/conflicting runtime loads fail safely. No component-owned `df$` installation, `df$.fn` extension, or alternate renderer remains.
- `df$.shadcn` remains the component/docs namespace; `shared` is concretely typed; docs data is initialized only by docs code. Existing State APIs are preserved and strict consumers for both delivery modes pass.
- The query baseline covers suitable lookup/scalar/text operations with reviewed native exceptions. Calendar, combobox, carousel, and toast use §3's paths for actual structural work; no gratuitous native-flag subtree renders, diff-based deletion/filtering, or competing render owners remain.
- Browser tests establish modular/all parity, source-set/initialization isolation, identity, focus recovery, form state, event ownership, removal/cleanup, repeated initialization, and transitions. Readable/minified and classic/module-side-effect fixtures pass.
- DOM-boundary, shared-admission, core allow-list, component-isolation, all-composition, docs-exclusion, legacy-namespace, and emitted-page bootstrap gates are live with narrow justified exceptions.
- README/index, guide/navigation, incoming plan links, skills, artifact manifest, package metadata, dependency notices/pins, measured payload statistics, and docs mirrors agree. Bundled dependencies and docs costs are reported honestly.

## Source references

This revision edits the supplied revision-1 plan to implement the user's requested **core / all / modular-component artifact contract**. The new artifact paths, shared distribution surface, bootstrap/build policy, and acceptance gates are proposed requirements, not claims about current repository outputs. Existing query/morph behavior and commit-pinned references are retained from the prior source review; no new repository audit or npm/CDN availability check was performed for revision 2.

Component paths, historical audit counts, and the target build/docs layout come from the supplied plan; the component repository was not independently re-audited. Code snippets are proposed integration code. The application source, packaging pipeline, dependency-resolved typechecks, and browser tests were not implemented or run as part of this plan-only revision.

[BASE]: https://github.com/kyr0/defuss/commit/50aae32aa9aea45612510703e75875ed98aa6386
[Q-README]: https://github.com/kyr0/defuss/blob/50aae32aa9aea45612510703e75875ed98aa6386/packages/query/README.md
[Q-ARCH]: https://github.com/kyr0/defuss/blob/50aae32aa9aea45612510703e75875ed98aa6386/packages/query/ARCH.md
[Q-IMPL]: https://github.com/kyr0/defuss/blob/50aae32aa9aea45612510703e75875ed98aa6386/packages/query/src/query.ts
[Q-TYPES]: https://github.com/kyr0/defuss/blob/50aae32aa9aea45612510703e75875ed98aa6386/packages/query/src/types.ts
[Q-GLOBAL]: https://github.com/kyr0/defuss/blob/50aae32aa9aea45612510703e75875ed98aa6386/packages/query/src/global.ts
[Q-INDEX]: https://github.com/kyr0/defuss/blob/50aae32aa9aea45612510703e75875ed98aa6386/packages/query/src/index.ts
[Q-PKG]: https://github.com/kyr0/defuss/blob/50aae32aa9aea45612510703e75875ed98aa6386/packages/query/package.json
[M-README]: https://github.com/kyr0/defuss/blob/50aae32aa9aea45612510703e75875ed98aa6386/packages/morph/README.md
[M-GLOBAL]: https://github.com/kyr0/defuss/blob/50aae32aa9aea45612510703e75875ed98aa6386/packages/morph/src/global.ts
[M-PKG]: https://github.com/kyr0/defuss/blob/50aae32aa9aea45612510703e75875ed98aa6386/packages/morph/package.json
