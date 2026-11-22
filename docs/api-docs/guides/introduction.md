# Introduction

The Acme API is organized around REST: resource URLs, JSON bodies and the usual HTTP verbs and status codes.

Every request goes to one base URL and names the version in its path. A response is always JSON - an object, a list with a cursor, or an error.

```bash
curl https://api.acme.example/v4/tasks -H "Authorization: Bearer acme_test_51Nq7Kx2aLpVd9"
```

> Test keys start with acme_test_ and only ever touch test data. Live keys start with acme_live_.

## Resources

Tasks, docs, members and webhooks - pick one to see its object and its endpoints.

Interactive: [Introduction in the app](../../application/app-api-docs.html#/).
