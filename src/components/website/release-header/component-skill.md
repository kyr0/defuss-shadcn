---
name: Release Header
type: BLK
section: website
why: A header with a <time>, badges and links - nothing to run.
when: The top of a changelog entry or release page. The individual changes are release-item; plans are roadmap-item.
where: dist/components/release-header/release-header.css
supportedStates: default
---

# Pattern: Release Header

## Native basis
A `<header>`: the version in a mono tag, Badges for the kind (major, breaking), the date as `<time>`, a headline, a summary, highlights and links (download, full changelog, source).

Built from: [Badge](../../data-display/badge/component-skill.md), [Button](../../actions/button/component-skill.md).

---

## Native Web APIs
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dates
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<header class="mk-release-header">
  <div class="mk-release-header-tags"><code class="mk-release-header-version">v4.0.0</code><span class="badge" data-variant="default" data-size="sm">Major</span><span class="badge" data-variant="outline" data-size="sm">2 breaking changes</span><time datetime="2026-09-28">28 September 2026</time></div>
  <h1 class="mk-release-header-title">Acme 4.0: offline sync for everyone</h1>
  <p class="mk-release-header-summary">The biggest release in two years: every workspace now works offline, search got three times faster, and the editor learned tables.</p>
  <ul class="mk-release-header-highlights">
    <li><i data-lucide="wifi-off"></i><strong>Offline everywhere</strong><span>Sync catches up on its own.</span></li>
    <li><i data-lucide="zap"></i><strong>3× faster search</strong><span>Results while you type.</span></li>
    <li><i data-lucide="table"></i><strong>Tables in docs</strong><span>Sort, filter, resize.</span></li>
  </ul>
  <div class="mk-release-header-links"><a class="btn" href="#"><i data-lucide="download"></i> Download</a><a class="btn" data-variant="outline" href="#">Full changelog</a><a class="btn" data-variant="ghost" href="#"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2.1c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5Z"/></svg> Source</a></div>
</header>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A large header with highlights and links |
| `data-variant="compact"` | One line: version, date, title - for a changelog list |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| date | `<time datetime>` | Machine-readable |
| version | text in `<code>` | Copyable |

---

## Notes
- Lead with what users get, not what you refactored.
