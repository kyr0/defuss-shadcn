# Pagination

List endpoints return a page of objects and a cursor to the next one.

Pass limit (1 to 100, default 10) to size a page. When has_more is true, send next_cursor as cursor to get the following page.

```bash
curl "https://api.acme.example/v4/tasks?limit=2&cursor=t_102" -H "Authorization: Bearer $ACME_KEY"
```

> A cursor stays valid while objects are added - a page never repeats or skips an object.

Interactive: [Pagination in the app](../../application/app-api-docs.html#/guides/pagination).
