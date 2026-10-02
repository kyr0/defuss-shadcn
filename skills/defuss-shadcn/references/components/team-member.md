---
name: Team Member
type: BLK
why: An <article> per person with a real portrait, a heading and labelled links; the reveal is a :hover / :focus-within transition - keyboard users get it too, touch screens always show the links. No script.
when: Team, leadership and board pages. For an article author use author-bio; for event speakers use speaker-item.
where: dist/components/team-member/team-member.css
supportedStates: default
---

# Pattern: Team Member

## Native basis
An `<article>` labelled by the name: a portrait (descriptive `alt`) with an optional location tag and a list of icon links over its bottom edge, then the name, the role and a short bio.

---

## Native Web APIs
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`object-fit`](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit) - pictures crop instead of stretching
- [`aspect-ratio`](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio) - stable media boxes, no layout shift
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - motion stands still on request

---

## Structure

```html
  <article class="mk-team-member" aria-labelledby="tm-0">
    <div class="mk-team-member-portrait">
      <img class="mk-team-member-photo" src="https://i.pravatar.cc/480?img=25" alt="Portrait of Sophie Tan">
      <span class="mk-team-member-tag"><i data-lucide="map-pin"></i>Lisbon</span>
      <ul class="mk-team-member-links">
        <li><a href="#" aria-label="Sophie Tan on LinkedIn"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M5 3.5A2.5 2.5 0 1 1 5 8.5 2.5 2.5 0 0 1 5 3.5ZM3 10h4v11H3V10Zm7 0h3.8v1.6h.1c.5-1 1.8-1.9 3.6-1.9 3.9 0 4.5 2.5 4.5 5.8V21h-4v-4.9c0-1.2 0-2.7-1.7-2.7s-2 1.3-2 2.6v5h-4V10Z"/></svg></a></li>
        <li><a href="#" aria-label="Sophie Tan on GitHub"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2.1c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5Z"/></svg></a></li>
        <li><a href="#" aria-label="Sophie Tan on X"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L.8 2h6.4l4.4 5.9L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z"/></svg></a></li>
        <li><a href="#" aria-label="Email Sophie Tan"><i data-lucide="mail"></i></a></li>
      </ul>
    </div>
    <div class="mk-team-member-body">
      <h3 class="mk-team-member-name" id="tm-0">Sophie Tan</h3>
      <p class="mk-team-member-role">Head of Engineering</p>
      <p class="mk-team-member-bio">Builds the sync engine. Previously at a database company you have heard of.</p>
    </div>
  </article>
  <article class="mk-team-member" aria-labelledby="tm-1">
    <div class="mk-team-member-portrait">
      <img class="mk-team-member-photo" src="https://i.pravatar.cc/480?img=32" alt="Portrait of Hannah Lee">
      <span class="mk-team-member-tag"><i data-lucide="map-pin"></i>Berlin</span>
      <ul class="mk-team-member-links">
        <li><a href="#" aria-label="Hannah Lee on LinkedIn"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M5 3.5A2.5 2.5 0 1 1 5 8.5 2.5 2.5 0 0 1 5 3.5ZM3 10h4v11H3V10Zm7 0h3.8v1.6h.1c.5-1 1.8-1.9 3.6-1.9 3.9 0 4.5 2.5 4.5 5.8V21h-4v-4.9c0-1.2 0-2.7-1.7-2.7s-2 1.3-2 2.6v5h-4V10Z"/></svg></a></li>
        <li><a href="#" aria-label="Hannah Lee on GitHub"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2.1c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5Z"/></svg></a></li>
        <li><a href="#" aria-label="Hannah Lee on X"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L.8 2h6.4l4.4 5.9L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z"/></svg></a></li>
        <li><a href="#" aria-label="Email Hannah Lee"><i data-lucide="mail"></i></a></li>
      </ul>
    </div>
    <div class="mk-team-member-body">
      <h3 class="mk-team-member-name" id="tm-1">Hannah Lee</h3>
      <p class="mk-team-member-role">Design Lead</p>
      <p class="mk-team-member-bio">Makes Acme quiet. Believes every badge has to earn its place.</p>
    </div>
  </article>
  <article class="mk-team-member" aria-labelledby="tm-2">
    <div class="mk-team-member-portrait">
      <img class="mk-team-member-photo" src="https://i.pravatar.cc/480?img=12" alt="Portrait of Aron Homberg">
      <span class="mk-team-member-tag"><i data-lucide="map-pin"></i>Lisbon</span>
      <ul class="mk-team-member-links">
        <li><a href="#" aria-label="Aron Homberg on LinkedIn"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M5 3.5A2.5 2.5 0 1 1 5 8.5 2.5 2.5 0 0 1 5 3.5ZM3 10h4v11H3V10Zm7 0h3.8v1.6h.1c.5-1 1.8-1.9 3.6-1.9 3.9 0 4.5 2.5 4.5 5.8V21h-4v-4.9c0-1.2 0-2.7-1.7-2.7s-2 1.3-2 2.6v5h-4V10Z"/></svg></a></li>
        <li><a href="#" aria-label="Aron Homberg on GitHub"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2.1c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5Z"/></svg></a></li>
        <li><a href="#" aria-label="Aron Homberg on X"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L.8 2h6.4l4.4 5.9L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z"/></svg></a></li>
        <li><a href="#" aria-label="Email Aron Homberg"><i data-lucide="mail"></i></a></li>
      </ul>
    </div>
    <div class="mk-team-member-body">
      <h3 class="mk-team-member-name" id="tm-2">Aron Homberg</h3>
      <p class="mk-team-member-role">Co-founder & CEO</p>
      <p class="mk-team-member-bio">Writes the weekly letter and still answers support on Fridays.</p>
    </div>
  </article>
  <article class="mk-team-member" aria-labelledby="tm-3">
    <div class="mk-team-member-portrait">
      <img class="mk-team-member-photo" src="https://i.pravatar.cc/480?img=16" alt="Portrait of Priya Natarajan">
      <span class="mk-team-member-tag"><i data-lucide="map-pin"></i>Remote</span>
      <ul class="mk-team-member-links">
        <li><a href="#" aria-label="Priya Natarajan on LinkedIn"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M5 3.5A2.5 2.5 0 1 1 5 8.5 2.5 2.5 0 0 1 5 3.5ZM3 10h4v11H3V10Zm7 0h3.8v1.6h.1c.5-1 1.8-1.9 3.6-1.9 3.9 0 4.5 2.5 4.5 5.8V21h-4v-4.9c0-1.2 0-2.7-1.7-2.7s-2 1.3-2 2.6v5h-4V10Z"/></svg></a></li>
        <li><a href="#" aria-label="Priya Natarajan on GitHub"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2.1c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5Z"/></svg></a></li>
        <li><a href="#" aria-label="Priya Natarajan on X"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L.8 2h6.4l4.4 5.9L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z"/></svg></a></li>
        <li><a href="#" aria-label="Email Priya Natarajan"><i data-lucide="mail"></i></a></li>
      </ul>
    </div>
    <div class="mk-team-member-body">
      <h3 class="mk-team-member-name" id="tm-3">Priya Natarajan</h3>
      <p class="mk-team-member-role">Chief Product Officer</p>
      <p class="mk-team-member-bio">Leads product and research after eight years building tools for hospitals.</p>
    </div>
  </article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A 4:5 portrait card: the links slide up over the photo on hover or keyboard focus (always shown on touch screens); a location tag in the corner |
| `data-variant="horizontal"` | A card: portrait beside the bio, the links always shown |
| `data-variant="compact"` | A round portrait, name and role on one row - for long lists |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| root | `<article aria-labelledby>` | Named by the person |
| portrait | `alt="Portrait of …"` | Describes who is shown |
| icon links | `aria-label` | Name the person and the network ("Sophie Tan on LinkedIn") |
| reveal | `:focus-within` | Tabbing into the links shows them |

---

## Notes
- Keep bios to two sentences; link to a detail page for more.
- Use photos with the same framing and light across a team.
