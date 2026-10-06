---
name: Sort Control
type: BLK
section: website
why: A native Select, a radio group, or a popover holding radios - each submits with the form; none needs script to render or choose.
when: Above lists, grids and tables. Narrowing is filter-bar; changing the layout is view-switcher.
where: dist/components/sort-control/sort-control.css
supportedStates: default
---

# Pattern: Sort Control

## Native basis
A labelled `<select name="sort">`; or a radio group styled as segments; or a button with `popovertarget` opening a `popover` of radios (the menu stays a form control).

Built from: [Select](../select/component-skill.md), [Button](../button/component-skill.md).

---

## Native Web APIs
- [`Popover API`](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) - light-dismiss panels without script
- [`CSS anchor positioning`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning) - popovers placed next to their trigger
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`<fieldset>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset) - grouped controls with a legend

---

## Structure

```html
<div class="mk-sort-control"><label for="so-1">Sort by</label><select class="select" id="so-1" name="sort"><option>Most relevant</option><option>Newest</option><option>Price: low to high</option><option>Price: high to low</option></select></div>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | "Sort by" label and a Select |
| `data-variant="segmented"` | Three or four choices as segments |
| `data-variant="menu"` | A button opening a popover of radio options, anchored to it |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| select | a visible `<label>` | "Sort by" |
| segments | `<fieldset>` of radios | Arrow keys move |
| menu | `popover` + radios inside | Escape closes; the choice is a real form value |

---

## Notes
- Keep the current order visible in the trigger text.
