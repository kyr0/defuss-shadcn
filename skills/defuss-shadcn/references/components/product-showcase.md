---
name: Product Showcase
type: BLK
why: A poster frame + one real <button> starts a native <video controls> - the browser draws every playback affordance once the video is visible.
when: Hero pairing or standalone product video; a static screenshot needs only the poster <img> (drop the video and button).
where: dist/components/product-showcase/product-showcase.css + dist/components/product-showcase/product-showcase.js
supportedStates: default, playing
---

# Pattern: Product Showcase

## Native basis

`<figure>` wrapper with three stacked layers - poster `<img>`, `<video controls>`,
and a circular play `<button>`. Clicking the button (or pressing Enter on it —
it's a real button) flips `data-state` to `playing`: CSS hides the poster and
button, reveals the video, and JS starts muted playback. From then on the UA
renders play/pause, scrubber, volume, and fullscreen. Native pause flips the
state back so the poster returns.

---

## Native Web APIs
- [(`<video>`)](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video) - native playback UI + `controls`
- [(`<source type>`)](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/source) - codec fallback (webm → mp4)
- [`preload="metadata"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video#preload) - cheap first paint once revealed
- [`aspect-ratio`](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio) - stable 5:3 box, zero layout shift on the swap
- [(`popovertarget`-free first click)](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button) - a real `<button>` gets keyboard + AT support for free
- [(`<track>`)](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/track) - captions for real videos
- [Media pause event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/pause_event) - native pause reflects back to the `default` state

---

## Structure

```html
<figure class="mk-showcase">
  <img class="mk-showcase-poster" alt="Product showcase" src="images/poster.png" />
  <video controls preload="metadata" playsinline>
    <source src="videos/demo.webm" type="video/webm" />
    <source src="videos/demo.mp4" type="video/mp4" />
    Your browser does not support embedded video.
  </video>
  <button type="button" class="mk-showcase-play" aria-label="Play video">
    <!-- any inline icon; 24px -->
  </button>
</figure>
```

---

## States

| State     | Meaning                                                                 |
|-----------|-------------------------------------------------------------------------|
| `default` | poster + play button visible; video hidden and unloaded                 |
| `playing` | poster/button hidden (CSS via `data-state`), video visible and playing  |

Drive it per instance without knowing the implementation (AGENTS.md "State API"):

```js
document.querySelector('.mk-showcase').api.setState('playing');
document.querySelector('.mk-showcase').api.getState(); // → { name: 'playing', config: {} }
```

`setState('playing')` plays **muted** - programmatic play must not violate the
autoplay policy or blast audio in a screenshot run. A native pause (or media
end) routes back through `setState('default')`, rewinds to `currentTime = 0`,
and restores the poster.

---

## ARIA

| Attribute      | Element  | Purpose                                        |
|----------------|----------|------------------------------------------------|
| `aria-label`   | button   | "Play video" names the action for AT           |
| `alt`          | img      | poster carries the content description         |
| `controls`     | `video`  | full native keyboard + pointer operation       |
| fallback text  | `video`  | shown when no source plays                     |
| `<track>`      | captions | required accessibility for real videos         |

---

## Notes
- Ship both webm (VP9/AV1) and mp4 (H.264) `<source>`s - Safari wants mp4, Firefox prefers webm.
- Captions are a hard accessibility requirement for real product videos: add `<track kind="captions" src="captions.vtt" default>`.
- The video's `opacity: 0` keeps it in the layout so swapping is a pure visibility flip - no reflow, no poster flash.
- Posters via `<img>` (not `video poster`) because the poster is shown before the video element even preloads; the browser only fetches `preload="metadata"` content once it's revealed.
- The play button lives at `inset: auto; margin: auto` inside the full-inset layer - a native centering trick that survives any icon size.
