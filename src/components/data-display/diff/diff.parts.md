<!-- The individual examples of Diff: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Diff (line)"
<figure class="diff" data-ratio="4/3" data-variant="line">
  <div class="diff-item-1"
    ><img src="https://picsum.photos/id/1039/800/600" alt="A waterfall in a green forest, sharp"
  /></div>
  <div class="diff-item-2"
    ><img src="https://picsum.photos/id/1039/800/600?blur=4" alt="The same waterfall, blurred"
  /></div>
  <input class="diff-range" type="range" min="0" max="100" value="50" step="0.1" aria-label="Comparison divider" />
</figure>
```

```html example part label="Diff (primary)"
<figure class="diff" data-ratio="4/3" data-variant="primary">
  <div class="diff-item-1"
    ><img src="https://picsum.photos/id/1016/800/600" alt="A red canyon at sunset, warm grade"
  /></div>
  <div class="diff-item-2"
    ><img
      src="https://picsum.photos/id/1016/800/600"
      alt="The same canyon, cool grade"
      style="filter: hue-rotate(170deg) saturate(1.1)"
  /></div>
  <input class="diff-range" type="range" min="0" max="100" value="50" step="0.1" aria-label="Comparison divider" />
</figure>
```
