# Rate limits

Each key may send 100 requests a minute; the response headers count down.

X-RateLimit-Remaining tells how many requests the minute has left, X-RateLimit-Reset when it starts again. Past the limit the API answers 429.

> Retry a 429 after the reset with an exponential backoff, never in a tight loop.

Interactive: [Rate limits in the app](../../application/app-api-docs.html#/guides/rate-limits).
