---
name: Toast
type: MOL
section: feedback-status
why: Transient notification via the Popover API plus the df$.shadcn.toast factory - auto-dismisses.
when: Post-action feedback that must not interrupt the user.
where: dist/components/toast/toast.css + dist/components/toast/toast.js
supportedStates: default
---

# Pattern: Toast

## Native basis
`popover` API for top-layer rendering and non-modal behavior.
Requires JavaScript for triggering, auto-dismiss, stacking, and ARIA live
region announcements. Follows `role="status"` with `aria-live="polite"`.

---

## Native Web APIs
- [Popover API (`popover="manual"`)](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) - top-layer rendering without light-dismiss for persistent notifications
- [`aria-live` regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-live) - announces toast content changes to screen readers

---

## Structure

```html
<!-- Toast container - place once in the page -->
<div id="toast-container"
     class="toast-container"
     aria-label="Notifications"
     data-position="bottom-right">
</div>

<!-- Individual toast (injected by JS) -->
<div class="toast" role="status" aria-live="polite" aria-atomic="true"
     popover="manual">
  <div class="toast-content">
    <div class="toast-text">
      <p class="toast-title">Event created</p>
      <p class="toast-description">Monday, January 3rd at 6:00pm</p>
    </div>
    <button class="toast-close" aria-label="Dismiss" data-toast-close>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6 6 18M6 6l12 12"/>
      </svg>
    </button>
  </div>
  <div class="toast-actions">
    <button class="btn" data-variant="outline" data-size="sm"
            data-toast-action>Undo</button>
  </div>
</div>
```

### Variant: with icon

```html
<div class="toast" data-variant="success" role="status"
     aria-live="polite" popover="manual">
  <div class="toast-content">
    <svg class="toast-icon" aria-hidden="true" width="16" height="16">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
    <div class="toast-text">
      <p class="toast-title">Saved successfully</p>
    </div>
    <button class="toast-close" aria-label="Dismiss" data-toast-close>
      <svg aria-hidden="true" width="18" height="18">...</svg>
    </button>
  </div>
</div>
```

---


## Sizes

Set `data-size` on the .toast element. Width envelope only - typography and padding are density's job.

| `data-size` | Effect |
|-------------|--------|
| `sm` | min-width 16rem, max-width 20rem |
| `md` | min-width 20rem, max-width 26rem - identical to the unsized default |
| `lg` | min-width 24rem, max-width 32rem |

## Density

Set `data-density` on the `.toast` element. A whitespace policy, not a zoom: only gaps and padding scale (ratio 0.75 / 1 / 1.25); typography and fixed dimensions stay identical. `comfortable` matches the unsized default.

| Value | Effect |
| --- | --- |
| `compact` | padding 0.75rem, content gap 0.5rem |
| `comfortable` | padding 1rem, gap 0.75rem - identical to the unsized default |
| `spacious` | padding 1.25rem, gap 1rem |

## ARIA

| Attribute           | Where            | Value                       |
|---------------------|------------------|-----------------------------|
| `role="status"`     | each toast       | Implicit live region        |
| `aria-live="polite"`| each toast       | Screen reader announces it  |
| `aria-atomic="true"`| each toast       | Announce entire toast, not just changes |
| `aria-label`        | toast container  | e.g. "Notifications"       |

---

## Positions

Set `data-position` on the `.toast-container`:
- `bottom-right` (default)
- `bottom-left`
- `bottom-center`
- `top-right`
- `top-left`
- `top-center`

---

## Auto-dismiss timing

| Behavior    | Duration value     |
|-------------|-------------------|
| Default     | `4000` (4 seconds)|
| Long        | `8000`            |
| Persistent  | `Infinity`        |

---

## Variants

Set `data-variant` on the `.toast` element.

| Variant | Behavior |
| --- | --- |
| (default) | Neutral popover surface |
| `destructive` | Filled `--destructive` surface with `--destructive-foreground` text |
| `success` | Border + `.toast-icon` tinted green (literal oklch, no token) |
| `warning` | Border + `.toast-icon` tinted amber (literal oklch, no token) |
| `info` | Border + `.toast-icon` tinted blue (literal oklch, no token) |

```html
<div class="toast" role="status" data-variant="success">…</div>
```

## Stacked toasts (pile)

```js
df$.shadcn.toast.configure({ stack: 'pile', position: 'bottom-right' });
```

