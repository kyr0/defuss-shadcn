---
name: Roadmap Item
type: BLK
why: Status is one data attribute, progress a native <progress>, the vote a checkbox read by :has() - no script.
when: Public roadmaps and feature boards. Shipped changes belong in release-item.
where: dist/components/roadmap-item/roadmap-item.css
supportedStates: default
---

# Pattern: Roadmap Item

## Native basis
An `<article>`: status (`data-status="planned|progress|shipped"`) and target timeframe, title, description, a `<progress>` when in progress, tags and a vote checkbox with its count.

Built from: [Progress](progress.md).

---

## Native Web APIs
- [`<progress>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress) - native completion bar
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item

---

## Structure

```html
<div class="mk-roadmap-board">
  <section aria-labelledby="rb-planned"><h3 id="rb-planned">Planned</h3>
    <article class="mk-roadmap-item" aria-labelledby="rm-1">
      <div class="mk-roadmap-item-top"><span class="mk-roadmap-item-status" data-status="planned">Planned</span><span class="mk-roadmap-item-when"><i data-lucide="calendar"></i>Q1 2027</span></div>
      <h3 class="mk-roadmap-item-title" id="rm-1">Calendar view for tasks</h3>
      <p class="mk-roadmap-item-desc">See deadlines across projects in one month view.</p>
      <div class="mk-roadmap-item-foot">
        <ul class="mk-roadmap-item-tags"><li>Tasks</li></ul>
        <label class="mk-roadmap-item-vote"><input type="checkbox" name="vote" value="rm-1"><i data-lucide="chevron-up"></i><span>214</span><span class="sr-only"> votes - vote for Calendar view for tasks</span></label>
      </div>
    </article>
    <article class="mk-roadmap-item" aria-labelledby="rm-2">
      <div class="mk-roadmap-item-top"><span class="mk-roadmap-item-status" data-status="planned">Planned</span><span class="mk-roadmap-item-when"><i data-lucide="calendar"></i>Q2 2027</span></div>
      <h3 class="mk-roadmap-item-title" id="rm-2">Public pages</h3>
      <p class="mk-roadmap-item-desc">Publish a doc as a website with your domain.</p>
      <div class="mk-roadmap-item-foot">
        <ul class="mk-roadmap-item-tags"><li>Docs</li><li>Web</li></ul>
        <label class="mk-roadmap-item-vote"><input type="checkbox" name="vote" value="rm-2"><i data-lucide="chevron-up"></i><span>98</span><span class="sr-only"> votes - vote for Public pages</span></label>
      </div>
    </article>
  </section>
  <section aria-labelledby="rb-progress"><h3 id="rb-progress">In progress</h3>
    <article class="mk-roadmap-item" aria-labelledby="rm-3">
      <div class="mk-roadmap-item-top"><span class="mk-roadmap-item-status" data-status="progress">In progress</span><span class="mk-roadmap-item-when"><i data-lucide="calendar"></i>Nov 2026</span></div>
      <h3 class="mk-roadmap-item-title" id="rm-3">Acme mobile app</h3>
      <p class="mk-roadmap-item-desc">Everything on the desk, in your pocket - offline included.</p>
      <progress class="progress" value="60" max="100" aria-label="60% done">60%</progress>
      <div class="mk-roadmap-item-foot">
        <ul class="mk-roadmap-item-tags"><li>iOS</li><li>Android</li></ul>
        <label class="mk-roadmap-item-vote"><input type="checkbox" name="vote" value="rm-3" checked><i data-lucide="chevron-up"></i><span>512</span><span class="sr-only"> votes - vote for Acme mobile app</span></label>
      </div>
    </article>
  </section>
  <section aria-labelledby="rb-shipped"><h3 id="rb-shipped">Shipped</h3>
    <article class="mk-roadmap-item" aria-labelledby="rm-4">
      <div class="mk-roadmap-item-top"><span class="mk-roadmap-item-status" data-status="shipped">Shipped</span><span class="mk-roadmap-item-when"><i data-lucide="calendar"></i>Sep 2026</span></div>
      <h3 class="mk-roadmap-item-title" id="rm-4">Offline sync</h3>
      <p class="mk-roadmap-item-desc">Shipped in 4.0 for every workspace.</p>
      <div class="mk-roadmap-item-foot">
        <ul class="mk-roadmap-item-tags"><li>Sync</li></ul>
        <label class="mk-roadmap-item-vote"><input type="checkbox" name="vote" value="rm-4"><i data-lucide="chevron-up"></i><span>1204</span><span class="sr-only"> votes - vote for Offline sync</span></label>
      </div>
    </article>
  </section>
</div>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A card; lay cards out in columns per status |
| `data-status` | Planned (gray), In progress (blue), Shipped (green) |
| `.mk-roadmap-item-vote` | A vote toggle - checked fills it |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| vote | checkbox + sr-only "votes - vote for ..." | Announced checked / not checked |
| progress | labelled `<progress>` | "60% done" |

---

## Notes
- Say "target", not "release date" - and update it.
