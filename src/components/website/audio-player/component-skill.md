---
name: Audio Player
type: BLK
section: website
why: The browser's <audio controls> plays, seeks and handles media keys; the block styles the frame around it - no player library.
when: Podcasts, interviews, music, voice notes. A list of tracks uses playlist-item; video uses video-player.
where: dist/components/audio-player/audio-player.css
supportedStates: default
---

# Pattern: Audio Player

## Native basis
An `<article>`: cover art, the title, show or artist and a metadata line (`<time>`), an `<audio controls preload="none">`, and a download link (`download`); show notes in `<details>`.

---

## Native Web APIs
- [`<audio>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio) - native audio controls
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item
- [`<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) - native disclosure, no script
- [`download`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#download) - the link saves the file
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dates

---

## Structure

```html
<article class="mk-audio-player" aria-labelledby="ap-1">
  <img class="mk-audio-player-cover" src="https://picsum.photos/seed/podcast-calm/400/400" alt="">
  <div class="mk-audio-player-body">
    <span class="mk-audio-player-show">The Calm Letter · Audio</span>
    <h3 class="mk-audio-player-title" id="ap-1">Why we never ship on Fridays</h3>
    <span class="mk-audio-player-meta">Episode 42 · 14 sec · <time datetime="2026-09-30">30 Sep 2026</time></span>
  </div>
  <div class="mk-audio-player-controls">
    <audio controls preload="none" src="videos/demo-audio.mp3">Your browser does not support audio.</audio>
    <a class="btn" data-variant="ghost" data-size="icon" href="videos/demo-audio.mp3" download aria-label="Download episode 42 (MP3, 85 KB)"><i data-lucide="download"></i></a>
  </div>
</article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Cover art beside the details and the player |
| `data-variant="compact"` | No cover - one slim row |
| `data-variant="podcast"` | A large cover, episode number, show notes in a disclosure |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| player | `<audio controls>` | Native, keyboard-operable |
| download | `<a download>` | Says the format and size |
| notes | `<details>` | Show notes on request |

---

## Notes
- Offer a transcript for spoken audio.
- `preload="none"` keeps pages light when you list many episodes.
