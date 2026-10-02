---
name: Profile Header
type: BLK
why: A header with an <h1>, a <dl> for the counts and real links / buttons - the overlap is a negative margin, no script.
when: Public profile pages, community members, creators. Your own team pages use team-member; article bylines use author-bio.
where: dist/components/profile-header/profile-header.css
supportedStates: default
---

# Pattern: Profile Header

## Native basis
A `<header>`: a cover picture, an Avatar overlapping it, the name (`<h1>`) with a verified mark and handle, a bio, details (location, website, joined - `<time>`), counts as a `<dl>` and actions.

Built from: [Avatar](avatar.md), [Button](button.md), [Badge](badge.md).

---

## Native Web APIs
- [`<dl>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl) - term / value pairs
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dates
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport
- [`object-fit`](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit) - pictures crop instead of stretching

---

## Structure

```html
<header class="mk-profile-header">
  <img class="mk-profile-header-cover" src="https://picsum.photos/seed/profile-cover/1400/400" alt="">
  <div class="mk-profile-header-body">
    <div class="mk-profile-header-top">
      <span class="avatar" data-size="xl"><img class="avatar-image" src="images/mk-portrait2.png" alt=""></span>
      <div class="mk-profile-header-actions">
        <a class="btn" href="#">Follow</a>
        <a class="btn" data-variant="outline" href="#">Message</a>
        <button class="btn" data-variant="outline" data-size="icon" type="button" aria-label="More actions"><i data-lucide="ellipsis"></i></button>
      </div>
    </div>
    <div>
      <h1 class="mk-profile-header-name">Hannah Lee <span class="badge" data-variant="secondary" data-size="sm">Design Lead</span></h1>
      <p class="mk-profile-header-handle">@hannahdesigns</p>
    </div>
    <p class="mk-profile-header-bio">Making software quieter at Northwind. Writing about calm design, type and the space between things.</p>
    <ul class="mk-profile-header-meta">
      <li><i data-lucide="map-pin"></i>Lisbon, Portugal</li>
      <li><i data-lucide="link"></i><a href="#">hannahlee.design</a></li>
      <li><i data-lucide="calendar"></i>Joined <time datetime="2021-03">March 2021</time></li>
    </ul>
    <dl class="mk-profile-header-stats"><div><dt>followers</dt><dd>1.2k</dd></div><div><dt>following</dt><dd>318</dd></div><div><dt>posts</dt><dd>94</dd></div></dl>
  </div>
</header>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Cover, overlapping avatar, details, counts, actions |
| `data-variant="compact"` | No cover - avatar beside the name, for lists and sidebars |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| name | `<h1>` | The page is about this person |
| counts | `<dl>` | "Followers 1.2k" read as pairs |
| more | `aria-label="More actions"` | The icon button is named |

---

## Notes
- Let people choose what their profile shows.
