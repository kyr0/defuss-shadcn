---
name: Playlist Item
type: BLK
section: website
why: Each item is a radio input in a label: one selection, arrow keys move it, :has(:checked) highlights it and animates the bars - no script.
when: Track lists, episode lists, lesson lists. The player itself is audio-player or video-player.
where: dist/components/playlist-item/playlist-item.css
supportedStates: default
---

# Pattern: Playlist Item

## Native basis
An `<li>` in an `<ol class="mk-playlist">` holding a `<label>` around a radio input: the index (replaced by animated bars when selected), a cover, title and artist, and the duration.

---

## Native Web APIs
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`<ol>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol) - an ordered sequence
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - motion stands still on request

---

## Structure

```html
<ol class="mk-playlist" role="radiogroup" aria-label="Album: Quiet Hours" style="max-width:34rem">
  <li class="mk-playlist-item">
    <label>
      <input type="radio" name="track" value="1">
      <span class="mk-playlist-item-index" aria-hidden="true"><span>1</span><i class="mk-playlist-item-bars"><b></b><b></b><b></b></i></span>
      <img class="mk-playlist-item-cover" src="https://picsum.photos/seed/pl-1/160/160" alt="">
      <span class="mk-playlist-item-text"><strong>First Light</strong><small>Nordlicht</small></span>
      <span class="mk-playlist-item-duration">3:42</span>
    </label>
  </li>
  <li class="mk-playlist-item">
    <label>
      <input type="radio" name="track" value="2" checked>
      <span class="mk-playlist-item-index" aria-hidden="true"><span>2</span><i class="mk-playlist-item-bars"><b></b><b></b><b></b></i></span>
      <img class="mk-playlist-item-cover" src="https://picsum.photos/seed/pl-2/160/160" alt="">
      <span class="mk-playlist-item-text"><strong>Harbour Lines</strong><small>Nordlicht</small></span>
      <span class="mk-playlist-item-duration">4:05</span>
    </label>
  </li>
  <li class="mk-playlist-item">
    <label>
      <input type="radio" name="track" value="3">
      <span class="mk-playlist-item-index" aria-hidden="true"><span>3</span><i class="mk-playlist-item-bars"><b></b><b></b><b></b></i></span>
      <img class="mk-playlist-item-cover" src="https://picsum.photos/seed/pl-3/160/160" alt="">
      <span class="mk-playlist-item-text"><strong>Slow Tram</strong><small>Nordlicht feat. Mar</small></span>
      <span class="mk-playlist-item-duration">2:58</span>
    </label>
  </li>
  <li class="mk-playlist-item">
    <label>
      <input type="radio" name="track" value="4">
      <span class="mk-playlist-item-index" aria-hidden="true"><span>4</span><i class="mk-playlist-item-bars"><b></b><b></b><b></b></i></span>
      <img class="mk-playlist-item-cover" src="https://picsum.photos/seed/pl-4/160/160" alt="">
      <span class="mk-playlist-item-text"><strong>Tiles in the Rain</strong><small>Nordlicht</small></span>
      <span class="mk-playlist-item-duration">5:11</span>
    </label>
  </li>
</ol>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A track row: index, cover, title, artist, duration |
| `data-variant="episode"` | A larger cover, the date and a two-line description |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| list | `<ol>` + `role="radiogroup"` label | One item is selected; arrow keys move between them |
| selected | `input:checked` | Announced as checked; the bars are decorative |

---

## Notes
- Wire the change event to your player to actually play - the block only selects.
