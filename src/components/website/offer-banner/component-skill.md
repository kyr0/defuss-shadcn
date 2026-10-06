---
name: Offer Banner
type: BLK
section: website
why: Text, a <code> for the code, <time> for the deadline and <small> for the conditions; the coupon notches are a CSS mask - no images, no script.
when: Sales, launch discounts, seasonal offers. Plain news is announcement; a plan list is pricing.
where: dist/components/offer-banner/offer-banner.css
supportedStates: default
---

# Pattern: Offer Banner

## Native basis
A `<section>` with the discount, a title, the conditions in `<small>`, the code in a `<code>`, the deadline as `<time>` and an action.

Built from: [Button](../../actions/button/component-skill.md).

---

## Native Web APIs
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dates
- [`mask-image`](https://developer.mozilla.org/en-US/docs/Web/CSS/mask-image) - shaped edges without images
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) - tints derived from the theme tokens
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<section class="mk-offer-banner" aria-labelledby="offer-1">
  <div class="mk-offer-banner-inner">
    <span class="mk-offer-banner-discount">−30%</span>
    <div class="mk-offer-banner-copy">
      <h2 class="mk-offer-banner-title" id="offer-1">Autumn sale: 30% off every yearly plan</h2>
      <small class="mk-offer-banner-terms">New subscriptions only. Ends <time datetime="2026-10-31">31 October 2026</time>. Cannot be combined with other offers.</small>
    </div>
    <div class="mk-offer-banner-action">
      <code class="mk-offer-banner-code">AUTUMN30</code>
      <a class="btn" href="#">Claim offer</a>
    </div>
  </div>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A card on a gradient in the chart colors: the discount, title, conditions, code and action |
| `data-variant="ribbon"` | A slim strip - one line with the code |
| `data-variant="coupon"` | A ticket: notched edges (mask) and a dashed tear line between the discount and the details |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| root | `<section aria-labelledby>` | Named by the offer title |
| conditions | `<small>` | Fine print stays readable - never hide it |
| deadline | `<time datetime>` | Machine-readable end date |

---

## Notes
- State the conditions next to the offer, not behind a link.
