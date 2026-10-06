---
name: Breadcrumbs
type: BLK
section: website
why: The Breadcrumb component in a <nav>; a container query swaps the trail for a back link when narrow; the collapsed levels are a popover - no script.
when: Above the title of nested pages: docs, help, shop categories. Sibling sections are category-menu.
where: dist/components/breadcrumbs/breadcrumbs.css
supportedStates: default
---

# Pattern: Breadcrumbs

## Native basis
A `<div>`: the Breadcrumb component (with a home icon), a back link to the parent shown only below 30rem (container query), and the page title. The collapsed variant puts the middle levels in a `popover` behind a "..." button.

Built from: [Breadcrumb](../breadcrumb/component-skill.md).

---

## Native Web APIs
- [`<nav>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav) - a navigation landmark
- [`aria-current`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current) - the current page / step / item
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport
- [`Popover API`](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) - light-dismiss panels without script
- [`CSS anchor positioning`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning) - popovers placed next to their trigger

---

## Structure

```html
<div class="mk-breadcrumbs">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <ol class="breadcrumb-list">
      <li class="breadcrumb-item"><a class="breadcrumb-link" href="#" aria-label="Home"><i data-lucide="house"></i></a></li>
      <li class="breadcrumb-separator" aria-hidden="true">/</li>
      <li class="breadcrumb-item"><a class="breadcrumb-link" href="#">Help</a></li>
      <li class="breadcrumb-separator" aria-hidden="true">/</li>
      <li class="breadcrumb-item"><a class="breadcrumb-link" href="#">Billing</a></li>
      <li class="breadcrumb-separator" aria-hidden="true">/</li>
      <li class="breadcrumb-item"><span class="breadcrumb-page" aria-current="page">Invoices</span></li>
    </ol>
  </nav>
  <a class="mk-breadcrumbs-back" href="#"><i data-lucide="chevron-left"></i> Billing</a>
  <h1 class="mk-breadcrumbs-title">Invoices</h1>
</div>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | The trail and the title; below 30rem only "← Parent" |
| `data-variant="collapsed"` | Middle levels behind a "..." button in a popover |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| trail | `<nav aria-label="Breadcrumb">` + `aria-current="page"` | Breadcrumb pattern |
| home | `aria-label="Home"` | The icon has a name |
| more | `<button aria-label="Show 2 more levels">` | Says what it reveals |

---

## Notes
- The last crumb is the current page and is not a link.
