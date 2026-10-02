---
name: Pricing
type: BLK
why: Plan cards are a stretch-aligned grid; the billing toggle is native radios plus :has(), so one checked input flips every plan with zero JS.
when: Plans/tiers section of a marketing page; a single plan needs no grid - one card suffices.
where: dist/components/pricing/pricing.css
supportedStates: default
---

# Pattern: Pricing

## Native basis
`display: grid; align-items: stretch` keeps plan cards equal height
across content differences. The billing toggle is a radio group —
`<input type="radio">` in `<label>`s - and `:has(input:checked)` swaps
every plan's yearly/monthly price rows. Keyboard, screen readers, and
form semantics are browser-provided.

---

## Native Web APIs
- [`<input type="radio">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/radio) - exclusive choice with free keyboard support
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - checked radio flips every price panel from CSS
- [`align-items: stretch`](https://developer.mozilla.org/en-US/docs/Web/CSS/align-items) - equal-height plan cards
- [`font-variant-numeric`](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric#tabular-nums) - tabular price digits
- [Badge](badge.md) - "Most Popular" marker

---

## Structure

```html
<section class="mk-pricing">
  <div class="mk-pricing-head">
    <div class="mk-features-head" style="margin:0;">
      <span class="mk-pricing-eyebrow">Pricing</span>
      <h2 class="mk-pricing-title">Simple Pricing, Smarter Work</h2>
      <p class="mk-pricing-desc">A plan to help you move faster.</p>
    </div>
    <div class="mk-pricing-billing" role="radiogroup" aria-label="Billing period">
      <label><input class="mk-bill-yearly" type="radio" name="billing" checked />Billed yearly</label>
      <label><input class="mk-bill-monthly" type="radio" name="billing" />Billed monthly</label>
    </div>
  </div>
  <div class="mk-plans">
    <article class="mk-plan">
      <header class="mk-plan-header">
        <span class="mk-plan-icon"><i data-lucide="star"></i></span>
      </header>
      <div class="mk-plan-body">
        <h3 class="mk-plan-title">Starter</h3>
        <p class="mk-plan-desc">For individuals getting started.</p>
      </div>
      <div class="mk-plan-price mk-price-yearly">
        <span class="mk-plan-amount">$10</span>
        <div class="mk-plan-unit">
          <span class="mk-plan-unit-label">Per month</span>
          <span class="mk-plan-unit-note">Billed yearly</span>
        </div>
      </div>
      <div class="mk-plan-price mk-price-monthly">
        <span class="mk-plan-amount">$12</span>
        <div class="mk-plan-unit">
          <span class="mk-plan-unit-label">Per month</span>
          <span class="mk-plan-unit-note">Plus local taxes</span>
        </div>
      </div>
      <div class="mk-plan-cta"><button class="btn" data-variant="outline" data-size="lg">Get started</button></div>
      <ul class="mk-plan-features" style="list-style:none;padding-inline:1.5rem;margin:0;">
        <li class="mk-plan-feature"><i data-lucide="circle-check"></i><span>Unlimited projects</span></li>
        <li class="mk-plan-feature"><i data-lucide="circle-check"></i><span>AI-powered insights</span></li>
      </ul>
    </article>
    <article class="mk-plan" data-featured>
      <header class="mk-plan-header">
        <span class="mk-plan-icon"><i data-lucide="zap"></i></span>
        <span class="badge">Most Popular</span>
      </header>
      <!-- same body structure as above -->
    </article>
  </div>
</section>
```

---

## Variants

| attribute       | Purpose                                              |
|-----------------|------------------------------------------------------|
| `data-featured` | 2px primary border + "Most Popular" badge on a plan  |
| `.mk-pricing-compare` | A Table of features per plan - checks, dashes, the featured column tinted with a primary top rule |
| `data-variant="compact"` (on `.mk-plans`) | Plans as rows of one list: name, price, CTA |
| `data-variant="wide"` (on `.mk-plan`) | One plan, the features in two columns beside the price (a holo aura around it) |
| `.mk-pricing-usage` | Usage pricing: a Slider picks the seats, an `<output>` shows the price (a few lines of page script) |
| `.mk-pricing-cta` | A dark strip - talk to sales |

---

## ARIA

| Attribute       | Element          | Purpose                                   |
|-----------------|------------------|-------------------------------------------|
| `role="radiogroup"` | billing toggle | Groups the radios under one name          |
| `<label>`       | radio wrappers   | Clickable text = the radio's accessible name |
| `<ul>`          | feature list     | Screen readers count features             |

---

## Notes
- The featured plan swaps 1px→2px border with the same total box size (`border: 2px` on both axes) - no layout shift next to siblings.
- `data-featured` is a boolean attribute: present = featured. No value needed.
- Each plan ships two price rows (`.mk-price-yearly` / `.mk-price-monthly`); the checked radio anywhere in `.mk-pricing` flips all of them via `:has()` - both prices stay in the DOM for crawlers.
- Feature the plan in a gold aura: wrap `<article class="mk-plan" data-featured>` in `<div class="aura aura-gold aura-sm">` (shapes.css) - the light is the border, the plan drops its own. Any aura style works (`aura-holo`, `aura-rainbow`, plain `aura` in the primary colour).
- The featured plan is labelled with a filled Badge (`.mk-plan-badge`, `data-variant="default"` + a sparkle); a saving next to the yearly choice is a Badge (`data-variant="secondary" data-size="xs"`). The checks sit in tinted discs; `data-muted` on a `.mk-plan-feature` greys out a feature the plan lacks.
- Three plans side by side from 44rem of section width; the featured one stands taller.
