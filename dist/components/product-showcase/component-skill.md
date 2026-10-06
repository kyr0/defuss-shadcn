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
and a circular play `<button>`. Clicking the button (or pressing Enter on it,
since it's a real button) flips `data-state` to `playing`: CSS hides the poster and
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

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type ProductShowcaseState = 'default' | 'playing'</code> - `setState(name, config)` takes the config of the state it names (`ProductShowcaseStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The poster and the play button; the video hidden and unloaded. No config. |
| `playing` | The video visible and playing (muted); poster and button hidden. No config. |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends ProductShowcaseState&gt;(name: S, config?: ProductShowcaseStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ProductShowcaseStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: ProductShowcaseState; config: ProductShowcaseStateConfigs[ProductShowcaseState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: ProductShowcaseState; config: ProductShowcaseStateConfigs[ProductShowcaseState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: ProductShowcaseState; config: ProductShowcaseStateConfigs[ProductShowcaseState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: ProductShowcaseState; config: ProductShowcaseStateConfigs[ProductShowcaseState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: ProductShowcaseState; config: ProductShowcaseStateConfigs[ProductShowcaseState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.productShowcaseApi.setState&lt;S extends ProductShowcaseState&gt;(el: HTMLElement, name: S, config?: ProductShowcaseStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ProductShowcaseStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.productShowcaseApi.getState(el: HTMLElement): { name: ProductShowcaseState; config: ProductShowcaseStateConfigs[ProductShowcaseState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: ProductShowcaseState; config: ProductShowcaseStateConfigs[ProductShowcaseState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.productShowcaseApi.render(state: { name: ProductShowcaseState; config: ProductShowcaseStateConfigs[ProductShowcaseState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: ProductShowcaseState; config: ProductShowcaseStateConfigs[ProductShowcaseState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.productShowcaseApi.store(el: HTMLElement): Store&lt;{ name: ProductShowcaseState; config: ProductShowcaseStateConfigs[ProductShowcaseState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: ProductShowcaseState; config: ProductShowcaseStateConfigs[ProductShowcaseState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.productShowcaseApi.commit&lt;S extends ProductShowcaseState&gt;(el: HTMLElement, name: S, config?: ProductShowcaseStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>ProductShowcaseStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.productShowcaseStates: ProductShowcaseState[]</code> | The declared states, 'default' first: <code>default</code>, <code>playing</code>. |

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| `data-variant="browser"` | A browser window: a bar with three dots on top, the poster / video below it |
| `data-ratio="wide"` / `"square"` | 16:9 or 1:1 instead of the default 5:3 |
| `.mk-showcase-stage` | A stage around the frame - room for `.mk-showcase-callout` cards (`data-pos="top-start|top-end|bottom-start|bottom-end"`) |
| `.mk-showcase-stage[data-tilt]` | The frame leans back and straightens as it scrolls into view (scroll-driven; static under reduced motion) |
| `.mk-showcase-tour` | A product tour: Tabs switch between framed screens |

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
- An embed (YouTube, Vimeo) takes the video's place: an `<iframe>` in the same layer, hidden and click-through until `playing`. A third-party player sets cookies - load it through cookie-consent (`data-cookie-consent` + `data-consent-src` + `data-consent-placeholder="none"`, so the poster and play button stay the placeholder) and keep the poster local: a thumbnail from the video host is already a request to it.
