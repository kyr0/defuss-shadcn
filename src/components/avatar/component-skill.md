---
name: Avatar
type: ATM
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

## States

The api is bound **per `.avatar` wrapper**. Declared states: `default`
(image shown) · `error` (forced broken-image look - identical to a real
network `error` event).

```js
document.querySelector('#my-avatar').api.setState('error');
document.querySelector('#my-avatar').api.getState(); // { name: 'error', config: {} }
```

The registry global is `df$.shadcn.avatarApi` / `df$.shadcn.avatarStates`.

## Accessibility

- `<img>` must have an `alt` attribute describing the user
- Fallback text should be initials or a meaningful abbreviation
- A status badge needs `role="img"` + `aria-label` ("Online", "Busy" …) - `aria-label` on a role-less `<span>` is ignored by screen readers. Where there is room, repeat the state as visible text too.
