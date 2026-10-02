---
name: Session
type: ORG
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
