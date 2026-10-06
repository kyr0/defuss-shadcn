---
name: Session
type: ORG
section: chat
why: A native scroll region with a role="log" transcript - the keyboard scrolls it, a screen reader hears new messages; the runtime only decides where the scroll goes - follow the live edge, let go when the reader scrolls away, keep the place when history loads, anchor new turns - and turns dropped files into an event.
when: A whole chat or assistant conversation - messages (message + bubble + marker) in a transcript that scrolls, with a composer (textarea-group) below. A short static exchange takes a plain .message-list; a feed of cards takes a list.
where: dist/components/session/session.css + dist/components/session/session.js
supportedStates: default, detached, streaming
---

# Pattern: Session

## Native basis

A `.session` frame: a scrolling `.session-viewport` (a focusable region -
arrow keys, Page Up/Down, Home/End scroll it natively) around a
`.session-content` transcript with `role="log"` and
`aria-relevant="additions"`, so assistive tech announces new messages. Rows
are `.session-item`s holding any content - message rows, markers,
separators. A `.session-footer` holds the composer.

The runtime (session.js) adds the chat behaviour, after shadcn's
MessageScroller: it follows the live edge while the reader is at the end
and lets go the moment they scroll up; floating buttons jump back; older
messages prepended above keep the visible row in place; a new turn with
`data-anchor` settles near the top with a peek at the previous one; it
opens at the end, the start or the last anchored turn; it can track which
turn is on screen; files dropped on the session become an event.

---

