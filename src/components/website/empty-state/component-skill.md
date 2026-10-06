---
name: Empty State
type: BLK
section: website
why: A heading, a sentence and one or two real actions - no script, no illustration library.
when: An empty list, inbox, search, project or dashboard. A failure is error-state; "nothing found" for a query also fits here.
where: dist/components/empty-state/empty-state.css
supportedStates: default
---

# Pattern: Empty State

## Native basis
A `<section>`: an icon in soft concentric rings, a heading that says what is empty, a sentence on why or what comes next, and a primary action (plus an optional secondary link).

Built from: [Button](../../actions/button/component-skill.md).

---

## Native Web APIs
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<section class="mk-empty-state" aria-labelledby="es-1">
  <span class="mk-empty-state-icon" aria-hidden="true"><i data-lucide="folder-open"></i></span>
  <h2 class="mk-empty-state-title" id="es-1">No projects yet</h2>
  <p class="mk-empty-state-text">Projects keep plans, docs and tasks together. Create one, or start from a template.</p>
  <div class="mk-empty-state-actions"><a class="btn" href="#"><i data-lucide="plus"></i> New project</a><a class="btn" data-variant="outline" href="#">Browse templates</a></div>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Centered: icon in rings, title, text, actions |
| `data-variant="dashed"` | On a dashed area - a drop zone or an empty board |
| `data-variant="compact"` | One row inside a list or table |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| title | a heading | Says what is empty ("No projects yet") |
| icon | `aria-hidden="true"` | Decorative |

---

## Notes
- Say what will appear here and how to make it appear.
- Distinguish "nothing yet" from "nothing matches" - the action differs.
