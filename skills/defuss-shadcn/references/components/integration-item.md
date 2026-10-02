---
name: Integration Item
type: BLK
why: A small article with a labelled action; the logo tile is a text mark tinted by one custom property - no images needed.
when: Integration directories and "works with your tools" sections. A grid of logos only is brand-logos.
where: dist/components/integration-item/integration-item.css
supportedStates: default
---

# Pattern: Integration Item

## Native basis
An `<article>`: a logo tile (an `<img>` or a text mark colored by `--mk-integration-color`), the name, a category, a sentence on what it does and a Button link.

Built from: [Button](button.md), [Badge](badge.md).

---

## Native Web APIs
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) - tints derived from the theme tokens
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
  <article class="mk-integration-item">
    <span class="mk-integration-item-logo" style="--mk-integration-color:#24292f" aria-hidden="true">GH</span>
    <div class="mk-integration-item-body">
      <h3 class="mk-integration-item-name">GitHub <span class="badge" data-variant="secondary" data-size="sm">Connected</span></h3>
      <span class="mk-integration-item-category">Engineering</span>
      <p class="mk-integration-item-desc">Link pull requests to tasks; close them when the PR merges.</p>
    </div>
    <a class="btn" data-variant="ghost" data-size="sm" href="#" aria-label="Manage GitHub">Manage</a>
  </article>
  <article class="mk-integration-item">
    <span class="mk-integration-item-logo" style="--mk-integration-color:#a259ff" aria-hidden="true">Fi</span>
    <div class="mk-integration-item-body">
      <h3 class="mk-integration-item-name">Figma</h3>
      <span class="mk-integration-item-category">Design</span>
      <p class="mk-integration-item-desc">Live previews of frames inside any doc.</p>
    </div>
    <a class="btn" data-variant="outline" data-size="sm" href="#" aria-label="Connect Figma">Connect</a>
  </article>
  <article class="mk-integration-item">
    <span class="mk-integration-item-logo" style="--mk-integration-color:#4a154b" aria-hidden="true">Sl</span>
    <div class="mk-integration-item-body">
      <h3 class="mk-integration-item-name">Slack</h3>
      <span class="mk-integration-item-category">Communication</span>
      <p class="mk-integration-item-desc">Get updates in channels; turn messages into tasks.</p>
    </div>
    <a class="btn" data-variant="outline" data-size="sm" href="#" aria-label="Connect Slack">Connect</a>
  </article>
  <article class="mk-integration-item">
    <span class="mk-integration-item-logo" style="--mk-integration-color:#1a73e8" aria-hidden="true">Dr</span>
    <div class="mk-integration-item-body">
      <h3 class="mk-integration-item-name">Google Drive</h3>
      <span class="mk-integration-item-category">Files</span>
      <p class="mk-integration-item-desc">Attach and search Drive files from Acme.</p>
    </div>
    <a class="btn" data-variant="outline" data-size="sm" href="#" aria-label="Connect Google Drive">Connect</a>
  </article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A card: logo, name and category, description, action at the bottom |
| `data-variant="compact"` | A row: logo, name and category, the action at the end |
| `--mk-integration-color` | The brand color of the text-mark logo |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| logo | `aria-hidden="true"` | The name is in the heading next to it |
| action | `aria-label="Connect GitHub"` | Names the tool - "Connect" alone is ambiguous in a list |

---

## Notes
- Use the real logo (`<img alt="">`) when you have permission; the text mark is a fallback.
