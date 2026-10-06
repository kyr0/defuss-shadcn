---
name: Image
type: ATM
section: data-display
why: Content image with lazy loading, aspect-ratio control, and an error-state fallback via the State API.
when: Remote images whose loading or failure must be visually controlled.
where: dist/components/image/image.css + dist/components/image/image.js
supportedStates: default, error
---

# Image

## Native basis

`<figure>` element wrapping an `<img>` with optional `<figcaption>`. Uses `<dialog>` for fullscreen preview/lightbox.

## Native Web APIs

- [`<figure>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure) - self-contained content with optional caption
- [`<figcaption>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figcaption) - caption for the figure
- [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) - native modal for fullscreen lightbox preview
- [`::backdrop`](https://developer.mozilla.org/en-US/docs/Web/CSS/::backdrop) - overlay behind lightbox dialog
- [`loading="lazy"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#loading) - native lazy loading
- [`object-fit`](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit) - how image fills its container
- [`aspect-ratio`](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio) - intrinsic aspect ratio control
- [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) - entry animation for lightbox
- [`Image()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/Image) - off-DOM preload of the standard source before the progressive swap
- [`matchMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia) - `(min-resolution: 2dppx)` picks the high-res source on retina displays

## Structure

### Basic image
```html
<figure class="image">
  <img src="photo.jpg" alt="Description" />
</figure>
```

### With caption
```html
<figure class="image">
  <img src="photo.jpg" alt="Description" />
  <figcaption class="image-caption">Photo caption text</figcaption>
</figure>
```

### With fallback
```html
<figure class="image">
  <img src="photo.jpg" alt="Description" />
  <div class="image-fallback">
    <svg><!-- fallback icon --></svg>
  </div>
</figure>
```

### With lightbox preview
```html
<figure class="image" data-preview>
  <img src="photo.jpg" alt="Description" />
</figure>
```

### With a lightbox-only original
```html
<figure class="image" data-preview>
  <img src="photo-800.jpg" data-src-full="photo-2400.jpg" alt="Description" />
</figure>
```

### With aspect ratio
```html
<figure class="image" data-ratio="16/9">
  <img src="photo.jpg" alt="Description" />
</figure>
```

### With progressive sources
```html
<figure class="image">
  <img src="photo.jpg" data-src-low="photo-low.jpg" data-src-high="photo@2x.jpg" alt="Description" />
</figure>
```

## Variants

### Fit (`data-fit`)

| Value       | Behavior                        |
| ----------- | ------------------------------- |
| *(default)* | `object-fit: cover` (fills)     |
| `contain`   | Fits inside, preserves ratio    |
| `fill`      | Stretches to fill               |
| `none`      | No resizing, natural size       |

### Ratio (`data-ratio`)

| Value   | Aspect ratio  |
|---------|--------------|
| `1/1`   | Square        |
| `4/3`   | Standard      |
| `3/2`   | Classic photo |
| `16/9`  | Widescreen    |
| `21/9`  | Ultra-wide    |
| `3/4`   | Portrait      |

### Radius (`data-radius`)

| Value       | Border radius          |
| ----------- | ---------------------- |
| *(default)* | `var(--radius-lg)`     |
| `none`      | `0`                    |
| `sm`        | `var(--radius-sm)`     |
| `md`        | `var(--radius-md)`     |
| `full`      | `9999px` (pill/circle) |

## Attributes

| Attribute       | Effect                                                              |
| --------------- | ------------------------------------------------------------------- |
| `data-preview`  | Enables click-to-preview lightbox                                   |
| `data-ratio`    | Sets aspect ratio                                                   |
| `data-fit`      | Sets object-fit mode                                                |
| `data-radius`   | Sets border radius variant                                          |
| `data-src-low`  | Low-res placeholder, shown (blurred) until the real source is ready |
| `data-src-high` | High-res source for ≥2dppx displays and lightbox zoom               |
| `data-src-full` | Large original shown only in the lightbox (with `data-preview`)     |

## Lightbox

When `data-preview` is set, clicking the image opens a fullscreen `<dialog>` lightbox with:
- Zoom in / zoom out controls
- Rotate left / rotate right
- Reset to original
- Close button and Escape key
- Click backdrop to close

The lightbox dialog is created once and shared by all preview-enabled images.

With `data-src-full` on the img, the lightbox shows that original instead of the inline source. The page never downloads it: the lightbox opens at once with the already-loaded inline image, sized to the frame the original will fill (up to 90vw × 85vh), preloads the original off-DOM and swaps it in without a layout jump. The figure keeps its own `src`, and the zoom-in `data-src-high` upgrade is skipped (the original already covers it).

## Hover gallery

```html
<figure class="hover-gallery" data-indicator data-ratio="1/1">
  <img src="front.jpg" alt="Speaker, front">
  <img src="side.jpg" alt="Speaker, side">
  <img src="back.jpg" alt="Speaker, back">
</figure>
```

daisyUI's hover gallery, CSS only. 2 - 10 images share one frame; the first
shows, and the frame is sliced into as many invisible strips as there are
images - moving the pointer across shows image k in strip k (back at the
start, the first returns). `:has()` counts the images, `clip-path` cuts the
strips.

| Attribute | Effect |
| --- | --- |
| `data-ratio` | `1/1`, `3/4`, `16/9` (default 4/3) |
| `data-indicator` | A segmented position bar on hover; `="always"` keeps it |
| `data-effect="zoom"` | The image in view eases in slightly larger (off for reduced motion) |
| `data-direction="vertical"` | Rows instead of columns - move top to bottom |

- Touch screens (no hover): the same markup is a swipeable scroll-snap strip.
- With image.js loaded, every image loads eagerly and is decoded once the
  gallery nears the viewport; the gallery switches only when all are ready
  (`data-ready`) - no half-loaded frame, no flash of the first image. The
  switch itself is instant (a crossfade would let the first image shine
  through).
- Every image keeps its own `alt`; the images are content, not decoration.
- Inside a link card (`<a class="card">`) the whole card stays one link.

## Accessibility

- `<img>` must have a descriptive `alt` attribute
- Decorative images should use `alt=""`
- `<figcaption>` provides visible caption text
- Lightbox dialog uses `aria-label="Image preview"`
- Lightbox controls have `aria-label` attributes
- Escape key closes lightbox (native `<dialog>` behavior)

## States

The api is bound **per `<figure class="image">`**. Declared states:
`default` (loaded) · `error` (`.image-fallback` revealed, same as a failed
load).

```js
document.querySelector('#hero-figure').api.setState('error');
document.querySelector('#hero-figure').api.getState(); // { name: 'error', config: {} }
```

The registry global is `df$.shadcn.imageApi` / `df$.shadcn.imageStates`.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type ImageState = 'default' | 'error'</code> - `setState(name, config)` takes the config of the state it names (`ImageStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The image shows. No config. |
| `error` | The image failed to load - the fallback shows (set by the error event, or by setState). No config. |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends ImageState&gt;(name: S, config?: ImageStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ImageStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: ImageState; config: ImageStateConfigs[ImageState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: ImageState; config: ImageStateConfigs[ImageState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: ImageState; config: ImageStateConfigs[ImageState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: ImageState; config: ImageStateConfigs[ImageState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: ImageState; config: ImageStateConfigs[ImageState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.imageApi.setState&lt;S extends ImageState&gt;(el: HTMLElement, name: S, config?: ImageStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ImageStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.imageApi.getState(el: HTMLElement): { name: ImageState; config: ImageStateConfigs[ImageState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: ImageState; config: ImageStateConfigs[ImageState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.imageApi.render(state: { name: ImageState; config: ImageStateConfigs[ImageState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: ImageState; config: ImageStateConfigs[ImageState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.imageApi.store(el: HTMLElement): Store&lt;{ name: ImageState; config: ImageStateConfigs[ImageState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: ImageState; config: ImageStateConfigs[ImageState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.imageApi.commit&lt;S extends ImageState&gt;(el: HTMLElement, name: S, config?: ImageStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>ImageStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.imageStates: ImageState[]</code> | The declared states, 'default' first: <code>default</code>, <code>error</code>. |

## Notes

- Fallback is shown automatically when the image fails to load, using `:has()` to detect error state.
- Use `loading="lazy"` on images below the fold for performance.
- Lightbox supports keyboard: Escape closes, Tab navigates controls.
- Multiple images with `data-preview` share a single dialog instance.
- While the lightbox is modal, `html:has(dialog.image-lightbox:modal)` sets `overflow: hidden` + `scrollbar-gutter: stable` - the page behind cannot scroll and its position is preserved for when the lightbox closes (no JS scroll-lock).
- Progressive sources: with `data-src-low`, the img swaps to the low-res URL at init and carries `data-loading` (CSS blurs it) until the standard `src` - preloaded off-DOM via `new Image()` - is ready and swapped in. If the browser already fetched the standard `src` before the component JS ran, the swap is simply instant.
- With `data-src-high`, the high-res source replaces the standard one on ≥2dppx displays (`matchMedia('(min-resolution: 2dppx)')`); on lower densities it stays unloaded until the first lightbox zoom-in, which upgrades both the lightbox and the figure img (once - later zooms reuse it).
