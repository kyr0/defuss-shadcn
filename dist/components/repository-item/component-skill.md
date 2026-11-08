---
name: Repository Item
type: BLK
section: website
why: An <article> whose heading link is stretched over the card, the numbers as a list with screen-reader words - the language dot is the dot's own `color`, set by data-language or inline. No script.
when: A developer's open-source work on a portfolio or a CV. Visual work with a picture takes project-item; a downloadable file takes download-item.
where: dist/components/repository-item/repository-item.css
supportedStates: default
---

# Pattern: Repository Item

## Native basis
An `<article>`: a head with an icon, the name (`owner/` + repository) as a heading link stretched over the card and a visibility Badge; the description; the topics as a `<ul>`; the numbers as a `<ul>` - language (a dot and its name), stars, forks, licence, the last update as `<time>`.

Built from: [Badge](../badge/component-skill.md).

---

## Native Web APIs
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - one self-contained project
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - the last update, machine-readable
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - the card shows the focus ring of its stretched link
- [`currentColor`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#currentcolor_keyword) - the language dot is painted in its own `color`
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) - the topic tint and the hover border

---

## Structure

```html
<article class="mk-repository-item">
  <div class="mk-repository-item-head">
    <i data-lucide="book-marked"></i>
    <h3 class="mk-repository-item-name"><a href="#"><span class="mk-repository-item-owner">maraokafor/</span>quiet-tokens</a></h3>
    <span class="badge" data-variant="outline">Public</span>
  </div>
  <p class="mk-repository-item-description">Design tokens as plain CSS custom properties - one file per theme, light and dark, no build step.</p>
  <ul class="mk-repository-item-topics" aria-label="Topics">
    <li>css</li>
    <li>design-tokens</li>
    <li>theming</li>
  </ul>
  <ul class="mk-repository-item-stats">
    <li><span class="mk-repository-item-language" data-language="css"></span> CSS</li>
    <li><i data-lucide="star"></i> 2.4k<span class="sr-only"> stars</span></li>
    <li><i data-lucide="git-fork"></i> 184<span class="sr-only"> forks</span></li>
    <li><i data-lucide="scale"></i> MIT</li>
    <li>Updated <time datetime="2026-10-28">Oct 28</time></li>
  </ul>
</article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| *(omitted)* | A card: border, padding, the numbers pushed to its bottom - equal heights in a grid |
| `data-variant="plain"` | A row of a list - no card, a rule below |
| `data-language` on `.mk-repository-item-language` | `typescript`, `javascript`, `css`, `html`, `rust`, `go`, `python`, `swift`, `kotlin`, `shell` - the GitHub language colours; any other: `style="color: ..."` on the dot |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| name | `<h3><a>` | The link's text is `owner/name` - the whole card is its click target |
| numbers | `<span class="sr-only"> stars</span>` | The icon says "stars" to the eye; the hidden word says it to a screen reader |
| topics | `<ul aria-label="Topics">` | Names the list |
| language dot | empty `<span>` | Decorative - the language's name follows it |

---

## Notes
- The stretched link covers the card: put any other link (the live demo, the docs) outside the card, or raise it with `position: relative; z-index: 1`.
- `.sr-only` comes from `theme/utils/accessibility.css`.
