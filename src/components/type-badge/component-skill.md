---
name: Type Badge
type: ATM
why: A mono chip marking a component's atomic-design type — one color identity per type, in both schemes.
when: Tag components by taxonomy in docs, inventories, or design reviews (ATM/MOL/ORG/BLK/TPL).
where: dist/components/type-badge/type-badge.css
supportedStates: default
---

# Pattern: Type Badge

## Native basis
`<span>` element with `data-type` driving the color and `title` carrying the full type name as the tooltip. Pure visual marker — no interactivity.

---

## Native Web APIs
- [`<span>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/span) — inline phrasing container
- [`title`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/title) — native tooltip with the full type name (the 3-letter code expands on hover)
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) — border tints derived from each type color
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) — High Contrast Mode falls back to system ink

---

## Structure

```html
<span class="type-badge" data-type="ATM" title="Atom">ATM</span>
<span class="type-badge" data-type="MOL" title="Molecule">MOL</span>
```

## Types

| `data-type` | Meaning    | Color (light / dark)     |
|-------------|------------|--------------------------|
| `ATM`       | Atom       | cyan `#06B6D4` / `#22D3EE` |
| `MOL`       | Molecule   | blue `#3B82F6` / `#60A5FA` |
| `ORG`       | Organism   | violet `#8B5CF6` / `#A78BFA` |
| `BLK`       | Block      | amber `#F59E0B` / `#FBBF24` |
| `TPL`       | Template   | slate `#64748B` / `#94A3B8` |

## Sizes

| `data-size` | Purpose                 |
|-------------|-------------------------|
| `xs`        | 0.5625rem — the default |
| `sm`        | 0.6875rem               |
| `md`        | 0.8125rem               |
| `lg`        | 0.9375rem               |
| `xl`        | 1.0625rem               |

---

## Accessibility

- The code alone is color-coded; the `title` spells the type out (`title="Molecule"`).
- Mono font via `--font-mono`; colors are hardcoded per taxonomy identity (not theme tokens — a type must look the same under every theme).
- `forced-colors: active` falls back to `CanvasText` so the badge stays legible in High Contrast Mode.

## Notes

- Generate the badge from a taxonomy source of truth — never hand-pick a color; the type→color map is the contract.
