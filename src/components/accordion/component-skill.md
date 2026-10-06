---
name: Accordion
type: ATM
why: Native <details>/<summary> disclosure - the browser owns open/close, and <details name="group"> gives exclusive (single-open) behavior with zero JS.
when: Grouped content sections on one page (FAQs, settings, progressive disclosure) that expand independently or mutually exclusively.
where: dist/components/accordion/accordion.css + dist/components/accordion/accordion.js
supportedStates: default, all-open, all-closed
---

# Pattern: Accordion

## States
Named states via the shared State API (AGENTS.md "State API"), bound per instance:
`default` (authored markup, snapshotted at init), `all-open`, `all-closed`.

```js
const accordion = df$('.accordion[data-type="single"]').get(0);
accordion.api.setState('all-open');
accordion.api.getState(); // { name: 'all-open', config: {}, model: { … } }
accordion.api.render();   // the authored accordion with every item open
```

`render(state)` reproduces the markup from state: the authored markup (its
model, snapshotted at init, byte for byte) with the state's `open` items applied - AGENTS.md "State
API" → render.

Unknown state names throw. `globalThis.df$.shadcn.accordionStates` lists them.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type AccordionState = 'default' | 'all-open' | 'all-closed'</code> - `setState(name, config)` takes the config of the state it names (`AccordionStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The items open as authored (each &lt;details open&gt;). No config. |
| `all-open` | Every item open. No config. |
| `all-closed` | Every item closed. No config. |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends AccordionState&gt;(name: S, config?: AccordionStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>AccordionStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: AccordionState; config: AccordionStateConfigs[AccordionState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: AccordionState; config: AccordionStateConfigs[AccordionState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: AccordionState; config: AccordionStateConfigs[AccordionState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: AccordionState; config: AccordionStateConfigs[AccordionState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: AccordionState; config: AccordionStateConfigs[AccordionState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.accordionApi.setState&lt;S extends AccordionState&gt;(el: HTMLElement, name: S, config?: AccordionStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>AccordionStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.accordionApi.getState(el: HTMLElement): { name: AccordionState; config: AccordionStateConfigs[AccordionState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: AccordionState; config: AccordionStateConfigs[AccordionState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.accordionApi.render(state: { name: AccordionState; config: AccordionStateConfigs[AccordionState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: AccordionState; config: AccordionStateConfigs[AccordionState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.accordionApi.store(el: HTMLElement): Store&lt;{ name: AccordionState; config: AccordionStateConfigs[AccordionState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: AccordionState; config: AccordionStateConfigs[AccordionState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.accordionApi.commit&lt;S extends AccordionState&gt;(el: HTMLElement, name: S, config?: AccordionStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>AccordionStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.accordionStates: AccordionState[]</code> | The declared states, 'default' first: <code>default</code>, <code>all-open</code>, <code>all-closed</code>. |

## Native basis
`<details>` / `<summary>` elements. The browser provides:
- Click to toggle (automatically)
- Enter/Space to toggle when focused (automatically)
- `open` attribute for state (automatically)

For single-open behavior (closing others when one opens), minimal JavaScript
is required. For multi-open, pure HTML with no JS works.

---

## Native Web APIs
- [`<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) - native disclosure widget with built-in open/close state
- [`<summary>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/summary) - clickable heading that toggles the parent `<details>`
- [`::details-content`](https://developer.mozilla.org/en-US/docs/Web/CSS/::details-content) - pseudo-element for styling and animating the collapsible content
- [`toggle` event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDetailsElement/toggle_event) - fires when the `open` state changes
- [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) - defines entry animation starting values for open transition

---

## Structure

### Multi-open (zero JS)

```html
<div class="accordion">
  <details class="accordion-item" open>
    <summary class="accordion-trigger">
      <span>Is it accessible?</span>
      <svg class="accordion-chevron" aria-hidden="true" width="16" height="16"
           viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m6 9 6 6 6-6"/>
      </svg>
    </summary>
    <div class="accordion-content">
      <p>Yes. It uses native HTML details/summary which are fully accessible
         by default. Keyboard and screen reader support are built in.</p>
    </div>
  </details>

  <details class="accordion-item">
    <summary class="accordion-trigger">
      <span>Is it styled?</span>
      <svg class="accordion-chevron" aria-hidden="true" width="16" height="16"
           viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m6 9 6 6 6-6"/>
      </svg>
    </summary>
    <div class="accordion-content">
      <p>Yes. It follows the shadcn/ui token system for consistent theming.</p>
    </div>
  </details>

  <details class="accordion-item">
    <summary class="accordion-trigger">
      <span>Is it animated?</span>
      <svg class="accordion-chevron" aria-hidden="true" width="16" height="16"
           viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m6 9 6 6 6-6"/>
      </svg>
    </summary>
    <div class="accordion-content">
      <p>Yes. The chevron rotates and content can use CSS transitions.</p>
    </div>
  </details>
</div>
```

### Single-open (one item at a time)

```html
<div class="accordion" data-type="single">
  <!-- same structure - JS closes siblings on open -->
</div>
```

### Collapsible single (allow all closed)

```html
<div class="accordion" data-type="single" data-collapsible>
  <!-- same structure - can close active item -->
</div>
```

---

## Surfaces, colors, sizes, icons, markers

```html
<div class="accordion" data-variant="separated" data-marker="plus" data-size="lg">
  <details class="accordion-item" open>
    <summary class="accordion-trigger"><span class="accordion-icon" aria-hidden="true">🎨</span><span>Appearance</span></summary>
    <div class="accordion-content"><p>…</p></div>
  </details>
</div>
```

| On the `.accordion` | Values | Effect |
| --- | --- | --- |
| `data-variant` | `bordered` | One box, items divided |
|  | `separated` | Every item its own card (gap between) |
|  | `muted` / `primary` / `neutral` | Separated items on that surface |
|  | `highlight` | Separated; the open item turns primary |
|  | `ghost` | No dividers |
| `data-size` | `sm` / `md` / `lg` / `xl` | Heading scale (lg semibold, xl bold) |
| `data-marker` | `arrow` / `plus` | A CSS-drawn open/close sign for every item (no icon markup) |
| `data-marker-position` | `start` | The sign before the heading |

- Boxed variants inset the text and tint the row on hover instead of the underline.
- Custom colors: `background` + `color` on an item - the hover tint (7%),
  marker (65%) and content text (72%) mix from its text color.
- `.accordion-icon` - an svg or emoji in front of a heading (fixed box).
- Own glyphs: `.accordion-chevron` turns 180° (`data-turn="quarter"`: 90°,
  mirrored in RTL), or swap `.accordion-when-closed` / `.accordion-when-open`.
- Everything is logical - it mirrors in `dir="rtl"`.

## Density

Set `data-density` on the `.accordion` root; trigger and panel padding scale.

| Value | Effect |
| --- | --- |
| `compact` | Trigger/panel padding 0.75rem |
| `comfortable` | Padding 1rem - identical to the unsized default |
| `spacious` | Padding 1.25rem |

## ARIA

The `<details>/<summary>` elements provide built-in accessibility:

| Feature                    | How it works                                   |
|----------------------------|------------------------------------------------|
| Expand/collapse            | Native - `summary` is a button internally      |
| `aria-expanded`            | Implicit from `open` attribute                 |
| Focus management           | `summary` is focusable by default              |
| Keyboard (Enter/Space)     | Native - toggles the `<details>` element       |
| Screen reader announcement | Native - announces expanded/collapsed state    |

No additional ARIA attributes are needed when using `<details>/<summary>`.

---

## Keyboard interactions

| Key           | Behavior                                           |
|---------------|----------------------------------------------------|
| `Tab`         | Move focus between summary elements                |
| `Enter`       | Toggle the focused item                            |
| `Space`       | Toggle the focused item                            |

These are all browser-native - no JS needed.

---

## Variants

### Bordered

```html
<div class="accordion" style="border:1px solid var(--border);border-radius:var(--radius-lg);padding:0 1rem;">
  <!-- items -->
</div>
```

### Card-wrapped

```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">FAQ</h3>
    <p class="card-description">Frequently asked questions.</p>
  </div>
  <div class="card-content">
    <div class="accordion">
      <!-- items -->
    </div>
  </div>
</div>
```

---

## Notes

- `<details>/<summary>` is the most accessible accordion implementation - it works with zero JS and zero ARIA
- For single-open behavior, the `toggle` event on `<details>` fires after the state changes
- The `open` attribute is the source of truth for whether an item is expanded
- Avoid nesting accordions - use a flat list with clear headings instead
- The chevron rotation relies on `details[open] >` selector - this is pure CSS
- Content height animation uses `::details-content` pseudo-element with `block-size` transition and `@starting-style` for the enter animation - fully CSS-only, no JS measurement needed
- Set `data-type="single"` for accordion behavior (only one open); omit for disclosure list (any number open)
- Set `data-collapsible` alongside `data-type="single"` to allow all items to be closed
- A non-collapsible single accordion never closes its last open item: the attempt is denied in the cancellable `beforetoggle` event (`preventDefault()`), so the click is a silent no-op. Reopening in `toggle` instead would visibly flicker close-then-open
