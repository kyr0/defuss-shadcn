---
name: Marker
type: ATM
why: A small flex row of icon + words is all an inline status needs; separators draw their rules with pseudo-elements, the shimmer is background-clip text, links and buttons are real <a>/<button>.
when: Inline status, system notes and dividers inside a conversation ("Explored 4 files", "Thinking…", "Today", "Conversation compacted"). A message from a person takes bubble; a page-level notice takes alert; a plain rule takes separator.
where: dist/components/marker/marker.css
supportedStates: default
---

# Marker

## Native basis

A `<div class="marker">` (or an `<a>` / `<button class="marker">` when the
row is an action) holding an optional `.marker-icon` (an svg, a spinner or an
emoji - decorative, `aria-hidden`) and the `.marker-content` words. CSS only -
after shadcn/ui's Marker, plus tones, sizes and a stacked layout.

## Native Web APIs

- [`role="status"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/status_role) - a progress marker ("Running tests") announced politely as it changes
- [`background-clip: text`](https://developer.mozilla.org/en-US/docs/Web/CSS/background-clip) - the streaming-text shimmer
- [`::before` / `::after`](https://developer.mozilla.org/en-US/docs/Web/CSS/::before) - the separator's two rules, no extra markup
- [Logical properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values) - `border-block-end`, `margin-inline`: the rows mirror in RTL
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) - the ring on link / button markers
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - no shimmer sweep / [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

## Structure

```html
<!-- inline status -->
<div class="marker">
  <span class="marker-icon" aria-hidden="true"><svg>…</svg></span>
  <span class="marker-content">Explored 4 files</span>
</div>

<!-- progress: a spinner + role="status" -->
<div class="marker" role="status">
  <span class="marker-icon" aria-hidden="true"><svg class="spinner" viewBox="0 0 24 24" …><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg></span>
  <span class="marker-content">Running tests</span>
</div>

<!-- streaming text -->
<div class="marker" role="status"><span class="marker-content" data-shimmer>Thinking…</span></div>

<!-- labeled separator -->
<div class="marker" data-variant="separator"><span class="marker-content">Today</span></div>

<!-- bordered row -->
<div class="marker" data-variant="border">
  <span class="marker-icon" aria-hidden="true"><svg>…</svg></span>
  <span class="marker-content">Switched to <strong>release-candidate</strong></span>
</div>

<!-- an action -->
<a class="marker" href="/pr/42">
  <span class="marker-icon" aria-hidden="true"><svg>…</svg></span>
  <span class="marker-content">View the pull request</span>
</a>
```

## Variants (`data-variant`)

| Value | Layout |
|-------|--------|
| *(none)* / `default` | Inline: icon + words, sized to content |
| `border` | A full-width row with a rule under it - separates steps |
| `separator` | A centered label between two rules ("Today", "Conversation compacted") |

`data-orientation="vertical"` stacks the icon above the words, centered.

## Tones (`data-tone`)

`success`, `warning`, `info`, `destructive`, `primary` color the **icon**;
the words stay muted, so the marker never shouts - and the meaning is in the
words, not the color.

## Sizes (`data-size`)

`sm` (0.75rem) · *(default)* 0.8125rem · `lg` (0.875rem) - the icon scales with it.

## Accessibility

| Case | Markup |
|------|--------|
| Changing progress | `role="status"` on the marker - updates are announced politely |
| Decorative icon | `.marker-icon` with `aria-hidden="true"` - the words carry the meaning |
| Labeled separator | no role - the rules are decoration, the label is content |
| Action | a real `<a href>` or `<button>` with `class="marker"` |
| Icon-only marker | `aria-label` on the marker (or visible words) |

## Notes

- `<strong>` and `<code>` inside `.marker-content` switch to the foreground
  color - name the file or branch, keep the sentence quiet.
- A spinner in `.marker-icon` inherits the icon size (1em).
- The shimmer turns into plain muted text under `prefers-reduced-motion`.
- CSS only.