`configure()` sets the region: `stack: 'list'` (default - every toast visible,
one above the other) or `'pile'` - the newest toast in front, the older ones
hidden behind it and drawn as the **Stacks** sheets (shapes.css `stack-top`,
or `stack-bottom` at top positions) with a `+n` badge. Hovering or focusing
the pile fans it out into a list (newest nearest the corner); leaving folds it
back. A pile holds up to 6 toasts. `position` picks the corner.

## Animations

```js
df$.shadcn.toast.show({ title: 'Saved', animation: { in: 'slideIn', out: 'slideOut', direction: 'east', duration: 450 } });
```

`animation` plays any pair of the shared animation engine (`df$.anim`):
`fadeIn/Out`, `slideIn/Out` (+ `direction`), `popIn/Out`, `zoomIn/Out`,
`flipIn/Out`, `blurIn/Out`, `wipeIn/Out`, `spinIn/Out`, `skewIn/Out`,
`irisIn/Out`. The exit runs on dismiss (× , action, timer). A string
(`animation: 'popIn'`) sets only the entrance.

## Aura

```js
df$.shadcn.toast.show({ title: 'You are live', aura: true });        // or 'rainbow', 'gold', 'holo', 'dual', 'silver'
```

The toast becomes a ring of animated light (shapes.css `.aura`); its content
sits on an inner `.toast-surface`. For the one notification that must not be
missed - not for routine confirmations.

## States

The api is bound to the **region container** (`#toast-container`). Its
observable state is which toasts are visible. Declared states: `default`
(dismisses every visible toast - the same path as `df$.shadcn.toast.dismiss()`).
`getState().config.count` reports the live number of visible toasts.

```js
document.querySelector('#toast-container').api.setState('default');
document.querySelector('#toast-container').api.getState(); // { name: 'default', config: { count: 0 } }
```

