---
name: Session Item
type: BLK
section: website
why: The toggle is a checkbox in a label - :has(:checked) swaps "Add" for "Added" with no script; times are <time>.
when: Conference agendas and event schedules. Speakers on their own are speaker-item; a single event is event-item.
where: dist/components/session-item/session-item.css
supportedStates: default
---

# Pattern: Session Item

## Native basis
An `<article>`: a time column (`<time>` start, end, duration), the track (colored by `--mk-session-color`), title, description, speakers (Avatars) and room, and a checkbox labelled "Add ... to my schedule".

Built from: [Avatar](../../data-display/avatar/component-skill.md).

---

## Native Web APIs
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dates
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
  <article class="mk-session-item" data-variant="keynote" aria-labelledby="ss-1" style="--mk-session-color:oklch(0.6 0.2 300)">
    <div class="mk-session-item-time"><time datetime="2026-11-12T09:30">09:30</time><span>10:15</span><small>45 min</small></div>
    <div class="mk-session-item-body">
      <span class="mk-session-item-track">Keynote</span>
      <h3 class="mk-session-item-title" id="ss-1">The quiet product: building for attention, not engagement</h3>
      <ul class="mk-session-item-speakers"><li><span class="avatar" data-size="sm"><img class="avatar-image" src="images/mk-portrait2.png" alt=""></span>Priya Natarajan</li></ul>
      <span class="mk-session-item-room"><i data-lucide="map-pin"></i>Main hall</span>
    </div>
    <label class="mk-session-item-save"><input type="checkbox" name="schedule" value="ss-1" checked><span class="mk-session-item-save-off"><i data-lucide="plus"></i> Add</span><span class="mk-session-item-save-on"><i data-lucide="check"></i> Added</span><span class="sr-only"> The quiet product: building for attention, not engagement to my schedule</span></label>
  </article>
  <article class="mk-session-item" data-variant="break" aria-labelledby="ss-b">
    <div class="mk-session-item-time"><time datetime="2026-11-12T10:15">10:15</time><span>10:45</span><small>30 min</small></div>
    <div class="mk-session-item-body">
      <h3 class="mk-session-item-title" id="ss-b">Coffee break ☕</h3>
    </div>
  </article>
  <article class="mk-session-item" aria-labelledby="ss-2" style="--mk-session-color:oklch(0.62 0.17 240)">
    <div class="mk-session-item-time"><time datetime="2026-11-12T10:45">10:45</time><span>11:30</span><small>45 min</small></div>
    <div class="mk-session-item-body">
      <span class="mk-session-item-track">Engineering</span>
      <h3 class="mk-session-item-title" id="ss-2">Sync that never fails</h3>
      <p class="mk-session-item-desc">How a CRDT engine survives trains, tunnels and transatlantic flights.</p>
      <ul class="mk-session-item-speakers"><li><span class="avatar" data-size="sm"><img class="avatar-image" src="images/mk-portrait.png" alt=""></span>Sophie Tan</li></ul>
      <span class="mk-session-item-room"><i data-lucide="map-pin"></i>Room A</span>
    </div>
    <label class="mk-session-item-save"><input type="checkbox" name="schedule" value="ss-2"><span class="mk-session-item-save-off"><i data-lucide="plus"></i> Add</span><span class="mk-session-item-save-on"><i data-lucide="check"></i> Added</span><span class="sr-only"> Sync that never fails to my schedule</span></label>
  </article>
  <article class="mk-session-item" aria-labelledby="ss-3" style="--mk-session-color:oklch(0.65 0.17 30)">
    <div class="mk-session-item-time"><time datetime="2026-11-12T10:45">10:45</time><span>11:30</span><small>45 min</small></div>
    <div class="mk-session-item-body">
      <span class="mk-session-item-track">Design</span>
      <h3 class="mk-session-item-title" id="ss-3">Every badge must earn its place</h3>
      <p class="mk-session-item-desc">A field guide to quieter interfaces - with before and after.</p>
      <ul class="mk-session-item-speakers"><li><span class="avatar" data-size="sm"><img class="avatar-image" src="images/mk-portrait2.png" alt=""></span>Hannah Lee</li><li><span class="avatar" data-size="sm"><img class="avatar-image" src="images/mk-portrait.png" alt=""></span>Aron Homberg</li></ul>
      <span class="mk-session-item-room"><i data-lucide="map-pin"></i>Room B</span>
    </div>
    <label class="mk-session-item-save"><input type="checkbox" name="schedule" value="ss-3"><span class="mk-session-item-save-off"><i data-lucide="plus"></i> Add</span><span class="mk-session-item-save-on"><i data-lucide="check"></i> Added</span><span class="sr-only"> Every badge must earn its place to my schedule</span></label>
  </article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Time, track, title, description, speakers, room, a save toggle |
| `data-variant="keynote"` | Highlighted: a tinted card in the track color |
| `data-variant="break"` | Muted and compact - coffee, lunch, networking |
| `--mk-session-color` | The track color (tag and rule) |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| save | `<label><input type="checkbox"> … <span class="sr-only">title to my schedule</span></label>` | A real checkbox - announced as checked / not checked |
| times | `<time datetime>` | Start time machine-readable |

---

## Notes
- Give every track a distinct, theme-independent color - and also a name; never color alone.
