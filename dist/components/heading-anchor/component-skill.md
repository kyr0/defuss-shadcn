---
name: Heading Anchor
type: ATM
section: primitives
why: A quiet § or # permalink on any heading - a copyable deep link with zero JavaScript, hanging in front of the heading by default.
when: Section permalinks in docs/blogs/specs - in front of the heading (shown on hover), before or after its text.
where: dist/components/heading-anchor/heading-anchor.css
supportedStates: default
---

# Pattern: Heading Anchor

## Native basis
`<a>` element containing the section glyph `§` (or `#`), placed as the first or last child of the heading it links to. No interactivity required - the browser's native fragment navigation does the work.

---

## Native Web APIs
- [`<a>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a) - native anchor with href
- [URL fragment (`:target`)](https://developer.mozilla.org/en-US/docs/Web/CSS/:target) - native deep links, no JS scroll logic
- [`aria-label`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-label) - the glyph alone is not a name; the label carries the section title
- [`:hover`](https://developer.mozilla.org/en-US/docs/Web/CSS/:hover) / [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) / `:target` - the hanging glyph shows while its heading is hovered, the link is focused or the section is the address's target
- [`@media (hover: none)`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/hover) - touch screens get the glyph back in front of the text, always shown

---

## Structure

```html
<h2 id="tokens">
  <a class="heading-anchor" href="#tokens" aria-label="Link to section: Tokens">§</a>
  Tokens
</h2>
```

The default hangs the glyph in front of the heading, in the gutter: the heading's text keeps its own start edge, and
the glyph shows while the heading is hovered, the link is focused or the section is the target. On a touch screen
(`hover: none`) it sits in front of the text, always shown. Leave room for it: about 1.5em of padding or margin at
the heading's start.

The glyph is the link's text - `#` instead of `§`:

```html
<h2 id="tokens">
  <a class="heading-anchor" href="#tokens" aria-label="Link to section: Tokens">#</a>
  Tokens
</h2>
```

Before the heading text, always shown (`data-placement="before"`):

```html
<h2 id="tokens">
  <a class="heading-anchor" href="#tokens" data-placement="before" aria-label="Link to section: Tokens">§</a>
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

| `data-placement` | Purpose                                                                 |
|------------------|-------------------------------------------------------------------------|
| *(none)*, `front` | the default - hangs in front of the heading, shown on hover / focus / target |
| `before`         | in front of the text, inline, always shown                              |
| `after`          | trailing the text, inline, always shown                                 |

`--heading-anchor-gap` (default `0.375rem`) is the room between the glyph and the text.

## Sizes

| `data-size` | Purpose                              |
|-------------|--------------------------------------|
| `xs`        | 0.75rem - fine print, captions       |
| `sm`        | 0.875rem - small headings            |
| `md`        | 1rem - default heading size          |
| `lg`        | 1.125rem - section headings          |
| `xl`        | 1.25rem - page titles                |

Without `data-size` the glyph inherits the heading's own font size (recommended - it then tracks the heading automatically).

---

## Accessibility

- Always set `aria-label="Link to section: {heading text}"` - a bare `§` announces nothing.
- The glyph inherits the heading's font family: the font tokens `--font-sans` / `--font-serif` / `--font-mono` all work - pick the heading's font via its own class (e.g. a display heading in `var(--font-serif)` carries a serif `§` for free).
- Color is `var(--muted-foreground)`, `var(--primary)` on hover: visible on demand, quiet otherwise.
- The hanging default stays reachable by keyboard: a focused anchor shows (`:focus-visible`).

## Notes

- Generate the anchor (id + §) at build time when possible - it is a pure function of the heading text.