The registry global is `df$.shadcn.toastApi` / `df$.shadcn.toastStates`.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type ToastState = 'default'</code> - `setState(name, config)` takes the config of the state it names (`ToastStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The region as authored - setting it dismisses every visible toast. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>count?</code></td><td><code>number</code></td><td>reported by getState(): the toasts in the region now</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends ToastState&gt;(name: S, config?: ToastStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ToastStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: ToastState; config: ToastStateConfigs[ToastState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: ToastState; config: ToastStateConfigs[ToastState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: ToastState; config: ToastStateConfigs[ToastState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: ToastState; config: ToastStateConfigs[ToastState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: ToastState; config: ToastStateConfigs[ToastState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.toastApi.setState&lt;S extends ToastState&gt;(el: HTMLElement, name: S, config?: ToastStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ToastStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.toastApi.getState(el: HTMLElement): { name: ToastState; config: ToastStateConfigs[ToastState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: ToastState; config: ToastStateConfigs[ToastState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.toastApi.render(state: { name: ToastState; config: ToastStateConfigs[ToastState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: ToastState; config: ToastStateConfigs[ToastState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.toastApi.store(el: HTMLElement): Store&lt;{ name: ToastState; config: ToastStateConfigs[ToastState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: ToastState; config: ToastStateConfigs[ToastState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.toastApi.commit&lt;S extends ToastState&gt;(el: HTMLElement, name: S, config?: ToastStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>ToastStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.toastStates: ToastState[]</code> | The declared states, 'default' first: <code>default</code>. |

### `df$.shadcn.toast`

| Member | Description |
|---|---|
| <code>configure(opts: ToastRegionOptions = {}): ToastRegionOptions</code> | Region options: stack 'list' (default, every toast visible) or 'pile' (the newest in front, the others as sheets behind it - hover / focus fans them out); position = the corner (bottom-right, bottom-left, top-right, top-left, top-center, bottom-center). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>opts</code></td><td><code>ToastRegionOptions</code> = <code>{}</code></td><td>the options to change; omitted keys stay as they are</td></tr></table> <b>Returns</b> <code>ToastRegionOptions</code> - the region's options now |
| <code>show(options: string \| ToastOptions): HTMLElement</code> | Show a toast - a title string or { title, description, variant, duration, action ... }. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>options</code></td><td><code>string \| ToastOptions</code></td><td>the title, or the toast options</td></tr></table> <b>Returns</b> <code>HTMLElement</code> - the toast element (a manual popover in the region) |
| <code>success(options: string \| ToastOptions): HTMLElement</code> | show() as a success toast. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>options</code></td><td><code>string \| ToastOptions</code></td><td>the title, or the toast options (the variant is set for you)</td></tr></table> <b>Returns</b> <code>HTMLElement</code> - the toast element |
| <code>warning(options: string \| ToastOptions): HTMLElement</code> | show() as a warning toast. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>options</code></td><td><code>string \| ToastOptions</code></td><td>the title, or the toast options (the variant is set for you)</td></tr></table> <b>Returns</b> <code>HTMLElement</code> - the toast element |
| <code>info(options: string \| ToastOptions): HTMLElement</code> | show() as an info toast. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>options</code></td><td><code>string \| ToastOptions</code></td><td>the title, or the toast options (the variant is set for you)</td></tr></table> <b>Returns</b> <code>HTMLElement</code> - the toast element |
| <code>error(options: string \| ToastOptions): HTMLElement</code> | show() as an error (destructive) toast. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>options</code></td><td><code>string \| ToastOptions</code></td><td>the title, or the toast options (the variant is set for you)</td></tr></table> <b>Returns</b> <code>HTMLElement</code> - the toast element |
| <code>dismiss(): void</code> | Dismiss every toast. |

### Types

| Type | Description |
|---|---|
| `ToastOptions` | What show() takes (a plain string is the title). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>title?</code></td><td><code>string</code></td><td>the bold first line</td></tr><tr><td><code>description?</code></td><td><code>string</code></td><td>the second line</td></tr><tr><td><code>variant?</code></td><td><code>'success' \| 'warning' \| 'info' \| 'destructive'</code></td><td>the look and the icon; 'destructive' is announced assertively (role="alert")</td></tr><tr><td><code>duration?</code></td><td><code>number</code></td><td>ms until it dismisses itself (default 4000); Infinity keeps it until dismissed</td></tr><tr><td><code>action?</code></td><td><code>{ label: string; onClick: () =&gt; void }</code></td><td>one action button: its label and what a click does (the toast closes after)</td></tr><tr><td><code>onDismiss?</code></td><td><code>() =&gt; void</code></td><td>called when the toast is dismissed by its close button or its timer</td></tr><tr><td><code>size?</code></td><td><code>'sm' \| 'md' \| 'lg'</code></td><td>the width envelope</td></tr><tr><td><code>density?</code></td><td><code>'compact' \| 'comfortable' \| 'spacious'</code></td><td>the whitespace policy</td></tr><tr><td><code>animation?</code></td><td><code>string \| { in?: string; out?: string; direction?: string; duration?: number }</code></td><td>a df$.anim entrance (fadeIn, slideIn, popIn, ...), or { in, out, direction, duration } for both ways</td></tr><tr><td><code>aura?</code></td><td><code>boolean \| string</code></td><td>a ring of light around it (shapes.css .aura): true, or the aura style name</td></tr></table> |
| `ToastRegionOptions` | The toast region's options (configure() takes and returns them). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>stack?</code></td><td><code>'list' \| 'pile'</code></td><td>'list': every toast visible; 'pile': the newest in front, the others as sheets behind it</td></tr><tr><td><code>position?</code></td><td><code>'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left' \| 'top-center' \| 'bottom-center'</code></td><td>the corner the toasts appear in</td></tr></table> |

## Notes

- The toast container should be a direct child of `<body>`
- Toasts use `popover="manual"` so they don't auto-dismiss on outside click
- Lifecycle runs through the core `df$` runtime (see the "DOM Querying &
  Morphing" guide): toasts mount via `df$(container).append(el)` and dismiss
  via `df$(el).remove()` after the exit animation - exact operations that
  keep node identity and the container's delegated listeners intact
- Because `popover="manual"` renders each toast in the top layer (outside the
  container's flex flow), CSS pins each toast to its container's corner and the
  component JS sets a `--toast-stack` offset per toast - order stays newest-on-top
- The stacking order is newest on top (CSS `flex-direction: column-reverse` for bottom positions)
- Maximum visible toasts defaults to 3 - older toasts are dismissed
- Swipe-to-dismiss can be added with touch event handling but is not required for MVP
- For forms, show success/error toasts after submission rather than inline messages
- The `toast()` API is imperative - call it from any event handler
