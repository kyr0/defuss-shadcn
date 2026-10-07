---
name: Iframe
type: ATM
section: data-display
why: The native iframe embeds a whole page in isolation; this adds what it lacks - a size that fits its container (ratio, the container's height, or the framed page's content height) and a checked postMessage bridge in both directions.
when: Embedding another page - a demo, a dashboard, a model card, a document - that should size itself to where it sits, or talk to the host page. A video uses the Video Player block; your own markup belongs in the page, not in a frame.
where: dist/components/iframe/iframe.css + dist/components/iframe/iframe.js
supportedStates: default, loaded
---

# Pattern: Iframe

## Native basis

`<figure class="iframe">` around a native `<iframe class="iframe-frame">` and an
optional `<figcaption class="iframe-caption">`. The iframe keeps everything the
platform gives it - its own document, `title` for assistive technology,
`loading="lazy"`, `sandbox`, `allow`, `referrerpolicy`. The component adds the
fit and the message bridge.

## Native Web APIs
- [`<iframe>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe) - the embedded browsing context, its `sandbox`, `allow`, `loading="lazy"` and `srcdoc`
- [`Window.postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) - the message bridge, checked by `event.source` and `event.origin`
- [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) - follows a framed document's height (same origin, or inside the framed page)
- [`aspect-ratio`](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio) - the default fit: full width, height from `--iframe-ratio`
- [`X-Frame-Options`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options) / [CSP `frame-ancestors`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors) - the embedded site decides whether it may be framed at all
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - stops the loading shimmer

## Structure

```html
<!-- fit by ratio (default): the container's width, a 16:9 height -->
<figure class="iframe" id="embed-demo">
  <iframe class="iframe-frame" src="https://example.org/demo" title="Live demo" loading="lazy"></iframe>
  <figcaption class="iframe-caption">The live demo - <a href="https://example.org/demo" target="_blank" rel="noopener">open it in a new tab</a>.</figcaption>
</figure>

<!-- fill the element it lives in (that element needs a height) -->
<div style="block-size: 24rem;">
  <figure class="iframe" data-fit="container">
    <iframe class="iframe-frame" src="/dashboard.html" title="Dashboard"></iframe>
  </figure>
</div>

<!-- follow the framed page's height; accept messages from another origin -->
<figure class="iframe" data-fit="content" data-origins="https://widgets.example.org">
  <iframe class="iframe-frame" src="https://widgets.example.org/card.html" title="Order card"></iframe>
</figure>
```

### The framed page

A same-origin page needs nothing: the host measures it. A page from another
origin reports its height and sends messages itself - with defuss-shadcn
loaded, by opting in:

```html
<html data-iframe-child data-iframe-parent="https://host.example.org">
  <!-- data-iframe-child: report the height while it changes -->
  <!-- data-iframe-parent: post only to this origin (otherwise '*') -->
  <button type="button" onclick="df$.shadcn.iframe.send('select', { id: 'M' })">Choose M</button>
</html>
```

