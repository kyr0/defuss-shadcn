---
name: News Ticker
type: BLK
why: The headline list runs twice in one track (the copy is inert and aria-hidden) sliding by half its width - a seamless loop in pure CSS; :hover / :focus-within pause it, prefers-reduced-motion turns it into a scrolling row.
when: A strip of latest or breaking headlines above a news front. A list someone should read takes news-item (compact).
where: dist/components/news-ticker/news-ticker.css
supportedStates: default
---

# Pattern: News Ticker

## Native basis
A labelled `<section>` with one list of headline links - repeated once in the same track, `inert` and `aria-hidden`, so the loop is seamless while assistive tech and the tab order see each headline once. A CSS animation slides the track; hover and focus pause it.

Built from: [Badge](../badge/component-skill.md).

---

## Native Web APIs
- [`CSS animations`](https://developer.mozilla.org/en-US/docs/Web/CSS/animation) - the marquee
- [`inert`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert) - the loop copy leaves tab order and a11y tree
- [`:focus-within`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-within) - keyboard focus pauses
- [`mask-image`](https://developer.mozilla.org/en-US/docs/Web/CSS/mask-image) - soft edges
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - stops, scrolls by hand

---

## Structure

```html
<section class="mk-news-ticker" aria-label="Latest headlines">
  <span class="mk-news-ticker-label">Latest</span>
  <div class="mk-news-ticker-viewport">
    <div class="mk-news-ticker-track">
    <ul class="mk-news-ticker-items">
      <li><a href="#"><time>09:41</time> Acme 4.0 ships with offline sync</a></li>
      <li><a href="#"><time>09:12</time> Shared spaces open to every team</a></li>
      <li><a href="#"><time>08:30</time> Passkeys become the default sign-in</a></li>
      <li><a href="#"><time>07:55</time> Acme opens an office in Lisbon</a></li>
      <li><a href="#"><time>Yesterday</time> Status: eu-west sync delays resolved</a></li>
    </ul>
    <ul class="mk-news-ticker-items" aria-hidden="true" inert>
      <li><a href="#"><time>09:41</time> Acme 4.0 ships with offline sync</a></li>
      <li><a href="#"><time>09:12</time> Shared spaces open to every team</a></li>
      <li><a href="#"><time>08:30</time> Passkeys become the default sign-in</a></li>
      <li><a href="#"><time>07:55</time> Acme opens an office in Lisbon</a></li>
      <li><a href="#"><time>Yesterday</time> Status: eu-west sync delays resolved</a></li>
    </ul>
    </div>
  </div>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| *(omitted)* | A primary label and the running headlines |
| `data-variant="breaking"` | A red label with a pulsing dot |
| `data-variant="static"` | No motion - the row scrolls by hand (also what reduced motion gets) |
| `data-size="sm"` | A slimmer strip |
| `data-variant="market"` | A stock strip: dark label, mono numbers, `.mk-news-ticker-trend` (`data-trend="up"` green ▲ / `"down"` red ▼) |
| `data-variant="inverse"` | A dark band with a primary label |
| `data-variant="pill"` | A rounded floating strip with a pill label |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| strip | `<section aria-label="Latest headlines">` | A named region |
| loop copy | `aria-hidden="true" inert` | Announced once, focused once |
| motion | pauses on `:hover` / `:focus-within` | WCAG 2.2.2 - and stops under reduced motion |

---

## Notes
- Duplicate the list exactly - the track slides by 50%, so both halves must be the same width.
- Set the speed with `--mk-news-ticker-duration` (longer = slower); more headlines need more time.
