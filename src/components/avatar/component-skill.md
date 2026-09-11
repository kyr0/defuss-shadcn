---
name: Avatar
type: ATM
why: Circular image with an initials fallback and an error state exposed through the State API.
when: Representing a person or entity — alone, stacked in a group, or beside a name.
where: dist/components/avatar/avatar.css + dist/components/avatar/avatar.js
supportedStates: default, error
---

# Avatar

## Native basis

`<img>` element wrapped in a container `<span>` with a text fallback for when the image fails to load.

## Native Web APIs

- [`<img>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img) — image element with `onerror` fallback
- [`:has()` selector](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) — toggle fallback visibility based on image state

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

<!-- Avatar with badge (status indicator) -->
<span class="avatar" data-size="default">
  <img class="avatar-image" src="https://example.com/photo.jpg" alt="@username" />
  <span class="avatar-fallback">CN</span>
  <span class="avatar-badge"></span>
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

## States

The api is bound **per `.avatar` wrapper**. Declared states: `default`
(image shown) · `error` (forced broken-image look — identical to a real
network `error` event).

```js
document.querySelector('#my-avatar').api.setState('error');
document.querySelector('#my-avatar').api.getState(); // { name: 'error', config: {} }
```

The registry global is `_defussShadcn.avatarApi` / `_defussShadcn.avatarStates`.

## Accessibility

- `<img>` must have an `alt` attribute describing the user
- Fallback text should be initials or a meaningful abbreviation
- Avatar badge should use `aria-label` to convey status when meaningful
