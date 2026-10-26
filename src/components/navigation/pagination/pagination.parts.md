<!-- The individual examples of Pagination: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Pagination (xs)"
<nav class="pagination" data-size="xs" aria-label="Pagination xs"
  ><ol class="pagination-list"
    ><li><a class="pagination-link" href="#">1</a></li
    ><li><a class="pagination-link pagination-active" aria-current="page" href="#">2</a></li
    ><li><a class="pagination-link" href="#">3</a></li></ol
  ></nav
>
```

```html example part label="Pagination (sm)"
<nav class="pagination" data-size="sm" aria-label="Pagination sm"
  ><ol class="pagination-list"
    ><li><a class="pagination-link" href="#">1</a></li
    ><li><a class="pagination-link pagination-active" aria-current="page" href="#">2</a></li
    ><li><a class="pagination-link" href="#">3</a></li></ol
  ></nav
>
```

```html example part label="Pagination (md)"
<nav class="pagination" data-size="md" aria-label="Pagination md"
  ><ol class="pagination-list"
    ><li><a class="pagination-link" href="#">1</a></li
    ><li><a class="pagination-link pagination-active" aria-current="page" href="#">2</a></li
    ><li><a class="pagination-link" href="#">3</a></li></ol
  ></nav
>
```

```html example part label="Pagination (lg)"
<nav class="pagination" data-size="lg" aria-label="Pagination lg"
  ><ol class="pagination-list"
    ><li><a class="pagination-link" href="#">1</a></li
    ><li><a class="pagination-link pagination-active" aria-current="page" href="#">2</a></li
    ><li><a class="pagination-link" href="#">3</a></li></ol
  ></nav
>
```

```html example part label="Pagination (xl)"
<nav class="pagination" data-size="xl" aria-label="Pagination xl"
  ><ol class="pagination-list"
    ><li><a class="pagination-link" href="#">1</a></li
    ><li><a class="pagination-link pagination-active" aria-current="page" href="#">2</a></li
    ><li><a class="pagination-link" href="#">3</a></li></ol
  ></nav
>
```

```html example part label="Pagination (joined, lg)"
<nav class="pagination" data-layout="split" data-variant="joined" data-size="lg" aria-label="Chapters">
  <ul class="pagination-list">
    <li
      ><a class="pagination-prev" href="#" aria-label="Previous chapter"
        ><svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Chapter 3</a
      ></li
    >
    <li
      ><a class="pagination-next" href="#" aria-label="Next chapter"
        >Chapter 5
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="m9 18 6-6-6-6" /></svg></a
    ></li>
  </ul>
</nav>
```
