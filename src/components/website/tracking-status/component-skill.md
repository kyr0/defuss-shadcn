---
name: Tracking Status
type: BLK
section: website
why: An ordered list with aria-current="step" carries the progress; the line fills by a custom property; the log is a <details> - no script.
when: Order pages and tracking emails' landing pages. Before shipping, show order-confirmation.
where: dist/components/tracking-status/tracking-status.css
supportedStates: default
---

# Pattern: Tracking Status

## Native basis
A `<section>`: the estimated arrival, the carrier and tracking number (an external link), an `<ol>` of steps (done ones `data-done`, the current one `aria-current="step"`, the line filled to `--mk-tracking-progress`) and the event log in a `<details>`.

---

## Native Web APIs
- [`<ol>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol) - an ordered sequence
- [`aria-current`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current) - the current page / step / item
- [`<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) - native disclosure, no script
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dates
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<section class="mk-tracking-status" aria-labelledby="ts-title">
  <div class="mk-tracking-status-head">
    <div><h2 id="ts-title">Estimated arrival</h2><p><time datetime="2026-10-02">Thursday, 2 October</time></p></div>
    <div class="mk-tracking-status-carrier"><span>DHL Express</span><a href="#" target="_blank" rel="noopener">JD0146 0012 3456<span class="sr-only"> (opens the carrier site)</span></a></div>
  </div>
  <ol class="mk-tracking-status-steps" style="--mk-tracking-progress:66%">
    <li data-done><span class="mk-tracking-status-dot" aria-hidden="true"><i data-lucide="check"></i></span><strong>Ordered</strong><small>1 Oct, 14:32</small></li>
    <li data-done><span class="mk-tracking-status-dot" aria-hidden="true"><i data-lucide="check"></i></span><strong>Shipped</strong><small>1 Oct, 18:05</small></li>
    <li aria-current="step"><span class="mk-tracking-status-dot" aria-hidden="true"></span><strong>Out for delivery</strong><small>Today, 07:40</small></li>
    <li><span class="mk-tracking-status-dot" aria-hidden="true"></span><strong>Delivered</strong><small>Expected by 18:00</small></li>
  </ol>
  <details class="mk-tracking-status-log">
    <summary>Shipment history</summary>
    <ol>
      <li><time datetime="2026-10-02T07:40">2 Oct, 07:40</time><div>Out for delivery <span>· Lisbon</span></div></li>
      <li><time datetime="2026-10-02T02:10">2 Oct, 02:10</time><div>Arrived at delivery centre <span>· Lisbon</span></div></li>
      <li><time datetime="2026-10-01T18:05">1 Oct, 18:05</time><div>Picked up by DHL <span>· Porto</span></div></li>
    </ol>
  </details>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Arrival, carrier, the steps across, the event log |
| `data-variant="compact"` | The status line and the bar only - for an order list |
| `--mk-tracking-progress` | How far the line is filled |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| steps | `<ol>` + `aria-current="step"` | The current stage is announced |
| tracking link | external, sr-only "(opens the carrier site)" | Says where it goes |
| log | `<details>` | History on request |

---

## Notes
- Say "arrives Thursday", not "in transit".
