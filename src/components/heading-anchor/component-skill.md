---
name: Heading Anchor
type: ATM
why: A quiet § permalink on any heading — a visible, copyable deep link with zero JavaScript.
when: Section permalinks in docs/blogs/specs — before or after the heading text.
where: dist/components/heading-anchor/heading-anchor.css
supportedStates: default
---

# Pattern: Heading Anchor

## Native basis
`<a>` element containing the section glyph `§`, placed as the first or last child of the heading it links to. No interactivity required — the browser's native fragment navigation does the work.

---

## Native Web APIs
- [`<a>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a) — native anchor with href
- [URL fragment (`:target`)](https://developer.mozilla.org/en-US/docs/Web/CSS/:target) — native deep links, no JS scroll logic
- [`aria-label`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-label) — the glyph alone is not a name; the label carries the section title

---

## Structure

```html
<h2 id="tokens">
  <a class="heading-anchor" href="#tokens" aria-label="Link to section: Tokens">§</a>
  Tokens
</h2>
```

After the heading text instead (`data-placement="after"`):

```html
<h2 id="tokens">
  Tokens
  <a class="heading-anchor" href="#tokens" data-placement="after" aria-label="Link to section: Tokens">§</a>
</h2>
```

---

## Placements

| `data-placement` | Purpose                          |
|------------------|----------------------------------|
| `before`         | margin-right — the default slot  |
| `after`          | margin-left — trailing the text  |

## Sizes

| `data-size` | Purpose                              |
|-------------|--------------------------------------|
| `xs`        | 0.75rem — fine print, captions       |
| `sm`        | 0.875rem — small headings            |
| `md`        | 1rem — default heading size          |
| `lg`        | 1.125rem — section headings          |
| `xl`        | 1.25rem — page titles                |

Without `data-size` the glyph inherits the heading's own font size (recommended — it then tracks the heading automatically).

---

## Accessibility

- Always set `aria-label="Link to section: {heading text}"` — a bare `§` announces nothing.
- The glyph inherits the heading's font family: the font tokens `--font-sans` / `--font-serif` / `--font-mono` all work — pick the heading's font via its own class (e.g. a display heading in `var(--font-serif)` carries a serif `§` for free).
- Color is `var(--muted-foreground)` → `var(--primary)` on hover: visible on demand, quiet otherwise.

## Notes

- Generate the anchor (id + §) at build time when possible — it is a pure function of the heading text.
