---
name: 404 Page
type: BLK
why: A heading, a GET search form and a list of links - the page works fully without script, as an error page must.
when: The 404 page of a site. Server failures are error-state (data-variant="page").
where: dist/components/page-not-found/page-not-found.css
supportedStates: default
---

# Pattern: 404 Page

## Native basis
A `<section>`: a large "404" (decorative, `aria-hidden`), an `<h1>`, one sentence, a `<search>` GET form, a list of helpful links and the way home.

Built from: [Input](input.md), [Button](button.md).

---

## Native Web APIs
- [`<search>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/search) - the search landmark
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<section class="mk-page-not-found" aria-labelledby="nf-1">
  <p class="mk-page-not-found-code" aria-hidden="true">404</p>
  <h1 class="mk-page-not-found-title" id="nf-1">Page not found</h1>
  <p class="mk-page-not-found-text">The page may have moved, or the link has a typo. Search, or start from one of these:</p>
  <search><form class="mk-page-not-found-search" action="#" method="get"><label class="sr-only" for="nf-q">Search the site</label><input class="input" id="nf-q" type="search" name="q" placeholder="Search Acme" enterkeyhint="search"><button class="btn" type="submit">Search</button></form></search>
  <ul class="mk-page-not-found-links">
    <li><a href="#"><strong><i data-lucide="book-open"></i>Docs</strong><span>Guides and reference</span></a></li>
    <li><a href="#"><strong><i data-lucide="tag"></i>Pricing</strong><span>Plans for every team</span></a></li>
    <li><a href="#"><strong><i data-lucide="life-buoy"></i>Help center</strong><span>Answers in minutes</span></a></li>
  </ul>
  <a class="btn" data-variant="ghost" href="#"><i data-lucide="arrow-left"></i> Back to home</a>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | The number, title, search, helpful links, home |
| `data-variant="illustrated"` | A giant gradient 404 behind the copy |
| `data-variant="minimal"` | Number, title and home only |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| title | `<h1>` | "Page not found" - the number is decorative |
| search | `<search>` + GET form | Works without script |
| links | descriptive text | "Pricing", not "click here" |

---

## Notes
- Serve it with status 404, not 200.
- Log broken links you can fix.
