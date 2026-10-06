---
name: Quick Links
type: BLK
section: website
why: A nav of plain links - the variants are layout and emphasis only. No script.
when: Dashboards, help-center fronts, 404 pages, footers of long pages. Content categories are category-menu.
where: dist/components/quick-links/quick-links.css
supportedStates: default
---

# Pattern: Quick Links

## Native basis
A `<nav aria-label="Quick links">` with a list of links: an icon, a title, a short description and an arrow that slides on hover.

---

## Native Web APIs
- [`<nav>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav) - a navigation landmark
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<nav class="mk-quick-links" aria-label="Quick links">
  <ul>
    <li><a href="#"><i data-lucide="rocket"></i><span><strong>Get started</strong><small>Set up a workspace in five minutes</small></span><i data-lucide="arrow-right"></i></a></li>
    <li><a href="#"><i data-lucide="credit-card"></i><span><strong>Billing</strong><small>Plans, invoices and seats</small></span><i data-lucide="arrow-right"></i></a></li>
    <li><a href="#"><i data-lucide="shield-check"></i><span><strong>Security</strong><small>Two-factor, SSO and data</small></span><i data-lucide="arrow-right"></i></a></li>
    <li><a href="#"><i data-lucide="plug"></i><span><strong>Integrations</strong><small>Connect the tools you use</small></span><i data-lucide="arrow-right"></i></a></li>
    <li><a href="#"><i data-lucide="activity"></i><span><strong>Status</strong><small>All systems normal</small></span><i data-lucide="arrow-right"></i></a></li>
    <li><a href="#"><i data-lucide="message-circle"></i><span><strong>Contact</strong><small>Talk to a human</small></span><i data-lucide="arrow-right"></i></a></li>
  </ul>
</nav>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Tiles in a grid |
| `data-variant="list"` | Rows separated by rules |
| `data-variant="chips"` | Icon chips without descriptions |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| landmark | `<nav aria-label="Quick links">` | Named |
| icons and arrow | decorative | The title names the link |

---

## Notes
- Six links or fewer - quick links stop being quick after that.
