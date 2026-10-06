---
name: Button Group
type: MOL
section: actions
why: Adjacent buttons fused into one visual unit via border collapse on first/last children.
when: Tightly related actions (Save + Cancel, split buttons, icon actions) that belong together.
where: dist/components/button-group/button-group.css
supportedStates: default
---

# Pattern: Button Group

## Native basis
`<div>` container with `.btn` buttons. Visually merges adjacent buttons with connected borders.

---

## Native Web APIs
- [`role="group"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/group_role) - groups related buttons
- [`aria-label`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-label) - accessible name for the group
- [`role="separator"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/separator_role) - visually divides buttons within a group
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - restores border-radius on buttons adjacent to separators
- [Logical properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values) - `margin-inline-start`, `border-start-start-radius` for RTL support
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - maps separator to system `ButtonText` color

---

## Structure

### Horizontal (default)
```html
<div class="btn-group" role="group" aria-label="Actions">
  <button class="btn" data-variant="outline">Save</button>
  <button class="btn" data-variant="outline">Edit</button>
  <button class="btn" data-variant="outline">Delete</button>
</div>
```

### Vertical
```html
<div class="btn-group" data-orientation="vertical" role="group" aria-label="Actions">
  <button class="btn" data-variant="outline">Top</button>
  <button class="btn" data-variant="outline">Middle</button>
  <button class="btn" data-variant="outline">Bottom</button>
</div>
```

---

## Accessibility

| Attribute | Element | Purpose |
|-----------|---------|---------|
| `role="group"` | Container | Groups related buttons |
| `aria-label` | Container | Accessible name for the group |
| `role="separator"` | `<hr>` | Visually divides buttons |

---

## Notes

- **Split button**: `<hr role="separator">` between the action and a `data-size="icon"` chevron is the single 1px dividing line - the buttons on either side drop the border that touches it and keep square inner corners, so the two halves read as one control. Make the chevron a Dropdown trigger (`data-dropdown-trigger`, `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`) and put the `.dropdown-content` menu AFTER the group (a child inside the group would count as its last button), with `data-align="end"` so it lines up with the chevron.

- Button groups work best with the `outline` variant - the connected borders create a cohesive unit.
- Adjacent button borders collapse so only one border renders between buttons.
- The group removes internal border-radii to create seamless joins.
- Use `<hr role="separator">` in Split buttons to divide the primary action from its dropdown trigger.
- Uses CSS logical properties (`margin-inline-start`, `border-start-*-radius`) for automatic RTL support.
- No JavaScript required - this is purely a CSS layout component.
