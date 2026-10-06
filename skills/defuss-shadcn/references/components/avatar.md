---
name: Avatar
type: ATM
section: data-display
why: Circular image with an initials fallback and an error state exposed through the State API.
when: Representing a person or entity - alone, stacked in a group, or beside a name.
where: dist/components/avatar/avatar.css + dist/components/avatar/avatar.js
supportedStates: default, error
---

# Avatar

## Native basis

`<img>` element wrapped in a container `<span>` with a text fallback for when the image fails to load.

## Native Web APIs

- [`<img>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img) - image element with `onerror` fallback
- [`:has()` selector](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - toggle fallback visibility based on image state

## Structure

```html
<!-- Avatar with image -->
<span class="avatar" data-size="default">
  <img class="avatar-image" src="https://example.com/photo.jpg" alt="@username" />
  <span class="avatar-fallback">CN</span>
</span>

<!-- Avatar with fallback only -->
<span class="avatar" data-size="default">
  <span class="avatar-fallback">CN</span>
</span>

<!-- Avatar with a presence badge (online | offline | busy | away) -->
<span class="avatar" data-size="default">
  <img class="avatar-image" src="https://example.com/photo.jpg" alt="@username" />
  <span class="avatar-fallback">CN</span>
  <span class="avatar-badge" data-variant="busy" role="img" aria-label="Busy"></span>
</span>

<!-- Avatar group -->
<div class="avatar-group">
  <span class="avatar">
    <img class="avatar-image" src="..." alt="..." />
    <span class="avatar-fallback">A</span>
  </span>
  <span class="avatar">
    <img class="avatar-image" src="..." alt="..." />
    <span class="avatar-fallback">B</span>
  </span>
  <span class="avatar-group-count">+3</span>
</div>
```

## Sizes (`data-size`)

| Value     | Dimensions |
|-----------|------------|
| `xs`      | 1.5rem     |
| `sm`      | 2rem       |
| `md`      | 2.5rem     |
| `default` | 2.5rem     |
| `lg`      | 3rem       |
| `xl`      | 4rem       |

## Badge variants

`data-variant` on `.avatar-badge` sets the presence state. Every state has a shape cue as well as a colour (WCAG 1.4.1 - never colour alone); forced-colors mode keeps the palette.

| `data-variant` | Meaning | Look |
| --- | --- | --- |
| *(none)* / `online` | Available | Solid green dot |
| `offline` | Not connected | Hollow grey ring |
| `busy` | In a meeting / do not disturb | Red dot with a white bar |
| `away` | Idle / afk | Amber dot with clock hands |

The dot scales with the avatar (`xs` 0.75rem · `sm` 1rem · `md`/default 1.25rem · `lg` 1.5rem · `xl` 1.75rem) and sits in front of the image with a background-coloured rim. Status colours are literals (the token set has no success/warning pair). Omitting the badge does **not** mean offline - render `data-variant="offline"` when the state is known.

### Badge position (`data-position` on `.avatar-badge`)

`top-start` · `top-end` · `bottom-start` · `bottom-end` (default) - any of the
four corners. `start` / `end` are logical: in RTL, start is the right.

## Shape (`data-shape`)

| Value | Look |
| --- | --- |
| *(none)* | Circle |
| `rounded` | Rounded square (`--radius-lg`) |
| `square` | Square with a small radius (`--radius-sm`) |

Image, fallback and ring inherit the shape. For silhouettes, put a `shape-*`
class from `theme/utils/shapes.css` (`shape-heart`, `shape-squircle`,
`shape-hexagon-2`, `shape-decagon`, `shape-star-2` ...) on the
`.avatar-image` - only the photo is cut, so a badge still sits on top, and a
loaded photo drops the muted plate behind it.

```html
<span class="avatar" data-size="xl"><img class="avatar-image shape-heart" src="…" alt="Jane Doe"><span class="avatar-fallback">JD</span></span>
```

## Ring (`data-ring`)

`data-ring` draws a 2px ring with a 2px background-colored gap in `--primary`;
`data-ring="secondary"` (`--muted-foreground`) and `"destructive"` recolor it.
It follows `data-shape`.

## Placeholder (`.avatar-fallback` `data-variant`)

Without an image the fallback letters are the avatar; `data-variant="primary"`
or `"neutral"` (foreground plate) puts them on a solid plate.

## Custom sizes

Beyond the `xs` to `xl` sizes, sizing utilities set any size (`w-32 h-32` = 8rem); the
badge keeps its size - set a `data-size` for a matching badge.

## Group (`.avatar-group`)

Overlapping avatars; `data-overlap="sm"` (0.25rem) / `"lg"` (1rem) instead of
the default 0.5rem. `.avatar-group-count` closes the row (`+99`) and follows
the overlap.

## States

The api is bound **per `.avatar` wrapper**. Declared states: `default`
(image shown) · `error` (forced broken-image look - identical to a real
network `error` event).

```js
document.querySelector('#my-avatar').api.setState('error');
document.querySelector('#my-avatar').api.getState(); // { name: 'error', config: {} }
```

The registry global is `df$.shadcn.avatarApi` / `df$.shadcn.avatarStates`.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type AvatarState = 'default' | 'error'</code> - `setState(name, config)` takes the config of the state it names (`AvatarStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The image shows (or only the fallback is authored). No config. |
| `error` | The image failed to load - the fallback (initials, an icon) shows instead. No config. |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends AvatarState&gt;(name: S, config?: AvatarStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>AvatarStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: AvatarState; config: AvatarStateConfigs[AvatarState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: AvatarState; config: AvatarStateConfigs[AvatarState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: AvatarState; config: AvatarStateConfigs[AvatarState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: AvatarState; config: AvatarStateConfigs[AvatarState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: AvatarState; config: AvatarStateConfigs[AvatarState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.avatarApi.setState&lt;S extends AvatarState&gt;(el: HTMLElement, name: S, config?: AvatarStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>AvatarStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.avatarApi.getState(el: HTMLElement): { name: AvatarState; config: AvatarStateConfigs[AvatarState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: AvatarState; config: AvatarStateConfigs[AvatarState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.avatarApi.render(state: { name: AvatarState; config: AvatarStateConfigs[AvatarState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: AvatarState; config: AvatarStateConfigs[AvatarState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.avatarApi.store(el: HTMLElement): Store&lt;{ name: AvatarState; config: AvatarStateConfigs[AvatarState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: AvatarState; config: AvatarStateConfigs[AvatarState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.avatarApi.commit&lt;S extends AvatarState&gt;(el: HTMLElement, name: S, config?: AvatarStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>AvatarStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.avatarStates: AvatarState[]</code> | The declared states, 'default' first: <code>default</code>, <code>error</code>. |

## Accessibility

- `<img>` must have an `alt` attribute describing the user
- Fallback text should be initials or a meaningful abbreviation
- A status badge needs `role="img"` + `aria-label` ("Online", "Busy" ...) - `aria-label` on a role-less `<span>` is ignored by screen readers. Where there is room, repeat the state as visible text too.
