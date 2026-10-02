---
name: Context Menu
type: ATM
why: Popover anchored to the pointer position on contextmenu - no positioning library involved.
when: Secondary per-item actions invoked with right-click or long-press.
where: dist/components/context-menu/context-menu.css + dist/components/context-menu/context-menu.js
supportedStates: default, open
---

# Context Menu

## Native basis

Popover API triggered by right-click.

## Native Web APIs

- [`popover` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/popover) - native popover
- [`contextmenu` event](https://developer.mozilla.org/en-US/docs/Web/API/Element/contextmenu_event) - right-click trigger

## Structure

```html
<div class="context-menu-trigger" data-context-menu="my-ctx">Right click here</div>
<div class="context-menu" id="my-ctx" popover>
  <button class="context-menu-item" role="menuitem">Cut</button>
  <button class="context-menu-item" role="menuitem">Copy</button>
  <button class="context-menu-item" role="menuitem">Paste</button>
</div>
```

## Density

Set `data-density` on the `.context-menu` root; container padding and item rows scale.

| Value | Effect |
| --- | --- |
| `compact` | Container 0.125rem, items 0.25rem |
| `comfortable` | 0.25rem / 0.375rem - identical to the unsized default |
| `spacious` | 0.375rem / 0.5rem |

## States

The api is bound **per menu popover**. Declared states: `default` (closed)
· `open` (shown; `{ x, y }` config positions it - viewport top-left when
no pointer coordinates exist).

```js
document.querySelector('#my-ctx').api.setState('open', { x: 40, y: 40 });
document.querySelector('#my-ctx').api.getState(); // { name: 'open', config: { x: 40, y: 40 } }
```

The registry global is `df$.shadcn.contextMenuApi` / `df$.shadcn.contextMenuStates` (camelCase).

## Notes

- The menu opens at the pointer (or the `setState('open', { x, y })`
  point). Where there is no room to the right or below, it opens toward the
  other side of the point - as a native menu does - and it never runs past
  the viewport.
