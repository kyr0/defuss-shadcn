# Authentication

Send your API key as a bearer token in the Authorization header of every request.

Keys belong to a workspace and carry its permissions. Create and revoke them under Settings - API keys.

```bash
curl https://api.acme.example/v4/docs -H "Authorization: Bearer $ACME_KEY"
```

A request without a key, or with a revoked one, answers 401 with an authentication_error.

> Keep live keys on the server. A key in a browser bundle is a key anyone can read.

Interactive: [Authentication in the app](../../application/app-api-docs.html#/guides/authentication).