## Native Web APIs
- [`role="log"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/log_role) + [`aria-relevant`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-relevant) - new messages are announced, removals are not
- [`aria-busy`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-busy) - held while a reply streams, so it is announced once, complete
- [`Element.scrollTo()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTo) + [`scrollend`](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollend_event) - programmatic scrolling that the reader's own scroll logic ignores
- [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) / [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) - appended, prepended and growing messages
- [`overflow-anchor: none`](https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-anchor) - the runtime owns scroll anchoring (the browser's would correct twice)
- [`content-visibility: auto`](https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility) + `contain-intrinsic-size` - off-screen rows skip rendering; long threads stay cheap
- [`overflow-clip-margin`](https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-clip-margin) - widens the paint clip `content-visibility` implies, so bubble tails, reactions and focus rings draw outside a row
- [`position: sticky`](https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky) - the scroll buttons float on the edge of the transcript
- [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) - `data-animate` lets new rows rise in
- [HTML Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API) - `data-drop`: files dropped on the transcript
- [`inert`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert) - a scroll button with nothing to scroll to is out of reach
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - instant jumps, no rise-in

---

## Structure

```html
<section class="session" aria-label="Chat with Sofia" data-drop data-drop-accept="image/*" style="height: 32rem">
  <div class="session-viewport" aria-label="Messages">
    <div class="session-content">
      <div class="session-item" data-message-id="m1">
        <div class="message">…avatar, header, .bubble…</div>
      </div>
      <div class="session-item"><div class="marker" data-variant="separator">…</div></div>
      <div class="session-item" data-message-id="m2" data-anchor>
        <div class="message" data-align="end">…</div>
      </div>
    </div>
    <button type="button" class="session-scroll-button" data-to="end" aria-label="Scroll to the latest message"></button>
  </div>
  <div class="session-footer">
    <form class="textarea-group" data-layout="inline" aria-label="Message composer">…</form>
  </div>
</section>
```

- Give the session a height (or put it in a sized flex column): the
  viewport scrolls inside it. Short threads sit at the bottom.
- The runtime sets `role="region"`, `aria-label="Messages"`,
  `tabindex="0"` on the viewport and `role="log"`,
  `aria-relevant="additions"` on the content unless you author them.
- `.session-scroll-button` with `data-to="end"` floats at the bottom edge,
  `data-to="start"` at the top; each is shown - and reachable - only when
  there is something in its direction. The chevron is drawn by CSS.
- `.session-footer` holds the composer; `.session-status` is a quiet
  status line.

---

## Behaviour (on `.session`)

| Attribute | Default | Meaning |
|-----------|---------|---------|
| `data-default-position` | `end` | Where it opens: `end`, `start`, or `last-anchor` (the last turn with `data-anchor` - best for saved threads) |
| `data-threshold` | `48` | px from the end still counted as "at the end" |
| `data-peek` | `48` | px of the previous row kept visible above an anchored turn |
| `data-anchor` (on an item) | - | An appended turn settles near the top instead of following to the end |
| `data-track` | - | Track the current turn and the visible messages (`session-visibility`, `data-current` on the current anchor) |
| `data-drop` | - | Files dropped on the session → `session-drop`; overlay text from `data-drop-label`, filter with `data-drop-accept` (`image/*, .pdf`) |
| `data-animate` | - | New rows rise in |

The runtime keeps these current for CSS and tests: `data-stick` (following
the live edge), `data-scrollable="start end"` (content beyond each edge),
`data-autoscrolling` (during a programmatic scroll), `data-pending-scroll`
(until the opening position applies), `data-drop-active`,
`data-active` / `inert` on the scroll buttons.

## Events

| Event | Detail | When |
|-------|--------|------|
| `session-drop` | `{ files }` | Files dropped on the session (`data-drop`), filtered by `data-drop-accept` |
| `session-visibility` | `{ currentAnchorId, visibleMessageIds }` | The current turn or the visible rows changed (`data-track`) |

---

## Imperative API - `df$.shadcn.session`

Every method takes the `.session`, its id or a selector.

| Method | Does |
|--------|------|
| `append(s, content, { id, anchor })` | Adds a row (a Node, an HTML string, or a `.session-item`) at the end - followed or anchored as the session decides; returns the item |
| `prepend(s, content \| content[], { id })` | Adds older rows at the start; the reader's place is kept |
| `scrollToEnd(s, { smooth })` | Back to the live edge (re-engages following) |
| `scrollToStart(s, { smooth })` | To the first message |
| `scrollToMessage(s, id, { smooth })` | To the row with `data-message-id` - anchored with the peek |
| `isAtEnd(s)` | Whether the reader is at the live edge |

---

## States

| State | Meaning |
|-------|---------|
| `default` | Following the live edge - new messages scroll into view |
| `detached` | Not following: the reader scrolled away, or a turn anchored. `{ to: 'start' \| messageId }` scrolls there |
| `streaming` | A reply is being written: `aria-busy="true"` on the log; the transcript follows it while the reader is at the end. `default` ends it |

```js
const s = df$('#chat').get(0);
s.api.setState('streaming');           // before the first token
// … tokens arrive, the bubble grows, the session follows
s.api.setState('default');             // the reply is complete
s.api.setState('detached', { to: 'start' });
s.api.getState(); // → { name: 'detached', config: { to: 'start' } }
```

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type SessionState = 'default' | 'detached' | 'streaming'</code> - `setState(name, config)` takes the config of the state it names (`SessionStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Following the live edge - new messages scroll into view (scrolls to the end). <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>smooth?</code></td><td><code>boolean</code></td><td>false jumps to the end instead of scrolling smoothly</td></tr></table> |
| `detached` | Not following: the reader scrolled away, or a turn anchored. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>to?</code></td><td><code>string</code></td><td>where to scroll: 'start', or a message's data-message-id</td></tr></table> |
| `streaming` | A reply is being written: aria-busy on the log; it follows the reply while the reader is at the end - default ends it. No config. |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends SessionState&gt;(name: S, config?: SessionStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>SessionStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: SessionState; config: SessionStateConfigs[SessionState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: SessionState; config: SessionStateConfigs[SessionState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: SessionState; config: SessionStateConfigs[SessionState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: SessionState; config: SessionStateConfigs[SessionState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: SessionState; config: SessionStateConfigs[SessionState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.sessionApi.setState&lt;S extends SessionState&gt;(el: HTMLElement, name: S, config?: SessionStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>SessionStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.sessionApi.getState(el: HTMLElement): { name: SessionState; config: SessionStateConfigs[SessionState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: SessionState; config: SessionStateConfigs[SessionState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.sessionApi.render(state: { name: SessionState; config: SessionStateConfigs[SessionState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: SessionState; config: SessionStateConfigs[SessionState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.sessionApi.store(el: HTMLElement): Store&lt;{ name: SessionState; config: SessionStateConfigs[SessionState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: SessionState; config: SessionStateConfigs[SessionState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.sessionApi.commit&lt;S extends SessionState&gt;(el: HTMLElement, name: S, config?: SessionStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>SessionStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.sessionStates: SessionState[]</code> | The declared states, 'default' first: <code>default</code>, <code>detached</code>, <code>streaming</code>. |

### `df$.shadcn.session`

| Member | Description |
|---|---|
| <code>append(target: string \| HTMLElement, content: string \| Node, options?: SessionItemOptions): HTMLElement</code> | Adds a message at the end; follows (or anchors) as the session decides. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .session element, its id or a selector</td></tr><tr><td><code>content</code></td><td><code>string \| Node</code></td><td>the message: markup, a node, or a ready .session-item</td></tr><tr><td><code>options?</code></td><td><code>SessionItemOptions</code></td><td>its id and whether it is an anchor</td></tr></table> <b>Returns</b> <code>HTMLElement</code> - the .session-item added |
| <code>prepend(target: string \| HTMLElement, content: string \| Node \| Array&lt;string \| Node&gt;, options?: SessionItemOptions): HTMLElement[]</code> | Adds older messages at the start; the reader's place is kept. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .session element, its id or a selector</td></tr><tr><td><code>content</code></td><td><code>string \| Node \| Array&lt;string \| Node&gt;</code></td><td>one message or several (markup, nodes or .session-items), oldest first</td></tr><tr><td><code>options?</code></td><td><code>SessionItemOptions</code></td><td>an id and the anchor flag for every message added</td></tr></table> <b>Returns</b> <code>HTMLElement[]</code> - the .session-items added, in order |
| <code>scrollToEnd(target: string \| HTMLElement, options?: SessionScrollOptions): void</code> | Scroll to the newest message and follow again. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .session element, its id or a selector</td></tr><tr><td><code>options?</code></td><td><code>SessionScrollOptions</code></td><td>smooth: false jumps instead of scrolling smoothly (default true)</td></tr></table> |
| <code>scrollToStart(target: string \| HTMLElement, options?: SessionScrollOptions): void</code> | Scroll to the oldest message (the session stops following). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .session element, its id or a selector</td></tr><tr><td><code>options?</code></td><td><code>SessionScrollOptions</code></td><td>smooth: false jumps instead of scrolling smoothly (default true)</td></tr></table> |
| <code>scrollToMessage(target: string \| HTMLElement, id: string, options?: SessionScrollOptions): boolean</code> | Bring a message into view by id. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .session element, its id or a selector</td></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the message's data-message-id</td></tr><tr><td><code>options?</code></td><td><code>SessionScrollOptions</code></td><td>smooth: false jumps instead of scrolling smoothly (default true)</td></tr></table> <b>Returns</b> <code>boolean</code> - false when the session has no such message |
| <code>isAtEnd(target: string \| HTMLElement): boolean</code> | Whether the reader is at the end (within data-threshold, 48px by default). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .session element, its id or a selector</td></tr></table> <b>Returns</b> <code>boolean</code> - true when following is on - new messages scroll into view |

### Events

| Event | Description |
|---|---|
| `session-drop` | Fires when files are dropped on the session (data-drop) - the accepted files. <code>detail</code>: <code>SessionDropDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>files</code></td><td><code>File[]</code></td><td>the dropped files data-drop accepts</td></tr></table> |
| `session-visibility` | Fires when the messages in view change - the current anchor's id and the ids of the visible messages. <code>detail</code>: <code>SessionVisibilityDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>currentAnchorId</code></td><td><code>string \| null</code></td><td>the id of the anchor the reader is in, null when none has an id</td></tr><tr><td><code>visibleMessageIds</code></td><td><code>string[]</code></td><td>the ids of the messages in view, in order</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `SessionDropDetail` | What session-drop carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>files</code></td><td><code>File[]</code></td><td>the dropped files data-drop accepts</td></tr></table> |
| `SessionItemOptions` | How an added message is marked. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id?</code></td><td><code>string</code></td><td>its data-message-id - what scrollToMessage() and session-visibility name it by</td></tr><tr><td><code>anchor?</code></td><td><code>boolean</code></td><td>true: an anchor - a turn the reader lands on and the visibility event reports</td></tr></table> |
| `SessionScrollOptions` | How a scroll moves. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>smooth?</code></td><td><code>boolean</code></td><td>false jumps instead of scrolling smoothly (default true)</td></tr></table> |
| `SessionVisibilityDetail` | What session-visibility carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>currentAnchorId</code></td><td><code>string \| null</code></td><td>the id of the anchor the reader is in, null when none has an id</td></tr><tr><td><code>visibleMessageIds</code></td><td><code>string[]</code></td><td>the ids of the messages in view, in order</td></tr></table> |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| `.session` | `aria-label` | Names the conversation ("Chat with Sofia") |
| `.session-viewport` | `role="region"`, `aria-label`, `tabindex="0"` | A focusable, labelled scroll region (set by the runtime when missing) |
| `.session-content` | `role="log"`, `aria-relevant="additions"`, `aria-busy` | New messages are announced; a streaming reply once it is done |
| `.session-scroll-button` | `aria-label`, `inert` when inactive | "Scroll to the latest message" |

## Notes

- The scrolling stays native: the reader's own scroll always wins - the
  session never pulls them back while they read history.
- Content-visibility keeps thousands of rows cheap; virtualize beyond that
  (see virtual-list).
- Drops are an event, not an upload: the page decides what to do with the
  files - the doc page hands them to the composer as attachments.
- Compose rows from message, bubble and marker; the composer is the
  textarea's `.textarea-group`.
