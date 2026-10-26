<!-- The individual examples of Bubble: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="bubble"
<div class="bubble"><div class="bubble-content">Oh, no worries!</div></div>
```

```html example part label="bubble (secondary, sm)"
<div class="bubble" data-variant="secondary" data-size="sm"
  ><div class="bubble-content">Small - dense threads and sidebars</div></div
>
```

```html example part label="bubble (secondary, lg)"
<div class="bubble" data-variant="secondary" data-size="lg"
  ><div class="bubble-content">Large - a focused conversation</div></div
>
```

```html example part label="bubble (muted)"
<div class="bubble" data-variant="muted"><div class="bubble-content">Muted - supporting, lower emphasis</div></div>
```

```html example part label="bubble (tinted)"
<div class="bubble" data-variant="tinted" data-align="end"
  ><div class="bubble-content">Tinted - a subtle primary bubble</div></div
>
```

```html example part label="bubble (outline)"
<div class="bubble" data-variant="outline"
  ><div class="bubble-content">Outline - options, cards, rich content</div></div
>
```

```html example part label="bubble (destructive)"
<div class="bubble" data-variant="destructive" data-align="end"
  ><div class="bubble-content">Not delivered - tap to retry</div></div
>
```

```html example part label="bubble (ghost)"
<div class="bubble" data-variant="ghost"
  ><div class="bubble-content"
    ><p
      ><strong>Ghost</strong> - an assistant reply without a frame. It runs the full width, like the markdown answer of
      a chat model, with <code>inline code</code> and lists:</p
    ><ul
      ><li>no background</li
      ><li>no side padding</li></ul
    ></div
  ></div
>
```

```html example part label="bubble-group"
<div class="bubble-group" data-tail="">
  <div class="bubble" data-variant="secondary"
    ><div class="bubble-content">Hi, I can't log in since this morning.</div></div
  >
  <div class="bubble" data-variant="secondary"><div class="bubble-content">It says my password is wrong.</div></div>
  <div class="bubble" data-variant="secondary"><div class="bubble-content">But I didn't change it 🤔</div></div>
</div>
```
