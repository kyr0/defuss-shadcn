---
name: Section Header
type: BLK
why: Plain heading + paragraph + links; flex-wrap gives the split layout its fallback and a container query scales the title - no breakpoints, no script.
when: Above any page section (features, pricing, a list of posts). A whole-page opener with media takes hero; a news or blog front takes news-header / blog-header.
where: dist/components/section-header/section-header.css
supportedStates: default
---

# Pattern: Section Header

## Native basis
A heading (`h2`) with an eyebrow, a description and optional actions (Buttons). `flex-wrap` lets the split layout fall back to a stack when the row gets narrow; a container query scales the title.

Built from: [Button](../button/component-skill.md), [Badge](../badge/component-skill.md), [Avatar](../avatar/component-skill.md), [Kbd](../kbd/component-skill.md).

---

## Native Web APIs
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the title scales with the section
- [`text-wrap`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) - balanced title, pretty description
- [`flex-wrap`](https://developer.mozilla.org/en-US/docs/Web/CSS/flex-wrap) - split falls back to a stack

---

## Structure

```html
<header class="mk-section-header">
  <div class="mk-section-header-copy">
    <span class="mk-section-header-eyebrow">Features</span>
    <h2 class="mk-section-header-title">Everything your team needs to ship calmly</h2>
    <p class="mk-section-header-desc">Plan, write and review in one place - with the tools you already use, and none of the noise.</p>
  </div>
  <div class="mk-section-header-actions">
    <a class="btn" href="#">Get started</a>
    <a class="btn" data-variant="ghost" href="#">See all features <i data-lucide="arrow-right"></i></a>
  </div>
</header>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| `data-variant="split"` | Copy left, actions right on the baseline - wraps under the copy when narrow |
| `data-align="center"` | Everything centered |
| `data-size="sm"` / `"lg"` | Title 24 → 28px / 36 → 48px (default 30 → 36px) |
| `data-variant="numbered"` | A large outlined index (`data-index="01"`) in front of the copy |
| `data-variant="divider"` | A rule runs from the title to the edge |
| `data-variant="banner"` | On a bordered surface with a dotted field |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| title | `<h2>` (or the level the outline needs) | The section heading - the eyebrow is plain text, not a heading |
| actions | `<a class="btn">` / `<button>` | Distinct, specific labels ("See all features", not "More") |

---

## Notes
- Pair it with `aria-labelledby` on the `<section>` it introduces.
- Keep the eyebrow short - it is a label, not a sentence.
