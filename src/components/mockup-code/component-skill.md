---
name: Code Mockup
type: ATM
why: A terminal window is a stack of <pre> lines under CSS window chrome; prompts, line numbers and the cursor are generated content, so selecting and copying the commands never picks them up - no script, no copy clean-up.
when: Showing commands and their output as a terminal - install steps, CLI docs, a session transcript. Source code with syntax colours takes a highlighted code block; a single inline key takes kbd.
where: dist/components/mockup-code/mockup-code.css
supportedStates: default
---

# Code Mockup

## Native basis

A `<div class="mockup-code">` of `<pre><code>` lines. `data-prefix` on a line
draws its prompt (`$`, `>`, `~`, a number) with `::before` - generated
content is neither selectable nor part of `innerText`, so copying the
window copies the commands alone. After daisyUI's mockup-code, plus window
chrome and titles, tones and highlights as data attributes, automatic line
numbers, a cursor, wrapping, surface variants and sizes. CSS only.

## Native Web APIs

- [`<pre>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/pre) / [`<code>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/code) - one preformatted line each
- [`attr()`](https://developer.mozilla.org/en-US/docs/Web/CSS/attr) + [`::before`](https://developer.mozilla.org/en-US/docs/Web/CSS/::before) - the prompt from `data-prefix`, the title from `data-title`
- [CSS counters](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_counter_styles/Using_CSS_counters) - `data-numbers` line numbers
- [`user-select: none`](https://developer.mozilla.org/en-US/docs/Web/CSS/user-select) - prompts and numbers never join a selection
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) - highlighted lines in the line's tone
- [`unicode-bidi: isolate`](https://developer.mozilla.org/en-US/docs/Web/CSS/unicode-bidi) - commands stay left to right inside an RTL page
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - a still cursor / [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

## Structure

```html
<div class="mockup-code">
  <pre data-prefix="$"><code>npm i defuss-shadcn</code></pre>
  <pre data-prefix=">" data-tone="warning"><code>installing...</code></pre>
  <pre data-prefix=">" data-tone="success"><code>Done!</code></pre>
</div>
```

- A line without `data-prefix` has no prompt (a continuation line, output).
- `data-prefix=""` keeps the prompt column empty - a continued command
  lines up with the one above.
- Long lines scroll the window sideways; `data-wrap` wraps them instead,
  with a hanging indent under the prompt.

## Window (on `.mockup-code`)

| Attribute | Effect |
|-----------|--------|
| *(default)* | Three muted dots in the bar |
| `data-chrome="mac"` | Red / amber / green dots |
| `data-chrome="none"` | No bar |
| `data-title="…"` | A centered title in the bar |
| `data-numbers` | Numbers every line without its own `data-prefix` |
| `data-wrap` | Wrap long lines instead of scrolling |

## Lines (on a `pre`)

| Attribute | Effect |
|-----------|--------|
| `data-prefix="$"` | The prompt (any short text: `$`, `>`, `~`, `#`, `1`) |
| `data-tone` | `success` · `warning` · `info` · `destructive` · `muted` - the line's colour, tuned per surface |
| `data-highlight` | A tinted band in the line's tone (or its text colour) |
| `data-highlight="solid"` | A solid band in the tone, dark text - an error line |
| `data-cursor` | A blinking block cursor after the line (still for reduced motion) |

## Variants (`data-variant`)

| Value | Surface |
|-------|---------|
| *(default)* | A dark terminal (literal charcoal - it stays a terminal in both themes) |
| `muted` | `--muted`, foreground text; tones darkened for contrast |
| `outline` | The card surface with a border |
| `primary` | `--primary` / `--primary-foreground` |

## Sizes (`data-size`)

`sm` (0.75rem) · *(default)* 0.875rem · `lg` (1rem).

## Accessibility

| Case | Markup |
|------|--------|
| The window | Plain text - a screen reader reads the commands; give the block a heading or `aria-label` when its purpose isn't clear from the text around it |
| Prompts / numbers | Generated content - not read as part of the command text in most readers, never copied |
| Status lines | Say it in the words ("Error: …"), not only the tone |

## Notes

- Copying the window (or a selection) yields the commands without prompts;
  the docs site's copy buttons copy `innerText` and get exactly that.
- Put one command per `pre`; a multi-line command continues on lines with
  `data-prefix=""`.
- CSS only.
