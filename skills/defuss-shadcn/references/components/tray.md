---
name: Tray
type: ATM
section: desktop
why: The notification area of a taskbar - icon buttons that open popovers natively and carry badges, a clock the runtime keeps with Intl in the tray's language, and a show-desktop strip that asks the Window Manager.
when: The end of a taskbar - status icons, quick settings, the clock. For a status line inside an app use a window's status bar.
where: dist/components/tray/tray.css + dist/components/tray/tray.js
supportedStates: default
---

# Pattern: Tray

## Native basis

A group of `<button>`s - an item opens its popover through
`popovertarget` with no script - and a `<time>` the runtime writes every
second (`Intl.DateTimeFormat` in the language of the nearest `[lang]`). The
show-desktop button asks the
[Window Manager](window-manager.md) of the taskbar around
the tray.

## Native Web APIs

- [`Intl.DateTimeFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat) - the clock in the page's language
- [`<time datetime>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - the clock's machine-readable time
- [`popovertarget`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#popovertarget) - an item opens its panel without script
- [`attr()`](https://developer.mozilla.org/en-US/docs/Web/CSS/attr) - the badge text from `data-badge`

---

## Structure

```html
<div class="tray" role="group" aria-label="Notification area">
  <button class="tray-item" type="button" aria-label="Network"><i data-lucide="wifi"></i></button>
  <button class="tray-item" type="button" aria-label="Notifications" data-badge="3"><i data-lucide="bell"></i></button>
  <time class="tray-clock"></time>
  <button class="tray-show-desktop" type="button" aria-label="Show desktop"></button>
</div>
```

- `data-badge` on an item shows a count or a short word on its icon.
- `.tray-clock` is the runtime's text; leave it empty.
- `.tray-show-desktop` works inside a [Taskbar](taskbar.md)
  bound to a manager.

## Variants

| Attribute | Effect |
|-----------|--------|
| `data-seconds` | The clock shows seconds |
| `data-date` | The clock shows the date under the time |

## States

| State | Meaning |
|-------|---------|
| `default` | The tray; `{ seconds, date }` set how the clock reads |

```js
const tray = document.querySelector('.tray');
tray.api.setState('default', { seconds: true, date: true });
df$.shadcn.tray.add(tray, { id: 'mail', icon: 'mail', label: 'Mail', badge: 2 });
```

`render(state)` returns the authored tray with the state's `data-seconds` /
`data-date`; the clock's text is runtime.

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type TrayState = 'default'</code> - `setState(name, config)` takes the config of the state it names (`TrayStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The tray - how its clock reads. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>seconds?</code></td><td><code>boolean</code></td><td>the clock shows seconds (data-seconds)</td></tr><tr><td><code>date?</code></td><td><code>boolean</code></td><td>the clock shows the date under the time (data-date)</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends TrayState&gt;(name: S, config?: TrayStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>TrayStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: TrayState; config: TrayStateConfigs[TrayState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: TrayState; config: TrayStateConfigs[TrayState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: TrayState; config: TrayStateConfigs[TrayState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: TrayState; config: TrayStateConfigs[TrayState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: TrayState; config: TrayStateConfigs[TrayState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.trayApi.setState&lt;S extends TrayState&gt;(el: HTMLElement, name: S, config?: TrayStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>TrayStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.trayApi.getState(el: HTMLElement): { name: TrayState; config: TrayStateConfigs[TrayState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: TrayState; config: TrayStateConfigs[TrayState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.trayApi.render(state: { name: TrayState; config: TrayStateConfigs[TrayState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: TrayState; config: TrayStateConfigs[TrayState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.trayApi.store(el: HTMLElement): Store&lt;{ name: TrayState; config: TrayStateConfigs[TrayState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: TrayState; config: TrayStateConfigs[TrayState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.trayApi.commit&lt;S extends TrayState&gt;(el: HTMLElement, name: S, config?: TrayStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>TrayStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.trayStates: TrayState[]</code> | The declared states, 'default' first: <code>default</code>. |

### `df$.shadcn.tray`

| Member | Description |
|---|---|
| <code>add(target: string \| HTMLElement, options: TrayItemOptions): HTMLButtonElement \| null</code> | Adds an icon to the tray (or updates the one with that id). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .tray element, its id or a selector</td></tr><tr><td><code>options</code></td><td><code>TrayItemOptions</code></td><td>id, icon, label, badge and the popover it opens</td></tr></table> <b>Returns</b> <code>HTMLButtonElement \| null</code> - the item, null when the target matches none |
| <code>remove(target: string \| HTMLElement, id: string): boolean</code> | Removes an icon. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .tray element, its id or a selector</td></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the item's id</td></tr></table> <b>Returns</b> <code>boolean</code> - whether an item went |
| <code>badge(item: HTMLElement, value: string \| number): void</code> | Sets an item's badge. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>item</code></td><td><code>HTMLElement</code></td><td>the .tray-item element (or its tray's item id with the tray: use add())</td></tr><tr><td><code>value</code></td><td><code>string \| number</code></td><td>a number or a short word; '' or 0 removes it</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `TrayItemOptions` | What add() takes. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the item's id</td></tr><tr><td><code>icon</code></td><td><code>string</code></td><td>a Lucide icon name</td></tr><tr><td><code>label</code></td><td><code>string</code></td><td>its accessible name (and tooltip)</td></tr><tr><td><code>badge?</code></td><td><code>string \| number</code></td><td>a number or a short word shown on the icon</td></tr><tr><td><code>popover?</code></td><td><code>string</code></td><td>the id of a popover it opens</td></tr></table> |

## ARIA

| Attribute | Element | Purpose |
|-----------|---------|---------|
| `role="group"` + `aria-label` | `.tray` | Names the area |
| `aria-label` | `.tray-item`, `.tray-show-desktop` | Each icon button's name |

## Notes

- A badge is decoration on the icon - put the count in the item's
  `aria-label` too when it matters ("Notifications, 3 new").
- The clock ticks on the full second, so the minute changes on time.
