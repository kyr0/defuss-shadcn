---
name: Teaser
type: MOL
section: data-display
why: Template content is inert - nothing inside a <template> loads, runs or renders - so a teaser can stand in for a deck, a video or an iframe at the cost of a card; its play button (a native button) morphs the content into place through defuss-morph.
when: Content that is heavy or should start on purpose - a slide deck, a video, an embedded app, a demo - shown as an inviting card first. For media that is always loaded use the Video Player block or Iframe; for a call to action that navigates use CTA.
where: dist/components/teaser/teaser.css + dist/components/teaser/teaser.js
supportedStates: default, played
---

# Pattern: Teaser

## Native basis

A `<section class="teaser">` (or `<div>`) with a [Play Button](../../actions/play-button/component-skill.md),
a title, a text and a `<template class="teaser-content">` holding the real
content. A `<template>`'s content is inert: its images, videos and iframes do
not load and its scripts do not run until it is used. Playing morphs that
content into the teaser with defuss-morph (`df$(el).morph()`), reconciling the
children in place.

## Native Web APIs
- [`<template>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template) - inert content: nothing inside loads before the teaser plays
- [`<button>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button) - the play button: focus, Enter / Space
- [`aspect-ratio`](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio) - `data-ratio`: the teaser takes the size of what it stands for, so the swap does not move the page
- [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) - the content fades in as it arrives
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - the card's focus ring follows its play button; a surrounding aura stops once played
- [`object-fit`](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit) - the poster behind the text
- [`HTMLElement.focus()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus) - after a click the keyboard continues in the content
- [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) - teasers added later initialize too
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - no fade, no scaling
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) / [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - a solid border, the focus in system colours

## Structure

```html
<!-- the aura (Shapes module) draws the eye; it stops once the teaser played -->
<div class="aura" style="--shape-round: var(--radius-xl)">
  <section class="teaser" id="intro" data-ratio="16/9" aria-label="The presentation">
    <button class="play-button" type="button" data-pulse aria-label="Start the presentation"></button>
    <h2 class="teaser-title">Click here to start the presentation!</h2>
    <p class="teaser-text">Every feature of the system, slide by slide.</p>
    <template class="teaser-content">
      <iframe src="deck.html" title="The presentation" style="inline-size:100%; aspect-ratio:16/9; border:0"></iframe>
    </template>
  </section>
</div>

<!-- a poster behind the text, a glass play button -->
<section class="teaser" data-ratio="16/9" aria-label="The product tour">
  <img class="teaser-media" src="poster.jpg" alt="">
  <button class="play-button" type="button" data-variant="glass" data-size="lg" aria-label="Play the product tour"></button>
  <p class="teaser-title">The product tour</p>
  <template class="teaser-content">
    <video src="tour.mp4" controls autoplay playsinline style="inline-size:100%; display:block"></video>
  </template>
</section>
```

- A click anywhere on the card plays it - except on another control inside
  (a link, a button that is not the play button, a field).
- Only the first `template.teaser-content` is used; the teaser's own markup
  comes back with `setState('default')`.
- Scripts inside the content do not run (the markup is parsed, as with
  `innerHTML`); components inside it initialize as usual - their scripts
  watch the document for new elements.

## Variants

| Attribute | Effect |
| --- | --- |
| *(none)* | `--card` surface, `--border` outline, centred content |
| `.teaser-media` child | A photo or a video still behind the text, under a dark scrim; the text turns white |
| `data-ratio` | `16/9` · `4/3` · `1/1` · `21/9` - the teaser takes that shape (none: its content's height) |
| `.aura` wrapper | The Shapes module's attention frame (any aura style); its light stops once played |

## Sizes

The teaser takes its container's width; `data-ratio` or its content sets the
height. Size the play button with its own `data-size`.

## ARIA

| Attribute | Element | Purpose |
| --- | --- | --- |
| `aria-label` | `.teaser` | Names the region before and after it plays - not `aria-labelledby`: the title it would point at goes when the teaser plays |
| `aria-label` | `.play-button` | Says what plays ("Start the presentation") |
| `alt=""` | `.teaser-media` | The poster is decoration; the title carries the meaning |

## Notes

- After a click, focus moves to the content's first control (a link, a button,
  an iframe, a video with controls) - or to the teaser itself (`tabindex="-1"`)
  when the content has none. `setState('played')` from a script leaves focus
  where it is.
- `data-ratio` matching the content's own ratio makes the swap seamless (the
  Getting Started page's deck uses `16/9`).
- The aura is the Shapes module (`theme/utils/shapes.css`): load it for the
  frame; the teaser works without it.

## States

Declared states: `default` (the teaser) · `played` (the content of its template, in its place).

```js
document.querySelector('#intro').api.setState('played');
document.querySelector('#intro').api.getState(); // { name: 'played', config: {} }
```

The api is bound per teaser; the registry global is `df$.shadcn.teaserApi` /
`df$.shadcn.teaserStates`. `data-played` marks a played teaser.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type TeaserState = 'default' | 'played'</code> - `setState(name, config)` takes the config of the state it names (`TeaserStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The teaser: the play button, the title and the text - the content is not loaded. No config. |
| `played` | The content of the teaser's template, morphed in place of the teaser. No config. |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends TeaserState&gt;(name: S, config?: TeaserStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>TeaserStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: TeaserState; config: TeaserStateConfigs[TeaserState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: TeaserState; config: TeaserStateConfigs[TeaserState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: TeaserState; config: TeaserStateConfigs[TeaserState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: TeaserState; config: TeaserStateConfigs[TeaserState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: TeaserState; config: TeaserStateConfigs[TeaserState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.teaserApi.setState&lt;S extends TeaserState&gt;(el: HTMLElement, name: S, config?: TeaserStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>TeaserStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.teaserApi.getState(el: HTMLElement): { name: TeaserState; config: TeaserStateConfigs[TeaserState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: TeaserState; config: TeaserStateConfigs[TeaserState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.teaserApi.render(state: { name: TeaserState; config: TeaserStateConfigs[TeaserState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: TeaserState; config: TeaserStateConfigs[TeaserState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.teaserApi.store(el: HTMLElement): Store&lt;{ name: TeaserState; config: TeaserStateConfigs[TeaserState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: TeaserState; config: TeaserStateConfigs[TeaserState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.teaserApi.commit&lt;S extends TeaserState&gt;(el: HTMLElement, name: S, config?: TeaserStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>TeaserStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.teaserStates: TeaserState[]</code> | The declared states, 'default' first: <code>default</code>, <code>played</code>. |
