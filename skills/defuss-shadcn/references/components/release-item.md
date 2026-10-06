---
name: Release Item
type: BLK
section: website
why: An article with a typed label (one data attribute colors it) - the kind is always written, not only colored. No script.
when: The entries under a release-header. Future work is roadmap-item.
where: dist/components/release-item/release-item.css
supportedStates: default
---

# Pattern: Release Item

## Native basis
An `<article>`: the kind (`data-type="new|improved|fixed|breaking"`), a title, a short explanation, an optional screenshot and the PR link with the author.

Built from: [Avatar](avatar.md).

---

## Native Web APIs
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
  <article class="mk-release-item">
    <span class="mk-release-item-type" data-type="new">New</span>
    <div class="mk-release-item-body">
      <h3 class="mk-release-item-title">Tables in docs</h3>
      <p class="mk-release-item-desc">Insert a table with /table - sort, filter and resize columns. Paste from a spreadsheet and the structure comes along.</p>
      <img class="mk-release-item-media" src="https://picsum.photos/seed/rel-table/1000/500" alt="">
      <p class="mk-release-item-meta"><a href="#">#4812</a> · <span class="avatar" data-size="xs"><img class="avatar-image" src="images/mk-portrait2.png" alt=""></span> by Hannah</p>
    </div>
  </article>
  <article class="mk-release-item">
    <span class="mk-release-item-type" data-type="improved">Improved</span>
    <div class="mk-release-item-body">
      <h3 class="mk-release-item-title">Search is three times faster</h3>
      <p class="mk-release-item-desc">Results appear while you type, even in workspaces with 100,000 docs.</p>
      <p class="mk-release-item-meta"><a href="#">#4790</a> · <span class="avatar" data-size="xs"><img class="avatar-image" src="images/mk-portrait.png" alt=""></span> by Sophie</p>
    </div>
  </article>
  <article class="mk-release-item">
    <span class="mk-release-item-type" data-type="fixed">Fixed</span>
    <div class="mk-release-item-body">
      <h3 class="mk-release-item-title">Sync no longer stalls after waking a laptop</h3>
      <p class="mk-release-item-meta"><a href="#">#4801</a> · <span class="avatar" data-size="xs"><img class="avatar-image" src="images/mk-portrait.png" alt=""></span> by Sophie</p>
    </div>
  </article>
  <article class="mk-release-item">
    <span class="mk-release-item-type" data-type="breaking">Breaking</span>
    <div class="mk-release-item-body">
      <h3 class="mk-release-item-title">API v1 tokens stop working on 1 December</h3>
      <p class="mk-release-item-desc">Create a v2 token in Settings → API; the old endpoints answer 410 after that date.</p>
      <p class="mk-release-item-meta"><a href="#">#4777</a></p>
    </div>
  </article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | The kind label beside the explanation |
| `data-variant="compact"` | Kind and title on one line |
| `data-type` | New (green), Improved (blue), Fixed (gray), Breaking (red) |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| kind | text "New", "Fixed"... | Color is a second cue |
| PR | a link with the number | Traceable |

---

## Notes
- Write breaking changes with the migration step.
