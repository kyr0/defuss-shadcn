# defuss-morph Integration Plan

> Status: proposal (not implemented). Companion analysis: the DOM-mutation audit of all
> 28 JS components (2026-09-13) — 21 mutate only a native flag, 7 mutate structure.
> Target: `defuss-morph` ([kyr0/defuss/packages/morph](https://github.com/kyr0/defuss/tree/main/packages/morph),
> npm `defuss-morph`, MIT, dependency-free, `all.min.js` = 6.8 KiB gz).
>
> **Decision 1: defuss-morph is a real dependency, not an optional enhancement.**
> No feature detection, no dual code paths — a component that renders structure renders
> it through `morph()`, one path, exactly like it relies on `<dialog>` or the Popover
> API today.
>
> **Decision 2: `df$` is a given.** By the time this plan lands, every host page already
> declares `df$` — a **callable function** (jQuery-style `df$(sel)` lookup, with
> properties on the function object; Function inherits from Object) carrying the
> defuss morph API (`morph`, `updateDomWithVdom`, …), provided by the defuss /
> defuss-morph bundle loaded before any component script. We never create, vendor, or
> extend `df$` itself; our surface is the **`df$.shadcn`** sub-namespace (the static
> `_defussShadcn` → `df$.shadcn` migration, §2.1). Partial updates are the
> `diff: true` **flag** on `morph()` — there is no second API name for them.

## 1. Why it earns dependency status

`morph(el, htmlString | VNode, opts)` replaces `el`'s children via `DOMParser` + a
key/id-aware DOM diff instead of `innerHTML` replacement:

- **Identity-preserving re-render** — matched nodes are *moved, never replaced*;
  `addEventListener` listeners, focus, selection, scroll and live form values survive.
  Our `MutationObserver` re-init pattern stops racing our own re-renders.
- **`key`/`id` addressing** — reorder-safe children; `{ diff: true }` change-sets
  (merge-patch, never removes/moves) are the natural streaming/filtering UI primitive.
- **Transitions** (`fade`/`slide-*/custom`, latest-wins queue) for free.
- Keyed diffing is exactly the semantics our data-driven components hand-roll today
  (and get subtly wrong when focus/identity is destroyed) — `calendar`, `combobox`,
  `carousel`, `toast`. We already accept "the browser provides X" as the bar for
  building on a capability; this is the same bet one tier up the stack: the host page
  provides `df$` the way the browser provides `showModal()`.

Known constraint (documented, not worked around): HTML strings can't express
"explicitly unchecked / cleared value" — controlled form-state changes go through a
VNode patch (`df$.updateDomWithVdom` / diff mode), never string concat.

## 2. The runtime contract

### 2.1 `df$` is host-provided; `df$.shadcn` is ours

- **Prerequisite (same class as `<dialog>` support):** the page loads defuss (or the
  standalone `defuss-morph/dist/all.min.js` UMD) *before* component scripts. That
  bundle declares the callable `df$` and its morph API. We treat "df$ missing" as a
  host misconfiguration, not a state to code around — one loud thrown error in the
  shared accessor below, never a silent fallback path.
- **Our namespace:** `defussGlobals()` (`src/shared/state-api.ts`) becomes exactly

  ```ts
  // src/shared/state-api.ts — df$ is guaranteed by the host bundle (see above);
  // we only ever ensure our OWN sub-namespace, never create or touch df$ itself.
  function defussGlobals() {
    return (globalThis.df$.shadcn ??= {});
  }
  ```

  Component registries therefore live on `df$.shadcn.{name}Api` / `{name}States`,
  docs-site data on `df$.shadcn.docs`. The migration retires the old name everywhere:
  `src/types/defuss-shadcn.d.ts` gains the `df$` global type (callable + `shadcn` +
  morph API surface), verify's State-API regexes (`_defussShadcn|defussGlobals\(\)`),
  runtime globals (`themes.ts`/`theme-switcher.ts`/plugins search index), AGENTS.md's
  "No window globals" example (still true: `df$` is one global, host-owned namespace,
  us under `.shadcn`) — mechanical, `git grep _defussShadcn` empty is the checklist.
  This is **step 0** of the workstream list.

### 2.2 How a component reaches `morph`

No imports, no vendoring, no bundling into `all.js` — the callable global *is* the
import. One typed accessor module keeps the contract explicit and the error message in
one place:

```ts
// src/shared/morph.ts — inlined by build.ts like state-api.ts (it's ~10 lines)
/** Why: single typed door to the host-provided morph API; throws the ONE
 *  "load defuss before the components" error instead of N TypeError sites. */
export function morph(el: Element, content: string, opts?: MorphOpts): void {
  if (!globalThis.df$?.morph) {
    throw new Error('defuss-shadcn: df$.morph missing — load defuss (or defuss-morph/dist/all.min.js) before the component scripts');
  }
  globalThis.df$.morph(el, content, opts);
}
```

- Per-component `.js`: inlined helper, calls `globalThis.df$.morph` per render —
  property lookup on a hot path is free, and evaluation order stops mattering beyond
  the documented host-first prerequisite.
- `all.js`: nothing special in `bundle.ts` — the helper rides along; consumers get the
  same prerequisite (documented in README "Quick start" as one extra `<script>` tag
  before the component script — the same line defuss users already have).
- Docs site: `DocPage` adds the defuss-morph bundle `<script>` before `all.js` (one
  tag, mirror URL like any other CDN asset; `scripts/lib/mirror.ts` already rewrites
  such references).

### 2.3 Installation story (consumer-facing)

```html
<link rel="stylesheet" href="…/dist/theme/utils/default-semantic-tokens.css">
<script type="module" src="…/dist/vendor-free defuss bundle…/all.min.js"></script><!-- provides df$ -->
<script type="module" src="…/dist/components/all.js"></script>
```

The version pin belongs to the host (npm dep or `@x.y.z` CDN specifier) — we ship no
copy, so there is no lockstep gate to build. What `verify` *can* statically check:
every doc page loads a `df$`-providing bundle before `all.js` (extension of the
existing `cross-page imports` gate family), and no component file references the dead
`_defussShadcn` name after step 0.

## 3. Component adoption map (single path — this is where bytes are spent)

The rule that keeps the dependency cheap: **morph only where structure is rendered
from data**, nowhere else. The 21 native-flag components stay pure — they gain zero
from a diff engine and never call `morph()`.

### Tier 1 (this milestone)

| Component | Replaces | morph form |
| --- | --- | --- |
| [calendar](../src/components/calendar/calendar.ts) | `grid.innerHTML = html` on every month/selection change | `morph(grid, html)`; day cells `key="d2026-09-13"` — keyboard focus + `:focus-visible` survive month nav |
| [combobox](../src/components/combobox/combobox.ts) | manual `aria-selected`/`hidden` sync loops + value `textContent` writes | keyed option-list `morph` on filter/selection; trigger/input live OUTSIDE the morphed subtree stays focused |
| [carousel](../src/components/carousel/carousel.ts) | init-built indicator dots + `aria-current` setAttribute loops | `morph(dotsEl, html)` per slide change, `key="i{n}"` |
| [toast](../src/components/toast/toast.ts) | content markup strings injected once per toast; updates = node replacement | `morph(toastEl, html)` on update/dismiss-reason change; stack container via `morph(stack, changeSet, { diff: true })` (keyed by toast id) — live-update toasts become expressible |

### Tier 2 (lands with the feature that needs it)

- [command](../src/components/command/command.ts) — filtered results as
  `morph(results, changeSet, { diff: true })` change-sets (docs palette is the first
  streaming client).
- [sortable](../src/components/sortable/sortable.ts) — `setState('default')` order
  restore as keyed morph (listeners/focus preserved instead of `appendChild` shuffles).
- [theme-switcher](../src/components/theme-switcher/theme-switcher.ts) — swatch dots
  rendered in the item HTML instead of the DOM-building loop.
- [image](../src/components/image/image.ts) lightbox internals when its markup grows.

### Non-candidates (permanent)

`dialog`, `sheet`, `alert-dialog`, `dropdown`, `popover`, `tooltip`,
`navigation-menu`, `accordion`, `tree-view`, `toggle`, `toggle-group`, `slider`,
`sidebar`, `tabs`, `toolbar`, `number-input`, `color-picker`, `product-showcase`,
`avatar`, `context-menu`, `alert` — state = one native flag/attribute; CSS renders the
rest. A keyed diff over `<details open>` is ceremony, not engineering. **Future rule:
a component calls `morph()` the first time it renders a collection from data.**

## 4. Workstreams

0. **Namespace migration (prerequisite)**: static `_defussShadcn` → `df$.shadcn`
   across sources, types (`declare global { var df$: … }` with the callable + `shadcn`
   + morph surface), verify regexes, runtime globals and docs. Exit:
   `git grep _defussShadcn` empty; `defussGlobals()` is the §2.1 one-liner; verify OK.
1. **Spike** (¼ day): DocPage script-tag placement + mirror URL proof on one page;
   `tests/e2e/morph.e2e.ts` skeleton — a fixture that loads the df$ bundle then a
   component, asserts `typeof df$ === 'function'`, `df$.morph` exists, and a keyed
   re-render keeps the *same* node instance. Exit: skeleton green (fails loudly if
   the prerequisite isn't met, which is the point).
2. **Plumbing** (½ day): `src/shared/morph.ts` accessor + build inlining (extend the
   existing `SHARED_IMPORT` handling in `build.ts` — two shared modules now, keep the
   inliner generic); verify gate `df$ before all.js` on doc pages; e2e fixtures get
   the host-bundle tag.
3. **Tier-1 migrations** (1 day): calendar → combobox → carousel → toast, one commit
   each: builder function stays, `innerHTML`/attr-sync loops deleted, `key` attributes
   on rendered nodes, e2e extended to assert **identity preservation** (same node
   instance across a state change; `document.activeElement` survives month nav /
   filtering). No fallback code, no branch — the diff-heavy code is simply deleted.
4. **Claims & docs parity** (½ day): README + `index.mdx` (same commit — 15-min parity
   gate): the runtime-prerequisite line *zero dependencies to install; requires the
   defuss runtime on the page (provides `df$`), same as it requires modern CSS* —
   plus the extra `<script>` tag in every quick-start. New guide page "DOM Morphing"
   (demo: calendar month nav keeping focus) + `lib/nav.ts` entry; adopting skills gain
   a morph note in their structural contract; stats claim regenerates from the new
   tree (component bytes shrink where loops were deleted).
5. **Guardrails**: morph input only from string builders/VNodes (never user-data
   concat — same XSS bar as today); controlled form-state via VNode patches only;
   `triggerStateChange` stays synchronous-first (transitions are for content updates,
   not for open/close which Popover/dialog already own); clean up
   `tmp/mutation-audit.ts` into `scripts/lib/` if we keep running it per release.

## 5. New static rule worth adding

With morph as the sanctioned structural renderer, hand-rolled structural mutation in
`src/components/*/*.ts` becomes the thing we *don't* want — a verify gate
(`components structural mutation`) banning `innerHTML`/`insertAdjacent*`/
`createElement`+`appendChild` pairs outside an allow-list (the morph-owning components
during their staggered migration, and init-only one-time mounts like `image`'s
lightbox, shrinking to just the latter as tier-1/2 land). The existing min-twin/1:1
gate family shows the pattern; `scripts/lib/` pure core + small gate entry + `fix:`
line ("render structure through morph(), see plans/defuss-morph-integration.md").
This is what stops hand-rolled DOM from creeping back, permanently.

## 6. Costs (now honest)

- **Host pages carry the defuss bundle** (+6.8 KiB gz for the morph-only UMD; defuss
  users already have it). This is a documented *prerequisite*, not shipped weight in
  `dist/` — our byte counts only shrink (loops deleted, `innerHTML` builders move into
  morph'd strings of about the same size).
- **`all.js`/per-component files stay self-contained code-wise** — the helper inlines
  ~10 lines; the requirement is one `<script>` tag, same ergonomics as the tokens
  `<link>`.
- **Supply chain**: zero new files in `dist/`, zero vendoring gates; the version of
  morph a page runs is the host's choice, pinned by the host's lockfile/CDN specifier.
  The contract we depend on (`df$` callable, `morph` with keyed diff + `diff` flag) is
  defuss's documented, stable surface.
- **Behavior deltas** are the *win*, not a risk: focus/form state now survive
  re-renders in tier-1 components — e2e assertions flip from "re-attached listeners
  work" to "never lost."

## 7. Definition of done

- step 0 merged (`git grep _defussShadcn` empty, `df$.shadcn` everywhere, verify OK);
- doc pages pass the `df$ before all.js` gate; every consumer quick-start shows the
  prerequisite tag;
- four tier-1 components with `morph()` as their **only** render path;
- identity assertions (`sameNode`, `activeElement`) green in `bun run e2e`;
- README/index prerequisite claim updated in one parity commit;
- structural-mutation gate live with the shrinking allow-list;
- guide page + skill notes + regenerated stats claim all mirrored to `docs/`.
