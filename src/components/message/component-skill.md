---
name: Message
type: MOL
why: A message row is layout - an avatar column beside a header / surface / footer column, start or end - so it is CSS; the avatar lines up with the surface's bottom edge (not the footer's), groups keep one avatar and one header.
when: Each row of a chat or an assistant thread - sender avatar, name and time, the bubble (or attachment), delivery status and actions. The bare surface is bubble; inline status lines between rows are marker.
where: dist/components/message/message.css
supportedStates: default
---

# Message

## Native basis

A `<div class="message">` row: a `.message-avatar` slot (an `.avatar`, or
empty to keep the column) and a `.message-content` column with an optional
`.message-header` (`.message-name`, `<time class="message-time">`), the
surface - a `.bubble`, a `.message-attachment`, anything - and an optional
`.message-footer` (time, `.message-status`, action buttons). A
`.message-group` stacks one sender's consecutive rows; a `.message-list`
(`role="log"`) is the conversation. CSS only - after shadcn/ui's Message,
plus sizes, delivery status, hover-revealed actions and attachment cards.

## Native Web APIs

- [`<time datetime>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable timestamps in header and footer
- [`role="log"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/log_role) - the conversation: new rows are announced politely
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - the avatar lifts above a footer only when there is one; a ghost reply widens its column
- [`@media (hover)`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/hover) - hover-revealed actions stay visible on touch screens
- [Flexbox `row-reverse`](https://developer.mozilla.org/en-US/docs/Web/CSS/flex-direction) + logical properties - end-aligned rows and RTL mirror with no extra rules
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) / [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

## Structure

```html
<div class="message-list" role="log" aria-label="Conversation with Sofia">

  <!-- received -->
  <div class="message">
    <div class="message-avatar">
      <span class="avatar" data-size="sm"><img class="avatar-image" src="…" alt="Sofia"><span class="avatar-fallback">SD</span></span>
    </div>
    <div class="message-content">
      <div class="message-header"><span class="message-name">Sofia Davis</span><time class="message-time" datetime="2026-09-30T10:42">10:42</time></div>
      <div class="bubble" data-variant="secondary"><div class="bubble-content">Did the release go out?</div></div>
    </div>
  </div>

  <!-- sent, with delivery status -->
  <div class="message" data-align="end">
    <div class="message-avatar"><span class="avatar" data-size="sm"><span class="avatar-fallback">ME</span></span></div>
    <div class="message-content">
      <div class="bubble"><div class="bubble-content">Yes, 5 minutes ago.</div></div>
      <div class="message-footer"><time datetime="2026-09-30T10:43">10:43</time><span class="message-status" data-status="read"><svg aria-hidden="true">…</svg><span class="sr-only">Read</span></span></div>
    </div>
  </div>

  <!-- consecutive messages: one avatar (last), one header (first) -->
  <div class="message-group">
    <div class="message"><div class="message-avatar"></div><div class="message-content">…</div></div>
    <div class="message"><div class="message-avatar"><span class="avatar" data-size="sm">…</span></div><div class="message-content">…</div></div>
  </div>
</div>
```

### Attachment

```html
<a class="message-attachment" href="report.pdf" download>
  <span class="message-attachment-icon" aria-hidden="true"><svg>…</svg></span>
  <span class="message-attachment-body">
    <span class="message-attachment-name">Q3-report.pdf</span>
    <span class="message-attachment-meta">PDF · 2.4 MB</span>
  </span>
</a>
```

### Actions

```html
<div class="message-footer" data-reveal="hover">
  <button class="btn" data-variant="ghost" data-size="icon-xs" aria-label="Copy"><svg aria-hidden="true">…</svg></button>
  <button class="btn" data-variant="ghost" data-size="icon-xs" aria-label="Retry"><svg aria-hidden="true">…</svg></button>
</div>
```

## Attributes

| Attribute | On | Effect |
|-----------|----|--------|
| `data-align="end"` | `.message` | Your own row: avatar on the end side, surface and footer aligned there |
| `data-size="sm"` / `"lg"` | `.message` | Avatar column 1.5rem / 2.5rem (default 2rem) and the gap |
| `data-avatar="none"` | `.message` | No avatar column at all |
| `data-reveal="hover"` | `.message-footer` | Shown on hover / focus-within of the row; always on touch |
| `data-status` | `.message-status` | `sent` · `delivered` · `read` (blue) · `failed` (destructive) |

The header aligns with the row's side; the footer follows it. The column
caps at 80 % (max 40rem) - an assistant's ghost bubble takes the full width.

## Accessibility

| Element | Note |
|---------|------|
| `.message-list` | `role="log"` + `aria-label` - new messages are announced politely |
| avatar image | `alt` = the sender's name (or `alt=""` when the header names them) |
| times | `<time datetime>` |
| status icons | `aria-hidden` icon + visually hidden text ("Read") |
| icon buttons | `aria-label` ("Copy", "Retry") |
| typing / progress | a `marker` or bubble with `role="status"` |

## Notes

- The avatar anchors to the surface's bottom: with a footer, it lifts by the
  footer's fixed 1.75rem height - keep footer content to one line.
- In a `.message-group`, give every row a `.message-avatar` (empty or not):
  only the last row's avatar shows, only the first row's header.
- Composes `avatar`, `bubble`, `button`, `marker` and `spinner`; their CSS is
  needed alongside.
- CSS only.
