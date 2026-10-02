---
name: Help Category
type: BLK
why: The title link covers the card; the popular-article links stay clickable above it - two levels of targets, no script.
when: Help-center front pages. A single article is help-article; a resource library is resource-item.
where: dist/components/help-category/help-category.css
supportedStates: default
---

# Pattern: Help Category

## Native basis
An `<article>`: an icon tile, the topic as a link stretched over the card, a description, the article count, and optionally the top articles as links above the stretched link.

---

## Native Web APIs
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside

---

## Structure

```html
  <article class="mk-help-category">
    <span class="mk-help-category-icon" aria-hidden="true"><i data-lucide="rocket"></i></span>
    <div class="mk-help-category-body">
      <h3 class="mk-help-category-title"><a href="#">Getting started</a></h3>
      <p class="mk-help-category-desc">Set up your workspace and invite your team.</p>
      <p class="mk-help-category-count">18 articles</p>
      <ul class="mk-help-category-top"><li><a href="#">Create a workspace</a></li><li><a href="#">Invite teammates</a></li><li><a href="#">Import from Notion</a></li></ul>
    </div>
  </article>
  <article class="mk-help-category">
    <span class="mk-help-category-icon" aria-hidden="true"><i data-lucide="credit-card"></i></span>
    <div class="mk-help-category-body">
      <h3 class="mk-help-category-title"><a href="#">Billing & plans</a></h3>
      <p class="mk-help-category-desc">Invoices, seats, upgrades and refunds.</p>
      <p class="mk-help-category-count">24 articles</p>
      <ul class="mk-help-category-top"><li><a href="#">Change your plan</a></li><li><a href="#">Download an invoice</a></li></ul>
    </div>
  </article>
  <article class="mk-help-category">
    <span class="mk-help-category-icon" aria-hidden="true"><i data-lucide="refresh-cw"></i></span>
    <div class="mk-help-category-body">
      <h3 class="mk-help-category-title"><a href="#">Sync & offline</a></h3>
      <p class="mk-help-category-desc">How your work stays in sync everywhere.</p>
      <p class="mk-help-category-count">12 articles</p>
      <ul class="mk-help-category-top"><li><a href="#">Sync is stuck</a></li><li><a href="#">Work offline</a></li></ul>
    </div>
  </article>
  <article class="mk-help-category">
    <span class="mk-help-category-icon" aria-hidden="true"><i data-lucide="shield"></i></span>
    <div class="mk-help-category-body">
      <h3 class="mk-help-category-title"><a href="#">Security</a></h3>
      <p class="mk-help-category-desc">Two-factor, SSO, data handling.</p>
      <p class="mk-help-category-count">15 articles</p>
      <ul class="mk-help-category-top"><li><a href="#">Turn on two-factor</a></li><li><a href="#">Set up SSO</a></li></ul>
    </div>
  </article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A card with the top articles |
| `data-variant="compact"` | A row: icon, topic, count |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| topic link | `<a>` in `<h3>` | The card's name |
| top articles | real links, raised above the stretched link | Reachable by keyboard and pointer |

---

## Notes
- Name topics after the user's task, not your org chart.
