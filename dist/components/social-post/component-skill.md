---
name: Social Post
type: BLK
section: website
why: Rendered locally from your own markup: no third-party embed script, no tracking, no layout shift - an article with a <time> and labelled numbers.
when: Social proof, "what people say" walls, press kits. Curated customer quotes are testimonials; a feed of your own updates is news-item.
where: dist/components/social-post/social-post.css
supportedStates: default
---

# Pattern: Social Post

## Native basis
An `<article>`: the author (Avatar, name, verified mark, handle), the network glyph, the text with links and hashtags, optional media, a permalink `<time>` and the counts with screen-reader labels.

Built from: [Avatar](../avatar/component-skill.md).

---

## Native Web APIs
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dates
- [`<blockquote>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/blockquote) - a quoted post with its source
- [`object-fit`](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit) - pictures crop instead of stretching

---

## Structure

```html
  <article class="mk-social-post">
    <header class="mk-social-post-head">
      <span class="avatar"><img class="avatar-image" src="images/mk-portrait.png" alt=""></span>
      <div class="mk-social-post-who"><a class="mk-social-post-name" href="#">Sophie Tan<svg class="mk-social-post-verified" viewBox="0 0 24 24" width="16" height="16" role="img" aria-label="Verified account"><path fill="currentColor" d="M12 1.5 14.6 4l3.6-.4.9 3.5 3.2 1.8-1.4 3.3 1.4 3.3-3.2 1.8-.9 3.5-3.6-.4L12 22.5 9.4 20l-3.6.4-.9-3.5-3.2-1.8L3.1 12 1.7 8.7l3.2-1.8.9-3.5 3.6.4Z"/><path d="m7.5 12.2 3 3 6-6.4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a><span class="mk-social-post-handle">@sophie_builds</span></div>
      <span class="mk-social-post-network" role="img" aria-label="Posted on X"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L.8 2h6.4l4.4 5.9L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z"/></svg></span>
    </header>
    <div class="mk-social-post-text"><p>Shipped offline sync to every Acme workspace today 🎉
  Four years, two rewrites and one very patient team. Thank you all. <a href="#">#calmsoftware</a> <a href="#">#localfirst</a></p></div>
    <img class="mk-social-post-media" src="https://picsum.photos/seed/post-launch/1000/625" alt="">
    <footer class="mk-social-post-foot">
      <a class="mk-social-post-time" href="#"><time datetime="2026-10-01T09:41">9:41 AM · Oct 1, 2026</time></a>
      <ul class="mk-social-post-stats"><li><i data-lucide="message-circle"></i>48<span class="sr-only"> replies</span></li><li><i data-lucide="repeat-2"></i>212<span class="sr-only"> reposts</span></li><li><i data-lucide="heart"></i>1.4k<span class="sr-only"> likes</span></li></ul>
    </footer>
  </article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A post card: author, text, media, time and counts |
| `data-variant="photo"` | A square picture first, then the author and caption |
| `data-variant="quote"` | Text only, larger - for walls of praise |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| counts | sr-only "replies" / "reposts" / "likes" | Numbers are never bare |
| verified | `role="img" aria-label="Verified account"` | The mark has a name |
| time | `<a><time datetime></time></a>` | The permalink to the original |

---

## Notes
- Ask permission before rendering someone's post.
- Link to the original - the time is the permalink.