Without defuss-shadcn, it posts the wire format itself - its height whenever it
changes and whenever the host says `hello` (the host greets a `data-fit="content"`
frame on load: a first report sent before the host's script ran would be lost):

```html
<script>
  const host = 'https://host.example.org';
  const report = () => parent.postMessage({ type: 'defuss:iframe', kind: 'size', height: document.documentElement.getBoundingClientRect().height }, host);
  new ResizeObserver(report).observe(document.documentElement);
  addEventListener('message', (e) => { if (e.source === parent && e.origin === host && e.data?.type === 'defuss:iframe' && e.data.kind === 'hello') report(); });
  parent.postMessage({ type: 'defuss:iframe', kind: 'message', name: 'select', detail: { id: 'M' } }, host);
</script>
```

The host listens on the `.iframe` element and acts - this is how the framed page
controls the outer page:

```html
<script type="module">
  df$('#embed-demo').on('iframe-message', (e) => {
    if (e.detail.name === 'select') df$('#variants').get(0).api.setState('default', { selected: e.detail.detail.id });
  });
  df$.shadcn.iframe.post('#embed-demo', 'theme', { dark: true }); // host → framed page (iframe-message on its document)
</script>
```

## Variants

| Attribute | Value | Behavior |
|---|---|---|
| `data-fit` | (none) | Full width; height from `--iframe-ratio` (default `16 / 9`) |
| `data-fit` | `container` | Fills the element it lives in - give that element a height; never smaller than `--iframe-min-height` |
| `data-fit` | `content` | Follows the framed page's height: measured when same-origin, reported by the page otherwise (`--iframe-height`, written by the runtime) |
| `data-variant` | `bare` | No border (`--iframe-border-width: 0px`), radius or placeholder background - the framed page sits flush |
| `data-origins` | space-separated origins | Origins whose messages and size reports are accepted besides the page's own; `null` admits a sandboxed `srcdoc` frame |

## ARIA

| Element | Attribute | Notes |
|---|---|---|
| `.iframe-frame` | `title` | Required: names the embedded page for screen readers ("Live demo") |
| `.iframe` | `<figure>` + `<figcaption>` | The caption is the figure's accessible description; put the "open in a new tab" link there |

## States

| State | Meaning |
|---|---|
| `default` | Not loaded yet - the placeholder shimmers (stopped under reduced motion). |
| `loaded` | The framed page loaded: `data-loaded` on the figure. The frame's `load` event sets it; `setState` can too. |

```js
document.querySelector('#embed-demo').api.setState('loaded');
```

## Notes

- **Can the page be framed at all?** The embedded site decides: `X-Frame-Options: DENY` / `SAMEORIGIN` or a CSP `frame-ancestors` without your origin makes the browser refuse it - the frame shows the browser's error page and no script can tell. Hugging Face model pages, for example, send `X-Frame-Options: DENY`. Always caption such embeds with a link that opens the page itself.
- **Your own CSP** must allow the frame's origin in `frame-src` (or `child-src`). Messages need no CSP permission, but the framed page must be allowed to run scripts to send any.
- **Messages are checked twice**: the sender must be the window of a frame this `.iframe` hosts (`event.source`), and its origin must be the page's own or listed in `data-origins`. Anything else on the channel is ignored. Inside the framed page, set `data-iframe-parent` to the host origin so its messages go nowhere else.
- **sandbox**: a frame needs `allow-scripts` to send messages; never combine `allow-scripts` with `allow-same-origin` for content you do not trust - together they let it remove its own sandbox. A sandboxed `srcdoc` without `allow-same-origin` has the origin `null`: list `null` in `data-origins` to accept it.
- **Content height** across origins depends on the framed page: it reports its height (`data-iframe-child`, or the `size` message). Same-origin pages are measured by the root element's box, so body margins count.
- The figure's width is always its container's: in a grid track, a flex item or a card it adapts without a media query. Every fit sizes the whole frame, border included (`box-sizing: border-box`; `--iframe-border-width`, default 1px).
- A frame that finished loading before the script ran is still marked `loaded`: the page's own load event waits for every frame in it.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type IframeState = 'default' | 'loaded'</code> - `setState(name, config)` takes the config of the state it names (`IframeStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Not loaded yet - the frame shows its placeholder shimmer. No config. |
| `loaded` | The framed page loaded (set by the frame's load event, or by setState). No config. |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends IframeState&gt;(name: S, config?: IframeStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>IframeStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: IframeState; config: IframeStateConfigs[IframeState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: IframeState; config: IframeStateConfigs[IframeState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: IframeState; config: IframeStateConfigs[IframeState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: IframeState; config: IframeStateConfigs[IframeState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: IframeState; config: IframeStateConfigs[IframeState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.iframeApi.setState&lt;S extends IframeState&gt;(el: HTMLElement, name: S, config?: IframeStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>IframeStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.iframeApi.getState(el: HTMLElement): { name: IframeState; config: IframeStateConfigs[IframeState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: IframeState; config: IframeStateConfigs[IframeState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.iframeApi.render(state: { name: IframeState; config: IframeStateConfigs[IframeState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: IframeState; config: IframeStateConfigs[IframeState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.iframeApi.store(el: HTMLElement): Store&lt;{ name: IframeState; config: IframeStateConfigs[IframeState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: IframeState; config: IframeStateConfigs[IframeState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.iframeApi.commit&lt;S extends IframeState&gt;(el: HTMLElement, name: S, config?: IframeStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>IframeStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.iframeStates: IframeState[]</code> | The declared states, 'default' first: <code>default</code>, <code>loaded</code>. |

### `df$.shadcn.iframe`

| Member | Description |
|---|---|
| <code>post(target: string \| HTMLElement, name: string, detail?: unknown): boolean</code> | Post a named message into a framed page; it arrives there as an iframe-message event on the document (or as a plain message event carrying { type: 'defuss:iframe', kind: 'message', name, detail }). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .iframe element or its selector</td></tr><tr><td><code>name</code></td><td><code>string</code></td><td>the message name</td></tr><tr><td><code>detail?</code></td><td><code>unknown</code></td><td>the payload, structured-cloned</td></tr></table> <b>Returns</b> <code>boolean</code> - false when the frame has no window yet |
| <code>send(name: string, detail?: unknown): boolean</code> | Post a named message to the host page - called from inside a framed page; the host's .iframe element fires iframe-message. Set data-iframe-parent on the framed page's html element to the host origin to post to it only. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>string</code></td><td>the message name</td></tr><tr><td><code>detail?</code></td><td><code>unknown</code></td><td>the payload, structured-cloned</td></tr></table> <b>Returns</b> <code>boolean</code> - false when this page is not framed |
| <code>resize(target: string \| HTMLElement): boolean</code> | Measure a same-origin frame's content again (data-fit="content"). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .iframe element or its selector</td></tr></table> <b>Returns</b> <code>boolean</code> - false when the framed document is not readable (cross-origin: it reports its own height) |

### Events

| Event | Description |
|---|---|
| `iframe-message` | Fires on the framed page's document when its host page posts a message (df$.shadcn.iframe.post) - the name, the payload and the host's origin. <code>detail</code>: <code>IframeMessageDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>string</code></td><td>the message name the sender chose</td></tr><tr><td><code>detail</code></td><td><code>unknown</code></td><td>its payload, structured-cloned across the frame boundary</td></tr><tr><td><code>origin</code></td><td><code>string</code></td><td>the origin it came from ('null' for a sandboxed srcdoc frame)</td></tr></table> |
| `iframe-resize` | Fires when the framed page's content height changes (data-fit="content") - the new height. <code>detail</code>: <code>IframeResizeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>height</code></td><td><code>number</code></td><td>the framed page's content height in CSS pixels</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `IframeMessageDetail` | What an iframe-message event carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>string</code></td><td>the message name the sender chose</td></tr><tr><td><code>detail</code></td><td><code>unknown</code></td><td>its payload, structured-cloned across the frame boundary</td></tr><tr><td><code>origin</code></td><td><code>string</code></td><td>the origin it came from ('null' for a sandboxed srcdoc frame)</td></tr></table> |
| `IframeResizeDetail` | What an iframe-resize event carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>height</code></td><td><code>number</code></td><td>the framed page's content height in CSS pixels</td></tr></table> |
