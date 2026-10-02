---
name: Code Example
type: BLK
why: The tabs are radio inputs read by :has() - no script to switch; line numbers are CSS counters; copying is the one line of page script (Clipboard API).
when: Install instructions, snippets and examples in docs and blog posts. A full terminal mockup is the Code mockup component.
where: dist/components/code-block/code-block.css
supportedStates: default
---

# Pattern: Code Example

## Native basis
A `<figure>`: a header with radio "tabs" (or a file name) and a copy button, then one `<pre><code>` per tab (`data-tab`, shown with `:has(:checked)`); lines as `<span>`s get counters and `data-highlight`.

---

## Native Web APIs
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`CSS counters`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_counter_styles/Using_CSS_counters) - numbering without markup
- [`Clipboard API`](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) - copy on click
- [`<kbd>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/kbd) - keyboard input

---

## Structure

```html
<figure class="mk-code-block">
  <div class="mk-code-block-head">
  <div class="mk-code-block-tabs" role="radiogroup" aria-label="Package manager">
    <label><input type="radio" name="cb-pm" value="npm" checked>npm</label><label><input type="radio" name="cb-pm" value="pnpm">pnpm</label><label><input type="radio" name="cb-pm" value="bun">bun</label>
  </div>
    <button class="mk-code-block-copy" type="button" aria-label="Copy code"><i data-lucide="copy"></i></button>
  </div>
  <pre data-tab="npm"><code><span>npm install defuss-shadcn</span></code></pre>
  <pre data-tab="pnpm"><code><span>pnpm add defuss-shadcn</span></code></pre>
  <pre data-tab="bun"><code><span>bun add defuss-shadcn</span></code></pre>
  <span class="mk-code-block-status" role="status"></span>
</figure>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Tabs (npm / pnpm / bun) switch the command - CSS-only |
| `data-variant="file"` | A file name in the header, line numbers, highlighted lines |
| `data-variant="inline"` | One command on a line with a copy button |
| `data-highlight` | A tinted line with a bar in the margin |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| tabs | radio group with a label | Arrow keys switch |
| copy | `<button aria-label="Copy code">` + a status | Announces "Copied" |
| code | `<pre><code>` | Selectable text |

---

## Notes
- Keep examples copy-paste-runnable - no prompts in the copied text.
