---
name: Filter Sidebar
type: BLK
why: Groups are <details>, controls are checkboxes, radios, number inputs and a switch in one GET form - the filter state is the URL. No script.
when: Catalogs and listings with many facets. A few quick filters fit in filter-bar.
where: dist/components/filter-sidebar/filter-sidebar.css
supportedStates: default
---

# Pattern: Filter Sidebar

## Native basis
A `<form method="get">` beside the results: a header with "Clear all", then `<details open>` groups - category checkboxes with counts, a min / max price, color swatches (checkboxes), a rating radio group and an availability Switch - and Apply.

Built from: [Checkbox](checkbox.md), [Input](input.md), [Switch](switch.md), [Button](button.md).

---

## Native Web APIs
- [`<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) - native disclosure, no script
- [`<fieldset>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset) - grouped controls with a legend
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`inputmode`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inputmode) - the right on-screen keyboard

---

## Structure

```html
<aside class="mk-filter-sidebar" aria-labelledby="fs-title">
  <form action="#" method="get">
    <div class="mk-filter-sidebar-head"><h2 id="fs-title">Filters</h2><a href="#">Clear all</a></div>
    <details class="mk-filter-sidebar-group" open><summary>Category</summary><div><fieldset><legend>Category</legend>
      <label class="mk-filter-sidebar-option"><input class="checkbox" type="checkbox" name="cat" value="shirts" checked>Shirts<small>24</small></label>
      <label class="mk-filter-sidebar-option"><input class="checkbox" type="checkbox" name="cat" value="knitwear">Knitwear<small>18</small></label>
      <label class="mk-filter-sidebar-option"><input class="checkbox" type="checkbox" name="cat" value="trousers">Trousers<small>12</small></label>
      <label class="mk-filter-sidebar-option"><input class="checkbox" type="checkbox" name="cat" value="accessories">Accessories<small>9</small></label>
    </fieldset></div></details>
    <details class="mk-filter-sidebar-group" open><summary>Price</summary><div><div class="mk-filter-sidebar-range"><label class="sr-only" for="fs-min">Minimum price</label><input class="input" id="fs-min" name="min" inputmode="numeric" placeholder="€ min"><span>–</span><label class="sr-only" for="fs-max">Maximum price</label><input class="input" id="fs-max" name="max" inputmode="numeric" placeholder="€ max"></div></div></details>
    <details class="mk-filter-sidebar-group" open><summary>Color</summary><div><fieldset><legend>Color</legend><div class="mk-filter-sidebar-swatches"><label class="mk-filter-sidebar-swatch" style="--mk-swatch:#d8c9a9"><input type="checkbox" name="color" value="sand" checked><span class="sr-only">Sand</span></label><label class="mk-filter-sidebar-swatch" style="--mk-swatch:#2f3b4a"><input type="checkbox" name="color" value="navy"><span class="sr-only">Navy</span></label><label class="mk-filter-sidebar-swatch" style="--mk-swatch:#f2efe8"><input type="checkbox" name="color" value="off-white"><span class="sr-only">Off-white</span></label><label class="mk-filter-sidebar-swatch" style="--mk-swatch:#5a6b5d"><input type="checkbox" name="color" value="moss"><span class="sr-only">Moss</span></label><label class="mk-filter-sidebar-swatch" style="--mk-swatch:#8c3b2f"><input type="checkbox" name="color" value="rust"><span class="sr-only">Rust</span></label></div></fieldset></div></details>
    <details class="mk-filter-sidebar-group"><summary>Rating</summary><div><fieldset><legend>Minimum rating</legend>
      <label class="mk-filter-sidebar-option"><input class="radio" type="radio" name="rating" value="4"><span class="mk-filter-sidebar-stars" aria-hidden="true">★★★★☆</span>4 & up</label>
      <label class="mk-filter-sidebar-option"><input class="radio" type="radio" name="rating" value="3"><span class="mk-filter-sidebar-stars" aria-hidden="true">★★★☆☆</span>3 & up</label>
    </fieldset></div></details>
    <div class="mk-filter-sidebar-group"><label class="mk-filter-sidebar-option" for="fs-stock">In stock only<input class="switch" type="checkbox" role="switch" id="fs-stock" name="stock" style="margin-inline-start:auto" checked></label></div>
    <button class="btn mk-filter-sidebar-apply" type="submit">Show 24 products</button>
  </form>
</aside>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Collapsible groups of filters with Apply |
| `.mk-filter-sidebar-swatch` | A round color checkbox; checked gets a ring |
| `--mk-swatch` | The swatch color |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| groups | `<details>` + `<summary>` | Collapse natively |
| swatches | sr-only color name | Never color alone |
| counts | text in the label | "Shirts (24)" |

---

## Notes
- Update counts for the current results, and hide options with zero.
