<!-- The individual examples of Swap: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Swap"
<label class="swap">
  <input type="checkbox" aria-label="Toggle text" />
  <span class="swap-on">ON</span>
  <span class="swap-off">OFF</span>
</label>
```

```html example part label="Swap (sm)"
<label class="swap" data-size="sm">
  <input type="checkbox" aria-label="Small swap" />
  <span class="swap-on">ON</span>
  <span class="swap-off">OFF</span>
</label>
```

```html example part label="Swap (rotate)"
<label class="swap" data-variant="rotate">
  <input type="checkbox" aria-label="Dark mode" />
  <span class="swap-on" aria-hidden="true"><i data-lucide="moon"></i></span>
  <span class="swap-off" aria-hidden="true"><i data-lucide="sun"></i></span>
</label>
```

```html example part label="Swap (rotate, sm)"
<label class="swap" data-size="sm" data-variant="rotate">
  <input type="checkbox" aria-label="Save post" />
  <span class="swap-on"><i data-lucide="bookmark-check"></i></span>
  <span class="swap-off"><i data-lucide="bookmark"></i></span>
</label>
```

```html example part label="Swap (flip, lg)"
<label class="swap" data-variant="flip" data-size="lg">
  <input type="checkbox" aria-label="Mood" />
  <span class="swap-on" aria-hidden="true">😇</span>
  <span class="swap-off" aria-hidden="true">😈</span>
</label>
```
