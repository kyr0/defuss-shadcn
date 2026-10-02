---
name: Site Footer
type: BLK
why: Link columns + social row is pure grid/flex markup in a <footer> landmark - no behavior to script.
when: Bottom of marketing pages; the doc site's own footer is separate chrome (<footer> in layout.js).
where: dist/components/site-footer/site-footer.css
supportedStates: default
---

# Pattern: Site Footer

## Native basis
`<footer>` content-info landmark; link columns are `<ul>`s in a grid;
the social icons are labeled links. Everything wraps with container
queries.

---

## Native Web APIs
- [`<footer>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/footer) - content-info landmark
- [`<nav aria-label>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav) - named footer navigation region
- [CSS Grid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout) - 1 → 2 → 4 link columns
- [Badge](badge.md) - "New" pill inside a link

---

## Structure

```html
<footer class="mk-footer">
  <div class="mk-footer-inner">
    <nav class="mk-footer-nav" aria-label="Footer">
      <div class="mk-footer-col">
        <h3 class="mk-footer-heading">Product</h3>
        <ul class="mk-footer-list">
          <li><a href="#">Features</a></li>
          <li><a href="#">Integrations <span class="badge" data-variant="outline">New</span></a></li>
        </ul>
      </div>
      <div class="mk-footer-col">
        <h3 class="mk-footer-heading">Company</h3>
        <ul class="mk-footer-list">
          <li><a href="#">About Us</a></li>
        </ul>
      </div>
    </nav>
    <hr class="separator mk-footer-rule" />
    <div class="mk-footer-bottom">
      <a href="#" class="mk-footer-brand" aria-label="Go to home page">
        <i data-lucide="zap"></i>
        <span class="mk-footer-brand-name">Acme Inc.</span>
      </a>
      <div class="mk-footer-meta">
        <div class="mk-footer-social">
          <a href="#" aria-label="LinkedIn"><i data-lucide="linkedin"></i></a>
          <a href="#" aria-label="Twitter"><i data-lucide="twitter"></i></a>
        </div>
        <p class="mk-footer-copy">© Copyright Acme Inc. 2026. All rights reserved.</p>
      </div>
    </div>
  </div>
</footer>
```

The rule is the semantic [Separator](separator.md) (`<hr class="separator">`).

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| `data-variant="simple"` | One row: brand, inline links (`.mk-footer-links`), copyright - wraps when narrow |
| `data-variant="dark"` | The footer inverts - the page ends on a dark band |
| `.mk-footer-top` + `.mk-footer-about` | An about column (brand, a line, a newsletter field `.mk-footer-newsletter`, social) beside the link columns |
| `.mk-footer-locale` | A language Select in the bottom row |
| `.mk-footer-cta` | A call to action on top of the footer |
| `.mk-footer-wordmark` | The brand name, huge, closing the page (scales with the footer width) |

---

## ARIA

| Attribute       | Element       | Purpose                                    |
|-----------------|---------------|--------------------------------------------|
| `aria-label`    | `nav`         | Distinguishes footer nav from header nav   |
| `aria-label`    | social links  | Icon-only links must state their target    |

---

## Notes
- Each column heading is an `<h3>` inside a named `<nav>` - the region outline gives users a column map.
- Social links need `aria-label`s ("LinkedIn", not "link") - the icon is the label.
- Copyright line stays a `<p>`, never a heading; screen-reader users scan landmarks, not boilerplate.
