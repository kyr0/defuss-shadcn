---
name: Video Player
type: BLK
section: website
why: The browser's own <video controls> plays, seeks, goes fullscreen and shows captions from a <track> - accessible and keyboard-ready, no player library.
when: Product films, talks, tutorials. A poster with a play button that swaps in the video is product-showcase; a video beside copy is text-media.
where: dist/components/video-player/video-player.css
supportedStates: default
---

# Pattern: Video Player

## Native basis
A `<figure>`: a `<video controls preload="metadata" playsinline poster>` with WebM and MP4 `<source>`s and a captions `<track>`, then a `<figcaption>` with the title, duration and date; optionally chapters or a transcript in `<details>`.

---

## Native Web APIs
- [`<video>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video) - native playback controls
- [`<track>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/track) - captions in WebVTT
- [`<figure>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure) - media with its caption
- [`<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) - native disclosure, no script
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<figure class="mk-video-player">
  <div class="mk-video-player-frame">
    <video id="vp-1" controls preload="metadata" playsinline poster="images/mk-wide3.png">
      <source src="videos/demo.webm" type="video/webm">
      <source src="videos/demo.mp4" type="video/mp4">
      <track kind="captions" src="videos/demo.en.vtt" srclang="en" label="English" default>
      Your browser does not support video. <a href="videos/demo.mp4">Download the video</a>.
    </video>
  </div>
  <figcaption class="mk-video-player-caption">
    <h3>Acme in 60 seconds</h3>
    <div class="mk-video-player-meta"><span><i data-lucide="clock"></i>0:06</span><span><i data-lucide="calendar"></i><time datetime="2026-09-28">28 Sep 2026</time></span><span><i data-lucide="captions"></i>English captions</span></div>
    <p>A feature from rough note to release notes - plan, write and ship on one board.</p>
  </figcaption>
  <ol class="mk-video-player-chapters" aria-label="Chapters">
    <li><time datetime="PT0S">0:00</time>Plan the week</li>
    <li><time datetime="PT2S">0:02</time>Write the docs</li>
    <li><time datetime="PT4S">0:04</time>Ship and share</li>
  </ol>
</figure>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A rounded 16:9 frame, details below |
| `data-variant="theater"` | On a dark band - the video centered, white text |
| `data-variant="transcript"` | A transcript panel beside the video (from 52rem) |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| captions | `<track kind="captions" default>` | Captions on by default - the browser's CC menu switches them |
| controls | `controls` | Native, keyboard-operable controls |
| fallback | a download link inside `<video>` | For browsers without video support |

---

## Notes
- Never autoplay with sound; prefer `preload="metadata"`.
- Host captions on the same origin as the page (or serve them with CORS).
