---
name: Docs Navigation
type: BLK
section: website
why: Lists inside a <nav>, groups as <details> - collapsible without script; aria-current="page" marks where you are.
when: The sidebar of a documentation site or help center. The headings of one page are contents; a trail is breadcrumbs.
where: dist/components/docs-navigation/docs-navigation.css
supportedStates: default
---

# Pattern: Docs Navigation

## Native basis
A `<nav aria-label="Documentation">`: a version Select, section headings, nested `<ul>`s, collapsible groups as `<details>` and `aria-current="page"` on the current link.

Built from: [Select](../select/component-skill.md), [Badge](../badge/component-skill.md).

---

## Native Web APIs
- [`<nav>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav) - a navigation landmark
- [`<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) - native disclosure, no script
- [`aria-current`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current) - the current page / step / item

---

## Structure

```html
<nav class="mk-docs-navigation" aria-label="Documentation">
  <div class="mk-docs-navigation-top">
    <label class="sr-only" for="dn-ver">Version</label>
    <select class="select" id="dn-ver"><option>v4.0 (latest)</option><option>v3.9</option></select>
  </div>
  <p class="mk-docs-navigation-heading">Getting started</p>
  <ul>
    <li><a href="#">Introduction</a></li>
    <li><a href="#">Installation</a></li>
    <li><a href="#" aria-current="page">Quick start</a></li>
  </ul>
  <details open>
    <summary class="mk-docs-navigation-heading">Guides</summary>
    <ul>
      <li><a href="#">Workspaces</a></li>
      <li><a href="#">Offline sync <span class="badge" data-variant="secondary" data-size="sm">New</span></a></li>
      <li><a href="#">Permissions</a>
        <ul><li><a href="#">Roles</a></li><li><a href="#">Guests</a></li></ul>
      </li>
    </ul>
  </details>
  <details>
    <summary class="mk-docs-navigation-heading">API reference</summary>
    <ul><li><a href="#">Authentication</a></li><li><a href="#">Docs</a></li><li><a href="#">Tasks</a></li></ul>
  </details>
</nav>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | The current page as a filled pill |
| `data-variant="bordered"` | A rail along the edge; the current page lights it |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| landmark | `<nav aria-label="Documentation">` | Distinct from the main nav |
| current | `aria-current="page"` | Announced |
| groups | `<details>` + `<summary>` | Native expand / collapse |

---

## Notes
- Keep the current group open server-side.
